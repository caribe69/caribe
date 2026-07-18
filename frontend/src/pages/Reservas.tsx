import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  Plus,
  X,
  Clock,
  BedDouble,
  Phone,
  Wallet,
  LogIn,
  Ban,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ToastProvider';
import { useDialog } from '@/components/ConfirmProvider';

type EstadoReserva = 'PENDIENTE' | 'CUMPLIDA' | 'CANCELADA';
interface Reserva {
  id: number;
  clienteNombre: string;
  clienteDni: string | null;
  clienteTelefono: string | null;
  inicio: string;
  fin: string;
  tipo: 'POR_HORA' | 'POR_DIA';
  estado: EstadoReserva;
  adelanto: number | string;
  notas: string | null;
  habitacion: {
    id: number;
    numero: string;
    descripcion: string | null;
    precioHora: number | string;
    precioNoche: number | string;
  };
}
interface Dispo {
  id: number;
  numero: string;
  descripcion: string | null;
  piso: number;
  precioHora: number;
  precioNoche: number;
  estadoFranja: 'LIBRE' | 'OCUPADA' | 'RESERVADA' | 'BLOQUEADA';
  detalle: string | null;
}

const money = (n: number | string) => `S/ ${Number(n || 0).toFixed(2)}`;
const p2 = (n: number) => String(n).padStart(2, '0');
const toInput = (d: Date) =>
  `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
const fmt = (s: string) =>
  new Date(s).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function Reservas() {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const { confirm } = useDialog();
  const activeSedeId = useAuthStore((s) => s.activeSedeId);
  const [filtro, setFiltro] = useState<EstadoReserva | 'TODAS'>('PENDIENTE');
  const [nueva, setNueva] = useState(false);
  const [checkin, setCheckin] = useState<Reserva | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['reservas', activeSedeId, filtro],
    queryFn: async () =>
      (
        await api.get<Reserva[]>('/reservas', {
          params: { sedeId: activeSedeId, estado: filtro === 'TODAS' ? undefined : filtro },
        })
      ).data,
  });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['reservas'] });
    qc.invalidateQueries({ queryKey: ['reservas-dispo'] });
  };

  const cancelar = async (r: Reserva) => {
    const ok = await confirm({
      title: '¿Cancelar esta reserva?',
      message: `${r.clienteNombre} · Hab. ${r.habitacion.numero} · ${fmt(r.inicio)}`,
      variant: 'danger',
      confirmText: 'Cancelar reserva',
    });
    if (!ok) return;
    try {
      await api.delete(`/reservas/${r.id}`);
      toast({ type: 'success', title: 'Reserva cancelada' });
      invalidar();
    } catch (e: any) {
      toast({ type: 'error', title: 'No se pudo', description: e.response?.data?.message });
    }
  };

  const list = data || [];
  const ahora = Date.now();

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-3xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
            <CalendarClock size={18} />
          </div>
          <div>
            <div className="font-hotel text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">Reservas</div>
            <div className="text-[11px] text-slate-400 mt-1">Aparta una habitación para una hora o día. Se convierte en alquiler al llegar el cliente.</div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {(['PENDIENTE', 'CUMPLIDA', 'CANCELADA', 'TODAS'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${filtro === f ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-700 dark:text-indigo-300' : 'text-slate-500'}`}
              >
                {f.toLowerCase()}
              </button>
            ))}
          </div>
          <button
            onClick={() => setNueva(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md shadow-indigo-500/30 btn-press"
          >
            <Plus size={15} /> Nueva reserva
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      )}
      {!isLoading && list.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm">
          <EmptyState icon={<CalendarClock size={28} />} title="Sin reservas" description='Crea una con "Nueva reserva". Aparta la habitación para la hora que el cliente pidió.' />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {list.map((r) => {
          const vencida = r.estado === 'PENDIENTE' && new Date(r.fin).getTime() < ahora;
          return (
            <div key={r.id} className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold shrink-0">
                  {r.habitacion.numero}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{r.clienteNombre}</div>
                  <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2">
                    <span>Hab. {r.habitacion.numero}</span>
                    {r.clienteTelefono && <span className="flex items-center gap-1"><Phone size={10} /> {r.clienteTelefono}</span>}
                  </div>
                </div>
                <EstadoBadge estado={r.estado} vencida={vencida} />
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2">
                <Clock size={14} className="text-indigo-500 shrink-0" />
                <span className="font-medium text-slate-700 dark:text-slate-200">{fmt(r.inicio)} → {fmt(r.fin)}</span>
                <span className="ml-auto text-[10px] uppercase tracking-widest text-slate-400">{r.tipo === 'POR_HORA' ? 'por hora' : 'por día'}</span>
              </div>

              {Number(r.adelanto) > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300">
                  <Wallet size={13} /> Adelanto: <b>{money(r.adelanto)}</b>
                </div>
              )}
              {r.notas && <div className="mt-2 text-[11px] text-slate-500 italic">“{r.notas}”</div>}

              {r.estado === 'PENDIENTE' && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setCheckin(r)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 rounded-lg"
                  >
                    <LogIn size={14} /> Check-in (alquilar)
                  </button>
                  <button
                    onClick={() => cancelar(r)}
                    className="inline-flex items-center justify-center gap-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold px-3 py-2 rounded-lg"
                  >
                    <Ban size={14} /> Cancelar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {nueva && (
        <NuevaReservaModal
          sedeId={activeSedeId}
          onClose={() => setNueva(false)}
          onSaved={() => { setNueva(false); invalidar(); }}
        />
      )}
      {checkin && (
        <CheckInModal
          reserva={checkin}
          onClose={() => setCheckin(null)}
          onDone={() => { setCheckin(null); invalidar(); }}
        />
      )}
    </div>
  );
}

function EstadoBadge({ estado, vencida }: { estado: EstadoReserva; vencida: boolean }) {
  if (vencida)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"><AlertTriangle size={10} /> No llegó</span>;
  const map: Record<EstadoReserva, string> = {
    PENDIENTE: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    CUMPLIDA: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    CANCELADA: 'bg-slate-100 text-slate-500 dark:bg-slate-800',
  };
  const icon = estado === 'CUMPLIDA' ? <CheckCircle2 size={10} /> : estado === 'CANCELADA' ? <Ban size={10} /> : <Clock size={10} />;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${map[estado]}`}>{icon} {estado.toLowerCase()}</span>;
}

// ── Nueva reserva: elige franja → muestra qué habitaciones están libres ──
function NuevaReservaModal({ sedeId, onClose, onSaved }: { sedeId: number | null; onClose: () => void; onSaved: () => void }) {
  const { show: toast } = useToast();
  const ahora = useMemo(() => new Date(), []);
  const [inicio, setInicio] = useState(toInput(new Date(ahora.getTime() + 60 * 60 * 1000)));
  const [fin, setFin] = useState(toInput(new Date(ahora.getTime() + 3 * 60 * 60 * 1000)));
  const [tipo, setTipo] = useState<'POR_HORA' | 'POR_DIA'>('POR_HORA');
  const [habSel, setHabSel] = useState<Dispo | null>(null);
  const [form, setForm] = useState({ clienteNombre: '', clienteDni: '', clienteTelefono: '', adelanto: '', notas: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const franjaValida = !!inicio && !!fin && new Date(fin) > new Date(inicio);

  const dispo = useQuery({
    queryKey: ['reservas-dispo', sedeId, inicio, fin],
    queryFn: async () =>
      (
        await api.get<Dispo[]>('/reservas/disponibilidad', {
          params: { sedeId, inicio: new Date(inicio).toISOString(), fin: new Date(fin).toISOString() },
        })
      ).data,
    enabled: franjaValida,
  });

  const guardar = async () => {
    if (!habSel) { setError('Elige una habitación libre'); return; }
    if (!form.clienteNombre.trim()) { setError('Escribe el nombre del cliente'); return; }
    if (form.clienteDni.trim().length < 6) { setError('El DNI del cliente es obligatorio'); return; }
    setGuardando(true); setError(null);
    try {
      await api.post('/reservas', {
        sedeId,
        habitacionId: habSel.id,
        clienteNombre: form.clienteNombre.trim(),
        clienteDni: form.clienteDni.trim(),
        clienteTelefono: form.clienteTelefono.trim() || undefined,
        inicio: new Date(inicio).toISOString(),
        fin: new Date(fin).toISOString(),
        tipo,
        adelanto: form.adelanto ? Number(form.adelanto) : 0,
        notas: form.notas.trim() || undefined,
      });
      toast({ type: 'success', title: 'Reserva creada' });
      onSaved();
    } catch (e: any) {
      setError(e.response?.data?.message || 'No se pudo crear la reserva');
    } finally {
      setGuardando(false);
    }
  };

  const estiloFranja: Record<Dispo['estadoFranja'], string> = {
    LIBRE: 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 cursor-pointer',
    OCUPADA: 'border-rose-200 bg-rose-50 dark:bg-rose-900/20 text-rose-400 cursor-not-allowed opacity-70',
    RESERVADA: 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 text-amber-500 cursor-not-allowed opacity-80',
    BLOQUEADA: 'border-slate-200 bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-60',
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-700 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="font-hotel text-lg font-bold text-slate-900 dark:text-slate-100">Nueva reserva</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Franja horaria */}
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Desde (día y hora)"><input type="datetime-local" className={inp} value={inicio} onChange={(e) => { setInicio(e.target.value); setHabSel(null); }} /></Campo>
            <Campo label="Hasta (día y hora)"><input type="datetime-local" className={inp} value={fin} onChange={(e) => { setFin(e.target.value); setHabSel(null); }} /></Campo>
          </div>
          <div className="flex gap-2">
            {(['POR_HORA', 'POR_DIA'] as const).map((t) => (
              <button key={t} onClick={() => setTipo(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${tipo === t ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                {t === 'POR_HORA' ? 'Por hora' : 'Por día'}
              </button>
            ))}
          </div>

          {/* Grilla de disponibilidad en esa franja */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Habitaciones libres en ese horario</label>
            {!franjaValida ? (
              <div className="mt-2 text-sm text-rose-500">La hora de fin debe ser posterior al inicio.</div>
            ) : dispo.isLoading ? (
              <div className="mt-2 grid grid-cols-4 sm:grid-cols-6 gap-2">{Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : (
              <>
                <div className="mt-2 grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {(dispo.data || []).map((h) => (
                    <button
                      key={h.id}
                      disabled={h.estadoFranja !== 'LIBRE'}
                      onClick={() => setHabSel(h)}
                      title={h.detalle || ''}
                      className={`relative rounded-xl border p-2 text-center transition ${estiloFranja[h.estadoFranja]} ${habSel?.id === h.id ? 'ring-2 ring-indigo-500' : ''}`}
                    >
                      <div className="font-bold text-sm">{h.numero}</div>
                      <div className="text-[9px] uppercase tracking-wide">{h.estadoFranja.toLowerCase()}</div>
                    </button>
                  ))}
                  {(dispo.data?.length ?? 0) === 0 && <div className="col-span-full text-sm text-slate-400 py-4 text-center">Sin habitaciones.</div>}
                </div>
                <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-400" /> Libre</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400" /> Reservada</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-rose-400" /> Ocupada</span>
                </div>
              </>
            )}
          </div>

          {habSel && (
            <div className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-xl px-3 py-2">
              Elegida: <b>Hab. {habSel.numero}</b> · {money(tipo === 'POR_HORA' ? habSel.precioHora : habSel.precioNoche)} {tipo === 'POR_HORA' ? 'por hora' : 'por noche'}
            </div>
          )}

          {/* Datos del cliente */}
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Nombre del cliente *"><input className={inp} value={form.clienteNombre} onChange={(e) => setForm({ ...form, clienteNombre: e.target.value })} placeholder="Juan Pérez" /></Campo>
            <Campo label="DNI *"><input className={inp} inputMode="numeric" value={form.clienteDni} onChange={(e) => setForm({ ...form, clienteDni: e.target.value })} placeholder="12345678" /></Campo>
            <Campo label="Teléfono (opcional)"><input className={inp} value={form.clienteTelefono} onChange={(e) => setForm({ ...form, clienteTelefono: e.target.value })} placeholder="999 888 777" /></Campo>
            <Campo label="Adelanto / seña (opcional)"><input type="number" min={0} step="0.01" className={inp} value={form.adelanto} onChange={(e) => setForm({ ...form, adelanto: e.target.value })} placeholder="0.00" /></Campo>
          </div>
          <Campo label="Notas (opcional)"><input className={inp} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Llega tipo 8pm, pidió cama extra…" /></Campo>

          {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">{error}</div>}
        </div>
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex gap-2 sticky bottom-0">
          <button onClick={onClose} className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl font-medium">Cancelar</button>
          <button onClick={guardar} disabled={guardando || !habSel} className="flex-[2] bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white py-2.5 rounded-xl font-semibold shadow-md disabled:opacity-40">
            {guardando ? 'Guardando…' : 'Crear reserva'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Check-in: convierte la reserva en alquiler ──
function CheckInModal({ reserva, onClose, onDone }: { reserva: Reserva; onClose: () => void; onDone: () => void }) {
  const { show: toast } = useToast();
  const activeSedeId = useAuthStore((s) => s.activeSedeId);
  const precioDefault = reserva.tipo === 'POR_HORA' ? Number(reserva.habitacion.precioHora) : Number(reserva.habitacion.precioNoche);
  const [precio, setPrecio] = useState(String(precioDefault));
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [cobrarAhora, setCobrarAhora] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adelanto = Number(reserva.adelanto || 0);
  const saldo = Math.max(0, Number(precio || 0) - adelanto);

  const confirmar = async () => {
    if (!reserva.clienteDni || reserva.clienteDni.length < 6) {
      // el alquiler exige DNI de 6+; si la reserva no tenía, pedirlo
      setError('Esta reserva no tiene DNI del cliente. Edítala o crea el alquiler manualmente con el DNI.');
      return;
    }
    setProcesando(true); setError(null);
    try {
      // Si hay adelanto, se crea como deuda para que el adelanto entre como
      // pago parcial y quede el saldo; si no, se cobra normal según el check.
      const pagado = adelanto > 0 ? false : cobrarAhora;
      await api.post('/alquileres', {
        sedeId: activeSedeId,
        habitacionId: reserva.habitacion.id,
        reservaId: reserva.id,
        clienteNombre: reserva.clienteNombre,
        clienteDni: reserva.clienteDni,
        clienteTelefono: reserva.clienteTelefono || undefined,
        fechaIngreso: new Date().toISOString(),
        fechaSalida: reserva.fin,
        precioHabitacion: Number(precio),
        metodoPago,
        pagado,
      });
      toast({ type: 'success', title: 'Check-in realizado', description: 'La habitación quedó ocupada.' });
      onDone();
    } catch (e: any) {
      setError(e.response?.data?.message || 'No se pudo hacer el check-in');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-hotel text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><LogIn size={18} className="text-emerald-600" /> Check-in</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 text-sm">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2"><BedDouble size={15} /> Hab. {reserva.habitacion.numero} · {reserva.clienteNombre}</div>
            <div className="text-[11px] text-slate-400 mt-1">Reservada {fmt(reserva.inicio)} → {fmt(reserva.fin)}</div>
          </div>

          <Campo label="Precio de la habitación">
            <input type="number" min={0} step="0.01" className={inp} value={precio} onChange={(e) => setPrecio(e.target.value)} />
          </Campo>
          <Campo label="Método de pago">
            <select className={inp} value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
              {['EFECTIVO', 'YAPE', 'PLIN', 'VISA', 'MASTERCARD', 'OTRO'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Campo>

          {adelanto > 0 ? (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 rounded-xl p-3 text-sm">
              <div className="flex items-center justify-between"><span>Adelanto ya dado</span><b>- {money(adelanto)}</b></div>
              <div className="flex items-center justify-between mt-1 pt-1 border-t border-emerald-200/60"><span className="font-semibold">Saldo a cobrar</span><b>{money(saldo)}</b></div>
              <div className="text-[10px] mt-1 opacity-80">El adelanto se registra como pago parcial; cobra el saldo desde el alquiler.</div>
            </div>
          ) : (
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={cobrarAhora} onChange={(e) => setCobrarAhora(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
              <span className="text-sm text-slate-700 dark:text-slate-200">Cobrar ahora ({money(Number(precio || 0))})</span>
            </label>
          )}

          {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">{error}</div>}
        </div>
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex gap-2">
          <button onClick={onClose} className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl font-medium">Cancelar</button>
          <button onClick={confirmar} disabled={procesando} className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-semibold shadow-md disabled:opacity-40">
            {procesando ? 'Procesando…' : 'Confirmar check-in'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = 'w-full bg-white dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30';

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
