import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
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
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-black/10">
        <MapPin size={14} className="text-gold-400" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-caribe-300">
            Sede
          </div>
          <div className="text-sm font-medium truncate text-white">
            {usuario?.sede?.nombre || 'Sin sede'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-b border-white/10 bg-black/10">
      <div className="flex items-center gap-2 mb-1.5">
        <MapPin size={12} className="text-gold-400" />
        <span className="text-[10px] uppercase tracking-widest text-caribe-300">
          Sede activa
        </span>
      </div>
      <select
        value={activeSedeId ?? ''}
        onChange={(e) => {
          const id = Number(e.target.value);
          if (id) {
            setActiveSede(id);
            window.location.reload();
          }
        }}
        className="w-full bg-caribe-800/80 text-white text-sm rounded px-2 py-1.5 outline-none border border-white/10 focus:border-gold-400"
      >
        {data?.map((s) => (
          <option key={s.id} value={s.id} className="bg-caribe-900">
            {s.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}
