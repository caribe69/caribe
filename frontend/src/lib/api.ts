import axios from 'axios';
import { useAuthStore } from '@/store/auth';

export const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const { token, usuario, activeSedeId } = useAuthStore.getState();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Para SUPERADMIN: inyecta la sede activa si el caller no la especificó.
  if (usuario?.rol === 'SUPERADMIN' && activeSedeId) {
    const method = (config.method || 'get').toLowerCase();
    if (method === 'get' || method === 'delete') {
      if (!config.params?.sedeId) {
        config.params = { ...(config.params || {}), sedeId: activeSedeId };
      }
    } else {
      const isJsonBody =
        config.data &&
        typeof config.data === 'object' &&
        !Array.isArray(config.data) &&
        !(config.data instanceof FormData);
      if (isJsonBody && !('sedeId' in config.data)) {
        config.data = { ...config.data, sedeId: activeSedeId };
      }
    }
  }
  return config;
});

// Flag para evitar mostrar 20 toasts si varias requests pendientes pegan 401
// al mismo tiempo cuando el token expiró.
let sesionExpiradaToastShown = false;

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      const state = useAuthStore.getState();
      // Si había un usuario logueado, era una sesión válida que expiró —
      // avisar al usuario en lugar de hacer logout silencioso.
      if (state.token && !sesionExpiradaToastShown) {
        sesionExpiradaToastShown = true;
        try {
          // Evento custom: cualquier ToastProvider montado lo recoge.
          window.dispatchEvent(
            new CustomEvent('session:expired', {
              detail: { message: 'Tu sesión expiró. Inicia sesión de nuevo.' },
            }),
          );
        } catch {
          /* fail silent en SSR/test */
        }
        // Reset del flag tras unos segundos para futuros logins
        setTimeout(() => {
          sesionExpiradaToastShown = false;
        }, 5_000);
      }
      state.logout();
    }
    return Promise.reject(error);
  },
);
