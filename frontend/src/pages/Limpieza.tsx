import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Play,
  CheckCircle,
  UserCheck,
  PackageMinus,
  X,
  Images,
  Camera,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useDialog } from '@/components/ConfirmProvider';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';

interface Tarea {
  id: number;
  estado: string;
  notas?: string;
  iniciadaEn?: string | null;
  completadaEn?: string | null;
  creadaEn: string;
  habitacion: { id: number; numero: string; piso: { numero: number } };
  asignadaA?: { id: number; nombre: string; username: string } | null;
  fotos: Array<{ id: number; path: string }>;
  productosUsados: Array<{
    id: number;
    cantidad: number;
    producto: { nombre: string; unidad: string };
  }>;
}

const ESTADOS = [
  { key: '', label: 'Todas' },
  { key: 'PENDIENTE', label: 'Pendientes' },
  { key: 'EN_PROCESO', label: 'Limpiando' },
  { key: 'COMPLETADA', label: 'Completadas' },
];

export default function Limpieza() {
  const qc = useQueryClient();
  const dialog = useDialog();
  const usuario = useAuthStore((s) => s.usuario);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [asignando, setAsignando] = useState<Tarea | null>(null);
  const [registrandoProd, setRegistrandoProd] = useState<Tarea | null>(null);
  const [verFotos, setVerFotos] = useState<Tarea | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['limpieza', filtroEstado],
    queryFn: async () =>
      (
        await api.get<Tarea[]>(
          `/limpieza${filtroEstado ? `?estado=${filtroEstado}` : ''}`,
        )
      ).data,
  });

  const pag = usePagination(data, 15);

  const iniciar = useMutation({
    mutationFn: async (id: number) =>
      (await api.patch(`/limpieza/${id}/iniciar`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['limpieza'] }),
  });

  const completar = useMutation({
    mutationFn: async (id: number) =>
      (await api.patch(`/limpieza/${id}/completar`, {})).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['limpieza'] });
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
    },
  });

  const subirFotos = useMutation({
    mutationFn: async ({ id, files }: { id: number; files: FileList }) => {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('fotos', f));
      return (
        await api.post(`/limpieza/${id}/fotos`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      ).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['limpieza'] }),
  });

  const puedeAsignar =
    usuario?.rol === 'SUPERADMIN' ||
    usuario?.rol === 'ADMIN_SEDE' ||
    usuario?.rol === 'HOTELERO';

  const pend = data?.filter((t) => t.estado === 'PENDIENTE').length ?? 0;
  const proc = data?.filter((t) => t.estado === 'EN_PROCESO').length ?? 0;
  const compl = data?.filter((t) => t.estado === 'COMPLETADA').length ?? 0;

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Kpi label="Pendientes" value={pend} dot="bg-amber-500" />
        <Kpi label="Limpiando" value={proc} dot="bg-blue-500" />
        <Kpi label="Completadas" value={compl} dot="bg-emerald-500" />
      </div>

      {/* Filtros pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {ESTADOS.map((e) => (
          <button
            key={e.key || 'all'}
            onClick={() => setFiltroEstado(e.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition btn-press ${
              filtroEstado === e.key
                ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-md shadow-violet-500/30'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-400'
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="text-slate-400 text-center py-12">Cargando...</div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <Th>#</Th>
              <Th>Habitación</Th>
              <Th>Estado</Th>
              <Th>Asignada</Th>
              <Th>Creada</Th>
              <Th>Evidencias</Th>
              <Th>Productos</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {pag.paginated.map((t) => (
              <tr
                key={t.id}
                className="border-b border-slate-50 last:border-0 hover:bg-violet-50/30 transition"
              >
                <Td>
                  <span className="font-mono text-xs text-slate-400">
                    #{String(t.id).padStart(3, '0')}
                  </span>
                </Td>
                <Td>
                  <div className="font-semibold text-slate-800">
                    Hab. {t.habitacion.numero}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Piso {t.habitacion.piso.numero}
                  </div>
                </Td>
                <Td>
                  <EstadoBadge estado={t.estado} />
                </Td>
                <Td>
                  {t.asignadaA ? (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white font-bold text-[11px] flex items-center justify-center">
                        {t.asignadaA.nombre?.[0]?.toUpperCase()}
                      </div>
                      <span className="text-xs text-slate-700">
                        {t.asignadaA.nombre}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-600">Sin asignar</span>
                  )}
                </Td>
                <Td>
                  <span className="text-xs text-slate-500">
                    {new Date(t.creadaEn).toLocaleString('es-PE', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </Td>
                <Td>
                  <button
                    disabled={t.fotos.length === 0}
                    onClick={() => setVerFotos(t)}
                    className="inline-flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-violet-100 hover:text-violet-700 text-slate-700 px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed btn-press transition"
                  >
                    <Images size={13} /> {t.fotos.length}
                  </button>
                </Td>
                <Td>
                  <span className="text-xs text-slate-600">
                    {t.productosUsados.length
                      ? `${t.productosUsados.length} usados`
                      : '—'}
                  </span>
                </Td>
                <Td className="text-right">
                  <div className="inline-flex gap-1.5">
                    {puedeAsignar && t.estado !== 'COMPLETADA' && (
                      <IconBtn
                        title="Asignar"
                        onClick={() => setAsignando(t)}
                        Icon={UserCheck}
                      />
                    )}
                    {t.estado === 'PENDIENTE' && (
                      <IconBtn
                        title="Iniciar limpieza"
                        onClick={() => iniciar.mutate(t.id)}
                        Icon={Play}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      />
                    )}
                    {t.estado === 'EN_PROCESO' && (
                      <>
                        <label
                          title="Subir fotos"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer btn-press"
                        >
                          <Camera size={13} />
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.length)
                                subirFotos.mutate({
                                  id: t.id,
                                  files: e.target.files,
                                });
                            }}
                          />
                        </label>
                        <IconBtn
                          title="Registrar producto usado"
                          onClick={() => setRegistrandoProd(t)}
                          Icon={PackageMinus}
                        />
                        <IconBtn
                          title={
                            t.fotos.length === 0
                              ? 'Sube al menos 1 foto'
                              : 'Finalizar'
                          }
                          disabled={t.fotos.length === 0}
                          onClick={async () => {
                            const ok = await dialog.confirm({
                              title: 'Finalizar limpieza',
                              message:
                                'La habitación pasará a Disponible y podrá alquilarse.',
                              confirmText: 'Finalizar',
                              variant: 'success',
                            });
                            if (ok) completar.mutate(t.id);
                          }}
                          Icon={CheckCircle}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white disabled:bg-slate-200 disabled:text-slate-400"
                        />
                      </>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
            {pag.paginated.length === 0 && !isLoading && (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-16 text-center text-slate-400"
                >
                  <Sparkles
                    size={40}
                    className="mx-auto text-slate-300 mb-2"
                  />
                  Sin tareas de limpieza
                  {filtroEstado && ` en estado ${filtroEstado}`}
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

      {asignando && (
        <AsignarModal tarea={asignando} onClose={() => setAsignando(null)} />
      )}
      {registrandoProd && (
        <RegistrarProductoModal
          tarea={registrandoProd}
          onClose={() => setRegistrandoProd(null)}
        />
      )}
      {verFotos && (
        <FotosModal tarea={verFotos} onClose={() => setVerFotos(null)} />
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  dot,
}: {
  label: string;
  value: number;
  dot: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
      <div className={`w-3 h-10 rounded-full ${dot}`} />
      <div>
        <div className="text-[11px] text-slate-500 uppercase tracking-widest">
          {label}
        </div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
      </div>
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
      className={`text-left px-5 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest ${className}`}
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

function IconBtn({
  title,
  onClick,
  Icon,
  className = '',
  disabled = false,
}: {
  title: string;
  onClick: () => void;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 btn-press transition disabled:cursor-not-allowed ${className}`}
    >
      <Icon size={13} />
    </button>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    PENDIENTE: { cls: 'bg-amber-100 text-amber-700', label: 'Pendiente' },
    EN_PROCESO: { cls: 'bg-blue-100 text-blue-700', label: 'Limpiando' },
    COMPLETADA: { cls: 'bg-emerald-100 text-emerald-700', label: 'Completada' },
    CANCELADA: { cls: 'bg-slate-100 text-slate-700', label: 'Cancelada' },
  };
  const c = cfg[estado] || cfg.CANCELADA;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold ${c.cls}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {c.label}
    </span>
  );
}

function FotosModal({ tarea, onClose }: { tarea: Tarea; onClose: () => void }) {
  const [activa, setActiva] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-scale-in shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-widest">
              Evidencias · Tarea #{tarea.id}
            </div>
            <h2 className="font-hotel text-xl font-bold text-slate-900">
              Habitación {tarea.habitacion.numero} · {tarea.fotos.length}{' '}
              foto{tarea.fotos.length === 1 ? '' : 's'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 btn-press"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto scroll-premium">
          {tarea.fotos.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Camera size={40} className="mx-auto text-slate-300 mb-2" />
              Sin evidencias aún
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {tarea.fotos.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiva(f.path)}
                  className="group relative aspect-square bg-slate-100 rounded-xl overflow-hidden hover:shadow-lg transition"
                >
                  <img
                    src={f.path}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      const t = e.currentTarget as HTMLImageElement;
                      t.style.display = 'none';
                      const sib = t.nextElementSibling as HTMLElement | null;
                      if (sib) sib.style.display = 'flex';
                    }}
                  />
                  <div
                    className="absolute inset-0 items-center justify-center text-slate-400 text-xs"
                    style={{ display: 'none' }}
                  >
                    No disponible
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 text-[10px] text-white opacity-0 group-hover:opacity-100 transition">
                    Ver completa
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {tarea.productosUsados.length > 0 && (
          <div className="p-5 border-t border-slate-100 bg-slate-50">
            <div className="text-xs text-slate-500 uppercase tracking-widest mb-2">
              Productos usados
            </div>
            <div className="flex flex-wrap gap-2">
              {tarea.productosUsados.map((u) => (
                <span
                  key={u.id}
                  className="text-xs bg-white border border-slate-200 rounded-full px-3 py-1"
                >
                  <span className="font-semibold text-slate-800">
                    {u.producto.nombre}
                  </span>{' '}
                  <span className="text-slate-500">
                    {u.cantidad} {u.producto.unidad}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {activa && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[90] animate-fade-in"
          onClick={() => setActiva(null)}
        >
          <img
            src={activa}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
          <button
            onClick={() => setActiva(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center btn-press"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

function AsignarModal({
  tarea,
  onClose,
}: {
  tarea: Tarea;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [asignadaAId, setAsignadaAId] = useState(
    tarea.asignadaA?.id ? String(tarea.asignadaA.id) : '',
  );
  const [error, setError] = useState<string | null>(null);

  const limpiadoras = useQuery({
    queryKey: ['usuarios', 'limpieza'],
    queryFn: async () =>
      (await api.get<any[]>('/usuarios?rol=LIMPIEZA')).data,
  });

  const asignar = useMutation({
    mutationFn: async () =>
      (
        await api.patch(`/limpieza/${tarea.id}/asignar`, {
          asignadaAId: Number(asignadaAId),
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['limpieza'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Error'),
  });

  return (
    <ModalShell title={`Asignar tarea #${tarea.id}`} onClose={onClose}>
      <div className="text-sm text-slate-600 mb-3">
        Habitación {tarea.habitacion.numero}
      </div>
      <select
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-violet-100 focus:border-violet-400 outline-none"
        value={asignadaAId}
        onChange={(e) => setAsignadaAId(e.target.value)}
      >
        <option value="">Selecciona personal de limpieza</option>
        {limpiadoras.data?.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nombre} ({u.username})
          </option>
        ))}
      </select>
      {error && <ErrorBox msg={error} />}
      <div className="flex gap-2 pt-4">
        <button
          onClick={onClose}
          className="flex-1 bg-slate-100 hover:bg-slate-200 py-2.5 rounded-xl text-slate-700 btn-press"
        >
          Cancelar
        </button>
        <button
          onClick={() => asignar.mutate()}
          disabled={asignar.isPending || !asignadaAId}
          className="flex-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white py-2.5 rounded-xl disabled:opacity-50 btn-press"
        >
          Asignar
        </button>
      </div>
    </ModalShell>
  );
}

function RegistrarProductoModal({
  tarea,
  onClose,
}: {
  tarea: Tarea;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [error, setError] = useState<string | null>(null);

  const productos = useQuery({
    queryKey: ['productos-limpieza'],
    queryFn: async () => (await api.get<any[]>('/productos-limpieza')).data,
  });

  const registrar = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/limpieza/${tarea.id}/uso-producto`, {
          productoId: Number(productoId),
          cantidad: Number(cantidad),
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['limpieza'] });
      qc.invalidateQueries({ queryKey: ['productos-limpieza'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Error'),
  });

  return (
    <ModalShell title={`Producto usado · Tarea #${tarea.id}`} onClose={onClose}>
      <div className="space-y-3">
        <select
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-violet-100 focus:border-violet-400 outline-none"
          value={productoId}
          onChange={(e) => setProductoId(e.target.value)}
        >
          <option value="">Selecciona producto de limpieza</option>
          {productos.data?.map((p) => (
            <option key={p.id} value={p.id} disabled={p.stock === 0}>
              {p.nombre} · stock {p.stock} {p.unidad}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          placeholder="Cantidad usada"
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-violet-100 focus:border-violet-400 outline-none"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
        />
        {error && <ErrorBox msg={error} />}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 py-2.5 rounded-xl text-slate-700 btn-press"
          >
            Cancelar
          </button>
          <button
            onClick={() => registrar.mutate()}
            disabled={registrar.isPending || !productoId || !cantidad}
            className="flex-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white py-2.5 rounded-xl disabled:opacity-50 btn-press"
          >
            Registrar
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-hotel text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 btn-press"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
      {msg}
    </div>
  );
}
