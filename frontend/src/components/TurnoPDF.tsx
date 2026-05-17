import {
  Document,
  Page,
  Text,
  View,
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
// Paleta — estilo ficha pre-impresa
// ────────────────────────────────────────────────────────────
const C = {
  ink: '#0a0a0a',         // tinta negra
  border: '#0a0a0a',
  pen: '#1e3a8a',         // azul birome para los valores
  red: '#dc2626',
  muted: '#525252',
  paper: '#fffdf7',       // ligero crema (papel)
  chip: '#fb923c',        // naranja del chip NOCH
};

// ────────────────────────────────────────────────────────────
// Estilos — ficha tipo cuaderno
// ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 36,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: C.ink,
    backgroundColor: '#ffffff',
    lineHeight: 1.25,
  },

  // ── Ficha contenedora
  ficha: {
    backgroundColor: C.paper,
    borderWidth: 3,
    borderColor: C.border,
  },

  // ── Cabecera (4 columnas con tabs)
  cabecera: {
    flexDirection: 'row',
    borderBottomWidth: 3,
    borderBottomColor: C.border,
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  cabCell: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRightWidth: 2,
    borderRightColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cabLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    letterSpacing: 0.5,
  },
  cabValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.pen,
  },
  // Chip naranja "TURNO" (como el NOCH del cuaderno)
  chip: {
    position: 'absolute',
    top: -10,
    left: 12,
    backgroundColor: C.chip,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1.5,
    borderColor: C.border,
    zIndex: 10,
  },
  chipText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    letterSpacing: 1,
  },

  // ── Bloque superior: 2 columnas (totales / digitales)
  superRow: {
    flexDirection: 'row',
    borderBottomWidth: 3,
    borderBottomColor: C.border,
    minHeight: 130,
  },
  superLeft: {
    flex: 1,
    borderRightWidth: 3,
    borderRightColor: C.border,
    padding: 10,
  },
  superRight: {
    flex: 1,
    padding: 10,
  },

  // Filas H/B/O/G
  hboRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  hboLabel: {
    width: 18,
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
  },
  hboValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: C.pen,
    flex: 1,
  },
  hboLine: {
    height: 1,
    backgroundColor: C.ink,
    marginVertical: 4,
    width: 130,
    marginLeft: 18,
  },
  hboLineDouble: {
    width: 130,
    marginLeft: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: C.ink,
    borderBottomColor: C.ink,
    height: 3,
    marginVertical: 2,
  },

  // Visa / digital
  digitalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  digitalLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    width: 80,
  },
  digitalArrow: {
    fontSize: 12,
    color: C.ink,
    marginHorizontal: 4,
  },
  digitalValue: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: C.pen,
  },

  // ── Fila estadísticas (P1 / P2 / WELCOME / N°)
  statsRow: {
    flexDirection: 'row',
    borderBottomWidth: 3,
    borderBottomColor: C.border,
    backgroundColor: '#ffffff',
  },
  statCell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRightWidth: 2,
    borderRightColor: C.border,
    gap: 6,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  statValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: C.pen,
    minWidth: 24,
  },

  // ── Bloque productos: 2 columnas
  prodRow: {
    flexDirection: 'row',
  },
  prodColLeft: {
    flex: 1,
    padding: 8,
    borderRightWidth: 3,
    borderRightColor: C.border,
  },
  prodColRight: {
    flex: 1,
    padding: 8,
  },
  prodLine: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 6,
    minHeight: 16,
  },
  prodCode: {
    width: 46,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    paddingBottom: 1,
  },
  prodQtyBox: {
    width: 32,
    borderBottomWidth: 1,
    borderBottomColor: C.ink,
    paddingBottom: 1,
    paddingHorizontal: 3,
    alignItems: 'center',
  },
  prodQty: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.pen,
  },
  prodGap: { width: 8 },
  prodAmountBox: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: C.ink,
    paddingBottom: 1,
    paddingLeft: 4,
  },
  prodAmount: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.pen,
  },

  // ── Footer con metadata fuera de la ficha
  meta: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: C.muted,
  },
});

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
const money = (n: number) =>
  n === 0 ? '' : n.toFixed(2);

