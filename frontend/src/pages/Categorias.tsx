import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tags, Plus, X, Pencil, Trash2, GripVertical } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ToastProvider';
import { useDialog } from '@/components/ConfirmProvider';

interface Categoria {
  id: number;
  nombre: string;
  orden: number;
  _count?: { productos: number };
}

export default function Categorias() {
  const qc = useQueryClient();
  const usuario = useAuthStore((s) => s.usuario);
  const puedeEditar =
    usuario?.rol === 'SUPERADMIN' || usuario?.rol === 'ADMIN_SEDE';
  const [showNuevo, setShowNuevo] = useState(false);
  const [editar, setEditar] = useState<Categoria | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['categorias-productos'],
    queryFn: async () =>
      (await api.get<Categoria[]>('/categorias-productos')).data,
  });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['categorias-productos'] });
    // Los productos incluyen la categoría → refresca esa vista también.
    qc.invalidateQueries({ queryKey: ['productos'] });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-3xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 flex items-center justify-center">
            <Tags size={18} />
          </div>
          <div>
            <div className="font-hotel text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">
              Categorías de productos
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Agrupan los productos del almacén de esta sede.
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 ml-auto">
          {data?.length || 0} categorías
        </div>

        {puedeEditar && (
          <button
            onClick={() => setShowNuevo(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md shadow-violet-500/30 dark:shadow-violet-900/40 btn-press"
          >
            <Plus size={15} /> Nueva categoría
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-3xl shadow-sm overflow-hidden">
        {isLoading && (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {!isLoading && (data?.length || 0) === 0 && (
          <EmptyState
            icon={<Tags size={28} />}
            title="Aún no hay categorías"
            description={
              puedeEditar
                ? 'Crea la primera con el botón "Nueva categoría" arriba.'
                : undefined
            }
          />
        )}

        {!isLoading && (data?.length || 0) > 0 && (
          <ul className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {data!.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-violet-50/30 dark:hover:bg-violet-900/20 transition"
              >
                <GripVertical
                  size={15}
                  className="text-slate-300 dark:text-slate-600 shrink-0"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex-1">
                  {c.nombre}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 shrink-0">
                  {c._count?.productos ?? 0}{' '}
                  {(c._count?.productos ?? 0) === 1 ? 'producto' : 'productos'}
                </span>
                <span className="hidden sm:inline text-[10px] text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                  orden {c.orden}
                </span>
                {puedeEditar && (
                  <div className="inline-flex items-center gap-1">
                    <button
                      onClick={() => setEditar(c)}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1.5 rounded-lg transition"
                      title="Editar categoría"
                    >
                      <Pencil size={13} /> Editar
                    </button>
                    <BotonEliminar categoria={c} onDone={invalidar} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {showNuevo && (
        <CategoriaModal
          onClose={() => setShowNuevo(false)}
          onSaved={() => {
            setShowNuevo(false);
            invalidar();
          }}
        />
      )}
      {editar && (
        <CategoriaModal
          categoria={editar}
          onClose={() => setEditar(null)}
          onSaved={() => {
            setEditar(null);
            invalidar();
          }}
        />
      )}
    </div>
  );
}

function BotonEliminar({
  categoria,
  onDone,
}: {
  categoria: Categoria;
  onDone: () => void;
}) {
  const { show: toast } = useToast();
  const { confirm } = useDialog();

  const eliminar = async () => {
    const ok = await confirm({
      title: `Eliminar "${categoria.nombre}"?`,
      message:
        'Solo se puede eliminar si no tiene productos activos asignados.',
      variant: 'danger',
      confirmText: 'Eliminar',
    });
    if (!ok) return;
    try {
      await api.delete(`/categorias-productos/${categoria.id}`);
      toast({ type: 'success', title: 'Categoría eliminada' });
      onDone();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'No se pudo eliminar',
        description: err.response?.data?.message || undefined,
      });
    }
  };

  return (
    <button
      onClick={eliminar}
      className="inline-flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 w-7 h-7 rounded-lg transition"
      title="Eliminar"
    >
      <Trash2 size={13} />
    </button>
  );
}

function CategoriaModal({
  categoria,
  onClose,
  onSaved,
}: {
  categoria?: Categoria;
  onClose: () => void;
  onSaved: () => void;
}) {
  const esEdicion = !!categoria;
  const { show: toast } = useToast();
  const [form, setForm] = useState({
    nombre: categoria?.nombre || '',
    orden: categoria?.orden != null ? String(categoria.orden) : '0',
  });
  const [error, setError] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: async () => {
      const payload = {
        nombre: form.nombre.trim(),
        orden: Number(form.orden) || 0,
      };
      if (esEdicion) {
        await api.patch(`/categorias-productos/${categoria!.id}`, payload);
      } else {
        await api.post('/categorias-productos', payload);
      }
    },
    onSuccess: () => {
      toast({
        type: 'success',
        title: esEdicion ? 'Categoría actualizada' : 'Categoría creada',
      });
      onSaved();
    },
    onError: (err: any) =>
      setError(err.response?.data?.message || 'Error al guardar'),
  });

  const valido = form.nombre.trim() !== '';

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-in">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-hotel text-lg font-bold text-slate-900 dark:text-slate-100">
            {esEdicion ? 'Editar categoría' : 'Nueva categoría'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Nombre
            </label>
            <input
              autoFocus
              className={`${inputCls} mt-1`}
              placeholder="Ej: Bebidas"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && valido) guardar.mutate();
              }}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Orden (menor aparece primero)
            </label>
            <input
              type="number"
              className={`${inputCls} mt-1`}
              value={form.orden}
              onChange={(e) => setForm({ ...form, orden: e.target.value })}
            />
          </div>

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
            {guardar.isPending
              ? 'Guardando...'
              : esEdicion
                ? 'Guardar cambios'
                : 'Crear categoría'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full bg-white dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30 transition';
