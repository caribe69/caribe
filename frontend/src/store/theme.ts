import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeState {
  mode: ThemeMode;
  resolved: 'light' | 'dark'; // el tema efectivo aplicado al DOM
  setMode: (mode: ThemeMode) => void;
  tick: () => void; // recalcula resolved según la hora (si mode=auto)
}

// Hora Perú (America/Lima): noche si está entre 18:00 y 05:59
function peruIsNight(): boolean {
  try {
    const hourStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Lima',
      hour: 'numeric',
      hour12: false,
    }).format(new Date());
    const h = parseInt(hourStr, 10);
    return h >= 18 || h < 6;
  } catch {
    const h = new Date().getHours();
    return h >= 18 || h < 6;
  }
}

function loadMode(): ThemeMode {
  try {
    const v = localStorage.getItem('theme-mode') as ThemeMode | null;
    if (v === 'light' || v === 'dark' || v === 'auto') return v;
  } catch {}
  return 'auto';
}

function resolve(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'light' || mode === 'dark') return mode;
  return peruIsNight() ? 'dark' : 'light';
}

function applyToDom(resolved: 'light' | 'dark') {
  const root = document.documentElement;
  if (resolved === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  // Hint al navegador (scrollbars, controles nativos)
  root.style.colorScheme = resolved;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: loadMode(),
  resolved: resolve(loadMode()),
  setMode: (mode) => {
    try {
      localStorage.setItem('theme-mode', mode);
    } catch {}
    const resolved = resolve(mode);
    applyToDom(resolved);
    set({ mode, resolved });
  },
  tick: () => {
    const { mode, resolved } = get();
    const next = resolve(mode);
    if (next !== resolved) {
      applyToDom(next);
      set({ resolved: next });
    }
  },
}));

// Inicialización inmediata al cargar el módulo
if (typeof document !== 'undefined') {
  applyToDom(resolve(loadMode()));
  // Recalcula cada minuto por si cambió la hora y estamos en auto
  setInterval(() => {
    useThemeStore.getState().tick();
  }, 60_000);
}
