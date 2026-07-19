import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  StopCircle,
  History,
  ChevronRight,
  BarChart3,
  FileText,
  X,
  Printer,
  Download,
  Eye,
  BedDouble,
  ShoppingCart,
  CreditCard,
  User,
  Package,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useDialog } from '@/components/ConfirmProvider';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  TurnoPDFDoc,
  turnoPdfFileName,
  type TurnoReporte,
  type EmpresaConfig,
} from '@/components/TurnoPDF';

interface Turno {
  id: number;
  estado: string;
  abiertoEn: string;
  cerradoEn?: string | null;
  totalGeneral: string;
  sede: { id: number; nombre: string };
  usuario?: { id: number; nombre: string; username: string };
}

export default function Caja() {
  const qc = useQueryClient();
  const dialog = useDialog();
  const navigate = useNavigate();
  const usuario = useAuthStore((s) => s.usuario);
  const [reporte, setReporte] = useState<any | null>(null);
  const [loadingReporte, setLoadingReporte] = useState(false);

  const esAdmin =
    usuario?.rol === 'SUPERADMIN' || usuario?.rol === 'ADMIN_SEDE';

  const turno = useQuery<Turno | null>({
    queryKey: ['caja', 'mi-turno'],
    queryFn: async () => (await api.get('/caja/mi-turno')).data,
  });

  const turnos = useQuery<Turno[]>({
    queryKey: ['caja', 'turnos'],
    queryFn: async () => (await api.get('/caja/turnos')).data,
  });

  const pag = usePagination(turnos.data, 15);

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
    setLoadingReporte(true);
    try {
      const { data } = await api.get(`/caja/${id}/reporte`);
      setReporte(data);
    } finally {
      setLoadingReporte(false);
    }
  };

  return (
    <div className="space-y-4 no-print">
      {/* Banda simple: abrir/cerrar caja */}
      {turno.data ? (
        <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center shrink-0">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest font-bold text-emerald-700 dark:text-emerald-300">
              Caja abierta · #{String(turno.data.id).padStart(3, '0')}
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {turno.data.sede.nombre}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Desde {new Date(turno.data.abiertoEn).toLocaleString('es-PE')}
            </div>
          </div>
          <button
            onClick={() => navigate('/caja-estadisticas')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-lg transition"
          >
            <BarChart3 size={13} /> Ver estadísticas
          </button>
          <button
            onClick={async () => {
              const ok = await dialog.confirm({
                title: 'Cerrar caja',
                message:
                  'Al cerrar el turno se registran los totales finales y no podrás registrar más operaciones hasta abrir uno nuevo.',
                confirmText: 'Cerrar turno',
                variant: 'warning',
                confirmDelaySec: 3,
              });
              if (ok) cerrar.mutate(turno.data!.id);
            }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-rose-500/30 btn-press transition"
          >
            <StopCircle size={14} /> Cerrar turno
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 mb-1">
              Sin turno activo
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100">
              Abre caja para comenzar
            </div>
            <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
              Mientras no haya turno abierto no se pueden registrar ventas ni
              alquileres.
            </div>
          </div>
          <button
            onClick={() => abrir.mutate()}
            disabled={abrir.isPending}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-md shadow-emerald-500/30 btn-press transition disabled:opacity-50"
          >
            <Play size={14} /> {abrir.isPending ? 'Abriendo...' : 'Abrir caja'}
          </button>
        </div>
      )}

      {/* Tabla de turnos */}
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <History size={18} className="text-violet-600 dark:text-violet-400" />
            <h3 className="font-hotel text-lg font-bold text-slate-900 dark:text-slate-100">
              {esAdmin ? 'Historial de cajas · sede' : 'Mis cajas anteriores'}
            </h3>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {turnos.data?.length ?? 0} turnos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>#</Th>
                {esAdmin && <Th>Cajero</Th>}
                <Th>Abierto</Th>
                <Th>Cerrado</Th>
                <Th>Estado</Th>
                <Th align="right">Total</Th>
                <Th align="right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {turnos.isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50 dark:border-slate-800/60">
                    {Array.from({ length: esAdmin ? 7 : 6 }).map((__, j) => (
                      <td key={j} className="px-5 py-3">
                        <Skeleton className="h-4" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!turnos.isLoading && turnos.data?.length === 0 && (
                <tr>
                  <td
                    colSpan={esAdmin ? 7 : 6}
                    className="px-6 py-16 text-center text-slate-400 dark:text-slate-500"
                  >
                    <History
                      size={40}
                      className="mx-auto text-slate-300 dark:text-slate-600 mb-2"
                    />
                    Sin turnos aún
                  </td>
                </tr>
              )}

              {!turnos.isLoading &&
                pag.paginated.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => verReporte(t.id)}
                    className="border-b border-slate-50 dark:border-slate-800/60 last:border-0 hover:bg-violet-50/30 dark:hover:bg-violet-900/20 transition cursor-pointer"
                  >
                    <Td>
                      <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                        #{String(t.id).padStart(3, '0')}
                      </span>
                    </Td>
                    {esAdmin && (
                      <Td>
                        {t.usuario && (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white font-bold text-[11px] flex items-center justify-center">
                              {t.usuario.nombre?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                                {t.usuario.nombre}
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                @{t.usuario.username}
                              </div>
                            </div>
                          </div>
                        )}
                      </Td>
                    )}
                    <Td className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                      {new Date(t.abiertoEn).toLocaleString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Td>
                    <Td className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                      {t.cerradoEn
                        ? new Date(t.cerradoEn).toLocaleString('es-PE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </Td>
                    <Td>
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold ${
                          t.estado === 'ABIERTO'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {t.estado}
                      </span>
                    </Td>
                    <Td className="text-right font-bold tabular-nums text-slate-900 dark:text-slate-100">
                      S/ {Number(t.totalGeneral).toFixed(2)}
                    </Td>
                    <Td className="text-right">
                      <span className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 font-semibold">
                        Ver detalle <ChevronRight size={12} />
                      </span>
                    </Td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {turnos.data && turnos.data.length > 0 && (
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
        )}
      </div>

      {loadingReporte && !reporte && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl">
            <div className="text-slate-600 dark:text-slate-300 text-sm">
              Cargando detalle...
            </div>
          </div>
        </div>
      )}
      {reporte && (
        <ModalDetalle reporte={reporte} onClose={() => setReporte(null)} />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// Helpers y modal detalle (reutilizados desde la versión anterior)
// ═════════════════════════════════════════════════════════

function Th({
  children,
  align = 'left',
  className = '',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  return (
    <th
      className={`px-5 py-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-${align} ${className}`}
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
  return <td className={`px-5 py-3 ${className}`}>{children}</td>;
}

function ModalDetalle({
  reporte,
  onClose,
}: {
  reporte: any;
  onClose: () => void;
}) {
  const {
    turno,
    desglose,
    porMetodo,
    alquileres,
    ventasDirectas,
    productosVendidos,
    pagos,
  } = reporte;
  const [tab, setTab] = useState<'resumen' | 'habitaciones' | 'productos' | 'pagos'>('resumen');
  const [previewPdf, setPreviewPdf] = useState(false);
  const [boleta2, setBoleta2] = useState(false);

  const fecha = new Date(turno.abiertoEn);

  // Datos de empresa para el PDF (mismo endpoint que usa la boleta)
  const { data: empresa } = useQuery<EmpresaConfig>({
    queryKey: ['config'],
    queryFn: async () => (await api.get('/settings')).data,
  });

  // URL absoluta del logo (necesaria para @react-pdf/renderer)
  const logoUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/logo.png`
      : undefined;

  const pdfDoc = (
    <TurnoPDFDoc
      reporte={reporte as TurnoReporte}
      empresa={empresa}
      logoUrl={logoUrl}
    />
  );

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print animate-fade-in">
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden animate-scale-in shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-violet-600 to-violet-500 text-white">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] opacity-90 font-semibold">
              Detalle de turno
            </div>
            <h2 className="font-hotel text-xl font-bold">
              #{String(turno.id).padStart(3, '0')} ·{' '}
              {fecha.toLocaleDateString('es-PE', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </h2>
            <div className="text-[11px] opacity-90 mt-0.5">
              {turno.usuario?.nombre} · {turno.sede?.nombre} · {turno.estado}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBoleta2(true)}
              className="inline-flex items-center gap-1.5 bg-amber-400/90 hover:bg-amber-400 text-slate-900 font-semibold px-3 py-2 rounded-lg text-sm btn-press"
              title="Reporte por turno estilo hojita (solo lectura)"
            >
              🧾 Versión 2
            </button>
            <button
              onClick={() => setPreviewPdf(true)}
              className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur text-white px-3 py-2 rounded-lg text-sm btn-press"
              title="Ver PDF antes de descargar"
            >
              <Eye size={14} /> Previsualizar
            </button>
            <PDFDownloadLink
              document={pdfDoc}
              fileName={turnoPdfFileName(reporte as TurnoReporte)}
              className="inline-flex items-center gap-1.5 bg-emerald-500/90 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-sm btn-press no-underline"
            >
              {({ loading }) => (
                <>
                  <Download size={14} />
                  {loading ? 'Generando…' : 'Descargar PDF'}
                </>
              )}
            </PDFDownloadLink>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur text-white px-3 py-2 rounded-lg text-sm btn-press"
            >
              <Printer size={14} /> Imprimir
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg hover:bg-white/20 flex items-center justify-center btn-press"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex gap-1 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          {[
            { id: 'resumen', label: 'Resumen', icon: BarChart3 },
            {
              id: 'habitaciones',
              label: `Habitaciones (${alquileres?.cantidad ?? 0})`,
              icon: BedDouble,
            },
            {
              id: 'productos',
              label: `Ventas directas (${ventasDirectas?.cantidad ?? 0})`,
              icon: ShoppingCart,
            },
            {
              id: 'pagos',
              label: `Pagos (${(pagos?.length ?? 0) + (ventasDirectas?.cantidad ?? 0)})`,
              icon: CreditCard,
            },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition border-b-2 -mb-px ${
                  active
                    ? 'border-violet-600 text-violet-700 dark:text-violet-300'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={13} /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto scroll-premium">
          {tab === 'resumen' && (
            <TabResumen
              desglose={desglose}
              porMetodo={porMetodo}
              productosVendidos={productosVendidos}
              alquileresCount={alquileres?.cantidad ?? 0}
              ventasCount={ventasDirectas?.cantidad ?? 0}
              ventasTotal={ventasDirectas?.total ?? 0}
              turno={turno}
            />
          )}
          {tab === 'habitaciones' && (
            <TabHabitaciones lista={alquileres?.lista || []} />
          )}
          {tab === 'productos' && (
            <TabProductos
              ventas={ventasDirectas?.lista || []}
              productosVendidos={productosVendidos || []}
            />
          )}
          {tab === 'pagos' && (
            <TabPagos
              pagos={pagos || []}
              ventas={ventasDirectas?.lista || []}
              porMetodo={porMetodo}
            />
          )}
        </div>
      </div>

      {/* Sub-modal: Previsualizar PDF antes de descargar */}
      {previewPdf && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in"
          onClick={() => setPreviewPdf(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-5xl h-[92vh] overflow-hidden shadow-2xl flex flex-col animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-slate-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Vista previa · Turno #{String(turno.id).padStart(3, '0')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <PDFDownloadLink
                  document={pdfDoc}
                  fileName={turnoPdfFileName(reporte as TurnoReporte)}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs btn-press no-underline"
                >
                  {({ loading }) => (
                    <>
                      <Download size={12} />
                      {loading ? 'Generando…' : 'Descargar PDF'}
                    </>
                  )}
                </PDFDownloadLink>
                <button
                  onClick={() => setPreviewPdf(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center"
                >
                  <X size={16} className="text-slate-500" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-200 dark:bg-slate-950">
              <PDFViewer
                style={{ width: '100%', height: '100%', border: 'none' }}
                showToolbar={false}
              >
                {pdfDoc}
              </PDFViewer>
            </div>
          </div>
        </div>
      )}

      {boleta2 && <Boleta2Modal turnoId={turno.id} onClose={() => setBoleta2(false)} />}
    </div>
  );
}

// ── Reporte "Boleta 2": hojita de cierre por turno (solo lectura) ──
// El MISMO HTML se usa para previsualizar (dentro del modal) y para imprimir
// (ventana nueva), así se ven idénticos y calcados a la hojita de papel.
const B2_STYLES = `
*{box-sizing:border-box;margin:0;font-family:'Courier New',monospace}
.b2{width:340px;margin:0 auto;border:2px solid #000;color:#000;font-size:12px}
.b2 .row{display:flex;border-bottom:2px solid #000}
.b2 .row:last-child{border-bottom:none}
.b2 .cL{flex:1;padding:5px;border-right:2px solid #000}
.b2 .cM{padding:5px;border-right:2px solid #000;font-weight:bold;align-self:center}
.b2 .cR{flex:1.5;padding:5px;font-size:11px;line-height:1.4}
.b2 .noche{background:#fbbf24;padding:0 4px;font-size:10px;font-weight:bold}
.b2 .dia{font-weight:bold;font-size:14px;display:block;margin-top:2px}
.b2 .mL{flex:1;padding:6px;border-right:2px solid #000}
.b2 .mR{flex:1;padding:6px}
.b2 .mrow{display:flex;justify-content:space-between;gap:6px}
.b2 .mrow.big{font-weight:bold;font-size:15px}
.b2 .ln{border-top:1px solid #000;margin:3px 0}
.b2 .visa{font-weight:bold;font-size:15px}
.b2 .dig{font-size:10px;color:#444;margin-top:8px;line-height:1.7}
.b2 .ing{align-items:stretch;font-weight:bold}
.b2 .ing .ib{padding:5px;background:#eee;border-right:1px solid #000;font-size:10px;align-self:center}
.b2 .ing .iv{padding:5px;border-right:2px solid #000;min-width:28px;text-align:center;align-self:center}
.b2 .ing .iv.tot{font-size:15px;background:#fff7cc}
.b2 .ing .last{border-right:none;flex:1}
.b2 .pcol{flex:1;padding:5px}
.b2 .pL{border-right:2px solid #000}
.b2 .ptitle{font-weight:bold;font-size:10px;text-transform:uppercase;color:#666;margin-bottom:3px}
.b2 .pr{display:grid;grid-template-columns:38px 24px 1fr;gap:3px;align-items:center;border-bottom:1px dotted #aaa;padding:2px 0;min-height:18px}
.b2 .pr.z{color:#bbb}
.b2 .pc{font-weight:bold}
.b2 .pq{text-align:center}
.b2 .pv{text-align:right}
.b2 .psum{display:flex;justify-content:space-between;font-weight:bold;border-top:2px solid #000;margin-top:4px;padding-top:3px}
`;

function buildBoleta2Html(d: any): string {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const money = (n: number) => Number(n || 0).toFixed(2);
  const esc = (s: string) =>
    String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
  const fdate = new Date(d.turno.abiertoEn);

  // Renglones de una columna de productos (códigos fijos + extras del turno)
  const colProductos = (col: any) => {
    const fijos = col.filas
      .map((f: any) => {
        const z = f.cantidad === 0;
        return `<div class="pr${z ? ' z' : ''}"><span class="pc">${esc(f.codigo)}</span><span class="pq">${z ? '' : f.cantidad}</span><span class="pv">${z ? '' : money(f.total)}</span></div>`;
      })
      .join('');
    const extras = (col.extras || [])
      .map((e: any) => `<div class="pr"><span class="pc" title="${esc(e.nombre)}">${esc(e.nombre).slice(0, 5).toUpperCase()}</span><span class="pq">${e.cantidad}</span><span class="pv">${money(e.total)}</span></div>`)
      .join('');
    return fijos + extras;
  };

  const roomsLimpiadas = (d.limpieza || []).reduce((s: number, l: any) => s + l.habitaciones, 0);
  const limpiadores = (d.limpieza || []).map((l: any) => esc(l.nombre)).join(', ') || '—';

  return (
    `<div class="b2">` +
    // Cabecera
    `<div class="row">` +
    `<div class="cL"><span class="noche">NOCHE</span><span class="dia">${dias[fdate.getDay()]}</span></div>` +
    `<div class="cM">SOL</div>` +
    `<div class="cR"><b>FECHA</b> ${fdate.toLocaleDateString('es-PE')}<br><b>${esc(d.turno.usuario?.username || d.turno.usuario?.nombre || '')}</b><br><span style="color:#888">${esc(d.turno.sede?.nombre || '')}</span></div>` +
    `</div>` +
    // Dinero
    `<div class="row">` +
    `<div class="mL">` +
    `<div class="mrow"><span>H</span><span>${money(d.desglose.H)}</span></div>` +
    `<div class="mrow"><span>B</span><span>${money(d.desglose.B)}</span></div>` +
    `<div class="mrow"><span>O</span><span>${money(d.desglose.O)}</span></div>` +
    `<div class="ln"></div>` +
    `<div class="mrow"><span>G</span><span>${money(d.desglose.G)}</span></div>` +
    `<div class="mrow"><span></span><span>− ${money(d.desglose.digital)}</span></div>` +
    `<div class="ln"></div>` +
    `<div class="mrow big"><span></span><span>${money(d.desglose.efectivo)}</span></div>` +
    `</div>` +
    `<div class="mR"><div class="visa">Visa ⇒ ${money(d.desglose.digital)}</div>` +
    `<div class="dig">Visa ${money(d.porMetodo.VISA)} · Master ${money(d.porMetodo.MASTERCARD)}<br>Yape ${money(d.porMetodo.YAPE)} · Plin ${money(d.porMetodo.PLIN)}<br>Otro ${money(d.porMetodo.OTRO)}</div></div>` +
    `</div>` +
    // Ingresos + limpieza
    `<div class="row ing">` +
    `<span class="ib">P1</span><span class="iv">${d.ingresos.aPie}</span>` +
    `<span class="ib">P2</span><span class="iv">${d.ingresos.enVehiculo}</span>` +
    `<span class="iv tot">${d.ingresos.total}</span>` +
    `<span class="ib">LIMPIEZA N°</span><span class="iv last" style="text-align:left;padding-left:6px">${roomsLimpiadas} · ${limpiadores}</span>` +
    `</div>` +
    // Productos
    `<div class="row">` +
    `<div class="pcol pL"><div class="ptitle">Bebidas</div>${colProductos(d.plantilla.bebidas)}<div class="psum"><span>Σ B</span><span>${money(d.desglose.B)}</span></div></div>` +
    `<div class="pcol"><div class="ptitle">Otros</div>${colProductos(d.plantilla.otros)}<div class="psum"><span>Σ O</span><span>${money(d.desglose.O)}</span></div></div>` +
    `</div>` +
    `</div>`
  );
}

function Boleta2Modal({ turnoId, onClose }: { turnoId: number; onClose: () => void }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['caja', 'boleta2', turnoId],
    queryFn: async () => (await api.get(`/caja/${turnoId}/reporte-boleta2`)).data,
  });

  const html = data ? buildBoleta2Html(data) : '';

  const imprimir = () => {
    if (!html) return;
    const w = window.open('', '_blank', 'width=440,height=820');
    if (!w) return;
    w.document.write(
      `<html><head><title>Reporte turno #${turnoId}</title><meta charset="utf-8">` +
        `<style>${B2_STYLES} body{padding:10px}</style></head><body>${html}</body></html>`,
    );
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] overflow-hidden shadow-2xl flex flex-col animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-amber-400">
          <span className="text-sm font-bold text-slate-900">🧾 Reporte por turno · Versión 2</span>
          <div className="flex items-center gap-2">
            <button onClick={imprimir} disabled={!data} className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs btn-press disabled:opacity-40"><Printer size={12} /> Imprimir</button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-black/10 flex items-center justify-center"><X size={16} className="text-slate-700" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
          <style>{B2_STYLES}</style>
          {isLoading || !data ? (
            <div className="py-16 text-center text-slate-400 text-sm">Cargando…</div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </div>
      </div>
    </div>
  );
}

function TabResumen({
  desglose,
  porMetodo,
  productosVendidos,
  alquileresCount,
  ventasCount,
  ventasTotal,
  turno,
}: any) {
  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <TileBig label="Total general" value={`S/ ${(desglose?.G ?? 0).toFixed(2)}`} color="violet" />
        <TileBig label="Habitaciones" value={`S/ ${(desglose?.H ?? 0).toFixed(2)}`} color="emerald" />
        <TileBig label="Productos" value={`S/ ${(desglose?.B ?? 0).toFixed(2)}`} color="amber" />
        <TileBig label="Efectivo" value={`S/ ${(desglose?.totalEfectivo ?? 0).toFixed(2)}`} color="blue" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Section title="Composición del ingreso">
          <Row k="Alquileres de habitaciones" v={`${alquileresCount} · S/ ${(desglose?.H ?? 0).toFixed(2)}`} />
          <Row k="Ventas directas" v={`${ventasCount} · S/ ${ventasTotal.toFixed(2)}`} />
          <Row k="Consumos dentro de alquileres" v={`S/ ${((desglose?.B ?? 0) - ventasTotal).toFixed(2)}`} muted />
        </Section>
        <Section title="Método de pago">
          <MetodoBars
            porMetodo={{
              efectivo: porMetodo?.EFECTIVO ?? 0,
              visa: porMetodo?.VISA ?? 0,
              master: porMetodo?.MASTERCARD ?? 0,
              yape: porMetodo?.YAPE ?? 0,
              plin: porMetodo?.PLIN ?? 0,
              otro: porMetodo?.OTRO ?? 0,
            }}
          />
        </Section>
      </div>

      {productosVendidos && productosVendidos.length > 0 && (
        <Section title="Productos vendidos (total del turno)" icon={<Package size={13} />}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500">
                <th className="py-1.5">Producto</th>
                <th className="py-1.5 text-right">Cantidad</th>
                <th className="py-1.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {productosVendidos.map((p: any, i: number) => (
                <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 text-slate-700 dark:text-slate-200">{p.nombre}</td>
                  <td className="py-1.5 text-right tabular-nums text-slate-700 dark:text-slate-200">
                    ×{p.cantidad}
                  </td>
                  <td className="py-1.5 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    S/ {Number(p.total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {turno.estado === 'CERRADO' && turno.cerradoEn && (
        <div className="text-[11px] text-slate-400 dark:text-slate-500 text-center pt-2">
          Cerrado el {new Date(turno.cerradoEn).toLocaleString('es-PE')}
          {turno.notas && ` · ${turno.notas}`}
        </div>
      )}
    </div>
  );
}

function TabHabitaciones({ lista }: { lista: any[] }) {
  if (lista.length === 0) {
    return (
      <div className="p-10 text-center text-slate-400 dark:text-slate-500">
        <BedDouble size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
        Sin alquileres cobrados en este turno
      </div>
    );
  }
  return (
    <div className="p-5 space-y-2">
      {lista.map((a: any) => (
        <div
          key={a.id}
          className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-100 dark:border-slate-700"
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 text-white font-bold flex items-center justify-center">
                  <BedDouble size={15} />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    Hab. {a.numeroHabitacion}
                    {a.tipoHabitacion && (
                      <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 ml-2">
                        {a.tipoHabitacion}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    <User size={10} className="inline -mt-0.5 mr-1" />
                    {a.cliente} {a.clienteDni && `· DNI ${a.clienteDni}`}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                S/ {a.pagadoEnEsteTurno.toFixed(2)}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500">
                pagado aquí
              </div>
            </div>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
            <KV k="Habitación" v={`S/ ${a.precioHabitacion.toFixed(2)}`} />
            <KV k="Consumos" v={`S/ ${a.totalProductos.toFixed(2)}`} />
            <KV k="Total alquiler" v={`S/ ${a.total.toFixed(2)}`} />
            <KV k="Estado" v={a.estado} />
          </div>
          {a.metodosPago.length > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-1.5">
              {a.metodosPago.map((m: any, i: number) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
                >
                  <CreditCard size={9} /> {m.metodo} · S/ {m.monto.toFixed(2)}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TabProductos({
  ventas,
  productosVendidos,
}: {
  ventas: any[];
  productosVendidos: any[];
}) {
  return (
    <div className="p-5 space-y-4">
      <Section title="Ventas directas (tickets)">
        {ventas.length === 0 ? (
          <div className="text-center text-slate-400 dark:text-slate-500 py-8 text-sm">
            Sin ventas directas en este turno
          </div>
        ) : (
          <div className="space-y-2">
            {ventas.map((v: any) => (
              <div
                key={v.id}
                className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-700"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-slate-400 dark:text-slate-500">
                      #{String(v.id).padStart(3, '0')}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {new Date(v.creadoEn).toLocaleTimeString('es-PE', {
                        hour12: false,
                      })}
                    </span>
                    <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded">
                      {v.metodoPago}
                    </span>
                  </div>
                  <div className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    S/ {v.total.toFixed(2)}
                  </div>
                </div>
                <div className="text-[12px] text-slate-600 dark:text-slate-400">
                  {v.items
                    .map((i: any) => `${i.producto} ×${i.cantidad}`)
                    .join(' · ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {productosVendidos && productosVendidos.length > 0 && (
        <Section title="Totales por producto" icon={<Package size={13} />}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500">
                <th className="py-1.5">Producto</th>
                <th className="py-1.5 text-right">Cantidad</th>
                <th className="py-1.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {productosVendidos.map((p: any, i: number) => (
                <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 text-slate-700 dark:text-slate-200">{p.nombre}</td>
                  <td className="py-1.5 text-right tabular-nums text-slate-700 dark:text-slate-200">
                    ×{p.cantidad}
                  </td>
                  <td className="py-1.5 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    S/ {Number(p.total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  );
}

function TabPagos({
  pagos,
  ventas,
  porMetodo,
}: {
  pagos: any[];
  ventas: any[];
  porMetodo: any;
}) {
  const todos = [
    ...pagos.map((p: any) => ({
      id: `p-${p.id}`,
      tipo: 'alquiler',
      fecha: p.fecha,
      detalle: `Hab. ${p.numeroHabitacion} · ${p.cliente}`,
      monto: p.monto,
      metodo: p.metodoPago,
    })),
    ...ventas.map((v: any) => ({
      id: `v-${v.id}`,
      tipo: 'venta',
      fecha: v.creadoEn,
      detalle: v.items
        .map((i: any) => `${i.producto} ×${i.cantidad}`)
        .join(' · '),
      monto: v.total,
      metodo: v.metodoPago,
    })),
  ].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  );

  return (
    <div className="p-5 space-y-4">
      <Section title="Total por método">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            { k: 'EFECTIVO', color: 'emerald' },
            { k: 'VISA', color: 'blue' },
            { k: 'MASTERCARD', color: 'orange' },
            { k: 'YAPE', color: 'violet' },
            { k: 'PLIN', color: 'cyan' },
            { k: 'OTRO', color: 'slate' },
          ].map(({ k, color }) => (
            <div
              key={k}
              className={`rounded-xl p-3 bg-${color}-50 dark:bg-${color}-900/30 border border-${color}-200 dark:border-${color}-800/50`}
            >
              <div
                className={`text-[10px] uppercase tracking-widest font-bold text-${color}-700 dark:text-${color}-300`}
              >
                {k}
              </div>
              <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                S/ {(porMetodo?.[k] ?? 0).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Movimientos (${todos.length})`}>
        {todos.length === 0 ? (
          <div className="text-center text-slate-400 dark:text-slate-500 py-6 text-sm">
            Sin movimientos registrados
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[360px] overflow-y-auto scroll-premium">
            {todos.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-[12px]"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${
                      m.tipo === 'alquiler'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                        : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                    }`}
                  >
                    {m.tipo === 'alquiler' ? (
                      <BedDouble size={12} />
                    ) : (
                      <ShoppingCart size={12} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {m.detalle}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                      {new Date(m.fecha).toLocaleTimeString('es-PE', {
                        hour12: false,
                      })}
                    </div>
                  </div>
                </div>
                <span className="inline-flex bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded">
                  {m.metodo}
                </span>
                <div className="font-bold tabular-nums text-slate-900 dark:text-slate-100 w-20 text-right">
                  S/ {m.monto.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span
        className={
          muted
            ? 'text-slate-500 dark:text-slate-400'
            : 'text-slate-700 dark:text-slate-300'
        }
      >
        {k}
      </span>
      <span
        className={`font-semibold tabular-nums ${
          muted
            ? 'text-slate-500 dark:text-slate-400'
            : 'text-slate-900 dark:text-slate-100'
        }`}
      >
        {v}
      </span>
    </div>
  );
}

function TileBig({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: 'violet' | 'emerald' | 'amber' | 'blue';
}) {
  const map: Record<string, string> = {
    violet: 'from-violet-500 to-violet-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    blue: 'from-blue-500 to-blue-600',
  };
  return (
    <div className={`rounded-xl p-3 bg-gradient-to-br ${map[color]} text-white`}>
      <div className="text-[10px] uppercase tracking-widest opacity-90 font-semibold">
        {label}
      </div>
      <div className="text-xl font-hotel font-bold mt-0.5 tabular-nums">
        {value}
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[9.5px] uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {k}
      </div>
      <div className="font-semibold text-slate-700 dark:text-slate-200 text-[12px] tabular-nums">
        {v}
      </div>
    </div>
  );
}

function MetodoBars({
  porMetodo,
}: {
  porMetodo: {
    efectivo: number;
    visa: number;
    master: number;
    yape: number;
    plin: number;
    otro: number;
  };
}) {
  const data: Array<[string, number, string]> = [
    ['Efectivo', porMetodo.efectivo, 'bg-emerald-500'],
    ['Visa', porMetodo.visa, 'bg-blue-500'],
    ['Master', porMetodo.master, 'bg-orange-500'],
    ['Yape', porMetodo.yape, 'bg-violet-500'],
    ['Plin', porMetodo.plin, 'bg-cyan-500'],
    ['Otro', porMetodo.otro, 'bg-slate-400'],
  ];
  const total = data.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <div className="space-y-2">
      {data.map(([name, value, color]) => {
        const pct = (value / total) * 100;
        return (
          <div key={name}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                {name}
              </span>
              <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                S/ {value.toFixed(2)}{' '}
                <span className="text-slate-400 dark:text-slate-500">
                  ({pct.toFixed(0)}%)
                </span>
              </span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${color} rounded-full transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
