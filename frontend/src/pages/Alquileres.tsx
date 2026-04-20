import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList,
  X,
  CheckCircle,
  Plus,
  ShoppingBag,
  BedDouble,
  Grid3x3,
  List,
  Search,
  UserCheck,
  Loader2,
  Printer,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useDialog } from '@/components/ConfirmProvider';
import BoletaAlquiler from '@/components/BoletaAlquiler';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/components/ToastProvider';

interface Habitacion {
  id: number;
  numero: string;
  descripcion?: string;
  caracteristicas?: string;
  precioHora: string;
  precioNoche: string;
  estado: string;
  piso: { id: number; numero: number; nombre?: string };
}

interface Alquiler {
  id: number;
  creadoEn: string;
  clienteNombre: string;
  clienteDni: string;
  fechaIngreso: string;
  fechaSalida: string;
  total: string;
  totalProductos: string;
  precioHabitacion: string;
  metodoPago: string;
  estado: string;
  motivoAnulacion?: string | null;
  habitacion: {
    id: number;
    numero: string;
    descripcion?: string | null;
    piso: { numero: number };
  };
  consumos: Array<{
    id: number;
    cantidad: number;
    precioUnit: string;
    subtotal: string;
    producto: { nombre: string };
  }>;
  creadoPor?: { id?: number; nombre: string; username?: string } | null;
  sede?: { nombre?: string };
}

