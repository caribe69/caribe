import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  BedDouble,
  TrendingUp,
  Calendar,
  Trophy,
  Building,
  Users,
  Banknote,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface HabTop {
  habitacionId: number;
  numero: string;
  pisoNumero: number;
  descripcion: string | null;
  alquileres: number;
  ingresos: number;
}

interface SerieItem {
  fecha: string;
  alquileres: number;
  ingresos: number;
}

interface MesItem {
  mes: string;
  alquileres: number;
  ingresos: number;
}

interface KpisHoteleros {
  periodo: { desde: string; hasta: string; dias: number };
  inventario: { totalHabitaciones: number; habitacionesActivas: number };
  ocupacion: {
    promedioPct: number;
    nochesOcupadas: number;
    nochesDisponibles: number;
  };
  ingresos: { total: number; habitacion: number; productos: number };
  kpis: {
    adr: number;
    revpar: number;
    ticketPromedio: number;
    estadiaPromedioHoras: number;
  };
  alquileres: {
    finalizados: number;
    anulados: number;
    activos: number;
    tasaAnulacionPct: number;
  };
  clientes: { total: number; nuevos: number; recurrentes: number };
  topHabitaciones: Array<{
    habitacionId: number;
    numero: string;
    pisoNumero: number;
    ingresos: number;
    alquileres: number;
  }>;
  topCajeros: Array<{
    usuarioId: number;
    nombre: string;
    ingresos: number;
    alquileres: number;
  }>;
  serie: Array<{
    fecha: string;
    ocupacionPct: number;
    ingresos: number;
    alquileres: number;
  }>;
  mejorDia: { fecha: string; ocupacionPct: number } | null;
}

interface PanelGlobal {
  totales: {
    alquileres: number;
    ingresos: number;
    clientesNuevos: number;
  };
  sedesRanking: Array<{
    sedeId: number;
    sedeNombre: string;
    alquileres: number;
    ingresos: number;
  }>;
  porMetodo: Array<{
    metodo: string;
    cantidad: number;
    total: number;
  }>;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const COLORS = ['#8b5cf6', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

export default function Reportes() {
  const usuario = useAuthStore((s) => s.usuario);
  const activeSedeId = useAuthStore((s) => s.activeSedeId);
  const esSuperadmin = usuario?.rol === 'SUPERADMIN';

  const [desde, setDesde] = useState(daysAgo(30));
  const [hasta, setHasta] = useState(today());
  const [tab, setTab] = useState<'kpis' | 'sede' | 'global'>('kpis');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (desde) p.desde = desde;
    if (hasta) p.hasta = hasta;
    if (activeSedeId) p.sedeId = String(activeSedeId);
    return p;
  }, [desde, hasta, activeSedeId]);

  const habTop = useQuery<HabTop[]>({
    queryKey: ['reportes', 'hab-top', params],
    queryFn: async () =>
      (await api.get('/reportes/habitaciones-top', { params })).data,
    enabled: tab === 'sede',
  });

  const serie = useQuery<SerieItem[]>({
    queryKey: ['reportes', 'serie', params],
    queryFn: async () =>
      (await api.get('/reportes/serie-diaria', { params })).data,
    enabled: tab === 'sede',
  });

  const comparativo = useQuery<MesItem[]>({
    queryKey: ['reportes', 'comparativo', activeSedeId],
    queryFn: async () =>
      (
        await api.get('/reportes/comparativo-mensual', {
          params: { meses: 6, sedeId: activeSedeId },
        })
      ).data,
    enabled: tab === 'sede',
  });

  const global = useQuery<PanelGlobal>({
    queryKey: ['reportes', 'global', desde, hasta],
    queryFn: async () =>
      (await api.get('/reportes/global', { params: { desde, hasta } })).data,
    enabled: tab === 'global' && esSuperadmin,
  });

  const kpis = useQuery<KpisHoteleros>({
    queryKey: ['reportes', 'kpis', params],
    queryFn: async () =>
      (await api.get('/reportes/kpis-hoteleros', { params })).data,
    enabled: tab === 'kpis',
  });

