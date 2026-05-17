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
// Tipos (espejo del response GET /caja/:id/reporte)
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
// Paleta sobria: blanco, slate suave, un solo acento (azul-pizarra)
// ────────────────────────────────────────────────────────────
const C = {
  ink: '#0f172a',
  text: '#334155',
  muted: '#64748b',
  soft: '#94a3b8',
  line: '#e2e8f0',
  bg: '#f8fafc',
  accent: '#1e40af', // azul reporte
  green: '#059669',
  amber: '#b45309',
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 42,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: C.text,
    lineHeight: 1.4,
  },

  // ── Header simple
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  brandBlock: { flexDirection: 'column' },
  brand: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    letterSpacing: 0.3,
  },
  brandLine: { fontSize: 8.5, color: C.muted, marginTop: 1 },
  reportType: {
    fontSize: 8,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'right',
  },
  reportGen: {
    fontSize: 7.5,
    color: C.soft,
    textAlign: 'right',
    marginTop: 2,
  },

  // ── Título principal
  hero: {
    paddingBottom: 18,
    marginBottom: 22,
    borderBottomWidth: 2,
    borderBottomColor: C.ink,
  },
  heroOver: {
    fontSize: 9,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontFamily: 'Helvetica-Bold',
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    marginTop: 6,
    lineHeight: 1.15,
  },
  heroSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  heroSub: { fontSize: 11, color: C.text },
  heroDot: { color: C.soft, marginHorizontal: 6, fontSize: 11 },
  estadoPill: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 10,
  },

  // ── Datos del turno (2 columnas)
  datos: { flexDirection: 'row', marginBottom: 24, gap: 24 },
  datosCol: { flex: 1 },
  datosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: C.line,
  },
  datosK: { fontSize: 9, color: C.muted },
  datosV: { fontSize: 9.5, color: C.ink, fontFamily: 'Helvetica-Bold' },

  // ── Sección
  sectionGap: { marginBottom: 22 },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    marginBottom: 10,
  },

  // ── Dos cards grandes (efectivo vs digital)
  bigCards: { flexDirection: 'row', gap: 12 },
  bigCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 8,
    padding: 16,
  },
  bigCardLabel: {
    fontSize: 8.5,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: 'Helvetica-Bold',
  },
  bigCardValue: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    marginTop: 8,
  },
  bigCardHint: { fontSize: 8.5, color: C.muted, marginTop: 6 },

  // ── Lista limpia de métodos digitales
  metodoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: C.line,
  },
  metodoK: { fontSize: 10, color: C.text },
  metodoV: { fontSize: 10, color: C.ink, fontFamily: 'Helvetica-Bold' },

  // ── Tres tiles secundarios (alquileres / productos / otros)
  miniRow: { flexDirection: 'row', gap: 10 },
  miniCard: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 12,
    borderRadius: 6,
  },
  miniLabel: {
    fontSize: 7.5,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: 'Helvetica-Bold',
  },
  miniValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    marginTop: 4,
  },
  miniSub: { fontSize: 8, color: C.muted, marginTop: 2 },

  // ── Tabla productos
  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.ink,
    paddingBottom: 5,
    marginBottom: 4,
  },
  th: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
  },
  tRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 0.4,
    borderBottomColor: C.line,
  },
  td: { fontSize: 10, color: C.text },
  tdBold: { fontSize: 10, color: C.ink, fontFamily: 'Helvetica-Bold' },
  colProd: { flex: 1, paddingRight: 8 },
  colCant: { width: 55, textAlign: 'right' },
  colTotal: { width: 75, textAlign: 'right' },
  tableEmpty: {
    fontSize: 9,
    color: C.soft,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 12,
  },

  // ── Footer total
  totalBox: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: C.ink,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 9,
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontFamily: 'Helvetica-Bold',
  },
  totalValue: {
    fontSize: 22,
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
  },

  footer: {
    position: 'absolute',
    bottom: 18,
    left: 42,
    right: 42,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: C.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: C.soft,
  },
});

