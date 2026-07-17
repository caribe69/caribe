import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  UserRound,
  Phone,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  BedDouble,
  Clock,
  LogIn,
  LogOut,
  Wallet,
  Building2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

interface ClienteRow {
  dni: string;
  nombre: string;
  telefono: string | null;
  visitas: number;
  totalGastado: number;
  ultimaVisita: string;
}
interface Estancia {
  id: number;
  fechaIngreso: string;
  fechaSalida: string;
  fechaSalidaReal: string | null;
  creadoEn: string;
  total: number;
  precioHabitacion: number;
  totalProductos: number;
  estado: 'ACTIVO' | 'FINALIZADO' | 'ANULADO';
  pagado: boolean;
  sedeNombre: string;
  habitacionNumero: string;
  pisoNumero: number;
}
interface Detalle {
  encontrado: boolean;
  dni: string;
  resumen: {
    nombre: string;
    telefono: string | null;
    visitas: number;
    totalGastado: number;
    primeraVisita: string;
    ultimaVisita: string;
    activas: number;
  } | null;
  estancias: Estancia[];
}

const money = (n: number) => `S/ ${Number(n || 0).toFixed(2)}`;
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const horaFmt = (s: string) =>
  new Date(s).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
const soloHora = (s: string) =>
  new Date(s).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

