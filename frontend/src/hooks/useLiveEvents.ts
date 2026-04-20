import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { useToast } from '@/components/ToastProvider';
import { useAuthStore } from '@/store/auth';
import { usePresence } from '@/store/presence';

/**
 * Se conecta al socket y muestra toasts + invalida queries cuando llegan
 * eventos en vivo desde el backend.
 *
 * Usa refs para show/qc así los handlers de socket.io se registran UNA SOLA
 * VEZ aunque el componente re-renderice muchas veces (clave para rendimiento
 * cuando hay muchos usuarios y eventos frecuentes).
 */
export function useLiveEvents() {
  const qc = useQueryClient();
  const { show } = useToast();
  const token = useAuthStore((s) => s.token);

  const showRef = useRef(show);
  const qcRef = useRef(qc);
  useEffect(() => {
    showRef.current = show;
  }, [show]);
  useEffect(() => {
    qcRef.current = qc;
  }, [qc]);

  useEffect(() => {
    if (!token) return;
    const s = getSocket();

    // --- Handlers ---
    const onLimpIniciada = (p: any) => {
      showRef.current({
        type: 'info',
        title: `🧹 Limpieza iniciada · Hab. ${p.habitacionNumero}`,
        description: `${p.porUsuario} comenzó a limpiar`,
      });
      qcRef.current.invalidateQueries({ queryKey: ['limpieza'] });
      qcRef.current.invalidateQueries({ queryKey: ['habitaciones'] });
    };

    const onLimpFotos = (p: any) => {
      showRef.current({
        type: 'info',
        title: `📸 Evidencia subida · Hab. ${p.habitacionNumero}`,
        description: `${p.porUsuario} subió ${p.cantidadFotos} foto${p.cantidadFotos === 1 ? '' : 's'} (total ${p.totalFotos})`,
      });
      qcRef.current.invalidateQueries({ queryKey: ['limpieza'] });
    };

    const onLimpCompletada = (p: any) => {
      showRef.current({
        type: 'success',
        title: `✨ Limpieza completada · Hab. ${p.habitacionNumero}`,
        description: `${p.porUsuario} finalizó. Habitación disponible.`,
      });
      qcRef.current.invalidateQueries({ queryKey: ['limpieza'] });
      qcRef.current.invalidateQueries({ queryKey: ['habitaciones'] });
    };

    s.on('limpieza:iniciada', onLimpIniciada);
    s.on('limpieza:fotos', onLimpFotos);
    s.on('limpieza:completada', onLimpCompletada);

    // Presencia en vivo
    const { setList, addOnline, removeOnline } = usePresence.getState();
    const onList = (ids: number[]) => setList(ids);
    const onOnline = ({ userId }: { userId: number }) => addOnline(userId);
    const onOffline = ({ userId }: { userId: number }) => removeOnline(userId);
    s.on('presence:list', onList);
    s.on('presence:online', onOnline);
    s.on('presence:offline', onOffline);

    return () => {
      s.off('limpieza:iniciada', onLimpIniciada);
      s.off('limpieza:fotos', onLimpFotos);
      s.off('limpieza:completada', onLimpCompletada);
      s.off('presence:list', onList);
      s.off('presence:online', onOnline);
      s.off('presence:offline', onOffline);
    };
  }, [token]);
}
