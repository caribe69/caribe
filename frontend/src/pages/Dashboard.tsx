import { useQuery } from '@tanstack/react-query';
import {
  BedDouble,
  Sparkles,
  KeyRound,
  TrendingUp,
  Users as UsersIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface Habitacion {
  id: number;
  numero: string;
  estado: string;
  piso: { numero: number };
}

interface Alquiler {
  id: number;
  total: string;
  estado: string;
  creadoEn: string;
}

export default function Dashboard() {
  const usuario = useAuthStore((s) => s.usuario);

  const habsQ = useQuery({
    queryKey: ['habitaciones'],
    queryFn: async () => (await api.get<Habitacion[]>('/habitaciones')).data,
  });

  const alqsQ = useQuery({
    queryKey: ['alquileres'],
    queryFn: async () => (await api.get<Alquiler[]>('/alquileres')).data,
  });

  const porEstado = (estado: string) =>
    habsQ.data?.filter((h) => h.estado === estado).length ?? 0;

  const total = habsQ.data?.length ?? 0;
  const disponibles = porEstado('DISPONIBLE');
  const ocupadas = porEstado('OCUPADA');
  const alistando = porEstado('ALISTANDO');
  const mantenimiento =
    porEstado('MANTENIMIENTO') + porEstado('FUERA_SERVICIO');

  const ocupacionPct = total > 0 ? Math.round((ocupadas / total) * 100) : 0;

  // Ingresos del día (hoy, en alquileres NO ANULADOS)
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const ingresosHoy =
    alqsQ.data
      ?.filter(
        (a) => a.estado !== 'ANULADO' && new Date(a.creadoEn) >= hoy,
      )
      .reduce((s, a) => s + Number(a.total), 0) ?? 0;

  const alquileresHoy = alqsQ.data?.filter(
    (a) => a.estado !== 'ANULADO' && new Date(a.creadoEn) >= hoy,
  ).length ?? 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-hotel text-3xl font-bold text-caribe-900">
          Buenos días, {usuario?.nombre?.split(' ')[0] || 'bienvenido'}
        </h1>
        <p className="text-slate-500 mt-1">
          Panel general ·{' '}
          {new Date().toLocaleDateString('es-PE', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* KPIs grandes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi
          label="Disponibles"
          value={disponibles}
          sub={`de ${total} habitaciones`}
          Icon={KeyRound}
          gradientFrom="from-emerald-500"
          gradientTo="to-emerald-700"
        />
        <Kpi
          label="Ocupadas"
          value={ocupadas}
          sub={`${ocupacionPct}% ocupación`}
          Icon={BedDouble}
          gradientFrom="from-rose-500"
          gradientTo="to-rose-700"
        />
        <Kpi
          label="En limpieza"
          value={alistando}
          sub={`${mantenimiento} en mantenimiento`}
          Icon={Sparkles}
          gradientFrom="from-amber-500"
          gradientTo="to-amber-700"
        />
        <Kpi
          label="Ingresos hoy"
          value={`S/ ${ingresosHoy.toFixed(0)}`}
          sub={`${alquileresHoy} alquileres`}
          Icon={TrendingUp}
          gradientFrom="from-caribe-600"
          gradientTo="to-caribe-800"
          valueClass="text-xl sm:text-2xl"
        />
      </div>

      {/* Ocupación visual */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-hotel text-xl font-semibold text-caribe-900">
                Mapa de habitaciones
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Vista rápida del estado de toda la sede
              </p>
            </div>
            <span className="text-xs bg-caribe-50 text-caribe-700 px-3 py-1.5 rounded-full font-medium">
              {ocupacionPct}% ocupación
            </span>
          </div>

          {habsQ.isLoading ? (
            <div className="text-slate-400 text-sm py-8 text-center">
              Cargando...
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {habsQ.data?.map((h) => (
                <div
                  key={h.id}
                  className={`estado-${h.estado} rounded-lg px-2 py-3 text-sm font-semibold text-center border border-white/50`}
                  title={`Hab. ${h.numero} · ${h.estado}`}
                >
                  {h.numero}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-caribe-800 to-caribe-950 rounded-2xl p-6 text-white shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-gold-400/20 flex items-center justify-center">
              <UsersIcon size={16} className="text-gold-400" />
            </div>
            <h2 className="font-hotel text-lg font-semibold">Tu sesión</h2>
          </div>
          <div className="space-y-3 text-sm">
            <Row label="Usuario" value={usuario?.nombre || '-'} />
            <Row label="Rol" value={usuario?.rol?.replace('_', ' ') || '-'} />
            <Row label="Sede" value={usuario?.sede?.nombre || '-'} />
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-xs text-caribe-200">
            Sistema operando normalmente
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300">En línea</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick legend */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-hotel text-lg font-semibold text-caribe-900 mb-3">
          Leyenda de estados
        </h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <Legend color="bg-emerald-500" label="Disponible" />
          <Legend color="bg-rose-500" label="Ocupada" />
          <Legend color="bg-amber-500" label="Alistando limpieza" />
          <Legend color="bg-blue-500" label="Mantenimiento" />
          <Legend color="bg-slate-500" label="Fuera de servicio" />
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  Icon,
  gradientFrom,
  gradientTo,
  valueClass = 'text-3xl',
}: {
  label: string;
  value: string | number;
  sub?: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  gradientFrom: string;
  gradientTo: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition overflow-hidden relative">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500 font-medium">
            {label}
          </div>
          <div className={`${valueClass} font-bold text-caribe-900 mt-1`}>
            {value}
          </div>
          {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
        </div>
        <div
          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center shadow-sm`}
        >
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-caribe-200 text-xs uppercase tracking-wider">
        {label}
      </span>
      <span className="text-white font-medium text-right truncate">
        {value}
      </span>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-3 h-3 rounded ${color}`} />
      <span className="text-slate-600">{label}</span>
    </div>
  );
}
