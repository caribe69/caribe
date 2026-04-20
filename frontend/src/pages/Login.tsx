import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Palmtree, LogIn, Waves } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function Login() {
  const [username, setUsername] = useState('superadmin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { username, password });
      setAuth(data.access_token, data.usuario);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, var(--color-caribe-800) 0%, var(--color-caribe-600) 50%, var(--color-caribe-500) 100%)',
      }}
    >
      {/* Decoración: ondas */}
      <div className="absolute inset-0 opacity-10">
        <Waves size={600} className="text-white absolute -bottom-20 -right-20" />
      </div>
      <div className="absolute top-10 left-10 opacity-10">
        <Palmtree size={200} className="text-white" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Branding arriba de la tarjeta */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-gold-300 to-gold-500 shadow-xl mb-3">
            <Palmtree size={30} className="text-caribe-900" />
          </div>
          <h1 className="font-hotel text-3xl font-bold text-white">
            Caribe Hotel
          </h1>
          <p className="text-caribe-100 text-sm tracking-widest uppercase mt-1">
            Sistema de gestión
          </p>
        </div>

        {/* Tarjeta de login */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border-t-4 border-gold-400">
          <h2 className="font-hotel text-xl font-semibold text-caribe-900 mb-1">
            Bienvenido
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Ingresa tus credenciales para continuar
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                Usuario
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-caribe-500 focus:border-caribe-500 transition"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-caribe-500 focus:border-caribe-500 transition"
                required
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-caribe-700 to-caribe-600 hover:from-caribe-800 hover:to-caribe-700 text-white py-3 rounded-lg font-medium transition disabled:opacity-60 shadow-md"
            >
              <LogIn size={18} />
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="text-[10px] uppercase tracking-widest text-slate-400 text-center mb-2">
              Usuarios demo
            </div>
            <div className="text-xs text-slate-500 text-center leading-relaxed">
              <div><code className="bg-slate-100 px-1.5 py-0.5 rounded">superadmin</code> · <code className="bg-slate-100 px-1.5 py-0.5 rounded">admin_central</code></div>
              <div className="mt-1"><code className="bg-slate-100 px-1.5 py-0.5 rounded">hotelero_central</code> · <code className="bg-slate-100 px-1.5 py-0.5 rounded">limpieza_central</code></div>
              <div className="text-slate-400 mt-2">Contraseña: admin123</div>
            </div>
          </div>
        </div>

        <div className="text-center mt-5 text-xs text-caribe-100">
          © {new Date().getFullYear()} Caribe Hotel · Todos los derechos reservados
        </div>
      </div>
    </div>
  );
}
