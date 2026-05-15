import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Plus,
  X,
  Pencil,
  Trash2,
  Search,
  Minus,
  Check,
  Sparkles,
  ArrowDownToLine,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useDialog } from '@/components/ConfirmProvider';
import { useToast } from '@/components/ToastProvider';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

interface Implemento {
  id: number;
  nombre: string;
  descripcion?: string | null;
  stockTotal: number;
  stockDisponible: number;
  activo: boolean;
}

interface Asignacion {
  id: number;
  cantidad: number;
  fechaAsignacion: string;
  fechaDevolucion: string | null;
  implemento: { id: number; nombre: string };
  alquiler: {
    id: number;
    clienteNombre: string;
    estado: string;
    habitacion: { numero: string };
  };
}

export default function ImplementosPage() {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const { confirm } = useDialog();
  const usuario = useAuthStore((s) => s.usuario);
  const puedeEditar =
    usuario?.rol === 'SUPERADMIN' || usuario?.rol === 'ADMIN_SEDE';

  const [showNuevo, setShowNuevo] = useState(false);
  const [editar, setEditar] = useState<Implemento | null>(null);
  const [tab, setTab] = useState<'inventario' | 'prestados'>('inventario');
  const [busqueda, setBusqueda] = useState('');

  const { data: implementos = [], isLoading } = useQuery({
    queryKey: ['implementos'],
    queryFn: async () =>
      (await api.get<Implemento[]>('/implementos')).data,
  });

  const { data: prestados = [], isLoading: loadPrestados } = useQuery({
    queryKey: ['implementos', 'prestados'],
    queryFn: async () =>
      (
        await api.get<Asignacion[]>('/implementos/asignaciones', {
          params: { pendientes: true },
        })
      ).data,
    enabled: tab === 'prestados',
  });

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return implementos;
    return implementos.filter((i) =>
      i.nombre.toLowerCase().includes(q),
    );
  }, [implementos, busqueda]);

  const stats = useMemo(() => {
    const total = implementos.reduce((s, i) => s + i.stockTotal, 0);
    const disponibles = implementos.reduce((s, i) => s + i.stockDisponible, 0);
    return {
      tipos: implementos.length,
      total,
      disponibles,
      prestados: total - disponibles,
    };
  }, [implementos]);

  const ajustar = useMutation({
    mutationFn: async ({ id, delta }: { id: number; delta: number }) =>
      api.post(`/implementos/${id}/ajuste-stock`, { delta }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['implementos'] });
      toast({ type: 'success', title: 'Stock actualizado' });
    },
    onError: (err: any) =>
      toast({
        type: 'error',
        title: 'No se pudo actualizar',
        description: err.response?.data?.message,
      }),
  });

  const eliminar = useMutation({
    mutationFn: async (id: number) => api.delete(`/implementos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['implementos'] });
      toast({ type: 'success', title: 'Implemento eliminado' });
    },
    onError: (err: any) =>
      toast({
        type: 'error',
        title: 'No se pudo eliminar',
        description: err.response?.data?.message,
      }),
  });

  const devolver = useMutation({
    mutationFn: async (asignacionId: number) =>
      api.post(`/implementos/asignaciones/${asignacionId}/devolver`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['implementos'] });
      qc.invalidateQueries({ queryKey: ['implementos', 'prestados'] });
      toast({ type: 'success', title: 'Implemento devuelto' });
    },
  });

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile color="from-violet-500 to-violet-600" icon={<Package size={16} />} label="Tipos" value={stats.tipos} />
        <Tile color="from-blue-500 to-blue-600" icon={<Sparkles size={16} />} label="Unidades totales" value={stats.total} />
        <Tile color="from-emerald-500 to-emerald-600" icon={<Check size={16} />} label="Disponibles" value={stats.disponibles} />
        <Tile color="from-amber-500 to-amber-600" icon={<ArrowDownToLine size={16} />} label="Prestados" value={stats.prestados} alert={stats.prestados > 0} />
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100 dark:border-slate-800">
          <TabBtn active={tab === 'inventario'} onClick={() => setTab('inventario')}>
            Inventario ({implementos.length})
          </TabBtn>
          <TabBtn active={tab === 'prestados'} onClick={() => setTab('prestados')}>
            Prestados ahora ({stats.prestados})
          </TabBtn>
        </div>

        {tab === 'inventario' && (
          <>
            <div className="p-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar implemento..."
                  className="w-full bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-violet-400"
                />
              </div>
              {puedeEditar && (
                <button
                  onClick={() => setShowNuevo(true)}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md shadow-violet-500/30 btn-press"
                >
                  <Plus size={15} /> Nuevo implemento
                </button>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <Th>Implemento</Th>
                  <Th align="center">Disponible / Total</Th>
                  <Th align="center">Prestados</Th>
                  {puedeEditar && <Th align="right">Acciones</Th>}
                </tr>
              </thead>
              <tbody>
                {isLoading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800/60">
                      {Array.from({ length: 4 }).map((__, j) => (
                        <td key={j} className="px-5 py-3">
                          <Skeleton className="h-4" />
                        </td>
                      ))}
                    </tr>
                  ))}
                {!isLoading && filtrados.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-0">
                      <EmptyState
                        icon={<Sparkles size={28} />}
                        title="Aún no hay implementos"
                        description={
                          puedeEditar
                            ? 'Agrega toallas, sábanas, controles, etc. con "Nuevo implemento".'
                            : undefined
                        }
                      />
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  filtrados.map((it) => (
                    <Fila
                      key={it.id}
                      it={it}
                      puedeEditar={puedeEditar}
                      onAjustar={(delta) =>
                        ajustar.mutate({ id: it.id, delta })
                      }
                      onEditar={() => setEditar(it)}
                      onEliminar={async () => {
                        const ok = await confirm({
                          title: `¿Eliminar "${it.nombre}"?`,
                          message:
                            'Solo se puede eliminar si no hay unidades prestadas.',
                          variant: 'danger',
                          confirmText: 'Eliminar',
                        });
                        if (ok) eliminar.mutate(it.id);
                      }}
                    />
                  ))}
              </tbody>
            </table>
          </>
        )}

        {tab === 'prestados' && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>Implemento</Th>
                <Th>Habitación / Cliente</Th>
                <Th align="center">Cantidad</Th>
                <Th>Entregado</Th>
                <Th align="right">Acción</Th>
              </tr>
            </thead>
            <tbody>
              {loadPrestados && (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Cargando…</td></tr>
              )}
              {!loadPrestados && prestados.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-0">
                    <EmptyState
                      icon={<Check size={28} />}
                      title="Todo devuelto"
                      description="No hay implementos prestados en este momento."
                    />
                  </td>
                </tr>
              )}
              {!loadPrestados &&
                prestados.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-slate-50 dark:border-slate-800/60 last:border-0 hover:bg-violet-50/30 dark:hover:bg-violet-900/20"
                  >
                    <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-100">
                      {a.implemento.nombre}
                    </td>
                    <td className="px-5 py-3 text-xs">
                      <div className="font-semibold text-slate-700 dark:text-slate-200">
                        Hab. {a.alquiler.habitacion.numero}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">
                        {a.alquiler.clienteNombre}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center tabular-nums font-bold text-slate-900 dark:text-slate-100">
                      ×{a.cantidad}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                      {new Date(a.fechaAsignacion).toLocaleString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {puedeEditar && (
                        <button
                          onClick={() => devolver.mutate(a.id)}
                          className="inline-flex items-center gap-1.5 text-xs bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-lg"
                        >
                          <ArrowDownToLine size={12} /> Devolver
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      {showNuevo && (
        <ImplementoModal
          onClose={() => setShowNuevo(false)}
          onSaved={() => {
            setShowNuevo(false);
            qc.invalidateQueries({ queryKey: ['implementos'] });
            toast({ type: 'success', title: 'Implemento creado' });
          }}
        />
      )}
      {editar && (
        <ImplementoModal
          implemento={editar}
          onClose={() => setEditar(null)}
          onSaved={() => {
            setEditar(null);
            qc.invalidateQueries({ queryKey: ['implementos'] });
            toast({ type: 'success', title: 'Implemento actualizado' });
          }}
        />
      )}
    </div>
  );
}

function Fila({
  it,
  puedeEditar,
  onAjustar,
  onEditar,
  onEliminar,
}: {
  it: Implemento;
  puedeEditar: boolean;
  onAjustar: (delta: number) => void;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  const prestados = it.stockTotal - it.stockDisponible;
  const sinStock = it.stockDisponible === 0 && it.stockTotal > 0;
  return (
    <tr className="border-b border-slate-50 dark:border-slate-800/60 last:border-0 hover:bg-violet-50/30 dark:hover:bg-violet-900/20">
      <td className="px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center shrink-0">
            <Sparkles size={14} />
          </div>
          <div>
            <div className="font-semibold text-slate-800 dark:text-slate-100">
              {it.nombre}
            </div>
            {it.descripcion && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {it.descripcion}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-5 py-3 text-center">
        <div className="inline-flex items-center gap-2">
          {puedeEditar && (
            <button
              onClick={() => onAjustar(-1)}
              disabled={it.stockTotal === 0}
              className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 disabled:opacity-30 flex items-center justify-center"
              title="Restar 1 del stock total"
            >
              <Minus size={12} />
            </button>
          )}
          <div
            className={`min-w-[80px] text-center font-bold tabular-nums ${
              sinStock
                ? 'text-rose-700 dark:text-rose-300'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {it.stockDisponible} <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">/ {it.stockTotal}</span>
          </div>
          {puedeEditar && (
            <button
              onClick={() => onAjustar(1)}
              className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center"
              title="Sumar 1 al stock total"
            >
              <Plus size={12} />
            </button>
          )}
        </div>
        {sinStock && (
          <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 flex items-center justify-center gap-1">
            <AlertTriangle size={10} /> Sin disponibilidad
          </div>
        )}
      </td>
      <td className="px-5 py-3 text-center tabular-nums">
        {prestados > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
            {prestados} fuera
          </span>
        ) : (
          <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
        )}
      </td>
      {puedeEditar && (
        <td className="px-5 py-3 text-right">
          <div className="inline-flex items-center gap-1">
            <button
              onClick={onEditar}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1.5 rounded-lg"
            >
              <Pencil size={13} /> Editar
            </button>
            <button
              onClick={onEliminar}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 flex items-center justify-center"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}

function ImplementoModal({
  implemento,
  onClose,
  onSaved,
}: {
  implemento?: Implemento;
  onClose: () => void;
  onSaved: () => void;
}) {
  const esEdicion = !!implemento;
  const [nombre, setNombre] = useState(implemento?.nombre || '');
  const [descripcion, setDescripcion] = useState(implemento?.descripcion || '');
  const [stockTotal, setStockTotal] = useState(
    implemento?.stockTotal != null ? String(implemento.stockTotal) : '0',
  );
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const submit = async () => {
    if (!nombre.trim()) return setError('Nombre obligatorio');
    setGuardando(true);
    setError(null);
    try {
      if (esEdicion) {
        await api.patch(`/implementos/${implemento!.id}`, {
          nombre: nombre.trim(),
          descripcion: descripcion || undefined,
        });
        // Si el stockTotal cambió, llamar ajuste-stock
        const nuevo = Number(stockTotal);
        const delta = nuevo - implemento!.stockTotal;
        if (delta !== 0)
          await api.post(`/implementos/${implemento!.id}/ajuste-stock`, {
            delta,
          });
      } else {
        await api.post('/implementos', {
          nombre: nombre.trim(),
          descripcion: descripcion || undefined,
          stockTotal: Number(stockTotal),
        });
      }
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-hotel text-lg font-bold text-slate-900 dark:text-slate-100">
            {esEdicion ? 'Editar implemento' : 'Nuevo implemento'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Nombre">
            <input
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Toalla grande blanca"
              className={inputCls}
            />
          </Field>
          <Field label="Descripción (opcional)">
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Características o detalles"
              className={inputCls}
            />
          </Field>
          <Field label="Stock total">
            <input
              type="number"
              min={0}
              value={stockTotal}
              onChange={(e) => setStockTotal(e.target.value)}
              className={inputCls}
            />
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Cantidad total que tiene el hotel. El sistema descuenta automáticamente cuando se prestan a un alquiler.
            </div>
          </Field>
          {error && (
            <div className="text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-lg p-2.5">
              {error}
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={guardando}
            className="flex-1 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white py-2.5 rounded-xl font-semibold shadow-md disabled:opacity-40"
          >
            {guardando ? 'Guardando…' : esEdicion ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}

// helpers
function Tile({
  color,
  icon,
  label,
  value,
  alert,
}: {
  color: string;
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 text-white bg-gradient-to-br ${color} shadow-md relative overflow-hidden ${alert ? 'animate-pulse' : ''}`}
    >
      <div className="absolute -right-4 -bottom-4 opacity-20 scale-[3]">{icon}</div>
      <div className="relative">
        <div className="text-[10px] uppercase tracking-widest opacity-90 font-semibold">{label}</div>
        <div className="text-2xl font-hotel font-bold mt-1 tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function TabBtn({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-3 text-sm font-semibold transition border-b-2 -mb-px ${
        active
          ? 'border-violet-600 text-violet-700 dark:text-violet-300'
          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
      }`}
    >
      {children}
    </button>
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
      className={`px-5 py-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-${align}`}
    >
      {children}
    </th>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

const inputCls =
  'w-full bg-white dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30';
