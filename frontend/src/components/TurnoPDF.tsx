import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

Font.registerHyphenationCallback((word) => [word]);

// ────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────
export interface TurnoReporte {
  turno: {
    id: number;
    estado: string;
    abiertoEn: string;
    cerradoEn?: string | null;
    notas?: string | null;
    usuario?: { nombre: string; username?: string } | null;
    sede?: { nombre?: string } | null;
  };
  desglose: {
    H: number;
    B: number;
    O: number;
    G: number;
    totalEfectivo: number;
    totalDigital: number;
  };
  porMetodo: Record<string, number>;
  alquileres: { cantidad: number; lista?: any[] };
  ventasDirectas: { cantidad: number; total: number; lista?: any[] };
  productosVendidos: Array<{ nombre: string; cantidad: number; total: number }>;
}

export interface EmpresaConfig {
  empresaNombre?: string | null;
  empresaRuc?: string | null;
  empresaDireccion?: string | null;
  empresaTelefono?: string | null;
}

// ────────────────────────────────────────────────────────────
// Paleta — ficha pre-impresa profesional
// ────────────────────────────────────────────────────────────
const C = {
  ink: '#0a0a0a',
  text: '#1f2937',
  border: '#0a0a0a',
  pen: '#1e3a8a',           // azul birome para los valores escritos
  green: '#047857',
  red: '#b91c1c',
  muted: '#525252',
  soft: '#9ca3af',
  line: '#e5e7eb',
  paper: '#fffdf7',         // fondo papel crema sutil
  bandLight: '#f3f4f6',
  bandDark: '#e5e7eb',
  chipNight: '#1e293b',
  chipDay: '#f59e0b',
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 32,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: C.ink,
    backgroundColor: '#ffffff',
    lineHeight: 1.3,
  },

  // ── Header empresa + logo
  empresaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  logo: { width: 42, height: 42, objectFit: 'contain' },
  empresaTxt: { flex: 1 },
  empresaNombre: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    letterSpacing: 0.5,
  },
  empresaSub: { fontSize: 8.5, color: C.muted, marginTop: 1 },
  reportTag: {
    alignItems: 'flex-end',
  },
  reportTagLabel: {
    fontSize: 7.5,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: 'Helvetica-Bold',
  },
  reportTagDate: { fontSize: 7.5, color: C.muted, marginTop: 1 },

  // ── Ficha contenedora
  ficha: {
    borderWidth: 2.5,
    borderColor: C.border,
    backgroundColor: C.paper,
  },

  // Banda superior (sello del turno)
  banda: {
    backgroundColor: C.ink,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bandaLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bandaLabel: {
    color: '#cbd5e1',
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: 'Helvetica-Bold',
  },
  bandaNum: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
  },
  bandaChip: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 3,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#ffffff',
  },
  bandaRight: { color: '#ffffff', fontSize: 11, fontFamily: 'Helvetica-Bold' },

  // ── Cabecera fija (día / usuario / horario)
  cabeceraRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: C.border,
    backgroundColor: '#ffffff',
  },
  cabCell: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: C.border,
  },
  cabCellLast: { borderRightWidth: 0 },
  cabK: {
    fontSize: 7,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    fontFamily: 'Helvetica-Bold',
  },
  cabV: {
    fontSize: 11,
    color: C.pen,
    fontFamily: 'Helvetica-Bold',
    marginTop: 1.5,
  },

  // ── Bloque principal: ingresos + cobros (2 columnas)
  superRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: C.border,
  },
  superColLeft: {
    flex: 1.05,
    borderRightWidth: 2,
    borderRightColor: C.border,
    padding: 12,
  },
  superColRight: { flex: 1, padding: 12 },
  blockTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: C.ink,
  },

  // Filas etiqueta + valor
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 3,
  },
  lineK: { fontSize: 10, color: C.ink, fontFamily: 'Helvetica-Bold' },
  lineV: { fontSize: 11, color: C.pen, fontFamily: 'Helvetica-Bold' },
  lineKSoft: { fontSize: 9.5, color: C.text },
  lineDivider: {
    height: 1,
    backgroundColor: C.ink,
    marginVertical: 5,
  },
  lineDividerDouble: {
    height: 3,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: C.ink,
    borderBottomColor: C.ink,
    marginVertical: 4,
  },

  totalEfectivoBox: {
    marginTop: 4,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: C.green,
    padding: 6,
    borderRadius: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalEfectivoLbl: {
    fontSize: 8,
    color: C.green,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: 'Helvetica-Bold',
  },
  totalEfectivoVal: {
    fontSize: 14,
    color: C.green,
    fontFamily: 'Helvetica-Bold',
  },

  // Cobros digitales: cada método en su línea
  metodoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: C.line,
  },
  metodoLineLast: { borderBottomWidth: 0 },

  totalDigitalBox: {
    marginTop: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: C.pen,
    padding: 6,
    borderRadius: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalDigitalLbl: {
    fontSize: 8,
    color: C.pen,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: 'Helvetica-Bold',
  },
  totalDigitalVal: {
    fontSize: 14,
    color: C.pen,
    fontFamily: 'Helvetica-Bold',
  },

  // ── Conteo: cuartos / ventas / total transacciones
  conteoRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: C.border,
    backgroundColor: C.bandLight,
  },
  conteoCell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: C.border,
    alignItems: 'center',
  },
  conteoLast: { borderRightWidth: 0 },
  conteoLabel: {
    fontSize: 7,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    fontFamily: 'Helvetica-Bold',
  },
  conteoValue: {
    fontSize: 18,
    color: C.ink,
    fontFamily: 'Helvetica-Bold',
    marginTop: 2,
  },
  conteoSub: { fontSize: 7, color: C.muted, marginTop: 1 },

  // ── Sección productos
  prodSection: {
    padding: 12,
  },
  prodSectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: C.ink,
  },
  prodHead: {
    flexDirection: 'row',
    backgroundColor: C.bandDark,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  prodTh: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  prodRowItem: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: C.line,
  },
  prodTd: { fontSize: 9.5, color: C.text },
  prodTdBold: { fontSize: 9.5, color: C.pen, fontFamily: 'Helvetica-Bold' },
  pColIdx: { width: 18, color: C.soft },
  pColName: { flex: 1, paddingRight: 6 },
  pColQty: { width: 50, textAlign: 'right' },
  pColUnit: { width: 60, textAlign: 'right' },
  pColTotal: { width: 70, textAlign: 'right' },

  prodEmpty: {
    fontSize: 9,
    color: C.soft,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 14,
    borderWidth: 0.5,
    borderColor: C.line,
    borderStyle: 'dashed',
  },

  // ── Total final (banda destacada)
  granTotal: {
    backgroundColor: C.ink,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  granTotalLbl: {
    color: '#cbd5e1',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontFamily: 'Helvetica-Bold',
  },
  granTotalVal: {
    color: '#ffffff',
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
  },

  meta: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: C.soft,
  },

  line: { backgroundColor: '#e5e7eb' },
});

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
const money = (n: number) =>
  `S/ ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

const moneyPlain = (n: number) => n.toFixed(2);

const formatFechaLarga = (d: Date) =>
  d
    .toLocaleDateString('es-PE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
    .replace(/^./, (c) => c.toUpperCase());

const formatHora = (d: Date) =>
  d.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

// ────────────────────────────────────────────────────────────
// Componente
// ────────────────────────────────────────────────────────────
export function TurnoPDFDoc({
  reporte,
  empresa,
  logoUrl,
}: {
  reporte: TurnoReporte;
  empresa?: EmpresaConfig;
  /** URL absoluta del logo (PNG/JPG). Si se omite no se muestra. */
  logoUrl?: string;
}) {
  const { turno, desglose, porMetodo, alquileres, ventasDirectas, productosVendidos } =
    reporte;

  const abierto = new Date(turno.abiertoEn);
  const cerrado = turno.cerradoEn ? new Date(turno.cerradoEn) : null;
  const fechaLarga = formatFechaLarga(abierto);
  const horaInicio = formatHora(abierto);
  const horaCierre = cerrado ? formatHora(cerrado) : 'En curso';

  let duracion = '—';
  if (cerrado) {
    const ms = cerrado.getTime() - abierto.getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    duracion = h > 0 ? `${h}h ${m}m` : `${m} min`;
  }

  // Desglose ingresos
  const habitaciones = desglose.H;
  const productosMonto = desglose.B;
  const otros = desglose.O;
  const total = desglose.G;

  // Cobros
  const efectivo = porMetodo.EFECTIVO ?? 0;
  const visa = porMetodo.VISA ?? 0;
  const master = porMetodo.MASTERCARD ?? 0;
  const yape = porMetodo.YAPE ?? 0;
  const plin = porMetodo.PLIN ?? 0;
  const otro = porMetodo.OTRO ?? 0;
  const digitalTotal = visa + master + yape + plin + otro;

  // Conteos
  const nCuartos = alquileres?.cantidad ?? 0;
  const nVentas = ventasDirectas?.cantidad ?? 0;
  const nTransacciones = nCuartos + nVentas;

  const turnoId = String(turno.id).padStart(3, '0');
  const cerradoBool = turno.estado === 'CERRADO';

  // Turno noche/día
  const hora = abierto.getHours();
  const esNoche = hora >= 18 || hora < 6;
  const tipoTurno = esNoche ? 'NOCHE' : 'DÍA';

  // Métodos digitales con monto > 0 (sólo los que cobraron)
  const digitales: Array<[string, number]> = [
    ['Yape', yape],
    ['Plin', plin],
    ['Visa', visa],
    ['Mastercard', master],
    ['Otro', otro],
  ].filter(([, v]) => (v as number) > 0) as Array<[string, number]>;

  const productos = productosVendidos || [];

  return (
    <Document
      title={`Turno ${turnoId} · ${fechaLarga}`}
      author={empresa?.empresaNombre || 'Sol Caribe Hotel'}
      subject="Reporte interno de turno"
    >
      <Page size="A4" style={styles.page}>
        {/* ═══ Header empresa con logo ═══ */}
        <View style={styles.empresaRow}>
          {logoUrl && <Image src={logoUrl} style={styles.logo} />}
          <View style={styles.empresaTxt}>
            <Text style={styles.empresaNombre}>
              {(empresa?.empresaNombre || 'Sol Caribe Hotel').toUpperCase()}
            </Text>
            <Text style={styles.empresaSub}>
              {empresa?.empresaRuc ? `RUC ${empresa.empresaRuc}` : ''}
              {empresa?.empresaRuc && empresa?.empresaDireccion ? '  ·  ' : ''}
              {empresa?.empresaDireccion || ''}
            </Text>
            <Text style={styles.empresaSub}>
              {turno.sede?.nombre ? `Sede: ${turno.sede.nombre}` : ''}
              {empresa?.empresaTelefono ? `   ·   Tel ${empresa.empresaTelefono}` : ''}
            </Text>
          </View>
          <View style={styles.reportTag}>
            <Text style={styles.reportTagLabel}>Reporte de turno</Text>
            <Text style={styles.reportTagDate}>
              Emitido {new Date().toLocaleString('es-PE')}
            </Text>
          </View>
        </View>

        {/* ═══ FICHA ═══ */}
        <View style={styles.ficha}>
          {/* Banda: TURNO N° XXX · ESTADO · Fecha */}
          <View style={styles.banda}>
            <View style={styles.bandaLeft}>
              <Text style={styles.bandaLabel}>Turno N°</Text>
              <Text style={styles.bandaNum}>{turnoId}</Text>
              <Text
                style={[
                  styles.bandaChip,
                  esNoche
                    ? { backgroundColor: C.chipNight }
                    : { backgroundColor: C.chipDay, color: C.ink },
                ]}
              >
                {tipoTurno}
              </Text>
              <Text
                style={[
                  styles.bandaChip,
                  cerradoBool
                    ? { backgroundColor: '#475569' }
                    : { backgroundColor: '#10b981' },
                ]}
              >
                {turno.estado}
              </Text>
            </View>
            <Text style={styles.bandaRight}>{fechaLarga}</Text>
          </View>

          {/* Cabecera: usuario / apertura / cierre / duración */}
          <View style={styles.cabeceraRow}>
            <View style={styles.cabCell}>
              <Text style={styles.cabK}>Usuario de caja</Text>
              <Text style={styles.cabV}>{turno.usuario?.nombre || '—'}</Text>
            </View>
            <View style={styles.cabCell}>
              <Text style={styles.cabK}>Apertura</Text>
              <Text style={styles.cabV}>{horaInicio}</Text>
            </View>
            <View style={styles.cabCell}>
              <Text style={styles.cabK}>Cierre</Text>
              <Text style={styles.cabV}>{horaCierre}</Text>
            </View>
            <View style={[styles.cabCell, styles.cabCellLast]}>
              <Text style={styles.cabK}>Duración</Text>
              <Text style={styles.cabV}>{duracion}</Text>
            </View>
          </View>

          {/* Bloque principal: ingresos | cobros */}
          <View style={styles.superRow}>
            {/* IZQ — Ingresos */}
            <View style={styles.superColLeft}>
              <Text style={styles.blockTitle}>Ingresos del turno</Text>

              <View style={styles.lineRow}>
                <Text style={styles.lineK}>Habitaciones</Text>
                <Text style={styles.lineV}>{moneyPlain(habitaciones)}</Text>
              </View>
              <View style={styles.lineRow}>
                <Text style={styles.lineK}>Productos / consumos</Text>
                <Text style={styles.lineV}>{moneyPlain(productosMonto)}</Text>
              </View>
              <View style={styles.lineRow}>
                <Text style={styles.lineK}>Otros (ajustes)</Text>
                <Text style={styles.lineV}>{moneyPlain(otros)}</Text>
              </View>

              <View style={styles.lineDivider} />

              <View style={styles.lineRow}>
                <Text style={[styles.lineK, { fontSize: 11 }]}>TOTAL</Text>
                <Text style={[styles.lineV, { fontSize: 13 }]}>
                  {moneyPlain(total)}
                </Text>
              </View>

              {digitalTotal > 0 && (
                <>
                  <View style={styles.lineRow}>
                    <Text style={styles.lineKSoft}>(− pagos digitales)</Text>
                    <Text style={[styles.lineV, { color: C.muted }]}>
                      {moneyPlain(digitalTotal)}
                    </Text>
                  </View>
                  <View style={styles.lineDividerDouble} />
                </>
              )}

              <View style={styles.totalEfectivoBox}>
                <Text style={styles.totalEfectivoLbl}>
                  Efectivo físico en caja
                </Text>
                <Text style={styles.totalEfectivoVal}>{money(efectivo)}</Text>
              </View>
            </View>

            {/* DER — Cobros digitales */}
            <View style={styles.superColRight}>
              <Text style={styles.blockTitle}>Pagos digitales recibidos</Text>

              {digitales.length === 0 ? (
                <Text
                  style={{
                    fontSize: 10,
                    color: C.muted,
                    fontStyle: 'italic',
                    textAlign: 'center',
                    marginTop: 16,
                  }}
                >
                  Sin pagos digitales en este turno.
                </Text>
              ) : (
                <>
                  {digitales.map(([nombre, v], i) => (
                    <View
                      key={nombre}
                      style={[
                        styles.metodoLine,
                        i === digitales.length - 1 ? styles.metodoLineLast : {},
                      ]}
                    >
                      <Text style={styles.lineK}>{nombre}</Text>
                      <Text style={styles.lineV}>{moneyPlain(v)}</Text>
                    </View>
                  ))}
                  <View style={styles.totalDigitalBox}>
                    <Text style={styles.totalDigitalLbl}>
                      Total digital
                    </Text>
                    <Text style={styles.totalDigitalVal}>
                      {money(digitalTotal)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Conteo de operaciones */}
          <View style={styles.conteoRow}>
            <View style={styles.conteoCell}>
              <Text style={styles.conteoLabel}>Cuartos cobrados</Text>
              <Text style={styles.conteoValue}>{nCuartos}</Text>
              <Text style={styles.conteoSub}>
                {nCuartos === 1 ? 'alquiler' : 'alquileres'}
              </Text>
            </View>
            <View style={styles.conteoCell}>
              <Text style={styles.conteoLabel}>Ventas directas</Text>
              <Text style={styles.conteoValue}>{nVentas}</Text>
              <Text style={styles.conteoSub}>
                {nVentas === 1 ? 'venta' : 'ventas'}
              </Text>
            </View>
            <View style={[styles.conteoCell, styles.conteoLast]}>
              <Text style={styles.conteoLabel}>Total operaciones</Text>
              <Text style={styles.conteoValue}>{nTransacciones}</Text>
              <Text style={styles.conteoSub}>cobros realizados</Text>
            </View>
          </View>

          {/* Productos vendidos */}
          <View style={styles.prodSection}>
            <Text style={styles.prodSectionTitle}>
              Productos vendidos
              {productos.length > 0 && `  (${productos.length})`}
            </Text>

            {productos.length === 0 ? (
              <Text style={styles.prodEmpty}>
                No se vendió ningún producto en este turno.
              </Text>
            ) : (
              <View>
                <View style={styles.prodHead}>
                  <Text style={[styles.prodTh, styles.pColIdx]}>#</Text>
                  <Text style={[styles.prodTh, styles.pColName]}>
                    Producto
                  </Text>
                  <Text style={[styles.prodTh, styles.pColQty]}>Cantidad</Text>
                  <Text style={[styles.prodTh, styles.pColUnit]}>
                    P. unitario
                  </Text>
                  <Text style={[styles.prodTh, styles.pColTotal]}>Total</Text>
                </View>
                {productos.map((p, i) => {
                  const unit =
                    p.cantidad > 0 ? Number(p.total) / p.cantidad : 0;
                  return (
                    <View key={i} style={styles.prodRowItem}>
                      <Text style={[styles.prodTd, styles.pColIdx]}>
                        {i + 1}
                      </Text>
                      <Text style={[styles.prodTd, styles.pColName]}>
                        {p.nombre}
                      </Text>
                      <Text style={[styles.prodTd, styles.pColQty]}>
                        ×{p.cantidad}
                      </Text>
                      <Text style={[styles.prodTd, styles.pColUnit]}>
                        {moneyPlain(unit)}
                      </Text>
                      <Text style={[styles.prodTdBold, styles.pColTotal]}>
                        {moneyPlain(Number(p.total))}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Total recaudado */}
          <View style={styles.granTotal}>
            <Text style={styles.granTotalLbl}>Total recaudado del turno</Text>
            <Text style={styles.granTotalVal}>{money(total)}</Text>
          </View>
        </View>

        {/* Footer fuera de la ficha */}
        <View style={styles.meta}>
          <Text>
            Turno #{turnoId} · {horaInicio} – {horaCierre}
          </Text>
          <Text>
            {empresa?.empresaNombre || 'Sol Caribe Hotel'} · sistema.caribeperu.com
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export function turnoPdfFileName(reporte: TurnoReporte): string {
  const id = String(reporte.turno.id).padStart(3, '0');
  const fecha = new Date(reporte.turno.abiertoEn).toISOString().slice(0, 10);
  return `Turno_${id}_${fecha}.pdf`;
}
