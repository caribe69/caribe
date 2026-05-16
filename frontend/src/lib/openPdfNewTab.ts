import { pdf, type DocumentProps } from '@react-pdf/renderer';
import type { ReactElement } from 'react';

/**
 * Genera el PDF en memoria con @react-pdf/renderer y lo abre en una pestaña
 * nueva como un PDF real (vectorial, seleccionable). El usuario puede usar
 * Ctrl+P del navegador para imprimir con el visor PDF nativo.
 *
 * Devuelve la referencia a la nueva ventana o null si el navegador la
 * bloqueó (popup blocker). Quien llame puede mostrar un toast en ese caso.
 */
export async function openPdfNewTab(
  doc: ReactElement<DocumentProps>,
): Promise<Window | null> {
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  // El navegador necesita el objectURL hasta que cargue el PDF;
  // 60s es más que suficiente.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return win;
}