  const totales = useMemo(() => {
    if (!habTop.data) return { alquileres: 0, ingresos: 0 };
    return habTop.data.reduce(
      (acc, h) => ({
        alquileres: acc.alquileres + h.alquileres,
        ingresos: acc.ingresos + h.ingresos,
      }),
      { alquileres: 0, ingresos: 0 },
    );
  }, [habTop.data]);

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="bg-white rounded-3xl p-5 shadow-sm flex flex-wrap gap-3 items-end">
        <div className="flex bg-slate-100 rounded-xl p-1 mr-2">
          <button
            onClick={() => setTab('kpis')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'kpis'
                ? 'bg-white shadow-sm text-violet-700 dark:text-violet-300'
                : 'text-slate-600'
            }`}
          >
            KPIs hoteleros
          </button>
          {esSuperadmin && (
            <button
              onClick={() => setTab('global')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === 'global'
                  ? 'bg-white shadow-sm text-violet-700 dark:text-violet-300'
                  : 'text-slate-600'
              }`}
            >
              Global
            </button>
          )}
          <button
            onClick={() => setTab('sede')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'sede'
                ? 'bg-white shadow-sm text-violet-700 dark:text-violet-300'
                : 'text-slate-600'
            }`}
          >
            Ranking
          </button>
        </div>

        <Field label="Desde">
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
          />
        </Field>
        <Field label="Hasta">
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
          />
        </Field>
        <div className="flex gap-1">
          <QuickBtn onClick={() => { setDesde(today()); setHasta(today()); }}>
            Hoy
          </QuickBtn>
          <QuickBtn onClick={() => { setDesde(daysAgo(7)); setHasta(today()); }}>
            7d
          </QuickBtn>
          <QuickBtn onClick={() => { setDesde(daysAgo(30)); setHasta(today()); }}>
            30d
          </QuickBtn>
          <QuickBtn onClick={() => { setDesde(daysAgo(90)); setHasta(today()); }}>
            90d
          </QuickBtn>
        </div>
      </div>

      {tab === 'kpis' && kpis.data && (
        <>
          {/* KPIs principales: Ocupación, ADR, RevPAR, Ingresos */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiBig
              icon="🏨"
              label="Ocupación"
              value={`${kpis.data.ocupacion.promedioPct.toFixed(1)}%`}
              color="from-violet-500 to-violet-600"
              sub={`${kpis.data.ocupacion.nochesOcupadas.toFixed(0)} / ${kpis.data.ocupacion.nochesDisponibles} noches`}
            />
            <KpiBig
              icon="💳"
              label="ADR"
              value={`S/ ${kpis.data.kpis.adr.toFixed(2)}`}
              color="from-emerald-500 to-emerald-600"
              sub="Tarifa promedio"
            />
            <KpiBig
              icon="📈"
              label="RevPAR"
              value={`S/ ${kpis.data.kpis.revpar.toFixed(2)}`}
              color="from-amber-500 to-amber-600"
              sub="Ingreso por hab. disponible"
            />
            <KpiBig
              icon="💰"
              label="Ingresos"
              value={`S/ ${kpis.data.ingresos.total.toFixed(0)}`}
              color="from-rose-500 to-rose-600"
              sub={`${kpis.data.alquileres.finalizados} alquileres · ${kpis.data.periodo.dias}d`}
            />
          </div>

          {/* KPIs secundarios */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiSmall label="Ticket promedio" value={`S/ ${kpis.data.kpis.ticketPromedio.toFixed(2)}`} />
            <KpiSmall label="Estadía promedio" value={`${kpis.data.kpis.estadiaPromedioHoras.toFixed(1)} h`} />
            <KpiSmall
              label="Clientes nuevos"
              value={String(kpis.data.clientes.nuevos)}
              sub={`${kpis.data.clientes.recurrentes} recurrentes`}
            />
            <KpiSmall
              label="Tasa anulación"
              value={`${kpis.data.alquileres.tasaAnulacionPct.toFixed(1)}%`}
              sub={`${kpis.data.alquileres.anulados} anulados`}
              danger={kpis.data.alquileres.tasaAnulacionPct > 10}
            />
          </div>

          {/* Grafica de ocupación + ingresos */}
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-violet-500" />
              <h2 className="font-hotel text-lg font-bold">
                Ocupación e ingresos por día
              </h2>
            </div>
            {kpis.data.serie.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={kpis.data.serie}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="fecha"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(f) =>
                        new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' })
                      }
                    />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `S/${v}`}
                    />
                    <Tooltip
                      formatter={(v: any, name: any) => {
                        if (name === 'Ocupación %') return `${Number(v).toFixed(1)}%`;
                        if (name === 'Ingresos') return `S/ ${Number(v).toFixed(2)}`;
                        return v;
                      }}
                      labelFormatter={(f) =>
                        new Date(f).toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long' })
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line yAxisId="left" type="monotone" dataKey="ocupacionPct" stroke="#8b5cf6" strokeWidth={3} name="Ocupación %" dot={{ r: 3 }} />
                    <Line yAxisId="right" type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={2} name="Ingresos" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart>Sin datos en este rango</EmptyChart>
            )}
          </div>

          {/* Top habitaciones + Top cajeros */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Top habitaciones */}
            <div className="bg-white rounded-3xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Trophy size={18} className="text-amber-500" />
                <h2 className="font-hotel text-lg font-bold">
                  Top 10 habitaciones
                </h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200">
                    <th className="text-left py-2">#</th>
                    <th className="text-left py-2">Hab.</th>
                    <th className="text-right py-2">Alq.</th>
                    <th className="text-right py-2">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.data.topHabitaciones.map((h, i) => (
                    <tr key={h.habitacionId} className="border-b border-slate-100 hover:bg-violet-50/30">
                      <td className="py-2.5"><RankBadge pos={i + 1} /></td>
                      <td className="py-2.5">
                        <div className="font-semibold">{h.numero}</div>
                        <div className="text-[10px] text-slate-400">Piso {h.pisoNumero}</div>
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{h.alquileres}</td>
                      <td className="py-2.5 text-right text-emerald-700 dark:text-emerald-300 font-semibold tabular-nums">
                        S/ {h.ingresos.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {kpis.data.topHabitaciones.length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-slate-400 text-xs">Sin datos</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Top cajeros */}
            <div className="bg-white rounded-3xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Users size={18} className="text-emerald-500" />
                <h2 className="font-hotel text-lg font-bold">
                  Top cajeros del periodo
                </h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200">
                    <th className="text-left py-2">#</th>
                    <th className="text-left py-2">Usuario</th>
                    <th className="text-right py-2">Alq.</th>
                    <th className="text-right py-2">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.data.topCajeros.map((c, i) => (
                    <tr key={c.usuarioId} className="border-b border-slate-100 hover:bg-violet-50/30">
                      <td className="py-2.5"><RankBadge pos={i + 1} /></td>
                      <td className="py-2.5 font-semibold truncate max-w-[180px]">{c.nombre}</td>
                      <td className="py-2.5 text-right tabular-nums">{c.alquileres}</td>
                      <td className="py-2.5 text-right text-emerald-700 dark:text-emerald-300 font-semibold tabular-nums">
                        S/ {c.ingresos.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {kpis.data.topCajeros.length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-slate-400 text-xs">Sin datos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ingresos breakdown */}
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <h2 className="font-hotel text-lg font-bold mb-4">Desglose de ingresos</h2>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="bg-violet-50 rounded-2xl p-4">
                <div className="text-[10px] uppercase tracking-widest text-violet-600 dark:text-violet-300 font-bold">Habitaciones</div>
                <div className="text-2xl font-hotel font-bold text-violet-700 dark:text-violet-200 mt-1">
                  S/ {kpis.data.ingresos.habitacion.toFixed(2)}
                </div>
                <div className="text-[11px] text-violet-500 dark:text-violet-300 mt-1">
                  {kpis.data.ingresos.total > 0
                    ? ((kpis.data.ingresos.habitacion / kpis.data.ingresos.total) * 100).toFixed(0)
                    : 0}% del total
                </div>
              </div>
              <div className="bg-blue-50 rounded-2xl p-4">
                <div className="text-[10px] uppercase tracking-widest text-blue-600 dark:text-blue-300 font-bold">Productos</div>
                <div className="text-2xl font-hotel font-bold text-blue-700 dark:text-blue-200 mt-1">
                  S/ {kpis.data.ingresos.productos.toFixed(2)}
                </div>
                <div className="text-[11px] text-blue-500 dark:text-blue-300 mt-1">
                  {kpis.data.ingresos.total > 0
                    ? ((kpis.data.ingresos.productos / kpis.data.ingresos.total) * 100).toFixed(0)
                    : 0}% del total
                </div>
              </div>
              <div className="bg-emerald-50 rounded-2xl p-4">
                <div className="text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-300 font-bold">Total</div>
                <div className="text-2xl font-hotel font-bold text-emerald-700 dark:text-emerald-200 mt-1">
                  S/ {kpis.data.ingresos.total.toFixed(2)}
                </div>
                <div className="text-[11px] text-emerald-500 dark:text-emerald-300 mt-1">
                  {kpis.data.inventario.habitacionesActivas} hab. activas
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'kpis' && !kpis.data && (
        <div className="bg-white rounded-3xl p-16 text-center text-slate-400">
          Calculando KPIs del periodo...
        </div>
      )}

      {tab === 'sede' && (
        <>
          {/* KPIs sede */}
          <div className="grid md:grid-cols-3 gap-4">
            <KpiCard
              icon={<BedDouble size={20} />}
              label="Alquileres"
              value={totales.alquileres}
              color="bg-violet-500"
            />
            <KpiCard
              icon={<Banknote size={20} />}
              label="Ingresos"
              value={`S/ ${totales.ingresos.toFixed(2)}`}
              color="bg-emerald-500"
            />
            <KpiCard
              icon={<Trophy size={20} />}
              label="Habitación top"
              value={
                habTop.data?.[0]
                  ? `Hab. ${habTop.data[0].numero} (${habTop.data[0].alquileres})`
                  : '—'
              }
              color="bg-amber-500"
            />
          </div>

          {/* Habitaciones más vendidas */}
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={18} className="text-amber-500" />
              <h2 className="font-hotel text-lg font-bold">
                Habitaciones más vendidas
              </h2>
            </div>
            {habTop.data && habTop.data.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={habTop.data.slice(0, 10).map((h) => ({
                      name: `${h.numero}`,
                      alquileres: h.alquileres,
                      ingresos: h.ingresos,
                    }))}
                    margin={{ top: 10, right: 10, bottom: 10, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11 }}
                      label={{ value: 'Alquileres', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `S/${v}`}
                    />
                    <Tooltip
                      formatter={(v: any, name: any) =>
                        name === 'Ingresos' ? `S/ ${Number(v).toFixed(2)}` : v
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      yAxisId="left"
                      dataKey="alquileres"
                      fill="#8b5cf6"
                      name="Alquileres"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="ingresos"
                      fill="#10b981"
                      name="Ingresos"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart>Sin alquileres finalizados en el rango</EmptyChart>
            )}

            {/* Tabla ranking */}
            {habTop.data && habTop.data.length > 0 && (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200">
                      <th className="text-left py-2">#</th>
                      <th className="text-left py-2">Habitación</th>
                      <th className="text-left py-2">Piso</th>
                      <th className="text-left py-2">Descripción</th>
                      <th className="text-right py-2">Alquileres</th>
                      <th className="text-right py-2">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {habTop.data.slice(0, 15).map((h, i) => (
                      <tr
                        key={h.habitacionId}
                        className="border-b border-slate-100 hover:bg-violet-50/30"
                      >
                        <td className="py-2.5">
                          <RankBadge pos={i + 1} />
                        </td>
                        <td className="py-2.5 font-semibold">{h.numero}</td>
                        <td className="py-2.5 text-slate-500">
                          Piso {h.pisoNumero}
                        </td>
                        <td className="py-2.5 text-slate-500 text-xs">
                          {h.descripcion || '—'}
                        </td>
                        <td className="py-2.5 text-right font-semibold tabular-nums">
                          {h.alquileres}
                        </td>
                        <td className="py-2.5 text-right text-emerald-700 dark:text-emerald-300 font-semibold tabular-nums">
                          S/ {h.ingresos.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tendencia diaria */}
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={18} className="text-violet-500" />
              <h2 className="font-hotel text-lg font-bold">
                Alquileres por día
              </h2>
            </div>
            {serie.data && serie.data.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={serie.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="fecha"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(f) =>
                        new Date(f).toLocaleDateString('es-PE', {
                          day: '2-digit',
                          month: '2-digit',
                        })
                      }
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      labelFormatter={(f) =>
                        new Date(f).toLocaleDateString('es-PE', {
                          weekday: 'long',
                          day: '2-digit',
                          month: 'long',
                        })
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="alquileres"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ fill: '#8b5cf6', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart>Sin datos en el rango</EmptyChart>
            )}
          </div>

          {/* Comparativo mensual */}
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-emerald-500" />
              <h2 className="font-hotel text-lg font-bold">
                Comparativo de los últimos 6 meses
              </h2>
            </div>
            {comparativo.data && comparativo.data.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparativo.data.map((m) => ({
                      ...m,
                      mes: formatMes(m.mes),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `S/${v}`}
                    />
                    <Tooltip
                      formatter={(v: any, name: any) =>
                        name === 'Ingresos' ? `S/ ${Number(v).toFixed(2)}` : v
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      yAxisId="left"
                      dataKey="alquileres"
                      fill="#8b5cf6"
                      name="Alquileres"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="ingresos"
                      fill="#10b981"
                      name="Ingresos"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart>Sin datos de meses anteriores</EmptyChart>
            )}
          </div>
        </>
      )}

      {tab === 'global' && esSuperadmin && (
        <>
          {/* KPIs globales */}
          <div className="grid md:grid-cols-3 gap-4">
            <KpiCard
              icon={<BedDouble size={20} />}
              label="Alquileres totales"
              value={global.data?.totales.alquileres ?? 0}
              color="bg-violet-500"
            />
            <KpiCard
              icon={<Banknote size={20} />}
              label="Ingresos totales"
              value={`S/ ${(global.data?.totales.ingresos ?? 0).toFixed(2)}`}
              color="bg-emerald-500"
            />
            <KpiCard
              icon={<Users size={20} />}
              label="Clientes nuevos"
              value={global.data?.totales.clientesNuevos ?? 0}
              color="bg-amber-500"
            />
          </div>

          {/* Ranking sedes */}
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Building size={18} className="text-violet-500" />
              <h2 className="font-hotel text-lg font-bold">
                Sedes que producen más
              </h2>
            </div>
            {global.data && global.data.sedesRanking.length > 0 ? (
              <>
                <div className="h-72 mb-5">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={global.data.sedesRanking}
                      layout="vertical"
                      margin={{ left: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `S/${v}`}
                      />
                      <YAxis
                        dataKey="sedeNombre"
                        type="category"
                        tick={{ fontSize: 12 }}
                        width={140}
                      />
                      <Tooltip
                        formatter={(v: any) => `S/ ${Number(v).toFixed(2)}`}
                      />
                      <Bar
                        dataKey="ingresos"
                        fill="#8b5cf6"
                        name="Ingresos"
                        radius={[0, 6, 6, 0]}
                      >
                        {global.data.sedesRanking.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200">
                        <th className="text-left py-2">#</th>
                        <th className="text-left py-2">Sede</th>
                        <th className="text-right py-2">Alquileres</th>
                        <th className="text-right py-2">Ingresos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {global.data.sedesRanking.map((s, i) => (
                        <tr
                          key={s.sedeId}
                          className="border-b border-slate-100 hover:bg-violet-50/30"
                        >
                          <td className="py-2.5">
                            <RankBadge pos={i + 1} />
                          </td>
                          <td className="py-2.5 font-semibold">{s.sedeNombre}</td>
                          <td className="py-2.5 text-right font-semibold tabular-nums">
                            {s.alquileres}
                          </td>
                          <td className="py-2.5 text-right text-emerald-700 dark:text-emerald-300 font-semibold tabular-nums">
                            S/ {s.ingresos.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <EmptyChart>Sin datos</EmptyChart>
            )}
          </div>

          {/* Métodos de pago */}
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Banknote size={18} className="text-emerald-500" />
              <h2 className="font-hotel text-lg font-bold">
                Distribución por método de pago
              </h2>
            </div>
            {global.data && global.data.porMetodo.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={global.data.porMetodo.map((m) => ({
                        name: m.metodo,
                        value: m.total,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      dataKey="value"
                      label={(e: any) =>
                        `${e.name}: S/${Number(e.value).toFixed(0)}`
                      }
                    >
                      {global.data.porMetodo.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => `S/ ${Number(v).toFixed(2)}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart>Sin datos</EmptyChart>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---- Helpers UI ----

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function QuickBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-violet-100 hover:text-violet-700 dark:hover:text-violet-300 rounded-xl transition"
    >
      {children}
    </button>
  );
}

