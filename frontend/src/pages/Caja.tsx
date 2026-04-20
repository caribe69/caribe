import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, Play, StopCircle, FileText } from 'lucide-react';
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
      <div className="flex items-center gap-2 mb-6">
        <Wallet className="text-brand-500" />
        <h1 className="text-2xl font-bold">Caja</h1>
      </div>

      <div className="bg-white rounded-xl border p-6 shadow-sm">
        {turno.data ? (
          <div>
            <div className="text-sm text-slate-500">Turno abierto</div>
            <div className="text-xl font-semibold mt-1">
              Sede: {turno.data.sede.nombre}
            </div>
            <div className="text-xs text-slate-500">
              Desde: {new Date(turno.data.abiertoEn).toLocaleString()}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  if (confirm('¿Cerrar caja?'))
                    cerrar.mutate(turno.data!.id);
                }}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                <StopCircle size={16} /> Cerrar caja
              </button>
              <button
                onClick={() => verReporte(turno.data!.id)}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg text-sm"
              >
                <FileText size={16} /> Ver reporte del turno
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

      {reporte && (
        <div className="mt-6 bg-white rounded-xl border p-6 shadow-sm">
          <h2 className="font-semibold mb-4">
            Reporte Turno #{reporte.turno.id}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              ['Efectivo', reporte.turno.totalEfectivo],
              ['Visa', reporte.turno.totalVisa],
              ['Mastercard', reporte.turno.totalMaster],
              ['Yape', reporte.turno.totalYape],
              ['Plin', reporte.turno.totalPlin],
              ['Otro', reporte.turno.totalOtro],
            ].map(([label, val]) => (
              <div
                key={label as string}
                className="bg-slate-50 rounded-lg p-3"
              >
                <div className="text-xs text-slate-500">{label}</div>
                <div className="font-semibold">S/ {val}</div>
              </div>
            ))}
          </div>
          <div className="text-lg font-bold">
            Total: S/ {reporte.turno.totalGeneral}
          </div>

          {reporte.productosVendidos?.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Productos vendidos</h3>
              <table className="w-full text-sm">
                <tbody>
                  {reporte.productosVendidos.map((p: any, i: number) => (
                    <tr key={i} className="border-t">
                      <td className="py-1.5">{p.nombre}</td>
                      <td className="py-1.5">×{p.cantidad}</td>
                      <td className="py-1.5 text-right">S/ {p.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
