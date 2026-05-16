import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Plus,
  X,
  Pencil,
  Trash2,
  Search,
  Sparkles,
  WashingMachine,
  Home,
  ArrowLeftRight,
  CheckSquare,
  Square,
  CircleAlert,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useDialog } from '@/components/ConfirmProvider';
import { useToast } from '@/components/ToastProvider';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

type Estado =
  | 'SIN_ASIGNAR'
  | 'EN_HABITACION'
  | 'EN_TRANSITO'
  | 'EN_LAVANDERIA'
  | 'PERDIDO';

interface TipoImplemento {
  id: number;
  sedeId: number;
  nombre: string;
  icono: string | null;
  color: string | null;
  activo: boolean;
  _count?: { unidades: number };
}

interface Habitacion {
  id: number;
  numero: string;
}

interface ImplementoUnidad {
  id: number;
  tipoId: number;
  codigo: string;
  habitacionId: number | null;
  estado: Estado;
  notas: string | null;
  activo: boolean;
  tipo: { id: number; nombre: string; icono: string | null; color: string | null };
  habitacion: { id: number; numero: string } | null;
}

interface Resumen {
  total: number;
  porEstado: Record<Estado, number>;
}

const ESTADO_LABEL: Record<Estado, string> = {
  SIN_ASIGNAR: 'Sin asignar',
  EN_HABITACION: 'En habitación',
  EN_TRANSITO: 'En tránsito',
  EN_LAVANDERIA: 'En lavandería',
  PERDIDO: 'Perdido',
};

const ESTADO_COLOR: Record<Estado, string> = {
  SIN_ASIGNAR: 'bg-slate-500',
  EN_HABITACION: 'bg-emerald-500',
  EN_TRANSITO: 'bg-amber-500',
  EN_LAVANDERIA: 'bg-blue-500',
  PERDIDO: 'bg-rose-500',
};

const ESTADO_EMOJI: Record<Estado, string> = {
  SIN_ASIGNAR: '📦',
  EN_HABITACION: '🏠',
  EN_TRANSITO: '🚚',
  EN_LAVANDERIA: '🧼',
  PERDIDO: '❓',
};

