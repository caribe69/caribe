import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building,
  Plus,
  Star,
  FileText,
  X,
  AlertCircle,
  Pencil,
  Power,
  MapPin,
  Navigation,
  Camera,
} from 'lucide-react';
import React, { useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/components/ToastProvider';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import SunatSeriesSection from '@/components/SunatSeriesSection';

export default function Sedes() {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const usuario = useAuthStore((s) => s.usuario);
  const esSuperadmin = usuario?.rol === 'SUPERADMIN';
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ nombre: '', direccion: '', telefono: '' });
  const [editar, setEditar] = useState<any | null>(null);
  const [sunatPara, setSunatPara] = useState<{
    id: number;
    nombre: string;
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['sedes'],
    queryFn: async () => (await api.get<any[]>('/sedes')).data,
  });

  // Para detectar qué sedes NO tienen ninguna serie configurada (badge ⚠)
  const seriesQ = useQuery<Array<{ sedeId: number; tipo: string }>>({
    queryKey: ['sunat-series'],
    queryFn: async () => (await api.get('/sunat-series')).data,
  });

  // Map: sedeId → { boleta: bool, factura: bool }
  const sunatBySede = new Map<number, { boleta: boolean; factura: boolean }>();
  for (const s of seriesQ.data || []) {
    const entry = sunatBySede.get(s.sedeId) || { boleta: false, factura: false };
    if (s.tipo === 'BOLETA') entry.boleta = true;
    if (s.tipo === 'FACTURA') entry.factura = true;
    sunatBySede.set(s.sedeId, entry);
  }

  const pag = usePagination(data, 10);

  const crear = useMutation({
    mutationFn: async () => (await api.post('/sedes', form)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sedes'] });
      setShow(false);
      setForm({ nombre: '', direccion: '', telefono: '' });
    },
  });

  const marcarPrincipal = useMutation({
    mutationFn: async (id: number) =>
      (await api.patch(`/sedes/${id}/principal`)).data,
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['sedes'] });
      toast({
        type: 'success',
        title: 'Sede principal',
        description: `${data.nombre} es ahora la sede principal`,
      });
    },
  });

  const actualizar = useMutation({
    mutationFn: async (payload: {
      id: number;
      nombre: string;
      direccion: string;
      telefono: string;
      latitud?: number | null;
      longitud?: number | null;
    }) => {
      const { id, ...data } = payload;
      return (await api.patch(`/sedes/${id}`, data)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sedes'] });
      setEditar(null);
      toast({ type: 'success', title: 'Sede actualizada' });
    },
    onError: (err: any) =>
      toast({
        type: 'error',
        title: 'No se pudo actualizar',
        description: err.response?.data?.message || err.message,
      }),
  });

  const toggleActiva = useMutation({
    mutationFn: async (id: number) =>
      (await api.patch(`/sedes/${id}/toggle`)).data,
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['sedes'] });
      toast({
        type: 'success',
        title: data.activa ? 'Sede activada' : 'Sede desactivada',
      });
    },
    onError: (err: any) =>
      toast({
        type: 'error',
        title: 'No se pudo cambiar el estado',
        description: err.response?.data?.message || err.message,
      }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="text-sm text-slate-500">
          {data?.length ?? 0} sedes en la red
        </div>
        <button
          onClick={() => setShow(true)}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-violet-500/30 transition btn-press"
        >
          <Plus size={16} /> Nueva sede
        </button>
      </div>

      {isLoading && (
        <div className="text-slate-400 text-center py-12">Cargando...</div>
      )}

      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest w-14">
                #
              </th>
              <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Sede
              </th>
              <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Dirección
              </th>
              <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Teléfono
              </th>
              <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Estado
              </th>
              <th className="text-center px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                SUNAT
              </th>
              {esSuperadmin && (
                <th className="text-right px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {pag.paginated.map((s: any) => (
              <tr
                key={s.id}
                className="border-b border-slate-50 last:border-0 hover:bg-violet-50/30 transition"
              >
                <td className="px-6 py-4 text-slate-400 font-mono">
                  {String(s.id).padStart(2, '0')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        s.esPrincipal
                          ? 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-md shadow-amber-500/30'
                          : 'bg-gradient-to-br from-violet-500 to-violet-700'
                      }`}
                    >
                      {s.esPrincipal ? (
                        <Star
                          size={18}
                          className="text-white fill-white"
                        />
                      ) : (
                        <Building size={18} className="text-white" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">
                        {s.nombre}
                      </div>
                      {s.esPrincipal && (
                        <div className="text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-300 font-bold">
                          ⭐ Sede principal
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">{s.direccion || '—'}</td>
                <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                  {s.telefono || '—'}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      s.activa
                        ? 'bg-emerald-100 text-emerald-700 dark:text-emerald-200'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${s.activa ? 'bg-emerald-500' : 'bg-slate-400'}`}
                    />
                    {s.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {(() => {
                    const sunat = sunatBySede.get(s.id);
                    const tieneAlgo = sunat?.boleta || sunat?.factura;
                    return (
                      <button
                        onClick={() =>
                          setSunatPara({ id: s.id, nombre: s.nombre })
                        }
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition btn-press ${
                          tieneAlgo
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 animate-pulse'
                        }`}
                        title={
                          tieneAlgo
                            ? `B: ${sunat?.boleta ? '✓' : '×'} · F: ${sunat?.factura ? '✓' : '×'}`
                            : 'Sin series configuradas — toca para empezar'
                        }
                      >
                        {tieneAlgo ? (
                          <>
                            <FileText size={12} /> Configurar
                          </>
                        ) : (
                          <>
                            <AlertCircle size={12} /> Configurar SUNAT
                          </>
                        )}
                      </button>
                    );
                  })()}
                </td>
                {esSuperadmin && (
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                      <button
                        onClick={() => setEditar(s)}
                        className="inline-flex items-center gap-1 text-xs bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 px-2.5 py-1.5 rounded-lg transition btn-press"
                        title="Editar datos"
                      >
                        <Pencil size={12} /> Editar
                      </button>
                      {s.latitud != null && s.longitud != null && (
                        <button
                          onClick={() =>
                            window.open(
                              `https://www.google.com/maps/search/?api=1&query=${s.latitud},${s.longitud}`,
                              '_blank',
                              'noopener',
                            )
                          }
                          className="inline-flex items-center gap-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded-lg transition btn-press"
                          title="Abrir en Google Maps"
                        >
                          <Navigation size={12} /> Cómo llegar
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              s.activa
                                ? `¿Desactivar "${s.nombre}"? Los usuarios de esta sede no podrán operar.`
                                : `¿Reactivar "${s.nombre}"?`,
                            )
                          )
                            toggleActiva.mutate(s.id);
                        }}
                        disabled={toggleActiva.isPending}
                        className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition btn-press ${
                          s.activa
                            ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                        }`}
                        title={s.activa ? 'Desactivar' : 'Activar'}
                      >
                        <Power size={12} />
                        {s.activa ? 'Pausar' : 'Activar'}
                      </button>
                      {!s.esPrincipal ? (
                        <button
                          onClick={() => marcarPrincipal.mutate(s.id)}
                          disabled={marcarPrincipal.isPending}
                          className="inline-flex items-center gap-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 px-2.5 py-1.5 rounded-lg transition btn-press"
                        >
                          <Star size={12} /> Principal
                        </button>
                      ) : (
                        <span className="text-[10px] text-amber-600 dark:text-amber-300 font-bold px-2">
                          ✓ Principal
                        </span>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {data?.length === 0 && !isLoading && (
              <tr>
                <td
                  colSpan={esSuperadmin ? 7 : 6}
                  className="px-6 py-16 text-center text-slate-400"
                >
                  <Building
                    size={40}
                    className="mx-auto text-slate-300 mb-2"
                  />
                  Sin sedes registradas
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

      {show && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Nueva sede</h2>
            <div className="space-y-3">
              <input
                placeholder="Nombre"
                className="w-full border rounded-lg px-3 py-2"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
              <input
                placeholder="Dirección"
                className="w-full border rounded-lg px-3 py-2"
                value={form.direccion}
                onChange={(e) =>
                  setForm({ ...form, direccion: e.target.value })
                }
              />
              <input
                placeholder="Teléfono"
                className="w-full border rounded-lg px-3 py-2"
                value={form.telefono}
                onChange={(e) =>
                  setForm({ ...form, telefono: e.target.value })
                }
              />
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShow(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 py-2 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => crear.mutate()}
                  disabled={crear.isPending || !form.nombre}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2 rounded-lg disabled:opacity-50"
                >
                  Crear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar sede */}
      {editar && (
        <EditarSedeModal
          sede={editar}
          onClose={() => setEditar(null)}
          onGuardar={(data) =>
            actualizar.mutate({ id: editar.id, ...data })
          }
          guardando={actualizar.isPending}
        />
      )}

      {/* Modal SUNAT por sede — onboarding amigable */}
      {sunatPara && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setSunatPara(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-700 text-white p-5 flex justify-between items-start z-10">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
                  <FileText size={22} />
                </div>
                <div>
                  <h2 className="font-hotel text-lg font-bold">
                    Series SUNAT · {sunatPara.nombre}
                  </h2>
                  <div className="text-xs opacity-90 mt-0.5">
                    Configura las series de boleta y factura para esta sede
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSunatPara(null)}
                className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              {(() => {
                const sunat = sunatBySede.get(sunatPara.id);
                const tieneAlgo = sunat?.boleta || sunat?.factura;
                if (!tieneAlgo) {
                  return (
                    <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-xl p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle
                          size={20}
                          className="text-amber-600 shrink-0 mt-0.5"
                        />
                        <div className="text-sm text-amber-900 dark:text-amber-100">
                          <div className="font-bold mb-1">
                            Sin series configuradas
                          </div>
                          <div className="text-xs leading-relaxed">
                            Esta sede aún no tiene series SUNAT. Para empezar:
                            <ol className="list-decimal ml-5 mt-2 space-y-1">
                              <li>
                                Entrá a NubeFact con la cuenta de esta sede
                              </li>
                              <li>
                                Mirá el último correlativo emitido (ej. B003 →
                                15946)
                              </li>
                              <li>
                                Tocá <b>"Nueva serie"</b> abajo y cargá esos
                                datos
                              </li>
                            </ol>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div
                      className={`rounded-xl p-3 border ${
                        sunat?.boleta
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-widest font-bold">
                        Boletas
                      </div>
                      <div className="text-xl font-bold">
                        {sunat?.boleta ? '✓ Configurada' : '⚠ Sin serie'}
                      </div>
                    </div>
                    <div
                      className={`rounded-xl p-3 border ${
                        sunat?.factura
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-widest font-bold">
                        Facturas
                      </div>
                      <div className="text-xl font-bold">
                        {sunat?.factura ? '✓ Configurada' : '⚠ Sin serie'}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <SunatSeriesSection sedeId={sunatPara.id} embebido />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Modal editar sede
// ────────────────────────────────────────────────────────────
interface SedeFotoMini {
  id: number;
  path: string;
  orden: number;
}

interface SedeEditable {
  id: number;
  nombre: string;
  direccion?: string | null;
  telefono?: string | null;
  latitud?: string | number | null;
  longitud?: string | number | null;
  fotos?: SedeFotoMini[];
}

function EditarSedeModal({
  sede,
  onClose,
  onGuardar,
  guardando,
}: {
  sede: SedeEditable;
  onClose: () => void;
  onGuardar: (data: {
    nombre: string;
    direccion: string;
    telefono: string;
    latitud?: number | null;
    longitud?: number | null;
  }) => void;
  guardando: boolean;
}) {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const [nombre, setNombre] = useState(sede.nombre);
  const [direccion, setDireccion] = useState(sede.direccion ?? '');
  const [telefono, setTelefono] = useState(sede.telefono ?? '');
  const [latitud, setLatitud] = useState<string>(
    sede.latitud != null ? String(sede.latitud) : '',
  );
  const [longitud, setLongitud] = useState<string>(
    sede.longitud != null ? String(sede.longitud) : '',
  );
  const [obteniendoGps, setObteniendoGps] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const fileInput = React.useRef<HTMLInputElement>(null);

  const fotosQ = useQuery<SedeFotoMini[]>({
    queryKey: ['sedes', 'fotos', sede.id],
    queryFn: async () => (await api.get(`/sedes/${sede.id}/fotos`)).data,
    initialData: sede.fotos || [],
  });

  const eliminarFoto = useMutation({
    mutationFn: async (fotoId: number) =>
      (await api.delete(`/sedes/${sede.id}/fotos/${fotoId}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sedes', 'fotos', sede.id] });
      qc.invalidateQueries({ queryKey: ['sedes'] });
    },
  });

  const subirFotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setSubiendo(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('fotos', f));
      await api.post(`/sedes/${sede.id}/fotos`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      qc.invalidateQueries({ queryKey: ['sedes', 'fotos', sede.id] });
      qc.invalidateQueries({ queryKey: ['sedes'] });
      toast({ type: 'success', title: 'Fotos subidas' });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Error subiendo fotos',
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setSubiendo(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const obtenerGps = () => {
    if (!navigator.geolocation) {
      toast({
        type: 'error',
        title: 'GPS no disponible',
        description: 'Tu navegador no soporta geolocalización',
      });
      return;
    }
    setObteniendoGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitud(pos.coords.latitude.toFixed(7));
        setLongitud(pos.coords.longitude.toFixed(7));
        setObteniendoGps(false);
        toast({
          type: 'success',
          title: 'Ubicación obtenida',
          description: `Precisión: ±${Math.round(pos.coords.accuracy)} m`,
        });
      },
      (err) => {
        setObteniendoGps(false);
        toast({
          type: 'error',
          title: 'No se pudo obtener ubicación',
          description: err.message,
        });
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const abrirEnMaps = () => {
    if (!latitud || !longitud) return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${latitud},${longitud}`,
      '_blank',
      'noopener',
    );
  };

  const fotos = fotosQ.data || [];
  const cambios =
    nombre !== sede.nombre ||
    direccion !== (sede.direccion ?? '') ||
    telefono !== (sede.telefono ?? '') ||
    latitud !== (sede.latitud != null ? String(sede.latitud) : '') ||
    longitud !== (sede.longitud != null ? String(sede.longitud) : '');

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl animate-scale-in max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div>
            <h3 className="font-hotel text-lg font-bold text-slate-900 dark:text-slate-100">
              Editar sede
            </h3>
            <div className="text-xs text-slate-500">
              Datos, ubicación y fotos
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Datos básicos */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Nombre
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full mt-1 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Dirección
            </label>
            <input
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Av. Principal 123, Lima"
              className="w-full mt-1 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Teléfono
            </label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="999-999-999"
              className="w-full mt-1 font-mono border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800"
            />
          </div>

          {/* Geolocalización */}
          <div className="bg-violet-50/60 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/40 rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-violet-700 dark:text-violet-300">
                Ubicación GPS
              </label>
              <button
                type="button"
                onClick={obtenerGps}
                disabled={obteniendoGps}
                className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <MapPin size={12} />
                {obteniendoGps ? 'Obteniendo…' : 'Usar mi ubicación'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={latitud}
                onChange={(e) => setLatitud(e.target.value)}
                placeholder="Latitud"
                inputMode="decimal"
                className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono bg-white dark:bg-slate-800"
              />
              <input
                value={longitud}
                onChange={(e) => setLongitud(e.target.value)}
                placeholder="Longitud"
                inputMode="decimal"
                className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono bg-white dark:bg-slate-800"
              />
            </div>
            {latitud && longitud && (
              <button
                type="button"
                onClick={abrirEnMaps}
                className="w-full text-xs bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-violet-200 dark:border-violet-800/50 text-violet-700 dark:text-violet-300 py-1.5 rounded-lg font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <Navigation size={12} /> Ver en Google Maps
              </button>
            )}
          </div>

          {/* Fotos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Fotos ({fotos.length})
              </label>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={subiendo}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <Camera size={12} />
                {subiendo ? 'Subiendo…' : 'Subir fotos'}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => subirFotos(e.target.files)}
                className="hidden"
              />
            </div>

            {fotos.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center">
                <Camera size={28} className="mx-auto text-slate-300 mb-1" />
                <div className="text-xs text-slate-500">
                  Sin fotos. Subí al menos una para que aparezca en la landing
                  pública.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {fotos.map((f) => (
                  <div key={f.id} className="relative group">
                    <img
                      src={f.path}
                      alt={`Foto ${f.id}`}
                      className="w-full h-20 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => eliminarFoto.mutate(f.id)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs"
                      title="Eliminar"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Cancelar
            </button>
            <button
              onClick={() =>
                onGuardar({
                  nombre,
                  direccion,
                  telefono,
                  latitud: latitud ? Number(latitud) : null,
                  longitud: longitud ? Number(longitud) : null,
                })
              }
              disabled={guardando || !nombre.trim() || !cambios}
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
