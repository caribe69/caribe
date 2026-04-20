import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth';

export function useSocketStatus() {
  const [connected, setConnected] = useState(false);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) {
      setConnected(false);
      return;
    }
    const s = getSocket();
    setConnected(s.connected);
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, [token]);

  return connected;
}
