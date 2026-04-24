import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';

type ToastType = 'info' | 'success' | 'warning' | 'error';

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface Ctx {
  show: (t: Omit<Toast, 'id'>) => void;
  toggleMute: () => void;
  muted: boolean;
}

const ToastContext = createContext<Ctx | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
};

const MAX_VISIBLE = 5;
const SOUND_THROTTLE_MS = 400;
const DEFAULT_DURATION = 5000;

/* ------------------------------------------------------------
 * Sonidos generados con Web Audio API (sin archivos externos)
 * ------------------------------------------------------------ */
let audioCtx: AudioContext | null = null;
let lastSoundAt = 0;

function getAudioCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      const W = window as any;
      const Ctor = window.AudioContext || W.webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function playBeep(
  ctx: AudioContext,
  freq: number,
  duration: number,
  delay: number,
  type: OscillatorType = 'sine',
) {
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.15, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

const SOUND_RECIPES: Record<
  ToastType,
  Array<{ freq: number; dur: number; at: number; type?: OscillatorType }>
> = {
  info: [{ freq: 880, dur: 0.25, at: 0, type: 'sine' }],
  success: [
    { freq: 659, dur: 0.14, at: 0, type: 'sine' },
    { freq: 988, dur: 0.22, at: 0.1, type: 'sine' },
  ],
  warning: [
    { freq: 740, dur: 0.12, at: 0, type: 'triangle' },
    { freq: 740, dur: 0.16, at: 0.18, type: 'triangle' },
  ],
  error: [
    { freq: 494, dur: 0.15, at: 0, type: 'sawtooth' },
    { freq: 349, dur: 0.2, at: 0.12, type: 'sawtooth' },
  ],
};

function playToneFor(type: ToastType) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const now = Date.now();
  if (now - lastSoundAt < SOUND_THROTTLE_MS) return;
  lastSoundAt = now;
  const recipe = SOUND_RECIPES[type];
  recipe.forEach((n) => playBeep(ctx, n.freq, n.dur, n.at, n.type));
}

/* ------------------------------------------------------------ */

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [muted, setMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hotel-toast-muted') === '1';
    } catch {
      return false;
    }
  });
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
    try {
      localStorage.setItem('hotel-toast-muted', muted ? '1' : '0');
    } catch {}
  }, [muted]);

  // "Despertar" el AudioContext al primer click del usuario (policy de navegadores)
  useEffect(() => {
    const unlock = () => {
      const ctx = getAudioCtx();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const show = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => {
      const next = [...prev, { ...t, id }];
      // Limita a MAX_VISIBLE: descarta los más viejos
      return next.slice(-MAX_VISIBLE);
    });
    if (!mutedRef.current) playToneFor(t.type);
    const dur = t.duration ?? DEFAULT_DURATION;
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, dur);
  }, []);

  const dismiss = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  const toggleMute = useCallback(() => {
    setMuted((m) => !m);
  }, []);

  const ctxValue = useMemo<Ctx>(
    () => ({ show, toggleMute, muted }),
    [show, toggleMute, muted],
  );

  return (
    <ToastContext.Provider value={ctxValue}>
      {children}

      {/* Botón flotante de mute */}
      {toasts.length > 0 && (
        <button
          onClick={toggleMute}
          title={muted ? 'Activar sonido' : 'Silenciar'}
          className="fixed top-4 right-[22rem] z-[201] w-9 h-9 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 shadow-lg dark:shadow-slate-950/60 flex items-center justify-center hover:bg-white dark:hover:bg-slate-900 btn-press transition animate-fade-in"
        >
          {muted ? (
            <VolumeX size={15} className="text-slate-500" />
          ) : (
            <Volume2 size={15} className="text-violet-600" />
          )}
        </button>
      )}

      {/* Stack de toasts */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t, i) => (
          <ToastItem
            key={t.id}
            toast={t}
            index={toasts.length - 1 - i}
            onClose={() => dismiss(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const STYLES: Record<
  ToastType,
  {
    Icon: React.ComponentType<{ size?: number; className?: string }>;
    accent: string;
    iconBg: string;
    iconColor: string;
    progress: string;
  }
> = {
  info: {
    Icon: Info,
    accent: 'from-violet-400 via-violet-500 to-violet-600',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    progress: 'bg-violet-500',
  },
  success: {
    Icon: CheckCircle2,
    accent: 'from-emerald-400 via-emerald-500 to-emerald-600',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    progress: 'bg-emerald-500',
  },
  warning: {
    Icon: AlertTriangle,
    accent: 'from-amber-400 via-amber-500 to-amber-600',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    progress: 'bg-amber-500',
  },
  error: {
    Icon: XCircle,
    accent: 'from-rose-400 via-rose-500 to-rose-600',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    progress: 'bg-rose-500',
  },
};

function ToastItem({
  toast,
  index,
  onClose,
}: {
  toast: Toast;
  index: number;
  onClose: () => void;
}) {
  const s = STYLES[toast.type];
  const { Icon } = s;
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const startRef = useRef<number>(Date.now());
  const pausedAtRef = useRef<number | null>(null);
  const durationRef = useRef<number>(toast.duration ?? DEFAULT_DURATION);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      if (paused) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const elapsed = Date.now() - startRef.current;
      const p = Math.max(0, 100 - (elapsed / durationRef.current) * 100);
      setProgress(p);
      if (p <= 0) return;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [paused]);

  const handleMouseEnter = () => {
    if (!paused) {
      pausedAtRef.current = Date.now();
      setPaused(true);
    }
  };
  const handleMouseLeave = () => {
    if (paused && pausedAtRef.current) {
      const pauseDur = Date.now() - pausedAtRef.current;
      startRef.current += pauseDur;
      pausedAtRef.current = null;
      setPaused(false);
    }
  };

  // Effect de stack: los que están atrás se ven más pequeños
  const scale = Math.max(0.95, 1 - index * 0.02);
  const yOffset = index * -4;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClose}
      className="pointer-events-auto relative overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-slate-950/60 flex items-start gap-3 pr-2 pl-1 py-3 animate-slide-in-right cursor-pointer hover:shadow-2xl transition-all"
      style={{
        transform: `scale(${scale}) translateY(${yOffset}px)`,
        transition: 'transform 250ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* Barra lateral de color */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${s.accent}`}
      />

      {/* Icono */}
      <div
        className={`ml-2 w-10 h-10 rounded-xl ${s.iconBg} ${s.iconColor} flex items-center justify-center shrink-0 relative`}
      >
        <Icon size={18} />
        {/* Pulso animado */}
        <span
          className={`absolute inset-0 rounded-xl ${s.iconBg} opacity-50 animate-ping`}
          style={{ animationDuration: '1.2s', animationIterationCount: 1 }}
        />
      </div>

      {/* Texto */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="font-semibold text-slate-900 text-sm leading-snug">
          {toast.title}
        </div>
        {toast.description && (
          <div className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2">
            {toast.description}
          </div>
        )}
      </div>

      {/* Cerrar */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 shrink-0 btn-press"
      >
        <X size={14} />
      </button>

      {/* Barra de progreso de auto-dismiss */}
      <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-slate-100/80 dark:bg-slate-800/80">
        <div
          className={`h-full ${s.progress} transition-none`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