export default function Clientes() {
  const [q, setQ] = useState('');
  const [dni, setDni] = useState<string | null>(null);
  const [diaSel, setDiaSel] = useState<string | null>(null);

  const busqueda = useQuery<ClienteRow[]>({
    queryKey: ['clientes', 'buscar', q],
    queryFn: async () =>
      (await api.get('/clientes/buscar', { params: { q } })).data,
    enabled: q.trim().length >= 2,
  });

  const detalle = useQuery<Detalle>({
    queryKey: ['clientes', 'detalle', dni],
    queryFn: async () => (await api.get(`/clientes/${dni}`)).data,
    enabled: !!dni,
  });

  return (
    <div className="space-y-5">
      {/* Buscador */}
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 flex items-center justify-center">
            <UserRound size={18} />
          </div>
          <div>
            <div className="font-hotel text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">
              Historial de clientes
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Busca por DNI o nombre y revisa cuándo ingresó, salió y qué alquiló.
            </div>
          </div>
        </div>
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); }}
            placeholder="DNI o nombre del cliente…"
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30"
          />
        </div>

        {/* Resultados de búsqueda */}
        {q.trim().length >= 2 && (
          <div className="mt-3">
            {busqueda.isLoading && (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            )}
            {!busqueda.isLoading && (busqueda.data?.length ?? 0) === 0 && (
              <div className="text-sm text-slate-400 py-3 text-center">Sin coincidencias.</div>
            )}
            {!busqueda.isLoading && (busqueda.data?.length ?? 0) > 0 && (
              <ul className="grid sm:grid-cols-2 gap-2">
                {busqueda.data!.map((c) => (
                  <li key={c.dni}>
                    <button
                      onClick={() => { setDni(c.dni); setDiaSel(null); }}
                      className={`w-full text-left flex items-center gap-3 p-3 rounded-2xl border transition ${
                        dni === c.dni
                          ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20'
                          : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 flex items-center justify-center font-bold text-sm shrink-0">
                        {c.nombre.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{c.nombre}</div>
                        <div className="text-[11px] text-slate-400">DNI {c.dni} · {c.visitas} visita(s)</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-emerald-700 dark:text-emerald-300 font-bold text-sm tabular-nums">{money(c.totalGastado)}</div>
                        <div className="text-[10px] text-slate-400">total</div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Detalle del cliente */}
      {dni && detalle.isLoading && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center text-slate-400 shadow-sm">
          Cargando historial…
        </div>
      )}

      {dni && detalle.data && !detalle.data.encontrado && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm">
          <EmptyState icon={<UserRound size={28} />} title="Sin estancias" description="Este cliente no tiene alquileres registrados en tu alcance." />
        </div>
      )}

      {dni && detalle.data?.encontrado && detalle.data.resumen && (
        <DetalleCliente
          data={detalle.data}
          diaSel={diaSel}
          onDia={(d) => setDiaSel(d)}
        />
      )}
    </div>
  );
}

function DetalleCliente({
  data,
  diaSel,
  onDia,
}: {
  data: Detalle;
  diaSel: string | null;
  onDia: (d: string | null) => void;
}) {
  const r = data.resumen!;
  const estancias = data.estancias;

  // Mapa de días con actividad (ingresos y salidas) para el calendario.
  const actividad = useMemo(() => {
    const m = new Map<string, { entradas: number; salidas: number; ids: number[] }>();
    for (const e of estancias) {
      const kIn = ymd(new Date(e.fechaIngreso));
      const inn = m.get(kIn) ?? { entradas: 0, salidas: 0, ids: [] };
      inn.entradas += 1;
      inn.ids.push(e.id);
      m.set(kIn, inn);
      const salida = e.fechaSalidaReal || (e.estado === 'FINALIZADO' ? e.fechaSalida : null);
      if (salida) {
        const kOut = ymd(new Date(salida));
        const out = m.get(kOut) ?? { entradas: 0, salidas: 0, ids: [] };
        out.salidas += 1;
        m.set(kOut, out);
      }
    }
    return m;
  }, [estancias]);

  const estanciasFiltradas = useMemo(() => {
    if (!diaSel) return estancias;
    return estancias.filter((e) => ymd(new Date(e.fechaIngreso)) === diaSel);
  }, [estancias, diaSel]);

  return (
    <>
      {/* Cabecera del cliente */}
      <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-3xl p-6 shadow-md text-white">
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold">
            {r.nombre.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-hotel text-2xl font-bold leading-none">{r.nombre}</div>
            <div className="text-white/80 text-sm mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>DNI {data.dni}</span>
              {r.telefono && <span className="flex items-center gap-1"><Phone size={12} /> {r.telefono}</span>}
            </div>
          </div>
          <div className="ml-auto grid grid-cols-3 gap-3 text-center">
            <Stat label="Visitas" value={String(r.visitas)} />
            <Stat label="Total gastado" value={money(r.totalGastado)} />
            <Stat label="Activas" value={String(r.activas)} />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/15 text-[11px] text-white/70 flex flex-wrap gap-x-6 gap-y-1">
          <span>Primera visita: {horaFmt(r.primeraVisita)}</span>
          <span>Última visita: {horaFmt(r.ultimaVisita)}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* Calendario */}
        <div className="lg:col-span-2">
          <Calendario actividad={actividad} diaSel={diaSel} onDia={onDia} />
        </div>

        {/* Lista de estancias */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BedDouble size={18} className="text-violet-500" />
              <h2 className="font-hotel text-lg font-bold text-slate-900 dark:text-slate-100">
                {diaSel ? `Estancias del ${new Date(diaSel + 'T12:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'long' })}` : 'Todas las estancias'}
              </h2>
            </div>
            {diaSel && (
              <button onClick={() => onDia(null)} className="text-xs text-violet-600 dark:text-violet-300 hover:underline">Ver todas</button>
            )}
          </div>

          <ul className="space-y-3">
            {estanciasFiltradas.map((e) => <EstanciaItem key={e.id} e={e} />)}
            {estanciasFiltradas.length === 0 && (
              <li className="text-sm text-slate-400 py-6 text-center">Sin estancias este día.</li>
            )}
          </ul>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2">
      <div className="text-lg font-bold leading-none">{value}</div>
      <div className="text-[9px] uppercase tracking-widest text-white/70 mt-1">{label}</div>
    </div>
  );
}

function EstanciaItem({ e }: { e: Estancia }) {
  const salida = e.fechaSalidaReal || (e.estado === 'FINALIZADO' ? e.fechaSalida : null);
  const estadoStyle =
    e.estado === 'ACTIVO'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
  return (
    <li className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 flex items-center justify-center font-bold text-sm shrink-0">
          {e.habitacionNumero}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            Hab. {e.habitacionNumero}
            <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1"><Building2 size={11} /> {e.sedeNombre} · Piso {e.pisoNumero}</span>
          </div>
          <div className="text-[11px] text-slate-400">Piso {e.pisoNumero}</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${estadoStyle}`}>{e.estado === 'ACTIVO' ? 'En curso' : 'Finalizada'}</span>
          <span className="text-emerald-700 dark:text-emerald-300 font-bold text-sm tabular-nums">{money(e.total)}</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 flex items-center justify-center"><LogIn size={14} /></div>
          <div>
            <div className="text-[9px] uppercase tracking-widest text-slate-400">Ingresó</div>
            <div className="font-semibold">{horaFmt(e.fechaIngreso)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 flex items-center justify-center"><LogOut size={14} /></div>
          <div>
            <div className="text-[9px] uppercase tracking-widest text-slate-400">Salió</div>
            <div className="font-semibold">{salida ? horaFmt(salida) : <span className="text-emerald-600">En curso</span>}</div>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-400">
        <span className="flex items-center gap-1"><Clock size={11} /> Reservado {soloHora(e.creadoEn)}</span>
        <span className="flex items-center gap-1"><Wallet size={11} /> Hab. {money(e.precioHabitacion)}{e.totalProductos > 0 ? ` + prod. ${money(e.totalProductos)}` : ''}</span>
        {!e.pagado && <span className="text-rose-500 font-semibold">Pendiente de pago</span>}
      </div>
    </li>
  );
}

// ── Calendario profesional con puntos de actividad ──
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function Calendario({
  actividad,
  diaSel,
  onDia,
}: {
  actividad: Map<string, { entradas: number; salidas: number; ids: number[] }>;
  diaSel: string | null;
  onDia: (d: string | null) => void;
}) {
  // Arranca en el mes de la actividad más reciente, o el actual.
  const inicial = useMemo(() => {
    const keys = Array.from(actividad.keys()).sort();
    const ref = keys.length ? new Date(keys[keys.length - 1] + 'T12:00') : new Date();
    return { y: ref.getFullYear(), m: ref.getMonth() };
  }, [actividad]);
  const [cur, setCur] = useState(inicial);

  const { celdas, hoyStr } = useMemo(() => {
    const primero = new Date(cur.y, cur.m, 1);
    // getDay(): 0=domingo..6=sábado; queremos lunes primero.
    const offset = (primero.getDay() + 6) % 7;
    const diasMes = new Date(cur.y, cur.m + 1, 0).getDate();
    const arr: Array<{ dia: number; key: string } | null> = [];
    for (let i = 0; i < offset; i++) arr.push(null);
    for (let d = 1; d <= diasMes; d++) {
      arr.push({ dia: d, key: ymd(new Date(cur.y, cur.m, d)) });
    }
    return { celdas: arr, hoyStr: ymd(new Date()) };
  }, [cur]);

  const mover = (delta: number) => {
    const d = new Date(cur.y, cur.m + delta, 1);
    setCur({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-3xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-violet-500" />
          <h2 className="font-hotel text-base font-bold text-slate-900 dark:text-slate-100">
            {MESES[cur.m]} {cur.y}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => mover(-1)} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 flex items-center justify-center"><ChevronLeft size={16} /></button>
          <button onClick={() => mover(1)} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 flex items-center justify-center"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DIAS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {celdas.map((c, i) => {
          if (!c) return <div key={i} />;
          const act = actividad.get(c.key);
          const tiene = !!act;
          const esHoy = c.key === hoyStr;
          const sel = c.key === diaSel;
          return (
            <button
              key={i}
              disabled={!tiene}
              onClick={() => onDia(sel ? null : c.key)}
              className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition
                ${sel ? 'bg-violet-600 text-white shadow-md' : tiene ? 'bg-violet-50 dark:bg-violet-900/20 text-slate-800 dark:text-slate-100 hover:bg-violet-100 dark:hover:bg-violet-900/40 cursor-pointer' : 'text-slate-300 dark:text-slate-600'}
                ${esHoy && !sel ? 'ring-1 ring-violet-300' : ''}`}
            >
              <span className={`${sel ? 'font-bold' : tiene ? 'font-semibold' : ''}`}>{c.dia}</span>
              {tiene && (
                <span className="absolute bottom-1 flex items-center gap-0.5">
                  {act!.entradas > 0 && <span className={`w-1.5 h-1.5 rounded-full ${sel ? 'bg-white' : 'bg-emerald-500'}`} />}
                  {act!.salidas > 0 && <span className={`w-1.5 h-1.5 rounded-full ${sel ? 'bg-white/70' : 'bg-rose-400'}`} />}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Ingreso</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400" /> Salida</span>
      </div>
    </div>
  );
}
