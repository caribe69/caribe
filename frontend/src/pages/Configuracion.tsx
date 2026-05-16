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
  Clock,
  ShieldCheck,
  FileText,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { useAuthStore } from '@/store/auth';
import { ThumbImg } from '@/lib/imageUrl';

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
  sessionTtlDays?: number;
  // NubeFact
  nubefactRuta?: string | null;
  nubefactToken?: string | null;
  nubefactSerieFactura?: string;
  nubefactSerieBoleta?: string;
  nubefactIgvHospedaje?: number | string;
  nubefactIgvProductos?: number | string;
  nubefactConfigured?: boolean;
}

const SESSION_PRESETS = [1, 7, 14, 30, 60, 90, 180, 365];

export default function Configuracion() {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const usuario = useAuthStore((s) => s.usuario);
  const isSuper = usuario?.rol === 'SUPERADMIN';
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
    sessionTtlDays: 30,
    nubefactRuta: '',
    nubefactToken: '',
    nubefactSerieFactura: 'F001',
    nubefactSerieBoleta: 'B001',
    nubefactIgvHospedaje: 10.5,
    nubefactIgvProductos: 18,
  });
  const [showDniToken, setShowDniToken] = useState(false);
  const [showRucToken, setShowRucToken] = useState(false);
  const [showNfToken, setShowNfToken] = useState(false);
  const [probandoDni, setProbandoDni] = useState(false);
  const [resultadoProbar, setResultadoProbar] = useState<any | null>(null);
  const [probandoNubefact, setProbandoNubefact] = useState(false);
  const [resultadoNubefact, setResultadoNubefact] = useState<any | null>(null);

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
        sessionTtlDays: data.sessionTtlDays ?? 30,
        nubefactRuta: (data as any).nubefactRuta || '',
        nubefactToken: (data as any).nubefactToken || '',
        nubefactSerieFactura: (data as any).nubefactSerieFactura || 'F001',
        nubefactSerieBoleta: (data as any).nubefactSerieBoleta || 'B001',
        nubefactIgvHospedaje: (data as any).nubefactIgvHospedaje ?? 10.5,
        nubefactIgvProductos: (data as any).nubefactIgvProductos ?? 18,
        nubefactConfigured: (data as any).nubefactConfigured,
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
          sessionTtlDays: form.sessionTtlDays ?? 30,
          nubefactRuta: form.nubefactRuta || null,
          nubefactToken: form.nubefactToken || null,
          nubefactSerieFactura: form.nubefactSerieFactura || 'F001',
          nubefactSerieBoleta: form.nubefactSerieBoleta || 'B001',
          nubefactIgvHospedaje: Number(form.nubefactIgvHospedaje ?? 10.5),
          nubefactIgvProductos: Number(form.nubefactIgvProductos ?? 18),
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

  const probarNubefact = async () => {
    setProbandoNubefact(true);
    setResultadoNubefact(null);
    try {
      // Primero guarda los datos actuales para que el backend use lo último
      await api.patch('/settings', {
        nubefactRuta: form.nubefactRuta || null,
        nubefactToken: form.nubefactToken || null,
      });
      const r = await api.post('/nubefact/test');
      setResultadoNubefact(r.data);
    } catch (err: any) {
      setResultadoNubefact({
        ok: false,
        mensaje: err.response?.data?.message || err.message,
      });
    } finally {
      setProbandoNubefact(false);
    }
  };

  const probarDni = async () => {
    setProbandoDni(true);
    setResultadoProbar(null);
    try {
      // Guarda token + URL del form antes de probar (no la versión persistida)
      // así el botón refleja exactamente lo que hay en pantalla.
      await api.patch('/settings', {
        apiDniToken: form.apiDniToken,
        apiDniUrl: form.apiDniUrl,
      });
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
                <ThumbImg
                  src={form.logoPath}
                  className="max-w-full max-h-full"
                />
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
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 mb-4 text-xs text-violet-900 dark:text-violet-200">
          <div className="font-semibold mb-1">📌 Proveedores soportados:</div>
          <div>
            <b>apisperu.com</b> — plan básico solo devuelve nombres.{' '}
            <code className="bg-white dark:bg-slate-800 dark:text-violet-100 px-1 py-0.5 rounded">
              https://dniruc.apisperu.com/api/v1/dni
            </code>
          </div>
          <div className="mt-1">
            <b>perudevs.com</b> — incluye fecha nacimiento + edad:{' '}
            <code className="bg-white dark:bg-slate-800 dark:text-violet-100 px-1 py-0.5 rounded">
              https://api.perudevs.com/api/v1/dni/complete
            </code>
          </div>
          <div className="mt-1 text-violet-700 dark:text-violet-300">
            El sistema detecta el proveedor automáticamente por la URL.
          </div>
        </div>

        {/* Honeypot: inputs ocultos que absorben el autorrelleno del browser.
            Sin esto, el password manager rellena los tokens reales con la
            contraseña del usuario cada vez que se guarda algo. */}
        <input
          type="text"
          name="username"
          autoComplete="username"
          tabIndex={-1}
          aria-hidden="true"
          style={{ position: 'absolute', left: -9999, opacity: 0, height: 0 }}
        />
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          tabIndex={-1}
          aria-hidden="true"
          style={{ position: 'absolute', left: -9999, opacity: 0, height: 0 }}
        />

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Token / Key API DNI">
            <div className="relative">
              <input
                type={showDniToken ? 'text' : 'password'}
                className={`${inputCls} pr-10 font-mono text-xs`}
                placeholder="eyJ0eXAi..."
                value={form.apiDniToken || ''}
                onChange={(e) =>
                  setForm({ ...form, apiDniToken: e.target.value })
                }
                name="dni-api-key"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                data-1p-ignore="true"
                spellCheck={false}
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
                name="ruc-api-key"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                data-1p-ignore="true"
                spellCheck={false}
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
              className={`text-xs px-3 py-2 rounded-lg max-w-2xl ${
                resultadoProbar.encontrado
                  ? 'bg-emerald-100 text-emerald-800 dark:text-emerald-200'
                  : resultadoProbar.fuente === 'api_error'
                    ? 'bg-rose-100 text-rose-800 dark:text-rose-200'
                    : 'bg-amber-100 text-amber-800 dark:text-amber-200'
              }`}
            >
              {resultadoProbar.encontrado ? (
                <>
                  <CheckCircle2 size={11} className="inline mr-1" />
                  Funciona. Fuente: <b>{resultadoProbar.fuente}</b>. Nombre:{' '}
                  {resultadoProbar.nombre}
                </>
              ) : (
                <div className="space-y-0.5">
                  <div>
                    Fuente: <b>{resultadoProbar.fuente || 'desconocida'}</b>
                    {resultadoProbar.statusCode
                      ? ` · HTTP ${resultadoProbar.statusCode}`
                      : ''}
                  </div>
                  {resultadoProbar.error && (
                    <div className="font-semibold">
                      ⚠ {resultadoProbar.error}
                    </div>
                  )}
                  {resultadoProbar.detalle && (
                    <div className="opacity-80 font-mono text-[10px] mt-1 break-all">
                      Respuesta del proveedor: {resultadoProbar.detalle}
                    </div>
                  )}
                  {resultadoProbar.fuente === 'api_error' &&
                    !resultadoProbar.statusCode && (
                      <div className="opacity-75 mt-1">
                        Sugerencia: verifica que la URL sea accesible y que el
                        token esté vigente. perudevs y apisperu requieren
                        registrarse en su web para obtener el key real (no
                        sirve un valor de prueba).
                      </div>
                    )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Sesión — duración del JWT (SUPERADMIN only) */}
      {isSuper && (
        <section className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={18} className="text-violet-600" />
            <h2 className="font-hotel text-lg font-bold text-slate-900">
              Duración de sesión
            </h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Cuánto dura la sesión antes de pedir volver a iniciar sesión.
            Los cambios se aplican en los próximos logins (los tokens ya
            emitidos mantienen su expiración anterior).
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {SESSION_PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setForm({ ...form, sessionTtlDays: d })}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                  form.sessionTtlDays === d
                    ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-500/30'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-violet-300 hover:bg-violet-50'
                }`}
              >
                {d === 1 ? '1 día' : d === 365 ? '1 año' : `${d} días`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Valor personalizado (1–365 días)
              </label>
              <input
                type="number"
                min={1}
                max={365}
                className={`${inputCls} mt-1`}
                value={form.sessionTtlDays ?? 30}
                onChange={(e) =>
                  setForm({
                    ...form,
                    sessionTtlDays: Math.min(365, Math.max(1, Number(e.target.value) || 30)),
                  })
                }
              />
            </div>
            <div className="flex-1 bg-violet-50 rounded-xl p-4 flex items-center gap-3">
              <Clock size={20} className="text-violet-600 shrink-0" />
              <div>
                <div className="text-[10px] font-semibold text-violet-700 uppercase tracking-widest">
                  Actual
                </div>
                <div className="text-lg font-bold text-slate-900 tabular-nums">
                  {form.sessionTtlDays ?? 30} día{(form.sessionTtlDays ?? 30) === 1 ? '' : 's'}
                </div>
                <div className="text-[11px] text-slate-500">
                  ≈ {((form.sessionTtlDays ?? 30) * 24).toLocaleString('es-PE')} horas
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─────────── Facturación electrónica (NubeFact) ─────────── */}
      <section className="bg-white rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <FileText size={18} className="text-violet-600" />
          <h2 className="font-hotel text-lg font-bold text-slate-900">
            Facturación electrónica · NubeFact / SUNAT
          </h2>
          {data?.nubefactConfigured && (
            <span className="inline-flex items-center gap-1 ml-2 text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-1 rounded-full">
              <CheckCircle2 size={10} /> Configurado
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Ruta y token que entrega NubeFact al activar la integración API.
          Estos datos se envían como <code className="text-violet-700 dark:text-violet-200 bg-violet-50 dark:bg-slate-800 px-1 rounded">Authorization</code> en cada
          llamada al servicio de emisión.
        </p>

        <div className="space-y-4">
          <Field label="Ruta / URL del API">
            <input
              type="url"
              className={inputCls}
              placeholder="https://api.nubefact.com/api/v1/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={form.nubefactRuta || ''}
              onChange={(e) =>
                setForm({ ...form, nubefactRuta: e.target.value })
              }
            />
          </Field>

          <Field label="Token de autenticación">
            <div className="relative">
              <input
                type={showNfToken ? 'text' : 'password'}
                className={`${inputCls} pr-10 font-mono text-xs`}
                placeholder="UUID o JWT entregado por NubeFact"
                value={form.nubefactToken || ''}
                onChange={(e) =>
                  setForm({ ...form, nubefactToken: e.target.value })
                }
                name="nubefact-api-key"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                data-1p-ignore="true"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowNfToken((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showNfToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Serie para Facturas">
              <input
                className={inputCls}
                maxLength={4}
                placeholder="F001"
                value={form.nubefactSerieFactura || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    nubefactSerieFactura: e.target.value.toUpperCase(),
                  })
                }
              />
            </Field>
            <Field label="Serie para Boletas">
              <input
                className={inputCls}
                maxLength={4}
                placeholder="B001"
                value={form.nubefactSerieBoleta || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    nubefactSerieBoleta: e.target.value.toUpperCase(),
                  })
                }
              />
            </Field>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label="IGV Hospedaje (%)">
              <input
                type="number"
                step="0.1"
                min="0"
                max="50"
                className={inputCls}
                value={form.nubefactIgvHospedaje as any}
                onChange={(e) =>
                  setForm({
                    ...form,
                    nubefactIgvHospedaje: e.target.value,
                  })
                }
              />
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Ley turismo: <b>10.5%</b> en líneas de alojamiento.
              </div>
            </Field>
            <Field label="IGV Productos (%)">
              <input
                type="number"
                step="0.1"
                min="0"
                max="50"
                className={inputCls}
                value={form.nubefactIgvProductos as any}
                onChange={(e) =>
                  setForm({
                    ...form,
                    nubefactIgvProductos: e.target.value,
                  })
                }
              />
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                General: <b>18%</b> en consumos de productos.
              </div>
            </Field>
          </div>

          {/* Botón Probar conexión */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={probarNubefact}
              disabled={probandoNubefact || !form.nubefactRuta || !form.nubefactToken}
              className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-medium btn-press disabled:opacity-50"
            >
              <Zap size={14} />
              {probandoNubefact ? 'Probando…' : 'Probar conexión'}
            </button>
            {resultadoNubefact && (
              <div
                className={`flex-1 min-w-[280px] text-[12px] rounded-lg p-2.5 border ${
                  resultadoNubefact.ok
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  {resultadoNubefact.ok ? (
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold">
                      {resultadoNubefact.ok
                        ? 'Conexión correcta'
                        : 'Conexión fallida'}
                    </div>
                    <div className="text-[11px] opacity-90 mt-0.5">
                      {resultadoNubefact.mensaje}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
            ⓘ Endpoints habilitados (aún no vinculados a flujos automáticos):
            <span className="font-mono text-slate-500 dark:text-slate-300 ml-1">
              POST /api/nubefact/test · POST /api/nubefact/alquileres/:id/emitir ·
              POST /api/nubefact/ventas/:id/emitir · GET /api/nubefact/consultar ·
              POST /api/nubefact/anular
            </span>
          </div>
        </div>
      </section>

      {/* Las series SUNAT se gestionan desde cada sede ahora — ya no
          hace falta una sección global acá. */}
      <section className="bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800/50 rounded-2xl p-4 text-sm text-violet-800 dark:text-violet-200">
        <div className="flex items-start gap-3">
          <FileText size={18} className="shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold mb-1">Series SUNAT</div>
            <div className="text-xs">
              Las series de boleta/factura ahora se configuran directamente en
              cada sede. Andá a <b>Sedes</b> y tocá <b>"Configurar SUNAT"</b>{' '}
              en la sede que necesites. Si una sede no tiene series cargadas,
              te aparece en ámbar parpadeando para que la atiendas.
            </div>
          </div>
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
