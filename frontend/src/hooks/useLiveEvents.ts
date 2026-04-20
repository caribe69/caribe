import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { useToast } from '@/components/ToastProvider';
import { useAuthStore } from '@/store/auth';

/**
 * Se conecta al socket y muestra toasts + invalida queries cuando llegan
 * eventos en vivo desde el backend.
 */
export function useLiveEvents() {
  const qc = useQueryClient();
  const { show } = useToast();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;
    const s = getSocket();

    const onIniciada = (p: any) => {
      show({
        type: 'info',
        title: `Limpieza iniciada · Hab. ${p.habitacionNumero}`,
        description: `${p.porUsuario} comenzó a limpiar`,
      });
      qc.invalidateQueries({ queryKey: ['limpieza'] });
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
    };

    const onFotos = (p: any) => {
      show({
        type: 'info',
        title: `📸 Evidencia subida · Hab. ${p.habitacionNumero}`,
        description: `${p.porUsuario} subió ${p.cantidadFotos} foto(s). Total: ${p.totalFotos}`,
      });
      qc.invalidateQueries({ queryKey: ['limpieza'] });
    };

    const onCompletada = (p: any) => {
      show({
        type: 'success',
        title: `Limpieza completada · Hab. ${p.habitacionNumero}`,
        description: `${p.porUsuario} finalizó la limpieza. Habitación disponible.`,
      });
      qc.invalidateQueries({ queryKey: ['limpieza'] });
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
    };

    s.on('limpieza:iniciada', onIniciada);
    s.on('limpieza:fotos', onFotos);
    s.on('limpieza:completada', onCompletada);

    return () => {
      s.off('limpieza:iniciada', onIniciada);
      s.off('limpieza:fotos', onFotos);
      s.off('limpieza:completada', onCompletada);
    };
  }, [token, qc, show]);
}
