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
  Hotel,
  Crown,
  FileBarChart,
} from 'lucide-react';
import { useAuthStore, Rol } from '@/store/auth';
import TopBar from './TopBar';
import { useLiveEvents } from '@/hooks/useLiveEvents';

interface Item {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles?: Rol[];
}

const items: Item[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/habitaciones', label: 'Habitaciones', icon: BedDouble },
  { to: '/alquileres', label: 'Alquileres', icon: ClipboardList },
  {
    to: '/historial',
    label: 'Historial',
    icon: FileBarChart,
    roles: ['SUPERADMIN', 'ADMIN_SEDE', 'HOTELERO', 'CAJERO'],
  },
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

  // Conecta al socket y muestra toasts en vivo
  useLiveEvents();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibles = items.filter(
    (i) => !i.roles || (usuario && i.roles.includes(usuario.rol)),
  );

  return (
    <div className="flex h-screen overflow-hidden p-4 gap-4 bg-gradient-to-br from-slate-50 via-violet-50/30 to-emerald-50/20">
      {/* Sidebar FIJO */}
      <aside className="w-60 shrink-0 bg-white rounded-3xl shadow-sm flex flex-col h-full overflow-hidden">
        {/* Logo */}
        <div className="px-6 pt-6 pb-5 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-md">
            <Hotel size={20} className="text-white" />
          </div>
          <div>
            <div className="font-hotel text-xl font-bold text-slate-900 leading-none">
              Caribe
            </div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-0.5">
              Hotel
            </div>
          </div>
        </div>

        {/* Nav (scroll interno solo si hay muchos ítems) */}
        <nav className="flex-1 overflow-y-auto scroll-premium px-3 py-2 space-y-1 min-h-0">
          {visibles.map((it) => {
            const Icon = it.icon;
            return (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-lg shadow-violet-500/30'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`
                }
              >
                <Icon size={18} />
                {it.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Promo card (fijo abajo) */}
        <div className="p-3 shrink-0">
          <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-violet-700 to-violet-900 rounded-2xl p-5 text-white">
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
            <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-white/5" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center mb-3">
                <Crown size={18} className="text-gold-400" />
              </div>
              <div className="font-bold text-sm">Caribe Pro</div>
              <div className="text-[11px] text-violet-200 mt-0.5 leading-snug">
                Reportes avanzados y multi-sede
              </div>
              <button
                onClick={handleLogout}
                className="mt-3 inline-flex items-center gap-1 bg-white text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-lg shadow"
              >
                <LogOut size={12} /> Salir
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Columna derecha — scroll propio */}
      <main className="flex-1 flex flex-col min-w-0 h-full min-h-0">
        {/* TopBar fijo arriba */}
        <div className="shrink-0 pb-3">
          <TopBar usuario={usuario} />
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto scroll-premium min-h-0 pr-2">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
