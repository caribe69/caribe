import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BedDouble,
  Plus,
  Layers,
  X,
  KeyRound,
  Sparkles,
  Wrench,
  Ban,
  CheckCircle2,
  Settings2,
} from 'lucide-react';
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

type EstadoKey =
  | 'TODAS'
  | 'DISPONIBLE'
  | 'OCUPADA'
  | 'ALISTANDO'
  | 'MANTENIMIENTO'
  | 'FUERA_SERVICIO';

const ESTADOS: Array<{
  key: EstadoKey;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  dotClass: string;
}> = [
  { key: 'TODAS', label: 'Todas', Icon: BedDouble, dotClass: 'bg-caribe-600' },
  {
    key: 'DISPONIBLE',
    label: 'Disponibles',
    Icon: CheckCircle2,
    dotClass: 'bg-emerald-500',
  },
  {
    key: 'OCUPADA',
    label: 'Ocupadas',
    Icon: KeyRound,
    dotClass: 'bg-rose-500',
  },
  {
    key: 'ALISTANDO',
    label: 'Limpieza',
    Icon: Sparkles,
    dotClass: 'bg-amber-500',
  },
  {
    key: 'MANTENIMIENTO',
    label: 'Mantenimiento',
    Icon: Wrench,
    dotClass: 'bg-blue-500',
  },
  {
    key: 'FUERA_SERVICIO',
    label: 'Fuera servicio',
    Icon: Ban,
    dotClass: 'bg-slate-500',
  },
];

const ESTADO_CARD: Record<
  string,
  {
    gradient: string;
    accent: string;
    iconBg: string;
    badgeBg: string;
    badgeText: string;
    label: string;
  }
> = {
  DISPONIBLE: {
    gradient: 'from-emerald-50 to-emerald-100/50',
    accent: 'border-l-emerald-500',
    iconBg: 'bg-emerald-500',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    label: 'Disponible',
  },
  OCUPADA: {
    gradient: 'from-rose-50 to-rose-100/50',
    accent: 'border-l-rose-500',
    iconBg: 'bg-rose-500',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-700',
    label: 'Ocupada',
  },
  ALISTANDO: {
    gradient: 'from-amber-50 to-amber-100/50',
    accent: 'border-l-amber-500',
    iconBg: 'bg-amber-500',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    label: 'Limpieza',
  },
  MANTENIMIENTO: {
    gradient: 'from-blue-50 to-blue-100/50',
    accent: 'border-l-blue-500',
    iconBg: 'bg-blue-500',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    label: 'Mantenimiento',
  },
  FUERA_SERVICIO: {
    gradient: 'from-slate-50 to-slate-100/50',
    accent: 'border-l-slate-500',
    iconBg: 'bg-slate-500',
    badgeBg: 'bg-slate-200',
    badgeText: 'text-slate-700',
    label: 'Fuera servicio',
  },
};

