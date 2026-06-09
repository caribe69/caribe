import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/lib/googleMaps';

interface Props {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}

// Lima centro como fallback cuando no hay coords
const DEFAULT_CENTER = { lat: -12.0464, lng: -77.0428 };

export default function SedeMapPicker({ lat, lng, onChange }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inicialización (una sola vez)
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !mapRef.current) return;
        const initial =
          lat != null && lng != null
            ? { lat: Number(lat), lng: Number(lng) }
            : DEFAULT_CENTER;
        const map = new maps.Map(mapRef.current, {
          center: initial,
          zoom: lat != null && lng != null ? 17 : 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: 'greedy',
        });
        const marker = new maps.Marker({
          position: initial,
          map,
          draggable: true,
          title: 'Arrastrá para fijar la ubicación exacta',
        });
        marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (pos) onChange(pos.lat(), pos.lng());
        });
        map.addListener('click', (e: any) => {
          if (e?.latLng) {
            marker.setPosition(e.latLng);
            onChange(e.latLng.lat(), e.latLng.lng());
          }
        });
        mapInstance.current = map;
        markerInstance.current = marker;
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'No se pudo cargar el mapa');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync externo: cuando lat/lng cambian desde fuera (input o GPS), mover marker
  useEffect(() => {
    if (!mapInstance.current || !markerInstance.current) return;
    if (lat == null || lng == null) return;
    const pos = { lat: Number(lat), lng: Number(lng) };
    if (Number.isNaN(pos.lat) || Number.isNaN(pos.lng)) return;
    const current = markerInstance.current.getPosition();
    // Evitar pan infinito: sólo mover si cambió realmente
    if (current && Math.abs(current.lat() - pos.lat) < 1e-7 && Math.abs(current.lng() - pos.lng) < 1e-7) {
      return;
    }
    markerInstance.current.setPosition(pos);
    mapInstance.current.panTo(pos);
  }, [lat, lng]);

  return (
    <div className="relative w-full h-56 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
      {loading && !error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-xs text-slate-500 bg-slate-100/80 dark:bg-slate-800/80 pointer-events-none">
          Cargando mapa…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-xs text-rose-700 bg-rose-50 px-4 text-center">
          {error}
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
      {!loading && !error && (
        <div className="absolute bottom-2 left-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded px-2 py-1 text-[10px] text-slate-600 dark:text-slate-300 pointer-events-none">
          Click o arrastrá el pin para fijar
        </div>
      )}
    </div>
  );
}
