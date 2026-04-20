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

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);
