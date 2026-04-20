import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AlertTriangle,
  X,
  Check,
  Info,
  XCircle,
  Pencil,
} from 'lucide-react';

type Variant = 'info' | 'warning' | 'danger' | 'success';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: Variant;
}

export interface PromptOptions extends ConfirmOptions {
  placeholder?: string;
  defaultValue?: string;
  multiline?: boolean;
  minLength?: number;
}

interface ConfirmState {
  opts: ConfirmOptions;
  resolve: (ok: boolean) => void;
}

interface PromptState {
  opts: PromptOptions;
  resolve: (value: string | null) => void;
}

interface Ctx {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  prompt: (opts: PromptOptions) => Promise<string | null>;
}

const ConfirmContext = createContext<Ctx | null>(null);

const VARIANT_STYLES: Record<
  Variant,
  { Icon: React.ComponentType<{ size?: number; className?: string }>; ring: string; iconBg: string; iconColor: string; confirmBtn: string }
> = {
  info: {
    Icon: Info,
    ring: 'ring-violet-100',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    confirmBtn:
      'bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 shadow-violet-500/30',
  },
  success: {
    Icon: Check,
    ring: 'ring-emerald-100',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    confirmBtn:
      'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-emerald-500/30',
  },
  warning: {
    Icon: AlertTriangle,
    ring: 'ring-amber-100',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    confirmBtn:
      'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 shadow-amber-500/30',
  },
  danger: {
    Icon: XCircle,
    ring: 'ring-rose-100',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    confirmBtn:
      'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 shadow-rose-500/30',
  },
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [cState, setCState] = useState<ConfirmState | null>(null);
  const [pState, setPState] = useState<PromptState | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setCState({ opts, resolve });
    });
  }, []);

  const prompt = useCallback((opts: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setPState({ opts, resolve });
    });
  }, []);

  const handleConfirmClose = (ok: boolean) => {
    cState?.resolve(ok);
    setCState(null);
  };

  const handlePromptClose = (value: string | null) => {
    pState?.resolve(value);
    setPState(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm, prompt }}>
      {children}
      {cState && (
        <ConfirmDialog opts={cState.opts} onClose={handleConfirmClose} />
      )}
      {pState && (
        <PromptDialog opts={pState.opts} onClose={handlePromptClose} />
      )}
    </ConfirmContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(ConfirmContext);
  if (!ctx)
    throw new Error('useDialog debe usarse dentro de <ConfirmProvider>');
  return ctx;
}

function ConfirmDialog({
  opts,
  onClose,
}: {
  opts: ConfirmOptions;
  onClose: (ok: boolean) => void;
}) {
  const theme = VARIANT_STYLES[opts.variant || 'info'];
  const { Icon } = theme;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(false);
      if (e.key === 'Enter') onClose(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-in overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl ${theme.iconBg} ${theme.iconColor} flex items-center justify-center ring-8 ${theme.ring} shrink-0`}
            >
              <Icon size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-hotel text-xl font-bold text-slate-900">
                {opts.title}
              </h2>
              {opts.message && (
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  {opts.message}
                </p>
              )}
            </div>
            <button
              onClick={() => onClose(false)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 btn-press"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 flex gap-2 justify-end border-t border-slate-100">
          <button
            onClick={() => onClose(false)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 btn-press transition"
          >
            {opts.cancelText || 'Cancelar'}
          </button>
          <button
            onClick={() => onClose(true)}
            autoFocus
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md btn-press transition ${theme.confirmBtn}`}
          >
            {opts.confirmText || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PromptDialog({
  opts,
  onClose,
}: {
  opts: PromptOptions;
  onClose: (value: string | null) => void;
}) {
  const theme = VARIANT_STYLES[opts.variant || 'info'];
  const [value, setValue] = useState(opts.defaultValue || '');
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const minLen = opts.minLength ?? 1;
  const ok = value.trim().length >= minLen;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!ok) return;
    onClose(value.trim());
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-in overflow-hidden">
        <form onSubmit={submit} className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div
              className={`w-12 h-12 rounded-2xl ${theme.iconBg} ${theme.iconColor} flex items-center justify-center ring-8 ${theme.ring} shrink-0`}
            >
              <Pencil size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-hotel text-xl font-bold text-slate-900">
                {opts.title}
              </h2>
              {opts.message && (
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  {opts.message}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onClose(null)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 btn-press"
            >
              <X size={18} />
            </button>
          </div>

          {opts.multiline ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={opts.placeholder}
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={opts.placeholder}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
            />
          )}
        </form>
        <div className="px-6 py-4 bg-slate-50 flex gap-2 justify-end border-t border-slate-100">
          <button
            onClick={() => onClose(null)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 btn-press transition"
          >
            {opts.cancelText || 'Cancelar'}
          </button>
          <button
            onClick={() => submit()}
            disabled={!ok}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md btn-press transition disabled:opacity-50 disabled:cursor-not-allowed ${theme.confirmBtn}`}
          >
            {opts.confirmText || 'Aceptar'}
          </button>
        </div>
      </div>
    </div>
  );
}