function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-md ${color}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
          {label}
        </div>
        <div className="text-2xl font-hotel font-bold text-slate-900 truncate">
          {value}
        </div>
      </div>
    </div>
  );
}

function RankBadge({ pos }: { pos: number }) {
  const styles =
    pos === 1
      ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-white'
      : pos === 2
        ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white'
        : pos === 3
          ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white'
          : 'bg-slate-100 text-slate-500';
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${styles}`}
    >
      {pos}
    </span>
  );
}

function EmptyChart({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
      {children}
    </div>
  );
}

function KpiBig({
  icon,
  label,
  value,
  color,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <div
      className={`relative rounded-3xl p-5 shadow-md text-white overflow-hidden bg-gradient-to-br ${color}`}
    >
      <div className="absolute -right-4 -top-4 text-6xl opacity-15">
        {icon}
      </div>
      <div className="relative">
        <div className="text-[10px] uppercase tracking-widest font-semibold opacity-90">
          {label}
        </div>
        <div className="text-3xl font-hotel font-bold mt-1 truncate">
          {value}
        </div>
        {sub && <div className="text-[11px] opacity-80 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

function KpiSmall({
  label,
  value,
  sub,
  danger,
}: {
  label: string;
  value: string;
  sub?: string;
  danger?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
        {label}
      </div>
      <div
        className={`text-xl font-hotel font-bold mt-1 ${
          danger ? 'text-rose-600' : 'text-slate-900'
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function formatMes(mes: string) {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('es-PE', {
    month: 'short',
    year: '2-digit',
  });
}
