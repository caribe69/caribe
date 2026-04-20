import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Search,
  ChevronDown,
  MapPin,
  LayoutDashboard,
  BedDouble,
  ClipboardList,
  ShoppingCart,
  Package,
  Sparkles,
  Wallet,
  Building,
  Users,
  FileBarChart,
  Settings,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore, UsuarioInfo } from '@/store/auth';
import { api } from '@/lib/api';
import SedeSwitchOverlay from './SedeSwitchOverlay';
import { useSocketStatus } from '@/hooks/useSocketStatus';
import { switchSocketSede } from '@/lib/socket';
import ChangePasswordModal from './ChangePasswordModal';
import { useNavigate } from 'react-router-dom';
import { LogOut, KeyRound } from 'lucide-react';

interface PageMeta {
  title: string;
  eyebrow: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  gradient: string;
}

const PAGES: Record<string, PageMeta> = {
  '/': {
    title: 'Dashboard',
    eyebrow: 'Panel general',
    Icon: LayoutDashboard,
    gradient: 'from-violet-500 to-violet-700',
  },
  '/habitaciones': {
    title: 'Habitaciones',
    eyebrow: 'Gestión de inventario',
    Icon: BedDouble,
    gradient: 'from-emerald-500 to-teal-600',
  },
  '/alquileres': {
    title: 'Alquileres',
    eyebrow: 'Reservas y ocupación',
    Icon: ClipboardList,
    gradient: 'from-rose-500 to-pink-600',
  },
  '/historial': {
    title: 'Historial',
    eyebrow: 'Reportes y exportación',
    Icon: FileBarChart,
    gradient: 'from-cyan-500 to-blue-600',
  },
  '/ventas': {
    title: 'Venta directa',
    eyebrow: 'Productos al mostrador',
    Icon: ShoppingCart,
    gradient: 'from-amber-500 to-orange-600',
  },
  '/productos': {
    title: 'Productos',
    eyebrow: 'Almacén de consumibles',
    Icon: Package,
    gradient: 'from-blue-500 to-indigo-600',
  },
  '/limpieza': {
    title: 'Limpieza',
    eyebrow: 'Tareas y evidencias',
    Icon: Sparkles,
    gradient: 'from-amber-500 to-yellow-600',
  },
  '/productos-limpieza': {
    title: 'Productos de limpieza',
    eyebrow: 'Insumos operativos',
    Icon: Package,
    gradient: 'from-teal-500 to-cyan-600',
  },
  '/caja': {
    title: 'Caja',
    eyebrow: 'Turno actual y cierres',
    Icon: Wallet,
    gradient: 'from-emerald-500 to-green-600',
  },
  '/sedes': {
    title: 'Sedes',
    eyebrow: 'Red hotelera',
    Icon: Building,
    gradient: 'from-violet-500 to-purple-700',
  },
  '/usuarios': {
    title: 'Usuarios',
    eyebrow: 'Personal del sistema',
    Icon: Users,
    gradient: 'from-indigo-500 to-violet-600',
  },
  '/chat': {
    title: 'Conversaciones',
    eyebrow: 'Mensajería interna',
    Icon: MessageSquare,
    gradient: 'from-fuchsia-500 to-violet-600',
  },
  '/reportes': {
    title: 'Reportes',
    eyebrow: 'Analítica y comparativos',
    Icon: TrendingUp,
    gradient: 'from-emerald-500 to-violet-600',
  },
  '/configuracion': {
    title: 'Configuración',
    eyebrow: 'Ajustes del sistema',
    Icon: Settings,
    gradient: 'from-slate-500 to-slate-700',
  },
};

