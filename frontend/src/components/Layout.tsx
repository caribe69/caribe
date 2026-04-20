import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BedDouble,
  Package,
  ClipboardList,
  Sparkles,
  Wallet,
  Building,
  Users,
  LogOut,
  ShoppingCart,
  LayoutDashboard,
  Palmtree,
} from 'lucide-react';
import { useAuthStore, Rol } from '@/store/auth';
import SedeSelector from './SedeSelector';

interface Item {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  roles?: Rol[];
}

const items: Item[] = [
  { to: '/', label: 'Panel', icon: LayoutDashboard },
  { to: '/habitaciones', label: 'Habitaciones', icon: BedDouble },
  { to: '/alquileres', label: 'Alquileres', icon: ClipboardList },
  {
    to: '/ventas',
    label: 'Venta directa',
    icon: ShoppingCart,
    roles: ['SUPERADMIN', 'ADMIN_SEDE', 'HOTELERO', 'CAJERO'],
  },
  { to: '/productos', label: 'Productos', icon: Package },
  {
    to: '/limpieza',
    label: 'Limpieza',
    icon: Sparkles,
    roles: ['SUPERADMIN', 'ADMIN_SEDE', 'LIMPIEZA', 'HOTELERO'],
  },
  {
    to: '/productos-limpieza',
    label: 'Prod. limpieza',
    icon: Package,
    roles: ['SUPERADMIN', 'ADMIN_SEDE', 'LIMPIEZA'],
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
      <aside
        className="w-64 flex flex-col text-slate-100"
        style={{
          background:
            'linear-gradient(180deg, var(--color-caribe-900) 0%, var(--color-caribe-950) 100%)',
        }}
      >
        {/* Logo */}
        <div className="h-20 flex items-center gap-3 px-5 border-b border-white/10">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg">
            <Palmtree size={20} className="text-caribe-900" />
          </div>
          <div>
            <div className="font-hotel text-lg leading-tight text-white">
              Caribe Hotel
            </div>
            <div className="text-[10px] uppercase tracking-widest text-caribe-200">
              Management
            </div>
          </div>
        </div>

        <SedeSelector />

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {visibles.map((it) => {
            const Icon = it.icon;
            return (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    isActive
                      ? 'bg-white/10 text-white font-medium border-l-2 border-gold-400 pl-[10px]'
                      : 'text-caribe-100 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                {it.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Usuario */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-caribe-700 flex items-center justify-center text-sm font-bold text-white">
              {usuario?.nombre?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate text-white">
                {usuario?.nombre}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-caribe-300 truncate">
                {usuario?.rol?.replace('_', ' ')}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-caribe-100 py-2 rounded-lg text-xs border border-white/10"
          >
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
