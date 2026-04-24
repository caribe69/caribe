import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  BarChart3,
  Wallet,
  Clock,
  StopCircle,
  FileText,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Turno {
  id: number;
  estado: string;
  abiertoEn: string;
  cerradoEn?: string | null;
  totalGeneral: string;
  sede: { id: number; nombre: string };
  usuario?: { id: number; nombre: string; username: string };
}

interface StatsBucket {
  cantidadTurnos: number;
  total: number;
  promedio: number;
  porMetodo: {
    efectivo: number;
    visa: number;
    master: number;
    yape: number;
    plin: number;
    otro: number;
  };
}

interface Stats {
  scope: 'sede' | 'personal';
  hoy: StatsBucket;
  semana: StatsBucket;
  mes: StatsBucket;
}

export default function CajaEstadisticas() {
  const turno = useQuery<Turno | null>({
    queryKey: ['caja', 'mi-turno'],
    queryFn: async () => (await api.get('/caja/mi-turno')).data,
    refetchInterval: 30_000,
  });

  const stats = useQuery<Stats>({
    queryKey: ['caja', 'estadisticas'],
    queryFn: async () => (await api.get('/caja/estadisticas')).data,
  });

  const turnos = useQuery<Turno[]>({
    queryKey: ['caja', 'turnos'],
    queryFn: async () => (await api.get('/caja/turnos')).data,
  });

  // Reporte en vivo del turno actual (para los tiles parciales)
  const reporteVivo = useQuery<any>({
    queryKey: ['caja', 'reporte-vivo', turno.data?.id],
    queryFn: async () =>
      (await api.get(`/caja/${turno.data!.id}/reporte`)).data,
    enabled: !!turno.data?.id,
    refetchInterval: 30_000,
  });

  const turnosCerradosHoy = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return (turnos.data || []).filter(
      (t) =>
        t.estado === 'CERRADO' &&
        t.cerradoEn &&
        new Date(t.cerradoEn).getTime() >= start.getTime(),
    );
  }, [turnos.data]);

  return (
    <div className="space-y-5">
      {/* Hero: turno actual en vivo */}
      {turno.data ? (
        <HeroTurnoActivo turno={turno.data} reporte={reporteVivo.data} />
      ) : (
        <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 mb-1">
            Sin turno activo
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
            No hay caja abierta en este momento.
          </div>
          <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
            Abre una desde la página <b>Caja</b> para empezar a ver estadísticas en vivo.
          </div>
        </div>
      )}

      {/* Stats del día */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={18} className="text-violet-600 dark:text-violet-400" />
          <h2 className="font-hotel text-lg font-bold text-slate-900 dark:text-slate-100">
            Actividad de hoy
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiDia
            icon={<StopCircle size={16} />}
            label="Cierres del día"
            value={turnosCerradosHoy.length}
            hint="turnos cerrados hoy"
            color="from-rose-500 to-rose-600"
          />
          <KpiDia
            icon={<Wallet size={16} />}
            label="Ingresos hoy"
            value={`S/ ${(stats.data?.hoy.total ?? 0).toFixed(0)}`}
            hint={`${stats.data?.hoy.cantidadTurnos ?? 0} turnos totales`}
            color="from-emerald-500 to-emerald-600"
          />
          <KpiDia
            icon={<Clock size={16} />}
            label="Ticket promedio"
            value={`S/ ${(stats.data?.hoy.promedio ?? 0).toFixed(0)}`}
            hint="por turno cerrado"
            color="from-violet-500 to-violet-600"
          />
          <KpiDia
            icon={<BarChart3 size={16} />}
            label="Efectivo hoy"
            value={`S/ ${(stats.data?.hoy.porMetodo.efectivo ?? 0).toFixed(0)}`}
            hint={`Digital: S/ ${(
              (stats.data?.hoy.porMetodo.visa ?? 0) +
              (stats.data?.hoy.porMetodo.master ?? 0) +
              (stats.data?.hoy.porMetodo.yape ?? 0) +
              (stats.data?.hoy.porMetodo.plin ?? 0) +
              (stats.data?.hoy.porMetodo.otro ?? 0)
            ).toFixed(0)}`}
            color="from-amber-500 to-amber-600"
          />
        </div>
      </div>

      {/* Stats 7d / 30d + desglose métodos */}
      {stats.data && (
        <div className="grid md:grid-cols-3 gap-3">
          <StatsCard label="Últimos 7 días" bucket={stats.data.semana} accent="violet" />
          <StatsCard label="Últimos 30 días" bucket={stats.data.mes} accent="blue" />
          <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold mb-2">
              Últimos 30d · por método
            </div>
            <MetodoBars porMetodo={stats.data.mes.porMetodo} />
          </div>
        </div>
      )}

      <div className="text-center text-[11px] text-slate-400 dark:text-slate-500">
        Para ver el detalle de un turno específico, abrí{' '}
        <a
          href="/caja"
          className="underline hover:text-violet-600 dark:hover:text-violet-400"
        >
          Caja
        </a>{' '}
        y clickeá cualquier fila de la tabla.
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// Hero turno activo con tiles en vivo
// ═════════════════════════════════════════════════════════
function HeroTurnoActivo({ turno, reporte }: { turno: Turno; reporte?: any }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);
  void tick;

  const abiertoEn = new Date(turno.abiertoEn);
  const ahora = new Date();
  const diffMs = ahora.getTime() - abiertoEn.getTime();
  const horas = Math.floor(diffMs / 3_600_000);
  const minutos = Math.floor((diffMs % 3_600_000) / 60_000);

  const totalVivo = reporte?.desglose?.G ?? 0;
  const habCount = reporte?.alquileres?.cantidad ?? 0;
  const ventaCount = reporte?.ventasDirectas?.cantidad ?? 0;
  const pendientesCount = reporte?.pendientesDeCobro?.cantidad ?? 0;

  return (
    <section className="relative overflow-hidden rounded-3xl shadow-xl shadow-emerald-900/20">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, #065f46 0%, #10b981 55%, #34d399 100%)',
        }}
      />
      <div className="absolute -right-10 -top-10 w-60 h-60 rounded-full bg-white/10 blur-2xl" />
      <div className="relative p-7 text-white">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur text-[10px] uppercase tracking-[0.22em] font-bold px-2.5 py-1 rounded-full mb-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Turno abierto · #{String(turno.id).padStart(3, '0')}
            </div>
            <h2 className="font-hotel text-3xl font-bold leading-tight">
              {turno.sede.nombre}
            </h2>
            <div className="text-white/85 mt-1 text-sm">
              Abierto hace{' '}
              <b className="text-white tabular-nums">
                {horas}h {minutos.toString().padStart(2, '0')}m
              </b>{' '}
              · desde {abiertoEn.toLocaleTimeString('es-PE', { hour12: false })}
            </div>
          </div>
          <a
            href="/caja"
            className="inline-flex items-center gap-2 bg-white/15 backdrop-blur hover:bg-white/25 text-white px-4 py-2.5 rounded-xl text-sm font-medium btn-press transition"
          >
            <FileText size={14} /> Ir a Caja
          </a>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <LiveStat
            label="Total en caja"
            value={`S/ ${totalVivo.toFixed(2)}`}
            hint="parcial del turno"
            emph
          />
          <LiveStat
            label="Habitaciones"
            value={String(habCount)}
            hint={pendientesCount > 0 ? `${pendientesCount} pendientes` : 'cobradas'}
          />
          <LiveStat
            label="Ventas directas"
            value={String(ventaCount)}
            hint="tickets"
          />
          <LiveStat
            label="Efectivo / Digital"
            value={`S/ ${(reporte?.desglose?.totalEfectivo ?? 0).toFixed(0)}`}
            hint={`Digital S/ ${(reporte?.desglose?.totalDigital ?? 0).toFixed(0)}`}
          />
        </div>
      </div>
    </section>
  );
}

