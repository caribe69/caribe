import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plus,
  X,
  Trash2,
  Pencil,
  Search,
  Camera,
  IdCard,
  UserCheck,
  Mail,
  Phone,
  ArrowRightLeft,
  History,
  Building,
  Building2,
  Check,
  BarChart3,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ThumbImg } from '@/lib/imageUrl';
import { useAuthStore, rolLabel } from '@/store/auth';
import { useToast } from '@/components/ToastProvider';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

interface Personal {
  id: number;
  sedeId?: number | null;
  dni: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string | null;
  fotoPerfil?: string | null;
  fotoDniFrente?: string | null;
  fotoDniReverso?: string | null;
  fechaNacimiento?: string | null;
  fechaIngreso: string;
  correo?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  cargo?: string | null;
  notas?: string | null;
  activo: boolean;
  usuarioId?: number | null;
  usuario?: {
    id: number;
    username: string;
    rol: string;
    activo: boolean;
    sedesAcceso?: { sedeId: number }[];
  } | null;
  sede?: { id: number; nombre: string } | null;
}

const ROLES = [
  'SUPERADMIN',
  'ADMIN_SEDE',
  'HOTELERO',
  'CAJERO',
  'LIMPIEZA',
  'LAVANDERIA',
] as const;

function edadDe(fechaNac?: string | null): number | null {
  if (!fechaNac) return null;
  const d = new Date(fechaNac);
  const hoy = new Date();
  let edad = hoy.getFullYear() - d.getFullYear();
  const m = hoy.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < d.getDate())) edad--;
  return edad;
}

