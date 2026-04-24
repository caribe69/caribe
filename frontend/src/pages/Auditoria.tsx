import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Shield,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  Globe,
  User as UserIcon,
  LogIn,
  LogOut,
  Ban,
} from 'lucide-react';
import { api } from '@/lib/api';
import Pagination from '@/components/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

interface AuditLog {
  id: string;
  usuarioId: number | null;
  username: string | null;
  rol: string | null;
  sedeId: number | null;
  accion: string;
  recurso: string | null;
  recursoId: string | null;
  metodo: string | null;
  path: string | null;
  ip: string | null;
  userAgent: string | null;
  detalle: any;
  ok: boolean;
  statusCode: number | null;
  duracionMs: number | null;
  creadoEn: string;
}

interface ListResp {
  items: AuditLog[];
  total: number;
  page: number;
  size: number;
}

interface Facets {
  acciones: string[];
  recursos: string[];
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function Auditoria() {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(30);
  const [desde, setDesde] = useState(daysAgo(7));
  const [hasta, setHasta] = useState(today());
  const [accion, setAccion] = useState<string>('');
  const [recurso, setRecurso] = useState<string>('');
  const [okFilter, setOkFilter] = useState<'' | 'true' | 'false'>('');
  const [q, setQ] = useState('');

  const facetsQ = useQuery<Facets>({
    queryKey: ['audit', 'facets'],
    queryFn: async () => (await api.get('/audit/facets')).data,
  });

  const params = useMemo(
    () => ({
      desde: desde ? `${desde}T00:00:00` : undefined,
      hasta: hasta ? `${hasta}T23:59:59` : undefined,
      accion: accion || undefined,
      recurso: recurso || undefined,
      ok: okFilter || undefined,
      q: q.trim() || undefined,
      page,
      size,
    }),
    [desde, hasta, accion, recurso, okFilter, q, page, size],
  );

  const { data, isLoading, refetch, isFetching } = useQuery<ListResp>({
    queryKey: ['audit', 'list', params],
    queryFn: async () => (await api.get('/audit', { params })).data,
  });

  const items = data?.items || [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-3xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-violet-600 dark:text-violet-400" />
          <h2 className="font-hotel text-base font-bold text-slate-900 dark:text-slate-100">
            Registro de auditoría
          </h2>
          <button
            onClick={() => refetch()}
            className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1.5 rounded-lg transition"
          >
            <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
            {isFetching ? 'Actualizando' : 'Actualizar'}
          </button>
        </div>

        <div className="grid md:grid-cols-6 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Desde
            </label>
            <input
              type="date"
              value={desde}
              onChange={(e) => {
                setPage(1);
                setDesde(e.target.value);
              }}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Hasta
            </label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => {
                setPage(1);
                setHasta(e.target.value);
              }}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Acción
            </label>
            <select
              value={accion}
              onChange={(e) => {
                setPage(1);
                setAccion(e.target.value);
              }}
              className={inputCls}
            >
              <option value="">Todas</option>
              {facetsQ.data?.acciones.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Recurso
            </label>
            <select
              value={recurso}
              onChange={(e) => {
                setPage(1);
                setRecurso(e.target.value);
              }}
              className={inputCls}
            >
              <option value="">Todos</option>
              {facetsQ.data?.recursos.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Resultado
            </label>
            <select
              value={okFilter}
              onChange={(e) => {
                setPage(1);
                setOkFilter(e.target.value as '' | 'true' | 'false');
              }}
              className={inputCls}
            >
              <option value="">Todos</option>
              <option value="true">Exitosos</option>
              <option value="false">Errores</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Búsqueda
            </label>
            <div className="relative">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={q}
                onChange={(e) => {
                  setPage(1);
                  setQ(e.target.value);
                }}
                placeholder="Usuario, IP, path…"
                className={`${inputCls} pl-7`}
              />
              {q && (
                <button
                  onClick={() => setQ('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>Fecha / Hora</Th>
                <Th>Usuario</Th>
                <Th>Acción</Th>
                <Th>Recurso</Th>
                <Th>IP</Th>
                <Th>Path</Th>
                <Th align="right">Detalle</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-50 dark:border-slate-800/60"
                  >
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-0">
                    <EmptyState
                      icon={<Shield size={28} />}
                      title="Sin registros"
                      description="Ajusta los filtros o amplía el rango de fechas."
                    />
                  </td>
                </tr>
              )}

              {!isLoading && items.map((r) => <Fila key={r.id} r={r} />)}
            </tbody>
          </table>
        </div>

        {items.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={data?.total || 0}
            from={(page - 1) * size + 1}
            to={Math.min((page - 1) * size + items.length, data?.total || 0)}
            size={size}
            setPage={setPage}
            setSize={(s) => {
              setSize(s);
              setPage(1);
            }}
          />
        )}
      </div>
    </div>
  );
}

function Fila({ r }: { r: AuditLog }) {
  const [open, setOpen] = useState(false);
  const fecha = new Date(r.creadoEn);
  const tieneDetalle = r.detalle && Object.keys(r.detalle).length > 0;

  return (
    <>
      <tr
        className={`border-b border-slate-50 dark:border-slate-800/60 last:border-0 hover:bg-violet-50/30 dark:hover:bg-violet-900/20 transition ${
          !r.ok ? 'bg-rose-50/30 dark:bg-rose-900/10' : ''
        }`}
      >
        <td className="px-4 py-3 whitespace-nowrap tabular-nums text-slate-600 dark:text-slate-300 text-[12px]">
          <div className="font-semibold text-slate-800 dark:text-slate-100">
            {fecha.toLocaleDateString('es-PE', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
            })}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500">
            {fecha.toLocaleTimeString('es-PE', { hour12: false })}
          </div>
        </td>
        <td className="px-4 py-3">
          {r.username ? (
            <div className="inline-flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {r.username[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {r.username}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {r.rol || '—'}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          <AccionBadge accion={r.accion} ok={r.ok} />
        </td>
        <td className="px-4 py-3">
          {r.recurso ? (
            <div>
              <div className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                {r.recurso}
              </div>
              {r.recursoId && (
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  #{r.recursoId}
                </div>
              )}
            </div>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-[12px] text-slate-600 dark:text-slate-300 font-mono">
          {r.ip || '—'}
        </td>
        <td className="px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono max-w-[240px] truncate" title={r.path || ''}>
          <span className="text-[10px] text-violet-600 dark:text-violet-400 font-bold mr-1">
            {r.metodo}
          </span>
          {r.path || '—'}
        </td>
        <td className="px-4 py-3 text-right">
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded-lg transition"
          >
            {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Ver
          </button>
        </td>
      </tr>
      {open && (
        <tr className="bg-slate-50/60 dark:bg-slate-800/40">
          <td colSpan={7} className="px-4 py-3">
            <div className="grid md:grid-cols-3 gap-4 text-[12px]">
              <KV
                icon={<UserIcon size={12} />}
                k="Usuario"
                v={r.username ? `${r.username} (id ${r.usuarioId || '—'})` : '—'}
              />
              <KV
                icon={<Globe size={12} />}
                k="IP / User-Agent"
                v={
                  <div>
                    <div>{r.ip || '—'}</div>
                    <div className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5 truncate">
                      {r.userAgent || '—'}
                    </div>
                  </div>
                }
              />
              <KV
                k="Estado"
                v={
                  <span
                    className={
                      r.ok
                        ? 'text-emerald-700 dark:text-emerald-300 font-semibold'
                        : 'text-rose-700 dark:text-rose-300 font-semibold'
                    }
                  >
                    {r.ok ? 'Exitoso' : 'Error'} · HTTP {r.statusCode || '?'} ·{' '}
                    {r.duracionMs != null ? `${r.duracionMs}ms` : '—'}
                  </span>
                }
              />
            </div>
            {tieneDetalle && (
              <div className="mt-3">
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
                  Detalle
                </div>
                <pre className="text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 overflow-x-auto max-h-60 overflow-y-auto text-slate-700 dark:text-slate-200">
                  {JSON.stringify(r.detalle, null, 2)}
                </pre>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function AccionBadge({ accion, ok }: { accion: string; ok: boolean }) {
  const cfg = accionStyle(accion, ok);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${cfg.cls}`}
    >
      {cfg.icon}
      {accion}
    </span>
  );
}

function accionStyle(accion: string, ok: boolean): { cls: string; icon: React.ReactNode } {
  if (!ok) {
    return {
      cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
      icon: <Ban size={10} />,
    };
  }
  switch (accion) {
    case 'LOGIN':
      return {
        cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        icon: <LogIn size={10} />,
      };
    case 'LOGIN_FAIL':
      return {
        cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
        icon: <Ban size={10} />,
      };
    case 'LOGOUT':
      return {
        cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        icon: <LogOut size={10} />,
      };
    case 'CREATE':
      return {
        cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
        icon: <span className="text-[10px]">+</span>,
      };
    case 'UPDATE':
      return {
        cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        icon: <span className="text-[10px]">✎</span>,
      };
    case 'DELETE':
      return {
        cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
        icon: <span className="text-[10px]">×</span>,
      };
    default:
      return {
        cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        icon: null,
      };
  }
}

function KV({
  icon,
  k,
  v,
}: {
  icon?: React.ReactNode;
  k: string;
  v: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5">
        {icon} {k}
      </div>
      <div className="text-slate-700 dark:text-slate-200">{v}</div>
    </div>
  );
}

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <th
      className={`px-4 py-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-${align}`}
    >
      {children}
    </th>
  );
}

const inputCls =
  'w-full bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-[12px] focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30 transition';
