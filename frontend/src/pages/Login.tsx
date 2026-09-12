import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogIn,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  BedDouble,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore, rutaInicial } from '@/store/auth';

interface SedeOpcion {
  id: number;
  nombre: string;
  grupo?: string | null;
}

const ULTIMA_SEDE_KEY = 'hotel-login-sede';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Todas las sedes se listan por defecto en el selector; el usuario elige a
  // cuál entra. Si no le pertenece, el backend simplemente no lo deja.
  const [sedes, setSedes] = useState<SedeOpcion[]>([]);
  const [sedeId, setSedeId] = useState<number | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  // Sedes agrupadas para el selector: sueltas + edificios bajo su complejo.
  const sedesSueltas = sedes.filter((s) => !s.grupo);
  const gruposSede = new Map<string, SedeOpcion[]>();
  for (const s of sedes) {
    if (s.grupo) {
      const arr = gruposSede.get(s.grupo) || [];
      arr.push(s);
      gruposSede.set(s.grupo, arr);
    }
  }

  // Al abrir el login: trae TODAS las sedes operativas (endpoint público).
  // Preselecciona la última usada en este equipo, o la primera de la lista.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { data } = await api.get('/public/sedes');
        if (!vivo || !Array.isArray(data)) return;
        setSedes(data);
        const guardada = Number(localStorage.getItem(ULTIMA_SEDE_KEY));
        const existe = data.find((s: SedeOpcion) => s.id === guardada);
        setSedeId(existe ? guardada : data[0]?.id ?? null);
      } catch {
        /* si falla, se puede intentar login igual (fallback a sede propia) */
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim()) return setError('Escribe tu usuario.');
    if (sedes.length && !sedeId) {
      return setError('Elige la sede a la que quieres ingresar.');
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        username: username.trim(),
        password,
        ...(sedeId ? { sedeId } : {}),
      });
      if (sedeId) localStorage.setItem(ULTIMA_SEDE_KEY, String(sedeId));
      setAuth(data.access_token, data.usuario);
      // Lleva directo al módulo inicial según el rol (Alquileres si tiene acceso).
      navigate(rutaInicial(data.usuario?.rol));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* IZQUIERDA · Hero con imagen del lobby */}
      <div
        className="hidden lg:flex lg:w-[58%] relative overflow-hidden"
        style={{
          backgroundImage: "url('/login-bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay oscuro vertical */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(2,6,23,0.3) 0%, rgba(2,6,23,0.55) 55%, rgba(2,6,23,0.92) 100%)',
          }}
        />
        {/* Glow lateral violeta */}
        <div className="absolute -left-32 top-1/3 w-96 h-96 bg-violet-600/20 blur-3xl rounded-full" />
        <div className="absolute right-10 top-10 w-64 h-64 bg-amber-400/10 blur-3xl rounded-full" />

        {/* Contenido */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">
          {/* Branding top */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Sol Caribe"
              className="w-12 h-12 rounded-full shadow-lg shadow-black/40 ring-2 ring-amber-400/50"
            />
            <div>
              <div className="font-hotel text-xl font-bold tracking-tight">
                Sol Caribe
              </div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-slate-300">
                Management Suite
              </div>
            </div>
          </div>

          {/* Mensaje central */}
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[11px] uppercase tracking-widest px-3 py-1.5 rounded-full mb-6">
              <Sparkles size={12} className="text-amber-300" />
              Plataforma multi-sede
            </div>
            <h1 className="font-hotel text-5xl xl:text-6xl font-bold leading-[1.05] tracking-tight">
              Gestiona tu hotel{' '}
              <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200 bg-clip-text text-transparent">
                como un profesional.
              </span>
            </h1>
            <p className="mt-5 text-slate-300 text-base xl:text-lg leading-relaxed max-w-md">
              Control total de habitaciones, alquileres, caja y limpieza
              en todas tus sedes · en tiempo real.
            </p>
          </div>

          {/* Bullets de confianza */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/10">
            <Feature n="4+" label="Sedes" />
            <Feature n="24/7" label="Monitoreo" />
            <Feature
              icon={<ShieldCheck size={22} className="text-amber-300" />}
              label="Datos seguros"
            />
          </div>
        </div>
      </div>

      {/* DERECHA · Formulario */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10 relative bg-slate-50">
        {/* Fondo sutil decorativo mobile */}
        <div className="lg:hidden absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "url('/login-bg.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(2px)',
            }}
          />
          <div className="absolute inset-0 bg-slate-950/80" />
        </div>

        <div className="relative w-full max-w-md">
          {/* Brand mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-2xl">
              <img
                src="/logo.png"
                alt="Sol Caribe"
                className="w-10 h-10 rounded-full ring-2 ring-amber-400/40"
              />
              <div className="text-left">
                <div className="font-hotel text-base font-bold text-white">
                  Sol Caribe
                </div>
                <div className="text-[9px] uppercase tracking-widest text-slate-300">
                  Management Suite
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl shadow-slate-900/10 p-8 lg:p-10 border border-slate-100">
            <div className="mb-7">
              <h2 className="font-hotel text-3xl font-bold text-slate-900 tracking-tight">
                Bienvenido
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Ingresa tus credenciales para continuar.
              </p>
            </div>

            {/* Formulario único · Sede + Usuario + Contraseña */}
            <form onSubmit={submit} className="space-y-4">
              {/* Selector de sede — se listan TODAS las sedes por defecto */}
              {sedes.length > 0 && (
                <div>
                  <label className="text-[10px] font-semibold text-violet-700 uppercase tracking-widest flex items-center gap-1.5">
                    <BedDouble size={12} /> Sede
                  </label>
                  <select
                    value={sedeId ?? ''}
                    onChange={(e) => setSedeId(Number(e.target.value))}
                    className="mt-1.5 w-full border border-violet-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-500 transition bg-violet-50/50"
                  >
                    {sedesSueltas.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                    {Array.from(gruposSede.entries()).map(([grupo, items]) => (
                      <optgroup key={grupo} label={grupo}>
                        {items.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nombre}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                  Usuario
                </label>
                <input
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  className="mt-1.5 w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-500 transition bg-slate-50 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                  Contraseña
                </label>
                <div className="relative mt-1.5">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-500 transition bg-slate-50 focus:bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-violet-600 rounded-lg"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-rose-700 dark:text-rose-200 bg-rose-50 border border-rose-200 dark:border-rose-500/30 rounded-xl p-3 animate-fade-in">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-700 via-violet-600 to-violet-500 hover:shadow-violet-500/40 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-violet-600/30 transition-all disabled:opacity-60 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Iniciar sesión
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="text-center mt-6 text-[11px] text-slate-500 lg:text-slate-400">
            © {new Date().getFullYear()} Hotel Sol Caribe · Todos los derechos
            reservados
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({
  n,
  icon,
  label,
}: {
  n?: string;
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        {icon ? (
          icon
        ) : (
          <div className="text-2xl font-bold font-hotel bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
            {n}
          </div>
        )}
      </div>
      <div className="text-[11px] uppercase tracking-widest text-slate-300">
        {label}
      </div>
    </div>
  );
}

