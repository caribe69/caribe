import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Plus, X, PackagePlus, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import { useDialog } from '@/components/ConfirmProvider';
import { useToast } from '@/components/ToastProvider';

interface ProductoLimpieza {
  id: number;
  nombre: string;
  stock: number;
  stockMinimo: number;
  unidad: string;
}

export default function ProductosLimpieza() {
  const qc = useQueryClient();
  const dialog = useDialog();
  const { show: toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [ajuste, setAjuste] = useState<ProductoLimpieza | null>(null);
  const [editar, setEditar] = useState<ProductoLimpieza | null>(null);

  const eliminar = useMutation({
    mutationFn: async (id: number) =>
      (await api.delete(`/productos-limpieza/${id}`)).data,
    onSuccess: () => {
      toast({ type: 'success', title: 'Producto eliminado' });
      qc.invalidateQueries({ queryKey: ['productos-limpieza'] });
    },
    onError: (err: any) =>
      toast({
        type: 'error',
        title: 'No se pudo eliminar',
        description: err.response?.data?.message || 'Error',
      }),
  });

  const confirmarEliminar = async (p: ProductoLimpieza) => {
    const ok = await dialog.confirm({
      title: `¿Eliminar "${p.nombre}"?`,
      message:
        'El producto pasa a inactivo. Mantiene el historial de usos en limpieza.',
      confirmText: 'Eliminar',
      variant: 'warning',
    });
    if (ok) eliminar.mutate(p.id);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['productos-limpieza'],
    queryFn: async () =>
      (await api.get<ProductoLimpieza[]>('/productos-limpieza')).data,
  });

  const pag = usePagination(data, 10);

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="text-sm text-slate-500">
          {data?.length ?? 0} productos de limpieza
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-violet-500/30 dark:shadow-violet-900/40 transition btn-press"
        >
          <Plus size={16} /> Nuevo producto
        </button>
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
                Unidad
              </th>
              <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Stock
              </th>
              <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Mínimo
              </th>
              <th className="text-right px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest w-64">
                Acciones
              </th>
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
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <Sparkles size={18} className="text-amber-600 dark:text-amber-300" />
                      </div>
                      <div className="font-semibold text-slate-800">
                        {p.nombre}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{p.unidad}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        out
                          ? 'bg-rose-100 text-rose-700 dark:text-rose-200'
                          : low
                            ? 'bg-amber-100 text-amber-800 dark:text-amber-200'
                            : 'bg-emerald-100 text-emerald-700 dark:text-emerald-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${out ? 'bg-rose-500' : low ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      />
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{p.stockMinimo}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1.5 justify-end flex-wrap">
                      <button
                        onClick={() => setAjuste(p)}
                        className="inline-flex items-center gap-1 text-xs bg-slate-100 hover:bg-violet-100 hover:text-violet-700 text-slate-700 px-2.5 py-1.5 rounded-lg transition"
                        title="Ajustar stock"
                      >
                        <PackagePlus size={12} /> Stock
                      </button>
                      <button
                        onClick={() => setEditar(p)}
                        className="inline-flex items-center gap-1 text-xs bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 px-2.5 py-1.5 rounded-lg transition"
                        title="Editar nombre, unidad o stock mínimo"
                      >
                        <Pencil size={12} /> Editar
                      </button>
                      <button
                        onClick={() => confirmarEliminar(p)}
                        disabled={eliminar.isPending}
                        className="inline-flex items-center gap-1 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
                        title="Eliminar producto"
                      >
                        <Trash2 size={12} /> Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {data?.length === 0 && !isLoading && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-16 text-center text-slate-400"
                >
                  <Sparkles
                    size={40}
                    className="mx-auto text-slate-300 mb-2"
                  />
                  Sin productos. Crea el primero con el botón superior.
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

      {showModal && <Form onClose={() => setShowModal(false)} />}
      {editar && (
        <Form
          editar={editar}
          onClose={() => setEditar(null)}
        />
      )}
      {ajuste && (
        <AjusteModal
          producto={ajuste}
          onClose={() => {
            setAjuste(null);
            qc.invalidateQueries({ queryKey: ['productos-limpieza'] });
          }}
        />
      )}
    </div>
  );
}

