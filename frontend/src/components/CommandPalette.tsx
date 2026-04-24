import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BedDouble,
  ClipboardList,
  ShoppingCart,
  Package,
  Sparkles,
  Wallet,
  Building,
  Users,
  LayoutDashboard,
  FileBarChart,
  Settings,
  MessageSquare,
  TrendingUp,
  Truck,
  Search,
  LogOut,
  KeyRound,
} from 'lucide-react';
import { useAuthStore, Rol } from '@/store/auth';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  shortcut?: string[];
  group: 'Navegación' | 'Acciones' | 'Configuración';
  roles?: Rol[];
  action: (ctx: Ctx) => void;
}

interface Ctx {
  navigate: (path: string) => void;
  logout: () => void;
  close: () => void;
}

const COMMANDS: Command[] = [
  // Navegación
  { id: 'nav-dashboard', label: 'Ir a Dashboard', icon: LayoutDashboard, group: 'Navegación', action: (c) => { c.navigate('/'); c.close(); } },
  { id: 'nav-alquileres', label: 'Ir a Alquileres', icon: ClipboardList, group: 'Navegación', roles: ['SUPERADMIN', 'ADMIN_SEDE', 'HOTELERO', 'CAJERO'], action: (c) => { c.navigate('/alquileres'); c.close(); } },
  { id: 'nav-hab', label: 'Ir a Habitaciones', icon: BedDouble, group: 'Navegación', roles: ['SUPERADMIN', 'ADMIN_SEDE'], action: (c) => { c.navigate('/habitaciones'); c.close(); } },
  { id: 'nav-ventas', label: 'Ir a Venta directa', icon: ShoppingCart, group: 'Navegación', roles: ['SUPERADMIN', 'ADMIN_SEDE', 'CAJERO'], action: (c) => { c.navigate('/ventas'); c.close(); } },
  { id: 'nav-caja', label: 'Ir a Caja', icon: Wallet, group: 'Navegación', roles: ['SUPERADMIN', 'ADMIN_SEDE', 'HOTELERO', 'CAJERO'], action: (c) => { c.navigate('/caja'); c.close(); } },
  { id: 'nav-historial', label: 'Ir a Historial', icon: FileBarChart, group: 'Navegación', roles: ['SUPERADMIN', 'ADMIN_SEDE', 'HOTELERO', 'CAJERO'], action: (c) => { c.navigate('/historial'); c.close(); } },
  { id: 'nav-reportes', label: 'Ir a Reportes / KPIs', icon: TrendingUp, group: 'Navegación', roles: ['SUPERADMIN', 'ADMIN_SEDE'], action: (c) => { c.navigate('/reportes'); c.close(); } },
  { id: 'nav-productos', label: 'Ir a Productos', icon: Package, group: 'Navegación', roles: ['SUPERADMIN', 'ADMIN_SEDE', 'HOTELERO', 'CAJERO'], action: (c) => { c.navigate('/productos'); c.close(); } },
  { id: 'nav-prodlimp', label: 'Ir a Prod. limpieza', icon: Package, group: 'Navegación', roles: ['SUPERADMIN', 'ADMIN_SEDE', 'LIMPIEZA'], action: (c) => { c.navigate('/productos-limpieza'); c.close(); } },
  { id: 'nav-transf', label: 'Ir a Transferencias', icon: Truck, group: 'Navegación', roles: ['SUPERADMIN', 'ADMIN_SEDE', 'HOTELERO', 'CAJERO'], action: (c) => { c.navigate('/transferencias'); c.close(); } },
  { id: 'nav-limp', label: 'Ir a Limpieza', icon: Sparkles, group: 'Navegación', roles: ['SUPERADMIN', 'ADMIN_SEDE', 'LIMPIEZA'], action: (c) => { c.navigate('/limpieza'); c.close(); } },
  { id: 'nav-chat', label: 'Ir a Conversaciones', icon: MessageSquare, group: 'Navegación', action: (c) => { c.navigate('/chat'); c.close(); } },
  { id: 'nav-sedes', label: 'Ir a Sedes', icon: Building, group: 'Configuración', roles: ['SUPERADMIN'], action: (c) => { c.navigate('/sedes'); c.close(); } },
  { id: 'nav-usuarios', label: 'Ir a Usuarios', icon: Users, group: 'Configuración', roles: ['SUPERADMIN', 'ADMIN_SEDE'], action: (c) => { c.navigate('/usuarios'); c.close(); } },
  { id: 'nav-config', label: 'Ir a Configuración', icon: Settings, group: 'Configuración', roles: ['SUPERADMIN', 'ADMIN_SEDE'], action: (c) => { c.navigate('/configuracion'); c.close(); } },

  // Acciones
  { id: 'act-nuevo-alquiler', label: 'Crear nuevo alquiler', description: 'Ve a alquileres y selecciona habitación disponible', icon: ClipboardList, group: 'Acciones', roles: ['SUPERADMIN', 'ADMIN_SEDE', 'HOTELERO', 'CAJERO'], action: (c) => { c.navigate('/alquileres'); c.close(); } },
  { id: 'act-chat', label: 'Abrir chat con alguien', icon: MessageSquare, group: 'Acciones', action: (c) => { c.navigate('/chat'); c.close(); } },
  { id: 'act-kpis', label: 'Ver KPIs de hoy', icon: TrendingUp, group: 'Acciones', roles: ['SUPERADMIN', 'ADMIN_SEDE'], action: (c) => { c.navigate('/reportes'); c.close(); } },
  { id: 'act-cambiar-pwd', label: 'Cambiar mi contraseña', icon: KeyRound, group: 'Configuración', action: () => { window.dispatchEvent(new CustomEvent('change-password')); } },
  { id: 'act-logout', label: 'Cerrar sesión', icon: LogOut, group: 'Configuración', action: (c) => { c.logout(); c.close(); } },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const usuario = useAuthStore((s) => s.usuario);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Atajo Ctrl+K / Cmd+K para abrir
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery('');
        setSelected(0);
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Filtrar por rol
  const visibles = useMemo(
    () =>
      COMMANDS.filter(
        (c) => !c.roles || (usuario && c.roles.includes(usuario.rol)),
      ),
    [usuario],
  );

  // Búsqueda fuzzy simple
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visibles;
    return visibles.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        c.group.toLowerCase().includes(q),
    );
  }, [query, visibles]);

  // Agrupar
  const grouped = useMemo(() => {
    const g: Record<string, Command[]> = {};
    for (const c of filtered) {
      if (!g[c.group]) g[c.group] = [];
      g[c.group].push(c);
    }
    return g;
  }, [filtered]);

  // Reset selección al cambiar query
  useEffect(() => setSelected(0), [query]);

  const flat = filtered;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(flat.length - 1, s + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(0, s - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = flat[selected];
      if (cmd) cmd.action({ navigate, logout, close: () => setOpen(false) });
    }
  };

  useEffect(() => {
    // Scroll al elemento seleccionado
    const el = listRef.current?.querySelector(
      `[data-cmd-idx="${selected}"]`,
    ) as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-[70] flex items-start justify-center pt-[12vh] p-4 animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <Search size={18} className="text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Busca una acción o página..."
            className="flex-1 text-sm bg-transparent focus:outline-none"
          />
          <kbd className="hidden sm:inline text-[10px] bg-slate-100 text-slate-500 border border-slate-200 rounded px-1.5 py-0.5 font-mono">
            ESC
          </kbd>
        </div>

        {/* Lista */}
        <div
          ref={listRef}
          className="max-h-[50vh] overflow-y-auto scroll-premium py-2"
        >
          {flat.length === 0 && (
            <div className="text-center text-slate-400 text-sm py-10">
              Sin resultados para <b>"{query}"</b>
            </div>
          )}
          {Object.entries(grouped).map(([groupName, cmds]) => (
            <div key={groupName}>
              <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {groupName}
              </div>
              {cmds.map((c) => {
                const globalIdx = flat.indexOf(c);
                const isSel = globalIdx === selected;
                const Icon = c.icon;
                return (
                  <button
                    key={c.id}
                    data-cmd-idx={globalIdx}
                    onMouseEnter={() => setSelected(globalIdx)}
                    onClick={() =>
                      c.action({ navigate, logout, close: () => setOpen(false) })
                    }
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
                      isSel
                        ? 'bg-violet-50 text-violet-900'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon
                      size={15}
                      className={isSel ? 'text-violet-600' : 'text-slate-400'}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{c.label}</div>
                      {c.description && (
                        <div className="text-[11px] text-slate-400 truncate">
                          {c.description}
                        </div>
                      )}
                    </div>
                    {isSel && (
                      <kbd className="text-[10px] bg-white text-slate-500 border border-slate-200 rounded px-1.5 py-0.5 font-mono">
                        ↵
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer con hints */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="bg-white border border-slate-200 rounded px-1 py-0.5 font-mono">
                ↑↓
              </kbd>{' '}
              navegar
            </span>
            <span>
              <kbd className="bg-white border border-slate-200 rounded px-1 py-0.5 font-mono">
                ↵
              </kbd>{' '}
              seleccionar
            </span>
          </div>
          <div>
            <kbd className="bg-white border border-slate-200 rounded px-1 py-0.5 font-mono">
              Ctrl+K
            </kbd>{' '}
            toggle
          </div>
        </div>
      </div>
    </div>
  );
}
