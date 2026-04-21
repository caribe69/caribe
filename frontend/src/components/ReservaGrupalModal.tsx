import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Building,
  BedDouble,
  Users,
  Search,
  Loader2,
  CheckCircle,
  UserCheck,
  Briefcase,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

interface Habitacion {
  id: number;
  numero: string;
  descripcion?: string;
  estado: string;
  precioHora: string;
  precioNoche: string;
  piso: { numero: number };
}

export default function ReservaGrupalModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { show: toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [ruc, setRuc] = useState('');
  const [rucData, setRucData] = useState<any | null>(null);
  const [buscandoRuc, setBuscandoRuc] = useState(false);
  const [razonSocial, setRazonSocial] = useState('');
  const [direccion, setDireccion] = useState('');
  const [contactoNombre, setContactoNombre] = useState('');
  const [contactoTelefono, setContactoTelefono] = useState('');

  const ahora = new Date();
  const [fechaIngreso, setFechaIngreso] = useState(
    new Date(ahora.getTime()).toISOString().slice(0, 16),
  );
  const [fechaSalida, setFechaSalida] = useState(
    new Date(ahora.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  );
  const [precioPorHabitacion, setPrecio] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<string>('EFECTIVO');
  const [notas, setNotas] = useState('');

  // huespedes opcionales por habitacion
  const [huespedes, setHuespedes] = useState<
    Record<number, { nombre: string; dni: string; telefono: string }>
  >({});

  const habitaciones = useQuery<Habitacion[]>({
    queryKey: ['habitaciones'],
    queryFn: async () =>
      (await api.get<Habitacion[]>('/habitaciones')).data,
  });

  const disponibles = useMemo(
    () =>
      (habitaciones.data || [])
        .filter((h) => h.estado === 'DISPONIBLE')
        .sort(
          (a, b) =>
            a.piso.numero - b.piso.numero ||
            a.numero.localeCompare(b.numero, 'es', { numeric: true }),
        ),
    [habitaciones.data],
  );

  // Sugerir precio desde la primera habitación seleccionada
  useEffect(() => {
    if (!precioPorHabitacion && seleccion.size > 0) {
      const primera = disponibles.find((h) => seleccion.has(h.id));
      if (primera) setPrecio(primera.precioNoche);
    }
  }, [seleccion, disponibles, precioPorHabitacion]);

  // Debounced lookup de RUC
  useEffect(() => {
    if (!/^(10|15|17|20)\d{9}$/.test(ruc)) {
      setRucData(null);
      return;
    }
    const t = setTimeout(async () => {
      setBuscandoRuc(true);
      try {
        const { data } = await api.get('/alquileres/ruc/buscar', {
          params: { ruc },
        });
        setRucData(data);
        if (data?.encontrado) {
          if (!razonSocial) setRazonSocial(data.razonSocial);
          if (!direccion && data.direccion) setDireccion(data.direccion);
        }
      } catch {
        setRucData(null);
      } finally {
        setBuscandoRuc(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [ruc]);

  const precioNum = Number(precioPorHabitacion) || 0;
  const cantHab = seleccion.size;
  const total = precioNum * cantHab;

  const crear = useMutation({
    mutationFn: async () => {
      const huespedesArr = Object.entries(huespedes)
        .filter(
          ([, v]) =>
            v.nombre.trim() || v.dni.trim() || v.telefono.trim(),
        )
        .map(([habId, v]) => ({
          habitacionId: Number(habId),
          nombre: v.nombre.trim() || undefined,
          dni: v.dni.trim() || undefined,
          telefono: v.telefono.trim() || undefined,
        }));

      return (
        await api.post('/reservas-grupales', {
          habitacionIds: Array.from(seleccion),
          clienteRuc: ruc,
          clienteRazonSocial: razonSocial,
          clienteDireccionFiscal: direccion || undefined,
          contactoNombre: contactoNombre || undefined,
          contactoTelefono: contactoTelefono || undefined,
          fechaIngreso: new Date(fechaIngreso).toISOString(),
          fechaSalida: new Date(fechaSalida).toISOString(),
          precioPorHabitacion: precioNum,
          metodoPago,
          notas: notas || undefined,
          huespedes: huespedesArr.length > 0 ? huespedesArr : undefined,
        })
      ).data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['alquileres'] });
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
      qc.invalidateQueries({ queryKey: ['reservas-grupales'] });
      toast({
        type: 'success',
        title: `Reserva grupal creada`,
        description: `${data.alquileres.length} habitaciones · ${data.clienteRazonSocial}`,
      });
      onClose();
    },
    onError: (err: any) =>
      toast({
        type: 'error',
        title: 'Error',
        description: err.response?.data?.message || err.message,
      }),
  });

  const validoStep1 = cantHab > 0 && precioNum > 0;
  const validoStep2 =
    /^(10|15|17|20)\d{9}$/.test(ruc) && razonSocial.length >= 3;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-400 text-white flex items-center justify-center shadow-md">
              <Briefcase size={20} />
            </div>
            <div>
              <h2 className="font-hotel text-xl font-bold">
                Reserva corporativa
              </h2>
              <div className="text-xs text-slate-500">
                Paso {step} de 3 ·{' '}
                {step === 1
                  ? 'Selecciona habitaciones'
                  : step === 2
                    ? 'Datos de la empresa'
                    : 'Asignar huéspedes (opcional)'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scroll-premium p-5">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  {cantHab > 0 ? (
                    <span>
                      <b className="text-amber-700">{cantHab}</b> habitaciones
                      seleccionadas de {disponibles.length} disponibles
                    </span>
                  ) : (
                    `${disponibles.length} habitaciones disponibles`
                  )}
                </div>
                {disponibles.length > 0 && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() =>
                        setSeleccion(new Set(disponibles.map((h) => h.id)))
                      }
                      className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg"
                    >
                      Todas
                    </button>
                    <button
                      onClick={() => setSeleccion(new Set())}
                      className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg"
                    >
                      Limpiar
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                {disponibles.map((h) => {
                  const sel = seleccion.has(h.id);
                  return (
                    <button
                      key={h.id}
                      onClick={() => {
                        setSeleccion((prev) => {
                          const next = new Set(prev);
                          if (next.has(h.id)) next.delete(h.id);
                          else next.add(h.id);
                          return next;
                        });
                      }}
                      className={`relative p-3 rounded-xl border-2 transition text-left ${
                        sel
                          ? 'border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100 shadow-md'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {sel && (
                        <CheckCircle
                          size={16}
                          className="absolute top-1.5 right-1.5 text-amber-600 fill-amber-100"
                        />
                      )}
                      <BedDouble
                        size={16}
                        className={sel ? 'text-amber-600' : 'text-slate-400'}
                      />
                      <div className="font-hotel text-2xl font-bold mt-1">
                        {h.numero}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Piso {h.piso.numero}
                      </div>
                    </button>
                  );
                })}
              </div>
              {disponibles.length === 0 && (
                <div className="text-center text-slate-400 py-12">
                  No hay habitaciones disponibles en esta sede
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                <Field label="Ingreso">
                  <input
                    type="datetime-local"
                    value={fechaIngreso}
                    onChange={(e) => setFechaIngreso(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  />
                </Field>
                <Field label="Salida">
                  <input
                    type="datetime-local"
                    value={fechaSalida}
                    onChange={(e) => setFechaSalida(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  />
                </Field>
                <Field label="Precio por habitación (S/)">
                  <input
                    type="number"
                    step="0.01"
                    value={precioPorHabitacion}
                    onChange={(e) => setPrecio(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Método de pago">
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TARJETA_VISA">Visa</option>
                    <option value="TARJETA_MASTER">Mastercard</option>
                    <option value="YAPE">Yape</option>
                    <option value="PLIN">Plin</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </Field>
              </div>

              {cantHab > 0 && precioNum > 0 && (
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-2xl p-4 flex items-baseline justify-between">
                  <div className="text-sm text-amber-900">
                    <b>{cantHab}</b> habitaciones × S/ {precioNum.toFixed(2)}
                  </div>
                  <div className="text-3xl font-hotel font-bold text-amber-700 tabular-nums">
                    S/ {total.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                  RUC de la empresa
                </label>
                <div className="relative mt-1">
                  <input
                    value={ruc}
                    onChange={(e) =>
                      setRuc(e.target.value.replace(/\D/g, '').slice(0, 11))
                    }
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="20123456789"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 text-sm font-mono focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {buscandoRuc ? (
                      <Loader2
                        size={15}
                        className="text-amber-500 animate-spin"
                      />
                    ) : (
                      <Search size={14} className="text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {rucData?.fuente === 'local' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <UserCheck size={12} /> Empresa recurrente
                  </div>
                  <div className="text-emerald-700 mt-1">
                    {rucData.visitas} visitas previas
                  </div>
                </div>
              )}
              {rucData?.fuente === 'sunat' && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-xs">
                  <div className="font-bold text-violet-900 flex items-center gap-1.5">
                    <Search size={12} /> Encontrado en SUNAT
                  </div>
                  <div className="text-violet-700 mt-1">
                    {rucData.estado} · {rucData.condicion}
                  </div>
                </div>
              )}
              {rucData &&
                !rucData.encontrado &&
                ruc.length === 11 &&
                !buscandoRuc && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                    <b>No encontrado</b> · completa manualmente los datos abajo
                  </div>
                )}

              <Field label="Razón social">
                <input
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value.toUpperCase())}
                  placeholder="INVERSIONES ABC S.A.C."
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                />
              </Field>

              <Field label="Dirección fiscal (opcional)">
                <input
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                />
              </Field>

              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Persona de contacto (opcional)">
                  <input
                    value={contactoNombre}
                    onChange={(e) => setContactoNombre(e.target.value)}
                    placeholder="Juan Pérez"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                  />
                </Field>
                <Field label="Teléfono contacto (opcional)">
                  <input
                    value={contactoTelefono}
                    onChange={(e) => setContactoTelefono(e.target.value)}
                    placeholder="+51 999 ..."
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                  />
                </Field>
              </div>

              <Field label="Notas (opcional)">
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-amber-400"
                />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-600">
                <div className="flex items-center gap-2 font-semibold text-slate-800 mb-1">
                  <Users size={16} /> Asigna huéspedes (opcional)
                </div>
                Puedes dejar las habitaciones sin asignar y llenar el huésped
                cuando llegue. Se creará el alquiler con el nombre de la
                empresa como placeholder.
              </div>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto scroll-premium">
                {disponibles
                  .filter((h) => seleccion.has(h.id))
                  .map((h) => {
                    const hInfo = huespedes[h.id] || {
                      nombre: '',
                      dni: '',
                      telefono: '',
                    };
                    return (
                      <div
                        key={h.id}
                        className="border border-slate-200 rounded-xl p-3"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white font-hotel font-bold">
                            {h.numero}
                          </div>
                          <div className="text-sm">
                            <div className="font-semibold text-slate-800">
                              Hab. {h.numero}
                            </div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                              Piso {h.piso.numero}
                            </div>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-3 gap-2">
                          <input
                            value={hInfo.nombre}
                            onChange={(e) =>
                              setHuespedes((prev) => ({
                                ...prev,
                                [h.id]: {
                                  ...hInfo,
                                  nombre: e.target.value,
                                },
                              }))
                            }
                            placeholder="Nombre (opcional)"
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                          />
                          <input
                            value={hInfo.dni}
                            onChange={(e) =>
                              setHuespedes((prev) => ({
                                ...prev,
                                [h.id]: {
                                  ...hInfo,
                                  dni: e.target.value
                                    .replace(/\D/g, '')
                                    .slice(0, 8),
                                },
                              }))
                            }
                            placeholder="DNI (opcional)"
                            inputMode="numeric"
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-400"
                          />
                          <input
                            value={hInfo.telefono}
                            onChange={(e) =>
                              setHuespedes((prev) => ({
                                ...prev,
                                [h.id]: {
                                  ...hInfo,
                                  telefono: e.target.value,
                                },
                              }))
                            }
                            placeholder="Tel. (opcional)"
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {step === 1 && cantHab > 0 && (
              <>
                <b className="text-amber-700">{cantHab}</b> habitaciones · Total{' '}
                <b className="text-amber-700">S/ {total.toFixed(2)}</b>
              </>
            )}
            {step === 2 && razonSocial && (
              <>
                FACTURA · RUC {ruc} ·{' '}
                <b className="text-amber-700">{razonSocial}</b>
              </>
            )}
            {step === 3 && (
              <>
                <b className="text-amber-700">
                  {Object.values(huespedes).filter(
                    (v) => v.nombre.trim() || v.dni.trim(),
                  ).length}
                </b>{' '}
                huéspedes asignados de {cantHab}
              </>
            )}
          </div>
          <div className="flex gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-xl font-medium text-sm"
              >
                Atrás
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                disabled={
                  (step === 1 && !validoStep1) || (step === 2 && !validoStep2)
                }
                className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md shadow-amber-500/30 disabled:opacity-40"
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={() => crear.mutate()}
                disabled={crear.isPending}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md shadow-emerald-500/30"
              >
                <CheckCircle size={14} />
                {crear.isPending ? 'Creando...' : 'Crear reserva grupal'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
