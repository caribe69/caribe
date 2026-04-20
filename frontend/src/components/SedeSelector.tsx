import { useQuery } from '@tanstack/react-query';
import { Building } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function SedeSelector() {
  const usuario = useAuthStore((s) => s.usuario);
  const activeSedeId = useAuthStore((s) => s.activeSedeId);
  const setActiveSede = useAuthStore((s) => s.setActiveSede);

  const { data } = useQuery({
    queryKey: ['sedes', 'selector'],
    queryFn: async () => (await api.get<any[]>('/sedes')).data,
    enabled: usuario?.rol === 'SUPERADMIN',
  });

  if (usuario?.rol !== 'SUPERADMIN') {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400 px-3 py-2">
        <Building size={14} />
        {usuario?.sede?.nombre || 'Sin sede'}
      </div>
    );
  }

  return (
    <div className="px-3 py-2 border-b border-slate-800 bg-slate-950">
      <label className="flex items-center gap-2 text-xs text-slate-400 mb-1">
        <Building size={12} /> Sede activa
      </label>
      <select
        value={activeSedeId ?? ''}
        onChange={(e) => {
          const id = Number(e.target.value);
          if (id) {
            setActiveSede(id);
            // recarga para limpiar cache de queries
            window.location.reload();
          }
        }}
        className="w-full bg-slate-800 text-slate-100 text-sm rounded px-2 py-1.5 outline-none border border-slate-700"
      >
        {data?.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}
