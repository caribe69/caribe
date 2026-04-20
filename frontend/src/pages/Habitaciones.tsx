import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BedDouble, Plus, Layers, X } from 'lucide-react';
import { api } from '@/lib/api';

interface Habitacion {
  id: number;
  numero: string;
  descripcion?: string;
  caracteristicas?: string;
  estado: string;
  precioHora: string;
  precioNoche: string;
  piso: { id: number; numero: number; nombre?: string };
}

interface Piso {
  id: number;
  numero: number;
  nombre?: string;
  _count?: { habitaciones: number };
}

const estados = [
  'DISPONIBLE',
  'OCUPADA',
  'ALISTANDO',
  'MANTENIMIENTO',
  'FUERA_SERVICIO',
];

export default function Habitaciones() {
  const qc = useQueryClient();
  const [showHabModal, setShowHabModal] = useState(false);
  const [showPisoModal, setShowPisoModal] = useState(false);

  const { data: habs, isLoading } = useQuery({
    queryKey: ['habitaciones'],
    queryFn: async () => (await api.get<Habitacion[]>('/habitaciones')).data,
  });

  const { data: pisos } = useQuery({
    queryKey: ['pisos'],
    queryFn: async () => (await api.get<Piso[]>('/pisos')).data,
  });

  const cambiarEstado = useMutation({
    mutationFn: async ({ id, estado }: { id: number; estado: string }) =>
      (await api.patch(`/habitaciones/${id}/estado`, { estado })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habitaciones'] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BedDouble className="text-brand-500" />
          <h1 className="text-2xl font-bold">Habitaciones</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPisoModal(true)}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg text-sm"
          >
            <Layers size={16} /> Nuevo piso
          </button>
          <button
            onClick={() => setShowHabModal(true)}
            disabled={!pisos || pisos.length === 0}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60"
          >
            <Plus size={16} /> Nueva habitación
          </button>
        </div>
      </div>

      {pisos && pisos.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg mb-4 text-sm">
          Esta sede aún no tiene pisos. Crea al menos un piso antes de agregar habitaciones.
        </div>
      )}

      {isLoading && <div>Cargando...</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {habs?.map((h) => (
          <div key={h.id} className="bg-white rounded-xl border p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xl font-bold">Hab. {h.numero}</div>
                <div className="text-xs text-slate-500">
                  Piso {h.piso.numero}
                </div>
              </div>
              <span
                className={`estado-${h.estado} text-xs px-2 py-1 rounded-full font-medium`}
              >
                {h.estado}
              </span>
            </div>
            {h.descripcion && (
              <p className="text-sm text-slate-600 mt-2">{h.descripcion}</p>
            )}
            {h.caracteristicas && (
              <p className="text-xs text-slate-500 mt-1">{h.caracteristicas}</p>
            )}
            <div className="mt-3 text-sm">
              <span className="font-medium">S/ {h.precioHora}</span>/hora ·{' '}
              <span className="font-medium">S/ {h.precioNoche}</span>/noche
            </div>

            <div className="mt-4 flex gap-2 flex-wrap">
              {estados.map((e) => (
                <button
                  key={e}
                  disabled={e === h.estado || cambiarEstado.isPending}
                  onClick={() => cambiarEstado.mutate({ id: h.id, estado: e })}
                  className={`text-xs px-2 py-1 rounded ${
                    e === h.estado
                      ? 'bg-slate-100 text-slate-400'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        ))}
        {habs?.length === 0 && !isLoading && (
          <div className="col-span-full text-center text-slate-500 py-12">
            Sin habitaciones. Crea la primera con el botón superior.
          </div>
        )}
      </div>

      {showPisoModal && <PisoModal onClose={() => setShowPisoModal(false)} />}
      {showHabModal && (
        <HabitacionModal
          pisos={pisos || []}
          onClose={() => setShowHabModal(false)}
        />
      )}
    </div>
  );
}

function PisoModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [numero, setNumero] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);

  const crear = useMutation({
    mutationFn: async () =>
      (
        await api.post('/pisos', {
          numero: Number(numero),
          nombre: nombre || undefined,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pisos'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Error'),
  });

  return (
    <Modal title="Nuevo piso" onClose={onClose}>
      <input
        type="number"
        placeholder="Número de piso"
        className="w-full border rounded-lg px-3 py-2"
        value={numero}
        onChange={(e) => setNumero(e.target.value)}
      />
      <input
        placeholder="Nombre (opcional)"
        className="w-full border rounded-lg px-3 py-2"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />
      {error && <ErrorBox msg={error} />}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onClose}
          className="flex-1 bg-slate-100 hover:bg-slate-200 py-2 rounded-lg"
        >
          Cancelar
        </button>
        <button
          onClick={() => crear.mutate()}
          disabled={crear.isPending || !numero}
          className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2 rounded-lg disabled:opacity-50"
        >
          {crear.isPending ? 'Creando...' : 'Crear'}
        </button>
      </div>
    </Modal>
  );
}

function HabitacionModal({
  pisos,
  onClose,
}: {
  pisos: Piso[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    pisoId: '',
    numero: '',
    descripcion: '',
    caracteristicas: '',
    precioHora: '',
    precioNoche: '',
  });
  const [error, setError] = useState<string | null>(null);

  const crear = useMutation({
    mutationFn: async () =>
      (
        await api.post('/habitaciones', {
          pisoId: Number(form.pisoId),
          numero: form.numero,
          descripcion: form.descripcion || undefined,
          caracteristicas: form.caracteristicas || undefined,
          precioHora: Number(form.precioHora),
          precioNoche: Number(form.precioNoche),
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Error'),
  });

  return (
    <Modal title="Nueva habitación" onClose={onClose}>
      <select
        className="w-full border rounded-lg px-3 py-2"
        value={form.pisoId}
        onChange={(e) => setForm({ ...form, pisoId: e.target.value })}
      >
        <option value="">Selecciona piso</option>
        {pisos.map((p) => (
          <option key={p.id} value={p.id}>
            Piso {p.numero} {p.nombre ? `· ${p.nombre}` : ''}
          </option>
        ))}
      </select>
      <input
        placeholder="Número de habitación (ej. 101)"
        className="w-full border rounded-lg px-3 py-2"
        value={form.numero}
        onChange={(e) => setForm({ ...form, numero: e.target.value })}
      />
      <input
        placeholder="Descripción (opcional)"
        className="w-full border rounded-lg px-3 py-2"
        value={form.descripcion}
        onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
      />
      <input
        placeholder="Características (opcional)"
        className="w-full border rounded-lg px-3 py-2"
        value={form.caracteristicas}
        onChange={(e) => setForm({ ...form, caracteristicas: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          step="0.01"
          placeholder="Precio por hora"
          className="w-full border rounded-lg px-3 py-2"
          value={form.precioHora}
          onChange={(e) => setForm({ ...form, precioHora: e.target.value })}
        />
        <input
          type="number"
          step="0.01"
          placeholder="Precio por noche"
          className="w-full border rounded-lg px-3 py-2"
          value={form.precioNoche}
          onChange={(e) => setForm({ ...form, precioNoche: e.target.value })}
        />
      </div>
      {error && <ErrorBox msg={error} />}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onClose}
          className="flex-1 bg-slate-100 hover:bg-slate-200 py-2 rounded-lg"
        >
          Cancelar
        </button>
        <button
          onClick={() => crear.mutate()}
          disabled={crear.isPending || !form.pisoId || !form.numero}
          className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2 rounded-lg disabled:opacity-50"
        >
          {crear.isPending ? 'Creando...' : 'Crear'}
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

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">
      {msg}
    </div>
  );
}
