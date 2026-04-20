import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

const ROLES = ['ADMIN_SEDE', 'HOTELERO', 'LIMPIEZA', 'CAJERO', 'SUPERADMIN'];

export default function Usuarios() {
  const qc = useQueryClient();
  const yo = useAuthStore((s) => s.usuario);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    username: '',
    email: '',
    password: '',
    rol: 'HOTELERO',
    sedeId: yo?.sedeId || undefined,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => (await api.get<any[]>('/usuarios')).data,
  });

  const sedes = useQuery({
    queryKey: ['sedes'],
    queryFn: async () => (await api.get<any[]>('/sedes')).data,
    enabled: yo?.rol === 'SUPERADMIN',
  });

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
      setShow(false);
    },
  });

  const rolesDisponibles = ROLES.filter(
    (r) => yo?.rol === 'SUPERADMIN' || r !== 'SUPERADMIN',
  );

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
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-widest">
            Personal
          </p>
          <h2 className="font-hotel text-2xl font-bold text-slate-900">
            Usuarios del sistema
          </h2>
        </div>
        <button
          onClick={() => setShow(true)}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-violet-500/30 transition"
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
              <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest w-14">
                #
              </th>
              <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Usuario
              </th>
              <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Rol
              </th>
              <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Sede
              </th>
              <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {data?.map((u: any) => (
              <tr
                key={u.id}
                className="border-b border-slate-50 last:border-0 hover:bg-violet-50/30 transition"
              >
                <td className="px-6 py-4 text-slate-400 font-mono">
                  {String(u.id).padStart(2, '0')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white font-bold flex items-center justify-center shrink-0">
                      {u.nombre?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">
                        {u.nombre}
                      </div>
                      <div className="font-mono text-xs text-slate-400">
                        @{u.username}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${rolBadge(u.rol)}`}
                  >
                    {u.rol.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {u.sede?.nombre || (
                    <span className="text-slate-400">— Global —</span>
                  )}
                </td>
                <td className="px-6 py-4">
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
                </td>
              </tr>
            ))}
            {data?.length === 0 && !isLoading && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-16 text-center text-slate-400"
                >
                  <Users size={40} className="mx-auto text-slate-300 mb-2" />
                  Sin usuarios
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Nuevo usuario</h2>
            <div className="space-y-3">
              <input
                placeholder="Nombre completo"
                className="w-full border rounded-lg px-3 py-2"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
              <input
                placeholder="Username"
                className="w-full border rounded-lg px-3 py-2"
                value={form.username}
                onChange={(e) =>
                  setForm({ ...form, username: e.target.value })
                }
              />
              <input
                placeholder="Email (opcional)"
                className="w-full border rounded-lg px-3 py-2"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                type="password"
                placeholder="Contraseña (mín 6)"
                className="w-full border rounded-lg px-3 py-2"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
              />
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value })}
              >
                {rolesDisponibles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {yo?.rol === 'SUPERADMIN' && form.rol !== 'SUPERADMIN' && (
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.sedeId || ''}
                  onChange={(e) =>
                    setForm({ ...form, sedeId: Number(e.target.value) })
                  }
                >
                  <option value="">Seleccionar sede</option>
                  {sedes.data?.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShow(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 py-2 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => crear.mutate()}
                  disabled={crear.isPending}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2 rounded-lg disabled:opacity-50"
                >
                  Crear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
