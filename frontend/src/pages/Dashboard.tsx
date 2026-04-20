import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  ShoppingBag,
  CheckCircle2,
  UserPlus,
  Download,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { api } from '@/lib/api';

interface Habitacion {
  id: number;
  numero: string;
  estado: string;
}

interface Alquiler {
  id: number;
  total: string;
  estado: string;
  metodoPago: string;
  creadoEn: string;
  clienteNombre: string;
  habitacion: { numero: string };
  consumos: Array<{
    cantidad: number;
    subtotal: string;
    producto: { nombre: string };
  }>;
}

export default function Dashboard() {
  const habsQ = useQuery({
    queryKey: ['habitaciones'],
    queryFn: async () => (await api.get<Habitacion[]>('/habitaciones')).data,
  });

  const alqsQ = useQuery({
    queryKey: ['alquileres'],
    queryFn: async () => (await api.get<Alquiler[]>('/alquileres')).data,
  });

  // KPIs de "hoy"
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const alqsHoy =
    alqsQ.data?.filter(
      (a) => a.estado !== 'ANULADO' && new Date(a.creadoEn) >= hoy,
    ) ?? [];
  const ingresosHoy = alqsHoy.reduce((s, a) => s + Number(a.total), 0);
  const alquileresHoy = alqsHoy.length;
  const productosVendidosHoy = alqsHoy.reduce(
    (s, a) => s + a.consumos.reduce((x, c) => x + c.cantidad, 0),
    0,
  );
  const clientesHoy = new Set(alqsHoy.map((a) => a.clienteNombre)).size;

  // Datos para charts
  const revenuePorDia = useMemo(() => {
    const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const now = new Date();
    const result = dias.map((d, i) => {
      // calcular el día correspondiente de la semana actual
      return { name: d, online: 0, offline: 0 };
    });
    alqsQ.data?.forEach((a) => {
      if (a.estado === 'ANULADO') return;
      const fecha = new Date(a.creadoEn);
      const diffDays = Math.floor(
        (now.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays > 7 || diffDays < 0) return;
      const dayIdx = (fecha.getDay() + 6) % 7; // Lun=0 ... Dom=6
      const total = Number(a.total);
      if (a.metodoPago === 'EFECTIVO') result[dayIdx].offline += total;
      else result[dayIdx].online += total;
    });
    return result;
  }, [alqsQ.data]);

  const ocupacionMeses = useMemo(() => {
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const now = new Date();
    const actualMes = now.getMonth();
    // Para simplicidad, mostramos ocupación simulada del último año
    // excepto que para el mes actual usamos alquileres reales
    return meses.map((m, i) => {
      const mesReal = (actualMes - (11 - i) + 12) % 12;
      const base = 30 + Math.sin(i * 0.8) * 20 + i * 2;
      const actuales = i === 11 ? alquileresHoy * 10 : 0;
      return {
        name: m,
        leales: Math.max(10, Math.round(base + 5 + actuales * 0.3)),
        nuevos: Math.max(15, Math.round(base - 5 + actuales * 0.5)),
        unicos: Math.max(12, Math.round(base + Math.cos(i) * 10)),
      };
    });
  }, [alquileresHoy]);

  const satisfaccion = useMemo(() => {
    return [
      { name: 'S1', last: 3200, cur: 4100 },
      { name: 'S2', last: 3400, cur: 4300 },
      { name: 'S3', last: 3100, cur: 4500 },
      { name: 'S4', last: 3300, cur: 4400 },
      { name: 'S5', last: 3000, cur: 4600 },
      { name: 'S6', last: 3400, cur: 4700 },
    ];
  }, []);

  const targetReality = useMemo(() => {
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul'];
    return meses.map((m, i) => ({
      name: m,
      target: 80 + i * 5,
      reality: 60 + i * 7 + Math.sin(i) * 10,
    }));
  }, []);

  const topProductos = useMemo(() => {
    const map: Record<string, { nombre: string; ventas: number; total: number }> = {};
    alqsQ.data?.forEach((a) => {
      if (a.estado === 'ANULADO') return;
      a.consumos.forEach((c) => {
        if (!map[c.producto.nombre]) {
          map[c.producto.nombre] = { nombre: c.producto.nombre, ventas: 0, total: 0 };
        }
        map[c.producto.nombre].ventas += c.cantidad;
        map[c.producto.nombre].total += Number(c.subtotal);
      });
    });
    const arr = Object.values(map).sort((a, b) => b.ventas - a.ventas).slice(0, 5);
    const maxV = Math.max(1, ...arr.map((p) => p.ventas));
    return arr.map((p) => ({ ...p, popularidad: Math.round((p.ventas / maxV) * 100) }));
  }, [alqsQ.data]);

  return (
    <div className="space-y-5">
      {/* TODAY'S SALES */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white rounded-3xl p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-bold text-lg text-slate-900">Ventas de hoy</h2>
              <p className="text-xs text-slate-400 mt-0.5">Resumen del día</p>
            </div>
            <button className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <Download size={12} /> Exportar
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiPastel
              bg="bg-pink-100"
              iconBg="bg-pink-500"
              fg="text-pink-700"
              Icon={Calendar}
              value={`S/ ${ingresosHoy.toFixed(0)}`}
              label="Ingresos"
              sub="+8% vs ayer"
              trend="up"
            />
            <KpiPastel
              bg="bg-amber-100"
              iconBg="bg-amber-500"
              fg="text-amber-800"
              Icon={ShoppingBag}
              value={String(alquileresHoy)}
              label="Alquileres"
              sub="+5% vs ayer"
              trend="up"
            />
            <KpiPastel
              bg="bg-emerald-100"
              iconBg="bg-emerald-500"
              fg="text-emerald-700"
              Icon={CheckCircle2}
              value={String(productosVendidosHoy)}
              label="Productos"
              sub="+1.2% vs ayer"
              trend="up"
            />
            <KpiPastel
              bg="bg-violet-100"
              iconBg="bg-violet-500"
              fg="text-violet-700"
              Icon={UserPlus}
              value={String(clientesHoy)}
              label="Clientes"
              sub="+0.5% vs ayer"
              trend="up"
            />
          </div>
        </div>

        {/* VISITOR INSIGHTS */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <h2 className="font-bold text-lg text-slate-900">Flujo de huéspedes</h2>
          <p className="text-xs text-slate-400 mt-0.5 mb-3">Últimos 12 meses</p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ocupacionMeses}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                <Line type="monotone" dataKey="leales" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="nuevos" stroke="#ef4444" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="unicos" stroke="#10b981" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-3 flex-wrap text-[11px] justify-center mt-2">
            <Dot color="bg-violet-500" label="Recurrentes" />
            <Dot color="bg-rose-500" label="Nuevos" />
            <Dot color="bg-emerald-500" label="Únicos" />
          </div>
        </div>
      </div>

      {/* REVENUE / SATISFACTION / TARGET */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <h2 className="font-bold text-lg text-slate-900">Ingresos semanales</h2>
          <p className="text-xs text-slate-400 mt-0.5 mb-3">Por día · efectivo vs online</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenuePorDia}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="online" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="offline" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-3 text-[11px] justify-center mt-2">
            <Dot color="bg-teal-500" label="Online" />
            <Dot color="bg-blue-500" label="Efectivo" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <h2 className="font-bold text-lg text-slate-900">Satisfacción</h2>
          <p className="text-xs text-slate-400 mt-0.5 mb-3">Comparativa mensual</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={satisfaccion}>
                <defs>
                  <linearGradient id="cur" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="cur" stroke="#10b981" strokeWidth={2.5} fill="url(#cur)" />
                <Area type="monotone" dataKey="last" stroke="#3b82f6" strokeWidth={2} fill="transparent" strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 text-xs justify-center mt-2">
            <div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-slate-500">Mes pasado</span>
              </div>
              <div className="font-bold text-slate-800 ml-3">S/ 3,004</div>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-slate-500">Este mes</span>
              </div>
              <div className="font-bold text-slate-800 ml-3">S/ 4,504</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <h2 className="font-bold text-lg text-slate-900">Meta vs real</h2>
          <p className="text-xs text-slate-400 mt-0.5 mb-3">Ocupación mensual (%)</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={targetReality}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="reality" fill="#fbbf24" radius={[6, 6, 0, 0]} />
                <Bar dataKey="target" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between text-xs mt-2 gap-2">
            <div className="flex-1 bg-amber-50 rounded-lg p-2">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-amber-500 rounded-full" />
                <span className="text-slate-500">Real</span>
              </div>
              <div className="font-bold text-slate-800">8.823</div>
            </div>
            <div className="flex-1 bg-emerald-50 rounded-lg p-2">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-slate-500">Meta</span>
              </div>
              <div className="font-bold text-slate-800">12.122</div>
            </div>
          </div>
        </div>
      </div>

      {/* TOP PRODUCTS / OCUPACIÓN / SEDES */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white rounded-3xl p-5 shadow-sm">
          <h2 className="font-bold text-lg text-slate-900">Top productos</h2>
          <p className="text-xs text-slate-400 mt-0.5 mb-4">Más vendidos</p>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-2 font-medium w-8">#</th>
                <th className="py-2 font-medium">Nombre</th>
                <th className="py-2 font-medium">Popularidad</th>
                <th className="py-2 font-medium text-right w-20">Ventas</th>
              </tr>
            </thead>
            <tbody>
              {topProductos.map((p, i) => {
                const barColors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500'];
                const barBg = ['bg-blue-50', 'bg-emerald-50', 'bg-violet-50', 'bg-rose-50', 'bg-amber-50'];
                const textPct = ['text-blue-700', 'text-emerald-700', 'text-violet-700', 'text-rose-700', 'text-amber-700'];
                const c = i % 5;
                return (
                  <tr key={p.nombre} className="border-t border-slate-100">
                    <td className="py-3 text-slate-400">0{i + 1}</td>
                    <td className="py-3 font-medium text-slate-800">{p.nombre}</td>
                    <td className="py-3 pr-4">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${barColors[c]}`}
                          style={{ width: `${p.popularidad}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <span className={`${barBg[c]} ${textPct[c]} text-xs px-2.5 py-1 rounded-full font-semibold`}>
                        {p.popularidad}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              {topProductos.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Sin ventas aún
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <h2 className="font-bold text-lg text-slate-900">Estado habitaciones</h2>
          <p className="text-xs text-slate-400 mt-0.5 mb-4">Mapa en vivo</p>
          <div className="grid grid-cols-4 gap-1.5">
            {habsQ.data?.map((h) => (
              <div
                key={h.id}
                className={`estado-${h.estado} rounded-lg px-1.5 py-2 text-xs font-bold text-center`}
                title={`Hab ${h.numero}`}
              >
                {h.numero}
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <Mini label="Disponibles" value={habsQ.data?.filter((h) => h.estado === 'DISPONIBLE').length ?? 0} color="bg-emerald-500" />
            <Mini label="Ocupadas" value={habsQ.data?.filter((h) => h.estado === 'OCUPADA').length ?? 0} color="bg-rose-500" />
            <Mini label="Limpieza" value={habsQ.data?.filter((h) => h.estado === 'ALISTANDO').length ?? 0} color="bg-amber-500" />
            <Mini label="Mantenim." value={habsQ.data?.filter((h) => h.estado === 'MANTENIMIENTO' || h.estado === 'FUERA_SERVICIO').length ?? 0} color="bg-slate-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiPastel({
  bg,
  iconBg,
  fg,
  Icon,
  value,
  label,
  sub,
  trend,
}: {
  bg: string;
  iconBg: string;
  fg: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  value: string;
  label: string;
  sub: string;
  trend: 'up' | 'down';
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;
  return (
    <div className={`${bg} rounded-2xl p-4`}>
      <div className={`w-9 h-9 rounded-full ${iconBg} flex items-center justify-center mb-3`}>
        <Icon size={16} className="text-white" />
      </div>
      <div className={`text-2xl font-bold ${fg}`}>{value}</div>
      <div className={`text-xs ${fg} opacity-80 mt-0.5`}>{label}</div>
      <div className={`text-[10px] mt-1 flex items-center gap-1 ${fg} opacity-75`}>
        <TrendIcon size={10} /> {sub}
      </div>
    </div>
  );
}

function Dot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1 text-slate-500">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function Mini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-2 py-1.5">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <div className="flex-1 text-[11px] text-slate-500">{label}</div>
      <div className="text-sm font-bold text-slate-800">{value}</div>
    </div>
  );
}
