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

// ────────────────────────────────────────────────────────────
// Estilos (formato ticket térmico 80mm = ~227pt ancho)
// ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    padding: 16,
    fontSize: 9,
    fontFamily: 'Courier',
    color: '#0f172a',
    lineHeight: 1.35,
  },
  center: { textAlign: 'center' },
  right: { textAlign: 'right' },
  bold: { fontFamily: 'Courier-Bold' },
  title: {
    fontSize: 13,
    fontFamily: 'Courier-Bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sub: { fontSize: 8, textAlign: 'center' },
  comprobante: {
    fontSize: 11,
    fontFamily: 'Courier-Bold',
    textAlign: 'center',
    marginTop: 2,
  },
  serie: {
    fontSize: 10,
    textAlign: 'center',
    fontFamily: 'Courier-Bold',
    marginBottom: 4,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomStyle: 'dashed',
    borderBottomColor: '#64748b',
    marginVertical: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1.5,
  },
  label: { color: '#64748b', fontSize: 8.5 },
  value: { fontSize: 8.5, textAlign: 'right', maxWidth: 150 },
  tableHeader: {
    flexDirection: 'row',
    fontFamily: 'Courier-Bold',
    fontSize: 8,
    marginBottom: 2,
  },
  col_cant: { width: 18 },
  col_hab: { width: 28 },
  col_desc: { flex: 1, paddingRight: 4 },
  col_imp: { width: 46, textAlign: 'right' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontFamily: 'Courier-Bold',
    fontSize: 11.5,
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: '#0f172a',
  },
  footer: {
    textAlign: 'center',
    fontSize: 8,
    marginTop: 10,
  },
  footerSmall: {
    textAlign: 'center',
    fontSize: 7,
    color: '#64748b',
    marginTop: 4,
  },
  letras: {
    fontSize: 7.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 4,
  },
  borrador: {
    fontSize: 8,
    fontFamily: 'Courier-Bold',
    textAlign: 'center',
    color: '#d97706',
    marginTop: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#d97706',
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

  const totalNum = Number(reserva.total);
  const IGV_RATE = 0.105; // 10.5% hospedaje
  const baseImponible = totalNum / (1 + IGV_RATE);
  const igv = totalNum - baseImponible;

  const yaEmitido = !!reserva.sunatSerie;
  const serie = reserva.sunatSerie || 'F001';
  const correlativo = String(reserva.sunatNumero || reserva.id).padStart(7, '0');

  // Tamaño ticket térmico ≈ 80mm × dinámico (más alto que boleta porque hay
  // N líneas de habitaciones).
  const altoEstimado = 380 + reserva.alquileres.length * 28;
  const pageSize: [number, number] = [227, Math.max(altoEstimado, 500)];

  return (
    <Document
      title={`Factura grupal ${serie}-${correlativo}`}
      author={empresa?.empresaNombre || 'Sol Caribe Hotel'}
    >
      <Page size={pageSize} style={styles.page}>
        {/* Encabezado empresa */}
        <View>
          <Text style={styles.title}>
            {(empresa?.empresaNombre || 'Sol Caribe Hotel').toUpperCase()}
          </Text>
          {empresa?.empresaRuc && (
            <Text style={styles.sub}>RUC: {empresa.empresaRuc}</Text>
          )}
          {empresa?.empresaDireccion && (
            <Text style={styles.sub}>{empresa.empresaDireccion}</Text>
          )}
          {empresa?.empresaTelefono && (
            <Text style={styles.sub}>Tel: {empresa.empresaTelefono}</Text>
          )}
        </View>

        <View style={styles.divider} />

        <Text style={styles.comprobante}>
          {yaEmitido ? 'FACTURA ELECTRÓNICA' : 'FACTURA · PREVIEW'}
        </Text>
        <Text style={styles.serie}>
          {serie}-{correlativo}
        </Text>

        <View style={styles.divider} />

        {/* Cliente */}
        <View>
          <PdfRow label="Fecha" value={`${fechaStr}  ${horaStr}`} />
          <PdfRow label="RUC" value={reserva.clienteRuc} />
          <PdfRow
            label="Razón Social"
            value={reserva.clienteRazonSocial.toUpperCase()}
          />
          {reserva.clienteDireccionFiscal && (
            <PdfRow
              label="Dirección"
              value={reserva.clienteDireccionFiscal}
            />
          )}
          <PdfRow
            label="Ingreso"
            value={new Date(reserva.fechaIngreso).toLocaleDateString('es-PE')}
          />
          <PdfRow
            label="Salida"
            value={new Date(reserva.fechaSalida).toLocaleDateString('es-PE')}
          />
          {reserva.sede?.nombre && (
            <PdfRow label="Sede" value={reserva.sede.nombre} />
          )}
        </View>

        <View style={styles.divider} />

        {/* Tabla — N líneas */}
        <View style={styles.tableHeader}>
          <Text style={styles.col_cant}>CANT</Text>
          <Text style={styles.col_hab}>HAB</Text>
          <Text style={styles.col_desc}>DESCRIPCIÓN</Text>
          <Text style={styles.col_imp}>IMPORTE</Text>
        </View>
        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: '#334155',
            marginBottom: 4,
          }}
        />
        {reserva.alquileres.map((a) => (
          <View
            key={a.id}
            style={{
              flexDirection: 'row',
              marginBottom: 4,
              paddingBottom: 2,
              borderBottomWidth: 0.5,
              borderBottomColor: '#e2e8f0',
              borderBottomStyle: 'dotted',
            }}
          >
            <Text style={styles.col_cant}>1</Text>
            <Text style={[styles.col_hab, styles.bold]}>
              {a.habitacion.numero}
            </Text>
            <Text style={[styles.col_desc, { textTransform: 'uppercase' }]}>
              {`ALOJAMIENTO ${(a.habitacion.descripcion || 'HABITACIÓN').toUpperCase()} x 1 DÍA`}
            </Text>
            <Text style={styles.col_imp}>
              {Number(a.precioHabitacion).toFixed(2)}
            </Text>
          </View>
        ))}

        <View style={styles.divider} />

        {/* Totales */}
        <View>
          <PdfRow label="OP. Gravada" value={`S/ ${baseImponible.toFixed(2)}`} />
          <PdfRow label="I.G.V. (10.5%)" value={`S/ ${igv.toFixed(2)}`} />
        </View>
        <View style={styles.totalRow}>
          <Text>TOTAL</Text>
          <Text>S/ {totalNum.toFixed(2)}</Text>
        </View>

        <Text style={styles.letras}>Son: {numeroALetras(totalNum)}</Text>

        <View style={styles.divider} />

        <View>
          <PdfRow label="Forma de Pago" value={reserva.metodoPago} />
          <PdfRow label="Condición" value="CONTADO" />
          <PdfRow
            label="Habitaciones"
            value={`${reserva.alquileres.length} en este grupo`}
          />
        </View>

        <View style={styles.divider} />

        <Text style={[styles.footer, styles.bold]}>
          ¡GRACIAS POR SU PREFERENCIA!
        </Text>

        {yaEmitido ? (
          <Text style={styles.footerSmall}>
            Representación impresa del comprobante electrónico
          </Text>
        ) : (
          <Text style={styles.borrador}>
            BORRADOR — El correlativo y enlace{'\n'}SUNAT se asignan al emitir
          </Text>
        )}
      </Page>
    </Document>
  );
}

function PdfRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

// ────────────────────────────────────────────────────────────
// numeroALetras
// ────────────────────────────────────────────────────────────
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
