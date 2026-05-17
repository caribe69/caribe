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
// Paleta
// ────────────────────────────────────────────────────────────
const C = {
  ink: '#0b1220',
  text: '#1f2937',
  muted: '#6b7280',
  soft: '#9ca3af',
  border: '#0b1220',
  line: '#d1d5db',
  bgSoft: '#f3f4f6',
  green: '#047857',
  blue: '#1d4ed8',
};

// ────────────────────────────────────────────────────────────
// Estilos — densos, estilo planilla con cuadrículas
// ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 22,
    paddingHorizontal: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: C.text,
    lineHeight: 1.3,
  },

  // ── HEADER (chico, una línea)
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: C.ink,
  },
  brand: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
  },
  brandSub: { fontSize: 7.5, color: C.muted, marginTop: 1 },
  topRight: { alignItems: 'flex-end' },
  topRightLabel: {
    fontSize: 7.5,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontFamily: 'Helvetica-Bold',
  },
  topRightDate: { fontSize: 8, color: C.muted, marginTop: 1 },

  // ── BLOQUE TURNO — cuadrícula tipo ficha
  fichaWrap: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  fichaTitleRow: {
    flexDirection: 'row',
    backgroundColor: C.ink,
    paddingVertical: 5,
    paddingHorizontal: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fichaTitleLabel: {
    color: '#d1d5db',
    fontSize: 7.5,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: 'Helvetica-Bold',
  },
  fichaTitleNum: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
  },
  fichaTitleFecha: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  fichaEstado: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 8,
  },
  fichaGrid: {
    flexDirection: 'row',
  },
  fichaCell: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: C.line,
  },
  fichaCellLast: {
    borderRightWidth: 0,
  },
  fichaK: {
    fontSize: 6.5,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: 'Helvetica-Bold',
  },
  fichaV: {
    fontSize: 9.5,
    color: C.ink,
    fontFamily: 'Helvetica-Bold',
    marginTop: 1.5,
  },

  // ── SECCIÓN título
  sectionGap: { marginTop: 10 },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    marginBottom: 5,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: C.ink,
  },

  // ── COBRO: 2 cards grandes + grid de métodos
  cobroRow: { flexDirection: 'row', gap: 8 },
  cobroCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.line,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  cobroLabel: {
    fontSize: 7,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: 'Helvetica-Bold',
  },
  cobroValueGreen: {
    fontSize: 17,
    fontFamily: 'Helvetica-Bold',
    color: C.green,
    marginTop: 3,
  },
  cobroValueBlue: {
    fontSize: 17,
    fontFamily: 'Helvetica-Bold',
    color: C.blue,
    marginTop: 3,
  },
  cobroHint: { fontSize: 7, color: C.muted, marginTop: 2 },

  metodosGrid: {
    flexDirection: 'row',
    marginTop: 6,
    borderWidth: 1,
    borderColor: C.line,
  },
  metodoCell: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: C.line,
  },
  metodoCellLast: { borderRightWidth: 0 },
  metodoK: {
    fontSize: 6.5,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontFamily: 'Helvetica-Bold',
  },
  metodoV: {
    fontSize: 9,
    color: C.ink,
    fontFamily: 'Helvetica-Bold',
    marginTop: 1,
  },

  // ── ORIGEN: 3 tiles inline
  origenRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: C.line,
  },
  origenCell: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: C.line,
  },
  origenLast: { borderRightWidth: 0 },
  origenLabel: {
    fontSize: 7,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    fontFamily: 'Helvetica-Bold',
  },
  origenValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: C.ink,
    marginTop: 2,
  },
  origenSub: { fontSize: 7, color: C.muted, marginTop: 1.5 },

  // ── PRODUCTOS — 2 columnas tipo cuaderno
  prodCols: { flexDirection: 'row', gap: 10 },
  prodCol: { flex: 1 },
  prodHead: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.ink,
    backgroundColor: C.bgSoft,
  },
  prodTh: {
    fontSize: 6.8,
    fontFamily: 'Helvetica-Bold',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  prodRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderBottomWidth: 0.4,
    borderBottomColor: C.line,
  },
  prodTd: { fontSize: 8.5, color: C.text },
  prodTdBold: { fontSize: 8.5, color: C.ink, fontFamily: 'Helvetica-Bold' },
  pColProd: { flex: 1, paddingRight: 4 },
  pColCant: { width: 28, textAlign: 'right' },
  pColTotal: { width: 50, textAlign: 'right' },
  prodEmpty: {
    fontSize: 8,
    color: C.soft,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.line,
  },

  // ── TOTAL final
  totalRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.ink,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  totalLabel: {
    color: '#cbd5e1',
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    fontFamily: 'Helvetica-Bold',
  },
  totalValue: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
  },

  // ── Footer
  footerLine: {
    marginTop: 8,
    paddingTop: 5,
    borderTopWidth: 0.5,
    borderTopColor: C.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: C.soft,
  },
});

