import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth';

let socket: Socket | null = null;
let lastToken: string | null = null;

function baseUrl(): string {
  if (typeof window === 'undefined') return '';
  const { protocol, host } = window.location;
  return `${protocol}//${host}`;
}

export function getSocket(): Socket {
  const { token, activeSedeId } = useAuthStore.getState();

  // Si el token cambió, recrear la conexión
  if (socket && token !== lastToken) {
    socket.disconnect();
    socket = null;
  }

  if (socket) return socket;

  lastToken = token;
  socket = io(baseUrl(), {
    auth: token ? { token, activeSedeId } : {},
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('[socket] connected', socket?.id);
  });
  socket.on('disconnect', (reason) => {
    console.log('[socket] disconnected:', reason);
  });
  socket.on('connect_error', (err) => {
    console.warn('[socket] connect error:', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    lastToken = null;
  }
}

/** Notifica al servidor de un cambio de sede activa (sin reconectar) */
export function switchSocketSede(sedeId: number) {
  if (socket?.connected) {
    socket.emit('switch-sede', { sedeId });
  }
}

export function isSocketConnected(): boolean {
  return !!socket?.connected;
}