export default function TopBar({ usuario }: { usuario: UsuarioInfo | null }) {
  const { pathname } = useLocation();
  const meta =
    PAGES[pathname] || {
      title: 'Caribe Hotel',
      eyebrow: 'Sistema de gestión',
      Icon: LayoutDashboard,
      gradient: 'from-violet-500 to-violet-700',
    };
  const PageIcon = meta.Icon;

  const activeSedeId = useAuthStore((s) => s.activeSedeId);
  const setActiveSede = useAuthStore((s) => s.setActiveSede);
  const logout = useAuthStore((s) => s.logout);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const wsConnected = useSocketStatus();

  const { data: sedes } = useQuery({
    queryKey: ['sedes', 'selector'],
    queryFn: async () => (await api.get<any[]>('/sedes')).data,
    enabled: usuario?.rol === 'SUPERADMIN',
  });

  const sedeActual =
    usuario?.rol === 'SUPERADMIN'
      ? sedes?.find((s) => s.id === activeSedeId) || usuario?.sede
      : usuario?.sede;

  const handleSedeChange = (id: number) => {
    const sede = sedes?.find((s) => s.id === id);
    if (!sede) return;
    setSwitching(sede.nombre);
    setActiveSede(id);
    switchSocketSede(id);
    qc.clear();
    setTimeout(() => setSwitching(null), 1500);
  };

  return (
    <>
      <div className="bg-white rounded-3xl px-5 py-3 shadow-sm flex items-center gap-4 flex-wrap animate-fade-in">
        {/* Page identifier con ícono premium */}
        <div className="flex items-center gap-3 mr-auto">
          <div
            className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center shadow-lg shadow-violet-500/20`}
          >
            <PageIcon size={22} className="text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-white flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </span>
          </div>
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold">
              {meta.eyebrow}
            </div>
            <h1 className="font-hotel text-2xl font-bold text-slate-900">
              {meta.title}
            </h1>
          </div>
        </div>

        {/* Search */}
        <div className="relative hidden md:block">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            placeholder="Buscar..."
            className="pl-9 pr-4 py-2 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 focus:bg-white w-48 lg:w-56 transition-all"
          />
        </div>

        {/* Sede selector */}
        {usuario?.rol === 'SUPERADMIN' && sedes && sedes.length > 0 ? (
          <div className="relative">
            <select
              value={activeSedeId ?? ''}
              onChange={(e) => {
                const id = Number(e.target.value);
                if (id && id !== activeSedeId) handleSedeChange(id);
              }}
              className="appearance-none bg-slate-50 hover:bg-white rounded-xl text-sm pl-8 pr-8 py-2 border border-slate-200 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 font-medium cursor-pointer btn-press transition"
            >
              {sedes.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
            <MapPin
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-violet-500"
            />
            <ChevronDown
              size={13}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        ) : sedeActual ? (
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 text-sm font-medium text-slate-700">
            <MapPin size={13} className="text-violet-500" />
            {sedeActual.nombre}
          </div>
        ) : null}

        {/* Notifications + indicador de conexión en vivo */}
        <button
          className="relative w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center btn-press transition"
          title={wsConnected ? 'Notificaciones en vivo activas' : 'Sin conexión en vivo'}
        >
          <Bell size={15} className="text-slate-600" />
          <span
            className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
              wsConnected
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-slate-300'
            }`}
          />
        </button>

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMenu((s) => !s)}
            className="flex items-center gap-2.5 bg-slate-50 hover:bg-white rounded-xl pl-1 pr-3 py-1 border border-slate-200 btn-press cursor-pointer transition"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white font-bold text-sm">
              {usuario?.nombre?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="hidden sm:block leading-tight text-left">
              <div className="text-xs font-semibold text-slate-800">
                {usuario?.nombre?.split(' ')[0]}
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                {usuario?.rol?.replace('_', ' ')}
              </div>
            </div>
            <ChevronDown size={13} className="text-slate-400 hidden sm:block" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-[50]"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 z-[51] overflow-hidden animate-scale-in">
                <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white font-bold">
                    {usuario?.nombre?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {usuario?.nombre}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                      {usuario?.rol?.replace('_', ' ')}
                    </div>
                  </div>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowChangePwd(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-violet-50 text-sm text-slate-700 transition"
                  >
                    <KeyRound size={15} className="text-violet-600" />
                    Cambiar contraseña
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      logout();
                      navigate('/login');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-rose-50 text-sm text-slate-700 transition"
                  >
                    <LogOut size={15} className="text-rose-600" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {switching && <SedeSwitchOverlay sedeNombre={switching} />}
      {showChangePwd && (
        <ChangePasswordModal onClose={() => setShowChangePwd(false)} />
      )}
    </>
  );
}
