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
// Estilos (formato A4, dos secciones, tipografía limpia)
// ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    paddingVertical: 28,
    paddingHorizontal: 32,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#0f172a',
    lineHeight: 1.4,
  },

  // Encabezado empresa
  brand: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  brandSub: { fontSize: 8.5, textAlign: 'center', color: '#475569' },

  // Banner del turno (gris)
  banner: {
    marginTop: 12,
    backgroundColor: '#1e293b',
    color: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerLeft: { flexDirection: 'column' },
  bannerLabel: {
    fontSize: 8,
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  bannerTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    marginTop: 2,
  },
  bannerMeta: { fontSize: 9, color: '#e2e8f0', marginTop: 1 },
  bannerRight: { alignItems: 'flex-end' },
  bannerEstado: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bannerEstadoOpen: { backgroundColor: '#f59e0b' },

  // Tiles de totales
  tilesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  tile: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 8,
  },
  tileLabel: {
    fontSize: 7.5,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontFamily: 'Helvetica-Bold',
  },
  tileValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginTop: 3,
  },

  // Secciones genéricas
  section: { marginTop: 14 },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 0.6,
    borderBottomColor: '#cbd5e1',
  },

  // Filas k/v
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2.5,
    borderBottomWidth: 0.4,
    borderBottomColor: '#f1f5f9',
  },
  kvK: { color: '#475569', fontSize: 9.5 },
  kvV: { color: '#0f172a', fontSize: 9.5, fontFamily: 'Helvetica-Bold' },

  // Tabla productos
  thead: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 3,
  },
  th: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  trow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.4,
    borderBottomColor: '#f1f5f9',
  },
  td: { fontSize: 9.5 },

  // Columnas de productos
  col_prod: { flex: 1, paddingRight: 6 },
  col_cant: { width: 50, textAlign: 'right' },
  col_total: { width: 70, textAlign: 'right' },

  // Gran total destacado
  granTotal: {
    marginTop: 10,
    backgroundColor: '#0f172a',
    color: '#ffffff',
    padding: 10,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  granTotalLabel: {
    color: '#cbd5e1',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: 'Helvetica-Bold',
  },
  granTotalValue: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
  },

  footer: {
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#cbd5e1',
    fontSize: 7.5,
    color: '#94a3b8',
    textAlign: 'center',
  },

  twoCol: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
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

  const fechaTurno = abierto.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const horaInicio = abierto.toLocaleTimeString('es-PE', { hour12: false });
  const horaCierre = cerrado
    ? cerrado.toLocaleTimeString('es-PE', { hour12: false })
    : '— (turno abierto)';

  // Duración
  let duracionStr = '—';
  if (cerrado) {
    const ms = cerrado.getTime() - abierto.getTime();
    const horas = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    duracionStr = `${horas}h ${mins}m`;
  }

  // Efectivo / online breakdown
  const efectivo = porMetodo.EFECTIVO ?? 0;
  const visa = porMetodo.VISA ?? 0;
  const master = porMetodo.MASTERCARD ?? 0;
  const yape = porMetodo.YAPE ?? 0;
  const plin = porMetodo.PLIN ?? 0;
  const otro = porMetodo.OTRO ?? 0;
  const totalDigital = visa + master + yape + plin + otro;

  // Cantidad de cuartos cobrados
  const cantidadCuartos = alquileres?.cantidad ?? 0;

  const cerradoBool = turno.estado === 'CERRADO';

  return (
    <Document
      title={`Turno ${String(turno.id).padStart(3, '0')} · ${fechaTurno}`}
      author={empresa?.empresaNombre || 'Sol Caribe Hotel'}
      subject="Detalle de turno de caja"
    >
      <Page size="A4" style={styles.page}>
        {/* Header empresa */}
        <View>
          <Text style={styles.brand}>
            {(empresa?.empresaNombre || 'Sol Caribe Hotel').toUpperCase()}
          </Text>
          {empresa?.empresaRuc && (
            <Text style={styles.brandSub}>RUC: {empresa.empresaRuc}</Text>
          )}
          {empresa?.empresaDireccion && (
            <Text style={styles.brandSub}>{empresa.empresaDireccion}</Text>
          )}
          {empresa?.empresaTelefono && (
            <Text style={styles.brandSub}>Tel: {empresa.empresaTelefono}</Text>
          )}
        </View>

        {/* Banner turno */}
        <View style={styles.banner}>
          <View style={styles.bannerLeft}>
            <Text style={styles.bannerLabel}>Detalle de turno</Text>
            <Text style={styles.bannerTitle}>
              #{String(turno.id).padStart(3, '0')} · {fechaTurno}
            </Text>
            <Text style={styles.bannerMeta}>
              {turno.usuario?.nombre || '—'} · {turno.sede?.nombre || '—'}
            </Text>
          </View>
          <View style={styles.bannerRight}>
            <Text
              style={[
                styles.bannerEstado,
                cerradoBool ? {} : styles.bannerEstadoOpen,
              ]}
            >
              {turno.estado}
            </Text>
          </View>
        </View>

        {/* Horarios + duración + cuartos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del turno</Text>
          <View style={styles.twoCol}>
            <View style={styles.half}>
              <KV k="Apertura" v={`${fechaTurno}  ${horaInicio}`} />
              <KV k="Cierre" v={cerradoBool ? `${fechaTurno}  ${horaCierre}` : horaCierre} />
              <KV k="Duración" v={duracionStr} />
            </View>
            <View style={styles.half}>
              <KV k="Usuario" v={turno.usuario?.nombre || '—'} />
              <KV k="Sede" v={turno.sede?.nombre || '—'} />
              <KV k="Cantidad de cuartos" v={String(cantidadCuartos)} />
            </View>
          </View>
        </View>

        {/* Tiles principales */}
        <View style={styles.tilesRow}>
          <Tile label="Habitaciones" value={`S/ ${desglose.H.toFixed(2)}`} />
          <Tile label="Productos" value={`S/ ${desglose.B.toFixed(2)}`} />
          <Tile label="Otros" value={`S/ ${desglose.O.toFixed(2)}`} />
          <Tile label="Total general" value={`S/ ${desglose.G.toFixed(2)}`} />
        </View>

        {/* Efectivo vs digital */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recaudación por canal</Text>
          <View style={styles.twoCol}>
            <View style={styles.half}>
              <KV k="Efectivo físico (total)" v={`S/ ${efectivo.toFixed(2)}`} />
              <KV
                k="Pagos digitales (total)"
                v={`S/ ${totalDigital.toFixed(2)}`}
              />
            </View>
            <View style={styles.half}>
              <KV k="VISA" v={`S/ ${visa.toFixed(2)}`} />
              <KV k="MASTERCARD" v={`S/ ${master.toFixed(2)}`} />
              <KV k="YAPE" v={`S/ ${yape.toFixed(2)}`} />
              <KV k="PLIN" v={`S/ ${plin.toFixed(2)}`} />
              <KV k="OTRO" v={`S/ ${otro.toFixed(2)}`} />
            </View>
          </View>
        </View>

        {/* Composición del ingreso */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Composición del ingreso</Text>
          <KV
            k={`Alquileres de habitaciones (${cantidadCuartos})`}
            v={`S/ ${desglose.H.toFixed(2)}`}
          />
          <KV
            k={`Ventas directas (${ventasDirectas?.cantidad ?? 0})`}
            v={`S/ ${(ventasDirectas?.total ?? 0).toFixed(2)}`}
          />
          <KV
            k="Consumos dentro de alquileres"
            v={`S/ ${(desglose.B - (ventasDirectas?.total ?? 0)).toFixed(2)}`}
          />
        </View>

        {/* Productos vendidos */}
        {productosVendidos && productosVendidos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Productos vendidos ({productosVendidos.length})
            </Text>
            <View style={styles.thead}>
              <Text style={[styles.th, styles.col_prod]}>Producto</Text>
              <Text style={[styles.th, styles.col_cant]}>Cantidad</Text>
              <Text style={[styles.th, styles.col_total]}>Total</Text>
            </View>
            {productosVendidos.map((p, i) => (
              <View key={i} style={styles.trow}>
                <Text style={[styles.td, styles.col_prod]}>{p.nombre}</Text>
                <Text style={[styles.td, styles.col_cant]}>×{p.cantidad}</Text>
                <Text style={[styles.td, styles.col_total]}>
                  S/ {Number(p.total).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Gran total */}
        <View style={styles.granTotal}>
          <Text style={styles.granTotalLabel}>Total recaudado del turno</Text>
          <Text style={styles.granTotalValue}>
            S/ {desglose.G.toFixed(2)}
          </Text>
        </View>

        <Text style={styles.footer}>
          Generado el {new Date().toLocaleString('es-PE')} · Sistema Sol Caribe
        </Text>
      </Page>
    </Document>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvK}>{k}</Text>
      <Text style={styles.kvV}>{v}</Text>
    </View>
  );
}

export function turnoPdfFileName(reporte: TurnoReporte): string {
  const id = String(reporte.turno.id).padStart(3, '0');
  const fecha = new Date(reporte.turno.abiertoEn)
    .toISOString()
    .slice(0, 10);
  return `Turno_${id}_${fecha}.pdf`;
}
