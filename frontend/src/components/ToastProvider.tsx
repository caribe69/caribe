import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';

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
}

const ToastContext = createContext<Ctx | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    const dur = t.duration ?? 4500;
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, dur);
  }, []);

  const dismiss = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const STYLES: Record<
  ToastType,
  { Icon: React.ComponentType<{ size?: number; className?: string }>; border: string; iconBg: string; iconColor: string }
> = {
  info: {
    Icon: Info,
    border: 'border-violet-200',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
  },
  success: {
    Icon: CheckCircle2,
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  warning: {
    Icon: AlertTriangle,
    border: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  error: {
    Icon: XCircle,
    border: 'border-rose-200',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
  },
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const s = STYLES[toast.type];
  const { Icon } = s;
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), (toast.duration ?? 4500) - 300);
    return () => clearTimeout(t);
  }, [toast.duration]);

  return (
    <div
      className={`pointer-events-auto bg-white border ${s.border} rounded-2xl shadow-xl shadow-slate-900/5 px-4 py-3 flex items-start gap-3 ${
        leaving ? 'animate-fade-in' : 'animate-slide-in-right'
      }`}
      style={leaving ? { animation: 'fade-in 0.3s ease-out reverse' } : undefined}
    >
      <div
        className={`w-9 h-9 rounded-xl ${s.iconBg} ${s.iconColor} flex items-center justify-center shrink-0`}
      >
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-800 text-sm">
          {toast.title}
        </div>
        {toast.description && (
          <div className="text-xs text-slate-500 mt-0.5 leading-snug">
            {toast.description}
          </div>
        )}
      </div>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-700 p-0.5 btn-press"
      >
        <X size={14} />
      </button>
    </div>
  );
}
