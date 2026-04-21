import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Download, FileSpreadsheet, Search, Printer } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import BoletaAlquiler from '@/components/BoletaAlquiler';

interface AlquilerHist {
  id: number;
  creadoEn: string;
  clienteNombre: string;
  clienteDni: string;
  clienteTelefono?: string | null;
  fechaIngreso: string;
  fechaSalida: string;
  precioHabitacion: string;
  totalProductos: string;
  total: string;
  metodoPago: string;
  estado: string;
  motivoAnulacion?: string | null;
  habitacion: { numero: string; piso: { numero: number } };
  sede?: { nombre: string };
  consumos: Array<{
    cantidad: number;
    producto: { nombre: string };
  }>;
  creadoPor?: { nombre: string; username?: string };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function Historial() {
  const activeSedeId = useAuthStore((s) => s.activeSedeId);
  const [desde, setDesde] = useState(daysAgo(7));
  const [hasta, setHasta] = useState(today());
  const [descargando, setDescargando] = useState(false);
  const [boleta, setBoleta] = useState<AlquilerHist | null>(null);

  const query = useQuery<AlquilerHist[]>({
    queryKey: ['alquileres', 'historial', desde, hasta, activeSedeId],
    queryFn: async () => {
      const params: Record<string, string | number> = { desde, hasta };
      if (activeSedeId) params.sedeId = activeSedeId;
      return (await api.get<AlquilerHist[]>('/alquileres/historial', { params }))
        .data;
    },
  });

  const pag = usePagination(query.data, 15);

  const stats = {
    count: query.data?.length ?? 0,
    total:
      query.data
        ?.filter((a) => a.estado !== 'ANULADO')
        .reduce((s, a) => s + Number(a.total), 0) ?? 0,
    anuladas: query.data?.filter((a) => a.estado === 'ANULADO').length ?? 0,
  };

  const descargarExcel = async () => {
    setDescargando(true);
    try {
      const params: any = { desde, hasta };
      if (activeSedeId) params.sedeId = activeSedeId;
      const resp = await api.get('/alquileres/historial/excel', {
        params,
        responseType: 'blob',
      });
      const blob = new Blob([resp.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alquileres_${desde}_a_${hasta}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDescargando(false);
    }
  };

  const preset = (days: number) => {
    setHasta(today());
    setDesde(daysAgo(days));
  };

  return (
    <div>
      {/* Toolbar con rango */}
      <div className="bg-white rounded-3xl p-5 shadow-sm mb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Desde
              </label>
              <div className="relative mt-1">
                <Calendar
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-500 pointer-events-none"
                />
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Hasta
              </label>
              <div className="relative mt-1">
                <Calendar
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-500 pointer-events-none"
                />
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>
            </div>

            {/* Presets rápidos */}
            <div className="flex gap-1.5">
              {[
                { l: 'Hoy', d: 0 },
                { l: '7 días', d: 7 },
                { l: '30 días', d: 30 },
                { l: '90 días', d: 90 },
              ].map((p) => (
                <button
                  key={p.l}
                  onClick={() => preset(p.d)}
                  className="px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-violet-100 hover:text-violet-700 text-slate-600 rounded-lg btn-press transition"
                >
                  {p.l}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={descargarExcel}
            disabled={descargando || !query.data?.length}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed btn-press transition"
          >
            <FileSpreadsheet size={15} />
            {descargando ? 'Generando...' : 'Exportar a Excel'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <StatCard label="Alquileres" value={stats.count} color="bg-violet-500" />
        <StatCard
          label="Ingresos"
          value={`S/ ${stats.total.toFixed(2)}`}
          color="bg-emerald-500"
        />
        <StatCard
          label="Anulados"
          value={stats.anuladas}
          color="bg-rose-500"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <Th>#</Th>
              <Th>Fecha</Th>
              <Th>Hora</Th>
              <Th>Hab.</Th>
              <Th>Cliente</Th>
              <Th>DNI</Th>
              <Th>Usuario</Th>
              <Th className="text-right">Total</Th>
              <Th>Método</Th>
              <Th>Estado</Th>
              <Th>{''}</Th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading && (
              <tr>
                <td colSpan={11} className="px-6 py-12 text-center text-slate-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!query.isLoading &&
              pag.paginated.map((a) => {
                const fecha = new Date(a.creadoEn);
                return (
                  <tr
                    key={a.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-violet-50/30 transition"
                  >
                    <Td>
                      <span className="font-mono text-xs text-slate-400">
                        #{String(a.id).padStart(4, '0')}
                      </span>
                    </Td>
                    <Td className="text-xs text-slate-600">
                      {fecha.toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </Td>
                    <Td className="text-xs text-slate-500 font-mono">
                      {fecha.toLocaleTimeString('es-PE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Td>
                    <Td>
                      <div className="font-semibold text-slate-800">
                        {a.habitacion.numero}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Piso {a.habitacion.piso.numero}
                      </div>
                    </Td>
                    <Td>
                      <div className="font-medium text-slate-700">
                        {a.clienteNombre}
                      </div>
                      {a.consumos.length > 0 && (
                        <div className="text-[10px] text-slate-400">
                          {a.consumos.length} producto
                          {a.consumos.length === 1 ? '' : 's'}
                        </div>
                      )}
                    </Td>
                    <Td className="text-xs text-slate-600 font-mono">
                      {a.clienteDni}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {a.creadoPor?.nombre?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="text-xs text-slate-700 truncate max-w-[110px]">
                          {a.creadoPor?.nombre || '—'}
                        </span>
                      </div>
                    </Td>
                    <Td className="text-right font-semibold tabular-nums">
                      S/ {Number(a.total).toFixed(2)}
                    </Td>
                    <Td>
                      <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-600">
                        {a.metodoPago}
                      </span>
                    </Td>
                    <Td>
                      <EstadoBadge estado={a.estado} />
                    </Td>
                    <Td className="text-right">
                      {a.estado !== 'ANULADO' && (
                        <button
                          onClick={() => setBoleta(a)}
                          className="inline-flex items-center gap-1 text-xs bg-violet-100 hover:bg-violet-200 text-violet-700 px-2.5 py-1.5 rounded-lg font-medium btn-press"
                          title="Ver e imprimir boleta"
                        >
                          <Printer size={12} />
                          Boleta
                        </button>
                      )}
                    </Td>
                  </tr>
                );
              })}
            {!query.isLoading && query.data?.length === 0 && (
              <tr>
                <td colSpan={11} className="px-6 py-16 text-center text-slate-400">
                  <Search size={40} className="mx-auto text-slate-300 mb-2" />
                  Sin alquileres en este rango
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <Pagination
          page={pag.page}
          totalPages={pag.totalPages}
          totalItems={pag.totalItems}
          from={pag.from}
          to={pag.to}
          size={pag.size}
          setPage={pag.setPage}
          setSize={pag.setSize}
        />
      </div>

      {boleta && (
        <BoletaAlquiler
          alquiler={boleta as any}
          onClose={() => setBoleta(null)}
        />
      )}
    </div>
  );
}

function Th({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
      <div className={`w-3 h-10 rounded-full ${color}`} />
      <div>
        <div className="text-[11px] text-slate-500 uppercase tracking-widest">
          {label}
        </div>
        <div className="text-2xl font-bold text-slate-800 tabular-nums">
          {value}
        </div>
      </div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    ACTIVO: 'bg-emerald-100 text-emerald-700',
    FINALIZADO: 'bg-slate-100 text-slate-700',
    ANULADO: 'bg-rose-100 text-rose-700',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold ${
        map[estado] || map.FINALIZADO
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {estado}
    </span>
  );
}
