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
function Boleta2Modal({ turnoId, onClose }: { turnoId: number; onClose: () => void }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['caja', 'boleta2', turnoId],
    queryFn: async () => (await api.get(`/caja/${turnoId}/reporte-boleta2`)).data,
  });
  const money = (n: number) => Number(n || 0).toFixed(2);
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  const imprimir = () => {
    const el = document.getElementById('boleta2-print');
    if (!el) return;
    const w = window.open('', '_blank', 'width=420,height=760');
    if (!w) return;
    w.document.write(
      `<html><head><title>Reporte turno #${turnoId}</title><meta charset="utf-8">` +
        `<style>*{font-family:'Courier New',monospace;box-sizing:border-box;margin:0}` +
        `body{padding:10px;color:#000}` +
        `.b2{max-width:360px;margin:0 auto;border:2px solid #000}` +
        `.g2{display:grid;grid-template-columns:1fr 1fr}` +
        `.bd{border-bottom:2px solid #000}.br{border-right:2px solid #000}` +
        `.cell{padding:6px;font-size:12px}` +
        `.fila{display:flex;justify-content:space-between;gap:6px}` +
        `.b{font-weight:bold}.tt{border-top:1px solid #888;margin-top:4px;padding-top:4px}` +
        `.hd{background:#fbbf24;display:inline-block;padding:0 4px;font-size:10px;font-weight:bold}` +
        `.mut{color:#888}.sm{font-size:11px}</style></head><body>` +
        el.getAttribute('data-print-html') +
        `</body></html>`,
    );
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  // HTML plano (con clases simples) para la ventana de impresión.
  const printHtml = data
    ? (() => {
        const d = data;
        const filas = (arr: [string, string, boolean?][]) =>
          arr.map(([k, v, b]) => `<div class="fila${b ? ' b' : ''}"><span>${k}</span><span>${v}</span></div>`).join('');
        const prods = (arr: any[]) => arr.length
          ? arr.map((p) => `<div class="fila sm"><span>${p.nombre} ×${p.cantidad}</span><span>${money(p.total)}</span></div>`).join('')
          : '<div class="mut sm">—</div>';
        const limp = d.limpieza.length
          ? d.limpieza.map((l: any) => `<div class="fila sm"><span>${l.nombre}</span><span>${l.habitaciones} hab.</span></div>`).join('')
          : '<div class="mut sm">—</div>';
        return `<div class="b2">` +
          `<div class="g2 bd"><div class="cell br"><span class="hd">NOCHE</span><div class="b">${dias[new Date(d.turno.abiertoEn).getDay()]}</div></div>` +
          `<div class="cell sm"><div><b>FECHA:</b> ${new Date(d.turno.abiertoEn).toLocaleDateString('es-PE')}</div><div><b>Usuario:</b> ${d.turno.usuario?.username || d.turno.usuario?.nombre}</div><div class="mut">${d.turno.sede?.nombre}</div></div></div>` +
          `<div class="g2 bd"><div class="cell br">${filas([['H · Habitaciones', money(d.desglose.H)],['B · Bebidas', money(d.desglose.B)],['O · Otros', money(d.desglose.O)]])}<div class="tt">${filas([['G · TOTAL', money(d.desglose.G), true],['− Digital', money(d.desglose.digital)],['= EFECTIVO', money(d.desglose.efectivo), true]])}</div></div>` +
          `<div class="cell"><div class="b">Pagos digitales</div>${filas([['Visa', money(d.porMetodo.VISA)],['Master', money(d.porMetodo.MASTERCARD)],['Yape', money(d.porMetodo.YAPE)],['Plin', money(d.porMetodo.PLIN)],['Otro', money(d.porMetodo.OTRO)]])}<div class="tt">${filas([['Total', money(d.desglose.digital), true]])}</div></div></div>` +
          `<div class="g2 bd"><div class="cell br"><div class="b">Ingresos</div>${filas([['P1 · A pie', String(d.ingresos.aPie)],['P2 · Vehículo', String(d.ingresos.enVehiculo)],['Total personas', String(d.ingresos.total), true]])}</div>` +
          `<div class="cell"><div class="b">Limpieza</div>${limp}</div></div>` +
          `<div class="g2"><div class="cell br"><div class="b">Bebidas</div>${prods(d.productos.bebidas)}<div class="tt fila b"><span>Σ B</span><span>${money(d.desglose.B)}</span></div></div>` +
          `<div class="cell"><div class="b">Otros</div>${prods(d.productos.otros)}<div class="tt fila b"><span>Σ O</span><span>${money(d.desglose.O)}</span></div></div></div>` +
          `</div>`;
      })()
    : '';

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] overflow-hidden shadow-2xl flex flex-col animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-amber-400">
          <span className="text-sm font-bold text-slate-900">🧾 Reporte por turno · Versión 2</span>
          <div className="flex items-center gap-2">
            <button onClick={imprimir} className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs btn-press"><Printer size={12} /> Imprimir</button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-black/10 flex items-center justify-center"><X size={16} className="text-slate-700" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading || !data ? (
            <div className="py-16 text-center text-slate-400 text-sm">Cargando…</div>
          ) : (
            <div id="boleta2-print" data-print-html={printHtml} className="mx-auto max-w-[360px] border-2 border-slate-900 text-slate-900 text-sm font-mono">
              {/* Cabecera */}
              <div className="grid grid-cols-2 border-b-2 border-slate-900">
                <div className="p-2 border-r-2 border-slate-900">
                  <div className="bg-amber-400 inline-block px-1 text-[10px] font-bold">NOCHE</div>
                  <div className="font-bold">{dias[new Date(data.turno.abiertoEn).getDay()]}</div>
                </div>
                <div className="p-2 text-[11px]">
                  <div><b>FECHA:</b> {new Date(data.turno.abiertoEn).toLocaleDateString('es-PE')}</div>
                  <div><b>Usuario:</b> {data.turno.usuario?.username || data.turno.usuario?.nombre}</div>
                  <div className="text-slate-500">{data.turno.sede?.nombre}</div>
                </div>
              </div>

              {/* Dinero H/B/O/G + Visa + Efectivo */}
              <div className="grid grid-cols-2 border-b-2 border-slate-900">
                <div className="p-2 border-r-2 border-slate-900 space-y-0.5">
                  <Fila k="H · Habitaciones" v={money(data.desglose.H)} />
                  <Fila k="B · Bebidas" v={money(data.desglose.B)} />
                  <Fila k="O · Otros" v={money(data.desglose.O)} />
                  <div className="border-t border-slate-400 mt-1 pt-1">
                    <Fila k="G · TOTAL" v={money(data.desglose.G)} bold />
                    <Fila k="− Digital" v={money(data.desglose.digital)} />
                    <Fila k="= EFECTIVO" v={money(data.desglose.efectivo)} bold />
                  </div>
                </div>
                <div className="p-2 text-[12px]">
                  <div className="font-bold mb-1">Pagos digitales</div>
                  <Fila k="Visa" v={money(data.porMetodo.VISA)} />
                  <Fila k="Master" v={money(data.porMetodo.MASTERCARD)} />
                  <Fila k="Yape" v={money(data.porMetodo.YAPE)} />
                  <Fila k="Plin" v={money(data.porMetodo.PLIN)} />
                  <Fila k="Otro" v={money(data.porMetodo.OTRO)} />
                  <div className="border-t border-slate-400 mt-1 pt-1"><Fila k="Total" v={money(data.desglose.digital)} bold /></div>
                </div>
              </div>

              {/* Ingresos por puerta + limpieza */}
              <div className="grid grid-cols-2 border-b-2 border-slate-900">
                <div className="p-2 border-r-2 border-slate-900 text-[12px]">
                  <div className="font-bold mb-1">Ingresos</div>
                  <Fila k="P1 · A pie" v={String(data.ingresos.aPie)} />
                  <Fila k="P2 · Vehículo" v={String(data.ingresos.enVehiculo)} />
                  <Fila k="Total personas" v={String(data.ingresos.total)} bold />
                </div>
                <div className="p-2 text-[12px]">
                  <div className="font-bold mb-1">Limpieza</div>
                  {data.limpieza.length === 0 && <div className="text-slate-400">—</div>}
                  {data.limpieza.map((l: any, i: number) => (
                    <Fila key={i} k={l.nombre} v={`${l.habitaciones} hab.`} />
                  ))}
                </div>
              </div>

              {/* Productos: bebidas | otros */}
              <div className="grid grid-cols-2">
                <div className="p-2 border-r-2 border-slate-900 text-[11px]">
                  <div className="font-bold mb-1">Bebidas</div>
                  {data.productos.bebidas.length === 0 && <div className="text-slate-400">—</div>}
                  {data.productos.bebidas.map((p: any, i: number) => (
                    <div key={i} className="flex justify-between gap-1"><span className="truncate">{p.nombre} ×{p.cantidad}</span><span>{money(p.total)}</span></div>
                  ))}
                  <div className="border-t border-slate-400 mt-1 pt-1 flex justify-between font-bold"><span>Σ B</span><span>{money(data.desglose.B)}</span></div>
                </div>
                <div className="p-2 text-[11px]">
                  <div className="font-bold mb-1">Otros</div>
                  {data.productos.otros.length === 0 && <div className="text-slate-400">—</div>}
                  {data.productos.otros.map((p: any, i: number) => (
                    <div key={i} className="flex justify-between gap-1"><span className="truncate">{p.nombre} ×{p.cantidad}</span><span>{money(p.total)}</span></div>
                  ))}
                  <div className="border-t border-slate-400 mt-1 pt-1 flex justify-between font-bold"><span>Σ O</span><span>{money(data.desglose.O)}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Fila({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? 'font-bold' : ''}`}>
      <span className="truncate">{k}</span>
      <span className="tabular-nums">{v}</span>
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
