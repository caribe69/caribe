import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Plus,
  X,
  Search,
  Minus,
  Check,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ToastProvider';
import { useDialog } from '@/components/ConfirmProvider';

interface Producto {
  id: number;
  nombre: string;
  descripcion?: string | null;
  precio: string;
  stock: number;
  stockMinimo: number;
}

export default function Productos() {
  const qc = useQueryClient();
  const usuario = useAuthStore((s) => s.usuario);
  const puedeEditar =
    usuario?.rol === 'SUPERADMIN' || usuario?.rol === 'ADMIN_SEDE';
  const [showNuevo, setShowNuevo] = useState(false);
  const [editar, setEditar] = useState<Producto | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroStock, setFiltroStock] = useState<'todos' | 'bajo' | 'agotado'>(
    'todos',
  );

  const { data, isLoading } = useQuery({
    queryKey: ['productos'],
    queryFn: async () => (await api.get<Producto[]>('/productos')).data,
  });

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    let arr = data || [];
    if (q) arr = arr.filter((p) => p.nombre.toLowerCase().includes(q));
    if (filtroStock === 'bajo')
      arr = arr.filter((p) => p.stock > 0 && p.stock <= p.stockMinimo);
    if (filtroStock === 'agotado') arr = arr.filter((p) => p.stock === 0);
    return arr;
  }, [data, busqueda, filtroStock]);

  const pag = usePagination(filtrados, 15);

  return (
    <div className="space-y-4">
      {/* Toolbar compacta */}
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-3xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30"
          />
        </div>

        <div className="flex gap-1.5">
          <FiltroChip
            active={filtroStock === 'todos'}
            onClick={() => setFiltroStock('todos')}
          >
            Todos
          </FiltroChip>
          <FiltroChip
            active={filtroStock === 'bajo'}
            color="amber"
            onClick={() => setFiltroStock('bajo')}
          >
            Stock bajo
          </FiltroChip>
          <FiltroChip
            active={filtroStock === 'agotado'}
            color="rose"
            onClick={() => setFiltroStock('agotado')}
          >
            Agotados
          </FiltroChip>
        </div>

        <div className="text-[11px] text-slate-400 ml-auto">
          {filtrados.length} de {data?.length || 0}
        </div>

        {puedeEditar && (
          <button
            onClick={() => setShowNuevo(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md shadow-violet-500/30 dark:shadow-violet-900/40 btn-press"
          >
            <Plus size={15} /> Nuevo producto
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>Producto</Th>
                <Th align="right">Precio</Th>
                <Th align="center">Cantidad</Th>
                <Th align="right">Mínimo</Th>
                {puedeEditar && <Th align="right">Acciones</Th>}
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-50 dark:border-slate-800/60"
                  >
                    <td className="px-5 py-4">
                      <Skeleton className="h-4 w-48" />
                    </td>
                    <td className="px-5 py-4">
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </td>
                    <td className="px-5 py-4">
                      <Skeleton className="h-8 w-32 mx-auto" />
                    </td>
                    <td className="px-5 py-4">
                      <Skeleton className="h-4 w-10 ml-auto" />
                    </td>
                    {puedeEditar && (
                      <td className="px-5 py-4">
                        <Skeleton className="h-7 w-20 ml-auto" />
                      </td>
                    )}
                  </tr>
                ))}

              {!isLoading && filtrados.length === 0 && (
                <tr>
                  <td colSpan={puedeEditar ? 5 : 4} className="p-0">
                    <EmptyState
                      icon={<Package size={28} />}
                      title={
                        busqueda
                          ? `Sin resultados para "${busqueda}"`
                          : filtroStock === 'bajo'
                            ? 'Sin productos con stock bajo'
                            : filtroStock === 'agotado'
                              ? 'Ningún producto agotado'
                              : 'Aún no hay productos'
                      }
                      description={
                        !busqueda && filtroStock === 'todos' && puedeEditar
                          ? 'Crea el primero con el botón "Nuevo producto" arriba.'
                          : undefined
                      }
                    />
                  </td>
                </tr>
              )}

              {!isLoading &&
                pag.paginated.map((p) => (
                  <Fila
                    key={p.id}
                    p={p}
                    puedeEditar={puedeEditar}
                    onEditar={() => setEditar(p)}
                  />
                ))}
            </tbody>
          </table>
        </div>

        {filtrados.length > 0 && (
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
        )}
      </div>

      {showNuevo && (
        <ProductoModal
          onClose={() => setShowNuevo(false)}
          onSaved={() => {
            setShowNuevo(false);
            qc.invalidateQueries({ queryKey: ['productos'] });
          }}
        />
      )}
      {editar && (
        <ProductoModal
          producto={editar}
          onClose={() => setEditar(null)}
          onSaved={() => {
            setEditar(null);
            qc.invalidateQueries({ queryKey: ['productos'] });
          }}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Fila con editor inline de cantidad
// ───────────────────────────────────────────────────────────
function Fila({
  p,
  puedeEditar,
  onEditar,
}: {
  p: Producto;
  puedeEditar: boolean;
  onEditar: () => void;
}) {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const { confirm } = useDialog();
  const [valor, setValor] = useState(String(p.stock));
  const [guardando, setGuardando] = useState(false);

  // Sincroniza si el dato cambia desde afuera
  useMemoSync(p.stock, (s) => setValor(String(s)));

  const dirty = Number(valor) !== p.stock && valor !== '' && !isNaN(Number(valor));

  const ajustar = async (nuevo: number) => {
    if (nuevo < 0 || nuevo === p.stock) return;
    setGuardando(true);
    try {
      await api.post(`/productos/${p.id}/ajuste-stock`, {
        cantidad: nuevo - p.stock,
      });
      qc.invalidateQueries({ queryKey: ['productos'] });
      toast({
        type: 'success',
        title: `Stock actualizado`,
        description: `${p.nombre} → ${nuevo}`,
      });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'No se pudo actualizar',
        description: err.response?.data?.message || undefined,
      });
      setValor(String(p.stock));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    const ok = await confirm({
      title: `Eliminar "${p.nombre}"?`,
      message: 'Esta acción no se puede deshacer.',
      variant: 'danger',
      confirmText: 'Eliminar',
    });
    if (!ok) return;
    try {
      await api.delete(`/productos/${p.id}`);
      qc.invalidateQueries({ queryKey: ['productos'] });
      toast({ type: 'success', title: 'Producto eliminado' });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'No se pudo eliminar',
        description: err.response?.data?.message || undefined,
      });
    }
  };

  const out = p.stock === 0;
  const low = p.stock > 0 && p.stock <= p.stockMinimo;

  const inputColor = out
    ? 'border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300'
    : low
      ? 'border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
      : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100';

  return (
    <tr className="border-b border-slate-50 dark:border-slate-800/60 last:border-0 hover:bg-violet-50/30 dark:hover:bg-violet-900/20 transition">
      <td className="px-5 py-3">
        <div className="font-semibold text-slate-800 dark:text-slate-200">
          {p.nombre}
        </div>
        {p.descripcion && (
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            {p.descripcion}
          </div>
        )}
      </td>
      <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-700 dark:text-slate-300">
        S/ {Number(p.precio).toFixed(2)}
      </td>

      {/* EDITOR INLINE DE STOCK */}
      <td className="px-5 py-3">
        {puedeEditar ? (
          <div className="flex items-center justify-center gap-1.5">
            <button
              onClick={() => ajustar(p.stock - 1)}
              disabled={guardando || p.stock === 0}
              className="w-8 h-8 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-900/40 dark:hover:bg-rose-900/60 dark:text-rose-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center btn-press transition"
              title="Restar 1"
            >
              <Minus size={14} />
            </button>
            <input
              type="number"
              min={0}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && dirty) ajustar(Number(valor));
                if (e.key === 'Escape') setValor(String(p.stock));
              }}
              className={`w-16 text-center font-bold tabular-nums bg-white dark:bg-slate-800 border rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30 ${inputColor}`}
            />
            <button
              onClick={() => ajustar(p.stock + 1)}
              disabled={guardando}
              className="w-8 h-8 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 disabled:opacity-30 flex items-center justify-center btn-press transition"
              title="Sumar 1"
            >
              <Plus size={14} />
            </button>
            {dirty && (
              <button
                onClick={() => ajustar(Number(valor))}
                disabled={guardando}
                className="w-8 h-8 rounded-lg bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center btn-press transition animate-fade-in"
                title="Guardar"
              >
                <Check size={14} />
              </button>
            )}
          </div>
        ) : (
          <div className="text-center">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                out
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                  : low
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              }`}
            >
              {p.stock}
              {low && !out && <AlertTriangle size={10} />}
            </span>
          </div>
        )}
      </td>

      <td className="px-5 py-3 text-right text-slate-500 dark:text-slate-400 tabular-nums">
        {p.stockMinimo}
      </td>

      {puedeEditar && (
        <td className="px-5 py-3 text-right">
          <div className="inline-flex items-center gap-1">
            <button
              onClick={onEditar}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1.5 rounded-lg transition"
              title="Editar producto"
            >
              <Pencil size={13} /> Editar
            </button>
            <button
              onClick={eliminar}
              className="inline-flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 w-7 h-7 rounded-lg transition"
              title="Eliminar"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}

// Hook chico: resincroniza estado cuando cambia el valor fuente
function useMemoSync<T>(value: T, set: (v: T) => void) {
  useMemo(() => {
    set(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
}

// ───────────────────────────────────────────────────────────
// Modal Nuevo / Editar producto
// ───────────────────────────────────────────────────────────
function ProductoModal({
  producto,
  onClose,
  onSaved,
}: {
  producto?: Producto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const esEdicion = !!producto;
  const { show: toast } = useToast();
  const [form, setForm] = useState({
    nombre: producto?.nombre || '',
    descripcion: producto?.descripcion || '',
    precio: producto?.precio ? String(producto.precio) : '',
    stock: producto?.stock != null ? String(producto.stock) : '0',
    stockMinimo: producto?.stockMinimo != null ? String(producto.stockMinimo) : '5',
  });
  const [error, setError] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: async () => {
      if (esEdicion) {
        // Actualiza datos básicos
        await api.patch(`/productos/${producto!.id}`, {
          nombre: form.nombre,
          descripcion: form.descripcion || undefined,
          precio: Number(form.precio),
          stockMinimo: Number(form.stockMinimo),
        });
        // Si el stock cambió, registrar ajuste (para mantener historial)
        const nuevoStock = Number(form.stock);
        if (!isNaN(nuevoStock) && nuevoStock !== producto!.stock) {
          await api.post(`/productos/${producto!.id}/ajuste-stock`, {
            cantidad: nuevoStock - producto!.stock,
            motivo: 'Edición manual',
          });
        }
      } else {
        await api.post('/productos', {
          nombre: form.nombre,
          descripcion: form.descripcion || undefined,
          precio: Number(form.precio),
          stock: Number(form.stock),
          stockMinimo: Number(form.stockMinimo),
        });
      }
    },
    onSuccess: () => {
      toast({
        type: 'success',
        title: esEdicion ? 'Producto actualizado' : 'Producto creado',
      });
      onSaved();
    },
    onError: (err: any) =>
      setError(err.response?.data?.message || 'Error al guardar'),
  });

  const valido =
    form.nombre.trim() !== '' && form.precio !== '' && !isNaN(Number(form.precio));

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-hotel text-lg font-bold text-slate-900 dark:text-slate-100">
            {esEdicion ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Field label="Nombre">
            <input
              autoFocus
              className={inputCls}
              placeholder="Ej: Agua mineral 625ml"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </Field>
          <Field label="Descripción (opcional)">
            <input
              className={inputCls}
              placeholder="Marca, presentación, etc."
              value={form.descripcion}
              onChange={(e) =>
                setForm({ ...form, descripcion: e.target.value })
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio (S/)">
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputCls}
                placeholder="0.00"
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })}
              />
            </Field>
            <Field label="Stock mínimo">
              <input
                type="number"
                min="0"
                className={inputCls}
                value={form.stockMinimo}
                onChange={(e) =>
                  setForm({ ...form, stockMinimo: e.target.value })
                }
              />
            </Field>
          </div>
          <Field label={esEdicion ? 'Stock actual' : 'Stock inicial'}>
            <input
              type="number"
              min="0"
              className={inputCls}
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
            />
          </Field>

          {error && (
            <div className="text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-lg p-2.5">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl font-medium btn-press"
          >
            Cancelar
          </button>
          <button
            onClick={() => guardar.mutate()}
            disabled={guardar.isPending || !valido}
            className="flex-1 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white py-2.5 rounded-xl font-semibold shadow-md shadow-violet-500/30 disabled:opacity-40 btn-press"
          >
            {guardar.isPending ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// helpers
// ───────────────────────────────────────────────────────────
const inputCls =
  'w-full bg-white dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30 transition';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
        {label}
      </label>
      <div className="mt-1">{children}</div>
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
      className={`px-5 py-3.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-${align}`}
    >
      {children}
    </th>
  );
}

function FiltroChip({
  children,
  active,
  onClick,
  color = 'violet',
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  color?: 'violet' | 'amber' | 'rose';
}) {
  const activeClasses = {
    violet: 'bg-violet-600 text-white shadow-sm',
    amber: 'bg-amber-500 text-white shadow-sm',
    rose: 'bg-rose-500 text-white shadow-sm',
  }[color];
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
        active
          ? activeClasses
          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );
}
