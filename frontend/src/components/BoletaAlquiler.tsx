import { useQuery } from '@tanstack/react-query';
import { Printer, X } from 'lucide-react';
import { api } from '@/lib/api';

interface Consumo {
  id?: number;
  cantidad: number;
  precioUnit: string | number;
  subtotal: string | number;
  producto: { nombre: string };
}

interface Alquiler {
  id: number;
  creadoEn: string;
  clienteNombre: string;
  clienteDni: string;
  precioHabitacion: string | number;
  totalProductos?: string | number;
  total: string | number;
  metodoPago: string;
  fechaIngreso?: string;
  fechaSalida?: string;
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

export default function BoletaAlquiler({
  alquiler,
  onClose,
}: {
  alquiler: Alquiler;
  onClose: () => void;
}) {
  const { data: empresa } = useQuery<EmpresaConfig>({
    queryKey: ['config'],
    queryFn: async () => (await api.get('/settings')).data,
  });

  return (
    <>
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] no-print animate-fade-in">
        <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto scroll-premium animate-scale-in shadow-2xl">
          <div className="flex justify-between items-center p-3 border-b border-slate-100 sticky top-0 bg-white z-10">
            <h2 className="font-semibold text-slate-900 text-sm">
              Boleta · #{String(alquiler.id).padStart(7, '0')}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white px-3 py-1.5 rounded-lg text-xs btn-press"
              >
                <Printer size={13} /> Imprimir
              </button>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center btn-press"
              >
                <X size={16} className="text-slate-500" />
              </button>
            </div>
          </div>
          <div className="p-4 bg-slate-50">
            <div className="bg-white mx-auto shadow-sm border border-slate-200">
              <BoletaContenido alquiler={alquiler} empresa={empresa} />
            </div>
          </div>
        </div>
      </div>

      <div className="hidden print-only">
        <BoletaContenido alquiler={alquiler} empresa={empresa} />
      </div>
    </>
  );
}

/**
 * Recibo formato ticket térmico (~80mm). Pensado para impresoras POS,
 * pero también se ve bien al imprimir en A4 si no hay térmica.
 */
