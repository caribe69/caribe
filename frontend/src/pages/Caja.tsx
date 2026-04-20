import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, Play, StopCircle, FileText, Printer } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';

interface Turno {
  id: number;
  estado: string;
  abiertoEn: string;
  cerradoEn?: string | null;
  totalGeneral: string;
  totalEfectivo: string;
  totalVisa: string;
  totalMaster: string;
  totalYape: string;
  totalPlin: string;
  totalOtro: string;
  sede: { nombre: string };
}

export default function Caja() {
  const qc = useQueryClient();
  const [reporte, setReporte] = useState<any | null>(null);

  const turno = useQuery<Turno | null>({
    queryKey: ['caja', 'mi-turno'],
    queryFn: async () => (await api.get('/caja/mi-turno')).data,
  });

  const abrir = useMutation({
    mutationFn: async () => (await api.post('/caja/abrir', {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['caja'] }),
  });

  const cerrar = useMutation({
    mutationFn: async (id: number) =>
      (await api.patch(`/caja/${id}/cerrar`, {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['caja'] }),
  });

  const verReporte = async (id: number) => {
    const { data } = await api.get(`/caja/${id}/reporte`);
    setReporte(data);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 no-print">
        <Wallet className="text-brand-500" />
        <h1 className="text-2xl font-bold">Caja</h1>
      </div>

      <div className="bg-white rounded-xl border p-6 shadow-sm no-print">
        {turno.data ? (
          <div>
            <div className="text-sm text-slate-500">Turno abierto</div>
            <div className="text-xl font-semibold mt-1">
              Sede: {turno.data.sede.nombre}
            </div>
            <div className="text-xs text-slate-500">
              Desde: {new Date(turno.data.abiertoEn).toLocaleString()}
            </div>

            <div className="mt-4 flex gap-2 flex-wrap">
              <button
                onClick={() => verReporte(turno.data!.id)}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg text-sm"
              >
                <FileText size={16} /> Ver cierre (previsualización)
              </button>
              <button
                onClick={() => {
                  if (
                    confirm(
                      '¿Cerrar caja? Esto finaliza tu turno y registra los totales.',
                    )
                  )
                    cerrar.mutate(turno.data!.id);
                }}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                <StopCircle size={16} /> Cerrar caja
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-slate-500 mb-3">
              No tienes turno de caja abierto.
            </div>
            <button
              onClick={() => abrir.mutate()}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm"
            >
              <Play size={16} /> Abrir caja
            </button>
          </div>
        )}
      </div>

      {reporte && <CierrePrintable reporte={reporte} onClose={() => setReporte(null)} />}
    </div>
  );
}

function CierrePrintable({
  reporte,
  onClose,
}: {
  reporte: any;
  onClose: () => void;
}) {
  const { turno, desglose, porMetodo, alquileres, ventasDirectas, productosVendidos } =
    reporte;
  const fecha = new Date(turno.abiertoEn);
  const diaSemana = fecha.toLocaleDateString('es-PE', { weekday: 'long' });
  const fechaStr = fecha.toLocaleDateString('es-PE');

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 no-print">
        <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
            <h2 className="font-bold">Cierre de caja</h2>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 bg-brand-500 text-white px-3 py-1.5 rounded text-sm"
              >
                <Printer size={14} /> Imprimir
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
          <div className="p-4">
            <Recibo
              turno={turno}
              desglose={desglose}
              porMetodo={porMetodo}
              alquileres={alquileres}
              ventasDirectas={ventasDirectas}
              productosVendidos={productosVendidos}
              diaSemana={diaSemana}
              fechaStr={fechaStr}
            />
          </div>
        </div>
      </div>

      {/* Versión imprimible (solo visible al imprimir) */}
      <div className="hidden print-only">
        <Recibo
          turno={turno}
          desglose={desglose}
          porMetodo={porMetodo}
          alquileres={alquileres}
          ventasDirectas={ventasDirectas}
          productosVendidos={productosVendidos}
          diaSemana={diaSemana}
          fechaStr={fechaStr}
        />
      </div>
    </>
  );
}

function Recibo({
  turno,
  desglose,
  porMetodo,
  alquileres,
  ventasDirectas,
  productosVendidos,
  diaSemana,
  fechaStr,
}: any) {
  const metodosNoEfectivo = [
    ['VISA', porMetodo.VISA],
    ['MASTER', porMetodo.MASTERCARD],
    ['YAPE', porMetodo.YAPE],
    ['PLIN', porMetodo.PLIN],
    ['OTRO', porMetodo.OTRO],
  ].filter(([, v]) => Number(v) > 0);

  return (
    <div
      className="font-mono text-sm"
      style={{ maxWidth: '380px', margin: '0 auto' }}
    >
      <div className="text-center border-b-2 border-black pb-2 mb-2">
        <div className="font-bold uppercase">{turno.sede.nombre}</div>
        <div className="text-xs">Cierre de caja</div>
      </div>

      <div className="flex justify-between text-xs mb-2">
        <div>
          <div>DÍA: {diaSemana}</div>
          <div>FECHA: {fechaStr}</div>
        </div>
        <div className="text-right">
          <div>CAJERO: {turno.usuario.nombre}</div>
          <div>TURNO #{turno.id}</div>
        </div>
      </div>

      <div className="border-2 border-black p-2 mb-3">
        <table className="w-full">
          <tbody>
            <tr>
              <td className="font-bold">H (Habitaciones)</td>
              <td className="text-right">{Number(desglose.H).toFixed(2)}</td>
            </tr>
            <tr>
              <td className="font-bold">B (Bebidas/Productos)</td>
              <td className="text-right">{Number(desglose.B).toFixed(2)}</td>
            </tr>
            <tr>
              <td className="font-bold">O (Otros)</td>
              <td className="text-right">{Number(desglose.O).toFixed(2)}</td>
            </tr>
            <tr className="border-t-2 border-black">
              <td className="font-bold">G (Gran total)</td>
              <td className="text-right font-bold">
                {Number(desglose.G).toFixed(2)}
              </td>
            </tr>
            {metodosNoEfectivo.map(([m, v]) => (
              <tr key={m}>
                <td className="text-xs">− {m}</td>
                <td className="text-right text-xs">
                  {Number(v).toFixed(2)}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-black">
              <td className="font-bold">EFECTIVO</td>
              <td className="text-right font-bold">
                {Number(desglose.totalEfectivo).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="border-2 border-black p-2 mb-3">
        <div className="grid grid-cols-3 gap-2 text-xs text-center">
          <div>
            <div className="font-bold">ALQUILERES</div>
            <div className="text-2xl">{alquileres.cantidad}</div>
          </div>
          <div>
            <div className="font-bold">VENTAS</div>
            <div className="text-2xl">{ventasDirectas.cantidad}</div>
          </div>
          <div>
            <div className="font-bold">PRODS</div>
            <div className="text-2xl">
              {productosVendidos.reduce(
                (s: number, p: any) => s + p.cantidad,
                0,
              )}
            </div>
          </div>
        </div>
      </div>

      {Object.keys(alquileres.porTier).length > 0 && (
        <div className="mb-3 text-xs">
          <div className="font-bold mb-1">ALQUILERES POR PRECIO</div>
          <table className="w-full">
            <tbody>
              {Object.entries(alquileres.porTier).map(([price, count]) => (
                <tr key={price}>
                  <td>S/ {price}</td>
                  <td className="text-right">× {count as number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {productosVendidos.length > 0 && (
        <div className="text-xs">
          <div className="font-bold mb-1 border-t border-black pt-2">
            PRODUCTOS VENDIDOS
          </div>
          <table className="w-full">
            <tbody>
              {productosVendidos.map((p: any, i: number) => (
                <tr key={i}>
                  <td className="truncate">{p.nombre}</td>
                  <td className="text-right">× {p.cantidad}</td>
                  <td className="text-right w-16">
                    {p.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 pt-2 border-t-2 border-black text-xs text-center">
        <div>Generado: {new Date().toLocaleString()}</div>
      </div>
    </div>
  );
}