export default function ImplementosPage() {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const { confirm } = useDialog();
  const usuario = useAuthStore((s) => s.usuario);
  const puedeEditar =
    usuario?.rol === 'SUPERADMIN' || usuario?.rol === 'ADMIN_SEDE';

  const [tab, setTab] = useState<
    'unidades' | 'tipos' | 'lavanderia' | 'almacen'
  >('unidades');
  const [busqueda, setBusqueda] = useState('');
  const [showCrearTipo, setShowCrearTipo] = useState(false);
  const [showCrearUnidad, setShowCrearUnidad] = useState(false);
  const [asignarUnidad, setAsignarUnidad] = useState<ImplementoUnidad | null>(
    null,
  );

  const tiposQ = useQuery<TipoImplemento[]>({
    queryKey: ['implementos', 'tipos'],
    queryFn: async () => (await api.get('/implementos/tipos')).data,
  });

  const unidadesQ = useQuery<ImplementoUnidad[]>({
    queryKey: ['implementos', 'unidades'],
    queryFn: async () => (await api.get('/implementos')).data,
  });

  const habitacionesQ = useQuery<Habitacion[]>({
    queryKey: ['habitaciones'],
    queryFn: async () => (await api.get('/habitaciones')).data,
  });

  const resumenQ = useQuery<Resumen>({
    queryKey: ['implementos', 'resumen'],
    queryFn: async () => (await api.get('/implementos/resumen')).data,
  });

  // ─── Tab UNIDADES (lista completa con filtro) ───
  const unidadesFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = unidadesQ.data || [];
    if (!q) return lista;
    return lista.filter(
      (u) =>
        u.codigo.toLowerCase().includes(q) ||
        u.tipo.nombre.toLowerCase().includes(q) ||
        (u.habitacion?.numero?.toLowerCase().includes(q) ?? false),
    );
  }, [busqueda, unidadesQ.data]);

  // ─── Tab LAVANDERÍA (solo EN_LAVANDERIA + selección bulk) ───
  const enLavanderia = useMemo(
    () => (unidadesQ.data || []).filter((u) => u.estado === 'EN_LAVANDERIA'),
    [unidadesQ.data],
  );
  // ─── Tab ALMACÉN (SIN_ASIGNAR) ───
  const sinAsignar = useMemo(
    () => (unidadesQ.data || []).filter((u) => u.estado === 'SIN_ASIGNAR'),
    [unidadesQ.data],
  );
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());

  const retornar = useMutation({
    mutationFn: async (ids: number[]) =>
      (await api.post('/implementos/retornar-lavanderia', { unidadIds: ids }))
        .data,
    onSuccess: (data: any) => {
      toast({
        type: 'success',
        title: `${data.actualizados} unidad(es) volvieron a sus habitaciones`,
      });
      setSeleccion(new Set());
      qc.invalidateQueries({ queryKey: ['implementos'] });
    },
    onError: (err: any) =>
      toast({
        type: 'error',
        title: 'Error',
        description: err.response?.data?.message || err.message,
      }),
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center">
            <Package size={20} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">
              Almacén
            </div>
            <h1 className="font-hotel text-xl font-bold text-slate-900 dark:text-slate-100">
              Implementos
            </h1>
          </div>
        </div>
      </div>

      {/* Dashboard: control total con conteos por estado */}
      {resumenQ.data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {(
            [
              ['SIN_ASIGNAR', 'slate'],
              ['EN_HABITACION', 'emerald'],
              ['EN_TRANSITO', 'amber'],
              ['EN_LAVANDERIA', 'blue'],
              ['PERDIDO', 'rose'],
            ] as Array<[Estado, string]>
          ).map(([estado, color]) => {
            const n = resumenQ.data!.porEstado[estado] || 0;
            const tabDestino: typeof tab | null =
              estado === 'SIN_ASIGNAR'
                ? 'almacen'
                : estado === 'EN_LAVANDERIA'
                  ? 'lavanderia'
                  : estado === 'EN_HABITACION'
                    ? 'unidades'
                    : null;
            return (
              <button
                key={estado}
                onClick={() => tabDestino && setTab(tabDestino)}
                className={`bg-white dark:bg-slate-900 rounded-xl p-3 text-left shadow-sm border border-slate-200 dark:border-slate-700 transition ${
                  tabDestino ? 'hover:shadow-md hover:-translate-y-0.5' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{ESTADO_EMOJI[estado]}</span>
                  <div className="flex-1">
                    <div className={`text-2xl font-bold tabular-nums text-${color}-700 dark:text-${color}-300`}>
                      {n}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">
                      {ESTADO_LABEL[estado]}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl p-1 w-fit flex-wrap">
        {(['unidades', 'almacen', 'tipos', 'lavanderia'] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setBusqueda('');
              setSeleccion(new Set());
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              tab === t
                ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-slate-100'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {t === 'unidades' && '🏠 En habitaciones'}
            {t === 'almacen' && (
              <>
                📦 Almacén
                {sinAsignar.length > 0 && (
                  <span className="text-[10px] bg-slate-500 text-white rounded-full px-1.5 ml-1">
                    {sinAsignar.length}
                  </span>
                )}
              </>
            )}
            {t === 'tipos' && '📋 Tipos'}
            {t === 'lavanderia' && (
              <>
                🧼 Lavandería
                {enLavanderia.length > 0 && (
                  <span className="text-[10px] bg-blue-500 text-white rounded-full px-1.5 ml-1">
                    {enLavanderia.length}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════ TAB: UNIDADES (por habitación) ═══════════ */}
      {tab === 'unidades' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por código, tipo o habitación…"
                className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
              />
            </div>
            {puedeEditar && (
              <button
                onClick={() => setShowCrearUnidad(true)}
                className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold px-3 py-2 rounded-lg"
              >
                <Plus size={14} /> Nueva unidad
              </button>
            )}
          </div>

          {unidadesQ.isLoading ? (
            <Skeleton className="h-40" />
          ) : unidadesFiltradas.length === 0 ? (
            <EmptyState
              title="No hay unidades registradas"
              description="Crea un tipo de implemento primero (Toalla, Sábana, etc.) y después agrega unidades individuales con código único por habitación."
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Hab.</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    {puedeEditar && <th className="px-4 py-3 text-right">Acc.</th>}
                  </tr>
                </thead>
                <tbody>
                  {unidadesFiltradas.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-100">
                        {u.codigo}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5">
                          {u.tipo.icono && <span>{u.tipo.icono}</span>}
                          {u.tipo.nombre}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-violet-700 dark:text-violet-300">
                        {u.habitacion?.numero ?? (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-white px-2 py-0.5 rounded ${ESTADO_COLOR[u.estado]}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                          {ESTADO_LABEL[u.estado]}
                        </span>
                      </td>
                      {puedeEditar && (
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={async () => {
                              if (
                                await confirm({
                                  title: `Eliminar unidad ${u.codigo}`,
                                  message:
                                    'Esta acción la desactiva (no la borra). Histórico se preserva.',
                                  variant: 'danger',
                                  confirmText: 'Eliminar',
                                })
                              ) {
                                api
                                  .delete(`/implementos/${u.id}`)
                                  .then(() => {
                                    toast({
                                      type: 'success',
                                      title: 'Eliminada',
                                    });
                                    qc.invalidateQueries({
                                      queryKey: ['implementos'],
                                    });
                                  })
                                  .catch((e) =>
                                    toast({
                                      type: 'error',
                                      title: e.response?.data?.message || e.message,
                                    }),
                                  );
                              }
                            }}
                            className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ TAB: TIPOS ═══════════ */}
      {/* ═══════════ TAB: ALMACÉN (SIN_ASIGNAR) ═══════════ */}
      {tab === 'almacen' && (
        <div className="space-y-3">
          <div className="bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
            <Package size={16} className="shrink-0 mt-0.5" />
            <div>
              Unidades en el <b>almacén central</b> sin asignar a ninguna
              habitación. Acá aparecen las que recién creaste o las que
              desasignaste. Tocá <b>"Asignar"</b> para mandarlas a una
              habitación específica.
            </div>
          </div>
          {puedeEditar && (
            <button
              onClick={() => setShowCrearUnidad(true)}
              className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold px-3 py-2 rounded-lg"
            >
              <Plus size={14} /> Nueva unidad
            </button>
          )}
          {sinAsignar.length === 0 ? (
            <EmptyState
              title="Almacén vacío"
              description="No hay unidades sin asignar. Cuando creas una nueva unidad sin elegir habitación, aparece acá."
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Notas</th>
                    {puedeEditar && <th className="px-4 py-3 text-right">Acc.</th>}
                  </tr>
                </thead>
                <tbody>
                  {sinAsignar.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-100">
                        {u.codigo}
                      </td>
                      <td className="px-4 py-2.5">
                        {u.tipo.icono && (
                          <span className="mr-1">{u.tipo.icono}</span>
                        )}
                        {u.tipo.nombre}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">
                        {u.notas ?? '—'}
                      </td>
                      {puedeEditar && (
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => setAsignarUnidad(u)}
                            className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded"
                          >
                            <ArrowLeftRight size={12} /> Asignar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'tipos' && (
        <div className="space-y-3">
          {puedeEditar && (
            <button
              onClick={() => setShowCrearTipo(true)}
              className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold px-3 py-2 rounded-lg"
            >
              <Plus size={14} /> Nuevo tipo
            </button>
          )}
          {tiposQ.isLoading ? (
            <Skeleton className="h-40" />
          ) : (tiposQ.data?.length || 0) === 0 ? (
            <EmptyState
              title="Sin tipos de implemento"
              description="Crea los tipos genéricos primero (Toalla blanca, Sábana queen, Control TV…). Después en la pestaña 'Por habitación' agregás cuántas unidades de cada tipo tiene cada habitación."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tiposQ.data?.map((t) => (
                <div
                  key={t.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 flex items-center gap-3"
                  style={
                    t.color
                      ? { borderLeft: `4px solid #${t.color}` }
                      : undefined
                  }
                >
                  <div className="text-2xl">{t.icono || '📦'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {t.nombre}
                    </div>
                    <div className="text-xs text-slate-500">
                      {t._count?.unidades ?? 0} unidad(es) activas
                    </div>
                  </div>
                  {puedeEditar && (
                    <button
                      onClick={async () => {
                        if (
                          await confirm({
                            title: `Eliminar tipo ${t.nombre}`,
                            message:
                              'Solo se puede si no quedan unidades activas de este tipo.',
                            variant: 'danger',
                            confirmText: 'Eliminar',
                          })
                        ) {
                          api
                            .delete(`/implementos/tipos/${t.id}`)
                            .then(() => {
                              toast({ type: 'success', title: 'Eliminado' });
                              qc.invalidateQueries({ queryKey: ['implementos'] });
                            })
                            .catch((e) =>
                              toast({
                                type: 'error',
                                title: e.response?.data?.message || e.message,
                              }),
                            );
                        }
                      }}
                      className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ TAB: LAVANDERÍA ═══════════ */}
      {tab === 'lavanderia' && (
        <div className="space-y-3">
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 rounded-xl p-3 text-xs text-blue-800 dark:text-blue-200">
            <div className="flex items-start gap-2">
              <WashingMachine size={16} className="shrink-0 mt-0.5" />
              <div>
                Lista de todos los implementos que las limpiadoras marcaron como
                llevados a lavandería. Cuando recibís el bulto limpio, seleccionalos
                y presioná <b>"Marcar como devueltos"</b> — vuelven a sus
                habitaciones automáticamente.
              </div>
            </div>
          </div>

          {enLavanderia.length === 0 ? (
            <EmptyState
              title="Sin implementos en lavandería"
              description="Las limpiadoras marcan los implementos sucios al completar la tarea de limpieza de cada habitación. Aparecen acá automáticamente."
            />
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    if (seleccion.size === enLavanderia.length) {
                      setSeleccion(new Set());
                    } else {
                      setSeleccion(new Set(enLavanderia.map((u) => u.id)));
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 px-2 py-1 rounded"
                >
                  {seleccion.size === enLavanderia.length ? (
                    <>
                      <CheckSquare size={14} /> Quitar selección
                    </>
                  ) : (
                    <>
                      <Square size={14} /> Seleccionar todo ({enLavanderia.length})
                    </>
                  )}
                </button>
                <div className="text-xs text-slate-500">
                  {seleccion.size} seleccionada(s)
                </div>
                <div className="flex-1" />
                {puedeEditar && seleccion.size > 0 && (
                  <button
                    onClick={() => retornar.mutate(Array.from(seleccion))}
                    disabled={retornar.isPending}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-50"
                  >
                    <Home size={14} />
                    {retornar.isPending
                      ? 'Devolviendo…'
                      : `Marcar ${seleccion.size} como devuelta(s)`}
                  </button>
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-700">
                      <th className="px-3 py-3 w-8" />
                      <th className="px-4 py-3">Código</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Vuelve a Hab.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enLavanderia.map((u) => {
                      const sel = seleccion.has(u.id);
                      return (
                        <tr
                          key={u.id}
                          onClick={() => {
                            const next = new Set(seleccion);
                            if (sel) next.delete(u.id);
                            else next.add(u.id);
                            setSeleccion(next);
                          }}
                          className={`border-b border-slate-100 dark:border-slate-800/60 cursor-pointer ${
                            sel
                              ? 'bg-violet-50 dark:bg-violet-900/30'
                              : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                          }`}
                        >
                          <td className="px-3 py-2.5">
                            {sel ? (
                              <CheckSquare
                                size={16}
                                className="text-violet-600"
                              />
                            ) : (
                              <Square size={16} className="text-slate-400" />
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-100">
                            {u.codigo}
                          </td>
                          <td className="px-4 py-2.5">
                            {u.tipo.icono && (
                              <span className="mr-1">{u.tipo.icono}</span>
                            )}
                            {u.tipo.nombre}
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-violet-700 dark:text-violet-300">
                            {u.habitacion?.numero ?? '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════ Modales ═══════════ */}
      {showCrearTipo && (
        <CrearTipoModal
          onClose={() => setShowCrearTipo(false)}
          onCreado={() => {
            setShowCrearTipo(false);
            qc.invalidateQueries({ queryKey: ['implementos'] });
          }}
        />
      )}
      {showCrearUnidad && (
        <CrearUnidadModal
          tipos={tiposQ.data || []}
          habitaciones={habitacionesQ.data || []}
          onClose={() => setShowCrearUnidad(false)}
          onCreado={() => {
            setShowCrearUnidad(false);
            qc.invalidateQueries({ queryKey: ['implementos'] });
          }}
        />
      )}
      {asignarUnidad && (
        <AsignarHabitacionModal
          unidad={asignarUnidad}
          habitaciones={habitacionesQ.data || []}
          onClose={() => setAsignarUnidad(null)}
          onAsignado={() => {
            setAsignarUnidad(null);
            qc.invalidateQueries({ queryKey: ['implementos'] });
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Modal asignar a habitación
// ────────────────────────────────────────────────────────────
function AsignarHabitacionModal({
  unidad,
  habitaciones,
  onClose,
  onAsignado,
}: {
  unidad: ImplementoUnidad;
  habitaciones: Habitacion[];
  onClose: () => void;
  onAsignado: () => void;
}) {
  const { show: toast } = useToast();
  const [habitacionId, setHabitacionId] = useState<number | ''>(
    unidad.habitacionId ?? '',
  );
  const [error, setError] = useState<string | null>(null);

  const asignar = useMutation({
    mutationFn: async () =>
      (
        await api.patch(`/implementos/${unidad.id}/asignar-habitacion`, {
          habitacionId: habitacionId === '' ? null : Number(habitacionId),
        })
      ).data,
    onSuccess: () => {
      toast({
        type: 'success',
        title: habitacionId
          ? `Asignado a Hab. ${habitaciones.find((h) => h.id === habitacionId)?.numero}`
          : 'Vuelto al almacén',
      });
      onAsignado();
    },
    onError: (err: any) =>
      setError(err.response?.data?.message || err.message),
  });

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-semibold">Asignar a habitación</h3>
            <div className="text-xs text-slate-500">
              {unidad.tipo.icono} {unidad.tipo.nombre} · <b className="font-mono">{unidad.codigo}</b>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Habitación destino
            </label>
            <select
              value={habitacionId}
              onChange={(e) => {
                const v = e.target.value;
                setHabitacionId(v === '' ? '' : Number(v));
              }}
              className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">📦 Almacén (sin asignar)</option>
              {habitaciones.map((h) => (
                <option key={h.id} value={h.id}>
                  🏠 Hab. {h.numero}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <div className="text-xs text-rose-700 bg-rose-50 p-2 rounded">
              {error}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 py-2 rounded-lg text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={() => asignar.mutate()}
              disabled={asignar.isPending}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {asignar.isPending ? 'Asignando…' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Modal crear tipo
// ────────────────────────────────────────────────────────────
function CrearTipoModal({
  onClose,
  onCreado,
}: {
  onClose: () => void;
  onCreado: () => void;
}) {
  const { show: toast } = useToast();
  const [nombre, setNombre] = useState('');
  const [icono, setIcono] = useState('🧖');
  const [color, setColor] = useState('8b5cf6');
  const [error, setError] = useState<string | null>(null);

  const crear = useMutation({
    mutationFn: async () =>
      (
        await api.post('/implementos/tipos', {
          nombre: nombre.trim(),
          icono: icono.trim() || null,
          color: color.trim() || null,
        })
      ).data,
    onSuccess: () => {
      toast({ type: 'success', title: 'Tipo creado' });
      onCreado();
    },
    onError: (err: any) =>
      setError(err.response?.data?.message || err.message),
  });

  const iconosComunes = ['🧖', '🛏️', '📺', '🛁', '🧹', '🪥', '💡', '🧴'];

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold">Nuevo tipo de implemento</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Nombre
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Toalla blanca grande"
              className="w-full mt-1 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Icono
            </label>
            <div className="flex gap-1 mt-1 flex-wrap">
              {iconosComunes.map((i) => (
                <button
                  key={i}
                  onClick={() => setIcono(i)}
                  className={`text-2xl w-10 h-10 rounded-lg ${
                    icono === i
                      ? 'bg-violet-100 ring-2 ring-violet-500'
                      : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  {i}
                </button>
              ))}
              <input
                value={icono}
                onChange={(e) => setIcono(e.target.value)}
                maxLength={4}
                className="w-12 h-10 text-center text-xl border border-slate-200 rounded-lg"
                placeholder="?"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Color (hex sin #)
            </label>
            <div className="flex items-center gap-2 mt-1">
              <input
                value={color}
                onChange={(e) =>
                  setColor(e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6))
                }
                placeholder="8b5cf6"
                className="flex-1 font-mono border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
              <div
                className="w-10 h-10 rounded-lg border border-slate-200"
                style={{ backgroundColor: `#${color}` }}
              />
            </div>
          </div>
          {error && (
            <div className="text-xs text-rose-700 bg-rose-50 p-2 rounded">
              {error}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 py-2 rounded-lg text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={() => crear.mutate()}
              disabled={crear.isPending || !nombre.trim()}
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {crear.isPending ? 'Creando…' : 'Crear tipo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Modal crear unidad
// ────────────────────────────────────────────────────────────
function CrearUnidadModal({
  tipos,
  habitaciones,
  onClose,
  onCreado,
}: {
  tipos: TipoImplemento[];
  habitaciones: Habitacion[];
  onClose: () => void;
  onCreado: () => void;
}) {
  const { show: toast } = useToast();
  const [tipoId, setTipoId] = useState<number | ''>(tipos[0]?.id || '');
  const [habitacionId, setHabitacionId] = useState<number | ''>('');
  const [codigo, setCodigo] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [error, setError] = useState<string | null>(null);

  const tipoSeleccionado = tipos.find((t) => t.id === tipoId);

  const crear = useMutation({
    mutationFn: async () => {
      const n = Number(cantidad) || 1;
      const promises: Promise<any>[] = [];
      // Si cantidad > 1, generamos códigos secuenciales agregando sufijo numérico
      for (let i = 0; i < n; i++) {
        const code =
          n === 1
            ? codigo.trim().toUpperCase()
            : `${codigo.trim().toUpperCase()}-${String(i + 1).padStart(2, '0')}`;
        const payload: any = {
          tipoId: Number(tipoId),
          codigo: code,
        };
        // habitacionId es opcional: si no se elige, la unidad queda
        // SIN_ASIGNAR en el almacén central.
        if (habitacionId) payload.habitacionId = Number(habitacionId);
        promises.push(api.post('/implementos', payload));
      }
      return Promise.all(promises);
    },
    onSuccess: (results: any[]) => {
      toast({
        type: 'success',
        title: `${results.length} unidad(es) creada(s)`,
      });
      onCreado();
    },
    onError: (err: any) =>
      setError(err.response?.data?.message || err.message),
  });

  const n = Number(cantidad) || 1;
  const previewCodigos =
    n === 1
      ? [codigo.trim().toUpperCase() || 'CÓDIGO']
      : Array.from({ length: Math.min(n, 4) }, (_, i) =>
          `${codigo.trim().toUpperCase() || 'CÓDIGO'}-${String(i + 1).padStart(2, '0')}`,
        );

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold">Nueva unidad</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Tipo
            </label>
            <select
              value={tipoId}
              onChange={(e) => setTipoId(Number(e.target.value))}
              className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">— Elegir tipo —</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icono} {t.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Habitación (opcional)
            </label>
            <select
              value={habitacionId}
              onChange={(e) => {
                const v = e.target.value;
                setHabitacionId(v === '' ? '' : Number(v));
              }}
              className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">📦 Dejar en almacén (sin asignar)</option>
              {habitaciones.map((h) => (
                <option key={h.id} value={h.id}>
                  🏠 Hab. {h.numero}
                </option>
              ))}
            </select>
            <div className="text-[10px] text-slate-500 mt-1">
              Si la dejás en almacén, después la podés asignar desde la
              pestaña "Almacén".
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Código base
              </label>
              <input
                value={codigo}
                onChange={(e) =>
                  setCodigo(e.target.value.toUpperCase().replace(/\s/g, '-'))
                }
                placeholder="TBG"
                className="w-full mt-1 font-mono font-bold border border-slate-200 rounded-lg px-3 py-2 text-sm uppercase"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Cantidad
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          {codigo.trim() && (
            <div className="bg-violet-50 dark:bg-violet-900/30 border border-violet-200 rounded-lg p-2 text-[11px] text-violet-800 dark:text-violet-200">
              Se crearán:{' '}
              <span className="font-mono font-bold">
                {previewCodigos.join(', ')}
                {n > 4 && ` … +${n - 4} más`}
              </span>
            </div>
          )}
          {error && (
            <div className="text-xs text-rose-700 bg-rose-50 p-2 rounded">
              {error}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 py-2 rounded-lg text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={() => crear.mutate()}
              disabled={
                crear.isPending || !tipoId || !codigo.trim()
              }
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {crear.isPending ? 'Creando…' : `Crear ${n > 1 ? n : 1} unidad(es)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