function BoletaContenido({
  alquiler,
  empresa,
}: {
  alquiler: Alquiler;
  empresa?: EmpresaConfig;
}) {
  const fecha = new Date(alquiler.creadoEn);
  const fechaStr = fecha.toLocaleDateString('es-PE');
  const horaStr = fecha.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalNum = Number(alquiler.total);
  // IGV reducido para hospedaje = 10.5% (ley de turismo PE)
  const IGV_RATE = 0.105;
  const baseImponible = totalNum / (1 + IGV_RATE);
  const igv = totalNum - baseImponible;

  const nochesPrecio = Number(alquiler.precioHabitacion);
  const items: Array<{ cant: number; desc: string; importe: number }> = [];
  items.push({
    cant: 1,
    desc: `ALOJAMIENTO ${(alquiler.habitacion.descripcion || 'HABITACION').toUpperCase()} X 1 DIA`,
    importe: nochesPrecio,
  });
  for (const c of alquiler.consumos || []) {
    items.push({
      cant: c.cantidad,
      desc: c.producto.nombre,
      importe: Number(c.subtotal),
    });
  }

  // Correlativo simple basado en ID (no es SUNAT real, es visual)
  const serie = 'B001';
  const correlativo = String(alquiler.id).padStart(7, '0');

  return (
    <div
      className="font-mono text-[11px] leading-snug text-slate-900 px-3 py-3"
      style={{ width: '300px', maxWidth: '100%' }}
    >
      {/* Encabezado empresa */}
      <div className="text-center mb-2">
        <div className="font-bold text-[13px] uppercase leading-tight">
          {empresa?.empresaNombre || 'Caribe Hotel'}
        </div>
        {empresa?.empresaRuc && (
          <div className="mt-0.5">RUC: {empresa.empresaRuc}</div>
        )}
        {empresa?.empresaDireccion && (
          <div className="text-[10px] leading-tight mt-0.5">
            {empresa.empresaDireccion}
          </div>
        )}
        {empresa?.empresaTelefono && (
          <div className="text-[10px]">Tel: {empresa.empresaTelefono}</div>
        )}
      </div>

      <Divider />

      <div className="text-center mb-1">
        <div className="font-bold text-[12px]">BOLETA DE VENTA</div>
        <div>
          {serie}-{correlativo}
        </div>
      </div>

      <Divider />

      {/* Info cliente */}
      <div className="space-y-0.5 mb-1">
        <Row label="Fecha" value={`${fechaStr}  ${horaStr}`} />
        <Row label="Atendido" value={alquiler.creadoPor?.nombre || '—'} />
        <Row
          label="Cliente"
          value={alquiler.clienteNombre || 'CONSUMIDOR FINAL'}
        />
        <Row label="DNI" value={alquiler.clienteDni || '00000000'} />
        {alquiler.sede?.nombre && (
          <Row label="Sede" value={alquiler.sede.nombre} />
        )}
      </div>

      <Divider />

      {/* Tabla items */}
      <div className="flex text-[10px] font-bold mb-1">
        <div className="w-8">CANT.</div>
        <div className="flex-1">DESCRIPCION</div>
        <div className="w-16 text-right">IMPORTE</div>
      </div>
      <Divider />
      {items.map((it, i) => (
        <div key={i} className="flex mb-0.5">
          <div className="w-8">{it.cant}</div>
          <div className="flex-1 uppercase leading-tight pr-1">{it.desc}</div>
          <div className="w-16 text-right tabular-nums">
            {it.importe.toFixed(2)}
          </div>
        </div>
      ))}

      <Divider />

      {/* Totales */}
      <div className="space-y-0.5">
        <Row
          label="OP. Gravada"
          value={`S/ ${baseImponible.toFixed(2)}`}
          mono
        />
        <Row label="I.G.V. (10.5%)" value={`S/ ${igv.toFixed(2)}`} mono />
        <div className="flex justify-between font-bold text-[13px] mt-1">
          <span>TOTAL</span>
          <span className="tabular-nums">S/ {totalNum.toFixed(2)}</span>
        </div>
      </div>

      <Divider />
      <div className="text-[10px] uppercase">
        Son: {numeroALetras(totalNum)}
      </div>

      <Divider />

      <div className="space-y-0.5">
        <Row label="Forma de Pago" value={alquiler.metodoPago} />
        <Row label="Condición" value="CONTADO" />
        <Row
          label="Habitación"
          value={`${alquiler.habitacion.numero} · PISO ${alquiler.habitacion.piso.numero}${
            alquiler.habitacion.descripcion
              ? ' · ' + alquiler.habitacion.descripcion.toUpperCase()
              : ''
          }`}
        />
      </div>

      <Divider />

      <div className="text-center text-[10px] mt-2">
        ¡GRACIAS POR SU PREFERENCIA!
      </div>
      <div className="text-center text-[9px] text-slate-500 mt-1">
        Representación impresa del comprobante
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500 shrink-0">{label}:</span>
      <span className={`text-right truncate ${mono ? 'tabular-nums' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return (
    <div
      className="my-1 border-t border-dashed border-slate-400"
      style={{ height: 0 }}
    />
  );
}

// ---- numeroALetras simplificado (soles, centavos) ----

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
  const milesStr =
    miles === 1 ? 'MIL' : centenasAletras(miles) + ' MIL';
  return milesStr + (resto ? ' ' + centenasAletras(resto) : '');
}

function numeroALetras(monto: number): string {
  const entero = Math.floor(monto);
  const centavos = Math.round((monto - entero) * 100);
  const enteroStr = entero === 0 ? 'CERO' : milesAletras(entero);
  const centavosStr = String(centavos).padStart(2, '0');
  return `${enteroStr} CON ${centavosStr}/100 SOLES`;
}
