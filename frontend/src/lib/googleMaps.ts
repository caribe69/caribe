// Carga el SDK de Google Maps JS API una sola vez en la página.
// Resuelve la promesa cuando window.google.maps está listo.
//
// La API key se lee de:
//   1. VITE_GOOGLE_MAPS_KEY (preferido, en frontend/.env)
//   2. fallback embebido (último recurso para no romper si .env no se cargó)
//
// Recordá restringir la key en Google Cloud Console por HTTP referrer
// (sistema.caribeperu.com, caribeperu.com) para que nadie más la use.

declare global {
  interface Window {
    google?: any;
  }
}

const FALLBACK_KEY = 'AIzaSyBd4wZax8uiotmZhTqNW9NW3vGX3LAET0Y';
const API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_KEY || FALLBACK_KEY;

let mapsPromise: Promise<any> | null = null;

export function loadGoogleMaps(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('No browser'));
  }
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }
  if (mapsPromise) return mapsPromise;

  mapsPromise = new Promise((resolve, reject) => {
    const cbName = `__initGmaps_${Date.now()}`;
    (window as any)[cbName] = () => {
      try {
        delete (window as any)[cbName];
      } catch {}
      resolve(window.google.maps);
    };
    const script = document.createElement('script');
    script.src =
      `https://maps.googleapis.com/maps/api/js` +
      `?key=${encodeURIComponent(API_KEY)}` +
      `&callback=${cbName}` +
      `&loading=async`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      mapsPromise = null;
      reject(new Error('Failed to load Google Maps JS API'));
    };
    document.head.appendChild(script);
  });

  return mapsPromise;
}