// ────────────────────────────────────────────────────────────
// Helpers de formato
// ────────────────────────────────────────────────────────────
const money = (n: number) =>
  `S/ ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

const formatFecha = (d: Date) =>
  d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

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
}: {
  reporte: TurnoReporte;
  empresa?: EmpresaConfig;
}) {
  const { turno, desglose, porMetodo, alquileres, ventasDirectas, productosVendidos } =
    reporte;

  const abierto = new Date(turno.abiertoEn);
  const cerrado = turno.cerradoEn ? new Date(turno.cerradoEn) : null;
  const fechaTurno = formatFecha(abierto);
  const horaInicio = formatHora(abierto);
  const horaCierre = cerrado ? formatHora(cerrado) : null;

  let duracion = '—';
  if (cerrado) {
    const ms = cerrado.getTime() - abierto.getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    duracion = h > 0 ? `${h} h ${m} min` : `${m} min`;
  }

  const efectivo = porMetodo.EFECTIVO ?? 0;
  const visa = porMetodo.VISA ?? 0;
  const master = porMetodo.MASTERCARD ?? 0;
  const yape = porMetodo.YAPE ?? 0;
  const plin = porMetodo.PLIN ?? 0;
  const otro = porMetodo.OTRO ?? 0;
  const digital = visa + master + yape + plin + otro;

  const cantCuartos = alquileres?.cantidad ?? 0;
  const cantVentas = ventasDirectas?.cantidad ?? 0;
  const totalVentas = ventasDirectas?.total ?? 0;
  const consumosEnHab = desglose.B - totalVentas;

  const cerradoBool = turno.estado === 'CERRADO';
  const turnoId = String(turno.id).padStart(3, '0');

  // Métodos digitales — sólo mostramos los que tengan monto > 0 para no
  // llenar de ceros, pero siempre dejamos visible al menos los 4 comunes.
  const metodosDigitales: Array<[string, number]> = [
    ['Visa', visa],
    ['Mastercard', master],
    ['Yape', yape],
    ['Plin', plin],
    ['Otro', otro],
  ];
  const digitalesConMonto = metodosDigitales.filter(([, v]) => v > 0);
  const listaDigitales =
    digitalesConMonto.length > 0 ? digitalesConMonto : metodosDigitales.slice(0, 4);

  return (
    <Document
      title={`Turno ${turnoId} · ${fechaTurno}`}
      author={empresa?.empresaNombre || 'Sol Caribe Hotel'}
      subject="Reporte interno de turno"
    >
      <Page size="A4" style={styles.page}>
        {/* ── Header */}
        <View style={styles.headerRow}>
          <View style={styles.brandBlock}>
            <Text style={styles.brand}>
              {(empresa?.empresaNombre || 'Sol Caribe Hotel').toUpperCase()}
            </Text>
            {empresa?.empresaRuc && (
              <Text style={styles.brandLine}>RUC {empresa.empresaRuc}</Text>
            )}
            {turno.sede?.nombre && (
              <Text style={styles.brandLine}>Sede · {turno.sede.nombre}</Text>
            )}
          </View>
          <View>
            <Text style={styles.reportType}>Reporte de turno</Text>
            <Text style={styles.reportGen}>
              Emitido {new Date().toLocaleString('es-PE')}
            </Text>
          </View>
        </View>

        {/* ── Hero: Turno + fecha */}
        <View style={styles.hero}>
          <Text style={styles.heroOver}>Turno N° {turnoId}</Text>
          <Text style={styles.heroTitle}>{fechaTurno}</Text>
          <View style={styles.heroSubRow}>
            <Text style={styles.heroSub}>{turno.usuario?.nombre || '—'}</Text>
            <Text style={styles.heroDot}>·</Text>
            <Text style={styles.heroSub}>
              {horaInicio}
              {horaCierre ? ` — ${horaCierre}` : ' — en curso'}
            </Text>
            <Text
              style={[
                styles.estadoPill,
                cerradoBool
                  ? { backgroundColor: '#e2e8f0', color: C.ink }
                  : { backgroundColor: '#fef3c7', color: C.amber },
              ]}
            >
              {turno.estado}
            </Text>
          </View>
        </View>

        {/* ── Datos del turno (2 columnas, info plana) */}
        <View style={styles.datos}>
          <View style={styles.datosCol}>
            <DatoRow k="Apertura" v={`${fechaTurno} · ${horaInicio}`} />
            <DatoRow
              k="Cierre"
              v={
                horaCierre
                  ? `${fechaTurno} · ${horaCierre}`
                  : 'Turno aún abierto'
              }
            />
            <DatoRow k="Duración" v={duracion} />
          </View>
          <View style={styles.datosCol}>
            <DatoRow k="Usuario de caja" v={turno.usuario?.nombre || '—'} />
            <DatoRow k="Sede" v={turno.sede?.nombre || '—'} />
            <DatoRow
              k="Cuartos cobrados"
              v={`${cantCuartos} ${cantCuartos === 1 ? 'cuarto' : 'cuartos'}`}
            />
          </View>
        </View>

        {/* ── Cómo cobró (efectivo vs digital) */}
        <View style={styles.sectionGap}>
          <Text style={styles.sectionTitle}>Cómo se cobró</Text>
          <View style={styles.bigCards}>
            <View style={styles.bigCard}>
              <Text style={styles.bigCardLabel}>Efectivo físico</Text>
              <Text style={[styles.bigCardValue, { color: C.green }]}>
                {money(efectivo)}
              </Text>
              <Text style={styles.bigCardHint}>
                Billetes y monedas recibidos en caja
              </Text>
            </View>
            <View style={styles.bigCard}>
              <Text style={styles.bigCardLabel}>Pagos digitales</Text>
              <Text style={[styles.bigCardValue, { color: C.accent }]}>
                {money(digital)}
              </Text>
              <Text style={styles.bigCardHint}>
                Yape, Plin, Visa, Mastercard y otros
              </Text>
            </View>
          </View>

          {/* Desglose digital limpio */}
          <View style={{ marginTop: 14 }}>
            {listaDigitales.map(([nombre, v]) => (
              <View key={nombre} style={styles.metodoRow}>
                <Text style={styles.metodoK}>{nombre}</Text>
                <Text style={styles.metodoV}>{money(v)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── De dónde vino el dinero */}
        <View style={styles.sectionGap}>
          <Text style={styles.sectionTitle}>De dónde vino el dinero</Text>
          <View style={styles.miniRow}>
            <View style={styles.miniCard}>
              <Text style={styles.miniLabel}>Habitaciones</Text>
              <Text style={styles.miniValue}>{money(desglose.H)}</Text>
              <Text style={styles.miniSub}>
                {cantCuartos} {cantCuartos === 1 ? 'alquiler' : 'alquileres'}
              </Text>
            </View>
            <View style={styles.miniCard}>
              <Text style={styles.miniLabel}>Productos</Text>
              <Text style={styles.miniValue}>{money(desglose.B)}</Text>
              <Text style={styles.miniSub}>
                {cantVentas} venta directa · {money(consumosEnHab)} en
                habitación
              </Text>
            </View>
            <View style={styles.miniCard}>
              <Text style={styles.miniLabel}>Otros</Text>
              <Text style={styles.miniValue}>{money(desglose.O)}</Text>
              <Text style={styles.miniSub}>Ajustes y cargos extra</Text>
            </View>
          </View>
        </View>

        {/* ── Productos vendidos */}
        <View style={styles.sectionGap}>
          <Text style={styles.sectionTitle}>
            Productos vendidos
            {productosVendidos.length > 0 && ` (${productosVendidos.length})`}
          </Text>
          {productosVendidos.length === 0 ? (
            <Text style={styles.tableEmpty}>
              No se vendió ningún producto en este turno.
            </Text>
          ) : (
            <View>
              <View style={styles.tableHead}>
                <Text style={[styles.th, styles.colProd]}>Producto</Text>
                <Text style={[styles.th, styles.colCant]}>Cantidad</Text>
                <Text style={[styles.th, styles.colTotal]}>Total</Text>
              </View>
              {productosVendidos.map((p, i) => (
                <View key={i} style={styles.tRow}>
                  <Text style={[styles.td, styles.colProd]}>{p.nombre}</Text>
                  <Text style={[styles.td, styles.colCant]}>×{p.cantidad}</Text>
                  <Text style={[styles.tdBold, styles.colTotal]}>
                    {money(Number(p.total))}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Total final */}
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total recaudado</Text>
          <Text style={styles.totalValue}>{money(desglose.G)}</Text>
        </View>

        {/* ── Footer */}
        <View style={styles.footer} fixed>
          <Text>Reporte interno · Turno #{turnoId}</Text>
          <Text>Sol Caribe Hotel · sistema.caribeperu.com</Text>
        </View>
      </Page>
    </Document>
  );
}

function DatoRow({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.datosRow}>
      <Text style={styles.datosK}>{k}</Text>
      <Text style={styles.datosV}>{v}</Text>
    </View>
  );
}

export function turnoPdfFileName(reporte: TurnoReporte): string {
  const id = String(reporte.turno.id).padStart(3, '0');
  const fecha = new Date(reporte.turno.abiertoEn).toISOString().slice(0, 10);
  return `Turno_${id}_${fecha}.pdf`;
}
