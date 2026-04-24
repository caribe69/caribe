import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
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
  Crown,
  FileBarChart,
  Settings,
  MessageSquare,
  TrendingUp,
  Truck,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Briefcase,
  Warehouse,
  BarChart3,
  UserCog,
} from 'lucide-react';
import { useAuthStore, Rol } from '@/store/auth';
import TopBar from './TopBar';
import ChatWidget from './ChatWidget';
import CommandPalette from './CommandPalette';
import { useLiveEvents } from '@/hooks/useLiveEvents';

interface Item {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles?: Rol[];
}

interface Group {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items: Item[];
}

// Ítem directo (sin grupo) — Dashboard siempre visible arriba
const dashboard: Item = {
  to: '/',
  label: 'Dashboard',
  icon: LayoutDashboard,
  roles: ['SUPERADMIN', 'ADMIN_SEDE', 'CAJERO', 'LIMPIEZA'],
};

const groups: Group[] = [
  {
    key: 'operacion',
    label: 'Operación',
    icon: Briefcase,
    items: [
      {
        to: '/alquileres',
        label: 'Alquileres',
        icon: ClipboardList,
        roles: ['SUPERADMIN', 'ADMIN_SEDE', 'HOTELERO', 'CAJERO'],
      },
      {
        to: '/habitaciones',
        label: 'Habitaciones',
        icon: BedDouble,
        roles: ['SUPERADMIN', 'ADMIN_SEDE'],
      },
      {
        to: '/ventas',
        label: 'Venta directa',
        icon: ShoppingCart,
        roles: ['SUPERADMIN', 'ADMIN_SEDE', 'CAJERO'],
      },
      {
        to: '/caja',
        label: 'Caja',
        icon: Wallet,
        roles: ['SUPERADMIN', 'ADMIN_SEDE', 'HOTELERO', 'CAJERO'],
      },
    ],
  },
  {
    key: 'reportes',
    label: 'Reportes',
    icon: BarChart3,
    items: [
      {
        to: '/historial',
        label: 'Historial',
        icon: FileBarChart,
        roles: ['SUPERADMIN', 'ADMIN_SEDE', 'HOTELERO', 'CAJERO'],
      },
      {
        to: '/reportes',
        label: 'KPIs & ranking',
        icon: TrendingUp,
        roles: ['SUPERADMIN', 'ADMIN_SEDE'],
      },
    ],
  },
  {
    key: 'almacen',
    label: 'Almacén',
    icon: Warehouse,
    items: [
      {
        to: '/productos',
        label: 'Productos',
        icon: Package,
        roles: ['SUPERADMIN', 'ADMIN_SEDE', 'HOTELERO', 'CAJERO'],
      },
      {
        to: '/productos-limpieza',
        label: 'Prod. limpieza',
        icon: Package,
        roles: ['SUPERADMIN', 'ADMIN_SEDE', 'LIMPIEZA'],
      },
      {
        to: '/transferencias',
        label: 'Transferencias',
        icon: Truck,
        roles: ['SUPERADMIN', 'ADMIN_SEDE', 'HOTELERO', 'CAJERO'],
      },
    ],
  },
  {
    key: 'limpieza',
    label: 'Limpieza',
    icon: Sparkles,
    items: [
      {
        to: '/limpieza',
        label: 'Tareas',
        icon: Sparkles,
        roles: ['SUPERADMIN', 'ADMIN_SEDE', 'LIMPIEZA'],
      },
    ],
  },
  {
    key: 'comunicacion',
    label: 'Comunicación',
    icon: MessageSquare,
    items: [
      {
        to: '/chat',
        label: 'Conversaciones',
        icon: MessageSquare,
        roles: ['SUPERADMIN', 'ADMIN_SEDE', 'HOTELERO', 'CAJERO', 'LIMPIEZA'],
      },
    ],
  },
  {
    key: 'admin',
    label: 'Administración',
    icon: UserCog,
    items: [
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
      {
        to: '/configuracion',
        label: 'Configuración',
        icon: Settings,
        roles: ['SUPERADMIN', 'ADMIN_SEDE'],
      },
    ],
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

  // Filtrado por rol
  const canSee = (item: Item) =>
    !item.roles || (usuario && item.roles.includes(usuario.rol));

  const visibleDashboard = canSee(dashboard);
  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter(canSee) }))
    .filter((g) => g.items.length > 0);

  // Estado de grupos abiertos: persiste en localStorage
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('sidebar-open-groups');
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    return new Set(['operacion']);
  });

  // Sidebar colapsada (modo icono) — persistido
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar-collapsed') === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0');
    } catch {}
  }, [collapsed]);

  // Al cambiar de ruta, abre automáticamente el grupo que la contiene
  useEffect(() => {
    const match = visibleGroups.find((g) =>
      g.items.some((i) => i.to === location.pathname),
    );
    if (match && !openGroups.has(match.key)) {
      setOpenGroups((prev) => {
        const next = new Set(prev);
        next.add(match.key);
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'sidebar-open-groups',
        JSON.stringify(Array.from(openGroups)),
      );
    } catch {}
  }, [openGroups]);

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Badge de conversaciones no leídas (se refresca vía socket invalidation)
  const inboxQuery = useQuery<{ noLeidos: number }[]>({
    queryKey: ['chat', 'inbox'],
    queryFn: async () => (await api.get('/chat/inbox')).data,
    enabled: !!usuario,
  });
  const chatUnread =
    inboxQuery.data?.reduce((s, c) => s + (c.noLeidos || 0), 0) ?? 0;

  // Badge de transferencias pendientes de recibir para mi sede
  const transfQuery = useQuery<any[]>({
    queryKey: ['transferencias', 'recibidas', 'ENVIADA'],
    queryFn: async () =>
      (
        await api.get('/transferencias', {
          params: { direccion: 'recibidas', estado: 'ENVIADA' },
        })
      ).data,
    enabled: !!usuario,
  });
  const transfPendientes = transfQuery.data?.length ?? 0;

  // Badges por path (para mostrarlos junto al grupo cuando está colapsado)
  const badgeFor = (path: string) => {
    if (path === '/chat' && chatUnread > 0) return { n: chatUnread, color: 'bg-rose-500' };
    if (path === '/transferencias' && transfPendientes > 0)
      return { n: transfPendientes, color: 'bg-amber-500' };
    return null;
  };

  const groupTotalBadge = (g: { items: Item[] }) => {
    let total = 0;
    for (const i of g.items) {
      const b = badgeFor(i.to);
      if (b) total += b.n;
    }
    return total;
  };

  return (
    <div className="flex h-screen overflow-hidden p-4 gap-4 bg-gradient-to-br from-slate-50 via-violet-50/30 to-emerald-50/20">
      {/* Sidebar FIJO */}
      <aside
        className={`${collapsed ? 'w-[72px]' : 'w-60'} shrink-0 bg-white rounded-3xl shadow-sm flex flex-col h-full overflow-hidden transition-all duration-300`}
      >
        {/* Logo + toggle colapsar */}
        <div
          className={`${collapsed ? 'px-3' : 'px-6'} pt-5 pb-4 flex items-center gap-3 shrink-0 relative`}
        >
          <img
            src="/logo.png"
            alt="Sol Caribe"
            className={`${collapsed ? 'w-11 h-11 mx-auto' : 'w-11 h-11'} rounded-full shadow-md ring-2 ring-amber-400/30 transition-all`}
          />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="font-hotel text-lg font-bold text-slate-900 leading-none truncate">
                Sol Caribe
              </div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">
                Hotel
              </div>
            </div>
          )}
          {/* Botón colapsar */}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={`${collapsed ? 'absolute -right-2 top-10 bg-white border border-slate-200 shadow-md' : 'bg-slate-100 hover:bg-slate-200'} w-6 h-6 rounded-full flex items-center justify-center text-slate-500 hover:text-violet-700 transition z-10`}
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {collapsed ? <ChevronsRight size={13} /> : <ChevronsLeft size={13} />}
          </button>
        </div>

        {/* Nav agrupado colapsable */}
        <nav
          className={`flex-1 overflow-y-auto scroll-premium ${collapsed ? 'px-2' : 'px-3'} py-2 space-y-0.5 min-h-0`}
        >
          {/* Dashboard siempre visible arriba */}
          {visibleDashboard && (
            <NavLink
              to="/"
              end
              title={collapsed ? 'Dashboard' : undefined}
              className={({ isActive }) =>
                `flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-md shadow-violet-500/30'
                    : 'text-slate-700 hover:bg-slate-50'
                }`
              }
            >
              <LayoutDashboard size={18} className="shrink-0" />
              {!collapsed && <span className="flex-1">Dashboard</span>}
            </NavLink>
          )}

          {/* Grupos */}
          {visibleGroups.map((g) => {
            const GroupIcon = g.icon;
            const isOpen = openGroups.has(g.key);
            const hasActiveChild = g.items.some(
              (i) => location.pathname === i.to,
            );
            const groupBadge = groupTotalBadge(g);

            // Modo colapsado: render icono + items al hover (simple: solo ítems)
            if (collapsed) {
              return (
                <div key={g.key} className="mt-1 space-y-0.5">
                  {/* Separador con icono de grupo (decorativo) */}
                  <div
                    className="flex items-center justify-center py-1.5 text-slate-300"
                    title={g.label}
                  >
                    <GroupIcon size={12} />
                  </div>
                  {g.items.map((it) => {
                    const Icon = it.icon;
                    const badge = badgeFor(it.to);
                    return (
                      <NavLink
                        key={it.to}
                        to={it.to}
                        title={it.label}
                        className={({ isActive }) =>
                          `relative flex items-center justify-center py-2.5 rounded-xl transition ${
                            isActive
                              ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-md shadow-violet-500/30'
                              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                          }`
                        }
                      >
                        <Icon size={18} />
                        {badge && (
                          <span
                            className={`absolute top-1 right-1 ${badge.color} text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center`}
                          >
                            {badge.n > 9 ? '+' : badge.n}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              );
            }

            // Modo expandido con grupos colapsables
            return (
              <div key={g.key} className="mt-2">
                {/* Header del grupo (uppercase, letter-spacing amplio) */}
                <button
                  onClick={() => toggleGroup(g.key)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition ${
                    hasActiveChild
                      ? 'text-violet-700'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <GroupIcon size={12} className="shrink-0 opacity-80" />
                  <span className="flex-1 text-left">{g.label}</span>
                  {!isOpen && groupBadge > 0 && (
                    <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center normal-case tracking-normal">
                      {groupBadge > 9 ? '9+' : groupBadge}
                    </span>
                  )}
                  <ChevronDown
                    size={12}
                    className={`shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </button>

                {/* Ítems hijos con animación */}
                <div
                  className={`overflow-hidden transition-all duration-200 ${
                    isOpen ? 'max-h-96 opacity-100 mt-0.5' : 'max-h-0 opacity-0'
                  }`}
                >
                  {/* Línea vertical guía a la izquierda */}
                  <div className="ml-4 pl-2 border-l border-slate-200 space-y-0.5">
                    {g.items.map((it) => {
                      const Icon = it.icon;
                      const badge = badgeFor(it.to);
                      return (
                        <NavLink
                          key={it.to}
                          to={it.to}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition ${
                              isActive
                                ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-md shadow-violet-500/30 font-semibold'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-normal'
                            }`
                          }
                        >
                          <Icon size={14} className="shrink-0 opacity-90" />
                          <span className="flex-1 truncate">{it.label}</span>
                          {badge && (
                            <span
                              className={`${badge.color} text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                                it.to === '/transferencias' ? 'animate-pulse' : ''
                              }`}
                            >
                              {badge.n > 9 ? '9+' : badge.n}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer fijo abajo */}
        <div className={`${collapsed ? 'p-2' : 'p-3'} shrink-0`}>
          {collapsed ? (
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="w-full flex items-center justify-center py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition"
            >
              <LogOut size={16} />
            </button>
          ) : (
            <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-violet-700 to-violet-900 rounded-2xl p-4 text-white">
              <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
              <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-white/5" />
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center mb-2.5">
                  <Crown size={16} className="text-gold-400" />
                </div>
                <div className="font-bold text-sm">Caribe Pro</div>
                <div className="text-[11px] text-violet-200 mt-0.5 leading-snug">
                  Reportes avanzados y multi-sede
                </div>
                <button
                  onClick={handleLogout}
                  className="mt-2.5 inline-flex items-center gap-1 bg-white text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-lg shadow"
                >
                  <LogOut size={12} /> Salir
                </button>
              </div>
            </div>
          )}
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

      {/* Chat widget flotante */}
      <ChatWidget />
      <CommandPalette />
    </div>
  );
}
