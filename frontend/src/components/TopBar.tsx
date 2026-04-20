import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, Search, ChevronDown, MapPin } from 'lucide-react';
import { useAuthStore, UsuarioInfo } from '@/store/auth';
import { api } from '@/lib/api';

const TITULOS: Record<string, string> = {
  '/': 'Dashboard',
  '/habitaciones': 'Habitaciones',
  '/alquileres': 'Alquileres',
  '/ventas': 'Venta directa',
  '/productos': 'Productos',
  '/limpieza': 'Limpieza',
  '/productos-limpieza': 'Productos de limpieza',
  '/caja': 'Caja',
  '/sedes': 'Sedes',
  '/usuarios': 'Usuarios',
};

export default function TopBar({ usuario }: { usuario: UsuarioInfo | null }) {
  const { pathname } = useLocation();
  const title = TITULOS[pathname] || 'Caribe Hotel';
  const activeSedeId = useAuthStore((s) => s.activeSedeId);
  const setActiveSede = useAuthStore((s) => s.setActiveSede);

  const { data: sedes } = useQuery({
    queryKey: ['sedes', 'selector'],
    queryFn: async () => (await api.get<any[]>('/sedes')).data,
    enabled: usuario?.rol === 'SUPERADMIN',
  });

  const sedeActual =
    usuario?.rol === 'SUPERADMIN'
      ? sedes?.find((s) => s.id === activeSedeId) || usuario?.sede
      : usuario?.sede;

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <h1 className="font-hotel text-2xl sm:text-3xl font-bold text-slate-900 mr-auto">
        {title}
      </h1>

      {/* Search */}
      <div className="relative hidden md:block">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          placeholder="Buscar..."
          className="pl-9 pr-4 py-2.5 bg-white rounded-full text-sm border border-slate-200 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 w-64"
        />
      </div>

      {/* Sede selector */}
      {usuario?.rol === 'SUPERADMIN' && sedes && sedes.length > 0 ? (
        <div className="relative">
          <select
            value={activeSedeId ?? ''}
            onChange={(e) => {
              const id = Number(e.target.value);
              if (id) {
                setActiveSede(id);
                window.location.reload();
              }
            }}
            className="appearance-none bg-white rounded-full text-sm pl-9 pr-9 py-2.5 border border-slate-200 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 font-medium"
          >
            {sedes.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
          <MapPin
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-500"
          />
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
      ) : sedeActual ? (
        <div className="hidden sm:flex items-center gap-2 bg-white rounded-full px-4 py-2.5 border border-slate-200 text-sm font-medium text-slate-700">
          <MapPin size={14} className="text-violet-500" />
          {sedeActual.nombre}
        </div>
      ) : null}

      {/* Notifications */}
      <button className="relative w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50">
        <Bell size={16} className="text-slate-600" />
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500" />
      </button>

      {/* User */}
      <div className="flex items-center gap-3 bg-white rounded-full pl-1 pr-4 py-1 border border-slate-200">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white font-bold text-sm">
          {usuario?.nombre?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="hidden sm:block leading-tight">
          <div className="text-sm font-semibold text-slate-800">
            {usuario?.nombre?.split(' ')[0]}
          </div>
          <div className="text-[11px] text-slate-400 uppercase tracking-wider">
            {usuario?.rol?.replace('_', ' ')}
          </div>
        </div>
        <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
      </div>
    </div>
  );
}
