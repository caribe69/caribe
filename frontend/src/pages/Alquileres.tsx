import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList,
  X,
  CheckCircle,
  Plus,
  ShoppingBag,
  BedDouble,
  Grid3x3,
  List,
  Search,
  UserCheck,
  Loader2,
  Printer,
  Clock3,
  CalendarPlus,
  Briefcase,
  Package,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useDialog } from '@/components/ConfirmProvider';
import BoletaAlquiler from '@/components/BoletaAlquiler';
import ReservaGrupalModal from '@/components/ReservaGrupalModal';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/components/ToastProvider';

interface Habitacion {
  id: number;
  numero: string;
  descripcion?: string;
  caracteristicas?: string;
  precioHora: string;
  precioNoche: string;
  estado: string;
  piso: { id: number; numero: number; nombre?: string };
  fotos?: Array<{ id: number; path: string; orden: number }>;
  alquileres?: Array<{
    id: number;
    estado: string;
    clienteNombre: string;
    clienteDni: string;
    clienteFechaNacimiento?: string | null;
    fechaIngreso: string;
    fechaSalida: string;
    fechaSalidaReal: string | null;
    total: string;
    creadoEn: string;
    pagado?: boolean;
    montoPagado?: string;
    amenitiesEntregados?: boolean;
  }>;
}

interface Alquiler {
  id: number;
  creadoEn: string;
  clienteNombre: string;
  clienteDni: string;
  clienteFechaNacimiento?: string | null;
  tipoComprobante?: string | null;
  clienteRuc?: string | null;
  clienteRazonSocial?: string | null;
  clienteDireccionFiscal?: string | null;
  pagado?: boolean;
  montoPagado?: string;
  pagadoEn?: string | null;
  turnoCajaId?: number | null;
  turnoPagoId?: number | null;
  cobradoPor?: { id?: number; nombre: string } | null;
  amenitiesEntregados?: boolean;
  amenitiesNotas?: string | null;
  fechaIngreso: string;
  fechaSalida: string;
  total: string;
  totalProductos: string;
  precioHabitacion: string;
  metodoPago: string;
  estado: string;
  motivoAnulacion?: string | null;
  habitacion: {
    id: number;
    numero: string;
    descripcion?: string | null;
    piso: { numero: number };
  };
  consumos: Array<{
    id: number;
    cantidad: number;
    precioUnit: string;
    subtotal: string;
    producto: { nombre: string };
  }>;
  creadoPor?: { id?: number; nombre: string; username?: string } | null;
  sede?: { nombre?: string };
}

