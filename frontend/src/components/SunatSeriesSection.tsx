import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Trash2, Edit3, X, Star, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { useAuthStore } from '@/store/auth';

interface SunatSerie {
  id: number;
  sedeId: number;
  tipo: 'BOLETA' | 'FACTURA';
  serie: string;
  ultimoCorrelativo: number;
  activa: boolean;
  esPredeterminada: boolean;
  notas: string | null;
  sede: { id: number; nombre: string };
}

interface Sede {
  id: number;
  nombre: string;
}

/**
 * Sección de Configuración → "Series SUNAT por sede". Permite a SUPERADMIN
 * y ADMIN_SEDE administrar las series de boleta/factura. Cada sede tiene
 * su propia secuencia de correlativos que el sistema incrementa al emitir.
 */
interface Props {
  /** Si está, filtra y oculta el selector de sede en el modal de crear. */
  sedeId?: number;
  /** Render compacto sin header (para embeber dentro de otro modal). */
  embebido?: boolean;
}

export default function SunatSeriesSection({ sedeId, embebido }: Props = {}) {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const usuario = useAuthStore((s) => s.usuario);
  const isSuper = usuario?.rol === 'SUPERADMIN';

  const [crearOpen, setCrearOpen] = useState(false);
  const [editar, setEditar] = useState<SunatSerie | null>(null);

  const seriesQ = useQuery<SunatSerie[]>({
    queryKey: ['sunat-series', sedeId ?? 'all'],
    queryFn: async () =>
      (
        await api.get('/sunat-series', {
          params: sedeId ? { sedeId } : undefined,
        })
      ).data,
  });

  // Si hay sedeId fijo (ya elegida), no necesitamos pedir sedes.
  // Para SUPERADMIN sin filtro, traemos la lista para el dropdown del modal.
  const sedesQ = useQuery<Sede[]>({
    queryKey: ['sedes'],
    queryFn: async () => (await api.get('/sedes')).data,
    enabled: isSuper && !sedeId,
  });

  const eliminar = useMutation({
    mutationFn: async (id: number) =>
      (await api.delete(`/sunat-series/${id}`)).data,
    onSuccess: () => {
      toast({ type: 'success', title: 'Serie eliminada' });
      qc.invalidateQueries({ queryKey: ['sunat-series'] });
    },
    onError: (err: any) =>
      toast({
        type: 'error',
        title: 'No se pudo eliminar',
        description: err.response?.data?.message || err.message,
      }),
  });

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    embebido ? (
      <div>{children}</div>
    ) : (
      <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm">
        {children}
      </section>
    );

  return (
    <Wrapper>
      {!embebido && (
        <p className="sr-only">Series SUNAT</p>
      )}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          {!embebido && <FileText size={18} className="text-violet-600" />}
          {!embebido && (
            <h2 className="font-hotel text-lg font-bold text-slate-900 dark:text-slate-100">
              Series SUNAT por sede
            </h2>
          )}
        </div>
        <button
          onClick={() => setCrearOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg"
        >
          <Plus size={14} /> Nueva serie
        </button>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Cada sede tiene su propia serie y correlativo. <b>Inicializa el último
        correlativo</b> con el número que ves en tu panel NubeFact para evitar
        que el sistema intente reusar comprobantes ya emitidos.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="py-2 pr-3">Sede</th>
              <th className="py-2 pr-3">Tipo</th>
              <th className="py-2 pr-3">Serie</th>
              <th className="py-2 pr-3 text-right">Último correlativo</th>
              <th className="py-2 pr-3 text-center">Estado</th>
              <th className="py-2 pr-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {seriesQ.isLoading && (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-6 text-slate-400 text-xs"
                >
                  Cargando…
                </td>
              </tr>
            )}
            {!seriesQ.isLoading && (seriesQ.data?.length || 0) === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-6 text-slate-400 text-xs"
                >
                  No hay series configuradas. Crea una con "Nueva serie".
                </td>
              </tr>
            )}
            {seriesQ.data?.map((s) => (
              <tr
                key={s.id}
                className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
              >
                <td className="py-2.5 pr-3 font-medium text-slate-700 dark:text-slate-200">
                  {s.sede?.nombre || `Sede #${s.sedeId}`}
                </td>
                <td className="py-2.5 pr-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      s.tipo === 'FACTURA'
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                        : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {s.tipo}
                  </span>
                </td>
                <td className="py-2.5 pr-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                  {s.serie}
                  {s.esPredeterminada && (
                    <Star
                      size={11}
                      className="inline ml-1.5 fill-amber-400 text-amber-500"
                      aria-label="Predeterminada"
                    />
                  )}
                </td>
                <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">
                  {String(s.ultimoCorrelativo).padStart(8, '0')}
                </td>
                <td className="py-2.5 pr-3 text-center">
                  {s.activa ? (
                    <span className="text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                      ● Activa
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[11px] font-semibold">
                      ○ Pausada
                    </span>
                  )}
                </td>
                <td className="py-2.5 pr-3 text-right">
                  <div className="inline-flex gap-1">
                    <button
                      onClick={() => setEditar(s)}
                      className="p-1.5 rounded hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-600 dark:text-violet-300"
                      title="Editar"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `¿Eliminar la serie ${s.serie} de ${s.sede.nombre}? Esta acción no afecta los comprobantes ya emitidos.`,
                          )
                        )
                          eliminar.mutate(s.id);
                      }}
                      className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-300"
                      title="Eliminar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800 mt-3 space-y-1">
        <div>
          ⓘ <b>Cómo inicializar:</b> entrá a NubeFact → Comprobantes → filtra
          por la serie (ej. B003) y mirá el número del último emitido. Esa cifra
          va en "Último correlativo" para que el próximo alquiler use ese +1.
        </div>
        <div>
          ⓘ <b>Estrella (★) = predeterminada:</b> es la serie que el sistema
          usa cuando emite un comprobante. Solo una por sede y tipo puede ser
          predeterminada.
        </div>
        <div>
          ⓘ <b>Auto-recovery:</b> si NubeFact rechaza con "documento ya
          existe", el sistema incrementa el correlativo y reintenta hasta 10
          veces automáticamente. No hace falta intervenir manualmente.
        </div>
      </div>

      {(crearOpen || editar) && (
        <SerieModal
          sedes={sedesQ.data || []}
          isSuper={isSuper}
          serieEditar={editar}
          sedeIdFijo={sedeId}
          onClose={() => {
            setCrearOpen(false);
            setEditar(null);
          }}
        />
      )}
    </Wrapper>
  );
}

