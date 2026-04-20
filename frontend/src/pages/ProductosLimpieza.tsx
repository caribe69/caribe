import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Plus, X, PackagePlus } from 'lucide-react';
import { api } from '@/lib/api';

interface ProductoLimpieza {
  id: number;
  nombre: string;
  stock: number;
  stockMinimo: number;
  unidad: string;
}

export default function ProductosLimpieza() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [ajuste, setAjuste] = useState<ProductoLimpieza | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['productos-limpieza'],
    queryFn: async () =>
      (await api.get<ProductoLimpieza[]>('/productos-limpieza')).data,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="text-brand-500" />
          <h1 className="text-2xl font-bold">Productos de limpieza</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm"
        >
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      {isLoading && <div>Cargando...</div>}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Unidad</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Mínimo</th>
              <th className="px-4 py-3 font-medium w-32">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3">{p.nombre}</td>
                <td className="px-4 py-3 text-slate-500">{p.unidad}</td>
                <td
                  className={`px-4 py-3 font-medium ${
                    p.stock <= p.stockMinimo ? 'text-red-600' : ''
                  }`}
                >
                  {p.stock}
                </td>
                <td className="px-4 py-3 text-slate-500">{p.stockMinimo}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setAjuste(p)}
                    className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
                  >
                    <PackagePlus size={12} /> Stock
                  </button>
                </td>
              </tr>
            ))}
            {data?.length === 0 && !isLoading && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  Sin productos. Crea el primero con el botón superior.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && <Form onClose={() => setShowModal(false)} />}
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

function Form({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    unidad: 'unidad',
    stock: '0',
    stockMinimo: '5',
  });
  const [error, setError] = useState<string | null>(null);

  const crear = useMutation({
    mutationFn: async () =>
      (
        await api.post('/productos-limpieza', {
          nombre: form.nombre,
          descripcion: form.descripcion || undefined,
          unidad: form.unidad,
          stock: Number(form.stock),
          stockMinimo: Number(form.stockMinimo),
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos-limpieza'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Error'),
  });

  return (
    <Modal title="Nuevo producto de limpieza" onClose={onClose}>
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
        placeholder="Unidad (ej. litro, rollo, unidad)"
        className="w-full border rounded-lg px-3 py-2"
        value={form.unidad}
        onChange={(e) => setForm({ ...form, unidad: e.target.value })}
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
          disabled={crear.isPending || !form.nombre}
          className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2 rounded-lg disabled:opacity-50"
        >
          {crear.isPending ? 'Creando...' : 'Crear'}
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