const formatFechaCorta = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
};

const formatHora = (d: Date) =>
  d.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const diaSemana = (d: Date) =>
  d
    .toLocaleDateString('es-PE', { weekday: 'long' })
    .replace(/^./, (c) => c.toUpperCase());

// Genera código corto de 3-4 letras (CN, IM, SM, KOLY…) a partir del nombre.
function codigoProducto(nombre: string): string {
  const clean = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .trim();
  if (!clean) return '?';
  const palabras = clean.split(/\s+/);
  if (palabras.length === 1) return palabras[0].slice(0, 4);
  // 2+ palabras: 2 letras de la primera + 2 de la segunda
  return (palabras[0].slice(0, 2) + palabras[1].slice(0, 2)).slice(0, 4);
}

// ────────────────────────────────────────────────────────────
// Componente
// ────────────────────────────────────────────────────────────
export function TurnoPDFDoc({
  reporte,
  empresa,
}: {
  reporte: TurnoReporte;
  empresa?: EmpresaConfig;
}) {
  const { turno, desglose, porMetodo, alquileres, ventasDirectas, productosVendidos } =
    reporte;

  const abierto = new Date(turno.abiertoEn);
  const cerrado = turno.cerradoEn ? new Date(turno.cerradoEn) : null;
  const fechaCorta = formatFechaCorta(abierto);
  const horaInicio = formatHora(abierto);
  const horaCierre = cerrado ? formatHora(cerrado) : '—';
  const dia = diaSemana(abierto);

  // H / B / O / G
  const H = desglose.H;
  const B = desglose.B;
  const O = desglose.O;
  const G = desglose.G;

  // Visa/digital
  const efectivo = porMetodo.EFECTIVO ?? 0;
  const visa = porMetodo.VISA ?? 0;
  const master = porMetodo.MASTERCARD ?? 0;
  const yape = porMetodo.YAPE ?? 0;
  const plin = porMetodo.PLIN ?? 0;
  const otro = porMetodo.OTRO ?? 0;
  const digitalTotal = visa + master + yape + plin + otro;

  // Cantidad de cuartos (P1) y ventas directas (P2), total (Welcome), N° (id)
  const P1 = alquileres?.cantidad ?? 0;
  const P2 = ventasDirectas?.cantidad ?? 0;
  const welcome = P1 + P2;
  const turnoId = String(turno.id).padStart(3, '0');

  // Es nocturno o diurno (mostramos NOCHE/DÍA en el chip)
  const hora = abierto.getHours();
  const esNoche = hora >= 18 || hora < 6;
  const tipoTurno = esNoche ? 'NOCHE' : 'DÍA';

  // ── Productos: SIEMPRE 14 filas, 2 columnas (estilo cuaderno).
  const productos = productosVendidos || [];
  const FILAS_POR_COL = 14;
  const filasIzq: Array<{ nombre: string; cantidad: number; total: number } | null> = [];
  const filasDer: Array<{ nombre: string; cantidad: number; total: number } | null> = [];
  for (let i = 0; i < FILAS_POR_COL; i++) {
    filasIzq.push(productos[i] ?? null);
    filasDer.push(productos[FILAS_POR_COL + i] ?? null);
  }

  return (
    <Document
      title={`Turno ${turnoId} · ${fechaCorta}`}
      author={empresa?.empresaNombre || 'Sol Caribe Hotel'}
      subject="Reporte interno de turno"
    >
      <Page size="A4" style={styles.page}>
        {/* Empresa arriba mini */}
        <View style={{ marginBottom: 6 }}>
          <Text
            style={{
              fontSize: 9,
              fontFamily: 'Helvetica-Bold',
              color: C.ink,
              textAlign: 'center',
              letterSpacing: 0.5,
            }}
          >
            {(empresa?.empresaNombre || 'Sol Caribe Hotel').toUpperCase()}
            {empresa?.empresaRuc ? `   ·   RUC ${empresa.empresaRuc}` : ''}
            {turno.sede?.nombre ? `   ·   ${turno.sede.nombre}` : ''}
          </Text>
        </View>

        {/* ═══ FICHA ═══ */}
        <View style={styles.ficha}>
          {/* ─ Cabecera */}
          <View style={styles.cabecera}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{tipoTurno}</Text>
            </View>

            {/* DÍA */}
            <View style={[styles.cabCell, { flex: 1.5, paddingLeft: 60 }]}>
              <Text style={styles.cabLabel}>SOL</Text>
              <Text style={styles.cabValue}>{dia}</Text>
            </View>

            {/* FECHA */}
            <View style={[styles.cabCell, { flex: 1.4 }]}>
              <Text style={styles.cabLabel}>FECHA</Text>
              <Text style={styles.cabValue}>{fechaCorta}</Text>
            </View>

            {/* USUARIO */}
            <View
              style={[
                styles.cabCell,
                { flex: 1.3, borderRightWidth: 0 },
              ]}
            >
              <Text style={styles.cabValue}>
                {turno.usuario?.nombre || '—'}
              </Text>
            </View>
          </View>

          {/* ─ Bloque superior: H/B/O/G + digitales */}
          <View style={styles.superRow}>
            <View style={styles.superLeft}>
              <View style={styles.hboRow}>
                <Text style={styles.hboLabel}>H</Text>
                <Text style={styles.hboValue}>{H.toFixed(2)}</Text>
              </View>
              <View style={styles.hboRow}>
                <Text style={styles.hboLabel}>B</Text>
                <Text style={styles.hboValue}>{B.toFixed(2)}</Text>
              </View>
              <View style={styles.hboRow}>
                <Text style={styles.hboLabel}>O</Text>
                <Text style={styles.hboValue}>{O.toFixed(2)}</Text>
              </View>
              <View style={styles.hboLine} />
              <View style={styles.hboRow}>
                <Text style={styles.hboLabel}>G</Text>
                <Text style={styles.hboValue}>{G.toFixed(2)}</Text>
              </View>
              {digitalTotal > 0 && (
                <>
                  <Text
                    style={{
                      marginLeft: 18,
                      fontSize: 13,
                      fontFamily: 'Helvetica-Bold',
                      color: C.pen,
                    }}
                  >
                    − {digitalTotal.toFixed(2)}
                  </Text>
                  <View style={styles.hboLine} />
                  <Text
                    style={{
                      marginLeft: 18,
                      fontSize: 15,
                      fontFamily: 'Helvetica-Bold',
                      color: C.ink,
                    }}
                  >
                    {efectivo.toFixed(2)}
                  </Text>
                </>
              )}
            </View>

            <View style={styles.superRight}>
              {/* Métodos digitales con flecha estilo cuaderno */}
              {visa > 0 && (
                <View style={styles.digitalRow}>
                  <Text style={styles.digitalLabel}>Visa</Text>
                  <Text style={styles.digitalArrow}>{'→'}</Text>
                  <Text style={styles.digitalValue}>{visa.toFixed(2)}</Text>
                </View>
              )}
              {master > 0 && (
                <View style={styles.digitalRow}>
                  <Text style={styles.digitalLabel}>Mastercard</Text>
                  <Text style={styles.digitalArrow}>{'→'}</Text>
                  <Text style={styles.digitalValue}>{master.toFixed(2)}</Text>
                </View>
              )}
              {yape > 0 && (
                <View style={styles.digitalRow}>
                  <Text style={styles.digitalLabel}>Yape</Text>
                  <Text style={styles.digitalArrow}>{'→'}</Text>
                  <Text style={styles.digitalValue}>{yape.toFixed(2)}</Text>
                </View>
              )}
              {plin > 0 && (
                <View style={styles.digitalRow}>
                  <Text style={styles.digitalLabel}>Plin</Text>
                  <Text style={styles.digitalArrow}>{'→'}</Text>
                  <Text style={styles.digitalValue}>{plin.toFixed(2)}</Text>
                </View>
              )}
              {otro > 0 && (
                <View style={styles.digitalRow}>
                  <Text style={styles.digitalLabel}>Otro</Text>
                  <Text style={styles.digitalArrow}>{'→'}</Text>
                  <Text style={styles.digitalValue}>{otro.toFixed(2)}</Text>
                </View>
              )}
              {digitalTotal === 0 && (
                <Text
                  style={{
                    fontSize: 11,
                    color: C.muted,
                    fontStyle: 'italic',
                    textAlign: 'center',
                    marginTop: 30,
                  }}
                >
                  Sin pagos digitales
                </Text>
              )}
            </View>
          </View>

          {/* ─ Fila de estadísticas */}
          <View style={styles.statsRow}>
            <View style={[styles.statCell, { flex: 1 }]}>
              <Text style={styles.statLabel}>P1</Text>
              <Text style={styles.statValue}>{P1}</Text>
            </View>
            <View style={[styles.statCell, { flex: 1 }]}>
              <Text style={styles.statLabel}>P2</Text>
              <Text style={styles.statValue}>{P2}</Text>
            </View>
            <View style={[styles.statCell, { flex: 0.7 }]}>
              <Text style={styles.statValue}>{welcome}</Text>
            </View>
            <View style={[styles.statCell, { flex: 1.3 }]}>
              <Text style={[styles.cabLabel, { fontSize: 9 }]}>HORARIO</Text>
              <Text style={[styles.statValue, { fontSize: 10 }]}>
                {horaInicio}–{horaCierre}
              </Text>
            </View>
            <View
              style={[
                styles.statCell,
                { flex: 1, borderRightWidth: 0 },
              ]}
            >
              <Text style={styles.statLabel}>N°</Text>
              <Text style={styles.statValue}>{turnoId}</Text>
            </View>
          </View>

          {/* ─ Bloque productos en 2 columnas tipo cuaderno */}
          <View style={styles.prodRow}>
            <View style={styles.prodColLeft}>
              {filasIzq.map((p, i) => (
                <ProductoLinea key={i} p={p} />
              ))}
            </View>
            <View style={styles.prodColRight}>
              {filasDer.map((p, i) => (
                <ProductoLinea key={i} p={p} />
              ))}
            </View>
          </View>
        </View>

        {/* ── Metadata abajo, fuera de la ficha */}
        <View style={styles.meta}>
          <Text>
            Turno #{turnoId} · {dia} {fechaCorta} · {horaInicio}–{horaCierre}
          </Text>
          <Text>Emitido {new Date().toLocaleString('es-PE')}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ────────────────────────────────────────────────────────────
// Una línea de producto (cuaderno: CODIGO ___ ___)
// ────────────────────────────────────────────────────────────
function ProductoLinea({
  p,
}: {
  p: { nombre: string; cantidad: number; total: number } | null;
}) {
  if (!p) {
    // Línea en blanco — sólo dos rayitas como en el cuaderno
    return (
      <View style={styles.prodLine}>
        <Text style={styles.prodCode}>{''}</Text>
        <View style={styles.prodQtyBox}>
          <Text style={styles.prodQty}>{''}</Text>
        </View>
        <View style={styles.prodGap} />
        <View style={styles.prodAmountBox}>
          <Text style={styles.prodAmount}>{''}</Text>
        </View>
      </View>
    );
  }
  const codigo = codigoProducto(p.nombre);
  return (
    <View style={styles.prodLine}>
      <Text style={styles.prodCode}>{codigo}</Text>
      <View style={styles.prodQtyBox}>
        <Text style={styles.prodQty}>{p.cantidad}</Text>
      </View>
      <View style={styles.prodGap} />
      <View style={styles.prodAmountBox}>
        <Text style={styles.prodAmount}>{money(Number(p.total))}</Text>
      </View>
    </View>
  );
}

export function turnoPdfFileName(reporte: TurnoReporte): string {
  const id = String(reporte.turno.id).padStart(3, '0');
  const fecha = new Date(reporte.turno.abiertoEn).toISOString().slice(0, 10);
  return `Turno_${id}_${fecha}.pdf`;
}