// ──────────────────────────────────────────────────────────
// Modal crear/editar
// ──────────────────────────────────────────────────────────
function SerieModal({
  sedes,
  isSuper,
  serieEditar,
  sedeIdFijo,
  onClose,
}: {
  sedes: Sede[];
  isSuper: boolean;
  serieEditar: SunatSerie | null;
  /** Si está, la sede queda forzada y el dropdown no aparece. */
  sedeIdFijo?: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const usuario = useAuthStore((s) => s.usuario);

  const esEdit = !!serieEditar;
  const [sedeId, setSedeId] = useState<number | ''>(
    serieEditar?.sedeId ?? sedeIdFijo ?? usuario?.sedeId ?? (isSuper ? '' : 0),
  );
  const [tipo, setTipo] = useState<'BOLETA' | 'FACTURA'>(
    serieEditar?.tipo ?? 'BOLETA',
  );
  const [serie, setSerie] = useState(serieEditar?.serie ?? 'B001');
  const [ultimoCorrelativo, setUltimoCorrelativo] = useState<string>(
    String(serieEditar?.ultimoCorrelativo ?? 0),
  );
  const [esPredeterminada, setEsPredeterminada] = useState(
    serieEditar?.esPredeterminada ?? true,
  );
  const [activa, setActiva] = useState(serieEditar?.activa ?? true);
  const [notas, setNotas] = useState(serieEditar?.notas ?? '');
  const [error, setError] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: async () => {
      const corrNum = Number(ultimoCorrelativo);
      if (!Number.isInteger(corrNum) || corrNum < 0)
        throw new Error('Correlativo inválido');
      if (esEdit) {
        return (
          await api.patch(`/sunat-series/${serieEditar.id}`, {
            ultimoCorrelativo: corrNum,
            esPredeterminada,
            activa,
            notas,
          })
        ).data;
      }
      return (
        await api.post('/sunat-series', {
          sedeId: Number(sedeId),
          tipo,
          serie: serie.toUpperCase(),
          ultimoCorrelativo: corrNum,
          esPredeterminada,
          notas,
        })
      ).data;
    },
    onSuccess: () => {
      toast({
        type: 'success',
        title: esEdit ? 'Serie actualizada' : 'Serie creada',
      });
      qc.invalidateQueries({ queryKey: ['sunat-series'] });
      onClose();
    },
    onError: (err: any) =>
      setError(err.response?.data?.message || err.message),
  });

  // Auto-ajustar la primera letra al cambiar tipo
  const handleTipo = (t: 'BOLETA' | 'FACTURA') => {
    setTipo(t);
    if (!esEdit) {
      const letra = t === 'FACTURA' ? 'F' : 'B';
      setSerie((s) => (s ? letra + s.slice(1) : letra + '001'));
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            {esEdit ? 'Editar serie' : 'Nueva serie SUNAT'}
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
          >
            <X size={16} className="text-slate-500" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {isSuper && !esEdit && !sedeIdFijo && (
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Sede
              </label>
              <select
                value={sedeId}
                onChange={(e) => setSedeId(Number(e.target.value))}
                className="w-full mt-1 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">— Elegir sede —</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!esEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                  Tipo
                </label>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {(['BOLETA', 'FACTURA'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => handleTipo(t)}
                      type="button"
                      className={`py-1.5 rounded text-xs font-bold transition ${
                        tipo === t
                          ? t === 'FACTURA'
                            ? 'bg-blue-600 text-white'
                            : 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                  Serie (4 chars)
                </label>
                <input
                  value={serie}
                  onChange={(e) => setSerie(e.target.value.toUpperCase())}
                  maxLength={4}
                  className="w-full mt-1 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono font-bold uppercase bg-white dark:bg-slate-800 dark:text-slate-100"
                  placeholder={tipo === 'FACTURA' ? 'F001' : 'B001'}
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Último correlativo emitido en NubeFact
            </label>
            <input
              type="number"
              min={0}
              max={99999999}
              value={ultimoCorrelativo}
              onChange={(e) => setUltimoCorrelativo(e.target.value)}
              className="w-full mt-1 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-lg font-mono font-bold text-right tabular-nums bg-white dark:bg-slate-800 dark:text-slate-100"
              placeholder="15946"
            />
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              El próximo alquiler que emitas usará{' '}
              <span className="font-mono font-bold">
                {(serieEditar?.serie || serie).toUpperCase()}-
                {String(Number(ultimoCorrelativo) + 1).padStart(8, '0')}
              </span>
              .
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={esPredeterminada}
              onChange={(e) => setEsPredeterminada(e.target.checked)}
              className="w-4 h-4 accent-amber-500"
            />
            <Star size={13} className="text-amber-500 fill-amber-400" />
            Marcar como predeterminada para esta sede + tipo
          </label>

          {esEdit && (
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={activa}
                onChange={(e) => setActiva(e.target.checked)}
                className="w-4 h-4 accent-emerald-600"
              />
              Activa (puede emitir nuevos comprobantes)
            </label>
          )}

          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Notas (opcional)
            </label>
            <input
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full mt-1 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
              placeholder="Ej: Serie del local Caribe Centro"
            />
          </div>

          {error && (
            <div className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-200 text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={() => guardar.mutate()}
              disabled={guardar.isPending || (!esEdit && !sedeId)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-lg font-medium disabled:opacity-50 text-sm"
            >
              <Save size={14} />
              {guardar.isPending
                ? 'Guardando…'
                : esEdit
                  ? 'Actualizar'
                  : 'Crear serie'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