export default function Alquileres() {
  const [vista, setVista] = useState<'mapa' | 'lista'>('mapa');
  const [grupalOpen, setGrupalOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <button
          onClick={() => setGrupalOpen(true)}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-amber-500/30 transition btn-press"
        >
          <Briefcase size={16} /> Reserva corporativa
        </button>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setVista('mapa')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition btn-press ${
              vista === 'mapa'
                ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-md shadow-violet-500/30'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Grid3x3 size={14} /> Mapa
          </button>
          <button
            onClick={() => setVista('lista')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition btn-press ${
              vista === 'lista'
                ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-md shadow-violet-500/30'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <List size={14} /> Lista
          </button>
        </div>
      </div>

      {vista === 'mapa' ? <MapaHabitaciones /> : <ListaAlquileres />}

      {grupalOpen && (
        <ReservaGrupalModal onClose={() => setGrupalOpen(false)} />
      )}
    </div>
  );
}

/* ============================================================
 * VISTA DE MAPA: cuadrícula de habitaciones con color por estado
 * ============================================================ */

interface EstadoStyle {
  gradient: string;
  border: string;
  iconBg: string;
  badgeBg: string;
  badgeText: string;
  dot: string;
  numberText: string;
  pricePill: string;
  label: string;
}

const ESTADO_STYLES: Record<string, EstadoStyle> = {
  DISPONIBLE: {
    gradient: 'from-emerald-50 via-white to-emerald-100',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-500',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    dot: 'bg-emerald-500',
    numberText: 'text-emerald-700',
    pricePill: 'bg-emerald-500 text-white',
    label: 'Disponible',
  },
  OCUPADA: {
    gradient: 'from-rose-50 via-white to-rose-100',
    border: 'border-rose-200',
    iconBg: 'bg-rose-500',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-700',
    dot: 'bg-rose-500',
    numberText: 'text-rose-700',
    pricePill: 'bg-rose-500 text-white',
    label: 'Ocupada',
  },
  ALISTANDO: {
    gradient: 'from-amber-50 via-white to-amber-100',
    border: 'border-amber-200',
    iconBg: 'bg-amber-500',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    dot: 'bg-amber-500',
    numberText: 'text-amber-700',
    pricePill: 'bg-amber-500 text-white',
    label: 'Alistando',
  },
  MANTENIMIENTO: {
    gradient: 'from-blue-50 via-white to-blue-100',
    border: 'border-blue-200',
    iconBg: 'bg-blue-500',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    dot: 'bg-blue-500',
    numberText: 'text-blue-700',
    pricePill: 'bg-blue-500 text-white',
    label: 'Mantenimiento',
  },
  FUERA_SERVICIO: {
    gradient: 'from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900',
    border: 'border-slate-200',
    iconBg: 'bg-slate-500',
    badgeBg: 'bg-slate-200',
    badgeText: 'text-slate-700',
    dot: 'bg-slate-500',
    numberText: 'text-slate-700',
    pricePill: 'bg-slate-500 text-white',
    label: 'Fuera servicio',
  },
};

function MapaHabitaciones() {
  const [reservar, setReservar] = useState<Habitacion | null>(null);
  const [verAlquiler, setVerAlquiler] = useState<Habitacion | null>(null);

  // Tick cada 60s para actualizar "hace X min" en vivo
  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['habitaciones'],
    queryFn: async () =>
      (await api.get<Habitacion[]>('/habitaciones')).data,
  });

  const porEstado = useMemo(() => {
    const r: Record<string, number> = {};
    data?.forEach((h) => (r[h.estado] = (r[h.estado] || 0) + 1));
    return r;
  }, [data]);

  // Filtrado por búsqueda + estado
  const habitacionesFiltradas = useMemo(() => {
    if (!data) return [];
    const q = busqueda.trim().toLowerCase();
    return data.filter((h) => {
      if (filtroEstado && h.estado !== filtroEstado) return false;
      if (!q) return true;
      const alq = h.alquileres?.[0];
      return (
        h.numero.toLowerCase().includes(q) ||
        String(h.piso.numero).includes(q) ||
        (h.descripcion || '').toLowerCase().includes(q) ||
        (alq?.clienteNombre || '').toLowerCase().includes(q) ||
        (alq?.clienteDni || '').toLowerCase().includes(q)
      );
    });
  }, [data, busqueda, filtroEstado]);

  return (
    <div>
      {/* Buscador + Leyenda clickable (filtra por estado) */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar habitación, cliente, DNI o piso..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFiltroEstado('')}
            className={`inline-flex items-center gap-2 border rounded-full px-3 py-1.5 text-xs transition ${
              filtroEstado === ''
                ? 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-500/30'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="font-medium">Todas</span>
            <span className={filtroEstado === '' ? 'text-violet-100' : 'text-slate-400'}>
              {data?.length || 0}
            </span>
          </button>
          {Object.entries(ESTADO_STYLES).map(([key, s]) => (
            <button
              key={key}
              onClick={() => setFiltroEstado(filtroEstado === key ? '' : key)}
              className={`inline-flex items-center gap-2 border rounded-full px-3 py-1.5 text-xs transition ${
                filtroEstado === key
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className={filtroEstado === key ? 'text-white font-medium' : 'text-slate-700 font-medium'}>
                {s.label}
              </span>
              <span className={filtroEstado === key ? 'text-slate-300' : 'text-slate-400'}>
                {porEstado[key] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="text-slate-500 text-center py-12">Cargando...</div>
      )}

      {!isLoading && habitacionesFiltradas.length === 0 && (busqueda || filtroEstado) && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
          {busqueda ? (
            <>Sin resultados para <b>"{busqueda}"</b></>
          ) : (
            'Sin habitaciones en este estado'
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 stagger-children">
        {habitacionesFiltradas.map((h) => {
          const s = ESTADO_STYLES[h.estado] || ESTADO_STYLES.FUERA_SERVICIO;
          const clickable = h.estado === 'DISPONIBLE' || h.estado === 'OCUPADA';
          const alquilerRef = h.alquileres?.[0];

          // Tiempo transcurrido (OCUPADA: desde creadoEn; ALISTANDO: desde fechaSalidaReal)
          const tiempoBase =
            h.estado === 'OCUPADA' && alquilerRef?.estado === 'ACTIVO'
              ? new Date(alquilerRef.creadoEn)
              : h.estado === 'ALISTANDO' && alquilerRef?.fechaSalidaReal
                ? new Date(alquilerRef.fechaSalidaReal)
                : null;
          const minutosEn = tiempoBase
            ? Math.floor((tick - tiempoBase.getTime()) / 60000)
            : 0;
          // Umbral dinámico: 30 min × cantidad de habitaciones en ALISTANDO.
          // Si hay 3 pendientes, el tope es 1h 30m antes de marcar atrasado.
          const countAlistando = Math.max(
            1,
            data?.filter((x) => x.estado === 'ALISTANDO').length || 1,
          );
          const umbralAlistando = 30 * countAlistando;
          const alistandoAtrasada =
            h.estado === 'ALISTANDO' && minutosEn >= umbralAlistando;

          // Tooltip title completo
          let tooltip = '';
          if (h.estado === 'OCUPADA' && alquilerRef) {
            const edadTxt = alquilerRef.clienteFechaNacimiento
              ? ` · ${calcularEdad(alquilerRef.clienteFechaNacimiento)} años`
              : '';
            tooltip = `${alquilerRef.clienteNombre} · DNI ${alquilerRef.clienteDni}${edadTxt}\nIngreso: ${new Date(alquilerRef.creadoEn).toLocaleString('es-PE')}\nSalida prevista: ${new Date(alquilerRef.fechaSalida).toLocaleString('es-PE')}\nLleva: ${formatDuracion(minutosEn)}`;
          } else if (h.estado === 'ALISTANDO') {
            tooltip = tiempoBase
              ? `En limpieza desde: ${tiempoBase.toLocaleString('es-PE')}\nHace ${formatDuracion(minutosEn)}\nTolerancia: ${formatDuracion(umbralAlistando)} (${countAlistando} hab. en cola × 30 min)${alistandoAtrasada ? '\n⚠ ATRASADO' : ''}`
              : 'En limpieza';
          }

          return (
            <button
              key={h.id}
              disabled={!clickable}
              title={tooltip || undefined}
              onClick={() => {
                if (h.estado === 'DISPONIBLE') setReservar(h);
                else if (h.estado === 'OCUPADA') setVerAlquiler(h);
              }}
              className={`group relative text-left bg-gradient-to-br ${s.gradient} border ${s.border} rounded-2xl p-5 shadow-sm transition-all duration-300 overflow-hidden ${
                clickable
                  ? 'hover:shadow-xl hover:-translate-y-1 cursor-pointer'
                  : 'cursor-not-allowed opacity-80'
              } ${alistandoAtrasada ? 'ring-2 ring-rose-400 shadow-rose-300' : ''}`}
            >
              {/* Foto de fondo (si existe) */}
              {h.fotos && h.fotos.length > 0 && (
                <div
                  className="absolute inset-0 opacity-15 group-hover:opacity-25 transition-opacity pointer-events-none"
                  style={{
                    backgroundImage: `url(${h.fotos[0].path})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
              )}

              {/* Badge de atraso para ALISTANDO */}
              {alistandoAtrasada && (
                <div className="absolute -top-2 -right-2 z-10 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg animate-bounce">
                  ATRASADO
                </div>
              )}

              {/* Top row: badge + icon */}
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`inline-flex items-center gap-1.5 ${s.badgeBg} ${s.badgeText} text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${s.iconBg}`} />
                  {s.label}
                </div>
                <div
                  className={`w-11 h-11 rounded-xl ${s.iconBg} flex items-center justify-center shadow-md ${clickable ? 'group-hover:scale-110' : ''} transition-transform`}
                >
                  <BedDouble size={22} className="text-white" />
                </div>
              </div>

              {/* Número grande */}
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Nro
                </span>
                <span
                  className={`font-hotel text-4xl font-bold leading-none ${s.numberText}`}
                >
                  {h.numero}
                </span>
              </div>

              {/* Descripción */}
              <div className="mt-2 text-sm text-slate-700 font-medium line-clamp-1">
                {h.descripcion || 'Habitación estándar'}
              </div>
              {h.caracteristicas && (
                <div className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                  {h.caracteristicas}
                </div>
              )}

              {/* Info del huésped (solo OCUPADA) */}
              {h.estado === 'OCUPADA' && alquilerRef && (
                <div className="mt-3 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm border border-white dark:border-slate-700 rounded-xl px-2.5 py-1.5">
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                        Huésped
                      </div>
                      <div className="text-xs font-bold text-slate-800 truncate">
                        {alquilerRef.clienteNombre}
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5 items-end shrink-0">
                      {(() => {
                        const totalA = Number(alquilerRef.total);
                        const pagadoA = Number(
                          alquilerRef.montoPagado ??
                            (alquilerRef.pagado ? totalA : 0),
                        );
                        const saldoA = totalA - pagadoA;
                        if (saldoA > 0.01 && pagadoA > 0) {
                          return (
                            <span
                              className="text-[9px] bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded-full"
                              title={`Pagado S/ ${pagadoA.toFixed(2)} de ${totalA.toFixed(2)} · saldo S/ ${saldoA.toFixed(2)}`}
                            >
                              PARCIAL
                            </span>
                          );
                        }
                        if (saldoA > 0.01) {
                          return (
                            <span className="text-[9px] bg-rose-500 text-white font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                              POR COBRAR
                            </span>
                          );
                        }
                        return null;
                      })()}
                      {alquilerRef.amenitiesEntregados && (
                        <span title="Chocolates entregados" className="text-[10px]">
                          🍫
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5 font-medium">
                    <Clock3 size={10} />
                    {formatDuracion(minutosEn)}
                  </div>
                </div>
              )}

              {/* Tiempo de ALISTANDO */}
              {h.estado === 'ALISTANDO' && tiempoBase && (
                <div
                  className={`mt-3 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold flex items-center gap-1.5 ${
                    alistandoAtrasada
                      ? 'bg-rose-100 text-rose-700 border border-rose-300'
                      : 'bg-white/70 dark:bg-slate-900/60 text-slate-700 border border-white dark:border-slate-700'
                  }`}
                >
                  <Clock3 size={11} />
                  {alistandoAtrasada ? '⚠ Limpiando hace' : 'En limpieza hace'}{' '}
                  {formatDuracion(minutosEn)}
                </div>
              )}

              {/* Footer: piso + precio */}
              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-1 h-1 rounded-full bg-slate-400" />
                  Piso {h.piso.numero}
                </div>
                <div
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.pricePill} shadow-sm`}
                >
                  S/ {Number(h.precioHora).toFixed(0)}/h
                </div>
              </div>

              {/* Hover indicator */}
              {clickable && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-60 transition-opacity" />
              )}
            </button>
          );
        })}
      </div>

      {reservar && (
        <NuevoAlquilerModal
          habitacion={reservar}
          onClose={() => setReservar(null)}
        />
      )}
      {verAlquiler && (
        <AlquilerActivoModal
          habitacion={verAlquiler}
          onClose={() => setVerAlquiler(null)}
        />
      )}
    </div>
  );
}

/* ============================================================
 * MODAL: alquiler activo en una habitación OCUPADA
 * ============================================================ */

function AlquilerActivoModal({
  habitacion,
  onClose,
}: {
  habitacion: Habitacion;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const dialog = useDialog();
  const usuario = useAuthStore((s) => s.usuario);
  const toast = useToast();
  const esAdmin =
    usuario?.rol === 'SUPERADMIN' || usuario?.rol === 'ADMIN_SEDE';
  const [addProdOpen, setAddProdOpen] = useState(false);
  const [extenderOpen, setExtenderOpen] = useState(false);
  const [boletaOpen, setBoletaOpen] = useState(false);
  const [fiscalesOpen, setFiscalesOpen] = useState(false);
  const [cobrarOpen, setCobrarOpen] = useState(false);

  // Busca alquiler ACTIVO de esta habitación
  const { data: alquileres } = useQuery({
    queryKey: ['alquileres', 'activo', habitacion.id],
    queryFn: async () =>
      (await api.get<Alquiler[]>('/alquileres?estado=ACTIVO')).data,
  });

  const alquiler = alquileres?.find((a) => a.habitacion.id === habitacion.id);

  const finalizar = useMutation({
    mutationFn: async (id: number) =>
      (await api.patch(`/alquileres/${id}/finalizar`, {})).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alquileres'] });
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
      onClose();
    },
  });

  const anular = useMutation({
    mutationFn: async ({ id, motivo }: { id: number; motivo: string }) =>
      (await api.patch(`/alquileres/${id}/anular`, { motivo })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alquileres'] });
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
      onClose();
    },
  });

  const cobrar = useMutation({
    mutationFn: async ({ id, monto }: { id: number; monto?: number }) =>
      (
        await api.patch(
          `/alquileres/${id}/cobrar`,
          monto !== undefined ? { monto } : {},
        )
      ).data,
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['alquileres'] });
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
      const saldo =
        Number(data.total) - Number(data.montoPagado);
      toast.show({
        type: 'success',
        title: data.pagado ? '💰 Pago completado' : '💵 Pago parcial registrado',
        description: data.pagado
          ? 'Alquiler totalmente pagado'
          : `Saldo pendiente: S/ ${saldo.toFixed(2)}`,
      });
      setCobrarOpen(false);
    },
    onError: (err: any) =>
      toast.show({
        type: 'error',
        title: 'Error',
        description: err.response?.data?.message || err.message,
      }),
  });

  const amenities = useMutation({
    mutationFn: async ({
      id,
      entregados,
    }: {
      id: number;
      entregados: boolean;
    }) =>
      (await api.patch(`/alquileres/${id}/amenities`, { entregados })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alquileres'] });
    },
  });

  // Helpers precalculados
  const total = Number(alquiler?.total ?? 0);
  const montoPagado = Number(alquiler?.montoPagado ?? (alquiler?.pagado ? total : 0));
  const saldo = total - montoPagado;
  const pctPagado = total > 0 ? Math.min(100, (montoPagado / total) * 100) : 0;
  const estadoPago: 'pagado' | 'parcial' | 'pendiente' =
    saldo <= 0.01 ? 'pagado' : montoPagado > 0 ? 'parcial' : 'pendiente';

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-slate-50 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col animate-scale-in shadow-2xl overflow-hidden">
        {/* HEADER con gradiente violeta */}
        <div className="bg-gradient-to-br from-violet-600 to-violet-500 text-white px-5 py-4 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
              <BedDouble size={22} />
            </div>
            <div>
              <h2 className="font-hotel text-2xl font-bold leading-none">
                Hab. {habitacion.numero}
              </h2>
              <div className="text-xs text-violet-100 mt-1">
                Piso {habitacion.piso.numero}
                {habitacion.descripcion && ` · ${habitacion.descripcion}`}
              </div>
            </div>
          </div>
        </div>

        {!alquiler && (
          <div className="p-6 text-slate-500 text-sm text-center">
            Buscando alquiler activo...
          </div>
        )}

        {alquiler && (
          <div className="flex-1 overflow-y-auto scroll-premium">
            {/* CARD HUÉSPED */}
            <div className="p-4">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Nombre + estado */}
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1">
                        Huésped
                      </div>
                      <div className="font-bold text-slate-900 text-sm leading-tight">
                        {alquiler.clienteNombre}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        DNI {alquiler.clienteDni}
                        {alquiler.clienteFechaNacimiento && (
                          <> · <b className="text-violet-700">{calcularEdad(alquiler.clienteFechaNacimiento)} años</b></>
                        )}
                      </div>
                    </div>
                    {/* Badge estado de pago */}
                    {estadoPago === 'pagado' && (
                      <span className="text-[10px] uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:text-emerald-200 font-bold px-2.5 py-1 rounded-full shrink-0">
                        ✓ Pagado
                      </span>
                    )}
                    {estadoPago === 'parcial' && (
                      <span className="text-[10px] uppercase tracking-wider bg-amber-100 text-amber-800 dark:text-amber-200 font-bold px-2.5 py-1 rounded-full shrink-0 animate-pulse">
                        Parcial S/ {saldo.toFixed(0)}
                      </span>
                    )}
                    {estadoPago === 'pendiente' && (
                      <span className="text-[10px] uppercase tracking-wider bg-rose-100 text-rose-800 dark:text-rose-200 font-bold px-2.5 py-1 rounded-full shrink-0 animate-pulse">
                        Por cobrar
                      </span>
                    )}
                  </div>

                  {/* Chips de info */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded">
                      {alquiler.metodoPago}
                    </span>
                    {alquiler.tipoComprobante === 'FACTURA' && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 dark:text-amber-200 font-bold px-2 py-0.5 rounded">
                        FACTURA · {alquiler.clienteRuc}
                      </span>
                    )}
                    {alquiler.amenitiesEntregados && (
                      <span className="text-[10px] bg-amber-50 text-amber-700 dark:text-amber-300 font-medium px-2 py-0.5 rounded">
                        🍫 chocolates ✓
                      </span>
                    )}
                  </div>

                  {/* Fechas */}
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                    <Clock3 size={11} className="shrink-0" />
                    <span>
                      {new Date(alquiler.fechaIngreso).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {' → '}
                      {new Date(alquiler.fechaSalida).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Aviso turno si pendiente */}
                {estadoPago !== 'pagado' && (
                  <div className="bg-amber-50 border-t border-amber-200 px-4 py-2 text-[11px] text-amber-900 dark:text-amber-200">
                    <div className="flex items-start gap-1.5">
                      <span>📋</span>
                      <div>
                        Abierto en <b>turno #{alquiler.turnoCajaId}</b> por{' '}
                        <b>{(alquiler as any).creadoPor?.nombre || 'N/A'}</b>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cobrado por si pagado */}
                {estadoPago === 'pagado' && alquiler.cobradoPor && (
                  <div className="bg-emerald-50 border-t border-emerald-200 px-4 py-2 text-[11px] text-emerald-800 dark:text-emerald-200">
                    ✓ Cobrado por <b>{alquiler.cobradoPor.nombre}</b>
                    {alquiler.pagadoEn && (
                      <> · {new Date(alquiler.pagadoEn).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</>
                    )}
                  </div>
                )}

                {/* Toggle chocolates */}
                <label className="flex items-center gap-2 px-4 py-2.5 border-t border-slate-100 cursor-pointer select-none hover:bg-amber-50/50 transition">
                  <input
                    type="checkbox"
                    checked={!!alquiler.amenitiesEntregados}
                    onChange={(e) => amenities.mutate({ id: alquiler.id, entregados: e.target.checked })}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                    <span className="text-base">🍫</span>
                    Chocolates de bienvenida entregados
                  </span>
                </label>
              </div>
            </div>

            {/* CARD PRECIO + PROGRESO */}
            <div className="px-4">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
                    Total
                  </span>
                  <span className="text-3xl font-hotel font-bold text-slate-900 tabular-nums">
                    S/ {total.toFixed(2)}
                  </span>
                </div>

                {/* Breakdown compacto */}
                <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                  <div className="bg-violet-50 rounded-lg px-2.5 py-1.5">
                    <div className="text-[9px] uppercase tracking-wider text-violet-600 font-bold">
                      Habitación
                    </div>
                    <div className="text-sm font-semibold text-violet-900 dark:text-violet-200 tabular-nums">
                      S/ {Number(alquiler.precioHabitacion).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg px-2.5 py-1.5">
                    <div className="text-[9px] uppercase tracking-wider text-blue-600 font-bold">
                      Productos
                    </div>
                    <div className="text-sm font-semibold text-blue-900 dark:text-blue-200 tabular-nums">
                      S/ {Number(alquiler.totalProductos).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Barra progreso pago */}
                <div className="mt-4">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-emerald-700 font-semibold">
                      Pagado S/ {montoPagado.toFixed(2)}
                    </span>
                    <span className={saldo > 0.01 ? 'text-rose-700 font-semibold' : 'text-slate-400'}>
                      {saldo > 0.01 ? `Saldo S/ ${saldo.toFixed(2)}` : '✓ completo'}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        estadoPago === 'pagado'
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                          : 'bg-gradient-to-r from-amber-500 to-amber-400'
                      }`}
                      style={{ width: `${pctPagado}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CONSUMOS */}
            {alquiler.consumos.length > 0 && (
              <div className="px-4 mt-3">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                  <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2 flex items-center gap-1.5">
                    <ShoppingBag size={11} />
                    Consumos ({alquiler.consumos.length})
                  </div>
                  <div className="space-y-1">
                    {alquiler.consumos.map((c) => (
                      <div key={c.id} className="flex justify-between items-center text-xs py-1">
                        <span className="text-slate-700 truncate">
                          <span className="text-slate-400 mr-1.5">×{c.cantidad}</span>
                          {c.producto.nombre}
                        </span>
                        <span className="font-semibold tabular-nums text-slate-800 shrink-0 ml-2">
                          S/ {Number(c.subtotal).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ACCIONES */}
            <div className="p-4 space-y-2">
              {/* CTA PRINCIPAL: Cobrar (si hay saldo) */}
              {saldo > 0.01 && (
                <button
                  onClick={() => setCobrarOpen(true)}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white py-3 rounded-xl btn-press font-semibold shadow-md shadow-emerald-500/30"
                >
                  💰 Cobrar <span className="opacity-80">· saldo S/ {saldo.toFixed(2)}</span>
                </button>
              )}

              {/* Acciones secundarias en grid 2x */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAddProdOpen(true)}
                  className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 py-2.5 rounded-xl btn-press text-xs font-semibold"
                >
                  <ShoppingBag size={14} /> Producto
                </button>
                <button
                  onClick={() => setExtenderOpen(true)}
                  className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 py-2.5 rounded-xl btn-press text-xs font-semibold"
                >
                  <CalendarPlus size={14} /> Extender
                </button>
                <button
                  onClick={() => setFiscalesOpen(true)}
                  className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 py-2.5 rounded-xl btn-press text-xs font-semibold col-span-2"
                >
                  <UserCheck size={14} />
                  {alquiler.tipoComprobante === 'FACTURA'
                    ? `Factura · RUC ${alquiler.clienteRuc}`
                    : 'Cambiar a factura con RUC'}
                </button>
                <button
                  onClick={() => setBoletaOpen(true)}
                  className="flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl btn-press text-xs font-semibold"
                >
                  <Printer size={14} />
                  {alquiler.tipoComprobante === 'FACTURA' ? 'Factura' : 'Boleta'}
                </button>
                <button
                  onClick={async () => {
                    const ok = await dialog.confirm({
                      title: 'Finalizar alquiler',
                      message:
                        'La habitación pasará a estado Alistando y se creará una tarea de limpieza automáticamente.',
                      confirmText: 'Finalizar',
                      variant: 'success',
                    });
                    if (ok) finalizar.mutate(alquiler.id);
                  }}
                  className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl btn-press text-xs font-semibold"
                >
                  <CheckCircle size={14} /> Finalizar
                </button>
              </div>

              {/* Anular (separado, texto discreto) */}
              <button
                onClick={async () => {
                  if (esAdmin) {
                    const motivo = await dialog.prompt({
                      title: 'Anular alquiler',
                      message:
                        'Escribe el motivo de la anulación. Los productos consumidos volverán al stock.',
                      placeholder: 'Ej. Cliente canceló',
                      confirmText: 'Anular',
                      variant: 'danger',
                      multiline: true,
                      minLength: 3,
                    });
                    if (motivo) anular.mutate({ id: alquiler.id, motivo });
                  } else {
                    const motivo = await dialog.prompt({
                      title: 'Solicitar anulación',
                      message:
                        'La anulación requiere aprobación del administrador. Se abrirá el chat con tu solicitud.',
                      placeholder: 'Explica el motivo al administrador',
                      confirmText: 'Enviar solicitud',
                      variant: 'warning',
                      multiline: true,
                      minLength: 3,
                    });
                    if (motivo) {
                      try {
                        await api.post(`/anulaciones/alquileres/${alquiler.id}`, { motivo });
                        toast.show({
                          type: 'success',
                          title: 'Solicitud enviada',
                          description: 'El administrador recibirá tu solicitud en el chat.',
                        });
                        window.dispatchEvent(new CustomEvent('chat:open'));
                        onClose();
                      } catch (err: any) {
                        toast.show({
                          type: 'error',
                          title: 'No se pudo enviar',
                          description: err.response?.data?.message || err.message,
                        });
                      }
                    }
                  }
                }}
                className="w-full flex items-center justify-center gap-1.5 text-rose-600 hover:bg-rose-50 py-2 rounded-xl text-xs font-semibold transition"
              >
                <X size={14} />
                {esAdmin ? 'Anular alquiler' : 'Solicitar anulación'}
              </button>
            </div>

            {addProdOpen && (
              <AgregarProductoModal
                alquilerId={alquiler.id}
                onClose={() => setAddProdOpen(false)}
              />
            )}
            {extenderOpen && (
              <ExtenderAlquilerModal
                alquiler={alquiler}
                onClose={() => setExtenderOpen(false)}
              />
            )}
            {boletaOpen && (
              <BoletaAlquiler
                alquiler={alquiler as any}
                onClose={() => setBoletaOpen(false)}
              />
            )}
            {fiscalesOpen && (
              <DatosFiscalesModal
                alquiler={alquiler}
                onClose={() => setFiscalesOpen(false)}
              />
            )}
            {cobrarOpen && (
              <CobrarAlquilerModal
                alquiler={alquiler}
                onClose={() => setCobrarOpen(false)}
                onCobrar={(monto) => cobrar.mutate({ id: alquiler.id, monto })}
                loading={cobrar.isPending}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * MODAL: nuevo alquiler (con habitación preseleccionada)
 * ============================================================ */

function NuevoAlquilerModal({
  habitacion,
  onClose,
}: {
  habitacion: Habitacion;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    clienteNombre: '',
    clienteDni: '',
    clienteTelefono: '',
    clienteFechaNacimiento: '' as string | '',
    fechaIngreso: new Date().toISOString().slice(0, 16),
    fechaSalida: new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 16),
    precioHabitacion: habitacion.precioHora,
    metodoPago: 'EFECTIVO',
    notas: '',
    pagado: true,
    amenitiesEntregados: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [lookup, setLookup] = useState<any | null>(null);
  // RUC opcional (convertir boleta → factura antes o durante el alquiler)
  const [conRuc, setConRuc] = useState(false);
  const [ruc, setRuc] = useState('');
  const [rucData, setRucData] = useState<any | null>(null);
  const [buscandoRuc, setBuscandoRuc] = useState(false);

  // Debounced lookup de RUC
  useEffect(() => {
    if (!conRuc || !/^(10|15|17|20)\d{9}$/.test(ruc)) {
      setRucData(null);
      return;
    }
    const t = setTimeout(async () => {
      setBuscandoRuc(true);
      try {
        const { data } = await api.get('/alquileres/ruc/buscar', {
          params: { ruc },
        });
        setRucData(data);
      } catch {
        setRucData(null);
      } finally {
        setBuscandoRuc(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [ruc, conRuc]);

  // Debounced lookup cuando el DNI tiene 8 dígitos
  useEffect(() => {
    const dni = form.clienteDni;
    if (!/^\d{8}$/.test(dni)) {
      setLookup(null);
      return;
    }
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        const { data } = await api.get('/alquileres/clientes/buscar', {
          params: { dni },
        });
        setLookup(data);
        if (data?.encontrado) {
          setForm((f) => ({
            ...f,
            clienteNombre: data.nombre || f.clienteNombre,
            clienteTelefono: data.telefono || f.clienteTelefono,
            clienteFechaNacimiento:
              data.fechaNacimiento?.slice(0, 10) || f.clienteFechaNacimiento,
          }));
        }
      } catch {
        setLookup(null);
      } finally {
        setBuscando(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [form.clienteDni]);

  const crear = useMutation({
    mutationFn: async () => {
      const payload: any = {
        habitacionId: habitacion.id,
        clienteNombre: form.clienteNombre,
        clienteDni: form.clienteDni,
        clienteTelefono: form.clienteTelefono || undefined,
        clienteFechaNacimiento: form.clienteFechaNacimiento
          ? new Date(form.clienteFechaNacimiento).toISOString()
          : undefined,
        fechaIngreso: new Date(form.fechaIngreso).toISOString(),
        fechaSalida: new Date(form.fechaSalida).toISOString(),
        precioHabitacion: Number(form.precioHabitacion),
        metodoPago: form.metodoPago,
        notas: form.notas || undefined,
        pagado: form.pagado,
        amenitiesEntregados: form.amenitiesEntregados,
      };
      if (conRuc && rucData?.encontrado) {
        payload.tipoComprobante = 'FACTURA';
        payload.clienteRuc = ruc;
        payload.clienteRazonSocial = rucData.razonSocial;
        payload.clienteDireccionFiscal = rucData.direccion || undefined;
      }
      return (await api.post('/alquileres', payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alquileres'] });
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Error'),
  });

  return (
    <div className="fixed inset-0 bg-violet-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto animate-scale-in shadow-2xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-bold">Nuevo alquiler</h2>
            <div className="text-sm text-emerald-700 font-medium">
              Hab. {habitacion.numero} · Piso {habitacion.piso.numero}
            </div>
          </div>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          {/* DNI primero con búsqueda automática */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              DNI del cliente
            </label>
            <div className="relative mt-1">
              <input
                inputMode="numeric"
                maxLength={8}
                placeholder="8 dígitos"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 text-sm font-mono focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                value={form.clienteDni}
                onChange={(e) =>
                  setForm({
                    ...form,
                    clienteDni: e.target.value.replace(/\D/g, '').slice(0, 8),
                  })
                }
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {buscando ? (
                  <Loader2 size={16} className="text-violet-500 animate-spin" />
                ) : (
                  <Search size={15} className="text-slate-400" />
                )}
              </div>
            </div>
            {lookup?.fuente === 'local' && (
              <div className="mt-2 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 dark:text-emerald-200 rounded-lg px-3 py-2 text-xs">
                <UserCheck size={14} />
                <span>
                  <b>Cliente recurrente</b> · encontrado en el sistema ·{' '}
                  {lookup.visitas} visita{lookup.visitas === 1 ? '' : 's'} ·
                  última:{' '}
                  {new Date(lookup.ultimaVisita).toLocaleDateString('es-PE')}
                </span>
              </div>
            )}
            {lookup?.fuente === 'reniec' && (
              <div className="mt-2 flex items-center gap-2 bg-violet-50 border border-violet-200 text-violet-800 dark:text-violet-200 rounded-lg px-3 py-2 text-xs">
                <Search size={14} />
                <span>
                  <b>Encontrado en RENIEC</b> · {lookup.nombre}
                  {lookup.edad != null && (
                    <>
                      {' '}
                      · <b>{lookup.edad} años</b>
                    </>
                  )}
                </span>
              </div>
            )}
            {/* Fecha de nacimiento · siempre visible para captura manual si
                 apisperu no la devolvió en su respuesta */}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                🎂 Nacimiento:
              </span>
              <input
                type="date"
                value={form.clienteFechaNacimiento || ''}
                onChange={(e) =>
                  setForm({ ...form, clienteFechaNacimiento: e.target.value })
                }
                className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-violet-400"
              />
              {form.clienteFechaNacimiento && (
                <span className="text-xs font-bold text-violet-700 dark:text-violet-200 bg-violet-50 px-2 py-0.5 rounded-full">
                  {calcularEdad(form.clienteFechaNacimiento)} años
                </span>
              )}
            </div>
            {lookup &&
              !lookup.encontrado &&
              form.clienteDni.length === 8 &&
              !buscando && (
                <div className="mt-2 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 dark:text-amber-200 rounded-lg px-3 py-2 text-xs">
                  <span>
                    <b>No encontrado</b> · no está en el sistema ni en RENIEC.
                    Rellena los datos manualmente.
                  </span>
                </div>
              )}
          </div>

          <input
            placeholder="Nombre del cliente"
            className="w-full border rounded-lg px-3 py-2"
            value={form.clienteNombre}
            onChange={(e) =>
              setForm({ ...form, clienteNombre: e.target.value })
            }
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

          <div>
            <label className="text-xs block mb-1">Precio</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                className="flex-1 border rounded-lg px-3 py-2"
                value={form.precioHabitacion}
                onChange={(e) =>
                  setForm({ ...form, precioHabitacion: e.target.value })
                }
              />
              <button
                type="button"
                onClick={() =>
                  setForm({ ...form, precioHabitacion: habitacion.precioHora })
                }
                className="text-xs px-2 bg-slate-100 hover:bg-slate-200 rounded"
              >
                Hora<br />S/{habitacion.precioHora}
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm({ ...form, precioHabitacion: habitacion.precioNoche })
                }
                className="text-xs px-2 bg-slate-100 hover:bg-slate-200 rounded"
              >
                Noche<br />S/{habitacion.precioNoche}
              </button>
            </div>
          </div>

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
            rows={2}
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
          />

          {/* Operación: pago + amenities */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.pagado}
                onChange={(e) =>
                  setForm({ ...form, pagado: e.target.checked })
                }
                className="w-4 h-4 accent-emerald-600"
              />
              <span className="text-sm font-medium text-slate-700">
                💰 Pago recibido ahora
              </span>
              <span className="text-[10px] text-slate-500">
                (desmarcar si queda pendiente)
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.amenitiesEntregados}
                onChange={(e) =>
                  setForm({
                    ...form,
                    amenitiesEntregados: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-amber-500"
              />
              <span className="text-sm font-medium text-slate-700">
                🍫 Chocolates de bienvenida entregados
              </span>
            </label>
          </div>

          {/* Datos fiscales: BOLETA (default) ↔ FACTURA con RUC */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={conRuc}
                onChange={(e) => setConRuc(e.target.checked)}
                className="w-4 h-4 accent-violet-600"
              />
              <span className="text-sm font-medium text-slate-700">
                Emitir factura con RUC (en vez de boleta)
              </span>
            </label>
            {conRuc && (
              <div className="mt-3 space-y-2">
                <div className="relative">
                  <input
                    value={ruc}
                    onChange={(e) => setRuc(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="RUC (11 dígitos)"
                    inputMode="numeric"
                    maxLength={11}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm font-mono focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    {buscandoRuc ? (
                      <Loader2 size={14} className="text-violet-500 animate-spin" />
                    ) : (
                      <Search size={13} className="text-slate-400" />
                    )}
                  </div>
                </div>
                {rucData?.fuente === 'local' && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs">
                    <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <UserCheck size={12} /> Empresa recurrente
                    </div>
                    <div className="text-emerald-900 dark:text-emerald-200 mt-1 uppercase font-semibold">
                      {rucData.razonSocial}
                    </div>
                    {rucData.direccion && (
                      <div className="text-emerald-700 dark:text-emerald-300 mt-0.5">
                        {rucData.direccion}
                      </div>
                    )}
                    <div className="text-emerald-600 dark:text-emerald-300 mt-1 text-[10px]">
                      {rucData.visitas} visita{rucData.visitas === 1 ? '' : 's'} · última:{' '}
                      {new Date(rucData.ultimaVisita).toLocaleDateString('es-PE')}
                    </div>
                  </div>
                )}
                {rucData?.fuente === 'sunat' && (
                  <div className="bg-violet-50 border border-violet-200 rounded-lg p-2.5 text-xs">
                    <div className="font-bold text-violet-900 dark:text-violet-200 flex items-center gap-1.5">
                      <Search size={12} /> Encontrado en SUNAT
                    </div>
                    <div className="text-violet-900 dark:text-violet-200 mt-1 uppercase font-semibold">
                      {rucData.razonSocial}
                    </div>
                    {rucData.direccion && (
                      <div className="text-violet-700 dark:text-violet-300 mt-0.5">
                        {rucData.direccion}
                      </div>
                    )}
                    <div className="text-violet-600 dark:text-violet-300 mt-1 text-[10px] uppercase tracking-wider">
                      {rucData.estado} · {rucData.condicion}
                    </div>
                  </div>
                )}
                {rucData &&
                  !rucData.encontrado &&
                  ruc.length === 11 &&
                  !buscandoRuc && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800 dark:text-amber-200">
                      <b>No encontrado</b> · no está en el sistema ni en SUNAT.
                      Completa la razón social manualmente.
                    </div>
                  )}
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 p-2 rounded">
              {error}
            </div>
          )}

          <button
            onClick={() => crear.mutate()}
            disabled={crear.isPending || !form.clienteNombre || !form.clienteDni}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-60"
          >
            {crear.isPending ? 'Creando...' : 'Crear alquiler'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * MODAL: agregar producto a alquiler
 * ============================================================ */

function AgregarProductoModal({
  alquilerId,
  onClose,
}: {
  alquilerId: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [productoId, setProductoId] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState<string | null>(null);

  const productos = useQuery<Array<{
    id: number;
    nombre: string;
    precio: string;
    stock: number;
  }>>({
    queryKey: ['productos'],
    queryFn: async () => (await api.get('/productos')).data,
  });

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = productos.data || [];
    if (!q) return lista;
    return lista.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [productos.data, busqueda]);

  const seleccionado = productos.data?.find((p) => p.id === productoId);
  const subtotal = seleccionado
    ? Number(seleccionado.precio) * cantidad
    : 0;
  const valido =
    !!seleccionado &&
    cantidad > 0 &&
    cantidad <= (seleccionado?.stock || 0);

  const add = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/alquileres/${alquilerId}/consumo`, {
          productoId,
          cantidad,
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
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <div>
            <h2 className="font-hotel text-lg font-bold">Agregar producto</h2>
            <div className="text-xs text-slate-500">
              Al alquiler · cobro inmediato en tu turno
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        {/* Buscador */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              autoFocus
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Lista de productos */}
        <div className="flex-1 overflow-y-auto scroll-premium max-h-64">
          {productos.isLoading && (
            <div className="text-center text-slate-400 text-sm py-6">
              Cargando productos...
            </div>
          )}
          {!productos.isLoading && productosFiltrados.length === 0 && (
            <div className="text-center text-slate-400 text-sm py-6 px-4">
              {busqueda ? (
                <>
                  Sin resultados para <b>"{busqueda}"</b>
                </>
              ) : (
                'Sin productos en esta sede'
              )}
            </div>
          )}
          {productosFiltrados.map((p) => {
            const sel = productoId === p.id;
            const sinStock = p.stock === 0;
            return (
              <button
                key={p.id}
                disabled={sinStock}
                onClick={() => {
                  setProductoId(p.id);
                  setCantidad(1);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-l-2 transition ${
                  sel
                    ? 'bg-violet-50 border-violet-500'
                    : 'border-transparent hover:bg-slate-50'
                } ${sinStock ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    sel ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Package size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-800 truncate">
                    {p.nombre}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <span className="tabular-nums">S/ {Number(p.precio).toFixed(2)}</span>
                    <span>·</span>
                    <span
                      className={
                        p.stock === 0
                          ? 'text-rose-600'
                          : p.stock < 5
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                      }
                    >
                      {p.stock === 0 ? 'sin stock' : `stock ${p.stock}`}
                    </span>
                  </div>
                </div>
                {sel && (
                  <CheckCircle size={16} className="text-violet-600 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer con cantidad + subtotal + botón */}
        {seleccionado && (
          <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-3">
            {/* Cantidad con stepper */}
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Cantidad
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                  disabled={cantidad <= 1}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max={seleccionado.stock}
                  value={cantidad}
                  onChange={(e) =>
                    setCantidad(
                      Math.min(
                        seleccionado.stock,
                        Math.max(1, parseInt(e.target.value) || 1),
                      ),
                    )
                  }
                  className="w-14 text-center border border-slate-200 rounded-lg py-1.5 text-sm font-semibold tabular-nums focus:outline-none focus:border-violet-400"
                />
                <button
                  onClick={() =>
                    setCantidad(Math.min(seleccionado.stock, cantidad + 1))
                  }
                  disabled={cantidad >= seleccionado.stock}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>

            {/* Subtotal destacado */}
            <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-slate-200">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                  {seleccionado.nombre}
                </div>
                <div className="text-[10px] text-slate-400">
                  {cantidad} × S/ {Number(seleccionado.precio).toFixed(2)}
                </div>
              </div>
              <div className="text-2xl font-hotel font-bold text-violet-700 tabular-nums">
                S/ {subtotal.toFixed(2)}
              </div>
            </div>

            {error && (
              <div className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 border border-rose-200 rounded-lg p-2">
                {error}
              </div>
            )}

            <button
              onClick={() => add.mutate()}
              disabled={add.isPending || !valido}
              className="w-full bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white py-3 rounded-xl font-semibold shadow-md shadow-violet-500/30 disabled:opacity-40 btn-press flex items-center justify-center gap-2"
            >
              {add.isPending ? 'Agregando...' : `Agregar · S/ ${subtotal.toFixed(2)}`}
            </button>
          </div>
        )}

        {!seleccionado && productosFiltrados.length > 0 && (
          <div className="border-t border-slate-100 p-4 bg-slate-50 text-center text-xs text-slate-500">
            Elige un producto arriba para continuar
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * VISTA DE LISTA (histórica)
 * ============================================================ */

function ListaAlquileres() {
  const qc = useQueryClient();
  const dialog = useDialog();
  const [filtro, setFiltro] = useState<string>('');
  const [busqueda, setBusqueda] = useState('');
  const [boletaAlquiler, setBoletaAlquiler] = useState<Alquiler | null>(null);
  const [extender, setExtender] = useState<Alquiler | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['alquileres', filtro],
    queryFn: async () =>
      (
        await api.get<Alquiler[]>(
          `/alquileres${filtro ? `?estado=${filtro}` : ''}`,
        )
      ).data,
  });

  // Filtrado client-side por búsqueda
  const filtrados = useMemo(() => {
    if (!data) return [];
    const q = busqueda.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (a) =>
        a.clienteNombre.toLowerCase().includes(q) ||
        a.clienteDni.toLowerCase().includes(q) ||
        a.habitacion.numero.toLowerCase().includes(q) ||
        String(a.id).includes(q),
    );
  }, [data, busqueda]);

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
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {['', 'ACTIVO', 'FINALIZADO', 'ANULADO'].map((e) => (
          <button
            key={e || 'todos'}
            onClick={() => setFiltro(e)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition ${
              filtro === e
                ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-md shadow-violet-500/30'
                : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            {e || 'Todos'}
          </button>
        ))}
        <div className="flex-1 min-w-[240px] relative ml-auto">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, DNI, habitación o #..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {isLoading && <div>Cargando...</div>}

      <div className="space-y-3">
        {filtrados.length === 0 && !isLoading && busqueda && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
            Sin resultados para <b>"{busqueda}"</b>
          </div>
        )}
        {filtrados.map((a) => (
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
                  <div className="text-xs text-red-600 dark:text-red-300 mt-1">
                    Anulado: {a.motivoAnulacion}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">S/ {a.total}</div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    a.estado === 'ACTIVO'
                      ? 'bg-emerald-100 text-emerald-700 dark:text-emerald-200'
                      : a.estado === 'ANULADO'
                        ? 'bg-red-100 text-red-700 dark:text-red-200'
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

            <div className="mt-3 flex gap-2 flex-wrap">
              {a.estado === 'ACTIVO' && (
                <>
                  <button
                    onClick={() => finalizar.mutate(a.id)}
                    className="text-xs flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded btn-press"
                  >
                    <CheckCircle size={14} /> Finalizar
                  </button>
                  <button
                    onClick={() => setExtender(a)}
                    className="text-xs flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded btn-press"
                  >
                    <CalendarPlus size={14} /> Extender
                  </button>
                  <button
                    onClick={async () => {
                      const motivo = await dialog.prompt({
                        title: 'Anular alquiler',
                        message:
                          'Escribe el motivo. Se devolverán los productos al stock.',
                        placeholder: 'Ej. Cliente canceló',
                        confirmText: 'Anular',
                        variant: 'danger',
                        multiline: true,
                        minLength: 3,
                      });
                      if (motivo) anular.mutate({ id: a.id, motivo });
                    }}
                    className="text-xs flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded btn-press"
                  >
                    <X size={14} /> Anular
                  </button>
                </>
              )}
              {a.estado !== 'ANULADO' && (
                <button
                  onClick={() => setBoletaAlquiler(a)}
                  className="text-xs flex items-center gap-1 bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded btn-press"
                >
                  <Printer size={14} /> Imprimir boleta
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {boletaAlquiler && (
        <BoletaAlquiler
          alquiler={boletaAlquiler as any}
          onClose={() => setBoletaAlquiler(null)}
        />
      )}
      {extender && (
        <ExtenderAlquilerModal
          alquiler={extender}
          onClose={() => setExtender(null)}
        />
      )}
    </div>
  );
}

function ExtenderAlquilerModal({
  alquiler,
  onClose,
}: {
  alquiler: Alquiler;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const [tipo, setTipo] = useState<'HORA' | 'DIA'>('HORA');
  const [cantidad, setCantidad] = useState(1);
  const [precioManual, setPrecioManual] = useState<string>('');
  const [manualActivo, setManualActivo] = useState(false);

  // Cotización automática (sin costoManual) — solo para mostrar el sugerido
  const cotizacion = useQuery({
    queryKey: ['extender-cotizar', alquiler.id, tipo, cantidad],
    queryFn: async () =>
      (
        await api.post(`/alquileres/${alquiler.id}/cotizar-extension`, {
          tipo,
          cantidad,
        })
      ).data as {
        costo: number;
        costoAuto: number;
        precioUnidad: number;
        nuevaFechaSalida: string;
        nuevoTotal: number;
      },
    enabled: cantidad > 0,
  });

  // Precio final a enviar: manual si está activo, si no el sugerido
  const costoFinal = manualActivo
    ? Number(precioManual) || 0
    : cotizacion.data?.costoAuto ?? 0;

  const totalFinal = cotizacion.data
    ? Number(alquiler.totalProductos) +
      Number(alquiler.precioHabitacion) +
      costoFinal
    : 0;

  const ejecutar = useMutation({
    mutationFn: async () =>
      (
        await api.patch(`/alquileres/${alquiler.id}/extender`, {
          tipo,
          cantidad,
          ...(manualActivo ? { costoManual: costoFinal } : {}),
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alquileres'] });
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
      toast({
        type: 'success',
        title: 'Estadía extendida',
        description: `+${cantidad} ${tipo === 'HORA' ? 'hora(s)' : 'día(s)'} · S/ ${costoFinal.toFixed(2)}`,
      });
      onClose();
    },
    onError: (err: any) =>
      toast({
        type: 'error',
        title: 'Error',
        description: err.response?.data?.message || err.message,
      }),
  });

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-scale-in">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <div>
            <h2 className="font-hotel text-lg font-bold text-slate-900">
              Extender estadía
            </h2>
            <div className="text-xs text-slate-500 mt-0.5">
              Hab. {alquiler.habitacion.numero} · {alquiler.clienteNombre}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Tipo */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setTipo('HORA')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                tipo === 'HORA'
                  ? 'bg-white shadow-sm text-violet-700'
                  : 'text-slate-600'
              }`}
            >
              Por hora
            </button>
            <button
              onClick={() => setTipo('DIA')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                tipo === 'DIA'
                  ? 'bg-white shadow-sm text-violet-700'
                  : 'text-slate-600'
              }`}
            >
              Por día
            </button>
          </div>

          {/* Cantidad */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Cuánto {tipo === 'HORA' ? 'hora(s)' : 'día(s)'}
            </label>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-lg"
              >
                −
              </button>
              <input
                type="number"
                min="1"
                value={cantidad}
                onChange={(e) =>
                  setCantidad(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="flex-1 border border-slate-200 rounded-xl text-center text-2xl font-bold tabular-nums focus:outline-none focus:border-violet-400"
              />
              <button
                onClick={() => setCantidad(cantidad + 1)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-lg"
              >
                +
              </button>
            </div>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {(tipo === 'HORA' ? [1, 2, 3, 4, 6, 12] : [1, 2, 3, 5, 7]).map(
                (n) => (
                  <button
                    key={n}
                    onClick={() => setCantidad(n)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                      cantidad === n
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {n} {tipo === 'HORA' ? 'h' : 'd'}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Precio editable */}
          <div className="bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200 rounded-2xl p-4 space-y-3">
            {cotizacion.isLoading ? (
              <div className="text-center text-slate-500 text-sm">
                Calculando precio sugerido...
              </div>
            ) : cotizacion.data ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-widest text-violet-700 dark:text-violet-300 font-semibold">
                    Precio de la extensión
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manualActivo}
                      onChange={(e) => {
                        setManualActivo(e.target.checked);
                        if (e.target.checked && !precioManual) {
                          setPrecioManual(
                            cotizacion.data!.costoAuto.toFixed(2),
                          );
                        }
                      }}
                      className="w-3.5 h-3.5 accent-violet-600"
                    />
                    <span className="text-[11px] font-semibold text-slate-700">
                      Editar manual
                    </span>
                  </label>
                </div>

                {manualActivo ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-700">
                        S/
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={precioManual}
                        onChange={(e) => setPrecioManual(e.target.value)}
                        className="flex-1 border border-violet-300 rounded-xl px-3 py-2 text-2xl font-bold tabular-nums text-center focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 bg-white"
                        placeholder="0.00"
                        autoFocus
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between">
                      <span>
                        Sugerido por tarifa:{' '}
                        <button
                          type="button"
                          onClick={() =>
                            setPrecioManual(
                              cotizacion.data!.costoAuto.toFixed(2),
                            )
                          }
                          className="font-semibold text-violet-700 dark:text-violet-300 hover:underline"
                        >
                          S/ {cotizacion.data.costoAuto.toFixed(2)}
                        </button>
                      </span>
                      <span className="text-slate-400">
                        {cantidad} × S/ {cotizacion.data.precioUnidad.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-slate-600">
                      {cantidad} × S/ {cotizacion.data.precioUnidad.toFixed(2)}
                    </span>
                    <span className="text-3xl font-hotel font-bold text-violet-700 dark:text-violet-300 tabular-nums">
                      + S/ {cotizacion.data.costoAuto.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="h-px bg-violet-200" />
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Nueva salida</span>
                  <span className="font-semibold text-slate-700">
                    {new Date(cotizacion.data.nuevaFechaSalida).toLocaleString(
                      'es-PE',
                      {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      },
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Nuevo total del alquiler</span>
                  <span className="font-bold text-emerald-700 tabular-nums">
                    S/ {totalFinal.toFixed(2)}
                  </span>
                </div>
              </>
            ) : null}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 py-2.5 rounded-xl font-medium text-slate-700 btn-press"
            >
              Cancelar
            </button>
            <button
              onClick={() => ejecutar.mutate()}
              disabled={ejecutar.isPending || !cotizacion.data}
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white py-2.5 rounded-xl font-semibold shadow-md shadow-amber-500/30 btn-press disabled:opacity-40"
            >
              {ejecutar.isPending ? 'Extendiendo...' : 'Confirmar extensión'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDuracion(mins: number): string {
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const hr = h % 24;
  return hr ? `${d}d ${hr}h` : `${d}d`;
}

function CobrarAlquilerModal({
  alquiler,
  onClose,
  onCobrar,
  loading,
}: {
  alquiler: Alquiler;
  onClose: () => void;
  onCobrar: (monto?: number) => void;
  loading: boolean;
}) {
  const total = Number(alquiler.total);
  const pagado = Number(
    alquiler.montoPagado ?? (alquiler.pagado ? total : 0),
  );
  const saldo = total - pagado;
  const [monto, setMonto] = useState<string>(saldo.toFixed(2));
  const [modo, setModo] = useState<'completo' | 'parcial'>('completo');

  const montoNum = Number(monto) || 0;
  const valido = montoNum > 0 && montoNum <= saldo + 0.001;
  const saldoRestante = saldo - montoNum;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-scale-in">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <div>
            <h2 className="font-hotel text-lg font-bold">Registrar cobro</h2>
            <div className="text-xs text-slate-500">
              Hab. {alquiler.habitacion.numero} · {alquiler.clienteNombre}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Resumen */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 rounded-2xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Total del alquiler</span>
              <span className="font-semibold tabular-nums">
                S/ {total.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-700">Ya pagado</span>
              <span className="font-semibold text-emerald-700 tabular-nums">
                S/ {pagado.toFixed(2)}
              </span>
            </div>
            <div className="h-px bg-slate-200" />
            <div className="flex justify-between items-baseline">
              <span className="text-rose-700 font-semibold">Saldo</span>
              <span className="text-2xl font-hotel font-bold text-rose-700 tabular-nums">
                S/ {saldo.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => {
                setModo('completo');
                setMonto(saldo.toFixed(2));
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                modo === 'completo'
                  ? 'bg-white shadow-sm text-emerald-700'
                  : 'text-slate-600'
              }`}
            >
              Cobrar todo
            </button>
            <button
              onClick={() => {
                setModo('parcial');
                setMonto((saldo / 2).toFixed(2));
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                modo === 'parcial'
                  ? 'bg-white shadow-sm text-amber-700'
                  : 'text-slate-600'
              }`}
            >
              Pago parcial
            </button>
          </div>

          {modo === 'parcial' && (
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Monto a cobrar ahora
              </label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-bold text-slate-700">S/</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={saldo}
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-2xl font-bold tabular-nums text-center focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  autoFocus
                />
              </div>
              {/* Atajos: 50%, saldo total */}
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {[0.25, 0.5, 0.75, 1].map((f) => (
                  <button
                    key={f}
                    onClick={() => setMonto((saldo * f).toFixed(2))}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700"
                  >
                    {f === 1 ? 'Todo' : `${f * 100}% (S/ ${(saldo * f).toFixed(2)})`}
                  </button>
                ))}
              </div>
              {valido && (
                <div className="mt-3 text-xs text-slate-600">
                  Quedará{' '}
                  <b className={saldoRestante > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                    S/ {saldoRestante.toFixed(2)}
                  </b>{' '}
                  {saldoRestante > 0 ? 'pendiente por cobrar' : '✓ saldado'}
                </div>
              )}
              {!valido && montoNum > saldo && (
                <div className="mt-2 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 border border-rose-200 rounded p-2">
                  El monto excede el saldo pendiente
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 py-2.5 rounded-xl font-medium text-slate-700"
            >
              Cancelar
            </button>
            <button
              onClick={() =>
                onCobrar(modo === 'parcial' ? montoNum : undefined)
              }
              disabled={loading || (modo === 'parcial' && !valido)}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white py-2.5 rounded-xl font-semibold shadow-md shadow-emerald-500/30 disabled:opacity-40"
            >
              {loading
                ? 'Registrando...'
                : `Confirmar S/ ${modo === 'parcial' ? montoNum.toFixed(2) : saldo.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function calcularEdad(fechaISO: string): number {
  const nac = new Date(fechaISO);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const antesDeBirthday =
    hoy.getMonth() < nac.getMonth() ||
    (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate());
  if (antesDeBirthday) edad -= 1;
  return edad;
}

function DatosFiscalesModal({
  alquiler,
  onClose,
}: {
  alquiler: Alquiler;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const [tipo, setTipo] = useState<'BOLETA' | 'FACTURA'>(
    (alquiler.tipoComprobante as any) || 'BOLETA',
  );
  const [ruc, setRuc] = useState(alquiler.clienteRuc || '');
  const [razonSocial, setRazonSocial] = useState(
    alquiler.clienteRazonSocial || '',
  );
  const [direccion, setDireccion] = useState(
    alquiler.clienteDireccionFiscal || '',
  );
  const [rucData, setRucData] = useState<any | null>(null);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (tipo !== 'FACTURA' || !/^(10|15|17|20)\d{9}$/.test(ruc)) {
      setRucData(null);
      return;
    }
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        const { data } = await api.get('/alquileres/ruc/buscar', {
          params: { ruc },
        });
        setRucData(data);
        if (data?.encontrado) {
          if (!razonSocial) setRazonSocial(data.razonSocial);
          if (!direccion && data.direccion) setDireccion(data.direccion);
        }
      } catch {
        setRucData(null);
      } finally {
        setBuscando(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [ruc, tipo]);

  const guardar = useMutation({
    mutationFn: async () =>
      (
        await api.patch(`/alquileres/${alquiler.id}/datos-fiscales`, {
          tipoComprobante: tipo,
          ruc: tipo === 'FACTURA' ? ruc : undefined,
          razonSocial: tipo === 'FACTURA' ? razonSocial : undefined,
          direccionFiscal: tipo === 'FACTURA' ? direccion : undefined,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alquileres'] });
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
      toast({
        type: 'success',
        title:
          tipo === 'FACTURA'
            ? 'Factura configurada'
            : 'Cambiado a boleta',
        description:
          tipo === 'FACTURA' ? `RUC ${ruc} · ${razonSocial}` : undefined,
      });
      onClose();
    },
    onError: (err: any) =>
      toast({
        type: 'error',
        title: 'Error',
        description: err.response?.data?.message || err.message,
      }),
  });

  const valido =
    tipo === 'BOLETA' ||
    (/^(10|15|17|20)\d{9}$/.test(ruc) && razonSocial.length >= 3);

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-scale-in">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <div>
            <h2 className="font-hotel text-lg font-bold text-slate-900">
              Datos de facturación
            </h2>
            <div className="text-xs text-slate-500 mt-0.5">
              Hab. {alquiler.habitacion.numero} · {alquiler.clienteNombre}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setTipo('BOLETA')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                tipo === 'BOLETA'
                  ? 'bg-white shadow-sm text-violet-700'
                  : 'text-slate-600'
              }`}
            >
              Boleta (DNI)
            </button>
            <button
              onClick={() => setTipo('FACTURA')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                tipo === 'FACTURA'
                  ? 'bg-white shadow-sm text-violet-700'
                  : 'text-slate-600'
              }`}
            >
              Factura (RUC)
            </button>
          </div>

          {tipo === 'FACTURA' ? (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                  RUC (11 dígitos)
                </label>
                <div className="relative mt-1">
                  <input
                    value={ruc}
                    onChange={(e) =>
                      setRuc(e.target.value.replace(/\D/g, '').slice(0, 11))
                    }
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="20123456789"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 pr-9 text-sm font-mono focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    {buscando ? (
                      <Loader2
                        size={14}
                        className="text-violet-500 animate-spin"
                      />
                    ) : (
                      <Search size={13} className="text-slate-400" />
                    )}
                  </div>
                </div>
              </div>
              {rucData?.fuente === 'local' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs">
                  <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <UserCheck size={12} /> Empresa recurrente
                  </div>
                  <div className="text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {rucData.visitas} visita
                    {rucData.visitas === 1 ? '' : 's'} · última:{' '}
                    {new Date(rucData.ultimaVisita).toLocaleDateString('es-PE')}
                  </div>
                </div>
              )}
              {rucData?.fuente === 'sunat' && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-xs">
                  <div className="font-bold text-violet-900 dark:text-violet-200 flex items-center gap-1.5">
                    <Search size={12} /> Encontrado en SUNAT
                  </div>
                  <div className="text-violet-700 dark:text-violet-300 mt-0.5">
                    {rucData.estado} · {rucData.condicion}
                  </div>
                </div>
              )}
              {rucData &&
                !rucData.encontrado &&
                ruc.length === 11 &&
                !buscando && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-200">
                    <b>No encontrado</b> · no está en el sistema ni en SUNAT.
                    Rellena la razón social manualmente abajo.
                  </div>
                )}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                  Razón social
                </label>
                <input
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value.toUpperCase())}
                  placeholder="INVERSIONES ABC S.A.C."
                  className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                  Dirección fiscal (opcional)
                </label>
                <input
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Av. ..."
                  className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4">
              Se emitirá <b>boleta de venta</b> a nombre de{' '}
              <b>{alquiler.clienteNombre}</b> (DNI {alquiler.clienteDni}).
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 py-2.5 rounded-xl font-medium text-slate-700"
            >
              Cancelar
            </button>
            <button
              onClick={() => guardar.mutate()}
              disabled={guardar.isPending || !valido}
              className="flex-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white py-2.5 rounded-xl font-semibold shadow-md shadow-violet-500/30 disabled:opacity-40"
            >
              {guardar.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
