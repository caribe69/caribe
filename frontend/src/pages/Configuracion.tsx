import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building,
  Key,
  Upload,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

interface Config {
  id: number;
  empresaNombre?: string | null;
  empresaRuc?: string | null;
  empresaDireccion?: string | null;
  empresaTelefono?: string | null;
  empresaEmail?: string | null;
  logoPath?: string | null;
  apiDniToken?: string | null;
  apiRucToken?: string | null;
  apiDniUrl?: string;
  apiRucUrl?: string;
}

export default function Configuracion() {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const { data } = useQuery<Config>({
    queryKey: ['config'],
    queryFn: async () => (await api.get('/settings')).data,
  });

  const [form, setForm] = useState<Config>({
    id: 1,
    empresaNombre: '',
    empresaRuc: '',
    empresaDireccion: '',
    empresaTelefono: '',
    empresaEmail: '',
    apiDniToken: '',
    apiRucToken: '',
    apiDniUrl: 'https://dniruc.apisperu.com/api/v1/dni',
    apiRucUrl: 'https://dniruc.apisperu.com/api/v1/ruc',
  });
  const [showDniToken, setShowDniToken] = useState(false);
  const [showRucToken, setShowRucToken] = useState(false);
  const [probandoDni, setProbandoDni] = useState(false);
  const [resultadoProbar, setResultadoProbar] = useState<any | null>(null);

  useEffect(() => {
    if (data) {
      setForm({
        id: data.id,
        empresaNombre: data.empresaNombre || '',
        empresaRuc: data.empresaRuc || '',
        empresaDireccion: data.empresaDireccion || '',
        empresaTelefono: data.empresaTelefono || '',
        empresaEmail: data.empresaEmail || '',
        apiDniToken: data.apiDniToken || '',
        apiRucToken: data.apiRucToken || '',
        apiDniUrl: data.apiDniUrl || 'https://dniruc.apisperu.com/api/v1/dni',
        apiRucUrl: data.apiRucUrl || 'https://dniruc.apisperu.com/api/v1/ruc',
        logoPath: data.logoPath,
      });
    }
  }, [data]);

  const guardar = useMutation({
    mutationFn: async () =>
      (
        await api.patch('/settings', {
          empresaNombre: form.empresaNombre || null,
          empresaRuc: form.empresaRuc || null,
          empresaDireccion: form.empresaDireccion || null,
          empresaTelefono: form.empresaTelefono || null,
          empresaEmail: form.empresaEmail || null,
          apiDniToken: form.apiDniToken || null,
          apiRucToken: form.apiRucToken || null,
          apiDniUrl: form.apiDniUrl,
          apiRucUrl: form.apiRucUrl,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config'] });
      toast({
        type: 'success',
        title: 'Configuración guardada',
        description: 'Los cambios se aplicarán a todo el sistema.',
      });
    },
    onError: (err: any) =>
      toast({
        type: 'error',
        title: 'Error',
        description: err.response?.data?.message || err.message,
      }),
  });

  const subirLogo = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('logo', file);
      return (
        await api.post('/settings/logo', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      ).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config'] });
      toast({ type: 'success', title: 'Logo actualizado' });
    },
  });

  const probarDni = async () => {
    setProbandoDni(true);
    setResultadoProbar(null);
    try {
      // usa guardado (no el del form) para probar con el último que se guardó
      await api.patch('/settings', { apiDniToken: form.apiDniToken });
      const r = await api.get('/alquileres/clientes/buscar', {
        params: { dni: '10000001' },
      });
      setResultadoProbar(r.data);
    } catch (err: any) {
      setResultadoProbar({ error: err.response?.data?.message || err.message });
    } finally {
      setProbandoDni(false);
    }
  };

  const inputCls =
    'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition';

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Empresa */}
      <section className="bg-white rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Building size={18} className="text-violet-600" />
          <h2 className="font-hotel text-lg font-bold text-slate-900">
            Datos de la empresa
          </h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Esta información se usa para el branding del sistema y el cierre de caja.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Razón social / Nombre">
            <input
              className={inputCls}
              value={form.empresaNombre || ''}
              onChange={(e) =>
                setForm({ ...form, empresaNombre: e.target.value })
              }
            />
          </Field>
          <Field label="RUC">
            <input
              className={inputCls}
              value={form.empresaRuc || ''}
              onChange={(e) => setForm({ ...form, empresaRuc: e.target.value })}
            />
          </Field>
          <Field label="Dirección">
            <input
              className={inputCls}
              value={form.empresaDireccion || ''}
              onChange={(e) =>
                setForm({ ...form, empresaDireccion: e.target.value })
              }
            />
          </Field>
          <Field label="Teléfono">
            <input
              className={inputCls}
              value={form.empresaTelefono || ''}
              onChange={(e) =>
                setForm({ ...form, empresaTelefono: e.target.value })
              }
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={inputCls}
              value={form.empresaEmail || ''}
              onChange={(e) =>
                setForm({ ...form, empresaEmail: e.target.value })
              }
            />
          </Field>
        </div>

        {/* Logo */}
        <div className="mt-5 border-t border-slate-100 pt-5">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
            Logo
          </div>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
              {form.logoPath ? (
                <img src={form.logoPath} className="max-w-full max-h-full" />
              ) : (
                <Building size={32} className="text-slate-400" />
              )}
            </div>
            <div>
              <label className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer btn-press">
                <Upload size={14} />
                Subir logo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) subirLogo.mutate(e.target.files[0]);
                  }}
                />
              </label>
              <p className="text-xs text-slate-400 mt-2">
                PNG, JPG, WEBP o SVG. Máx 5MB.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* APIs */}
      <section className="bg-white rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Key size={18} className="text-violet-600" />
          <h2 className="font-hotel text-lg font-bold text-slate-900">
            APIs externas · Consulta RENIEC / SUNAT
          </h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Si configuras un token, al crear un alquiler el sistema buscará
          primero en tu historial (cliente frecuente) y si no existe consultará
          el servicio externo para auto-completar los datos del huésped.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Token API DNI (apisperu.com)">
            <div className="relative">
              <input
                type={showDniToken ? 'text' : 'password'}
                className={`${inputCls} pr-10 font-mono text-xs`}
                placeholder="eyJ0eXAi..."
                value={form.apiDniToken || ''}
                onChange={(e) =>
                  setForm({ ...form, apiDniToken: e.target.value })
                }
              />
              <button
                type="button"
                onClick={() => setShowDniToken((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-violet-600"
              >
                {showDniToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
          <Field label="URL API DNI">
            <input
              className={`${inputCls} font-mono text-xs`}
              value={form.apiDniUrl || ''}
              onChange={(e) => setForm({ ...form, apiDniUrl: e.target.value })}
            />
          </Field>
          <Field label="Token API RUC (apisperu.com)">
            <div className="relative">
              <input
                type={showRucToken ? 'text' : 'password'}
                className={`${inputCls} pr-10 font-mono text-xs`}
                placeholder="eyJ0eXAi..."
                value={form.apiRucToken || ''}
                onChange={(e) =>
                  setForm({ ...form, apiRucToken: e.target.value })
                }
              />
              <button
                type="button"
                onClick={() => setShowRucToken((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-violet-600"
              >
                {showRucToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
          <Field label="URL API RUC">
            <input
              className={`${inputCls} font-mono text-xs`}
              value={form.apiRucUrl || ''}
              onChange={(e) => setForm({ ...form, apiRucUrl: e.target.value })}
            />
          </Field>
        </div>

        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <button
            onClick={probarDni}
            disabled={probandoDni || !form.apiDniToken}
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 btn-press"
          >
            {probandoDni ? 'Probando...' : 'Probar DNI de prueba'}
          </button>
          {resultadoProbar && (
            <div
              className={`text-xs px-3 py-1.5 rounded-lg ${
                resultadoProbar.encontrado
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {resultadoProbar.encontrado ? (
                <>
                  <CheckCircle2 size={11} className="inline mr-1" />
                  Funciona. Fuente: <b>{resultadoProbar.fuente}</b>. Nombre:{' '}
                  {resultadoProbar.nombre}
                </>
              ) : (
                <>
                  Fuente: <b>{resultadoProbar.fuente || 'desconocida'}</b>
                  {resultadoProbar.error ? ` · ${resultadoProbar.error}` : ''}
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="flex justify-end sticky bottom-4">
        <button
          onClick={() => guardar.mutate()}
          disabled={guardar.isPending}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-violet-500/30 btn-press transition disabled:opacity-50"
        >
          <Save size={16} /> {guardar.isPending ? 'Guardando...' : 'Guardar todo'}
        </button>
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
