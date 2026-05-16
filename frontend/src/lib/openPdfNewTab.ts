import { createElement } from 'react';

/**
 * Helpers para abrir PDFs en una pestaña nueva del browser.
 *
 * IMPORTANTE: @react-pdf/renderer pesa ~600 KB minificado. NO lo importamos
 * al tope del módulo, sino dentro de cada función (dynamic import) para
 * que solo se descargue cuando el cajero efectivamente imprime, no en el
 * bundle inicial.
 */

/**
 * Versión genérica: recibe el JSX del documento ya construido y lo abre
 * en pestaña nueva como PDF vectorial.
 *
 * Para imprimir boletas/facturas, preferí openBoletaPdfNewTab() que se
 * encarga del lazy-load completo.
 */
export async function openPdfNewTab(doc: any): Promise<Window | null> {
  const { pdf } = await import('@react-pdf/renderer');
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return win;
}

/**
 * Abre la boleta/factura de un alquiler como PDF en pestaña nueva.
 * Carga @react-pdf/renderer y el componente BoletaPDF de forma dinámica
 * — la primera invocación descarga el chunk (~600 KB), las siguientes
 * van directo desde caché del browser.
 */
export async function openBoletaPdfNewTab(
  alquiler: any,
  empresa: any,
): Promise<Window | null> {
  const [{ pdf }, { BoletaPDFDoc }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/BoletaPDF'),
  ]);
  const blob = await pdf(
    createElement(BoletaPDFDoc, { alquiler, empresa }) as any,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return win;
}
