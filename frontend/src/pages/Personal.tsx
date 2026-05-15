import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useDialog } from '@/components/ConfirmProvider';
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
  } | null;
  sede?: { id: number; nombre: string } | null;
}

const ROLES = ['SUPERADMIN', 'ADMIN_SEDE', 'HOTELERO', 'CAJERO', 'LIMPIEZA'] as const;

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
  const { confirm } = useDialog();
  const usuario = useAuthStore((s) => s.usuario);
  const puedeEditar =
    usuario?.rol === 'SUPERADMIN' || usuario?.rol === 'ADMIN_SEDE';

  const [showNuevo, setShowNuevo] = useState(false);
  const [editar, setEditar] = useState<Personal | null>(null);
  const [crearUsuarioFor, setCrearUsuarioFor] = useState<Personal | null>(null);
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

  const eliminar = useMutation({
    mutationFn: async (id: number) => api.delete(`/personal/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal'] });
      toast({ type: 'success', title: 'Personal eliminado' });
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
                    onEliminar={async () => {
                      const ok = await confirm({
                        title: `¿Eliminar a ${p.nombre} ${p.apellidoPaterno}?`,
                        message: 'Esta acción no se puede deshacer.',
                        variant: 'danger',
                        confirmText: 'Eliminar',
                      });
                      if (ok) eliminar.mutate(p.id);
                    }}
                    onCrearUsuario={() => setCrearUsuarioFor(p)}
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
    </div>
  );
}

function FilaPersonal({
  p,
  puedeEditar,
  onEditar,
  onEliminar,
  onCrearUsuario,
}: {
  p: Personal;
  puedeEditar: boolean;
  onEditar: () => void;
  onEliminar: () => void;
  onCrearUsuario: () => void;
}) {
  const edad = edadDe(p.fechaNacimiento);
  const initials =
    (p.nombre?.[0] || '').toUpperCase() +
    (p.apellidoPaterno?.[0] || '').toUpperCase();

  return (
    <tr className="border-b border-slate-50 dark:border-slate-800/60 last:border-0 hover:bg-violet-50/30 dark:hover:bg-violet-900/20">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          {p.fotoPerfil ? (
            <img
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
          <span className="inline-flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
            <UserCheck size={10} /> @{p.usuario.username} · {p.usuario.rol}
          </span>
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
    if (!form.dni || !form.nombre || !form.apellidoPaterno)
      return setError('DNI, nombre y apellido paterno son obligatorios');
    setGuardando(true);
    setError(null);
    try {
      let id = personal?.id;
      if (esEdicion) {
        await api.patch(`/personal/${id}`, {
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
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar');
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
            <Field label="Cargo">
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
            <Field label="Apellido materno">
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
            <Field label="Fecha de nacimiento">
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
            <Field label="Correo">
              <input
                type="email"
                value={form.correo}
                onChange={(e) => setForm({ ...form, correo: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Teléfono">
              <input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Dirección">
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
        <img src={display} alt="" className="absolute inset-0 w-full h-full object-cover" />
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
            Crear usuario del sistema
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
            Vincular usuario a{' '}
            <b className="text-slate-900 dark:text-slate-100">
              {personal.nombre} {personal.apellidoPaterno}
            </b>{' '}
            (DNI {personal.dni})
          </div>
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
                  {r}
                </option>
              ))}
            </select>
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
            {guardando ? 'Creando…' : 'Crear usuario'}
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
