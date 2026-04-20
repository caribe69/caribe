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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="text-brand-500" />
          <h1 className="text-2xl font-bold">Usuarios</h1>
        </div>
        <button
          onClick={() => setShow(true)}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm"
        >
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      {isLoading && <div>Cargando...</div>}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Sede</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((u: any) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-3">{u.id}</td>
                <td className="px-4 py-3">{u.nombre}</td>
                <td className="px-4 py-3 font-mono text-xs">{u.username}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                    {u.rol}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {u.sede?.nombre || '-'}
                </td>
                <td className="px-4 py-3">
                  {u.activo ? '✔' : '✖'}
                </td>
              </tr>
            ))}
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