export default function Habitaciones() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<EstadoKey>('TODAS');
  const [showHabModal, setShowHabModal] = useState(false);
  const [showPisoModal, setShowPisoModal] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState<Habitacion | null>(null);

  const { data: habs, isLoading } = useQuery({
    queryKey: ['habitaciones'],
    queryFn: async () => (await api.get<Habitacion[]>('/habitaciones')).data,
  });

  const { data: pisos } = useQuery({
    queryKey: ['pisos'],
    queryFn: async () => (await api.get<Piso[]>('/pisos')).data,
  });

  const counts = useMemo(() => {
    const r: Record<string, number> = { TODAS: habs?.length || 0 };
    habs?.forEach((h) => (r[h.estado] = (r[h.estado] || 0) + 1));
    return r;
  }, [habs]);

  const filtradas = useMemo(() => {
    if (!habs) return [];
    if (filtro === 'TODAS') return habs;
    return habs.filter((h) => h.estado === filtro);
  }, [habs, filtro]);

  return (
    <div>
      {/* Header premium */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="font-hotel text-3xl sm:text-4xl font-bold text-caribe-900">
            Gestión de habitaciones
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Estado en tiempo real · {habs?.length || 0} habitaciones registradas
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPisoModal(true)}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm transition"
          >
            <Layers size={16} /> Nuevo piso
          </button>
          <button
            onClick={() => setShowHabModal(true)}
            disabled={!pisos || pisos.length === 0}
            className="flex items-center gap-2 bg-gradient-to-r from-caribe-700 to-caribe-600 hover:from-caribe-800 hover:to-caribe-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Plus size={16} /> Nueva habitación
          </button>
        </div>
      </div>

      {/* Filtros tipo pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {ESTADOS.map((e) => {
          const Icon = e.Icon;
          const active = filtro === e.key;
          const count = counts[e.key] || 0;
          return (
            <button
              key={e.key}
              onClick={() => setFiltro(e.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all ${
                active
                  ? 'bg-caribe-900 text-white shadow-md scale-[1.02]'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-caribe-400 hover:text-caribe-700'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${e.dotClass} ${active ? 'ring-2 ring-white/30' : ''}`}
              />
              <Icon size={14} />
              <span className="font-medium">{e.label}</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {pisos && pisos.length === 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 text-amber-800 p-4 rounded-xl mb-4 text-sm flex items-center gap-3">
          <Layers size={18} />
          <span>
            Esta sede aún no tiene pisos. Crea al menos un piso antes de agregar
            habitaciones.
          </span>
        </div>
      )}

      {isLoading && (
        <div className="text-slate-400 py-12 text-center">Cargando...</div>
      )}

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtradas.map((h) => {
          const theme = ESTADO_CARD[h.estado] || ESTADO_CARD.FUERA_SERVICIO;
          return (
            <div
              key={h.id}
              className={`group relative bg-gradient-to-br ${theme.gradient} border border-white/80 rounded-2xl p-5 border-l-4 ${theme.accent} shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
            >
              {/* Badge estado */}
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`inline-flex items-center gap-1.5 ${theme.badgeBg} ${theme.badgeText} text-[10px] uppercase tracking-widest font-semibold px-2.5 py-1 rounded-full`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${theme.iconBg}`}
                  />
                  {theme.label}
                </div>
                <div
                  className={`w-11 h-11 rounded-xl ${theme.iconBg} flex items-center justify-center shadow-sm`}
                >
                  <BedDouble size={22} className="text-white" />
                </div>
              </div>

              {/* Número */}
              <div className="font-hotel text-3xl font-bold text-caribe-900 leading-none">
                Nro. {h.numero}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Piso {h.piso.numero}
                {h.piso.nombre ? ` · ${h.piso.nombre}` : ''}
              </div>

              {/* Descripción */}
              {h.descripcion && (
                <div className="mt-3 text-sm text-slate-700 font-medium line-clamp-1">
                  {h.descripcion}
                </div>
              )}
              {h.caracteristicas && (
                <div className="mt-1 text-xs text-slate-500 line-clamp-2">
                  {h.caracteristicas}
                </div>
              )}

              {/* Precios */}
              <div className="mt-4 pt-4 border-t border-white/70 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-400">
                    Por hora
                  </div>
                  <div className="text-lg font-bold text-caribe-900">
                    S/ {Number(h.precioHora).toFixed(0)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest text-slate-400">
                    Por noche
                  </div>
                  <div className="text-lg font-bold text-caribe-900">
                    S/ {Number(h.precioNoche).toFixed(0)}
                  </div>
                </div>
              </div>

              {/* Acción cambiar estado */}
              <button
                onClick={() => setCambiandoEstado(h)}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-white/80 hover:bg-white text-slate-700 py-2 rounded-lg text-xs font-medium border border-white shadow-sm transition"
              >
                <Settings2 size={13} /> Cambiar estado
              </button>
            </div>
          );
        })}

        {!isLoading && filtradas.length === 0 && (
          <div className="col-span-full bg-white/70 backdrop-blur rounded-2xl border border-slate-200 p-12 text-center">
            <BedDouble
              size={40}
              className="mx-auto text-slate-300 mb-2"
            />
            <div className="text-slate-500">
              Sin habitaciones en este filtro.
            </div>
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
      {cambiandoEstado && (
        <CambiarEstadoModal
          habitacion={cambiandoEstado}
          onClose={() => {
            setCambiandoEstado(null);
            qc.invalidateQueries({ queryKey: ['habitaciones'] });
          }}
        />
      )}
    </div>
  );
}

/* ============================================================ */

function CambiarEstadoModal({
  habitacion,
  onClose,
}: {
  habitacion: Habitacion;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const estados: Array<{ key: string; label: string; color: string }> = [
    { key: 'DISPONIBLE', label: 'Disponible', color: 'bg-emerald-500' },
    { key: 'OCUPADA', label: 'Ocupada', color: 'bg-rose-500' },
    { key: 'ALISTANDO', label: 'Limpieza', color: 'bg-amber-500' },
    { key: 'MANTENIMIENTO', label: 'Mantenimiento', color: 'bg-blue-500' },
    { key: 'FUERA_SERVICIO', label: 'Fuera de servicio', color: 'bg-slate-500' },
  ];

  const cambiar = useMutation({
    mutationFn: async (estado: string) =>
      (await api.patch(`/habitaciones/${habitacion.id}/estado`, { estado }))
        .data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
      onClose();
    },
  });

  return (
    <Modal title={`Hab. ${habitacion.numero} · Cambiar estado`} onClose={onClose}>
      <div className="space-y-2">
        {estados.map((e) => (
          <button
            key={e.key}
            disabled={e.key === habitacion.estado || cambiar.isPending}
            onClick={() => cambiar.mutate(e.key)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition ${
              e.key === habitacion.estado
                ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                : 'bg-white border-slate-200 hover:border-caribe-400 hover:bg-caribe-50'
            }`}
          >
            <span className={`w-3 h-3 rounded-full ${e.color}`} />
            <span className="text-sm font-medium text-slate-700">{e.label}</span>
            {e.key === habitacion.estado && (
              <span className="ml-auto text-xs text-slate-400">actual</span>
            )}
          </button>
        ))}
      </div>
    </Modal>
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
      <Field label="Número de piso">
        <input
          type="number"
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-caribe-500 focus:border-caribe-500 outline-none"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
        />
      </Field>
      <Field label="Nombre (opcional)">
        <input
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-caribe-500 focus:border-caribe-500 outline-none"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </Field>
      {error && <ErrorBox msg={error} />}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onClose}
          className="flex-1 bg-slate-100 hover:bg-slate-200 py-2.5 rounded-lg text-slate-700"
        >
          Cancelar
        </button>
        <button
          onClick={() => crear.mutate()}
          disabled={crear.isPending || !numero}
          className="flex-1 bg-gradient-to-r from-caribe-700 to-caribe-600 text-white py-2.5 rounded-lg disabled:opacity-50"
        >
          {crear.isPending ? 'Creando...' : 'Crear piso'}
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

  const inputCls =
    'w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-caribe-500 focus:border-caribe-500 outline-none';

  return (
    <Modal title="Nueva habitación" onClose={onClose}>
      <Field label="Piso">
        <select
          className={inputCls}
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
      </Field>
      <Field label="Número de habitación">
        <input
          placeholder="Ej. 101"
          className={inputCls}
          value={form.numero}
          onChange={(e) => setForm({ ...form, numero: e.target.value })}
        />
      </Field>
      <Field label="Descripción (opcional)">
        <input
          className={inputCls}
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
        />
      </Field>
      <Field label="Características (opcional)">
        <input
          placeholder="Cama doble, TV, WiFi..."
          className={inputCls}
          value={form.caracteristicas}
          onChange={(e) => setForm({ ...form, caracteristicas: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Precio por hora">
          <input
            type="number"
            step="0.01"
            className={inputCls}
            value={form.precioHora}
            onChange={(e) => setForm({ ...form, precioHora: e.target.value })}
          />
        </Field>
        <Field label="Precio por noche">
          <input
            type="number"
            step="0.01"
            className={inputCls}
            value={form.precioNoche}
            onChange={(e) => setForm({ ...form, precioNoche: e.target.value })}
          />
        </Field>
      </div>
      {error && <ErrorBox msg={error} />}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onClose}
          className="flex-1 bg-slate-100 hover:bg-slate-200 py-2.5 rounded-lg text-slate-700"
        >
          Cancelar
        </button>
        <button
          onClick={() => crear.mutate()}
          disabled={crear.isPending || !form.pisoId || !form.numero}
          className="flex-1 bg-gradient-to-r from-caribe-700 to-caribe-600 text-white py-2.5 rounded-lg disabled:opacity-50"
        >
          {crear.isPending ? 'Creando...' : 'Crear habitación'}
        </button>
      </div>
    </Modal>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
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
    <div className="fixed inset-0 bg-caribe-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-white">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-hotel text-xl font-semibold text-caribe-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100"
          >
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
    <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">
      {msg}
    </div>
  );
}
