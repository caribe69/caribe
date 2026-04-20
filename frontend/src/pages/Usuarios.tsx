import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plus,
  Pencil,
  KeyRound,
  Power,
  PowerOff,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useDialog } from '@/components/ConfirmProvider';
import { useToast } from '@/components/ToastProvider';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';

const ROLES = ['ADMIN_SEDE', 'HOTELERO', 'LIMPIEZA', 'CAJERO', 'SUPERADMIN'];

interface Usuario {
  id: number;
  nombre: string;
  username: string;
  email?: string | null;
  rol: string;
  sedeId?: number | null;
  sede?: { id: number; nombre: string } | null;
  activo: boolean;
}

export default function Usuarios() {
  const qc = useQueryClient();
  const yo = useAuthStore((s) => s.usuario);
  const dialog = useDialog();
  const { show: toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => (await api.get<Usuario[]>('/usuarios')).data,
  });

  const pag = usePagination(data, 10);

  const sedes = useQuery({
    queryKey: ['sedes'],
    queryFn: async () => (await api.get<any[]>('/sedes')).data,
    enabled: yo?.rol === 'SUPERADMIN',
  });

  const toggleActivo = useMutation({
    mutationFn: async (u: Usuario) =>
      (await api.patch(`/usuarios/${u.id}`, { activo: !u.activo })).data,
    onSuccess: (_, u) => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      toast({
        type: u.activo ? 'warning' : 'success',
        title: u.activo ? 'Usuario desactivado' : 'Usuario activado',
        description: `${u.nombre} ${u.activo ? 'no podrá iniciar sesión' : 'ya puede iniciar sesión'}`,
      });
    },
  });

  const rolBadge = (rol: string) => {
    const map: Record<string, string> = {
      SUPERADMIN: 'bg-violet-100 text-violet-700',
      ADMIN_SEDE: 'bg-blue-100 text-blue-700',
      HOTELERO: 'bg-emerald-100 text-emerald-700',
      LIMPIEZA: 'bg-amber-100 text-amber-800',
      CAJERO: 'bg-rose-100 text-rose-700',
    };
    return map[rol] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="text-sm text-slate-500">
          {data?.length ?? 0} usuarios registrados
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-violet-500/30 transition btn-press"
        >
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      {isLoading && (
        <div className="text-slate-400 text-center py-12">Cargando...</div>
      )}

      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <Th className="w-14">#</Th>
              <Th>Usuario</Th>
              <Th>Rol</Th>
              <Th>Sede</Th>
              <Th>Estado</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {pag.paginated.map((u) => {
              const esYo = u.id === yo?.id;
              return (
                <tr
                  key={u.id}
                  className="border-b border-slate-50 last:border-0 hover:bg-violet-50/30 transition"
                >
                  <Td className="text-slate-400 font-mono">
                    {String(u.id).padStart(2, '0')}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white font-bold flex items-center justify-center shrink-0">
                        {u.nombre?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">
                          {u.nombre}
                          {esYo && (
                            <span className="ml-2 text-[10px] font-bold text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded">
                              TÚ
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-xs text-slate-400">
                          @{u.username}
                        </div>
                        {u.email && (
                          <div className="text-[11px] text-slate-500">
                            {u.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${rolBadge(u.rol)}`}
                    >
                      {u.rol.replace('_', ' ')}
                    </span>
                  </Td>
                  <Td className="text-slate-600">
                    {u.sede?.nombre || (
                      <span className="text-slate-400">— Global —</span>
                    )}
                  </Td>
                  <Td>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        u.activo
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${u.activo ? 'bg-emerald-500' : 'bg-slate-400'}`}
                      />
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex gap-1.5">
                      <IconBtn
                        title="Editar"
                        onClick={() => setEditando(u)}
                        Icon={Pencil}
                      />
                      {!esYo && (
                        <IconBtn
                          title={
                            u.activo
                              ? 'Desactivar usuario'
                              : 'Activar usuario'
                          }
                          onClick={async () => {
                            const ok = await dialog.confirm({
                              title: u.activo
                                ? '¿Desactivar usuario?'
                                : '¿Activar usuario?',
                              message: u.activo
                                ? `${u.nombre} no podrá iniciar sesión hasta que lo reactives.`
                                : `${u.nombre} podrá iniciar sesión de nuevo.`,
                              confirmText: u.activo
                                ? 'Desactivar'
                                : 'Activar',
                              variant: u.activo ? 'warning' : 'success',
                            });
                            if (ok) toggleActivo.mutate(u);
                          }}
                          Icon={u.activo ? PowerOff : Power}
                          className={
                            u.activo
                              ? 'bg-amber-100 hover:bg-amber-200 text-amber-700'
                              : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
                          }
                        />
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
            {data?.length === 0 && !isLoading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-16 text-center text-slate-400"
                >
                  <Users size={40} className="mx-auto text-slate-300 mb-2" />
                  Sin usuarios
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

      {showCreate && (
        <CreateUsuarioModal
          sedes={sedes.data || []}
          esSuperadmin={yo?.rol === 'SUPERADMIN'}
          miSedeId={yo?.sedeId}
          onClose={() => setShowCreate(false)}
        />
      )}
      {editando && (
        <EditUsuarioModal
          usuario={editando}
          sedes={sedes.data || []}
          esSuperadmin={yo?.rol === 'SUPERADMIN'}
          onClose={() => setEditando(null)}
        />
      )}
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
      className={`text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest ${className}`}
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
  return <td className={`px-6 py-4 ${className}`}>{children}</td>;
}

function IconBtn({
  title,
  onClick,
  Icon,
  className = '',
}: {
  title: string;
  onClick: () => void;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  className?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-violet-100 hover:text-violet-700 text-slate-700 btn-press transition ${className}`}
    >
      <Icon size={14} />
    </button>
  );
}

/* ============ CREAR ============ */
function CreateUsuarioModal({
  sedes,
  esSuperadmin,
  miSedeId,
  onClose,
}: {
  sedes: any[];
  esSuperadmin: boolean;
  miSedeId?: number | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const [form, setForm] = useState({
    nombre: '',
    username: '',
    email: '',
    password: '',
    rol: 'HOTELERO',
    sedeId: miSedeId || undefined,
  });
  const [error, setError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  const crear = useMutation({
    mutationFn: async () =>
      (
        await api.post('/usuarios', {
          ...form,
          sedeId: form.sedeId ? Number(form.sedeId) : undefined,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      toast({
        type: 'success',
        title: 'Usuario creado',
        description: `${form.nombre} (@${form.username}) ya puede iniciar sesión.`,
      });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Error'),
  });

  const rolesDisponibles = ROLES.filter(
    (r) => esSuperadmin || r !== 'SUPERADMIN',
  );

  return (
    <ModalShell title="Nuevo usuario" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Nombre completo">
          <input
            placeholder="Ej. Juan Pérez"
            className={inputCls}
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
        </Field>
        <Field label="Usuario (login)">
          <input
            placeholder="Ej. juan_recepcion"
            className={inputCls}
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </Field>
        <Field label="Email (opcional)">
          <input
            type="email"
            className={inputCls}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="Contraseña (mín. 6)">
          <PasswordInput
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
            show={showPwd}
            onToggle={() => setShowPwd((s) => !s)}
          />
        </Field>
        <Field label="Rol">
          <select
            className={inputCls}
            value={form.rol}
            onChange={(e) => setForm({ ...form, rol: e.target.value })}
          >
            {rolesDisponibles.map((r) => (
              <option key={r} value={r}>
                {r.replace('_', ' ')}
              </option>
            ))}
          </select>
        </Field>
        {esSuperadmin && form.rol !== 'SUPERADMIN' && (
          <Field label="Sede">
            <select
              className={inputCls}
              value={form.sedeId || ''}
              onChange={(e) =>
                setForm({ ...form, sedeId: Number(e.target.value) })
              }
            >
              <option value="">Seleccionar sede</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </Field>
        )}
        {error && <ErrorBox msg={error} />}
        <div className="flex gap-2 pt-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 py-2.5 rounded-xl text-slate-700 btn-press"
          >
            Cancelar
          </button>
          <button
            onClick={() => crear.mutate()}
            disabled={
              crear.isPending ||
              !form.nombre ||
              !form.username ||
              form.password.length < 6
            }
            className="flex-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white py-2.5 rounded-xl disabled:opacity-50 btn-press"
          >
            {crear.isPending ? 'Creando...' : 'Crear usuario'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ============ EDITAR ============ */
function EditUsuarioModal({
  usuario,
  sedes,
  esSuperadmin,
  onClose,
}: {
  usuario: Usuario;
  sedes: any[];
  esSuperadmin: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const [form, setForm] = useState({
    nombre: usuario.nombre,
    email: usuario.email || '',
    rol: usuario.rol,
    activo: usuario.activo,
  });
  const [resetPwd, setResetPwd] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actualizar = useMutation({
    mutationFn: async () => {
      const payload: any = {
        nombre: form.nombre,
        email: form.email || undefined,
        rol: form.rol,
        activo: form.activo,
      };
      if (resetPwd && newPwd.length >= 6) payload.password = newPwd;
      return (await api.patch(`/usuarios/${usuario.id}`, payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      toast({
        type: 'success',
        title: 'Usuario actualizado',
        description: resetPwd
          ? `${form.nombre}: contraseña restablecida y datos guardados.`
          : `${form.nombre}: datos guardados.`,
      });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Error'),
  });

  const rolesDisponibles = ROLES.filter(
    (r) => esSuperadmin || r !== 'SUPERADMIN',
  );

  return (
    <ModalShell title={`Editar · ${usuario.nombre}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white font-bold flex items-center justify-center text-lg">
            {usuario.nombre?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="font-mono text-xs text-slate-500">
              @{usuario.username}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">
              ID #{String(usuario.id).padStart(3, '0')}
            </div>
          </div>
        </div>

        <Field label="Nombre completo">
          <input
            className={inputCls}
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
        </Field>
        <Field label="Email (opcional)">
          <input
            type="email"
            className={inputCls}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="Rol">
          <select
            className={inputCls}
            value={form.rol}
            onChange={(e) => setForm({ ...form, rol: e.target.value })}
          >
            {rolesDisponibles.map((r) => (
              <option key={r} value={r}>
                {r.replace('_', ' ')}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-xl">
          <div>
            <div className="text-sm font-medium text-slate-800">
              Usuario activo
            </div>
            <div className="text-xs text-slate-500">
              Si desactivas no puede iniciar sesión
            </div>
          </div>
          <button
            onClick={() => setForm({ ...form, activo: !form.activo })}
            className={`w-11 h-6 rounded-full transition relative ${
              form.activo ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition ${
                form.activo ? 'left-5' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {/* Reset contraseña */}
        <div className="border border-slate-200 rounded-xl p-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={resetPwd}
              onChange={(e) => setResetPwd(e.target.checked)}
              className="w-4 h-4 accent-violet-600"
            />
            <KeyRound size={14} className="text-violet-600" />
            <span className="text-sm font-medium text-slate-700">
              Restablecer contraseña
            </span>
          </label>
          {resetPwd && (
            <div className="mt-3">
              <Field label="Nueva contraseña (mín. 6)">
                <PasswordInput
                  value={newPwd}
                  onChange={setNewPwd}
                  show={showPwd}
                  onToggle={() => setShowPwd((s) => !s)}
                />
              </Field>
              <div className="text-[11px] text-slate-500 mt-2">
                El usuario deberá usar esta nueva contraseña para iniciar
                sesión. Avísale por separado.
              </div>
            </div>
          )}
        </div>

        {error && <ErrorBox msg={error} />}

        <div className="flex gap-2 pt-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 py-2.5 rounded-xl text-slate-700 btn-press"
          >
            Cancelar
          </button>
          <button
            onClick={() => actualizar.mutate()}
            disabled={
              actualizar.isPending ||
              !form.nombre ||
              (resetPwd && newPwd.length < 6)
            }
            className="flex-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white py-2.5 rounded-xl disabled:opacity-50 btn-press"
          >
            {actualizar.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ============ Helpers ============ */
const inputCls =
  'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  show,
  onToggle,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls + ' pr-10'}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={onToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-violet-600"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto scroll-premium">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-hotel text-lg font-bold text-slate-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 btn-press"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
      {msg}
    </div>
  );
}
