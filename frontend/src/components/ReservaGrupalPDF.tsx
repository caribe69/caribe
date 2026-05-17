import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

Font.registerHyphenationCallback((word) => [word]);

interface AlquilerLinea {
  id: number;
  precioHabitacion: string | number;
  clienteNombre: string;
  habitacion: { numero: string; descripcion?: string | null };
}

export interface ReservaGrupalPDFInput {
  id: number;
  creadoEn: string;
  clienteRuc: string;
  clienteRazonSocial: string;
  clienteDireccionFiscal: string | null;
  contactoNombre: string | null;
  metodoPago: string;
  total: string | number;
  fechaIngreso: string;
  fechaSalida: string;
  sunatSerie: string | null;
  sunatNumero: number | null;
  alquileres: AlquilerLinea[];
  sede?: { nombre?: string; direccion?: string | null };
}

interface EmpresaConfig {
  empresaNombre?: string | null;
  empresaRuc?: string | null;
  empresaDireccion?: string | null;
  empresaTelefono?: string | null;
  empresaEmail?: string | null;
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#0f172a',
    lineHeight: 1.4,
  },
  bold: { fontFamily: 'Helvetica-Bold' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  empresa: {
    flex: 1,
  },
  empresaNombre: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  empresaInfo: { fontSize: 9, color: '#475569', marginTop: 2 },
  comprobanteBox: {
    borderWidth: 1,
    borderColor: '#7c3aed',
    borderRadius: 4,
    padding: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  ruc: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#7c3aed',
  },
  tipoDoc: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  serieNum: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#7c3aed',
    marginTop: 2,
  },
  section: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 },
  label: { color: '#64748b', fontSize: 9, width: 80 },
  value: { fontSize: 9, flex: 1 },

  table: {
    marginTop: 10,
    borderTopWidth: 1.5,
    borderTopColor: '#0f172a',
  },
  tableHeader: {
    flexDirection: 'row',
    padding: 6,
    backgroundColor: '#f1f5f9',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#cbd5e1',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
  colCant: { width: 30, textAlign: 'center' },
  colHab: { width: 50 },
  colDesc: { flex: 1, paddingRight: 6 },
  colImporte: { width: 60, textAlign: 'right' },

  totales: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  totalLinea: {
    flexDirection: 'row',
    width: 200,
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  totalGeneral: {
    flexDirection: 'row',
    width: 200,
    justifyContent: 'space-between',
    paddingTop: 4,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#0f172a',
  },
  totalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  totalValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  bigTotalLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  bigTotalValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    color: '#7c3aed',
  },

  letras: {
    fontSize: 8,
    color: '#475569',
    fontStyle: 'italic',
    marginTop: 10,
    textTransform: 'uppercase',
  },

  footer: {
    marginTop: 20,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#cbd5e1',
    fontSize: 7,
    color: '#94a3b8',
    textAlign: 'center',
  },
});

