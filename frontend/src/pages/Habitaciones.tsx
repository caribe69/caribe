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
  Camera,
  Pencil,
  Trash2,
  Search,
  ArrowUpDown,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ThumbImg } from '@/lib/imageUrl';
import FotosHabitacionModal from '@/components/FotosHabitacionModal';
import { useDialog } from '@/components/ConfirmProvider';
import { useToast } from '@/components/ToastProvider';

interface Habitacion {
  id: number;
  numero: string;
  descripcion?: string;
  caracteristicas?: string;
  estado: string;
  precioHora: string;
  precioNoche: string;
  piso: { id: number; numero: number; nombre?: string };
  fotos?: Array<{ id: number; path: string; orden: number }>;
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
  | 'FUERA_SERVICIO'
  | 'INACTIVAS';

const ESTADOS: Array<{
  key: EstadoKey;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  dotClass: string;
}> = [
  { key: 'TODAS', label: 'Todas', Icon: BedDouble, dotClass: 'bg-violet-600' },
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
  {
    key: 'INACTIVAS',
    label: 'Inactivas',
    Icon: Trash2,
    dotClass: 'bg-rose-500',
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
    gradient:
      'from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30',
    accent: 'border-l-emerald-500',
    iconBg: 'bg-emerald-500',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    label: 'Disponible',
  },
  OCUPADA: {
    gradient:
      'from-rose-50 to-rose-100/50 dark:from-rose-950/50 dark:to-rose-900/30',
    accent: 'border-l-rose-500',
    iconBg: 'bg-rose-500',
    badgeBg: 'bg-rose-100 dark:bg-rose-900/50',
    badgeText: 'text-rose-700 dark:text-rose-300',
    label: 'Ocupada',
  },
  ALISTANDO: {
    gradient:
      'from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30',
    accent: 'border-l-amber-500',
    iconBg: 'bg-amber-500',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/50',
    badgeText: 'text-amber-800 dark:text-amber-300',
    label: 'Limpieza',
  },
  MANTENIMIENTO: {
    gradient:
      'from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30',
    accent: 'border-l-blue-500',
    iconBg: 'bg-blue-500',
    badgeBg: 'bg-blue-100 dark:bg-blue-900/50',
    badgeText: 'text-blue-700 dark:text-blue-300',
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
  const dialog = useDialog();
  const { show: toast } = useToast();
  const [filtro, setFiltro] = useState<EstadoKey>('TODAS');
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<
    'numero-asc' | 'numero-desc' | 'piso-numero' | 'precio-asc' | 'precio-desc'
  >('piso-numero');
  const [showHabModal, setShowHabModal] = useState(false);
  const [showPisoModal, setShowPisoModal] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState<Habitacion | null>(null);
  const [fotosHab, setFotosHab] = useState<Habitacion | null>(null);
  const [editandoHab, setEditandoHab] = useState<Habitacion | null>(null);

  const eliminarHab = useMutation({
    mutationFn: async (id: number) =>
      (await api.delete(`/habitaciones/${id}`)).data,
    onSuccess: () => {
      toast({
        type: 'success',
        title: 'Habitación archivada',
        description: 'La encontrás en la pestaña "Inactivas".',
      });
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
    },
    onError: (err: any) =>
      toast({
        type: 'error',
        title: 'No se pudo archivar',
        description: err.response?.data?.message || 'Error',
      }),
  });

  const confirmarEliminar = async (h: Habitacion) => {
    const ok = await dialog.confirm({
      title: `¿Archivar habitación ${h.numero}?`,
      message:
        'La habitación pasa a "Inactivas" y deja de operar. Mantiene el historial. Podés reactivarla cuando quieras desde la pestaña "Inactivas".',
      confirmText: 'Archivar',
      variant: 'warning',
    });
    if (ok) eliminarHab.mutate(h.id);
  };
  const [verImplementos, setVerImplementos] = useState<Habitacion | null>(null);

  const verInactivas = filtro === 'INACTIVAS';

  const { data: habs, isLoading } = useQuery({
    queryKey: ['habitaciones', verInactivas ? 'inactivas' : 'activas'],
    queryFn: async () =>
      (
        await api.get<Habitacion[]>(
          verInactivas ? '/habitaciones?inactivas=true' : '/habitaciones',
        )
      ).data,
  });

  const reactivar = useMutation({
    mutationFn: async (vars: { id: number; numero?: string }) =>
      (await api.post(`/habitaciones/${vars.id}/reactivar`, { numero: vars.numero }))
        .data,
    onSuccess: () => {
      toast({ type: 'success', title: 'Habitación reactivada' });
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
    },
    onError: (err: any) =>
      toast({
        type: 'error',
        title: 'No se pudo reactivar',
        description: err.response?.data?.message || 'Error',
      }),
  });

  const pedirReactivar = async (h: Habitacion) => {
    // Quitar el sufijo _DEL_N_TIMESTAMP del número original
    const original = h.numero.replace(/_DEL_\d+_\d+$/, '');
    const numero = await dialog.prompt({
      title: `Reactivar habitación`,
      message: `Indicá el número final (sin sufijo) para reactivar. El original era "${original}".`,
      defaultValue: original,
      placeholder: 'Ej: 407',
      minLength: 1,
      confirmText: 'Reactivar',
      variant: 'info',
    });
    if (numero && numero.trim()) {
      reactivar.mutate({ id: h.id, numero: numero.trim() });
    }
  };

  const { data: pisos } = useQuery({
    queryKey: ['pisos'],
    queryFn: async () => (await api.get<Piso[]>('/pisos')).data,
  });

  // Implementos por habitación: cada unidad tiene tipo + estado + habitacionId.
  // Agrupamos para mostrar "actualmente acá" vs "lavando/lavados".
  interface ImpUnidad {
    id: number;
    estado: string;
    habitacionId: number | null;
    tipo: { nombre: string; icono: string | null };
  }
  const { data: impUnidades } = useQuery<ImpUnidad[]>({
    queryKey: ['implementos', 'unidades'],
    queryFn: async () => (await api.get('/implementos')).data,
  });

  // Map: habitacionId → { aqui: number, lavanderia: number, lavado: number, tipos: [emoji + cant] }
  const implPorHab = useMemo(() => {
    const map = new Map<
      number,
      {
        aqui: number;
        lavanderia: number;
        lavado: number;
        porTipo: Map<string, { icono: string; aqui: number; fuera: number }>;
      }
    >();
    for (const u of impUnidades || []) {
      if (!u.habitacionId) continue;
      const e =
        map.get(u.habitacionId) ||
        { aqui: 0, lavanderia: 0, lavado: 0, porTipo: new Map() };
      if (u.estado === 'EN_HABITACION') e.aqui++;
      else if (u.estado === 'EN_LAVANDERIA') e.lavanderia++;
      else if (u.estado === 'LAVADO') e.lavado++;
      const key = u.tipo.nombre;
      const t =
        e.porTipo.get(key) || { icono: u.tipo.icono || '📦', aqui: 0, fuera: 0 };
      if (u.estado === 'EN_HABITACION') t.aqui++;
      else if (
        u.estado === 'EN_LAVANDERIA' ||
        u.estado === 'LAVADO' ||
        u.estado === 'EN_TRANSITO'
      )
        t.fuera++;
      e.porTipo.set(key, t);
      map.set(u.habitacionId, e);
    }
    return map;
  }, [impUnidades]);

  const counts = useMemo(() => {
    const r: Record<string, number> = { TODAS: habs?.length || 0 };
    habs?.forEach((h) => (r[h.estado] = (r[h.estado] || 0) + 1));
    return r;
  }, [habs]);

  const filtradas = useMemo(() => {
    if (!habs) return [];
    // 1. Filtro por estado (excepto TODAS/INACTIVAS que muestran todo del set actual)
    let lista =
      filtro === 'INACTIVAS' || filtro === 'TODAS'
        ? habs
        : habs.filter((h) => h.estado === filtro);

    // 2. Búsqueda (por número limpio, descripción o características)
    const q = busqueda.trim().toLowerCase();
    if (q) {
      lista = lista.filter((h) => {
        const numLimpio = h.numero.replace(/_DEL_\d+_\d+$/, '').toLowerCase();
        return (
          numLimpio.includes(q) ||
          (h.descripcion || '').toLowerCase().includes(q) ||
          (h.caracteristicas || '').toLowerCase().includes(q)
        );
      });
    }

    // 3. Ordenamiento (numérico para que 101, 102, ..., 999 funcione bien)
    const numOf = (h: Habitacion) => {
      const limpio = h.numero.replace(/_DEL_\d+_\d+$/, '');
      const m = limpio.match(/\d+/);
      return m ? parseInt(m[0], 10) : 999999;
    };
    const sorted = [...lista];
    switch (orden) {
      case 'numero-asc':
        sorted.sort((a, b) => numOf(a) - numOf(b));
        break;
      case 'numero-desc':
        sorted.sort((a, b) => numOf(b) - numOf(a));
        break;
      case 'precio-asc':
        sorted.sort((a, b) => Number(a.precioNoche) - Number(b.precioNoche));
        break;
      case 'precio-desc':
        sorted.sort((a, b) => Number(b.precioNoche) - Number(a.precioNoche));
        break;
      case 'piso-numero':
      default:
        sorted.sort((a, b) => {
          if (a.piso.numero !== b.piso.numero)
            return a.piso.numero - b.piso.numero;
          return numOf(a) - numOf(b);
        });
        break;
    }
    return sorted;
  }, [habs, filtro, busqueda, orden]);

  return (
    <div>
      {/* Header limpio */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <div className="text-sm text-slate-500">
          Estado en tiempo real ·{' '}
          <span className="font-semibold text-slate-700">
            {habs?.length || 0} habitaciones
          </span>{' '}
          en esta sede
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPisoModal(true)}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm transition btn-press"
          >
            <Layers size={16} /> Nuevo piso
          </button>
          <button
            onClick={() => setShowHabModal(true)}
            disabled={!pisos || pisos.length === 0}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-violet-500/30 transition disabled:opacity-60 disabled:cursor-not-allowed btn-press"
          >
            <Plus size={16} /> Nueva habitación
          </button>
        </div>
      </div>

      {/* Buscador + orden */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por número, descripción o características…"
            className="w-full pl-9 pr-9 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 flex items-center justify-center"
              title="Limpiar"
            >
              <X size={11} />
            </button>
          )}
        </div>

        <div className="relative inline-flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
          <ArrowUpDown
            size={14}
            className="ml-3 text-slate-400 pointer-events-none"
          />
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as any)}
            className="appearance-none bg-transparent pl-2 pr-8 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="piso-numero">Piso → Número</option>
            <option value="numero-asc">N° ascendente</option>
            <option value="numero-desc">N° descendente</option>
            <option value="precio-asc">Precio menor → mayor</option>
            <option value="precio-desc">Precio mayor → menor</option>
          </select>
          <span className="absolute right-3 text-slate-400 pointer-events-none">
            ▾
          </span>
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
                  ? 'bg-violet-900 text-white shadow-md scale-[1.02]'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-violet-400 hover:text-violet-700'
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
        <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/30 dark:to-amber-800/20 border border-amber-200 text-amber-800 dark:text-amber-200 p-4 rounded-xl mb-4 text-sm flex items-center gap-3">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-children">
        {filtradas.map((h) => {
          const theme = ESTADO_CARD[h.estado] || ESTADO_CARD.FUERA_SERVICIO;
          return (
            <div
              key={h.id}
              className={`group relative bg-gradient-to-br ${theme.gradient} dark:from-slate-800 dark:to-slate-800/60 border border-white/80 dark:border-slate-700 rounded-2xl overflow-hidden border-l-4 ${theme.accent} shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
            >
              {/* Foto principal como cabecera si hay */}
              {h.fotos && h.fotos.length > 0 ? (
                <div
                  className="relative h-32 w-full bg-slate-200 overflow-hidden cursor-pointer"
                  onClick={() => setFotosHab(h)}
                >
                  <ThumbImg
                    src={h.fotos[0].path}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFotosHab(h);
                    }}
                    className="absolute top-2 right-2 bg-white/90 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 shadow-sm backdrop-blur"
                  >
                    <Camera size={11} /> {h.fotos.length}
                  </button>
                  <div
                    className={`absolute bottom-2 left-2 inline-flex items-center gap-1.5 ${theme.badgeBg} ${theme.badgeText} text-[10px] uppercase tracking-widest font-semibold px-2.5 py-1 rounded-full shadow-sm`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${theme.iconBg}`} />
                    {theme.label}
                  </div>
                </div>
              ) : (
                /* Placeholder cuando no hay fotos */
                <div
                  className="relative h-32 w-full bg-slate-100 border-b border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition"
                  onClick={() => setFotosHab(h)}
                >
                  <Camera size={22} className="text-slate-400 mb-1" />
                  <div className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                    Agregar fotos
                  </div>
                  <div
                    className={`absolute bottom-2 left-2 inline-flex items-center gap-1.5 ${theme.badgeBg} ${theme.badgeText} text-[10px] uppercase tracking-widest font-semibold px-2.5 py-1 rounded-full shadow-sm`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${theme.iconBg}`} />
                    {theme.label}
                  </div>
                </div>
              )}
              <div className="p-5">

              {/* Número (en inactivas, mostrar el original limpio) */}
              <div className="font-hotel text-3xl font-bold text-slate-900 leading-none">
                Nro. {h.numero.replace(/_DEL_\d+_\d+$/, '')}
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

              {/* Chip compacto de implementos — click para abrir detalle */}
              {(() => {
                const impl = implPorHab.get(h.id);
                if (!impl) return null;
                const total = impl.aqui + impl.lavanderia + impl.lavado;
                if (total === 0) return null;
                const fuera = impl.lavanderia + impl.lavado;
                const completa = fuera === 0;
                return (
                  <button
                    onClick={() => setVerImplementos(h)}
                    className={`mt-2 w-full inline-flex items-center justify-between gap-2 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition ${
                      completa
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                        : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                    }`}
                    title="Ver detalle de implementos"
                  >
                    <span className="flex items-center gap-1.5">
                      📦 {impl.aqui}/{total} aquí
                    </span>
                    <span className="flex items-center gap-1 text-[10px]">
                      {impl.lavanderia > 0 && (
                        <span className="text-blue-700 dark:text-blue-300">
                          🧼 {impl.lavanderia}
                        </span>
                      )}
                      {impl.lavado > 0 && (
                        <span className="text-cyan-700 dark:text-cyan-300">
                          ✨ {impl.lavado}
                        </span>
                      )}
                      <span className="opacity-60">→</span>
                    </span>
                  </button>
                );
              })()}

              {/* Precios */}
              <div className="mt-4 pt-4 border-t border-white/70 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-400">
                    Por hora
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    S/ {Number(h.precioHora).toFixed(0)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest text-slate-400">
                    Por noche
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    S/ {Number(h.precioNoche).toFixed(0)}
                  </div>
                </div>
              </div>

              {/* Acciones */}
              {verInactivas ? (
                <div className="mt-4">
                  <div className="bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-lg px-3 py-2 mb-2 text-[11px] text-rose-700 dark:text-rose-300 font-semibold uppercase tracking-wider">
                    💤 Habitación archivada
                  </div>
                  <button
                    onClick={() => pedirReactivar(h)}
                    disabled={reactivar.isPending}
                    className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
                  >
                    <CheckCircle2 size={12} /> Reactivar
                  </button>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCambiandoEstado(h)}
                    className="flex items-center justify-center gap-1.5 bg-white/80 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-xs font-medium border border-white dark:border-slate-700 shadow-sm transition"
                  >
                    <Settings2 size={12} /> Estado
                  </button>
                  <button
                    onClick={() => setFotosHab(h)}
                    className="flex items-center justify-center gap-1.5 bg-white/80 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-xs font-medium border border-white dark:border-slate-700 shadow-sm transition"
                  >
                    <Camera size={12} /> Fotos
                  </button>
                  <button
                    onClick={() => setEditandoHab(h)}
                    className="flex items-center justify-center gap-1.5 bg-violet-50 dark:bg-violet-900/30 hover:bg-violet-100 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-200 py-2 rounded-lg text-xs font-medium border border-violet-200 dark:border-violet-800 shadow-sm transition"
                  >
                    <Pencil size={12} /> Editar
                  </button>
                  <button
                    onClick={() => confirmarEliminar(h)}
                    disabled={eliminarHab.isPending}
                    className="flex items-center justify-center gap-1.5 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-200 py-2 rounded-lg text-xs font-medium border border-rose-200 dark:border-rose-800 shadow-sm transition disabled:opacity-50"
                  >
                    <Trash2 size={12} /> Archivar
                  </button>
                </div>
              )}
              </div>
            </div>
          );
        })}

        {!isLoading && filtradas.length === 0 && (
          <div className="col-span-full bg-white/70 dark:bg-slate-900/60 backdrop-blur rounded-2xl border border-slate-200 p-12 text-center">
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
      {editandoHab && (
        <HabitacionModal
          pisos={pisos || []}
          editar={editandoHab}
          onClose={() => setEditandoHab(null)}
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
      {fotosHab && (
        <FotosHabitacionModal
          habitacionId={fotosHab.id}
          numero={fotosHab.numero}
          onClose={() => setFotosHab(null)}
        />
      )}
      {verImplementos && (
        <DetalleImplementosModal
          habitacion={verImplementos}
          onClose={() => setVerImplementos(null)}
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
                : 'bg-white border-slate-200 hover:border-violet-400 hover:bg-violet-50'
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
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
        />
      </Field>
      <Field label="Nombre (opcional)">
        <input
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
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
          className="flex-1 bg-gradient-to-r from-violet-700 to-violet-600 text-white py-2.5 rounded-lg disabled:opacity-50"
        >
          {crear.isPending ? 'Creando...' : 'Crear piso'}
        </button>
      </div>
    </Modal>
  );
}

function HabitacionModal({
  pisos,
  editar,
  onClose,
}: {
  pisos: Piso[];
  editar?: Habitacion;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const esEdicion = !!editar;
  const [form, setForm] = useState({
    pisoId: editar ? String(editar.piso.id) : '',
    numero: editar?.numero || '',
    descripcion: editar?.descripcion || '',
    caracteristicas: editar?.caracteristicas || '',
    precioHora: editar ? String(editar.precioHora) : '',
    precioNoche: editar ? String(editar.precioNoche) : '',
  });
  const [error, setError] = useState<string | null>(null);

  const crear = useMutation({
    mutationFn: async () => {
      const payload = {
        pisoId: Number(form.pisoId),
        numero: form.numero,
        descripcion: form.descripcion || undefined,
        caracteristicas: form.caracteristicas || undefined,
        precioHora: Number(form.precioHora),
        precioNoche: Number(form.precioNoche),
      };
      if (esEdicion) {
        return (await api.patch(`/habitaciones/${editar!.id}`, payload)).data;
      }
      return (await api.post('/habitaciones', payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Error'),
  });

  const inputCls =
    'w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none';

  return (
    <Modal title={esEdicion ? `Editar habitación ${editar!.numero}` : 'Nueva habitación'} onClose={onClose}>
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
          className="flex-1 bg-gradient-to-r from-violet-700 to-violet-600 text-white py-2.5 rounded-lg disabled:opacity-50"
        >
          {crear.isPending
            ? esEdicion
              ? 'Guardando...'
              : 'Creando...'
            : esEdicion
              ? 'Guardar cambios'
              : 'Crear habitación'}
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
    <div className="fixed inset-0 bg-violet-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-white dark:border-slate-700 animate-scale-in">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-hotel text-xl font-semibold text-slate-900">
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

// ────────────────────────────────────────────────────────────
// Modal de detalle de implementos por habitación
// ────────────────────────────────────────────────────────────
interface UnidadFull {
  id: number;
  codigo: string;
  estado: string;
  notas: string | null;
  tipo: { id: number; nombre: string; icono: string | null };
  habitacion: { id: number; numero: string } | null;
}

const ESTADO_LABELS: Record<
  string,
  { label: string; color: string; emoji: string }
> = {
  EN_HABITACION: { label: 'Aquí', color: 'emerald', emoji: '🏠' },
  EN_LAVANDERIA: { label: 'Sucio · lavandería', color: 'blue', emoji: '🧼' },
  LAVADO: { label: 'Lavado · esperando', color: 'cyan', emoji: '✨' },
  EN_TRANSITO: { label: 'En tránsito', color: 'amber', emoji: '🚚' },
  SIN_ASIGNAR: { label: 'Sin asignar', color: 'slate', emoji: '📦' },
  PERDIDO: { label: 'Perdido', color: 'rose', emoji: '❓' },
  DANADO: { label: 'Dañado', color: 'orange', emoji: '💔' },
};

function DetalleImplementosModal({
  habitacion,
  onClose,
}: {
  habitacion: Habitacion;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  // Sheet inferior para acciones — más espacio, no se sale del modal
  const [accionPara, setAccionPara] = useState<UnidadFull | null>(null);

  const unidadesQ = useQuery<UnidadFull[]>({
    queryKey: ['implementos', 'unidades', 'hab', habitacion.id],
    queryFn: async () =>
      (await api.get(`/implementos?habitacionId=${habitacion.id}`)).data,
  });

  const accion = useMutation({
    mutationFn: async (vars: {
      unidadId: number;
      tipo: 'almacen' | 'danado' | 'perdido';
      notas?: string;
    }) => {
      if (vars.tipo === 'almacen') {
        return (
          await api.patch(`/implementos/${vars.unidadId}/asignar-habitacion`, {
            habitacionId: null,
          })
        ).data;
      }
      if (vars.tipo === 'danado') {
        return (
          await api.post(`/implementos/${vars.unidadId}/danado`, {
            notas: vars.notas || undefined,
          })
        ).data;
      }
      return (
        await api.post(`/implementos/${vars.unidadId}/perdido`, {
          notas: vars.notas || undefined,
        })
      ).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['implementos'] });
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
      setAccionPara(null);
    },
  });

  const porTipo = useMemo(() => {
    const map = new Map<string, { icono: string; unidades: UnidadFull[] }>();
    for (const u of unidadesQ.data || []) {
      const key = u.tipo.nombre;
      const entry =
        map.get(key) || { icono: u.tipo.icono || '📦', unidades: [] };
      entry.unidades.push(u);
      map.set(key, entry);
    }
    return Array.from(map.entries());
  }, [unidadesQ.data]);

  const totales = useMemo(() => {
    const r = { aqui: 0, sucio: 0, lavado: 0 };
    for (const u of unidadesQ.data || []) {
      if (u.estado === 'EN_HABITACION') r.aqui++;
      else if (u.estado === 'EN_LAVANDERIA') r.sucio++;
      else if (u.estado === 'LAVADO') r.lavado++;
    }
    return r;
  }, [unidadesQ.data]);

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-700 text-white p-5 flex justify-between items-start z-10">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-2xl">
              📦
            </div>
            <div>
              <h2 className="font-hotel text-lg font-bold">
                Implementos · Hab. {habitacion.numero}
              </h2>
              <div className="text-xs opacity-90 mt-0.5">
                Detalle de cada pieza con su estado actual
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 pb-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-2">
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                {totales.aqui}
              </div>
              <div className="text-[10px] uppercase tracking-widest font-semibold text-emerald-700 dark:text-emerald-300">
                🏠 Aquí
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 tabular-nums">
                {totales.sucio}
              </div>
              <div className="text-[10px] uppercase tracking-widest font-semibold text-blue-700 dark:text-blue-300">
                🧼 Sucios
              </div>
            </div>
            <div className="bg-cyan-50 dark:bg-cyan-900/30 rounded-lg p-2">
              <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-300 tabular-nums">
                {totales.lavado}
              </div>
              <div className="text-[10px] uppercase tracking-widest font-semibold text-cyan-700 dark:text-cyan-300">
                ✨ Lavados
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5">
          {unidadesQ.isLoading && (
            <div className="text-slate-400 text-sm text-center py-8">
              Cargando…
            </div>
          )}
          {!unidadesQ.isLoading && porTipo.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📦</div>
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Sin implementos asignados
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Andá a Implementos → Nueva unidad para agregar a esta hab.
              </div>
            </div>
          )}
          <div className="space-y-4">
            {porTipo.map(([nombre, grupo]) => {
              const aqui = grupo.unidades.filter(
                (u) => u.estado === 'EN_HABITACION',
              ).length;
              const total = grupo.unidades.length;
              const completo = aqui === total;
              return (
                <div
                  key={nombre}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden"
                >
                  {/* Header del tipo */}
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700">
                    <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xl shrink-0">
                      {grupo.icono}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm capitalize truncate">
                        {nombre}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                        {total} unidad{total === 1 ? '' : 'es'}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded ${
                        completo
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {aqui}/{total} {completo ? '✓' : 'aquí'}
                    </span>
                  </div>

                  {/* Unidades */}
                  <div>
                    {grupo.unidades.map((u, i) => {
                      const s =
                        ESTADO_LABELS[u.estado] || ESTADO_LABELS.SIN_ASIGNAR;
                      const accionable = u.estado === 'EN_HABITACION';
                      const isLast = i === grupo.unidades.length - 1;
                      return (
                        <div
                          key={u.id}
                          className={`flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition ${
                            !isLast
                              ? 'border-b border-slate-100 dark:border-slate-800/60'
                              : ''
                          }`}
                        >
                          {/* Código con dot de estado */}
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 bg-${s.color}-500`}
                              title={s.label}
                            />
                            <div className="min-w-0">
                              <div className="font-mono font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">
                                {u.codigo}
                              </div>
                              {u.notas && (
                                <div
                                  className="text-[10px] text-slate-500 truncate"
                                  title={u.notas}
                                >
                                  {u.notas}
                                </div>
                              )}
                            </div>
                          </div>

                          <span
                            className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-${s.color}-100 text-${s.color}-700 dark:bg-${s.color}-900/40 dark:text-${s.color}-300`}
                          >
                            <span>{s.emoji}</span>
                            <span className="hidden sm:inline">{s.label}</span>
                          </span>

                          {accionable && (
                            <button
                              onClick={() => setAccionPara(u)}
                              className="shrink-0 w-7 h-7 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 text-lg font-bold leading-none"
                              title="Acciones"
                            >
                              ⋯
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sheet inferior con acciones — no se sale del modal */}
      {accionPara && (
        <AccionesUnidadSheet
          unidad={accionPara}
          onClose={() => setAccionPara(null)}
          onAccion={(tipo, notas) =>
            accion.mutate({ unidadId: accionPara.id, tipo, notas })
          }
          loading={accion.isPending}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Sheet inferior con acciones para una unidad de implemento
// ────────────────────────────────────────────────────────────
type AccionTipo = 'almacen' | 'danado' | 'perdido';

function AccionesUnidadSheet({
  unidad,
  onClose,
  onAccion,
  loading,
}: {
  unidad: UnidadFull;
  onClose: () => void;
  onAccion: (tipo: AccionTipo, notas?: string) => void;
  loading: boolean;
}) {
  const [tipo, setTipo] = useState<AccionTipo | null>(null);
  const [notas, setNotas] = useState('');

  const opciones: Array<{
    key: AccionTipo;
    emoji: string;
    titulo: string;
    desc: string;
    accent: string;
    btn: string;
  }> = [
    {
      key: 'almacen',
      emoji: '📦',
      titulo: 'Mover al almacén',
      desc: 'La unidad sale de esta habitación y queda lista para reasignar.',
      accent:
        'border-slate-200 dark:border-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60',
      btn: 'bg-slate-700 hover:bg-slate-800 text-white',
    },
    {
      key: 'danado',
      emoji: '💔',
      titulo: 'Marcar como dañada',
      desc: 'Queda fuera de uso (rota o irrecuperable). No vuelve al ciclo.',
      accent:
        'border-orange-200 dark:border-orange-900/50 hover:border-orange-400 hover:bg-orange-50/70 dark:hover:bg-orange-950/30',
      btn: 'bg-orange-600 hover:bg-orange-700 text-white',
    },
    {
      key: 'perdido',
      emoji: '❓',
      titulo: 'Marcar como perdida',
      desc: 'La unidad no aparece. Se preserva en el historial para revisión.',
      accent:
        'border-rose-200 dark:border-rose-900/50 hover:border-rose-400 hover:bg-rose-50/70 dark:hover:bg-rose-950/30',
      btn: 'bg-rose-600 hover:bg-rose-700 text-white',
    },
  ];

  const seleccionada = opciones.find((o) => o.key === tipo);

  const confirmar = () => {
    if (!tipo) return;
    onAccion(tipo, tipo === 'almacen' ? undefined : notas.trim() || undefined);
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={(e) => {
        e.stopPropagation();
        if (!loading) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up sm:animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="sm:hidden pt-2 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 flex items-center justify-center text-xl shrink-0">
            ⚙️
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
              Acción sobre la unidad
            </div>
            <div className="font-mono font-bold text-slate-900 dark:text-slate-100 truncate">
              {unidad.codigo}
            </div>
            <div className="text-xs text-slate-500 truncate capitalize">
              {unidad.tipo.icono} {unidad.tipo.nombre}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        {/* Lista de opciones */}
        <div className="p-4 space-y-2">
          {opciones.map((o) => {
            const activa = tipo === o.key;
            return (
              <button
                key={o.key}
                onClick={() => setTipo(o.key)}
                disabled={loading}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-2xl border-2 transition disabled:opacity-50 ${
                  activa
                    ? 'border-violet-500 bg-violet-50/70 dark:bg-violet-950/30 ring-2 ring-violet-200 dark:ring-violet-900/40'
                    : o.accent
                }`}
              >
                <div className="text-2xl shrink-0 leading-none mt-0.5">
                  {o.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    {o.titulo}
                  </div>
                  <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                    {o.desc}
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 shrink-0 mt-1 flex items-center justify-center ${
                    activa
                      ? 'border-violet-600 bg-violet-600'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {activa && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Nota opcional sólo para dañado/perdido */}
        {tipo && tipo !== 'almacen' && (
          <div className="px-4 pb-3">
            <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1.5">
              Nota (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              disabled={loading}
              rows={2}
              maxLength={200}
              placeholder={
                tipo === 'danado'
                  ? 'Ej: rota la cremallera, mancha permanente, etc.'
                  : 'Ej: no apareció en última revisión, etc.'
              }
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            />
          </div>
        )}

        {/* Footer */}
        <div className="px-4 pb-5 pt-2 flex gap-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={!tipo || loading}
            className={`flex-[2] py-2.5 rounded-xl text-sm font-bold shadow disabled:opacity-40 disabled:cursor-not-allowed transition ${
              seleccionada?.btn ?? 'bg-slate-300 text-slate-600'
            }`}
          >
            {loading
              ? 'Procesando…'
              : seleccionada
                ? `Confirmar · ${seleccionada.titulo}`
                : 'Elegí una acción'}
          </button>
        </div>
      </div>
    </div>
  );
}
