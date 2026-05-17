import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Wallet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ExternalLink,
  Printer,
  Download,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

interface AlquilerHijo {
  id: number;
  clienteNombre: string;
  clienteDni: string;
  total: string;
  estado: string;
  habitacion: { numero: string };
}

interface ReservaGrupal {
  id: number;
  sedeId: number;
  clienteRuc: string;
  clienteRazonSocial: string;
  clienteDireccionFiscal: string | null;
  contactoNombre: string | null;
  contactoTelefono: string | null;
  fechaIngreso: string;
  fechaSalida: string;
  total: string;
  metodoPago: string;
  estado: string;
  notas: string | null;
  pagado: boolean;
  montoPagado: string;
  pagadoEn: string | null;
  sunatEmitido: boolean;
  sunatAceptada: boolean | null;
  sunatSerie: string | null;
  sunatNumero: number | null;
  sunatEnlace: string | null;
  sunatEnlacePdf: string | null;
  creadoEn: string;
  alquileres: AlquilerHijo[];
  creadoPor?: { nombre: string } | null;
  cobradoPor?: { nombre: string } | null;
  sede?: { nombre: string };
}

export default function ReservasGrupales() {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const [ver, setVer] = useState<ReservaGrupal | null>(null);
  // Confirmación tipo "si acepto" antes de consumir un correlativo SUNAT
  const [confirmEmit, setConfirmEmit] = useState<ReservaGrupal | null>(null);

  const { data, isLoading } = useQuery<ReservaGrupal[]>({
    queryKey: ['reservas-grupales'],
    queryFn: async () => (await api.get('/reservas-grupales')).data,
  });

  const cobrar = useMutation({
    mutationFn: async (vars: { id: number; monto?: number }) =>
      (await api.post(`/reservas-grupales/${vars.id}/cobrar`, { monto: vars.monto })).data,
    onSuccess: () => {
      toast({ type: 'success', title: 'Cobro registrado' });
      qc.invalidateQueries({ queryKey: ['reservas-grupales'] });
      qc.invalidateQueries({ queryKey: ['alquileres'] });
    },
    onError: (err: any) =>
      toast({
        type: 'error',
        title: 'No se pudo cobrar',
        description: err.response?.data?.message || err.message,
      }),
  });

  const emitir = useMutation({
    mutationFn: async (id: number) =>
      (await api.post(`/nubefact/reservas-grupales/${id}/emitir`, {})).data,
    onSuccess: (data: any) => {
      const ok = data?.aceptada_por_sunat;
      toast({
        type: ok ? 'success' : 'warning',
        title: ok
          ? `Factura emitida ${data?.serie}-${data?.numero}`
          : 'Emitida, pendiente en SUNAT',
        description: data?.sunat_description || undefined,
      });
      qc.invalidateQueries({ queryKey: ['reservas-grupales'] });
    },
    onError: (err: any) =>
      toast({
        type: 'error',
        title: 'No se pudo emitir factura',
        description: err.response?.data?.message || err.message,
      }),
  });

  const filtradas = useMemo(() => data || [], [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 flex items-center justify-center">
          <Building2 size={20} />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">
            Reservas corporativas
          </div>
          <h1 className="font-hotel text-xl font-bold text-slate-900 dark:text-slate-100">
            Reservas grupales
          </h1>
        </div>
      </div>

      <div className="bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800/50 rounded-xl p-3 text-xs text-violet-800 dark:text-violet-200">
        <b>Cobro y factura consolidados.</b> Cuando una empresa alquila varias
        habitaciones, todo va en <b>una sola factura</b> y un <b>solo cobro</b>.
        Los consumos de productos por habitación son aparte (no se facturan).
      </div>

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : filtradas.length === 0 ? (
        <EmptyState
          title="Sin reservas grupales"
          description="Cuando crees una reserva corporativa desde Alquileres aparecerá acá con sus opciones de cobro y factura consolidada."
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3 text-center">Habs</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Cobro</th>
                <th className="px-4 py-3 text-center">Factura</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((r) => {
                const total = Number(r.total);
                const pagado = Number(r.montoPagado);
                const saldo = total - pagado;
                const pagadoCompleto = saldo <= 0.01;
                return (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      #{r.id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                        {r.clienteRazonSocial}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        RUC {r.clienteRuc}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {r.alquileres.length}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900 dark:text-slate-100">
                      S/ {total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {pagadoCompleto ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                          <CheckCircle2 size={11} /> Pagado
                        </span>
                      ) : pagado > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                          Parcial S/ {saldo.toFixed(2)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded animate-pulse">
                          <AlertCircle size={11} /> Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.sunatEmitido ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-mono font-bold text-xs text-emerald-700">
                            ✓ {r.sunatSerie}-
                            {String(r.sunatNumero).padStart(7, '0').slice(-7)}
                          </span>
                          {r.sunatAceptada !== false && (
                            <span className="text-[9px] text-emerald-600">
                              {r.sunatAceptada
                                ? 'Aceptada SUNAT'
                                : 'Pendiente SUNAT'}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1.5 flex-wrap justify-end">
                        {!pagadoCompleto && (
                          <button
                            onClick={() => cobrar.mutate({ id: r.id })}
                            disabled={cobrar.isPending}
                            className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded disabled:opacity-50"
                          >
                            {cobrar.isPending ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Wallet size={12} />
                            )}
                            Cobrar todo
                          </button>
                        )}
                        {!r.sunatEmitido ? (
                          <button
                            onClick={() => setConfirmEmit(r)}
                            className="inline-flex items-center gap-1 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white px-2.5 py-1 rounded"
                          >
                            <FileText size={12} /> Emitir factura
                          </button>
                        ) : (
                          <>
                            <a
                              href={r.sunatEnlacePdf || r.sunatEnlace || '#'}
                              target="_blank"
                              rel="noopener"
                              className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded transition"
                              title="Abrir PDF en pestaña nueva"
                            >
                              <Printer size={12} /> Ver PDF
                            </a>
                            <a
                              href={r.sunatEnlacePdf || r.sunatEnlace || '#'}
                              target="_blank"
                              rel="noopener"
                              download
                              className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded transition"
                              title="Descargar PDF"
                            >
                              <Download size={12} />
                            </a>
                          </>
                        )}
                        <button
                          onClick={() => setVer(r)}
                          className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded"
                        >
                          Ver
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {ver && <DetalleModal reserva={ver} onClose={() => setVer(null)} />}
      {confirmEmit && (
        <ConfirmEmitirModal
          reserva={confirmEmit}
          onClose={() => setConfirmEmit(null)}
          onConfirmar={() => {
            emitir.mutate(confirmEmit.id);
            setConfirmEmit(null);
          }}
          loading={emitir.isPending}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Modal de confirmación "si acepto" antes de emitir factura
// ────────────────────────────────────────────────────────────
function ConfirmEmitirModal({
  reserva,
  onClose,
  onConfirmar,
  loading,
}: {
  reserva: ReservaGrupal;
  onClose: () => void;
  onConfirmar: () => void;
  loading: boolean;
}) {
  const FRASE = 'si acepto';
  const [txt, setTxt] = useState('');
  const normalizar = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim()
      .toLowerCase();
  const ok = normalizar(txt) === normalizar(FRASE);

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Emitir factura consolidada
              </h3>
              <div className="text-xs text-slate-500">
                {reserva.clienteRazonSocial}
              </div>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-3">
          {/* Resumen */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Empresa</span>
              <span className="font-semibold text-right truncate ml-2">
                {reserva.clienteRazonSocial}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">RUC</span>
              <span className="font-mono">{reserva.clienteRuc}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Habitaciones</span>
              <span className="font-bold">{reserva.alquileres.length}</span>
            </div>
            <div className="h-px bg-slate-200 my-1" />
            <div className="flex justify-between items-baseline">
              <span className="font-semibold text-slate-700">Total a facturar</span>
              <span className="text-2xl font-hotel font-bold text-violet-700 tabular-nums">
                S/ {Number(reserva.total).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Aviso rojo */}
          <div className="bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800/50 rounded-lg p-3 text-xs text-rose-800 dark:text-rose-200 leading-snug">
            ⚠ La emisión queda registrada en SUNAT y consume un correlativo
            oficial. <b>No se puede deshacer.</b> Para confirmar escribí
            textualmente la frase:
            <div className="font-mono text-[13px] font-bold text-rose-900 dark:text-rose-100 mt-1.5 select-all">
              {FRASE}
            </div>
          </div>

          <input
            autoFocus
            autoComplete="off"
            placeholder={`Escribe: ${FRASE}`}
            value={txt}
            onChange={(e) => setTxt(e.target.value)}
            className={`w-full px-3 py-2.5 rounded-lg text-sm font-mono border-2 transition focus:outline-none ${
              ok
                ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                : 'border-rose-300 bg-white text-slate-800'
            }`}
          />
          {ok && (
            <div className="text-xs text-emerald-700 font-semibold inline-flex items-center gap-1">
              ✓ Confirmación recibida. Listo para emitir.
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 py-2.5 rounded-lg font-medium text-slate-700 dark:text-slate-200 text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirmar}
              disabled={loading || !ok}
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-lg font-semibold disabled:opacity-50 text-sm inline-flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Emitiendo…
                </>
              ) : (
                <>
                  <FileText size={14} /> Emitir factura
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetalleModal({
  reserva,
  onClose,
}: {
  reserva: ReservaGrupal;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-700 text-white p-5 flex justify-between items-start z-10">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
              <Building2 size={22} />
            </div>
            <div>
              <h2 className="font-hotel text-lg font-bold">
                {reserva.clienteRazonSocial}
              </h2>
              <div className="text-xs opacity-90 font-mono mt-0.5">
                RUC {reserva.clienteRuc} · Reserva #{reserva.id}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Datos */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
                Ingreso
              </div>
              <div>
                {new Date(reserva.fechaIngreso).toLocaleDateString('es-PE')}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
                Salida
              </div>
              <div>
                {new Date(reserva.fechaSalida).toLocaleDateString('es-PE')}
              </div>
            </div>
            {reserva.clienteDireccionFiscal && (
              <div className="col-span-2">
                <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
                  Dirección fiscal
                </div>
                <div className="text-xs">{reserva.clienteDireccionFiscal}</div>
              </div>
            )}
            {reserva.contactoNombre && (
              <div className="col-span-2">
                <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
                  Contacto
                </div>
                <div className="text-xs">
                  {reserva.contactoNombre}
                  {reserva.contactoTelefono &&
                    ` · ${reserva.contactoTelefono}`}
                </div>
              </div>
            )}
          </div>

          {/* Habitaciones */}
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">
              {reserva.alquileres.length} habitación
              {reserva.alquileres.length === 1 ? '' : 'es'}
            </div>
            <div className="space-y-1">
              {reserva.alquileres.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-bold text-violet-700 dark:text-violet-300">
                      Hab. {a.habitacion.numero}
                    </span>
                    <span className="text-xs text-slate-500 ml-2">
                      {a.clienteNombre}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs">
                      S/ {Number(a.total).toFixed(2)}
                    </div>
                    <div className="text-[9px] text-slate-400 uppercase">
                      {a.estado}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totales */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 rounded-xl p-3">
            <div className="flex justify-between items-baseline text-sm">
              <span className="text-slate-600">Total reserva</span>
              <span className="text-xl font-hotel font-bold tabular-nums">
                S/ {Number(reserva.total).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-baseline text-xs mt-1">
              <span className="text-emerald-700">Pagado</span>
              <span className="font-semibold text-emerald-700 tabular-nums">
                S/ {Number(reserva.montoPagado).toFixed(2)}
              </span>
            </div>
          </div>

          {reserva.sunatEmitido && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm">
              <div className="font-semibold text-blue-900 flex items-center gap-2">
                <FileText size={14} />
                Factura {reserva.sunatSerie}-
                {String(reserva.sunatNumero).padStart(7, '0').slice(-7)}
                {reserva.sunatAceptada && (
                  <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded">
                    Aceptada SUNAT
                  </span>
                )}
              </div>
              {reserva.sunatEnlacePdf && (
                <a
                  href={reserva.sunatEnlacePdf}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1 text-xs text-blue-700 underline mt-1"
                >
                  Ver PDF <ExternalLink size={11} />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
