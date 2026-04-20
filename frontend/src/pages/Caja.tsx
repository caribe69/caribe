import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  StopCircle,
  FileText,
  Printer,
  TrendingUp,
  BarChart3,
  History,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useDialog } from '@/components/ConfirmProvider';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';

interface Turno {
  id: number;
  estado: string;
  abiertoEn: string;
  cerradoEn?: string | null;
  totalGeneral: string;
  totalEfectivo: string;
  totalVisa: string;
  totalMaster: string;
  totalYape: string;
  totalPlin: string;
  totalOtro: string;
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

export default function Caja() {
  const qc = useQueryClient();
  const dialog = useDialog();
  const usuario = useAuthStore((s) => s.usuario);
  const [reporte, setReporte] = useState<any | null>(null);

  const esAdmin =
    usuario?.rol === 'SUPERADMIN' || usuario?.rol === 'ADMIN_SEDE';

  const turno = useQuery<Turno | null>({
    queryKey: ['caja', 'mi-turno'],
    queryFn: async () => (await api.get('/caja/mi-turno')).data,
  });

  const stats = useQuery<Stats>({
    queryKey: ['caja', 'estadisticas'],
    queryFn: async () => (await api.get('/caja/estadisticas')).data,
  });

  const turnos = useQuery<Turno[]>({
    queryKey: ['caja', 'turnos'],
    queryFn: async () => (await api.get('/caja/turnos')).data,
  });

  const pag = usePagination(turnos.data, 10);

  const abrir = useMutation({
    mutationFn: async () => (await api.post('/caja/abrir', {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['caja'] }),
  });

  const cerrar = useMutation({
    mutationFn: async (id: number) =>
      (await api.patch(`/caja/${id}/cerrar`, {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['caja'] }),
  });

  const verReporte = async (id: number) => {
    const { data } = await api.get(`/caja/${id}/reporte`);
    setReporte(data);
  };

  return (
    <div className="space-y-5 no-print">
      {/* Estado del turno */}
      <div className="bg-white rounded-3xl p-6 shadow-sm card-lift">
        {turno.data ? (
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Turno abierto
              </div>
              <h2 className="font-hotel text-xl font-bold text-slate-900">
                {turno.data.sede.nombre}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Desde {new Date(turno.data.abiertoEn).toLocaleString('es-PE')}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => verReporte(turno.data!.id)}
                className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium btn-press transition"
              >
                <FileText size={14} /> Previsualizar cierre
              </button>
              <button
                onClick={async () => {
                  const ok = await dialog.confirm({
                    title: 'Cerrar caja',
                    message:
                      'Al cerrar tu turno se registran los totales y no podrás registrar más operaciones hasta abrir nuevamente.',
                    confirmText: 'Cerrar turno',
                    variant: 'warning',
                  });
                  if (ok) cerrar.mutate(turno.data!.id);
                }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-rose-500/30 btn-press transition"
              >
                <StopCircle size={14} /> Cerrar caja
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Sin turno activo
              </div>
              <h2 className="font-hotel text-xl font-bold text-slate-900">
                Abrir caja para comenzar
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Mientras no tengas turno abierto no puedes registrar alquileres
                ni ventas.
              </p>
            </div>
            <button
              onClick={() => abrir.mutate()}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-emerald-500/30 btn-press transition"
            >
              <Play size={14} /> Abrir caja
            </button>
          </div>
        )}
      </div>

      {/* Estadísticas */}
      {stats.data && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} className="text-violet-600" />
            <h2 className="font-hotel text-lg font-bold text-slate-900">
              {stats.data.scope === 'sede'
                ? 'Estadísticas de la sede'
                : 'Mis estadísticas'}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatsCard label="Hoy" bucket={stats.data.hoy} accent="emerald" />
            <StatsCard
              label="Últimos 7 días"
              bucket={stats.data.semana}
              accent="violet"
            />
            <StatsCard
              label="Últimos 30 días"
              bucket={stats.data.mes}
              accent="blue"
            />
          </div>
        </div>
      )}

      {/* Desglose por método */}
      {stats.data && (
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={16} className="text-violet-600" />
            <h3 className="font-semibold text-slate-900">
              Desglose por método · último mes
            </h3>
          </div>
          <MetodoBars porMetodo={stats.data.mes.porMetodo} />
        </div>
      )}

      {/* Historial de cierres */}
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History size={18} className="text-violet-600" />
            <h3 className="font-hotel text-lg font-bold text-slate-900">
              {esAdmin
                ? 'Historial de cierres · toda la sede'
                : 'Mis cierres anteriores'}
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {turnos.data?.length ?? 0} turnos
          </span>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <Th>#</Th>
              {esAdmin && <Th>Cajero</Th>}
              <Th>Abierto</Th>
              <Th>Cerrado</Th>
              <Th>Estado</Th>
              <Th className="text-right">Total</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {pag.paginated.map((t) => (
              <tr
                key={t.id}
                className="border-b border-slate-50 last:border-0 hover:bg-violet-50/30 transition"
              >
                <Td>
                  <span className="font-mono text-xs text-slate-400">
                    #{String(t.id).padStart(3, '0')}
                  </span>
                </Td>
                {esAdmin && (
                  <Td>
                    {t.usuario && (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white font-bold text-[11px] flex items-center justify-center">
                          {t.usuario.nombre?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-800">
                            {t.usuario.nombre}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            @{t.usuario.username}
                          </div>
                        </div>
                      </div>
                    )}
                  </Td>
                )}
                <Td className="text-xs text-slate-600">
                  {new Date(t.abiertoEn).toLocaleString('es-PE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Td>
                <Td className="text-xs text-slate-600">
                  {t.cerradoEn
                    ? new Date(t.cerradoEn).toLocaleString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </Td>
                <Td>
                  <span
                    className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold ${
                      t.estado === 'ABIERTO'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {t.estado}
                  </span>
                </Td>
                <Td className="text-right font-semibold tabular-nums">
                  S/ {Number(t.totalGeneral).toFixed(2)}
                </Td>
                <Td className="text-right">
                  <button
                    onClick={() => verReporte(t.id)}
                    className="inline-flex items-center gap-1 text-xs bg-slate-100 hover:bg-violet-100 hover:text-violet-700 text-slate-700 px-3 py-1.5 rounded-lg btn-press transition"
                  >
                    <FileText size={12} /> Ver
                  </button>
                </Td>
              </tr>
            ))}
            {turnos.data?.length === 0 && (
              <tr>
                <td
                  colSpan={esAdmin ? 7 : 6}
                  className="px-6 py-16 text-center text-slate-400"
                >
                  <History size={40} className="mx-auto text-slate-300 mb-2" />
                  Sin turnos aún
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <Pagination
          page={pag.page}
          totalPages={pag.totalPages}
          totalItems={pag.totalItems}
          from={pag.from}
          to={pag.to}
          size={pag.size}
          setPage={pag.setPage}
          setSize={pag.setSize}
        />
      </div>

      {reporte && (
        <CierrePrintable reporte={reporte} onClose={() => setReporte(null)} />
      )}
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
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 card-lift">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
          {label}
        </div>
        <div
          className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accents[accent]} flex items-center justify-center`}
        >
          <TrendingUp size={14} className="text-white" />
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-900 tabular-nums">
        S/ {bucket.total.toFixed(0)}
      </div>
      <div className="flex gap-3 text-xs text-slate-500 mt-2">
        <span>
          <b className="text-slate-700">{bucket.cantidadTurnos}</b> turnos
        </span>
        <span>·</span>
        <span>
          Prom{' '}
          <b className="text-slate-700 tabular-nums">
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
    <div className="space-y-2.5">
      {data.map(([name, value, color]) => {
        const pct = (value / total) * 100;
        return (
          <div key={name}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600 font-medium">{name}</span>
              <span className="text-slate-500 tabular-nums">
                S/ {value.toFixed(2)}{' '}
                <span className="text-slate-400">({pct.toFixed(0)}%)</span>
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
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

function Th({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-5 py-3 ${className}`}>{children}</td>;
}

function CierrePrintable({
  reporte,
  onClose,
}: {
  reporte: any;
  onClose: () => void;
}) {
  const { turno, desglose, porMetodo, alquileres, ventasDirectas, productosVendidos } =
    reporte;
  const fecha = new Date(turno.abiertoEn);
  const diaSemana = fecha.toLocaleDateString('es-PE', { weekday: 'long' });
  const fechaStr = fecha.toLocaleDateString('es-PE');

  return (
    <>
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print animate-fade-in">
        <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto scroll-premium animate-scale-in shadow-2xl">
          <div className="flex justify-between items-center p-4 border-b border-slate-100 sticky top-0 bg-white z-10">
            <h2 className="font-hotel font-bold text-slate-900">
              Cierre de caja · Turno #{turno.id}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white px-3 py-1.5 rounded-lg text-sm btn-press"
              >
                <Printer size={14} /> Imprimir
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center btn-press"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>
          </div>
          <div className="p-4">
            <Recibo
              turno={turno}
              desglose={desglose}
              porMetodo={porMetodo}
              alquileres={alquileres}
              ventasDirectas={ventasDirectas}
              productosVendidos={productosVendidos}
              diaSemana={diaSemana}
              fechaStr={fechaStr}
            />
          </div>
        </div>
      </div>

      <div className="hidden print-only">
        <Recibo
          turno={turno}
          desglose={desglose}
          porMetodo={porMetodo}
          alquileres={alquileres}
          ventasDirectas={ventasDirectas}
          productosVendidos={productosVendidos}
          diaSemana={diaSemana}
          fechaStr={fechaStr}
        />
      </div>
    </>
  );
}

function Recibo({
  turno,
  desglose,
  porMetodo,
  alquileres,
  ventasDirectas,
  productosVendidos,
  diaSemana,
  fechaStr,
}: any) {
  const metodosNoEfectivo = [
    ['VISA', porMetodo.VISA],
    ['MASTER', porMetodo.MASTERCARD],
    ['YAPE', porMetodo.YAPE],
    ['PLIN', porMetodo.PLIN],
    ['OTRO', porMetodo.OTRO],
  ].filter(([, v]) => Number(v) > 0);

  return (
    <div
      className="font-mono text-sm tabular-nums"
      style={{ maxWidth: '380px', margin: '0 auto' }}
    >
      <div className="text-center border-b-2 border-black pb-2 mb-2">
        <div className="font-bold uppercase">{turno.sede.nombre}</div>
        <div className="text-xs">Cierre de caja</div>
      </div>

      <div className="flex justify-between text-xs mb-2">
        <div>
          <div>DÍA: {diaSemana}</div>
          <div>FECHA: {fechaStr}</div>
        </div>
        <div className="text-right">
          <div>CAJERO: {turno.usuario.nombre}</div>
          <div>TURNO #{turno.id}</div>
        </div>
      </div>

      <div className="border-2 border-black p-2 mb-3">
        <table className="w-full">
          <tbody>
            <tr>
              <td className="font-bold">H (Habitaciones)</td>
              <td className="text-right">{Number(desglose.H).toFixed(2)}</td>
            </tr>
            <tr>
              <td className="font-bold">B (Bebidas/Productos)</td>
              <td className="text-right">{Number(desglose.B).toFixed(2)}</td>
            </tr>
            <tr>
              <td className="font-bold">O (Otros)</td>
              <td className="text-right">{Number(desglose.O).toFixed(2)}</td>
            </tr>
            <tr className="border-t-2 border-black">
              <td className="font-bold">G (Gran total)</td>
              <td className="text-right font-bold">
                {Number(desglose.G).toFixed(2)}
              </td>
            </tr>
            {metodosNoEfectivo.map(([m, v]) => (
              <tr key={m as string}>
                <td className="text-xs">− {m}</td>
                <td className="text-right text-xs">{Number(v).toFixed(2)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-black">
              <td className="font-bold">EFECTIVO</td>
              <td className="text-right font-bold">
                {Number(desglose.totalEfectivo).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="border-2 border-black p-2 mb-3">
        <div className="grid grid-cols-3 gap-2 text-xs text-center">
          <div>
            <div className="font-bold">ALQUILERES</div>
            <div className="text-2xl">{alquileres.cantidad}</div>
          </div>
          <div>
            <div className="font-bold">VENTAS</div>
            <div className="text-2xl">{ventasDirectas.cantidad}</div>
          </div>
          <div>
            <div className="font-bold">PRODS</div>
            <div className="text-2xl">
              {productosVendidos.reduce(
                (s: number, p: any) => s + p.cantidad,
                0,
              )}
            </div>
          </div>
        </div>
      </div>

      {Object.keys(alquileres.porTier).length > 0 && (
        <div className="mb-3 text-xs">
          <div className="font-bold mb-1">ALQUILERES POR PRECIO</div>
          <table className="w-full">
            <tbody>
              {Object.entries(alquileres.porTier).map(([price, count]) => (
                <tr key={price}>
                  <td>S/ {price}</td>
                  <td className="text-right">× {count as number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {productosVendidos.length > 0 && (
        <div className="text-xs">
          <div className="font-bold mb-1 border-t border-black pt-2">
            PRODUCTOS VENDIDOS
          </div>
          <table className="w-full">
            <tbody>
              {productosVendidos.map((p: any, i: number) => (
                <tr key={i}>
                  <td className="truncate">{p.nombre}</td>
                  <td className="text-right">× {p.cantidad}</td>
                  <td className="text-right w-16">{p.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 pt-2 border-t-2 border-black text-xs text-center">
        <div>Generado: {new Date().toLocaleString()}</div>
      </div>
    </div>
  );
}
