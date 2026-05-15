import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Plus,
  X,
  Upload,
  Trash2,
  Image as ImageIcon,
  AlertTriangle,
  Calendar,
  Download,
  ExternalLink,
  Search,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useDialog } from '@/components/ConfirmProvider';
import { useToast } from '@/components/ToastProvider';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

interface Documento {
  id: number;
  nombre: string;
  descripcion?: string | null;
  tipo: 'PDF' | 'IMAGEN' | 'OTRO';
  archivoPath: string;
  archivoNombre?: string | null;
  fechaEmision?: string | null;
  fechaVencimiento?: string | null;
  alertaDiasAntes: number;
  sedeId?: number | null;
  creadoEn: string;
}

type Estado = 'vigente' | 'porVencer' | 'vencido' | 'sinVencimiento';

function calcularEstado(doc: Documento): { estado: Estado; dias: number | null } {
  if (!doc.fechaVencimiento) return { estado: 'sinVencimiento', dias: null };
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(doc.fechaVencimiento);
  const dias = Math.ceil((venc.getTime() - hoy.getTime()) / 86_400_000);
  if (dias < 0) return { estado: 'vencido', dias };
  if (dias <= doc.alertaDiasAntes) return { estado: 'porVencer', dias };
  return { estado: 'vigente', dias };
}

