import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import {
  ClipboardList,
  ShoppingCart,
  Wallet,
  Sparkles,
  TrendingUp,
  BedDouble,
  Banknote,
  Users as UsersIcon,
  CalendarClock,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';

interface Habitacion {
  id: number;
  numero: string;
  estado: string;
  alquileres?: Array<{
    id: number;
    clienteNombre: string;
    fechaSalida: string;
  }>;
}

interface Alquiler {
  id: number;
  total: string;
  estado: string;
  metodoPago: string;
  creadoEn: string;
  clienteNombre: string;
  habitacion: { numero: string };
}

interface Kpis {
  periodo: { desde: string; hasta: string; dias: number };
  inventario: { totalHabitaciones: number; habitacionesActivas: number };
  ocupacion: { promedioPct: number };
  ingresos: { total: number; habitacion: number; productos: number };
  kpis: { adr: number; revpar: number; ticketPromedio: number };
  alquileres: { finalizados: number; anulados: number; activos: number };
  clientes: { total: number; nuevos: number };
  serie: Array<{ fecha: string; ocupacionPct: number; ingresos: number; alquileres: number }>;
  topHabitaciones: Array<{ numero: string; alquileres: number; ingresos: number }>;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const usuario = useAuthStore((s) => s.usuario);
  const isAdmin = usuario?.rol === 'SUPERADMIN' || usuario?.rol === 'ADMIN_SEDE';

  const kpisQ = useQuery<Kpis>({
    queryKey: ['dashboard', 'kpis-7d'],
    queryFn: async () =>
      (
        await api.get('/reportes/kpis-hoteleros', {
          params: { desde: daysAgo(7), hasta: today() },
        })
      ).data,
    enabled: isAdmin,
  });

  const habsQ = useQuery<Habitacion[]>({
    queryKey: ['habitaciones'],
    queryFn: async () => (await api.get<Habitacion[]>('/habitaciones')).data,
  });

  const alqsQ = useQuery<Alquiler[]>({
    queryKey: ['alquileres'],
    queryFn: async () => (await api.get<Alquiler[]>('/alquileres')).data,
  });

  // Métricas del día
  const metricas = useMemo(() => {
    const habs = habsQ.data || [];
    const alqs = alqsQ.data || [];
    const hoy = new Date().toDateString();
    const disp = habs.filter((h) => h.estado === 'DISPONIBLE').length;
    const ocup = habs.filter((h) => h.estado === 'OCUPADA').length;
    const alistando = habs.filter((h) => h.estado === 'ALISTANDO').length;
    const totalHabs = habs.length || 1;

    const activos = alqs.filter((a) => a.estado === 'ACTIVO');
    const cerradosHoy = alqs.filter(
      (a) =>
        a.estado === 'FINALIZADO' &&
        new Date(a.creadoEn).toDateString() === hoy,
    );
    const ingresosHoy = alqs
      .filter(
        (a) =>
          a.estado !== 'ANULADO' &&
          new Date(a.creadoEn).toDateString() === hoy,
      )
      .reduce((s, a) => s + Number(a.total), 0);

    // Check-outs previstos hoy (alquileres activos cuya fechaSalida sea hoy)
    const salidasHoy = activos.filter((a) => {
      const hab = habs.find((h) => h.estado === 'OCUPADA');
      return hab && hab.alquileres?.[0]?.fechaSalida
        ? new Date(hab.alquileres[0].fechaSalida).toDateString() === hoy
        : false;
    });

    return {
      ingresosHoy,
      ocupacionPct: totalHabs > 0 ? Math.round((ocup / totalHabs) * 100) : 0,
      disp,
      ocup,
      alistando,
      totalHabs,
      activos: activos.length,
      cerradosHoy: cerradosHoy.length,
      salidasHoy: salidasHoy.length,
    };
  }, [habsQ.data, alqsQ.data]);

  const nombre = usuario?.nombre?.split(' ')[0] || 'Hola';
  const saludo =
    new Date().getHours() < 12
      ? 'Buenos días'
      : new Date().getHours() < 19
        ? 'Buenas tardes'
        : 'Buenas noches';
  const fecha = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-5 pb-8">
      {/* HERO */}
      <section
        className="relative overflow-hidden rounded-3xl p-7 text-white shadow-xl shadow-violet-900/20"
        style={{
          background:
            'linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #a855f7 100%)',
        }}
      >
        {/* Decoración */}
        <div className="absolute -right-10 -top-10 w-60 h-60 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-24 bottom-4 w-32 h-32 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="relative flex flex-wrap gap-5 items-end justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-violet-200">
              {saludo} ·{' '}
              <span style={{ textTransform: 'capitalize' }}>{fecha}</span>
            </div>
            <h1 className="font-hotel text-4xl font-bold mt-2 leading-tight">
              {saludo}, {nombre}
            </h1>
            <p className="text-violet-100 mt-1 text-sm">
              {metricas.activos} alquileres activos · {metricas.alistando}{' '}
              en limpieza · {metricas.disp} disponibles
            </p>
          </div>

          {/* Stats rápidas */}
          <div className="flex gap-3 flex-wrap">
            <HeroStat label="Ocupación" value={`${metricas.ocupacionPct}%`} />
            <HeroStat
              label="Ingresos hoy"
              value={`S/ ${metricas.ingresosHoy.toFixed(0)}`}
            />
            <HeroStat label="Activos" value={metricas.activos} />
          </div>
        </div>

        {/* Atajos */}
        <div className="relative mt-6 flex gap-2 flex-wrap">
          <HeroCTA
            icon={<ClipboardList size={14} />}
            label="Nuevo alquiler"
            onClick={() => navigate('/alquileres')}
          />
          <HeroCTA
            icon={<ShoppingCart size={14} />}
            label="Venta directa"
            onClick={() => navigate('/ventas')}
          />
          <HeroCTA
            icon={<Wallet size={14} />}
            label="Abrir / cerrar caja"
            onClick={() => navigate('/caja')}
          />
          <HeroCTA
            icon={<Sparkles size={14} />}
            label="Limpieza"
            onClick={() => navigate('/limpieza')}
          />
          <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur border border-white/20 rounded-xl px-3 py-2 text-[11px]">
            <kbd className="bg-white/15 border border-white/20 rounded px-1 py-0.5 text-[10px]">
              Ctrl
            </kbd>
            <kbd className="bg-white/15 border border-white/20 rounded px-1 py-0.5 text-[10px]">
              K
            </kbd>
            <span className="opacity-80">búsqueda rápida</span>
          </div>
        </div>
      </section>

      {/* GRID PRINCIPAL */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Columna izquierda: KPIs + Chart */}
        <div className="lg:col-span-2 space-y-4">
          {/* KPIs 4 cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {kpisQ.isLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                <KpiMini
                  icon={<BedDouble size={16} />}
                  label="Ocupación 7d"
                  value={`${kpisQ.data?.ocupacion.promedioPct?.toFixed(0) ?? 0}%`}
                  color="from-violet-500 to-violet-600"
                />
                <KpiMini
                  icon={<Banknote size={16} />}
                  label="Ingresos 7d"
                  value={`S/ ${(kpisQ.data?.ingresos.total ?? 0).toFixed(0)}`}
                  color="from-emerald-500 to-emerald-600"
                />
                <KpiMini
                  icon={<TrendingUp size={16} />}
                  label="ADR"
                  value={`S/ ${(kpisQ.data?.kpis.adr ?? 0).toFixed(0)}`}
                  color="from-amber-500 to-amber-600"
                />
                <KpiMini
                  icon={<UsersIcon size={16} />}
                  label="Clientes nuevos"
                  value={String(kpisQ.data?.clientes.nuevos ?? 0)}
                  color="from-rose-500 to-rose-600"
                />
              </>
            )}
          </div>

          {/* Chart ocupación + ingresos */}
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-hotel text-lg font-bold text-slate-900">
                  Últimos 7 días
                </h2>
                <div className="text-xs text-slate-500">
                  Ocupación % e ingresos diarios
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => navigate('/reportes')}
                  className="text-xs text-violet-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all"
                >
                  Ver reportes <ArrowRight size={12} />
                </button>
              )}
            </div>
            {kpisQ.isLoading ? (
              <Skeleton className="h-64" />
            ) : (kpisQ.data?.serie.length || 0) > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={kpisQ.data!.serie}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="fecha"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(f) =>
                        new Date(f).toLocaleDateString('es-PE', {
                          day: '2-digit',
                          month: '2-digit',
                        })
                      }
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => `S/${v}`}
                    />
                    <Tooltip
                      formatter={(v: any, name: any) =>
                        name === 'Ingresos'
                          ? `S/ ${Number(v).toFixed(2)}`
                          : `${Number(v).toFixed(1)}%`
                      }
                      labelFormatter={(f) =>
                        new Date(f).toLocaleDateString('es-PE', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'short',
                        })
                      }
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="ocupacionPct"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      name="Ocupación %"
                      dot={{ r: 3 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="ingresos"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Ingresos"
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
                Aún no hay datos del periodo
              </div>
            )}
          </div>

          {/* Top habitaciones mini */}
          {kpisQ.data && kpisQ.data.topHabitaciones.length > 0 && (
            <div className="bg-white rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-hotel text-lg font-bold text-slate-900">
                  Habitaciones más vendidas
                </h2>
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={kpisQ.data.topHabitaciones.slice(0, 7)}
                    layout="vertical"
                    margin={{ left: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis
                      type="category"
                      dataKey="numero"
                      tick={{ fontSize: 11 }}
                      width={50}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="alquileres"
                      fill="#8b5cf6"
                      radius={[0, 6, 6, 0]}
                      name="Alquileres"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Columna derecha: Estado de habitaciones + tareas */}
        <div className="space-y-4">
          {/* Estado de habitaciones */}
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <h2 className="font-hotel text-lg font-bold text-slate-900 mb-4">
              Estado actual
            </h2>
            <div className="space-y-2.5">
              <EstadoRow
                color="bg-emerald-500"
                label="Disponibles"
                value={metricas.disp}
                total={metricas.totalHabs}
              />
              <EstadoRow
                color="bg-rose-500"
                label="Ocupadas"
                value={metricas.ocup}
                total={metricas.totalHabs}
              />
              <EstadoRow
                color="bg-amber-500"
                label="En limpieza"
                value={metricas.alistando}
                total={metricas.totalHabs}
              />
            </div>
            <button
              onClick={() => navigate('/alquileres')}
              className="mt-4 w-full text-xs text-violet-600 font-semibold flex items-center justify-center gap-1 hover:gap-2 transition-all py-2"
            >
              Ver mapa completo <ArrowRight size={12} />
            </button>
          </div>

          {/* Tareas de hoy */}
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <h2 className="font-hotel text-lg font-bold text-slate-900 mb-3">
              Hoy
            </h2>
            <div className="space-y-2">
              <TaskRow
                icon={<CalendarClock size={16} className="text-violet-500" />}
                label="Check-ins previstos"
                value={metricas.activos}
              />
              <TaskRow
                icon={<CalendarClock size={16} className="text-emerald-500" />}
                label="Alquileres cerrados"
                value={metricas.cerradosHoy}
              />
              <TaskRow
                icon={<Sparkles size={16} className="text-amber-500" />}
                label="Habitaciones por limpiar"
                value={metricas.alistando}
              />
            </div>
          </div>

          {/* Promo: atajo de teclado */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-violet-950 rounded-3xl p-5 text-white overflow-hidden relative">
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-violet-500/20 blur-2xl" />
            <div className="relative">
              <div className="text-[10px] uppercase tracking-widest text-violet-300 font-bold">
                Productividad
              </div>
              <div className="font-hotel text-xl font-bold mt-1">
                Usa Ctrl+K
              </div>
              <div className="text-sm text-slate-300 mt-1 leading-snug">
                Busca cualquier página o acción sin tocar el mouse.
              </div>
              <div className="mt-3 inline-flex items-center gap-1">
                <kbd className="bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-[10px] font-mono">
                  Ctrl
                </kbd>
                <span className="text-xs">+</span>
                <kbd className="bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-[10px] font-mono">
                  K
                </kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────── subcomponentes ────────

function HeroStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl px-4 py-2.5 min-w-[110px]">
      <div className="text-[10px] uppercase tracking-widest text-violet-200 font-semibold">
        {label}
      </div>
      <div className="text-xl font-hotel font-bold mt-0.5">{value}</div>
    </div>
  );
}

function HeroCTA({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 bg-white text-violet-700 hover:bg-violet-50 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm btn-press"
    >
      {icon} {label}
    </button>
  );
}

function KpiMini({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className={`rounded-2xl p-4 text-white bg-gradient-to-br ${color} shadow-md relative overflow-hidden`}
    >
      <div className="absolute -right-4 -bottom-4 opacity-15 scale-[4]">
        {icon}
      </div>
      <div className="relative">
        <div className="text-[10px] uppercase tracking-widest opacity-90 font-semibold">
          {label}
        </div>
        <div className="text-2xl font-hotel font-bold mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function EstadoRow({
  color,
  label,
  value,
  total,
}: {
  color: string;
  label: string;
  value: number;
  total: number;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1 text-sm">
        <span className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${color}`} />
          <span className="text-slate-700">{label}</span>
        </span>
        <span className="font-bold tabular-nums">
          {value}
          <span className="text-slate-400 text-xs">/{total}</span>
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function TaskRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2.5 text-slate-700">
        {icon} {label}
      </span>
      <span className="font-bold tabular-nums text-slate-900">{value}</span>
    </div>
  );
}
