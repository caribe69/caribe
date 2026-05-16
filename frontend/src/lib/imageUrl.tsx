/**
 * Dado un path de imagen del backend (ej. "/uploads/personal/p_123_abc.jpg"),
 * devuelve la ruta del thumbnail que generó sharp al subir (mismo directorio,
 * sufijo _thumb). Ej. "/uploads/personal/p_123_abc_thumb.jpg".
 *
 * Usar en listas y grillas donde la imagen se muestra chica — descarga 10x
 * menos peso. Para el detalle (zoom, modal), usar el path original.
 *
 * Si la imagen es vieja (subida antes de activar sharp) y el thumbnail no
 * existe, el <img onError={...}> debería fallback al original. Por defecto
 * agregamos onError automático con useThumb().
 */
export function thumbPath(path: string | null | undefined): string {
  if (!path) return '';
  // Solo para imágenes — PDFs y otros no tienen thumbnail.
  const m = path.match(/^(.*?)(\.(jpe?g|png|webp))$/i);
  if (!m) return path;
  return `${m[1]}_thumb${m[2]}`;
}

/**
 * Componente `<img>` con thumbnail + fallback al original.
 * Usar en listas/grillas para reducir el peso descargado:
 *
 *   <ThumbImg src={alquiler.fotoPerfil} alt="..." className="w-12 h-12" />
 *
 * - Pide automáticamente el _thumb del backend.
 * - Si el _thumb no existe (uploads viejos pre-sharp), cae al original.
 * - Aplica loading="lazy" para no descargar imágenes fuera del viewport.
 */
import { useState } from 'react';

type ThumbImgProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | null | undefined;
  /** Si true, no aplica fallback (útil cuando ya sabés que el thumb existe). */
  noFallback?: boolean;
};

export function ThumbImg({ src, noFallback, ...rest }: ThumbImgProps) {
  const [errored, setErrored] = useState(false);
  if (!src) return null;
  const finalSrc = errored || noFallback === false ? src : thumbPath(src);
  return (
    <img
      {...rest}
      src={finalSrc}
      loading={rest.loading ?? 'lazy'}
      decoding={rest.decoding ?? 'async'}
      onError={(e) => {
        // Si falló el thumb, cae al original (solo una vez)
        if (!errored && !noFallback && finalSrc !== src) {
          setErrored(true);
        }
        rest.onError?.(e);
      }}
    />
  );
}