function Form({
  onClose,
  editar,
}: {
  onClose: () => void;
  editar?: ProductoLimpieza;
}) {
  const qc = useQueryClient();
  const esEdicion = !!editar;
  const [form, setForm] = useState({
    nombre: editar?.nombre || '',
    descripcion: '',
    unidad: editar?.unidad || 'unidad',
    stock: editar ? String(editar.stock) : '0',
    stockMinimo: editar ? String(editar.stockMinimo) : '5',
  });
  const [error, setError] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: async () => {
      if (esEdicion) {
        // PATCH solo manda los campos editables (sin tocar stock — para eso
        // existe el modal de "Ajustar stock").
        return (
          await api.patch(`/productos-limpieza/${editar!.id}`, {
            nombre: form.nombre,
            unidad: form.unidad,
            stockMinimo: Number(form.stockMinimo),
          })
        ).data;
      }
      return (
        await api.post('/productos-limpieza', {
          nombre: form.nombre,
          descripcion: form.descripcion || undefined,
          unidad: form.unidad,
          stock: Number(form.stock),
          stockMinimo: Number(form.stockMinimo),
        })
      ).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos-limpieza'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Error'),
  });

  return (
    <Modal
      title={esEdicion ? `Editar "${editar!.nombre}"` : 'Nuevo producto de limpieza'}
      onClose={onClose}
    >
      <input
        placeholder="Nombre"
        className="w-full border rounded-lg px-3 py-2"
        value={form.nombre}
        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
      />
      {!esEdicion && (
        <input
          placeholder="Descripción (opcional)"
          className="w-full border rounded-lg px-3 py-2"
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
        />
      )}
      <input
        placeholder="Unidad (ej. litro, rollo, unidad)"
        className="w-full border rounded-lg px-3 py-2"
        value={form.unidad}
        onChange={(e) => setForm({ ...form, unidad: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-2">
        {!esEdicion && (
          <input
            type="number"
            placeholder="Stock inicial"
            className="w-full border rounded-lg px-3 py-2"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
          />
        )}
        <input
          type="number"
          placeholder="Stock mínimo"
          className={`w-full border rounded-lg px-3 py-2 ${esEdicion ? 'col-span-2' : ''}`}
          value={form.stockMinimo}
          onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })}
        />
      </div>
      {esEdicion && (
        <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2">
          ℹ El stock actual ({editar!.stock}) se ajusta desde el botón "Stock"
          (suma/resta con motivo).
        </div>
      )}
      {error && (
        <div className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 p-2 rounded">
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
          onClick={() => guardar.mutate()}
          disabled={guardar.isPending || !form.nombre}
          className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-lg disabled:opacity-50"
        >
          {guardar.isPending
            ? esEdicion
              ? 'Guardando…'
              : 'Creando…'
            : esEdicion
              ? 'Guardar cambios'
              : 'Crear'}
        </button>
      </div>
    </Modal>
  );
}

function AjusteModal({
  producto,
  onClose,
}: {
  producto: ProductoLimpieza;
  onClose: () => void;
}) {
  const [cantidad, setCantidad] = useState('');

  const ajuste = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/productos-limpieza/${producto.id}/ajuste-stock`, {
          cantidad: Number(cantidad),
        })
      ).data,
    onSuccess: () => onClose(),
  });

  return (
    <Modal title={`Ajustar stock: ${producto.nombre}`} onClose={onClose}>
      <div className="text-sm text-slate-600">
        Stock actual: <span className="font-bold">{producto.stock}</span>{' '}
        {producto.unidad}
      </div>
      <input
        type="number"
        placeholder="Cantidad (positiva/negativa)"
        className="w-full border rounded-lg px-3 py-2"
        value={cantidad}
        onChange={(e) => setCantidad(e.target.value)}
      />
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
          Guardar
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