// ────────────────────────────────────────────────────────────
// Helpers
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
  const horaCierre = cerrado ? formatHora(cerrado) : '—';

  let duracion = '—';
  if (cerrado) {
    const ms = cerrado.getTime() - abierto.getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    duracion = h > 0 ? `${h}h ${m}m` : `${m} min`;
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

  // Productos en 2 columnas (estilo cuaderno) — sólo los que tengan datos
  const productos = productosVendidos || [];
  const mitad = Math.ceil(productos.length / 2);
  const colA = productos.slice(0, mitad);
  const colB = productos.slice(mitad);

  const metodos: Array<[string, number]> = [
    ['Efectivo', efectivo],
    ['Yape', yape],
    ['Plin', plin],
    ['Visa', visa],
    ['Mastercard', master],
    ['Otro', otro],
  ];

  return (
    <Document
      title={`Turno ${turnoId} · ${fechaTurno}`}
      author={empresa?.empresaNombre || 'Sol Caribe Hotel'}
      subject="Reporte interno de turno"
    >
      <Page size="A4" style={styles.page}>
        {/* ── Encabezado */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.brand}>
              {(empresa?.empresaNombre || 'Sol Caribe Hotel').toUpperCase()}
            </Text>
            <Text style={styles.brandSub}>
              {empresa?.empresaRuc ? `RUC ${empresa.empresaRuc}` : ''}
              {empresa?.empresaRuc && turno.sede?.nombre ? '  ·  ' : ''}
              {turno.sede?.nombre ? `Sede ${turno.sede.nombre}` : ''}
            </Text>
          </View>
          <View style={styles.topRight}>
            <Text style={styles.topRightLabel}>Reporte de turno</Text>
            <Text style={styles.topRightDate}>
              Emitido {new Date().toLocaleString('es-PE')}
            </Text>
          </View>
        </View>

        {/* ── FICHA DEL TURNO — todo en una cuadrícula */}
        <View style={styles.fichaWrap}>
          <View style={styles.fichaTitleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.fichaTitleLabel}>Turno N°</Text>
              <Text style={[styles.fichaTitleNum, { marginLeft: 6 }]}>
                {turnoId}
              </Text>
              <Text
                style={[
                  styles.fichaEstado,
                  cerradoBool
                    ? { backgroundColor: '#9ca3af', color: '#ffffff' }
                    : { backgroundColor: '#fbbf24', color: '#0b1220' },
                ]}
              >
                {turno.estado}
              </Text>
            </View>
            <Text style={styles.fichaTitleFecha}>{fechaTurno}</Text>
          </View>

          {/* Fila 1: usuario / sede / apertura / cierre / duración / cuartos */}
          <View style={styles.fichaGrid}>
            <View style={styles.fichaCell}>
              <Text style={styles.fichaK}>Usuario</Text>
              <Text style={styles.fichaV}>
                {turno.usuario?.nombre || '—'}
              </Text>
            </View>
            <View style={styles.fichaCell}>
              <Text style={styles.fichaK}>Apertura</Text>
              <Text style={styles.fichaV}>{horaInicio}</Text>
            </View>
            <View style={styles.fichaCell}>
              <Text style={styles.fichaK}>Cierre</Text>
              <Text style={styles.fichaV}>{horaCierre}</Text>
            </View>
            <View style={styles.fichaCell}>
              <Text style={styles.fichaK}>Duración</Text>
              <Text style={styles.fichaV}>{duracion}</Text>
            </View>
            <View style={[styles.fichaCell, styles.fichaCellLast]}>
              <Text style={styles.fichaK}>Cuartos</Text>
              <Text style={styles.fichaV}>{cantCuartos}</Text>
            </View>
          </View>
        </View>

        {/* ── CÓMO SE COBRÓ */}
        <View style={styles.sectionGap}>
          <Text style={styles.sectionTitle}>Cómo se cobró</Text>
          <View style={styles.cobroRow}>
            <View style={styles.cobroCard}>
              <Text style={styles.cobroLabel}>Efectivo físico</Text>
              <Text style={styles.cobroValueGreen}>{money(efectivo)}</Text>
              <Text style={styles.cobroHint}>
                Billetes y monedas recibidos en caja
              </Text>
            </View>
            <View style={styles.cobroCard}>
              <Text style={styles.cobroLabel}>Pagos digitales</Text>
              <Text style={styles.cobroValueBlue}>{money(digital)}</Text>
              <Text style={styles.cobroHint}>
                Yape, Plin, Visa, Mastercard y otros
              </Text>
            </View>
          </View>

          {/* Grid de métodos — siempre los 6, así si está en 0 también se ve */}
          <View style={styles.metodosGrid}>
            {metodos.map(([n, v], i) => (
              <View
                key={n}
                style={[
                  styles.metodoCell,
                  i === metodos.length - 1 ? styles.metodoCellLast : {},
                ]}
              >
                <Text style={styles.metodoK}>{n}</Text>
                <Text style={styles.metodoV}>{money(v)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── DE DÓNDE VINO */}
        <View style={styles.sectionGap}>
          <Text style={styles.sectionTitle}>De dónde vino el dinero</Text>
          <View style={styles.origenRow}>
            <View style={styles.origenCell}>
              <Text style={styles.origenLabel}>Habitaciones</Text>
              <Text style={styles.origenValue}>{money(desglose.H)}</Text>
              <Text style={styles.origenSub}>
                {cantCuartos} {cantCuartos === 1 ? 'alquiler' : 'alquileres'}
              </Text>
            </View>
            <View style={styles.origenCell}>
              <Text style={styles.origenLabel}>Productos</Text>
              <Text style={styles.origenValue}>{money(desglose.B)}</Text>
              <Text style={styles.origenSub}>
                {cantVentas} ventas · {money(consumosEnHab)} en habitación
              </Text>
            </View>
            <View style={[styles.origenCell, styles.origenLast]}>
              <Text style={styles.origenLabel}>Otros</Text>
              <Text style={styles.origenValue}>{money(desglose.O)}</Text>
              <Text style={styles.origenSub}>Ajustes y cargos extra</Text>
            </View>
          </View>
        </View>

        {/* ── PRODUCTOS en 2 columnas */}
        <View style={styles.sectionGap} wrap={false}>
          <Text style={styles.sectionTitle}>
            Productos vendidos
            {productos.length > 0 && ` (${productos.length})`}
          </Text>

          {productos.length === 0 ? (
            <Text style={styles.prodEmpty}>
              No se vendió ningún producto en este turno.
            </Text>
          ) : (
            <View style={styles.prodCols}>
              <View style={styles.prodCol}>
                <ProdHead />
                {colA.map((p, i) => (
                  <ProdRow key={i} p={p} />
                ))}
              </View>
              <View style={styles.prodCol}>
                {colB.length > 0 ? (
                  <>
                    <ProdHead />
                    {colB.map((p, i) => (
                      <ProdRow key={i} p={p} />
                    ))}
                  </>
                ) : null}
              </View>
            </View>
          )}
        </View>

        {/* ── TOTAL */}
        <View style={styles.totalRow} wrap={false}>
          <Text style={styles.totalLabel}>Total recaudado del turno</Text>
          <Text style={styles.totalValue}>{money(desglose.G)}</Text>
        </View>

        {/* ── Footer */}
        <View style={styles.footerLine}>
          <Text>Reporte interno · Turno #{turnoId}</Text>
          <Text>Sol Caribe Hotel · sistema.caribeperu.com</Text>
        </View>
      </Page>
    </Document>
  );
}

function ProdHead() {
  return (
    <View style={styles.prodHead}>
      <Text style={[styles.prodTh, styles.pColProd]}>Producto</Text>
      <Text style={[styles.prodTh, styles.pColCant]}>Cant.</Text>
      <Text style={[styles.prodTh, styles.pColTotal]}>Total</Text>
    </View>
  );
}

function ProdRow({ p }: { p: { nombre: string; cantidad: number; total: number } }) {
  return (
    <View style={styles.prodRow}>
      <Text style={[styles.prodTd, styles.pColProd]}>{p.nombre}</Text>
      <Text style={[styles.prodTd, styles.pColCant]}>×{p.cantidad}</Text>
      <Text style={[styles.prodTdBold, styles.pColTotal]}>
        {money(Number(p.total))}
      </Text>
    </View>
  );
}

export function turnoPdfFileName(reporte: TurnoReporte): string {
  const id = String(reporte.turno.id).padStart(3, '0');
  const fecha = new Date(reporte.turno.abiertoEn).toISOString().slice(0, 10);
  return `Turno_${id}_${fecha}.pdf`;
}
