import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, X, PackagePlus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';

interface Producto {
  id: number;
  nombre: string;
  precio: string;
  stock: number;
  stockMinimo: number;
}

export default function Productos() {
  const qc = useQueryClient();
  const usuario = useAuthStore((s) => s.usuario);
  const puedeEditar =
    usuario?.rol === 'SUPERADMIN' || usuario?.rol === 'ADMIN_SEDE';
  const [showModal, setShowModal] = useState(false);
  const [showAjuste, setShowAjuste] = useState<Producto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['productos'],
    queryFn: async () => (await api.get<Producto[]>('/productos')).data,
  });

  const pag = usePagination(data, 10);

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="text-sm text-slate-500">
          {data?.length ?? 0} productos en inventario
        </div>
        {puedeEditar && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-violet-500/30 transition btn-press"
          >
            <Plus size={16} /> Nuevo producto
          </button>
        )}
      </div>

      {isLoading && (
        <div className="text-slate-400 text-center py-12">Cargando...</div>
      )}

      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Producto
              </th>
              <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Precio
              </th>
              <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Stock
              </th>
              <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Mínimo
              </th>
              {puedeEditar && (
                <th className="text-right px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest w-32">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {pag.paginated.map((p) => {
              const low = p.stock <= p.stockMinimo;
              const out = p.stock === 0;
              return (
                <tr
                  key={p.id}
                  className="border-b border-slate-50 last:border-0 hover:bg-violet-50/30 transition"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                        <Package size={18} className="text-violet-600" />
                      </div>
                      <div className="font-semibold text-slate-800">
                        {p.nombre}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-700">
                    S/ {Number(p.precio).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        out
                          ? 'bg-rose-100 text-rose-700'
                          : low
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          out
                            ? 'bg-rose-500'
                            : low
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                      />
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{p.stockMinimo}</td>
                  {puedeEditar && (
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setShowAjuste(p)}
                        className="inline-flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-violet-100 hover:text-violet-700 text-slate-700 px-3 py-1.5 rounded-lg transition"
                      >
                        <PackagePlus size={13} /> Stock
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {data?.length === 0 && !isLoading && (
              <tr>
                <td
                  colSpan={puedeEditar ? 5 : 4}
                  className="px-6 py-16 text-center text-slate-400"
                >
                  <Package
                    size={40}
                    className="mx-auto text-slate-300 mb-2"
                  />
                  {puedeEditar
                    ? 'Sin productos. Crea el primero con el botón superior.'
                    : 'Sin productos registrados en esta sede.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <Pagination
          page={pag.page}
          totalPages={pag.totalPages}
          totalItems={pag.totalItems}
          from={pag.from}
          to={pag.to}
          size={pag.size}
          setPage={pag.setPage}
          setSize={pag.setSize}
        />
      </div>

      {showModal && <ProductoModal onClose={() => setShowModal(false)} />}
      {showAjuste && (
        <AjusteStockModal
          producto={showAjuste}
          onClose={() => {
            setShowAjuste(null);
            qc.invalidateQueries({ queryKey: ['productos'] });
          }}
        />
      )}
    </div>
  );
}

function ProductoModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '0',
    stockMinimo: '5',
  });
  const [error, setError] = useState<string | null>(null);

  const crear = useMutation({
    mutationFn: async () =>
      (
        await api.post('/productos', {
          nombre: form.nombre,
          descripcion: form.descripcion || undefined,
          precio: Number(form.precio),
          stock: Number(form.stock),
          stockMinimo: Number(form.stockMinimo),
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Error'),
  });

  return (
    <Modal title="Nuevo producto" onClose={onClose}>
      <input
        placeholder="Nombre"
        className="w-full border rounded-lg px-3 py-2"
        value={form.nombre}
        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
      />
      <input
        placeholder="Descripción (opcional)"
        className="w-full border rounded-lg px-3 py-2"
        value={form.descripcion}
        onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
      />
      <input
        type="number"
        step="0.01"
        placeholder="Precio"
        className="w-full border rounded-lg px-3 py-2"
        value={form.precio}
        onChange={(e) => setForm({ ...form, precio: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          placeholder="Stock inicial"
          className="w-full border rounded-lg px-3 py-2"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
        />
        <input
          type="number"
          placeholder="Stock mínimo"
          className="w-full border rounded-lg px-3 py-2"
          value={form.stockMinimo}
          onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })}
        />
      </div>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onClose}
          className="flex-1 bg-slate-100 hover:bg-slate-200 py-2 rounded-lg"
        >
          Cancelar
        </button>
        <button
          onClick={() => crear.mutate()}
          disabled={crear.isPending || !form.nombre || !form.precio}
          className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2 rounded-lg disabled:opacity-50"
        >
          {crear.isPending ? 'Creando...' : 'Crear'}
        </button>
      </div>
    </Modal>
  );
}

function AjusteStockModal({
  producto,
  onClose,
}: {
  producto: Producto;
  onClose: () => void;
}) {
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const ajuste = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/productos/${producto.id}/ajuste-stock`, {
          cantidad: Number(cantidad),
          motivo: motivo || undefined,
        })
      ).data,
    onSuccess: () => onClose(),
    onError: (err: any) => setError(err.response?.data?.message || 'Error'),
  });

  return (
    <Modal title={`Ajustar stock: ${producto.nombre}`} onClose={onClose}>
      <div className="text-sm text-slate-600">
        Stock actual: <span className="font-bold">{producto.stock}</span>
      </div>
      <input
        type="number"
        placeholder="Cantidad (positiva para añadir, negativa para quitar)"
        className="w-full border rounded-lg px-3 py-2"
        value={cantidad}
        onChange={(e) => setCantidad(e.target.value)}
      />
      <input
        placeholder="Motivo"
        className="w-full border rounded-lg px-3 py-2"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
      />
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onClose}
          className="flex-1 bg-slate-100 hover:bg-slate-200 py-2 rounded-lg"
        >
          Cancelar
        </button>
        <button
          onClick={() => ajuste.mutate()}
          disabled={ajuste.isPending || !cantidad}
          className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2 rounded-lg disabled:opacity-50"
        >
          {ajuste.isPending ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}