export default function Alquileres() {
  const [vista, setVista] = useState<'mapa' | 'lista'>('mapa');

  return (
    <div>
      <div className="flex items-center justify-end mb-5">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setVista('mapa')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition btn-press ${
              vista === 'mapa'
                ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-md shadow-violet-500/30'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Grid3x3 size={14} /> Mapa
          </button>
          <button
            onClick={() => setVista('lista')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition btn-press ${
              vista === 'lista'
                ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-md shadow-violet-500/30'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <List size={14} /> Lista
          </button>
        </div>
      </div>

      {vista === 'mapa' ? <MapaHabitaciones /> : <ListaAlquileres />}
    </div>
  );
}

/* ============================================================
 * VISTA DE MAPA: cuadrícula de habitaciones con color por estado
 * ============================================================ */

interface EstadoStyle {
  gradient: string;
  border: string;
  iconBg: string;
  badgeBg: string;
  badgeText: string;
  dot: string;
  numberText: string;
  pricePill: string;
  label: string;
}

const ESTADO_STYLES: Record<string, EstadoStyle> = {
  DISPONIBLE: {
    gradient: 'from-emerald-50 via-white to-emerald-100',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-500',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    dot: 'bg-emerald-500',
    numberText: 'text-emerald-700',
    pricePill: 'bg-emerald-500 text-white',
    label: 'Disponible',
  },
  OCUPADA: {
    gradient: 'from-rose-50 via-white to-rose-100',
    border: 'border-rose-200',
    iconBg: 'bg-rose-500',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-700',
    dot: 'bg-rose-500',
    numberText: 'text-rose-700',
    pricePill: 'bg-rose-500 text-white',
    label: 'Ocupada',
  },
  ALISTANDO: {
    gradient: 'from-amber-50 via-white to-amber-100',
    border: 'border-amber-200',
    iconBg: 'bg-amber-500',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    dot: 'bg-amber-500',
    numberText: 'text-amber-700',
    pricePill: 'bg-amber-500 text-white',
    label: 'Alistando',
  },
  MANTENIMIENTO: {
    gradient: 'from-blue-50 via-white to-blue-100',
    border: 'border-blue-200',
    iconBg: 'bg-blue-500',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    dot: 'bg-blue-500',
    numberText: 'text-blue-700',
    pricePill: 'bg-blue-500 text-white',
    label: 'Mantenimiento',
  },
  FUERA_SERVICIO: {
    gradient: 'from-slate-50 via-white to-slate-100',
    border: 'border-slate-200',
    iconBg: 'bg-slate-500',
    badgeBg: 'bg-slate-200',
    badgeText: 'text-slate-700',
    dot: 'bg-slate-500',
    numberText: 'text-slate-700',
    pricePill: 'bg-slate-500 text-white',
    label: 'Fuera servicio',
  },
};

function MapaHabitaciones() {
  const [reservar, setReservar] = useState<Habitacion | null>(null);
  const [verAlquiler, setVerAlquiler] = useState<Habitacion | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['habitaciones'],
    queryFn: async () =>
      (await api.get<Habitacion[]>('/habitaciones')).data,
  });

  const porEstado = useMemo(() => {
    const r: Record<string, number> = {};
    data?.forEach((h) => (r[h.estado] = (r[h.estado] || 0) + 1));
    return r;
  }, [data]);

  return (
    <div>
      {/* Leyenda */}
      <div className="flex flex-wrap gap-2 mb-5">
        {Object.entries(ESTADO_STYLES).map(([key, s]) => (
          <div
            key={key}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1.5 text-xs shadow-sm"
          >
            <span className={`w-2 h-2 rounded-full ${s.dot}`} />
            <span className="text-slate-700 font-medium">{s.label}</span>
            <span className="text-slate-400">{porEstado[key] || 0}</span>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="text-slate-500 text-center py-12">Cargando...</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 stagger-children">
        {data?.map((h) => {
          const s = ESTADO_STYLES[h.estado] || ESTADO_STYLES.FUERA_SERVICIO;
          const clickable = h.estado === 'DISPONIBLE' || h.estado === 'OCUPADA';
          return (
            <button
              key={h.id}
              disabled={!clickable}
              onClick={() => {
                if (h.estado === 'DISPONIBLE') setReservar(h);
                else if (h.estado === 'OCUPADA') setVerAlquiler(h);
              }}
              className={`group relative text-left bg-gradient-to-br ${s.gradient} border ${s.border} rounded-2xl p-5 shadow-sm transition-all duration-300 ${
                clickable
                  ? 'hover:shadow-xl hover:-translate-y-1 cursor-pointer'
                  : 'cursor-not-allowed opacity-80'
              }`}
            >
              {/* Top row: badge + icon */}
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`inline-flex items-center gap-1.5 ${s.badgeBg} ${s.badgeText} text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${s.iconBg}`} />
                  {s.label}
                </div>
                <div
                  className={`w-11 h-11 rounded-xl ${s.iconBg} flex items-center justify-center shadow-md ${clickable ? 'group-hover:scale-110' : ''} transition-transform`}
                >
                  <BedDouble size={22} className="text-white" />
                </div>
              </div>

              {/* Número grande */}
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Nro
                </span>
                <span
                  className={`font-hotel text-4xl font-bold leading-none ${s.numberText}`}
                >
                  {h.numero}
                </span>
              </div>

              {/* Descripción */}
              <div className="mt-2 text-sm text-slate-700 font-medium line-clamp-1">
                {h.descripcion || 'Habitación estándar'}
              </div>
              {h.caracteristicas && (
                <div className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                  {h.caracteristicas}
                </div>
              )}

              {/* Footer: piso + precio */}
              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-1 h-1 rounded-full bg-slate-400" />
                  Piso {h.piso.numero}
                </div>
                <div
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.pricePill} shadow-sm`}
                >
                  S/ {Number(h.precioHora).toFixed(0)}/h
                </div>
              </div>

              {/* Hover indicator */}
              {clickable && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-60 transition-opacity" />
              )}
            </button>
          );
        })}
      </div>

      {reservar && (
        <NuevoAlquilerModal
          habitacion={reservar}
          onClose={() => setReservar(null)}
        />
      )}
      {verAlquiler && (
        <AlquilerActivoModal
          habitacion={verAlquiler}
          onClose={() => setVerAlquiler(null)}
        />
      )}
    </div>
  );
}

/* ============================================================
 * MODAL: alquiler activo en una habitación OCUPADA
 * ============================================================ */

function AlquilerActivoModal({
  habitacion,
  onClose,
}: {
  habitacion: Habitacion;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const dialog = useDialog();
  const usuario = useAuthStore((s) => s.usuario);
  const toast = useToast();
  const esAdmin =
    usuario?.rol === 'SUPERADMIN' || usuario?.rol === 'ADMIN_SEDE';
  const [addProdOpen, setAddProdOpen] = useState(false);

  // Busca alquiler ACTIVO de esta habitación
  const { data: alquileres } = useQuery({
    queryKey: ['alquileres', 'activo', habitacion.id],
    queryFn: async () =>
      (await api.get<Alquiler[]>('/alquileres?estado=ACTIVO')).data,
  });

  const alquiler = alquileres?.find((a) => a.habitacion.id === habitacion.id);

  const finalizar = useMutation({
    mutationFn: async (id: number) =>
      (await api.patch(`/alquileres/${id}/finalizar`, {})).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alquileres'] });
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
      onClose();
    },
  });

  const anular = useMutation({
    mutationFn: async ({ id, motivo }: { id: number; motivo: string }) =>
      (await api.patch(`/alquileres/${id}/anular`, { motivo })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alquileres'] });
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-violet-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto animate-scale-in shadow-2xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold">Hab. {habitacion.numero}</h2>
            <div className="text-sm text-slate-500">
              Piso {habitacion.piso.numero} · {habitacion.descripcion}
            </div>
          </div>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {!alquiler && (
          <div className="text-slate-500 text-sm py-4">
            Buscando alquiler activo...
          </div>
        )}

        {alquiler && (
          <>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <div className="font-semibold">{alquiler.clienteNombre}</div>
              <div className="text-xs text-slate-600">
                DNI: {alquiler.clienteDni} · {alquiler.metodoPago}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                {new Date(alquiler.fechaIngreso).toLocaleString()} →{' '}
                {new Date(alquiler.fechaSalida).toLocaleString()}
              </div>
            </div>

            <div className="text-sm space-y-1 mb-3">
              <div className="flex justify-between">
                <span>Habitación</span>
                <span>S/ {alquiler.precioHabitacion}</span>
              </div>
              <div className="flex justify-between">
                <span>Productos</span>
                <span>S/ {alquiler.totalProductos}</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t">
                <span>Total</span>
                <span>S/ {alquiler.total}</span>
              </div>
            </div>

            {alquiler.consumos.length > 0 && (
              <div className="text-xs text-slate-600 mb-3">
                <div className="font-semibold mb-1">Consumos:</div>
                {alquiler.consumos.map((c) => (
                  <div key={c.id} className="flex justify-between">
                    <span>
                      {c.producto.nombre} × {c.cantidad}
                    </span>
                    <span>S/ {c.subtotal}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={() => setAddProdOpen(true)}
                className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-lg"
              >
                <ShoppingBag size={16} /> Agregar producto
              </button>
              <button
                onClick={async () => {
                  const ok = await dialog.confirm({
                    title: 'Finalizar alquiler',
                    message:
                      'La habitación pasará a estado Alistando y se creará una tarea de limpieza automáticamente.',
                    confirmText: 'Finalizar',
                    variant: 'success',
                  });
                  if (ok) finalizar.mutate(alquiler.id);
                }}
                className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg btn-press"
              >
                <CheckCircle size={16} /> Finalizar alquiler
              </button>
              <button
                onClick={async () => {
                  if (esAdmin) {
                    const motivo = await dialog.prompt({
                      title: 'Anular alquiler',
                      message:
                        'Escribe el motivo de la anulación. Los productos consumidos volverán al stock.',
                      placeholder: 'Ej. Cliente canceló',
                      confirmText: 'Anular',
                      variant: 'danger',
                      multiline: true,
                      minLength: 3,
                    });
                    if (motivo) anular.mutate({ id: alquiler.id, motivo });
                  } else {
                    // Recepcionista/cajero: solicita al admin
                    const motivo = await dialog.prompt({
                      title: 'Solicitar anulación',
                      message:
                        'La anulación requiere aprobación del administrador. Se abrirá el chat con tu solicitud.',
                      placeholder: 'Explica el motivo al administrador',
                      confirmText: 'Enviar solicitud',
                      variant: 'warning',
                      multiline: true,
                      minLength: 3,
                    });
                    if (motivo) {
                      try {
                        await api.post(
                          `/anulaciones/alquileres/${alquiler.id}`,
                          { motivo },
                        );
                        toast.show({
                          type: 'success',
                          title: 'Solicitud enviada',
                          description:
                            'El administrador recibirá tu solicitud en el chat.',
                        });
                        // Abre el chat (le avisará al admin)
                        window.dispatchEvent(new CustomEvent('chat:open'));
                        onClose();
                      } catch (err: any) {
                        toast.show({
                          type: 'error',
                          title: 'No se pudo enviar',
                          description:
                            err.response?.data?.message || err.message,
                        });
                      }
                    }
                  }
                }}
                className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg btn-press"
              >
                <X size={16} />
                {esAdmin ? 'Anular' : 'Solicitar anulación'}
              </button>
            </div>

            {addProdOpen && (
              <AgregarProductoModal
                alquilerId={alquiler.id}
                onClose={() => setAddProdOpen(false)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * MODAL: nuevo alquiler (con habitación preseleccionada)
 * ============================================================ */

function NuevoAlquilerModal({
  habitacion,
  onClose,
}: {
  habitacion: Habitacion;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    clienteNombre: '',
    clienteDni: '',
    clienteTelefono: '',
    fechaIngreso: new Date().toISOString().slice(0, 16),
    fechaSalida: new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 16),
    precioHabitacion: habitacion.precioHora,
    metodoPago: 'EFECTIVO',
    notas: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [lookup, setLookup] = useState<any | null>(null);

  // Debounced lookup cuando el DNI tiene 8 dígitos
  useEffect(() => {
    const dni = form.clienteDni;
    if (!/^\d{8}$/.test(dni)) {
      setLookup(null);
      return;
    }
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        const { data } = await api.get('/alquileres/clientes/buscar', {
          params: { dni },
        });
        setLookup(data);
        if (data?.encontrado) {
          setForm((f) => ({
            ...f,
            clienteNombre: data.nombre || f.clienteNombre,
            clienteTelefono: data.telefono || f.clienteTelefono,
          }));
        }
      } catch {
        setLookup(null);
      } finally {
        setBuscando(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [form.clienteDni]);

  const crear = useMutation({
    mutationFn: async () => {
      const payload = {
        habitacionId: habitacion.id,
        clienteNombre: form.clienteNombre,
        clienteDni: form.clienteDni,
        clienteTelefono: form.clienteTelefono || undefined,
        fechaIngreso: new Date(form.fechaIngreso).toISOString(),
        fechaSalida: new Date(form.fechaSalida).toISOString(),
        precioHabitacion: Number(form.precioHabitacion),
        metodoPago: form.metodoPago,
        notas: form.notas || undefined,
      };
      return (await api.post('/alquileres', payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alquileres'] });
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Error'),
  });

  return (
    <div className="fixed inset-0 bg-violet-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto animate-scale-in shadow-2xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-bold">Nuevo alquiler</h2>
            <div className="text-sm text-emerald-700 font-medium">
              Hab. {habitacion.numero} · Piso {habitacion.piso.numero}
            </div>
          </div>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          {/* DNI primero con búsqueda automática */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              DNI del cliente
            </label>
            <div className="relative mt-1">
              <input
                inputMode="numeric"
                maxLength={8}
                placeholder="8 dígitos"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 text-sm font-mono focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                value={form.clienteDni}
                onChange={(e) =>
                  setForm({
                    ...form,
                    clienteDni: e.target.value.replace(/\D/g, '').slice(0, 8),
                  })
                }
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {buscando ? (
                  <Loader2 size={16} className="text-violet-500 animate-spin" />
                ) : (
                  <Search size={15} className="text-slate-400" />
                )}
              </div>
            </div>
            {lookup?.fuente === 'local' && (
              <div className="mt-2 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2 text-xs">
                <UserCheck size={14} />
                <span>
                  <b>Cliente recurrente</b> · encontrado en el sistema ·{' '}
                  {lookup.visitas} visita{lookup.visitas === 1 ? '' : 's'} ·
                  última:{' '}
                  {new Date(lookup.ultimaVisita).toLocaleDateString('es-PE')}
                </span>
              </div>
            )}
            {lookup?.fuente === 'reniec' && (
              <div className="mt-2 flex items-center gap-2 bg-violet-50 border border-violet-200 text-violet-800 rounded-lg px-3 py-2 text-xs">
                <Search size={14} />
                <span>
                  <b>Encontrado en RENIEC</b> · {lookup.nombre}
                </span>
              </div>
            )}
            {lookup &&
              !lookup.encontrado &&
              form.clienteDni.length === 8 &&
              !buscando && (
                <div className="mt-2 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 text-xs">
                  <span>
                    <b>No encontrado</b> · no está en el sistema ni en RENIEC.
                    Rellena los datos manualmente.
                  </span>
                </div>
              )}
          </div>

          <input
            placeholder="Nombre del cliente"
            className="w-full border rounded-lg px-3 py-2"
            value={form.clienteNombre}
            onChange={(e) =>
              setForm({ ...form, clienteNombre: e.target.value })
            }
          />
          <input
            placeholder="Teléfono (opcional)"
            className="w-full border rounded-lg px-3 py-2"
            value={form.clienteTelefono}
            onChange={(e) =>
              setForm({ ...form, clienteTelefono: e.target.value })
            }
          />

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">
              Ingreso
              <input
                type="datetime-local"
                className="w-full border rounded-lg px-3 py-2 mt-1"
                value={form.fechaIngreso}
                onChange={(e) =>
                  setForm({ ...form, fechaIngreso: e.target.value })
                }
              />
            </label>
            <label className="text-xs">
              Salida
              <input
                type="datetime-local"
                className="w-full border rounded-lg px-3 py-2 mt-1"
                value={form.fechaSalida}
                onChange={(e) =>
                  setForm({ ...form, fechaSalida: e.target.value })
                }
              />
            </label>
          </div>

          <div>
            <label className="text-xs block mb-1">Precio</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                className="flex-1 border rounded-lg px-3 py-2"
                value={form.precioHabitacion}
                onChange={(e) =>
                  setForm({ ...form, precioHabitacion: e.target.value })
                }
              />
              <button
                type="button"
                onClick={() =>
                  setForm({ ...form, precioHabitacion: habitacion.precioHora })
                }
                className="text-xs px-2 bg-slate-100 hover:bg-slate-200 rounded"
              >
                Hora<br />S/{habitacion.precioHora}
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm({ ...form, precioHabitacion: habitacion.precioNoche })
                }
                className="text-xs px-2 bg-slate-100 hover:bg-slate-200 rounded"
              >
                Noche<br />S/{habitacion.precioNoche}
              </button>
            </div>
          </div>

          <select
            className="w-full border rounded-lg px-3 py-2"
            value={form.metodoPago}
            onChange={(e) => setForm({ ...form, metodoPago: e.target.value })}
          >
            <option value="EFECTIVO">Efectivo</option>
            <option value="VISA">Visa</option>
            <option value="MASTERCARD">Mastercard</option>
            <option value="YAPE">Yape</option>
            <option value="PLIN">Plin</option>
            <option value="OTRO">Otro</option>
          </select>

          <textarea
            placeholder="Notas (opcional)"
            className="w-full border rounded-lg px-3 py-2"
            rows={2}
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
          />

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <button
            onClick={() => crear.mutate()}
            disabled={crear.isPending || !form.clienteNombre || !form.clienteDni}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-60"
          >
            {crear.isPending ? 'Creando...' : 'Crear alquiler'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * MODAL: agregar producto a alquiler
 * ============================================================ */

function AgregarProductoModal({
  alquilerId,
  onClose,
}: {
  alquilerId: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [error, setError] = useState<string | null>(null);

  const productos = useQuery({
    queryKey: ['productos'],
    queryFn: async () => (await api.get<any[]>('/productos')).data,
  });

  const add = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/alquileres/${alquilerId}/consumo`, {
          productoId: Number(productoId),
          cantidad: Number(cantidad),
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alquileres'] });
      qc.invalidateQueries({ queryKey: ['productos'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Error'),
  });

  return (
    <div className="fixed inset-0 bg-violet-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scale-in shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Agregar producto</h2>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3">
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={productoId}
            onChange={(e) => setProductoId(e.target.value)}
          >
            <option value="">Selecciona producto</option>
            {productos.data?.map((p) => (
              <option key={p.id} value={p.id} disabled={p.stock === 0}>
                {p.nombre} · S/ {p.precio} · stock {p.stock}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            placeholder="Cantidad"
            className="w-full border rounded-lg px-3 py-2"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
          <button
            onClick={() => add.mutate()}
            disabled={add.isPending || !productoId || !cantidad}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-lg disabled:opacity-50"
          >
            {add.isPending ? 'Agregando...' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * VISTA DE LISTA (histórica)
 * ============================================================ */

function ListaAlquileres() {
  const qc = useQueryClient();
  const dialog = useDialog();
  const [filtro, setFiltro] = useState<string>('');
  const [boletaAlquiler, setBoletaAlquiler] = useState<Alquiler | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['alquileres', filtro],
    queryFn: async () =>
      (
        await api.get<Alquiler[]>(
          `/alquileres${filtro ? `?estado=${filtro}` : ''}`,
        )
      ).data,
  });

  const anular = useMutation({
    mutationFn: async ({ id, motivo }: { id: number; motivo: string }) =>
      (await api.patch(`/alquileres/${id}/anular`, { motivo })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alquileres'] }),
  });

  const finalizar = useMutation({
    mutationFn: async (id: number) =>
      (await api.patch(`/alquileres/${id}/finalizar`, {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alquileres'] }),
  });

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'ACTIVO', 'FINALIZADO', 'ANULADO'].map((e) => (
          <button
            key={e || 'todos'}
            onClick={() => setFiltro(e)}
            className={`px-3 py-1.5 rounded text-sm ${
              filtro === e
                ? 'bg-brand-500 text-white'
                : 'bg-white border hover:bg-slate-50'
            }`}
          >
            {e || 'Todos'}
          </button>
        ))}
      </div>

      {isLoading && <div>Cargando...</div>}

      <div className="space-y-3">
        {data?.map((a) => (
          <div key={a.id} className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold">
                  #{a.id} · Hab. {a.habitacion.numero} · {a.clienteNombre}
                </div>
                <div className="text-xs text-slate-500">
                  DNI: {a.clienteDni} · {a.metodoPago}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {new Date(a.fechaIngreso).toLocaleString()} →{' '}
                  {new Date(a.fechaSalida).toLocaleString()}
                </div>
                {a.motivoAnulacion && (
                  <div className="text-xs text-red-600 mt-1">
                    Anulado: {a.motivoAnulacion}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">S/ {a.total}</div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    a.estado === 'ACTIVO'
                      ? 'bg-emerald-100 text-emerald-700'
                      : a.estado === 'ANULADO'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {a.estado}
                </span>
              </div>
            </div>

            {a.consumos.length > 0 && (
              <div className="mt-3 text-xs text-slate-600">
                Consumos:{' '}
                {a.consumos
                  .map(
                    (c) =>
                      `${c.producto.nombre} ×${c.cantidad} (S/${c.subtotal})`,
                  )
                  .join(', ')}
              </div>
            )}

            <div className="mt-3 flex gap-2 flex-wrap">
              {a.estado === 'ACTIVO' && (
                <>
                  <button
                    onClick={() => finalizar.mutate(a.id)}
                    className="text-xs flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded"
                  >
                    <CheckCircle size={14} /> Finalizar
                  </button>
                  <button
                    onClick={async () => {
                      const motivo = await dialog.prompt({
                        title: 'Anular alquiler',
                        message:
                          'Escribe el motivo. Se devolverán los productos al stock.',
                        placeholder: 'Ej. Cliente canceló',
                        confirmText: 'Anular',
                        variant: 'danger',
                        multiline: true,
                        minLength: 3,
                      });
                      if (motivo) anular.mutate({ id: a.id, motivo });
                    }}
                    className="text-xs flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded btn-press"
                  >
                    <X size={14} /> Anular
                  </button>
                </>
              )}
              {a.estado !== 'ANULADO' && (
                <button
                  onClick={() => setBoletaAlquiler(a)}
                  className="text-xs flex items-center gap-1 bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded btn-press"
                >
                  <Printer size={14} /> Imprimir boleta
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {boletaAlquiler && (
        <BoletaAlquiler
          alquiler={boletaAlquiler as any}
          onClose={() => setBoletaAlquiler(null)}
        />
      )}
    </div>
  );
}
