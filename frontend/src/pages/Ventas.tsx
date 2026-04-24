import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Plus, X, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useDialog } from '@/components/ConfirmProvider';

interface Producto {
  id: number;
  nombre: string;
  precio: string;
  stock: number;
}

interface Venta {
  id: number;
  total: string;
  metodoPago: string;
  estado: string;
  motivoAnulacion?: string | null;
  creadoEn: string;
  notas?: string | null;
  items: Array<{
    id: number;
    cantidad: number;
    subtotal: string;
    producto: { nombre: string };
  }>;
  usuario: { nombre: string; username: string };
}

export default function Ventas() {
  const qc = useQueryClient();
  const dialog = useDialog();
  const [showNew, setShowNew] = useState(false);

  const { data } = useQuery({
    queryKey: ['ventas'],
    queryFn: async () => (await api.get<Venta[]>('/ventas')).data,
  });

  const anular = useMutation({
    mutationFn: async ({ id, motivo }: { id: number; motivo: string }) =>
      (await api.patch(`/ventas/${id}/anular`, { motivo })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventas'] });
      qc.invalidateQueries({ queryKey: ['productos'] });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="text-brand-500" />
          <h1 className="text-2xl font-bold">Ventas directas</h1>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm"
        >
          <Plus size={16} /> Nueva venta
        </button>
      </div>

      <div className="space-y-3">
        {data?.map((v) => (
          <div key={v.id} className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold">
                  Venta #{v.id} · {v.metodoPago}
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(v.creadoEn).toLocaleString()} · {v.usuario.nombre}
                </div>
                {v.motivoAnulacion && (
                  <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Anulada: {v.motivoAnulacion}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">S/ {v.total}</div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    v.estado === 'ACTIVA'
                      ? 'bg-emerald-100 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                  }`}
                >
                  {v.estado}
                </span>
              </div>
            </div>
            <div className="mt-3 text-sm text-slate-600">
              {v.items
                .map(
                  (it) =>
                    `${it.producto.nombre} ×${it.cantidad} (S/${it.subtotal})`,
                )
                .join(' · ')}
            </div>
            {v.estado === 'ACTIVA' && (
              <button
                onClick={async () => {
                  const motivo = await dialog.prompt({
                    title: 'Anular venta',
                    message:
                      'Escribe el motivo. Los productos volverán al stock.',
                    placeholder: 'Ej. Error de cobro',
                    confirmText: 'Anular',
                    variant: 'danger',
                    multiline: true,
                    minLength: 3,
                  });
                  if (motivo) anular.mutate({ id: v.id, motivo });
                }}
                className="mt-3 text-xs flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded btn-press"
              >
                <Trash2 size={14} /> Anular
              </button>
            )}
          </div>
        ))}
        {data?.length === 0 && (
          <div className="text-center text-slate-500 py-12">Sin ventas aún</div>
        )}
      </div>

      {showNew && <NuevaVentaModal onClose={() => setShowNew(false)} />}
    </div>
  );
}

function NuevaVentaModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [items, setItems] = useState<{ productoId: number; cantidad: number }[]>(
    [],
  );
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);

  const productos = useQuery({
    queryKey: ['productos'],
    queryFn: async () => (await api.get<Producto[]>('/productos')).data,
  });

  const crear = useMutation({
    mutationFn: async () =>
      (await api.post('/ventas', { items, metodoPago, notas: notas || undefined }))
        .data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventas'] });
      qc.invalidateQueries({ queryKey: ['productos'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Error'),
  });

  const addItem = (productoId: number) => {
    const existing = items.find((i) => i.productoId === productoId);
    if (existing) {
      setItems(
        items.map((i) =>
          i.productoId === productoId ? { ...i, cantidad: i.cantidad + 1 } : i,
        ),
      );
    } else {
      setItems([...items, { productoId, cantidad: 1 }]);
    }
  };

  const updateQty = (productoId: number, cantidad: number) => {
    if (cantidad <= 0) {
      setItems(items.filter((i) => i.productoId !== productoId));
    } else {
      setItems(
        items.map((i) => (i.productoId === productoId ? { ...i, cantidad } : i)),
      );
    }
  };

  const total = items.reduce((s, i) => {
    const p = productos.data?.find((x) => x.id === i.productoId);
    return s + (p ? Number(p.precio) * i.cantidad : 0);
  }, 0);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Nueva venta directa</h2>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium mb-2">Productos</div>
            <div className="space-y-1 max-h-64 overflow-y-auto border rounded-lg p-2">
              {productos.data?.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addItem(p.id)}
                  disabled={p.stock === 0}
                  className="w-full flex justify-between items-center text-left px-3 py-2 hover:bg-slate-50 rounded text-sm disabled:opacity-40"
                >
                  <span>{p.nombre}</span>
                  <span className="text-xs text-slate-500">
                    S/ {p.precio} · stock {p.stock}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Carrito</div>
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
              {items.length === 0 && (
                <div className="text-xs text-slate-400 text-center py-4">
                  Selecciona productos de la lista
                </div>
              )}
              {items.map((i) => {
                const p = productos.data?.find((x) => x.id === i.productoId);
                if (!p) return null;
                return (
                  <div key={i.productoId} className="flex items-center gap-2 text-sm">
                    <div className="flex-1 truncate">{p.nombre}</div>
                    <input
                      type="number"
                      value={i.cantidad}
                      min="0"
                      onChange={(e) =>
                        updateQty(p.id, Number(e.target.value))
                      }
                      className="w-14 border rounded px-2 py-1 text-center"
                    />
                    <div className="w-16 text-right text-xs text-slate-600">
                      S/ {(Number(p.precio) * i.cantidad).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-right text-lg font-bold">
              Total: S/ {total.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value)}
          >
            <option value="EFECTIVO">Efectivo</option>
            <option value="VISA">Visa</option>
            <option value="MASTERCARD">Mastercard</option>
            <option value="YAPE">Yape</option>
            <option value="PLIN">Plin</option>
            <option value="OTRO">Otro</option>
          </select>
          <input
            placeholder="Notas (opcional)"
            className="w-full border rounded-lg px-3 py-2"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />

          {error && (
            <div className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 p-2 rounded">
              {error}
            </div>
          )}

          <button
            onClick={() => crear.mutate()}
            disabled={crear.isPending || items.length === 0}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-50"
          >
            {crear.isPending ? 'Registrando...' : `Registrar venta · S/ ${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
