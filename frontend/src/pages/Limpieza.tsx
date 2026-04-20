import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Play,
  CheckCircle,
  Upload,
  UserCheck,
  PackageMinus,
  X,
  Clock,
  Camera,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

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
  { key: '', label: 'Todos' },
  { key: 'PENDIENTE', label: 'Pendientes' },
  { key: 'EN_PROCESO', label: 'En proceso' },
  { key: 'COMPLETADA', label: 'Completadas' },
];

export default function Limpieza() {
  const qc = useQueryClient();
  const usuario = useAuthStore((s) => s.usuario);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [asignando, setAsignando] = useState<Tarea | null>(null);
  const [registrandoProd, setRegistrandoProd] = useState<Tarea | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['limpieza', filtroEstado],
    queryFn: async () =>
      (
        await api.get<Tarea[]>(
          `/limpieza${filtroEstado ? `?estado=${filtroEstado}` : ''}`,
        )
      ).data,
  });

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

  // métricas
  const pend = data?.filter((t) => t.estado === 'PENDIENTE').length ?? 0;
  const proc = data?.filter((t) => t.estado === 'EN_PROCESO').length ?? 0;
  const compl = data?.filter((t) => t.estado === 'COMPLETADA').length ?? 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="text-brand-500" />
        <h1 className="text-2xl font-bold">Tareas de limpieza</h1>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Kpi label="Pendientes" value={pend} color="bg-amber-500" />
        <Kpi label="En proceso" value={proc} color="bg-blue-500" />
        <Kpi label="Completadas hoy" value={compl} color="bg-emerald-500" />
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {ESTADOS.map((e) => (
          <button
            key={e.key || 'all'}
            onClick={() => setFiltroEstado(e.key)}
            className={`px-3 py-1.5 rounded text-sm ${
              filtroEstado === e.key
                ? 'bg-brand-500 text-white'
                : 'bg-white border hover:bg-slate-50'
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      {isLoading && <div>Cargando...</div>}

      <div className="space-y-3">
        {data?.map((t) => (
          <div key={t.id} className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="flex justify-between items-start gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="font-semibold">
                  #{t.id} · Hab. {t.habitacion.numero} (Piso{' '}
                  {t.habitacion.piso.numero})
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  {t.asignadaA ? (
                    <span className="flex items-center gap-1">
                      <UserCheck size={12} /> {t.asignadaA.nombre}
                    </span>
                  ) : (
                    <span className="text-amber-600">Sin asignar</span>
                  )}
                  <span>·</span>
                  <Clock size={12} />
                  <span>
                    Creada: {new Date(t.creadaEn).toLocaleString()}
                  </span>
                </div>
                {t.notas && (
                  <div className="text-xs text-slate-600 mt-1">{t.notas}</div>
                )}
              </div>
              <EstadoBadge estado={t.estado} />
            </div>

            {/* Fotos */}
            {t.fotos.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {t.fotos.map((f) => (
                  <a
                    key={f.id}
                    href={f.path}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={f.path}
                      className="w-20 h-20 object-cover rounded border hover:scale-105 transition"
                    />
                  </a>
                ))}
              </div>
            )}

            {/* Productos usados */}
            {t.productosUsados.length > 0 && (
              <div className="mt-3 text-xs text-slate-600">
                <span className="font-medium">Productos usados:</span>{' '}
                {t.productosUsados
                  .map(
                    (p) =>
                      `${p.producto.nombre} (${p.cantidad} ${p.producto.unidad})`,
                  )
                  .join(', ')}
              </div>
            )}

            {/* Acciones */}
            <div className="mt-3 flex gap-2 flex-wrap">
              {puedeAsignar && t.estado !== 'COMPLETADA' && (
                <button
                  onClick={() => setAsignando(t)}
                  className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded"
                >
                  <UserCheck size={14} /> Asignar
                </button>
              )}
              {t.estado === 'PENDIENTE' && (
                <button
                  onClick={() => iniciar.mutate(t.id)}
                  className="text-xs flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded"
                >
                  <Play size={14} /> Iniciar
                </button>
              )}
              {t.estado === 'EN_PROCESO' && (
                <>
                  <label className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded cursor-pointer">
                    <Camera size={14} /> Subir fotos
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
                  <button
                    onClick={() => setRegistrandoProd(t)}
                    className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded"
                  >
                    <PackageMinus size={14} /> Registrar producto
                  </button>
                  <button
                    disabled={t.fotos.length === 0 || completar.isPending}
                    title={
                      t.fotos.length === 0
                        ? 'Debes subir al menos una foto de evidencia'
                        : 'Finalizar limpieza'
                    }
                    onClick={() => {
                      if (
                        confirm(
                          '¿Finalizar? La habitación pasará a DISPONIBLE.',
                        )
                      )
                        completar.mutate(t.id);
                    }}
                    className="text-xs flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle size={14} /> Finalizar
                    {t.fotos.length === 0 && ' (requiere foto)'}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {data?.length === 0 && !isLoading && (
          <div className="text-center text-slate-500 py-12 bg-white rounded-xl border">
            No hay tareas de limpieza{' '}
            {filtroEstado && `en estado ${filtroEstado}`}.
          </div>
        )}
      </div>

      {asignando && (
        <AsignarModal
          tarea={asignando}
          onClose={() => setAsignando(null)}
        />
      )}
      {registrandoProd && (
        <RegistrarProductoModal
          tarea={registrandoProd}
          onClose={() => setRegistrandoProd(null)}
        />
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border flex items-center gap-3">
      <div
        className={`w-3 h-10 rounded-full ${color}`}
        aria-hidden
      />
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const cls =
    estado === 'PENDIENTE'
      ? 'bg-amber-100 text-amber-700'
      : estado === 'EN_PROCESO'
        ? 'bg-blue-100 text-blue-700'
        : estado === 'COMPLETADA'
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-100 text-slate-700';
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${cls}`}>
      {estado}
    </span>
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
    <Modal title={`Asignar tarea #${tarea.id}`} onClose={onClose}>
      <div className="text-sm text-slate-600">
        Habitación {tarea.habitacion.numero}
      </div>
      <select
        className="w-full border rounded-lg px-3 py-2"
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
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onClose}
          className="flex-1 bg-slate-100 hover:bg-slate-200 py-2 rounded-lg"
        >
          Cancelar
        </button>
        <button
          onClick={() => asignar.mutate()}
          disabled={asignar.isPending || !asignadaAId}
          className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2 rounded-lg disabled:opacity-50"
        >
          Asignar
        </button>
      </div>
    </Modal>
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
    queryFn: async () =>
      (await api.get<any[]>('/productos-limpieza')).data,
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
    <Modal title={`Registrar producto usado - Tarea #${tarea.id}`} onClose={onClose}>
      <select
        className="w-full border rounded-lg px-3 py-2"
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
        className="w-full border rounded-lg px-3 py-2"
        value={cantidad}
        onChange={(e) => setCantidad(e.target.value)}
      />
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onClose}
          className="flex-1 bg-slate-100 hover:bg-slate-200 py-2 rounded-lg"
        >
          Cancelar
        </button>
        <button
          onClick={() => registrar.mutate()}
          disabled={registrar.isPending || !productoId || !cantidad}
          className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2 rounded-lg disabled:opacity-50"
        >
          Registrar
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}
