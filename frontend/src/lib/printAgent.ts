/**
 * Puente con el Agente de Impresión local (print-agent).
 *
 * El agente corre en la PC del recepcionista (http://localhost:9110) y recibe
 * los tickets para imprimirlos nativo, sin el diálogo del navegador.
 *
 * Uso típico:
 *   const ok = await imprimirEnAgente({ titulo, contenido });
 *   if (!ok) { ...fallback: abrir PDF / window.print()... }
 *
 * Nota: la web es https y el agente es http://localhost. Chrome/Edge/Firefox
 * permiten pedir a `localhost` desde una página segura (loopback es de
 * confianza). Enviamos el body como text/plain para evitar el preflight CORS.
 */

const DEFAULT_PORT = 9110;
const LS_KEY = 'print-agent';

export interface PrintAgentPref {
  enabled: boolean;
  port: number;
}

export function getPref(): PrintAgentPref {
  const base: PrintAgentPref = { enabled: true, port: DEFAULT_PORT };
  try {
    return { ...base, ...JSON.parse(localStorage.getItem(LS_KEY) || '{}') };
  } catch {
    return base;
  }
}

export function setPref(p: Partial<PrintAgentPref>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ...getPref(), ...p }));
  } catch {
    /* ignore */
  }
}

function baseUrl() {
  return `http://localhost:${getPref().port}`;
}

/** ¿El agente está abierto y respondiendo? (chequeo rápido) */
export async function agenteActivo(timeoutMs = 1500): Promise<boolean> {
  if (!getPref().enabled) return false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const r = await fetch(`${baseUrl()}/api/status`, { signal: ctrl.signal });
    clearTimeout(t);
    return r.ok;
  } catch {
    return false;
  }
}

export interface TicketJob {
  titulo?: string;
  contenido: string;
  copias?: number;
  impresora?: string;
}

/**
 * Envía un ticket al agente. Devuelve true si lo imprimió, false si el agente
 * no está disponible o falló (para caer al método anterior).
 */
export async function imprimirEnAgente(job: TicketJob): Promise<boolean> {
  if (!getPref().enabled) return false;
  if (!job.contenido?.trim()) return false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(`${baseUrl()}/api/print`, {
      method: 'POST',
      // text/plain evita el preflight CORS; el agente lo parsea como JSON igual.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(job),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const d = await r.json().catch(() => ({}));
    return r.ok && d.ok !== false;
  } catch {
    return false;
  }
}
