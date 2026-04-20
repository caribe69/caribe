import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Building2,
  BedDouble,
  Package,
  ClipboardList,
  Sparkles,
  Wallet,
  Building,
  Users,
  LogOut,
} from 'lucide-react';
import { useAuthStore, Rol } from '@/store/auth';

interface Item {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  roles?: Rol[];
}

const items: Item[] = [
  { to: '/', label: 'Inicio', icon: Building2 },
  { to: '/habitaciones', label: 'Habitaciones', icon: BedDouble },
  { to: '/alquileres', label: 'Alquileres', icon: ClipboardList },
  { to: '/productos', label: 'Productos', icon: Package },
  {
    to: '/limpieza',
    label: 'Limpieza',
    icon: Sparkles,
    roles: ['SUPERADMIN', 'ADMIN_SEDE', 'LIMPIEZA', 'HOTELERO'],
  },
  { to: '/caja', label: 'Caja', icon: Wallet },
  {
    to: '/sedes',
    label: 'Sedes',
    icon: Building,
    roles: ['SUPERADMIN'],
  },
  {
    to: '/usuarios',
    label: 'Usuarios',
    icon: Users,
    roles: ['SUPERADMIN', 'ADMIN_SEDE'],
  },
];

export default function Layout() {
  const { usuario, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibles = items.filter(
    (i) => !i.roles || (usuario && i.roles.includes(usuario.rol)),
  );

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-800">
          <Building2 size={22} className="text-brand-500" />
          <span className="font-semibold">Hotel System</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {visibles.map((it) => {
            const Icon = it.icon;
            return (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                    isActive
                      ? 'bg-brand-500 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`
                }
              >
                <Icon size={18} />
                {it.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-4 text-sm">
          <div className="font-medium">{usuario?.nombre}</div>
          <div className="text-xs text-slate-400">
            {usuario?.rol}
            {usuario?.sede ? ` · ${usuario.sede.nombre}` : ''}
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-lg text-xs"
          >
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