export function ReservaGrupalPDFDoc({
  reserva,
  empresa,
}: {
  reserva: ReservaGrupalPDFInput;
  empresa?: EmpresaConfig;
}) {
  const fecha = new Date(reserva.creadoEn);
  const fechaStr = fecha.toLocaleDateString('es-PE');
  const horaStr = fecha.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const ingreso = new Date(reserva.fechaIngreso).toLocaleDateString('es-PE');
  const salida = new Date(reserva.fechaSalida).toLocaleDateString('es-PE');

  const totalNum = Number(reserva.total);
  const IGV_RATE = 0.105; // 10.5% hospedaje
  const baseImponible = totalNum / (1 + IGV_RATE);
  const igv = totalNum - baseImponible;

  const yaEmitido = !!reserva.sunatSerie;
  const serie = reserva.sunatSerie || 'F001';
  const correlativo = String(reserva.sunatNumero || reserva.id).padStart(8, '0');

  return (
    <Document
      title={`Factura grupal ${serie}-${correlativo}`}
      author={empresa?.empresaNombre || 'Sol Caribe Hotel'}
    >
      <Page size="A4" style={styles.page}>
        {/* Header empresa + tipo doc */}
        <View style={styles.headerRow}>
          <View style={styles.empresa}>
            <Text style={styles.empresaNombre}>
              {empresa?.empresaNombre || 'SOL CARIBE HOTEL'}
            </Text>
            {empresa?.empresaDireccion && (
              <Text style={styles.empresaInfo}>{empresa.empresaDireccion}</Text>
            )}
            {empresa?.empresaTelefono && (
              <Text style={styles.empresaInfo}>
                Teléfono: {empresa.empresaTelefono}
              </Text>
            )}
            {empresa?.empresaEmail && (
              <Text style={styles.empresaInfo}>{empresa.empresaEmail}</Text>
            )}
          </View>
          <View style={styles.comprobanteBox}>
            <Text style={styles.ruc}>RUC: {empresa?.empresaRuc || '—'}</Text>
            <Text style={styles.tipoDoc}>
              {yaEmitido ? 'FACTURA ELECTRÓNICA' : 'FACTURA · PREVIEW'}
            </Text>
            <Text style={styles.serieNum}>
              {serie}-{correlativo}
            </Text>
          </View>
        </View>

        {/* Datos del cliente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Razón Social:</Text>
            <Text style={[styles.value, styles.bold]}>
              {reserva.clienteRazonSocial.toUpperCase()}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>RUC:</Text>
            <Text style={styles.value}>{reserva.clienteRuc}</Text>
          </View>
          {reserva.clienteDireccionFiscal && (
            <View style={styles.row}>
              <Text style={styles.label}>Dirección:</Text>
              <Text style={styles.value}>
                {reserva.clienteDireccionFiscal}
              </Text>
            </View>
          )}
          {reserva.contactoNombre && (
            <View style={styles.row}>
              <Text style={styles.label}>Contacto:</Text>
              <Text style={styles.value}>{reserva.contactoNombre}</Text>
            </View>
          )}
        </View>

        {/* Datos del comprobante */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del comprobante</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Emisión:</Text>
            <Text style={styles.value}>
              {fechaStr} {horaStr}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Ingreso:</Text>
            <Text style={styles.value}>{ingreso}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Salida:</Text>
            <Text style={styles.value}>{salida}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Moneda:</Text>
            <Text style={styles.value}>SOLES (PEN)</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Forma de pago:</Text>
            <Text style={styles.value}>{reserva.metodoPago} · CONTADO</Text>
          </View>
          {reserva.sede?.nombre && (
            <View style={styles.row}>
              <Text style={styles.label}>Sede:</Text>
              <Text style={styles.value}>{reserva.sede.nombre}</Text>
            </View>
          )}
        </View>

        {/* Detalle */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colCant}>Cant.</Text>
            <Text style={styles.colHab}>Hab.</Text>
            <Text style={styles.colDesc}>Descripción</Text>
            <Text style={styles.colImporte}>Importe</Text>
          </View>
          {reserva.alquileres.map((a) => (
            <View key={a.id} style={styles.tableRow}>
              <Text style={styles.colCant}>1</Text>
              <Text style={styles.colHab}>{a.habitacion.numero}</Text>
              <Text style={styles.colDesc}>
                ALOJAMIENTO{' '}
                {(a.habitacion.descripcion || 'HABITACIÓN').toUpperCase()} x 1
                DÍA
                {a.clienteNombre && ` · ${a.clienteNombre}`}
              </Text>
              <Text style={styles.colImporte}>
                {Number(a.precioHabitacion).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totales */}
        <View style={styles.totales}>
          <View style={styles.totalLinea}>
            <Text style={styles.label}>OP. Gravada:</Text>
            <Text style={{ fontSize: 9, textAlign: 'right' }}>
              S/ {baseImponible.toFixed(2)}
            </Text>
          </View>
          <View style={styles.totalLinea}>
            <Text style={styles.label}>I.G.V. (10.5%):</Text>
            <Text style={{ fontSize: 9, textAlign: 'right' }}>
              S/ {igv.toFixed(2)}
            </Text>
          </View>
          <View style={styles.totalGeneral}>
            <Text style={styles.bigTotalLabel}>TOTAL</Text>
            <Text style={styles.bigTotalValue}>S/ {totalNum.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={styles.letras}>
          Son: {numeroALetras(totalNum)}
        </Text>

        <Text style={styles.footer}>
          {yaEmitido
            ? 'Representación impresa del comprobante electrónico aceptado por SUNAT'
            : 'BORRADOR — Este documento es solo una vista previa. El correlativo y enlace SUNAT se asignan al emitir.'}
        </Text>
      </Page>
    </Document>
  );
}

// numeroALetras simplificado (igual que BoletaPDF)
const UNIDADES = [
  '', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS',
  'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE',
];
const DECENAS = [
  '', '', 'VEINTI', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA',
];
const CENTENAS = [
  '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
  'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS',
];
function centenasAletras(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  if (n < 21) return UNIDADES[n];
  if (n < 30) return 'VEINTI' + UNIDADES[n - 20];
  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    return DECENAS[d] + (u ? ' Y ' + UNIDADES[u] : '');
  }
  const c = Math.floor(n / 100);
  const resto = n % 100;
  return CENTENAS[c] + (resto ? ' ' + centenasAletras(resto) : '');
}
function milesAletras(n: number): string {
  if (n < 1000) return centenasAletras(n);
  const miles = Math.floor(n / 1000);
  const resto = n % 1000;
  const milesStr = miles === 1 ? 'MIL' : centenasAletras(miles) + ' MIL';
  return milesStr + (resto ? ' ' + centenasAletras(resto) : '');
}
function numeroALetras(monto: number): string {
  const entero = Math.floor(monto);
  const centavos = Math.round((monto - entero) * 100);
  const enteroStr = entero === 0 ? 'CERO' : milesAletras(entero);
  const centavosStr = String(centavos).padStart(2, '0');
  return `${enteroStr} CON ${centavosStr}/100 SOLES`;
}
