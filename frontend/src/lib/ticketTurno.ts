/**
 * Arma el reporte de cierre de turno ("Versión 2") en TEXTO plano de 32
 * columnas para impresora térmica, a partir de los datos de
 * GET /caja/:id/reporte-boleta2.
 */

const W = 32;
const LINE = '-'.repeat(W);
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function money(n: any): string {
  return 'S/ ' + Number(n || 0).toFixed(2);
}
function center(s: string): string {
  s = String(s).slice(0, W);
  const pad = Math.max(0, Math.floor((W - s.length) / 2));
  return ' '.repeat(pad) + s;
}
function lr(left: string, right: string): string {
  const maxL = Math.max(0, W - right.length - 1);
  let l = String(left);
  if (l.length > maxL) l = l.slice(0, maxL);
  return l + ' '.repeat(Math.max(1, W - l.length - right.length)) + right;
}

export function construirTicketTurno(d: any): string {
  const L: string[] = [];
  const t = d?.turno || {};
  const fecha = new Date(t.abiertoEn);

  L.push(center((t.sede?.nombre || 'HOTEL SOL CARIBE').toUpperCase()));
  L.push(center('CIERRE DE TURNO'));
  L.push(center('Turno #' + String(t.id ?? '').padStart(3, '0')));
  if (!isNaN(fecha.getTime()))
    L.push(center(DIAS[fecha.getDay()] + ' ' + fecha.toLocaleDateString('es-PE')));
  L.push(center('Resp: ' + (t.usuario?.username || t.usuario?.nombre || '-')));
  L.push(LINE);

  // Bloque de dinero
  const g = d?.desglose || {};
  L.push(lr('Habitaciones (H)', money(g.H)));
  L.push(lr('Bebidas (B)', money(g.B)));
  L.push(lr('Otros (O)', money(g.O)));
  L.push(lr('TOTAL (G)', money(g.G)));
  L.push(lr('(-) Digital', money(g.digital)));
  L.push(lr('(=) EFECTIVO', money(g.efectivo)));
  L.push(LINE);

  // Digital desglosado (solo si hay algo)
  const pm = d?.porMetodo || {};
  const totDig = Number(g.digital || 0);
  if (totDig > 0.01) {
    L.push(center('DIGITAL'));
    L.push(lr('Visa', money(pm.VISA)));
    L.push(lr('Mastercard', money(pm.MASTERCARD)));
    L.push(lr('Yape', money(pm.YAPE)));
    L.push(lr('Plin', money(pm.PLIN)));
    L.push(lr('Otro', money(pm.OTRO)));
    L.push(LINE);
  }

  // Ingresos por puerta
  const ing = d?.ingresos || {};
  L.push(lr('Ingresos P1 (a pie)', String(ing.aPie ?? 0)));
  L.push(lr('Ingresos P2 (vehic.)', String(ing.enVehiculo ?? 0)));
  L.push(lr('Total ingresos', String(ing.total ?? 0)));
  L.push(LINE);

  // Productos por columna (código · cantidad · total)
  const columna = (titulo: string, plant: any, sumaLabel: string, suma: any) => {
    L.push(center(titulo));
    const filas = (plant?.filas || []).filter((f: any) => Number(f.cantidad) > 0);
    for (const f of filas) L.push(lr(' ' + f.codigo + '  x' + f.cantidad, money(f.total)));
    for (const e of plant?.extras || []) L.push(lr(' ' + (e.nombre || '') + '  x' + e.cantidad, money(e.total)));
    if (!filas.length && !(plant?.extras || []).length) L.push(center('(sin productos)'));
    L.push(lr(sumaLabel, money(suma)));
    L.push(LINE);
  };
  columna('BEBIDAS', d?.plantilla?.bebidas, 'Σ Bebidas', g.B);
  columna('OTROS', d?.plantilla?.otros, 'Σ Otros', g.O);

  // Limpieza
  const limp = d?.limpieza || [];
  const rooms = limp.reduce((s: number, l: any) => s + (l.habitaciones || 0), 0);
  const nombres = limp.map((l: any) => l.nombre).join(', ');
  if (rooms > 0) {
    L.push('Limpieza: ' + rooms + ' hab.');
    if (nombres) L.push(' ' + nombres);
  } else {
    L.push('Limpieza: sin registro');
  }
  L.push(LINE);
  L.push('');
  L.push('');
  L.push('');

  return L.join('\n');
}
