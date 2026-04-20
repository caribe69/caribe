import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth';

let socket: Socket | null = null;

/**
 * Obtiene la URL base del websocket.
 * En dev, Vite proxy hace /socket.io/ → backend.
 * En prod (detrás de nginx), usa el mismo host que la app con path default.
 */
function baseUrl(): string {
  if (typeof window === 'undefined') return '';
  const { protocol, host } = window.location;
  // Socket.io se conecta al mismo host que la web (nginx reenvía)
  return `${protocol}//${host}`;
}

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;
  const token = useAuthStore.getState().token;
  socket = io(baseUrl(), {
    auth: token ? { token } : {},
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