function LiveStat({
  label,
  value,
  hint,
  emph,
}: {
  label: string;
  value: string;
  hint?: string;
  emph?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl px-4 py-3 backdrop-blur border ${
        emph ? 'bg-white/25 border-white/40' : 'bg-white/10 border-white/20'
      }`}
    >
      <div className="text-[9.5px] uppercase tracking-[0.18em] text-white/80 font-semibold">
        {label}
      </div>
      <div
        className={`font-hotel font-bold tabular-nums mt-0.5 ${
          emph ? 'text-3xl' : 'text-xl'
        }`}
      >
        {value}
      </div>
      {hint && <div className="text-[11px] text-white/75 mt-0.5">{hint}</div>}
    </div>
  );
}

function KpiDia({
  icon,
  label,
  value,
  hint,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
  color: string;
}) {
  return (
    <div
      className={`rounded-2xl p-4 text-white bg-gradient-to-br ${color} shadow-md relative overflow-hidden`}
    >
      <div className="absolute -right-4 -bottom-4 opacity-20 scale-[3]">
        {icon}
      </div>
      <div className="relative">
        <div className="text-[10px] uppercase tracking-widest opacity-90 font-semibold">
          {label}
        </div>
        <div className="text-2xl font-hotel font-bold mt-1 tabular-nums">
          {value}
        </div>
        {hint && <div className="text-[10px] opacity-80 mt-0.5">{hint}</div>}
      </div>
    </div>
  );
}

function StatsCard({
  label,
  bucket,
  accent,
}: {
  label: string;
  bucket: StatsBucket;
  accent: 'emerald' | 'violet' | 'blue';
}) {
  const accents: Record<string, string> = {
    emerald: 'from-emerald-500 to-emerald-700',
    violet: 'from-violet-500 to-violet-700',
    blue: 'from-blue-500 to-blue-700',
  };
  return (
    <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-transparent card-lift">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">
          {label}
        </div>
        <div
          className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accents[accent]} flex items-center justify-center`}
        >
          <TrendingUp size={14} className="text-white" />
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
        S/ {bucket.total.toFixed(0)}
      </div>
      <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2">
        <span>
          <b className="text-slate-700 dark:text-slate-300">
            {bucket.cantidadTurnos}
          </b>{' '}
          turnos
        </span>
        <span>·</span>
        <span>
          Prom{' '}
          <b className="text-slate-700 dark:text-slate-300 tabular-nums">
            S/ {bucket.promedio.toFixed(0)}
          </b>
        </span>
      </div>
    </div>
  );
}

function MetodoBars({
  porMetodo,
}: {
  porMetodo: StatsBucket['porMetodo'];
}) {
  const data: Array<[string, number, string]> = [
    ['Efectivo', porMetodo.efectivo, 'bg-emerald-500'],
    ['Visa', porMetodo.visa, 'bg-blue-500'],
    ['Master', porMetodo.master, 'bg-orange-500'],
    ['Yape', porMetodo.yape, 'bg-violet-500'],
    ['Plin', porMetodo.plin, 'bg-cyan-500'],
    ['Otro', porMetodo.otro, 'bg-slate-400'],
  ];
  const total = data.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <div className="space-y-2">
      {data.map(([name, value, color]) => {
        const pct = (value / total) * 100;
        return (
          <div key={name}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                {name}
              </span>
              <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                S/ {value.toFixed(2)}{' '}
                <span className="text-slate-400 dark:text-slate-500">
                  ({pct.toFixed(0)}%)
                </span>
              </span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${color} rounded-full transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