export default function PersonalPage() {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const usuario = useAuthStore((s) => s.usuario);
  const puedeEditar =
    usuario?.rol === 'SUPERADMIN' || usuario?.rol === 'ADMIN_SEDE';

  const [showNuevo, setShowNuevo] = useState(false);
  const [editar, setEditar] = useState<Personal | null>(null);
  const [crearUsuarioFor, setCrearUsuarioFor] = useState<Personal | null>(null);
  const [transferirFor, setTransferirFor] = useState<Personal | null>(null);
  const [historialFor, setHistorialFor] = useState<Personal | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['personal'],
    queryFn: async () => (await api.get<Personal[]>('/personal')).data,
  });

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    let arr = data || [];
    if (q) {
      arr = arr.filter(
        (p) =>
          p.dni.includes(q) ||
          p.nombre.toLowerCase().includes(q) ||
          p.apellidoPaterno.toLowerCase().includes(q) ||
          p.apellidoMaterno?.toLowerCase().includes(q) ||
          p.correo?.toLowerCase().includes(q) ||
          p.cargo?.toLowerCase().includes(q),
      );
    }
    return arr;
  }, [data, busqueda]);

  const [eliminarFor, setEliminarFor] = useState<Personal | null>(null);

  return (
    <div className="space-y-4">
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
            placeholder="Buscar por DNI, nombre, correo, cargo..."
            className="w-full bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-violet-400"
          />
        </div>
        <div className="text-[11px] text-slate-400 ml-auto">
          {filtrados.length} de {data?.length || 0}
        </div>
        {puedeEditar && (
          <button
            onClick={() => setShowNuevo(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md shadow-violet-500/30 btn-press"
          >
            <Plus size={15} /> Nuevo personal
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>Persona</Th>
                <Th>DNI</Th>
                <Th>Cargo</Th>
                <Th>Contacto</Th>
                <Th>Usuario</Th>
                <Th align="right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-50 dark:border-slate-800/60"
                  >
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-5 py-3">
                        <Skeleton className="h-4" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!isLoading && filtrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState
                      icon={<Users size={28} />}
                      title={busqueda ? 'Sin resultados' : 'Aún no hay personal'}
                      description={
                        !busqueda && puedeEditar
                          ? 'Agrega el primero con el botón "Nuevo personal".'
                          : undefined
                      }
                    />
                  </td>
                </tr>
              )}
              {!isLoading &&
                filtrados.map((p) => (
                  <FilaPersonal
                    key={p.id}
                    p={p}
                    puedeEditar={puedeEditar}
                    onEditar={() => setEditar(p)}
                    onEliminar={() => setEliminarFor(p)}
                    onCrearUsuario={() => setCrearUsuarioFor(p)}
                    onHistorial={() => setHistorialFor(p)}
                  />
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNuevo && (
        <PersonalModal
          onClose={() => setShowNuevo(false)}
          onSaved={() => {
            setShowNuevo(false);
            qc.invalidateQueries({ queryKey: ['personal'] });
            toast({ type: 'success', title: 'Personal creado' });
          }}
        />
      )}
      {editar && (
        <PersonalModal
          personal={editar}
          onClose={() => setEditar(null)}
          onSaved={() => {
            setEditar(null);
            qc.invalidateQueries({ queryKey: ['personal'] });
            toast({ type: 'success', title: 'Personal actualizado' });
          }}
        />
      )}
      {crearUsuarioFor && (
        <CrearUsuarioModal
          personal={crearUsuarioFor}
          onClose={() => setCrearUsuarioFor(null)}
          onSaved={() => {
            setCrearUsuarioFor(null);
            qc.invalidateQueries({ queryKey: ['personal'] });
            toast({ type: 'success', title: 'Usuario creado y vinculado' });
          }}
        />
      )}
      {transferirFor && (
        <TransferirModal
          personal={transferirFor}
          onClose={() => setTransferirFor(null)}
          onSaved={(t) => {
            setTransferirFor(null);
            qc.invalidateQueries({ queryKey: ['personal'] });
            toast({
              type: 'success',
              title: 'Personal transferido',
              description: `Ahora pertenece a ${t.hastaSede?.nombre || 'la nueva sede'}.`,
            });
          }}
        />
      )}
      {historialFor && (
        <HistorialModal
          personal={historialFor}
          onClose={() => setHistorialFor(null)}
        />
      )}
      {eliminarFor && (
        <EliminarModal
          personal={eliminarFor}
          onClose={() => setEliminarFor(null)}
          onDone={() => {
            setEliminarFor(null);
            qc.invalidateQueries({ queryKey: ['personal'] });
          }}
        />
      )}
    </div>
  );
}

function FilaPersonal({
  p,
  puedeEditar,
  onEditar,
  onEliminar,
  onCrearUsuario,
  onHistorial,
}: {
  p: Personal;
  puedeEditar: boolean;
  onEditar: () => void;
  onEliminar: () => void;
  onCrearUsuario: () => void;
  onHistorial: () => void;
}) {
  const edad = edadDe(p.fechaNacimiento);
  const nSedesAcceso = p.usuario?.sedesAcceso?.length ?? 0;
  const esMultisede = nSedesAcceso >= 2;
  const initials =
    (p.nombre?.[0] || '').toUpperCase() +
    (p.apellidoPaterno?.[0] || '').toUpperCase();

  return (
    <tr className="border-b border-slate-50 dark:border-slate-800/60 last:border-0 hover:bg-violet-50/30 dark:hover:bg-violet-900/20">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          {p.fotoPerfil ? (
            <ThumbImg
              src={p.fotoPerfil.startsWith('/uploads') ? p.fotoPerfil : `/uploads/personal/${p.fotoPerfil}`}
              alt=""
              className="w-10 h-10 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white font-bold flex items-center justify-center shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-semibold text-slate-800 dark:text-slate-100">
              {p.nombre} {p.apellidoPaterno} {p.apellidoMaterno || ''}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {p.cargo || '—'}
              {edad != null && ` · ${edad} años`}
              {p.fechaIngreso &&
                ` · ingreso ${new Date(p.fechaIngreso).toLocaleDateString('es-PE')}`}
            </div>
          </div>
        </div>
      </td>
      <td className="px-5 py-3 font-mono text-xs text-slate-700 dark:text-slate-200 tabular-nums">
        {p.dni}
      </td>
      <td className="px-5 py-3 text-xs text-slate-600 dark:text-slate-300">
        {p.cargo || <span className="text-slate-400">—</span>}
      </td>
      <td className="px-5 py-3 text-xs text-slate-600 dark:text-slate-300">
        {p.correo && (
          <div className="flex items-center gap-1.5">
            <Mail size={11} className="opacity-60" /> {p.correo}
          </div>
        )}
        {p.telefono && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <Phone size={11} className="opacity-60" /> {p.telefono}
          </div>
        )}
        {!p.correo && !p.telefono && <span className="text-slate-400">—</span>}
      </td>
      <td className="px-5 py-3 text-xs">
        {p.usuario ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
              <UserCheck size={10} /> @{p.usuario.username} ·{' '}
              {rolLabel(p.usuario.rol)}
            </span>
            {esMultisede && (
              <span
                className="inline-flex items-center gap-1 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                title="Puede iniciar sesión en varias sedes"
              >
                <Building2 size={10} /> {nSedesAcceso} sedes
              </span>
            )}
          </div>
        ) : (
          <button
            onClick={onCrearUsuario}
            disabled={!puedeEditar}
            className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-violet-100 dark:hover:bg-violet-900/40 text-slate-700 dark:text-slate-300 hover:text-violet-700 dark:hover:text-violet-300 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
          >
            <Plus size={10} /> Crear usuario
          </button>
        )}
      </td>
      <td className="px-5 py-3 text-right">
        {puedeEditar && (
          <div className="inline-flex items-center gap-1">
            <button
              onClick={onHistorial}
              className="inline-flex items-center justify-center text-slate-400 hover:text-violet-600 dark:hover:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 w-7 h-7 rounded-lg"
              title="Historial completo"
            >
              <History size={13} />
            </button>
            <button
              onClick={onEditar}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1.5 rounded-lg"
            >
              <Pencil size={13} /> Editar
            </button>
            <button
              onClick={onEliminar}
              className="inline-flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 w-7 h-7 rounded-lg"
              title="Eliminar"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

function PersonalModal({
  personal,
  onClose,
  onSaved,
}: {
  personal?: Personal;
  onClose: () => void;
  onSaved: () => void;
}) {
  const esEdicion = !!personal;
  const usuarioActual = useAuthStore((s) => s.usuario);
  const multisedeRef = useRef<{ save: () => Promise<void> } | null>(null);
  const [form, setForm] = useState({
    dni: personal?.dni || '',
    nombre: personal?.nombre || '',
    apellidoPaterno: personal?.apellidoPaterno || '',
    apellidoMaterno: personal?.apellidoMaterno || '',
    fechaNacimiento: personal?.fechaNacimiento?.slice(0, 10) || '',
    fechaIngreso:
      personal?.fechaIngreso?.slice(0, 10) ||
      new Date().toISOString().slice(0, 10),
    correo: personal?.correo || '',
    telefono: personal?.telefono || '',
    cargo: personal?.cargo || '',
    direccion: personal?.direccion || '',
    notas: personal?.notas || '',
  });
  const [fotoPerfil, setFotoPerfil] = useState<File | null>(null);
  const [fotoDniFrente, setFotoDniFrente] = useState<File | null>(null);
  const [fotoDniReverso, setFotoDniReverso] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (
      !form.dni ||
      !form.nombre ||
      !form.apellidoPaterno ||
      !form.telefono.trim()
    )
      return setError(
        'DNI, nombre, apellido paterno y teléfono son obligatorios',
      );
    setGuardando(true);
    setError(null);
    try {
      let id = personal?.id;
      if (esEdicion) {
        // Al editar, los opcionales vacíos van como null para poder LIMPIARLOS
        // (undefined = "no cambiar" dejaba el valor viejo).
        await api.patch(`/personal/${id}`, {
          nombre: form.nombre,
          apellidoPaterno: form.apellidoPaterno,
          apellidoMaterno: form.apellidoMaterno.trim() || null,
          fechaNacimiento: form.fechaNacimiento || null,
          fechaIngreso: form.fechaIngreso || undefined,
          correo: form.correo.trim() || null,
          telefono: form.telefono.trim(),
          cargo: form.cargo.trim() || null,
          direccion: form.direccion.trim() || null,
          notas: form.notas.trim() || null,
        });
      } else {
        const { data } = await api.post('/personal', {
          dni: form.dni,
          nombre: form.nombre,
          apellidoPaterno: form.apellidoPaterno,
          apellidoMaterno: form.apellidoMaterno || undefined,
          fechaNacimiento: form.fechaNacimiento || undefined,
          fechaIngreso: form.fechaIngreso || undefined,
          correo: form.correo || undefined,
          telefono: form.telefono || undefined,
          cargo: form.cargo || undefined,
          direccion: form.direccion || undefined,
          notas: form.notas || undefined,
        });
        id = data.id;
      }
      // Subir fotos si las hay
      if (id && (fotoPerfil || fotoDniFrente || fotoDniReverso)) {
        const fd = new FormData();
        if (fotoPerfil) fd.append('fotoPerfil', fotoPerfil);
        if (fotoDniFrente) fd.append('fotoDniFrente', fotoDniFrente);
        if (fotoDniReverso) fd.append('fotoDniReverso', fotoDniReverso);
        await api.post(`/personal/${id}/fotos`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      // Guardar acceso multisede (si la sección está presente)
      if (multisedeRef.current) {
        await multisedeRef.current.save();
      }
      onSaved();
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Error al guardar',
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="font-hotel text-lg font-bold text-slate-900 dark:text-slate-100">
            {esEdicion ? 'Editar personal' : 'Nuevo personal'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="DNI *">
              <input
                disabled={esEdicion}
                value={form.dni}
                onChange={(e) => setForm({ ...form, dni: e.target.value })}
                placeholder="12345678"
                className={`${inputCls} ${esEdicion ? 'opacity-60' : ''}`}
              />
            </Field>
            <Field label="Cargo (opcional)">
              <input
                value={form.cargo}
                onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                placeholder="Ej: Recepcionista"
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Nombre *">
              <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Apellido paterno *">
              <input
                value={form.apellidoPaterno}
                onChange={(e) =>
                  setForm({ ...form, apellidoPaterno: e.target.value })
                }
                className={inputCls}
              />
            </Field>
            <Field label="Apellido materno (opcional)">
              <input
                value={form.apellidoMaterno}
                onChange={(e) =>
                  setForm({ ...form, apellidoMaterno: e.target.value })
                }
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de nacimiento (opcional)">
              <input
                type="date"
                value={form.fechaNacimiento}
                onChange={(e) =>
                  setForm({ ...form, fechaNacimiento: e.target.value })
                }
                className={inputCls}
              />
            </Field>
            <Field label="Fecha de ingreso">
              <input
                type="date"
                value={form.fechaIngreso}
                onChange={(e) =>
                  setForm({ ...form, fechaIngreso: e.target.value })
                }
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Correo (opcional)">
              <input
                type="email"
                value={form.correo}
                onChange={(e) => setForm({ ...form, correo: e.target.value })}
                placeholder="No es obligatorio"
                className={inputCls}
              />
            </Field>
            <Field label="Teléfono *">
              <input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="Ej: 999888777"
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Dirección (opcional)">
            <input
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              className={inputCls}
            />
          </Field>

          {/* Fotos */}
          <div>
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
              Fotos
            </div>
            <div className="grid grid-cols-3 gap-2">
              <FotoUpload
                label="Foto perfil"
                icon={<Camera size={14} />}
                file={fotoPerfil}
                actualUrl={personal?.fotoPerfil}
                onChange={setFotoPerfil}
              />
              <FotoUpload
                label="DNI frente"
                icon={<IdCard size={14} />}
                file={fotoDniFrente}
                actualUrl={personal?.fotoDniFrente}
                onChange={setFotoDniFrente}
              />
              <FotoUpload
                label="DNI reverso"
                icon={<IdCard size={14} />}
                file={fotoDniReverso}
                actualUrl={personal?.fotoDniReverso}
                onChange={setFotoDniReverso}
              />
            </div>
          </div>

          {/* Acceso multisede — al editar, si tiene usuario y soy admin/superadmin */}
          {esEdicion &&
            personal?.usuario &&
            (usuarioActual?.rol === 'SUPERADMIN' ||
              usuarioActual?.rol === 'ADMIN_SEDE') && (
              <MultisedeSection personal={personal} ref={multisedeRef} />
            )}

          {esEdicion && personal && !personal.usuario && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-start gap-2">
              <Building2 size={14} className="mt-0.5 text-slate-400 shrink-0" />
              <span>
                Para dar <b>acceso multisede</b> primero crea o vincula un
                usuario a esta persona (columna "Usuario"). El acceso multisede
                usa esas credenciales.
              </span>
            </div>
          )}

          {error && (
            <div className="text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-lg p-2.5">
              {error}
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-2 sticky bottom-0">
          <button
            onClick={onClose}
            className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="flex-[2] bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white py-2.5 rounded-xl font-semibold shadow-md disabled:opacity-40"
          >
            {guardando
              ? 'Guardando…'
              : esEdicion
                ? 'Guardar cambios'
                : 'Crear personal'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FotoUpload({
  label,
  icon,
  file,
  actualUrl,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  file: File | null;
  actualUrl?: string | null;
  onChange: (f: File | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const display = preview || (actualUrl ? actualUrl : null);
  return (
    <label className="block border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center cursor-pointer hover:border-violet-400 transition aspect-[4/3] flex flex-col items-center justify-center overflow-hidden relative">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0] || null;
          onChange(f);
          if (f) {
            const url = URL.createObjectURL(f);
            setPreview(url);
          }
        }}
        className="hidden"
      />
      {display ? (
        <img
          src={display}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <>
          <div className="text-slate-400 dark:text-slate-500 mb-1">{icon}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-widest">
            {label}
          </div>
        </>
      )}
      {(file || display) && (
        <div className="absolute bottom-1 left-1 right-1 bg-black/60 text-white text-[9px] py-0.5 rounded text-center">
          Cambiar
        </div>
      )}
    </label>
  );
}

function CrearUsuarioModal({
  personal,
  onClose,
  onSaved,
}: {
  personal: Personal;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [username, setUsername] = useState(personal.dni);
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<(typeof ROLES)[number]>('CAJERO');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [forzarCrearNuevo, setForzarCrearNuevo] = useState(false);

  // Buscar si ya existe un usuario que pueda vincularse (mismo email o DNI)
  const candidatoQ = useQuery<any | null>({
    queryKey: ['personal', personal.id, 'usuario-existente'],
    queryFn: async () =>
      (await api.get(`/personal/${personal.id}/usuario-existente`)).data,
  });
  const candidato = candidatoQ.data;
  const mostrarFormularioCrear = forzarCrearNuevo || !candidato;

  const vincular = async () => {
    if (!candidato) return;
    setGuardando(true);
    setError(null);
    try {
      await api.post(`/personal/${personal.id}/vincular-usuario`, {
        usuarioId: candidato.id,
      });
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al vincular');
    } finally {
      setGuardando(false);
    }
  };

  const submit = async () => {
    if (password.length < 6)
      return setError('La contraseña debe tener al menos 6 caracteres');
    setGuardando(true);
    setError(null);
    try {
      await api.post(`/personal/${personal.id}/crear-usuario`, {
        username: username.trim() || undefined,
        password,
        rol,
      });
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
            {candidato && !forzarCrearNuevo
              ? 'Vincular usuario existente'
              : 'Crear usuario del sistema'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Personal:{' '}
            <b className="text-slate-900 dark:text-slate-100">
              {personal.nombre} {personal.apellidoPaterno}
            </b>{' '}
            (DNI {personal.dni})
          </div>

          {/* Card: usuario existente detectado */}
          {candidato && !forzarCrearNuevo && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-bold flex items-center justify-center shrink-0">
                  {candidato.nombre?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300 mb-1">
                    Usuario encontrado
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {candidato.nombre}
                  </div>
                  <div className="text-[12px] text-slate-600 dark:text-slate-300 font-mono">
                    @{candidato.username} · {rolLabel(candidato.rol)}
                  </div>
                  {candidato.email && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {candidato.email}
                    </div>
                  )}
                  {candidato.sede && (
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Sede: {candidato.sede.nombre}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-[11px] text-emerald-800 dark:text-emerald-200 mt-3 leading-snug">
                Detectamos un usuario ya creado que coincide por <b>email</b> o
                por <b>DNI</b> como username. Podés vincularlo (mantiene su
                contraseña y rol actuales) o crear uno completamente nuevo con
                otros datos.
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={vincular}
                  disabled={guardando}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white py-2 rounded-lg text-sm font-semibold shadow-md disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
                >
                  <UserCheck size={14} />
                  {guardando ? 'Vinculando…' : 'Vincular este usuario'}
                </button>
                <button
                  onClick={() => setForzarCrearNuevo(true)}
                  className="px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-xs font-medium"
                >
                  Crear otro
                </button>
              </div>
            </div>
          )}

          {/* Formulario de crear (modo normal o al apretar 'Crear otro') */}
          {mostrarFormularioCrear && (
            <>
              {forzarCrearNuevo && (
                <button
                  onClick={() => setForzarCrearNuevo(false)}
                  className="text-[11px] text-violet-600 dark:text-violet-300 hover:underline"
                >
                  ← Volver y vincular existente
                </button>
              )}
              <Field label="Username">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={`Default: ${personal.dni}`}
                  className={inputCls}
                />
              </Field>
              <Field label="Contraseña inicial (mín. 6)">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Rol">
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value as any)}
                  className={inputCls}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {rolLabel(r)}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}

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
          {mostrarFormularioCrear && (
            <button
              onClick={submit}
              disabled={guardando}
              className="flex-1 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white py-2.5 rounded-xl font-semibold shadow-md disabled:opacity-40"
            >
              {guardando ? 'Creando…' : 'Crear usuario'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// helpers
// ───────────────────────────────────────────────────────────
// MODAL: Eliminar / Anular personal (requiere clave de eliminación)
// ───────────────────────────────────────────────────────────
function EliminarModal({
  personal,
  onClose,
  onDone,
}: {
  personal: Personal;
  onClose: () => void;
  onDone: () => void;
}) {
  const { show: toast } = useToast();
  const [clave, setClave] = useState('');
  const [showClave, setShowClave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tieneHistorial, setTieneHistorial] = useState(false);
  const [procesando, setProcesando] = useState(false);

  const nombre = `${personal.nombre} ${personal.apellidoPaterno}`;

  const eliminar = async () => {
    if (!clave.trim()) return setError('Ingresa la clave de eliminación.');
    setError(null);
    setProcesando(true);
    try {
      await api.delete(`/personal/${personal.id}`, { data: { clave } });
      toast({ type: 'success', title: 'Personal eliminado' });
      onDone();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'No se pudo eliminar';
      // Si el motivo es historial, ofrecemos anular
      if (/historial/i.test(msg)) setTieneHistorial(true);
      setError(msg);
    } finally {
      setProcesando(false);
    }
  };

  const anular = async () => {
    if (!clave.trim()) return setError('Ingresa la clave de eliminación.');
    setError(null);
    setProcesando(true);
    try {
      await api.post(`/personal/${personal.id}/anular`, { clave });
      toast({
        type: 'success',
        title: 'Personal anulado',
        description: 'Ya no podrá iniciar sesión; su historial se conserva.',
      });
      onDone();
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se pudo anular');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-hotel text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Trash2 size={18} className="text-rose-600" /> Eliminar personal
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Vas a eliminar a <b>{nombre}</b>
            {personal.usuario && (
              <>
                {' '}
                y su usuario <b>@{personal.usuario.username}</b>
              </>
            )}
            . Esta acción no se puede deshacer.
          </p>

          <div>
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Clave de eliminación
            </label>
            <div className="relative mt-1">
              <input
                type={showClave ? 'text' : 'password'}
                autoFocus
                className={`${inputCls} pr-10`}
                value={clave}
                placeholder="La clave definida en Configuración"
                onChange={(e) => {
                  setClave(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !tieneHistorial) eliminar();
                }}
              />
              <button
                type="button"
                onClick={() => setShowClave((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-600"
                tabIndex={-1}
              >
                {showClave ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-lg p-2.5">
              {error}
            </div>
          )}

          {tieneHistorial && (
            <div className="text-[12px] text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-2.5">
              Este personal tiene historial, por eso no se puede eliminar. Puedes{' '}
              <b>anularlo</b>: no podrá iniciar sesión, pero se conservan sus
              ventas/alquileres.
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
          {tieneHistorial ? (
            <button
              onClick={anular}
              disabled={procesando}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl font-semibold shadow-md disabled:opacity-40 btn-press"
            >
              {procesando ? 'Anulando…' : 'Anular en su lugar'}
            </button>
          ) : (
            <button
              onClick={eliminar}
              disabled={procesando}
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl font-semibold shadow-md disabled:opacity-40 btn-press"
            >
              {procesando ? 'Eliminando…' : 'Eliminar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  // Marcadores en el texto del label: " *" = obligatorio, "(opcional)" = opcional
  const req = / \*$/.test(label);
  const opt = /\(opcional\)/i.test(label);
  const base = label.replace(/ \*$/, '').replace(/\s*\(opcional\)/i, '');
  return (
    <div>
      <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
        {base}
        {req && <span className="text-rose-500 ml-0.5">*</span>}
        {opt && (
          <span className="text-slate-400 dark:text-slate-500 font-normal normal-case tracking-normal ml-1">
            (opcional)
          </span>
        )}
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

// ════════════════════════════════════════════════════════════
// MODAL: Transferir personal a otra sede
// ════════════════════════════════════════════════════════════
function TransferirModal({
  personal,
  onClose,
  onSaved,
}: {
  personal: Personal;
  onClose: () => void;
  onSaved: (t: any) => void;
}) {
  const sedesQ = useQuery({
    queryKey: ['sedes', 'all'],
    queryFn: async () => (await api.get<any[]>('/sedes')).data,
  });
  const [haciaSedeId, setHaciaSedeId] = useState<number | null>(null);
  const [motivo, setMotivo] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const normalizar = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim()
      .toLowerCase();
  const FRASE = 'si acepto';
  const confirmacionOk = normalizar(confirmText) === normalizar(FRASE);

  const sedesDisponibles = (sedesQ.data || []).filter(
    (s: any) => s.id !== personal.sedeId && s.activa,
  );

  const submit = async () => {
    if (!haciaSedeId) return setError('Selecciona la sede destino');
    if (motivo.trim().length < 3) return setError('Motivo es obligatorio');
    if (!confirmacionOk) return setError('Escribe la frase de confirmación');
    setEnviando(true);
    setError(null);
    try {
      const { data } = await api.post(`/personal/${personal.id}/transferir`, {
        haciaSedeId,
        motivo: motivo.trim(),
      });
      onSaved(data.transferencia);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al transferir');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={18} className="text-amber-600 dark:text-amber-400" />
            <h2 className="font-hotel text-lg font-bold text-slate-900 dark:text-slate-100">
              Transferir personal
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                  {personal.nombre} {personal.apellidoPaterno} {personal.apellidoMaterno || ''}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  DNI {personal.dni}
                </div>
              </div>
              <div className="text-right text-[11px]">
                <div className="text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sede actual</div>
                <div className="font-semibold text-slate-700 dark:text-slate-200">
                  {personal.sede?.nombre || 'Sin sede'}
                </div>
              </div>
            </div>
          </div>

          <Field label="Sede destino">
            <select
              value={haciaSedeId || ''}
              onChange={(e) => setHaciaSedeId(Number(e.target.value) || null)}
              className={inputCls}
            >
              <option value="">— Selecciona —</option>
              {sedesDisponibles.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Motivo de la transferencia">
            <textarea
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Cobertura permanente · cierre temporal de sede · solicitud propia"
              className={inputCls}
            />
          </Field>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
            <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800/50 rounded-lg p-2.5 leading-snug flex gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <div>
                Esta acción cambia la sede del personal{personal.usuario ? ' y de su usuario del sistema' : ''}.
                Si el cajero tiene un turno de caja abierto, primero debe cerrarlo.
                Para confirmar escribe:
                <div className="font-mono text-[12px] font-bold text-rose-800 dark:text-rose-200 mt-1 select-all">
                  {FRASE}
                </div>
              </div>
            </div>
            <input
              type="text"
              autoComplete="off"
              placeholder={`Escribe: ${FRASE}`}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className={`w-full mt-2 px-3 py-2 rounded-lg text-sm font-mono border-2 transition focus:outline-none ${
                confirmacionOk
                  ? 'border-emerald-400 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200'
                  : 'border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100'
              }`}
            />
          </div>

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
            disabled={enviando || !haciaSedeId || motivo.trim().length < 3 || !confirmacionOk}
            className="flex-[2] bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white py-2.5 rounded-xl font-semibold shadow-md disabled:opacity-40"
          >
            {enviando ? 'Transfiriendo…' : 'Confirmar transferencia'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MODAL: Historial completo del personal (todas las sedes)
// ════════════════════════════════════════════════════════════
interface HistorialResp {
  personal: Personal;
  transferencias: Array<{
    id: number;
    desdeSede?: { id: number; nombre: string } | null;
    hastaSede: { id: number; nombre: string };
    motivo: string;
    fechaEfectiva: string;
    transferidoPor: { id: number; nombre: string; username: string };
  }>;
  porSede: Array<{
    sede: { id: number; nombre: string };
    ventas: { cantidad: number; total: number };
    alquileres: { cantidad: number; total: number };
    turnosCerrados: number;
    ingresoTotal: number;
  }>;
  totales: {
    ventas: number;
    alquileres: number;
    ingresos: number;
    turnosCerrados: number;
  };
}

function HistorialModal({
  personal,
  onClose,
}: {
  personal: Personal;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery<HistorialResp>({
    queryKey: ['personal', personal.id, 'historial'],
    queryFn: async () =>
      (await api.get(`/personal/${personal.id}/historial-completo`)).data,
  });

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-2">
            <History size={18} className="text-violet-600 dark:text-violet-400" />
            <div>
              <h2 className="font-hotel text-lg font-bold text-slate-900 dark:text-slate-100">
                Historial completo
              </h2>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {personal.nombre} {personal.apellidoPaterno} · DNI {personal.dni}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1">
            <X size={18} />
          </button>
        </div>

        {isLoading && (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            Cargando historial…
          </div>
        )}

        {!isLoading && data && (
          <div className="p-5 space-y-5">
            {/* Totales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Kpi color="violet" label="Ingresos" value={`S/ ${data.totales.ingresos.toFixed(0)}`} />
              <Kpi color="emerald" label="Alquileres" value={data.totales.alquileres} />
              <Kpi color="amber" label="Ventas" value={data.totales.ventas} />
              <Kpi color="blue" label="Turnos cerrados" value={data.totales.turnosCerrados} />
            </div>

            {/* Línea de tiempo de transferencias */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ArrowRightLeft size={14} className="text-amber-600 dark:text-amber-400" />
                <h3 className="text-[12px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-200">
                  Transferencias ({data.transferencias.length})
                </h3>
              </div>
              {data.transferencias.length === 0 ? (
                <div className="text-[12px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3">
                  Nunca ha sido transferido. Sede actual:{' '}
                  <b>{personal.sede?.nombre || '—'}</b>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.transferencias.map((t) => (
                    <div
                      key={t.id}
                      className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5"
                    >
                      <div className="flex items-center gap-2 flex-wrap text-[12px]">
                        <span className="font-mono text-slate-400 dark:text-slate-500">
                          {new Date(t.fechaEfectiva).toLocaleDateString('es-PE')}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] uppercase tracking-widest font-bold">
                          <Building size={10} /> {t.desdeSede?.nombre || '—'}
                        </span>
                        <ArrowRightLeft size={11} className="text-amber-600" />
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] uppercase tracking-widest font-bold">
                          <Building size={10} /> {t.hastaSede.nombre}
                        </span>
                      </div>
                      <div className="text-[12px] text-slate-700 dark:text-slate-200 mt-1.5">
                        <i>"{t.motivo}"</i>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                        Realizado por {t.transferidoPor.nombre} (@{t.transferidoPor.username})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Métricas por sede */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={14} className="text-violet-600 dark:text-violet-400" />
                <h3 className="text-[12px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-200">
                  Actividad por sede
                </h3>
              </div>
              {data.porSede.length === 0 ? (
                <div className="text-[12px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3">
                  Sin actividad registrada (sin usuario vinculado o sin operaciones).
                </div>
              ) : (
                <div className="space-y-2">
                  {data.porSede.map((row) => {
                    const esActual = row.sede.id === personal.sedeId;
                    return (
                      <div
                        key={row.sede.id}
                        className={`rounded-lg p-3 border ${
                          esActual
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Building size={14} className={esActual ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'} />
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {row.sede.nombre}
                            </div>
                            {esActual && (
                              <span className="text-[9px] uppercase tracking-widest font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded">
                                Sede actual
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500">
                              Total
                            </div>
                            <div className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                              S/ {row.ingresoTotal.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                          <KV k="Alquileres" v={`${row.alquileres.cantidad} · S/ ${row.alquileres.total.toFixed(0)}`} />
                          <KV k="Ventas" v={`${row.ventas.cantidad} · S/ ${row.ventas.total.toFixed(0)}`} />
                          <KV k="Turnos cerrados" v={String(row.turnosCerrados)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({
  color,
  label,
  value,
}: {
  color: 'violet' | 'emerald' | 'amber' | 'blue';
  label: string;
  value: React.ReactNode;
}) {
  const map = {
    violet: 'from-violet-500 to-violet-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    blue: 'from-blue-500 to-blue-600',
  };
  return (
    <div className={`rounded-xl p-3 bg-gradient-to-br ${map[color]} text-white`}>
      <div className="text-[10px] uppercase tracking-widest opacity-90 font-semibold">
        {label}
      </div>
      <div className="text-xl font-hotel font-bold mt-0.5 tabular-nums">
        {value}
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {k}
      </div>
      <div className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
        {v}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// MODAL: Acceso multisede — sedes donde el usuario puede iniciar sesión
// ───────────────────────────────────────────────────────────
interface SedeItem {
  id: number;
  nombre: string;
  sedePadreId?: number | null;
  _count?: { edificios: number };
}

// Sección embebida en el formulario de editar personal: da acceso multisede
// (sedes donde el usuario vinculado puede iniciar sesión). Se guarda junto con
// el botón principal "Guardar cambios" (vía ref → save()).
const MultisedeSection = forwardRef<
  { save: () => Promise<void> },
  { personal: Personal }
>(function MultisedeSection({ personal }, ref) {
  const qc = useQueryClient();
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [habilitado, setHabilitado] = useState(false);
  const [cargado, setCargado] = useState(false);

  const { data: sedes } = useQuery({
    queryKey: ['sedes'],
    queryFn: async () => (await api.get<SedeItem[]>('/sedes')).data,
  });

  // Solo hojas (edificios / sedes normales); los agrupadores no son operativos.
  const nombreSedeById = new Map<number, string>(
    (sedes || []).map((s) => [s.id, s.nombre]),
  );
  const sedesHoja = (sedes || []).filter(
    (s) => !((s._count?.edificios ?? 0) > 0),
  );

  const { data: acceso } = useQuery({
    queryKey: ['personal', personal.id, 'sedes-acceso'],
    queryFn: async () =>
      (
        await api.get<{ sedeIds: number[]; multisede: boolean }>(
          `/personal/${personal.id}/sedes-acceso`,
        )
      ).data,
  });

  // Inicializa una vez con lo que ya tenía (o su sede base)
  useMemo(() => {
    if (cargado || !acceso) return;
    const inicial = new Set<number>(acceso.sedeIds || []);
    if (personal.sedeId) inicial.add(personal.sedeId);
    setSeleccion(inicial);
    setHabilitado(!!acceso.multisede);
    setCargado(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceso]);

  const toggle = (id: number) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Guardado disparado por el botón principal del formulario. Lanza error si
  // hay algo inválido (lo captura el modal padre y lo muestra).
  useImperativeHandle(
    ref,
    () => ({
      save: async () => {
        const ids = habilitado
          ? Array.from(seleccion)
          : personal.sedeId
            ? [personal.sedeId]
            : [];
        if (habilitado && ids.length < 2) {
          throw new Error('Marca al menos 2 sedes para el acceso multisede.');
        }
        await api.post(`/personal/${personal.id}/sedes-acceso`, {
          sedeIds: ids,
        });
        qc.invalidateQueries({
          queryKey: ['personal', personal.id, 'sedes-acceso'],
        });
      },
    }),
    [habilitado, seleccion, personal, qc],
  );

  return (
    <div className="rounded-xl border border-violet-200 dark:border-violet-800/50 bg-violet-50/40 dark:bg-violet-900/10 p-3">
      <label className="flex items-start gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={habilitado}
          onChange={(e) => {
            setHabilitado(e.target.checked);
            // Al activar, asegura que su sede base quede marcada
            if (e.target.checked && personal.sedeId) {
              setSeleccion((prev) => new Set(prev).add(personal.sedeId!));
            }
          }}
          className="mt-0.5 w-4 h-4 accent-violet-600"
        />
        <div className="flex-1">
          <div className="text-sm font-semibold text-violet-900 dark:text-violet-100 flex items-center gap-1.5">
            <Building2 size={14} /> Acceso multisede
          </div>
          <div className="text-[11px] text-violet-700 dark:text-violet-300 mt-0.5 leading-snug">
            Permite que{' '}
            {personal.usuario ? `@${personal.usuario.username}` : 'esta persona'}{' '}
            inicie sesión en <b>varias sedes</b> con las mismas credenciales.
            Aparecerá en el personal de todas ellas y elegirá la sede al entrar.
          </div>
        </div>
      </label>

      {habilitado && (
        <div className="mt-3 pt-3 border-t border-violet-200 dark:border-violet-800/50">
          <div className="text-[10px] uppercase tracking-widest font-bold text-violet-800 dark:text-violet-200 mb-1.5">
            Sedes con acceso
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto scroll-premium">
            {sedesHoja.map((s) => {
              const marcada = seleccion.has(s.id);
              const esBase = s.id === personal.sedeId;
              const etiqueta = s.sedePadreId
                ? `${nombreSedeById.get(s.sedePadreId) ?? ''} · ${s.nombre}`
                : s.nombre;
              return (
                <label
                  key={s.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition ${
                    marcada
                      ? 'border-violet-300 dark:border-violet-700 bg-white dark:bg-violet-900/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={marcada}
                    onChange={() => toggle(s.id)}
                    disabled={esBase}
                    className="w-4 h-4 accent-violet-600 disabled:opacity-60"
                  />
                  <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                    {etiqueta}
                  </span>
                  {esBase && (
                    <span
                      className="text-[9px] uppercase tracking-widest font-bold text-slate-400"
                      title="La sede base siempre queda con acceso"
                    >
                      sede base
                    </span>
                  )}
                  {marcada && <Check size={14} className="text-violet-600" />}
                </label>
              );
            })}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            {seleccion.size >= 2
              ? `Tendrá acceso a ${seleccion.size} sedes. Se guarda con "Guardar cambios".`
              : 'Marca al menos 2 sedes.'}
          </div>
        </div>
      )}
    </div>
  );
});
