import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { existsSync, statSync } from 'fs';
import { parse, join } from 'path';

/**
 * Pipeline de optimización de imágenes que se enchufa en los uploads
 * (personal, habitaciones, productos, documentos). Por cada archivo
 * subido genera:
 *
 *   1. Versión optimizada IN-PLACE (misma extensión, mismo path): la
 *      imagen original se re-codifica con sharp con calidad alta pero
 *      compresión óptima. Pesa 30-50% menos sin diferencia visual.
 *
 *   2. Thumbnail: archivo nuevo con sufijo `_thumb` en el mismo
 *      directorio. Resize a 400px de ancho máximo, manteniendo aspect
 *      ratio. Pesa 90% menos que el original — ideal para listas,
 *      grillas y previews.
 *
 * Importante:
 *   - El path en BD no cambia: sigue siendo el del original.
 *   - El frontend pide el thumbnail por convención de nombres: si
 *     guardás `p_173_abc.jpg`, también existe `p_173_abc_thumb.jpg`.
 *   - Si la entrada no es una imagen reconocible (PDF, video, etc.) o
 *     el archivo no existe, el método retorna sin error.
 *   - Errores no interrumpen el flujo del upload: solo los loggeamos.
 *     Si por alguna razón sharp falla, queda el archivo original sin
 *     optimizar y el frontend tendrá fallback al original cuando no
 *     encuentre el thumbnail.
 */
@Injectable()
export class ImageProcessorService {
  private readonly log = new Logger(ImageProcessorService.name);

  /** Tamaño máximo del thumbnail en píxeles (lado mayor). */
  private readonly THUMB_SIZE = 400;
  /** Calidad de salida para JPEG/WEBP. 85 es visualmente lossless. */
  private readonly QUALITY = 85;

  /**
   * Procesa una imagen subida: la optimiza in-place y genera el
   * thumbnail. Devuelve true si todo OK, false si saltea (no es imagen
   * o hubo error).
   */
  async processUploadedImage(filePath: string): Promise<boolean> {
    if (!existsSync(filePath)) {
      this.log.warn(`processUploadedImage: archivo no existe ${filePath}`);
      return false;
    }

    const parsed = parse(filePath);
    const ext = parsed.ext.toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      // No es imagen procesable (PDF, video, etc.)
      return false;
    }

    const sizeBefore = statSync(filePath).size;

    try {
      // Sharp NO permite leer y escribir el mismo archivo en una sola
      // pasada (bloqueo del file handle). Leemos el buffer primero,
      // procesamos en memoria, escribimos al final.
      const buffer = await sharp(filePath).rotate().toBuffer(); // rotate() respeta EXIF (fotos de móvil)

      // 1. Versión optimizada in-place
      const optimized = await this.recompress(buffer, ext);
      await sharp(optimized).toFile(filePath);

      // 2. Thumbnail
      const thumbPath = join(
        parsed.dir,
        `${parsed.name}_thumb${parsed.ext}`,
      );
      const thumbBuffer = await sharp(buffer)
        .resize(this.THUMB_SIZE, this.THUMB_SIZE, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toBuffer();
      const thumbFinal = await this.recompress(thumbBuffer, ext);
      await sharp(thumbFinal).toFile(thumbPath);

      const sizeAfter = statSync(filePath).size;
      const sizeThumb = statSync(thumbPath).size;
      const savings = sizeBefore > 0
        ? Math.round((1 - sizeAfter / sizeBefore) * 100)
        : 0;
      this.log.log(
        `Imagen ${parsed.base}: ${this.fmt(sizeBefore)} → ${this.fmt(sizeAfter)} (-${savings}%) · thumb ${this.fmt(sizeThumb)}`,
      );
      return true;
    } catch (err: any) {
      this.log.error(
        `Error procesando ${filePath}: ${err.message}. Se mantiene el archivo original sin optimizar.`,
      );
      return false;
    }
  }

  /** Procesa múltiples paths en paralelo. */
  async processMany(filePaths: string[]): Promise<void> {
    await Promise.all(
      filePaths.map((p) =>
        this.processUploadedImage(p).catch(() => false),
      ),
    );
  }

  /** Aplica compresión óptima por formato manteniendo calidad visual. */
  private async recompress(buffer: Buffer, ext: string): Promise<Buffer> {
    if (ext === '.png') {
      return sharp(buffer)
        .png({ compressionLevel: 9, palette: true })
        .toBuffer();
    }
    if (ext === '.webp') {
      return sharp(buffer).webp({ quality: this.QUALITY }).toBuffer();
    }
    // JPEG y JPG: mozjpeg da ~10% mejor compresión sin perder calidad
    return sharp(buffer)
      .jpeg({ quality: this.QUALITY, mozjpeg: true, progressive: true })
      .toBuffer();
  }

  private fmt(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  }
}
