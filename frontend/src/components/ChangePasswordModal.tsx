import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Lock, Check, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from './ToastProvider';

interface Props {
  onClose: () => void;
}

export default function ChangePasswordModal({ onClose }: Props) {
  const { show } = useToast();
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cambiar = useMutation({
    mutationFn: async () => {
      if (form.newPassword !== form.confirmPassword) {
        throw new Error('Las contraseñas nuevas no coinciden');
      }
      if (form.newPassword.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }
      return (
        await api.patch('/auth/change-password', {
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        })
      ).data;
    },
    onSuccess: () => {
      show({
        type: 'success',
        title: 'Contraseña actualizada',
        description: 'Tu nueva contraseña está activa.',
      });
      onClose();
    },
    onError: (err: any) => {
      setError(
        err.response?.data?.message || err.message || 'Error al cambiar',
      );
    },
  });

  const fuerte = form.newPassword.length >= 6;
  const coincide =
    form.confirmPassword.length > 0 &&
    form.newPassword === form.confirmPassword;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-in overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center ring-8 ring-violet-100 shrink-0">
              <Lock size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-hotel text-xl font-bold text-slate-900">
                Cambiar contraseña
              </h2>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                Protege tu cuenta con una contraseña nueva.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 btn-press"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 space-y-3">
            <Field label="Contraseña actual">
              <PasswordInput
                value={form.currentPassword}
                show={showPwd}
                onChange={(v) => setForm({ ...form, currentPassword: v })}
                onToggle={() => setShowPwd((s) => !s)}
              />
            </Field>
            <Field label="Contraseña nueva">
              <PasswordInput
                value={form.newPassword}
                show={showPwd}
                onChange={(v) => setForm({ ...form, newPassword: v })}
                onToggle={() => setShowPwd((s) => !s)}
              />
              <div className="mt-1.5 flex items-center gap-1 text-[11px]">
                <Check
                  size={12}
                  className={fuerte ? 'text-emerald-600' : 'text-slate-300'}
                />
                <span
                  className={fuerte ? 'text-emerald-600' : 'text-slate-400'}
                >
                  Mínimo 6 caracteres
                </span>
              </div>
            </Field>
            <Field label="Confirmar contraseña nueva">
              <PasswordInput
                value={form.confirmPassword}
                show={showPwd}
                onChange={(v) => setForm({ ...form, confirmPassword: v })}
                onToggle={() => setShowPwd((s) => !s)}
              />
              {form.confirmPassword.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1 text-[11px]">
                  <Check
                    size={12}
                    className={
                      coincide ? 'text-emerald-600' : 'text-rose-400'
                    }
                  />
                  <span
                    className={
                      coincide ? 'text-emerald-600' : 'text-rose-500'
                    }
                  >
                    {coincide
                      ? 'Las contraseñas coinciden'
                      : 'No coinciden'}
                  </span>
                </div>
              )}
            </Field>

            {error && (
              <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
                {error}
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 flex gap-2 justify-end border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 btn-press"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              setError(null);
              cambiar.mutate();
            }}
            disabled={
              cambiar.isPending ||
              !form.currentPassword ||
              !fuerte ||
              !coincide
            }
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 shadow-md shadow-violet-500/30 btn-press disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cambiar.isPending ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  show,
  onToggle,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
      />
      <button
        type="button"
        onClick={onToggle}
        tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-violet-600"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}
