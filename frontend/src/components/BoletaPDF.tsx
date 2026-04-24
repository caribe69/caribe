import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// Usa fuente del sistema (Helvetica + Courier) — vector, texto seleccionable.
// Si querés una tipografía custom se puede registrar con Font.register().
Font.registerHyphenationCallback((word) => [word]);

interface Consumo {
  cantidad: number;
  subtotal: string | number;
  producto: { nombre: string };
}

interface AlquilerPDF {
  id: number;
  creadoEn: string;
  clienteNombre: string;
  clienteDni: string;
  precioHabitacion: string | number;
  total: string | number;
  metodoPago: string;
  tipoComprobante?: string | null;
  clienteRuc?: string | null;
  clienteRazonSocial?: string | null;
  clienteDireccionFiscal?: string | null;
  habitacion: {
    numero: string;
    descripcion?: string | null;
    piso: { numero: number };
  };
  consumos?: Consumo[];
  creadoPor?: { nombre: string; username?: string } | null;
  sede?: { nombre?: string };
}

interface EmpresaConfig {
  empresaNombre?: string | null;
  empresaRuc?: string | null;
  empresaDireccion?: string | null;
  empresaTelefono?: string | null;
  empresaEmail?: string | null;
}

// ────────────────────────────────────────────────────────────
// Estilos (formato ticket térmico 80mm = ~227pt de ancho)
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
  col_cant: { width: 24 },
  col_desc: { flex: 1, paddingRight: 4 },
  col_imp: { width: 50, textAlign: 'right' },
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
});

// ────────────────────────────────────────────────────────────
// Componente Documento PDF
// ────────────────────────────────────────────────────────────
export function BoletaPDFDoc({
  alquiler,
  empresa,
}: {
  alquiler: AlquilerPDF;
  empresa?: EmpresaConfig;
}) {
  const fecha = new Date(alquiler.creadoEn);
  const fechaStr = fecha.toLocaleDateString('es-PE');
  const horaStr = fecha.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalNum = Number(alquiler.precioHabitacion);
  const IGV_RATE = 0.105; // 10.5% para hospedaje (PE)
  const baseImponible = totalNum / (1 + IGV_RATE);
  const igv = totalNum - baseImponible;

  const esFactura = alquiler.tipoComprobante === 'FACTURA';
  const serie = esFactura ? 'F001' : 'B001';
  const correlativo = String(alquiler.id).padStart(7, '0');

  // Tamaño ticket 80mm ≈ 227pt ancho; largo dinámico con dpi 72
  // Usamos 80mm × 220mm (ajustable según contenido)
  const pageSize: [number, number] = [227, 624]; // pts

  return (
    <Document
      title={`${esFactura ? 'Factura' : 'Boleta'} ${serie}-${correlativo}`}
      author={empresa?.empresaNombre || 'Sol Caribe Hotel'}
      subject="Comprobante de hospedaje"
    >
      <Page size={pageSize} style={styles.page}>
        {/* Encabezado */}
        <View>
          <Text style={styles.title}>
            {(empresa?.empresaNombre || 'Caribe Hotel').toUpperCase()}
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
          {esFactura ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA'}
        </Text>
        <Text style={styles.serie}>
          {serie}-{correlativo}
        </Text>

        <View style={styles.divider} />

        {/* Datos cliente */}
        <View>
          <PdfRow label="Fecha" value={`${fechaStr}  ${horaStr}`} />
          <PdfRow label="Atendido" value={alquiler.creadoPor?.nombre || '—'} />
          {esFactura ? (
            <>
              <PdfRow label="RUC" value={alquiler.clienteRuc || '—'} />
              <PdfRow
                label="Razón Social"
                value={(alquiler.clienteRazonSocial || '').toUpperCase() || '—'}
              />
              {alquiler.clienteDireccionFiscal && (
                <PdfRow
                  label="Dirección"
                  value={alquiler.clienteDireccionFiscal}
                />
              )}
            </>
          ) : (
            <>
              <PdfRow
                label="Cliente"
                value={alquiler.clienteNombre || 'CONSUMIDOR FINAL'}
              />
              <PdfRow label="DNI" value={alquiler.clienteDni || '00000000'} />
            </>
          )}
          {alquiler.sede?.nombre && (
            <PdfRow label="Sede" value={alquiler.sede.nombre} />
          )}
        </View>

        <View style={styles.divider} />

        {/* Tabla */}
        <View style={styles.tableHeader}>
          <Text style={styles.col_cant}>CANT</Text>
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
        <View style={{ flexDirection: 'row', marginBottom: 2 }}>
          <Text style={styles.col_cant}>1</Text>
          <Text style={[styles.col_desc, { textTransform: 'uppercase' }]}>
            {`Alojamiento ${(alquiler.habitacion.descripcion || 'Habitación').toUpperCase()} x 1 día`}
          </Text>
          <Text style={styles.col_imp}>{totalNum.toFixed(2)}</Text>
        </View>

        <View style={styles.divider} />

        {/* Totales */}
        <View>
          <PdfRow
            label="OP. Gravada"
            value={`S/ ${baseImponible.toFixed(2)}`}
          />
          <PdfRow label="I.G.V. (10.5%)" value={`S/ ${igv.toFixed(2)}`} />
        </View>
        <View style={styles.totalRow}>
          <Text>TOTAL</Text>
          <Text>S/ {totalNum.toFixed(2)}</Text>
        </View>

        <Text style={styles.letras}>Son: {numeroALetras(totalNum)}</Text>

        <View style={styles.divider} />

        <View>
          <PdfRow label="Forma de Pago" value={alquiler.metodoPago} />
          <PdfRow label="Condición" value="CONTADO" />
          <PdfRow
            label="Habitación"
            value={`${alquiler.habitacion.numero} · PISO ${alquiler.habitacion.piso.numero}${
              alquiler.habitacion.descripcion
                ? ' · ' + alquiler.habitacion.descripcion.toUpperCase()
                : ''
            }`}
          />
        </View>

        <View style={styles.divider} />

        <Text style={[styles.footer, { fontFamily: 'Courier-Bold' }]}>
          ¡GRACIAS POR SU PREFERENCIA!
        </Text>
        <Text style={styles.footerSmall}>
          Representación impresa del comprobante electrónico
        </Text>
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
// numeroALetras (reutilizado)
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

// Helper para generar nombre de archivo
export function boletaFileName(alquiler: AlquilerPDF): string {
  const esFactura = alquiler.tipoComprobante === 'FACTURA';
  const serie = esFactura ? 'F001' : 'B001';
  const correlativo = String(alquiler.id).padStart(7, '0');
  return `${esFactura ? 'Factura' : 'Boleta'}_${serie}-${correlativo}.pdf`;
}