export default function Documentos() {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const { confirm } = useDialog();
  const usuario = useAuthStore((s) => s.usuario);
  const puedeEditar =
    usuario?.rol === 'SUPERADMIN' || usuario?.rol === 'ADMIN_SEDE';

  const [showNuevo, setShowNuevo] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'todos' | Estado>('todos');

  const { data, isLoading } = useQuery({
    queryKey: ['documentos'],
    queryFn: async () => (await api.get<Documento[]>('/documentos')).data,
  });

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    let arr = data || [];
    if (q) {
      arr = arr.filter(
        (d) =>
          d.nombre.toLowerCase().includes(q) ||
          d.descripcion?.toLowerCase().includes(q),
      );
    }
    if (filtro !== 'todos') {
      arr = arr.filter((d) => calcularEstado(d).estado === filtro);
    }
    return arr;
  }, [data, busqueda, filtro]);

  const stats = useMemo(() => {
    const arr = data || [];
    let porVencer = 0;
    let vencidos = 0;
    let vigentes = 0;
    for (const d of arr) {
      const { estado } = calcularEstado(d);
      if (estado === 'porVencer') porVencer++;
      else if (estado === 'vencido') vencidos++;
      else if (estado === 'vigente') vigentes++;
    }
    return { porVencer, vencidos, vigentes, total: arr.length };
  }, [data]);

  const eliminar = useMutation({
    mutationFn: async (id: number) => api.delete(`/documentos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documentos'] });
      toast({ type: 'success', title: 'Documento eliminado' });
    },
    onError: (err: any) =>
      toast({
        type: 'error',
        title: 'No se pudo eliminar',
        description: err.response?.data?.message,
      }),
  });

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile
          color="from-violet-500 to-violet-600"
          icon={<FileText size={16} />}
          label="Total"
          value={stats.total}
        />
        <StatTile
          color="from-emerald-500 to-emerald-600"
          icon={<FileText size={16} />}
          label="Vigentes"
          value={stats.vigentes}
        />
        <StatTile
          color="from-amber-500 to-amber-600"
          icon={<AlertTriangle size={16} />}
          label="Por vencer"
          value={stats.porVencer}
          alert={stats.porVencer > 0}
        />
        <StatTile
          color="from-rose-500 to-rose-600"
          icon={<AlertTriangle size={16} />}
          label="Vencidos"
          value={stats.vencidos}
          alert={stats.vencidos > 0}
        />
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-3xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar documento..."
            className="w-full bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-violet-400"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Chip active={filtro === 'todos'} onClick={() => setFiltro('todos')}>
            Todos
          </Chip>
          <Chip
            active={filtro === 'vigente'}
            color="emerald"
            onClick={() => setFiltro('vigente')}
          >
            Vigentes
          </Chip>
          <Chip
            active={filtro === 'porVencer'}
            color="amber"
            onClick={() => setFiltro('porVencer')}
          >
            Por vencer
          </Chip>
          <Chip
            active={filtro === 'vencido'}
            color="rose"
            onClick={() => setFiltro('vencido')}
          >
            Vencidos
          </Chip>
        </div>
        <div className="text-[11px] text-slate-400 ml-auto">
          {filtrados.length} de {data?.length || 0}
        </div>
        {puedeEditar && (
          <button
            onClick={() => setShowNuevo(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md shadow-violet-500/30 btn-press"
          >
            <Plus size={15} /> Subir documento
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              <Th>Documento</Th>
              <Th>Emisión</Th>
              <Th>Vencimiento</Th>
              <Th>Estado</Th>
              <Th align="right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50 dark:border-slate-800/60">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-5 py-3">
                      <Skeleton className="h-4" />
                    </td>
                  ))}
                </tr>
              ))}
            {!isLoading && filtrados.length === 0 && (
              <tr>
                <td colSpan={5} className="p-0">
                  <EmptyState
                    icon={<FileText size={28} />}
                    title={busqueda ? 'Sin resultados' : 'Aún no hay documentos'}
                    description={
                      !busqueda && puedeEditar
                        ? 'Subí el primero con el botón "Subir documento".'
                        : undefined
                    }
                  />
                </td>
              </tr>
            )}
            {!isLoading &&
              filtrados.map((d) => (
                <FilaDocumento
                  key={d.id}
                  d={d}
                  puedeEditar={puedeEditar}
                  onEliminar={async () => {
                    const ok = await confirm({
                      title: `¿Eliminar "${d.nombre}"?`,
                      message: 'Esta acción no se puede deshacer.',
                      variant: 'danger',
                      confirmText: 'Eliminar',
                    });
                    if (ok) eliminar.mutate(d.id);
                  }}
                />
              ))}
          </tbody>
        </table>
      </div>

      {showNuevo && (
        <NuevoDocumentoModal
          onClose={() => setShowNuevo(false)}
          onSaved={() => {
            setShowNuevo(false);
            qc.invalidateQueries({ queryKey: ['documentos'] });
            toast({ type: 'success', title: 'Documento subido' });
          }}
        />
      )}
    </div>
  );
}

function FilaDocumento({
  d,
  puedeEditar,
  onEliminar,
}: {
  d: Documento;
  puedeEditar: boolean;
  onEliminar: () => void;
}) {
  const { estado, dias } = calcularEstado(d);
  // /uploads/* es servido por ServeStatic SIN el prefijo /api (nginx también
  // tiene location ^~ /uploads/). Antes ponía /api delante y daba 404.
  const url = d.archivoPath.startsWith('/uploads')
    ? d.archivoPath
    : `/uploads/documentos/${d.archivoPath}`;

  const tipoColor = d.tipo === 'PDF'
    ? 'from-rose-500 to-rose-600'
    : d.tipo === 'IMAGEN'
      ? 'from-blue-500 to-blue-600'
      : 'from-slate-500 to-slate-600';

  return (
    <tr className="border-b border-slate-50 dark:border-slate-800/60 last:border-0 hover:bg-violet-50/30 dark:hover:bg-violet-900/20">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tipoColor} text-white flex items-center justify-center shrink-0`}
          >
            {d.tipo === 'IMAGEN' ? <ImageIcon size={16} /> : <FileText size={16} />}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">
              {d.nombre}
            </div>
            {d.descripcion && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {d.descripcion}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-5 py-3 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
        {d.fechaEmision
          ? new Date(d.fechaEmision).toLocaleDateString('es-PE')
          : '—'}
      </td>
      <td className="px-5 py-3 text-xs tabular-nums">
        {d.fechaVencimiento ? (
          <>
            <div
              className={`font-semibold ${
                estado === 'vencido'
                  ? 'text-rose-700 dark:text-rose-300'
                  : estado === 'porVencer'
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-slate-700 dark:text-slate-200'
              }`}
            >
              {new Date(d.fechaVencimiento).toLocaleDateString('es-PE')}
            </div>
            {dias != null && (
              <div
                className={`text-[10px] mt-0.5 ${
                  estado === 'vencido'
                    ? 'text-rose-500'
                    : estado === 'porVencer'
                      ? 'text-amber-500'
                      : 'text-slate-400'
                }`}
              >
                {dias < 0
                  ? `vencido hace ${Math.abs(dias)}d`
                  : `${dias} días restantes`}
              </div>
            )}
          </>
        ) : (
          <span className="text-slate-400 dark:text-slate-500">sin caducidad</span>
        )}
      </td>
      <td className="px-5 py-3">
        <EstadoBadge estado={estado} />
      </td>
      <td className="px-5 py-3 text-right">
        <div className="inline-flex items-center gap-1">
          <a
            href={url}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-violet-600"
            title="Ver"
          >
            <ExternalLink size={13} />
          </a>
          <a
            href={url}
            download={d.archivoNombre || d.nombre}
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600"
            title="Descargar"
          >
            <Download size={13} />
          </a>
          {puedeEditar && (
            <button
              onClick={onEliminar}
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30"
              title="Eliminar"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function EstadoBadge({ estado }: { estado: Estado }) {
  const cfg: Record<Estado, { cls: string; label: string }> = {
    vigente: {
      cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      label: 'Vigente',
    },
    porVencer: {
      cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
      label: 'Por vencer',
    },
    vencido: {
      cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
      label: 'Vencido',
    },
    sinVencimiento: {
      cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      label: 'Sin caducidad',
    },
  };
  const c = cfg[estado];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${c.cls}`}
    >
      {c.label}
    </span>
  );
}

function NuevoDocumentoModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaEmision, setFechaEmision] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [alertaDiasAntes, setAlertaDiasAntes] = useState(30);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  const subir = async () => {
    if (!nombre.trim()) return setError('El nombre es obligatorio');
    if (!archivo) return setError('Selecciona un archivo');
    setSubiendo(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('archivo', archivo);
      fd.append('nombre', nombre.trim());
      if (descripcion) fd.append('descripcion', descripcion);
      if (fechaEmision) fd.append('fechaEmision', fechaEmision);
      if (fechaVencimiento) fd.append('fechaVencimiento', fechaVencimiento);
      fd.append('alertaDiasAntes', String(alertaDiasAntes));
      await api.post('/documentos', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al subir');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl animate-scale-in">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-hotel text-lg font-bold text-slate-900 dark:text-slate-100">
            Subir documento
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Nombre">
            <input
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Defensa civil 2026"
              className={inputCls}
            />
          </Field>
          <Field label="Descripción (opcional)">
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Detalle adicional"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de emisión">
              <input
                type="date"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Fecha de vencimiento">
              <input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Avisar antes (días)">
            <input
              type="number"
              min={1}
              max={365}
              value={alertaDiasAntes}
              onChange={(e) =>
                setAlertaDiasAntes(
                  Math.min(365, Math.max(1, Number(e.target.value) || 30)),
                )
              }
              className={inputCls}
            />
          </Field>
          <Field label="Archivo (PDF o imagen)">
            <label className="block border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center cursor-pointer hover:border-violet-400 transition">
              <Upload
                size={20}
                className="mx-auto mb-2 text-slate-400 dark:text-slate-500"
              />
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                className="hidden"
              />
              {archivo ? (
                <div className="text-sm text-slate-700 dark:text-slate-200 font-medium">
                  {archivo.name}
                </div>
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Clic para seleccionar (PDF, JPG, PNG, WEBP — máx 25MB)
                </div>
              )}
            </label>
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
            onClick={subir}
            disabled={subiendo}
            className="flex-1 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white py-2.5 rounded-xl font-semibold shadow-md disabled:opacity-40"
          >
            {subiendo ? 'Subiendo…' : 'Subir'}
          </button>
        </div>
      </div>
    </div>
  );
}

// helpers
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

function Chip({
  children,
  active,
  onClick,
  color = 'violet',
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  color?: 'violet' | 'emerald' | 'amber' | 'rose';
}) {
  const activeCls = {
    violet: 'bg-violet-600 text-white shadow-sm',
    emerald: 'bg-emerald-500 text-white shadow-sm',
    amber: 'bg-amber-500 text-white shadow-sm',
    rose: 'bg-rose-500 text-white shadow-sm',
  }[color];
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
        active
          ? activeCls
          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

function StatTile({
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
        <div className="text-[10px] uppercase tracking-widest opacity-90 font-semibold">
          {label}
        </div>
        <div className="text-2xl font-hotel font-bold mt-1 tabular-nums">{value}</div>
      </div>
    </div>
  );
}
