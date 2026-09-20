/**
 * Arma el ticket de un alquiler en TEXTO plano (para impresora térmica vía el
 * Agente de Impresión local). Ancho fijo de 32 columnas (58mm); se ve bien
 * también en 80mm.
 */

const W = 48;
const LINE = '-'.repeat(W);

function money(n: any): string {
  return 'S/ ' + Number(n || 0).toFixed(2);
}
function center(s: string): string {
  s = String(s).slice(0, W);
  const pad = Math.max(0, Math.floor((W - s.length) / 2));
  return ' '.repeat(pad) + s;
}
/** Izquierda + derecha alineado a los bordes (trunca la izquierda si no cabe). */
function lr(left: string, right: string): string {
  const maxL = Math.max(0, W - right.length - 1);
  let l = String(left);
  if (l.length > maxL) l = l.slice(0, maxL);
  const space = Math.max(1, W - l.length - right.length);
  return l + ' '.repeat(space) + right;
}
/** Parte un texto largo en varias líneas de ancho W con sangría opcional. */
function wrap(s: string, indent = ''): string[] {
  const words = String(s).split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = indent;
  for (const w of words) {
    if ((cur + (cur === indent ? '' : ' ') + w).length > W) {
      if (cur.trim()) out.push(cur);
      cur = indent + w;
    } else {
      cur = cur === indent ? indent + w : cur + ' ' + w;
    }
  }
  if (cur.trim()) out.push(cur);
  return out;
}
function fecha(v?: string | null): string {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function construirTicketAlquiler(alquiler: any, empresa?: any): string {
  const L: string[] = [];
  const esFactura = alquiler?.tipoComprobante === 'FACTURA';

  // ── Cabecera empresa ──
  L.push(center((empresa?.empresaNombre || 'HOTEL SOL CARIBE').toUpperCase()));
  if (empresa?.empresaRuc) L.push(center('RUC ' + empresa.empresaRuc));
  if (empresa?.empresaDireccion)
    wrap(empresa.empresaDireccion).forEach((x) => L.push(center(x.trim())));
  if (empresa?.empresaTelefono) L.push(center('Tel. ' + empresa.empresaTelefono));
  L.push(LINE);

  // ── Tipo + número + fecha ──
  L.push(center((esFactura ? 'FACTURA' : 'BOLETA') + '  #' + String(alquiler?.id ?? '').padStart(7, '0')));
  const emitido = fecha(alquiler?.creadoEn);
  if (emitido) L.push(center(emitido));
  L.push(LINE);

  // ── Cliente ──
  wrap('Cliente: ' + (alquiler?.clienteNombre || '-')).forEach((x) => L.push(x));
  if (esFactura && alquiler?.clienteRuc) {
    L.push('RUC: ' + alquiler.clienteRuc);
    if (alquiler?.clienteRazonSocial)
      wrap(alquiler.clienteRazonSocial).forEach((x) => L.push(x));
  } else if (alquiler?.clienteDni) {
    L.push('DNI: ' + alquiler.clienteDni);
  }

  // ── Habitación ──
  const hab = alquiler?.habitacion;
  if (hab) {
    const piso = hab.piso?.numero != null ? ' (Piso ' + hab.piso.numero + ')' : '';
    L.push('Hab: ' + hab.numero + piso);
    if (hab.descripcion) wrap(hab.descripcion, '  ').forEach((x) => L.push(x));
    if (alquiler?.sede?.nombre) L.push('Sede: ' + alquiler.sede.nombre);
  }
  const ing = fecha(alquiler?.fechaIngreso);
  const sal = fecha(alquiler?.fechaSalida);
  if (ing) L.push('Ingreso: ' + ing);
  if (sal) L.push('Salida:  ' + sal);
  L.push(LINE);

  // ── Detalle ──
  L.push(lr('Habitacion', money(alquiler?.precioHabitacion)));
  const consumos: any[] = alquiler?.consumos || [];
  if (consumos.length) {
    L.push('Consumos:');
    for (const c of consumos) {
      const nom = (c.producto?.nombre || 'Producto').toString();
      L.push(lr('  ' + c.cantidad + ' x ' + nom, money(c.subtotal)));
    }
  }
  L.push(LINE);

  // ── Totales ──
  L.push(lr('TOTAL', money(alquiler?.total)));
  const pagado = Number(alquiler?.montoPagado ?? 0);
  const total = Number(alquiler?.total ?? 0);
  const saldo = total - pagado;
  if (saldo > 0.01) {
    L.push(lr('Pagado', money(pagado)));
    L.push(lr('SALDO', money(saldo)));
  }
  if (alquiler?.metodoPago) L.push('Pago: ' + alquiler.metodoPago);
  L.push(LINE);

  L.push(center('Gracias por su visita'));
  L.push('');
  L.push('');
  L.push('');

  return L.join('\n');
}
