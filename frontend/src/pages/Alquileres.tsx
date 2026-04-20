import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, X, CheckCircle, Plus, ShoppingBag } from 'lucide-react';
import { api } from '@/lib/api';

interface Alquiler {
  id: number;
  clienteNombre: string;
  clienteDni: string;
  fechaIngreso: string;
  fechaSalida: string;
  total: string;
  metodoPago: string;
  estado: string;
  motivoAnulacion?: string | null;
  habitacion: { numero: string; piso: { numero: number } };
  consumos: Array<{
    id: number;
    cantidad: number;
    subtotal: string;
    producto: { nombre: string };
  }>;
}

export default function Alquileres() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<string>('');
  const [showNuevo, setShowNuevo] = useState(false);
  const [addProdTo, setAddProdTo] = useState<Alquiler | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['alquileres', filtro],
    queryFn: async () =>
      (
        await api.get<Alquiler[]>(
          `/alquileres${filtro ? `?estado=${filtro}` : ''}`,
        )
      ).data,
  });

  const anular = useMutation({
    mutationFn: async ({ id, motivo }: { id: number; motivo: string }) =>
      (await api.patch(`/alquileres/${id}/anular`, { motivo })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alquileres'] }),
  });

  const finalizar = useMutation({
    mutationFn: async (id: number) =>
      (await api.patch(`/alquileres/${id}/finalizar`, {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alquileres'] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ClipboardList className="text-brand-500" />
          <h1 className="text-2xl font-bold">Alquileres</h1>
        </div>
        <button
          onClick={() => setShowNuevo(true)}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm"
        >
          <Plus size={16} /> Nuevo alquiler
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'ACTIVO', 'FINALIZADO', 'ANULADO'].map((e) => (
          <button
            key={e || 'todos'}
            onClick={() => setFiltro(e)}
            className={`px-3 py-1.5 rounded text-sm ${
              filtro === e
                ? 'bg-brand-500 text-white'
                : 'bg-white border hover:bg-slate-50'
            }`}
          >
            {e || 'Todos'}
          </button>
        ))}
      </div>

      {isLoading && <div>Cargando...</div>}

      <div className="space-y-3">
        {data?.map((a) => (
          <div key={a.id} className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold">
                  #{a.id} · Hab. {a.habitacion.numero} · {a.clienteNombre}
                </div>
                <div className="text-xs text-slate-500">
                  DNI: {a.clienteDni} · {a.metodoPago}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {new Date(a.fechaIngreso).toLocaleString()} →{' '}
                  {new Date(a.fechaSalida).toLocaleString()}
                </div>
                {a.motivoAnulacion && (
                  <div className="text-xs text-red-600 mt-1">
                    Anulado: {a.motivoAnulacion}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">S/ {a.total}</div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    a.estado === 'ACTIVO'
                      ? 'bg-emerald-100 text-emerald-700'
                      : a.estado === 'ANULADO'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {a.estado}
                </span>
              </div>
            </div>

            {a.consumos.length > 0 && (
              <div className="mt-3 text-xs text-slate-600">
                Consumos:{' '}
                {a.consumos
                  .map(
                    (c) =>
                      `${c.producto.nombre} ×${c.cantidad} (S/${c.subtotal})`,
                  )
                  .join(', ')}
              </div>
            )}

            {a.estado === 'ACTIVO' && (
              <div className="mt-3 flex gap-2 flex-wrap">
                <button
                  onClick={() => setAddProdTo(a)}
                  className="text-xs flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded"
                >
                  <ShoppingBag size={14} /> Agregar producto
                </button>
                <button
                  onClick={() => finalizar.mutate(a.id)}
                  className="text-xs flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded"
                >
                  <CheckCircle size={14} /> Finalizar
                </button>
                <button
                  onClick={() => {
                    const motivo = prompt('Motivo de anulación:');
                    if (motivo) anular.mutate({ id: a.id, motivo });
                  }}
                  className="text-xs flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded"
                >
                  <X size={14} /> Anular
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showNuevo && <NuevoAlquilerModal onClose={() => setShowNuevo(false)} />}
      {addProdTo && (
        <AgregarProductoModal
          alquiler={addProdTo}
          onClose={() => setAddProdTo(null)}
        />
      )}
    </div>
  );
}

function AgregarProductoModal({
  alquiler,
  onClose,
}: {
  alquiler: Alquiler;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [error, setError] = useState<string | null>(null);

  const productos = useQuery({
    queryKey: ['productos'],
    queryFn: async () => (await api.get<any[]>('/productos')).data,
  });

  const add = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/alquileres/${alquiler.id}/consumo`, {
          productoId: Number(productoId),
          cantidad: Number(cantidad),
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alquileres'] });
      qc.invalidateQueries({ queryKey: ['productos'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Error'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">
            Agregar producto a alquiler #{alquiler.id}
          </h2>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3">
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={productoId}
            onChange={(e) => setProductoId(e.target.value)}
          >
            <option value="">Selecciona producto</option>
            {productos.data?.map((p) => (
              <option key={p.id} value={p.id} disabled={p.stock === 0}>
                {p.nombre} · S/ {p.precio} · stock {p.stock}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            placeholder="Cantidad"
            className="w-full border rounded-lg px-3 py-2"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
          <button
            onClick={() => add.mutate()}
            disabled={add.isPending || !productoId || !cantidad}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-50"
          >
            {add.isPending ? 'Agregando...' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NuevoAlquilerModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    habitacionId: '',
    clienteNombre: '',
    clienteDni: '',
    clienteTelefono: '',
    fechaIngreso: new Date().toISOString().slice(0, 16),
    fechaSalida: new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 16),
    precioHabitacion: '',
    metodoPago: 'EFECTIVO',
    notas: '',
  });
  const [error, setError] = useState<string | null>(null);

  const habs = useQuery({
    queryKey: ['habitaciones', 'disponibles'],
    queryFn: async () =>
      (await api.get<any[]>('/habitaciones?estado=DISPONIBLE')).data,
  });

  const crear = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        habitacionId: Number(form.habitacionId),
        precioHabitacion: Number(form.precioHabitacion),
        fechaIngreso: new Date(form.fechaIngreso).toISOString(),
        fechaSalida: new Date(form.fechaSalida).toISOString(),
      };
      return (await api.post('/alquileres', payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alquileres'] });
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
      onClose();
    },
    onError: (err: any) =>
      setError(err.response?.data?.message || 'Error'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Nuevo alquiler</h2>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={form.habitacionId}
            onChange={(e) => {
              const h = habs.data?.find(
                (x) => String(x.id) === e.target.value,
              );
              setForm({
                ...form,
                habitacionId: e.target.value,
                precioHabitacion: h ? String(h.precioHora) : '',
              });
            }}
          >
            <option value="">Selecciona habitación disponible</option>
            {habs.data?.map((h) => (
              <option key={h.id} value={h.id}>
                Hab. {h.numero} · S/ {h.precioHora}/h
              </option>
            ))}
          </select>

          <input
            placeholder="Nombre del cliente"
            className="w-full border rounded-lg px-3 py-2"
            value={form.clienteNombre}
            onChange={(e) =>
              setForm({ ...form, clienteNombre: e.target.value })
            }
          />
          <input
            placeholder="DNI"
            className="w-full border rounded-lg px-3 py-2"
            value={form.clienteDni}
            onChange={(e) => setForm({ ...form, clienteDni: e.target.value })}
          />
          <input
            placeholder="Teléfono (opcional)"
            className="w-full border rounded-lg px-3 py-2"
            value={form.clienteTelefono}
            onChange={(e) =>
              setForm({ ...form, clienteTelefono: e.target.value })
            }
          />

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">
              Ingreso
              <input
                type="datetime-local"
                className="w-full border rounded-lg px-3 py-2 mt-1"
                value={form.fechaIngreso}
                onChange={(e) =>
                  setForm({ ...form, fechaIngreso: e.target.value })
                }
              />
            </label>
            <label className="text-xs">
              Salida
              <input
                type="datetime-local"
                className="w-full border rounded-lg px-3 py-2 mt-1"
                value={form.fechaSalida}
                onChange={(e) =>
                  setForm({ ...form, fechaSalida: e.target.value })
                }
              />
            </label>
          </div>

          <input
            type="number"
            step="0.01"
            placeholder="Precio habitación"
            className="w-full border rounded-lg px-3 py-2"
            value={form.precioHabitacion}
            onChange={(e) =>
              setForm({ ...form, precioHabitacion: e.target.value })
            }
          />

          <select
            className="w-full border rounded-lg px-3 py-2"
            value={form.metodoPago}
            onChange={(e) => setForm({ ...form, metodoPago: e.target.value })}
          >
            <option value="EFECTIVO">Efectivo</option>
            <option value="VISA">Visa</option>
            <option value="MASTERCARD">Mastercard</option>
            <option value="YAPE">Yape</option>
            <option value="PLIN">Plin</option>
            <option value="OTRO">Otro</option>
          </select>

          <textarea
            placeholder="Notas (opcional)"
            className="w-full border rounded-lg px-3 py-2"
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
          />

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <button
            onClick={() => crear.mutate()}
            disabled={crear.isPending}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-60"
          >
            {crear.isPending ? 'Creando...' : 'Crear alquiler'}
          </button>
        </div>
      </div>
    </div>
  );
}
