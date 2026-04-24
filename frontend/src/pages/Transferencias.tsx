import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Send,
  Package,
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  X,
  CheckCircle,
  Clock,
  Building,
  Truck,
  Search,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/components/ToastProvider';
import { useDialog } from '@/components/ConfirmProvider';

interface Sede {
  id: number;
  nombre: string;
  activa: boolean;
  esPrincipal: boolean;
}

interface Producto {
  id: number;
  nombre: string;
  precio: string;
  stock: number;
  sedeId: number;
}

interface TransferenciaItem {
  id: number;
  nombreProducto: string;
  precio: string;
  cantidad: number;
  productoOrigenId: number;
  productoDestinoId: number | null;
}

interface Transferencia {
  id: number;
  estado: 'ENVIADA' | 'RECIBIDA' | 'RECHAZADA' | 'CANCELADA';
  notas: string | null;
  motivoRechazo: string | null;
  creadoEn: string;
  recibidoEn: string | null;
  sedeOrigen: { id: number; nombre: string };
  sedeDestino: { id: number; nombre: string };
  creadoPor: { id: number; nombre: string };
  recibidoPor: { id: number; nombre: string } | null;
  items: TransferenciaItem[];
}

export default function Transferencias() {
  const activeSedeId = useAuthStore((s) => s.activeSedeId);
  const [tab, setTab] = useState<'todas' | 'enviadas' | 'recibidas'>('todas');
  const [nueva, setNueva] = useState(false);
  const [detalle, setDetalle] = useState<Transferencia | null>(null);

  const sedes = useQuery<Sede[]>({
    queryKey: ['sedes'],
    queryFn: async () => (await api.get<Sede[]>('/sedes')).data,
  });

  const misData = sedes.data || [];
  const sedeActual = misData.find((s) => s.id === activeSedeId);
  const sedePrincipal = misData.find((s) => s.esPrincipal);
  const esPrincipal = sedeActual?.esPrincipal ?? false;

  const lista = useQuery<Transferencia[]>({
    queryKey: ['transferencias', tab, activeSedeId],
    queryFn: async () =>
      (
        await api.get<Transferencia[]>('/transferencias', {
          params: { direccion: tab },
        })
      ).data,
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 shadow-sm flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-md">
            <Truck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-hotel text-xl font-bold text-slate-900">
                Transferencias entre sedes
              </h1>
              {esPrincipal && (
                <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full shadow-md shadow-amber-500/30 dark:shadow-amber-900/40">
                  ⭐ Sede principal
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500">
              {sedePrincipal
                ? `Origen: ${sedePrincipal.nombre}`
                : 'No hay sede principal configurada'}
            </div>
          </div>
        </div>
        {esPrincipal && (
          <button
            onClick={() => setNueva(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-violet-500/30 dark:shadow-violet-900/40 btn-press"
          >
            <Plus size={16} /> Nueva transferencia
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-3xl p-2 shadow-sm inline-flex">
        {(
          [
            ['todas', 'Todas'],
            ['enviadas', 'Enviadas'],
            ['recibidas', 'Recibidas'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              tab === key
                ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-500">
              <th className="text-left px-5 py-3">#</th>
              <th className="text-left px-5 py-3">Fecha</th>
              <th className="text-left px-5 py-3">Ruta</th>
              <th className="text-left px-5 py-3">Items</th>
              <th className="text-left px-5 py-3">Creado por</th>
              <th className="text-left px-5 py-3">Estado</th>
              <th className="text-right px-5 py-3">Acción</th>
            </tr>
          </thead>
          <tbody>
            {lista.isLoading && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                  Cargando...
                </td>
              </tr>
            )}
            {lista.data?.length === 0 && !lista.isLoading && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                  <Package
                    size={32}
                    className="mx-auto mb-2 text-slate-300"
                  />
                  Sin transferencias en esta vista
                </td>
              </tr>
            )}
            {lista.data?.map((t) => {
              const esEntrante = t.sedeDestino.id === activeSedeId;
              return (
                <tr
                  key={t.id}
                  className="border-b border-slate-50 last:border-0 hover:bg-violet-50/30 transition cursor-pointer"
                  onClick={() => setDetalle(t)}
                >
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">
                    #{String(t.id).padStart(4, '0')}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-600">
                    {new Date(t.creadoEn).toLocaleString('es-PE', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={
                          esEntrante
                            ? 'text-slate-500'
                            : 'font-semibold text-slate-800'
                        }
                      >
                        {t.sedeOrigen.nombre}
                      </span>
                      {esEntrante ? (
                        <ArrowDownRight size={14} className="text-emerald-500" />
                      ) : (
                        <ArrowUpRight size={14} className="text-violet-500" />
                      )}
                      <span
                        className={
                          esEntrante
                            ? 'font-semibold text-slate-800'
                            : 'text-slate-500'
                        }
                      >
                        {t.sedeDestino.nombre}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs">
                    <div className="font-semibold text-slate-700">
                      {t.items.length} producto{t.items.length === 1 ? '' : 's'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {t.items.reduce((s, i) => s + i.cantidad, 0)} unid.
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-600">
                    {t.creadoPor.nombre}
                  </td>
                  <td className="px-5 py-3">
                    <EstadoBadge estado={t.estado} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetalle(t);
                      }}
                      className="inline-flex items-center gap-1 text-xs bg-slate-100 hover:bg-violet-100 hover:text-violet-700 dark:hover:text-violet-200 text-slate-700 px-3 py-1.5 rounded-lg transition"
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {nueva && esPrincipal && (
        <NuevaTransferenciaModal
          sedes={misData.filter((s) => s.id !== activeSedeId && s.activa)}
          onClose={() => setNueva(false)}
        />
      )}
      {detalle && (
        <DetalleTransferenciaModal
          transferencia={detalle}
          onClose={() => setDetalle(null)}
        />
      )}
    </div>
  );
}

function EstadoBadge({ estado }: { estado: Transferencia['estado'] }) {
  const map = {
    ENVIADA: {
      bg: 'bg-amber-100',
      text: 'text-amber-800 dark:text-amber-200',
      Icon: Clock,
    },
    RECIBIDA: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-800 dark:text-emerald-200',
      Icon: CheckCircle,
    },
    RECHAZADA: {
      bg: 'bg-rose-100',
      text: 'text-rose-800 dark:text-rose-200',
      Icon: X,
    },
    CANCELADA: {
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      Icon: X,
    },
  };
  const s = map[estado];
  const Icon = s.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${s.bg} ${s.text}`}
    >
      <Icon size={10} />
      {estado}
    </span>
  );
}

function NuevaTransferenciaModal({
  sedes,
  onClose,
}: {
  sedes: Sede[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const [sedeDestinoId, setSedeDestinoId] = useState<number | null>(null);
  const [notas, setNotas] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [seleccion, setSeleccion] = useState<Record<number, number>>({}); // productoId → cantidad

  const productos = useQuery<Producto[]>({
    queryKey: ['productos'],
    queryFn: async () => (await api.get<Producto[]>('/productos')).data,
  });

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos.data || [];
    return (productos.data || []).filter((p) =>
      p.nombre.toLowerCase().includes(q),
    );
  }, [productos.data, busqueda]);

  const totalItems = Object.values(seleccion).reduce((s, v) => s + v, 0);
  const productosSel = Object.keys(seleccion).length;

  const crear = useMutation({
    mutationFn: async () =>
      (
        await api.post('/transferencias', {
          sedeDestinoId,
          notas: notas || undefined,
          items: Object.entries(seleccion).map(([id, cant]) => ({
            productoOrigenId: Number(id),
            cantidad: cant,
          })),
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transferencias'] });
      qc.invalidateQueries({ queryKey: ['productos'] });
      toast({
        type: 'success',
        title: 'Transferencia enviada',
        description: `${productosSel} productos · ${totalItems} unidades`,
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

  const valido = sedeDestinoId !== null && productosSel > 0;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-scale-in">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <div>
            <h2 className="font-hotel text-xl font-bold">Nueva transferencia</h2>
            <div className="text-xs text-slate-500">
              Desde la sede principal a otra sede
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto scroll-premium flex-1">
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Sede destino
            </label>
            <select
              value={sedeDestinoId ?? ''}
              onChange={(e) => setSedeDestinoId(Number(e.target.value) || null)}
              className="mt-1 w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            >
              <option value="">— Elige sede destino —</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Productos a enviar
            </label>
            <div className="relative mt-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-violet-400"
              />
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 max-h-72 overflow-y-auto scroll-premium">
            {filtrados.length === 0 && (
              <div className="text-center text-slate-400 text-sm py-8">
                Sin productos
              </div>
            )}
            {filtrados.map((p) => {
              const cant = seleccion[p.id] || 0;
              const activo = cant > 0;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 p-3 ${
                    activo ? 'bg-violet-50/50' : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Package size={16} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-800 truncate">
                      {p.nombre}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Stock: {p.stock} · S/ {Number(p.precio).toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={!activo}
                      onClick={() => {
                        const n = Math.max(0, cant - 1);
                        setSeleccion((prev) => {
                          const next = { ...prev };
                          if (n === 0) delete next[p.id];
                          else next[p.id] = n;
                          return next;
                        });
                      }}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 dark:hover:text-rose-200 font-bold disabled:opacity-30"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="0"
                      max={p.stock}
                      value={cant || ''}
                      onChange={(e) => {
                        const n = Math.min(
                          p.stock,
                          Math.max(0, parseInt(e.target.value) || 0),
                        );
                        setSeleccion((prev) => {
                          const next = { ...prev };
                          if (n === 0) delete next[p.id];
                          else next[p.id] = n;
                          return next;
                        });
                      }}
                      placeholder="0"
                      className="w-14 text-center border border-slate-200 rounded-lg py-1 text-sm font-semibold tabular-nums focus:outline-none focus:border-violet-400"
                    />
                    <button
                      disabled={cant >= p.stock}
                      onClick={() => {
                        setSeleccion((prev) => ({
                          ...prev,
                          [p.id]: Math.min(p.stock, cant + 1),
                        }));
                      }}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-700 dark:hover:text-emerald-200 font-bold disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Notas (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Ej. entrega el viernes..."
              className="mt-1 w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            <b className="text-violet-700 dark:text-violet-300">{productosSel}</b> productos ·{' '}
            <b className="text-violet-700 dark:text-violet-300">{totalItems}</b> unidades
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-5 py-2.5 rounded-xl font-medium text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={() => crear.mutate()}
              disabled={!valido || crear.isPending}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md shadow-violet-500/30 dark:shadow-violet-900/40 disabled:opacity-40 btn-press"
            >
              <Send size={14} />
              {crear.isPending ? 'Enviando...' : 'Enviar transferencia'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetalleTransferenciaModal({
  transferencia,
  onClose,
}: {
  transferencia: Transferencia;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const dialog = useDialog();
  const { show: toast } = useToast();
  const activeSedeId = useAuthStore((s) => s.activeSedeId);

  const puedeRecibir =
    transferencia.estado === 'ENVIADA' &&
    transferencia.sedeDestino.id === activeSedeId;
  const puedeCancelar =
    transferencia.estado === 'ENVIADA' &&
    transferencia.sedeOrigen.id === activeSedeId;

  const recibir = useMutation({
    mutationFn: async () =>
      (await api.patch(`/transferencias/${transferencia.id}/recibir`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transferencias'] });
      qc.invalidateQueries({ queryKey: ['productos'] });
      toast({
        type: 'success',
        title: 'Transferencia recibida',
        description: `${transferencia.items.length} productos añadidos al stock`,
      });
      onClose();
    },
    onError: (err: any) =>
      toast({ type: 'error', title: 'Error', description: err.message }),
  });

  const rechazar = useMutation({
    mutationFn: async (motivo: string) =>
      (
        await api.patch(`/transferencias/${transferencia.id}/rechazar`, {
          motivo,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transferencias'] });
      qc.invalidateQueries({ queryKey: ['productos'] });
      toast({ type: 'warning', title: 'Transferencia rechazada' });
      onClose();
    },
  });

  const cancelar = useMutation({
    mutationFn: async () =>
      (await api.patch(`/transferencias/${transferencia.id}/cancelar`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transferencias'] });
      qc.invalidateQueries({ queryKey: ['productos'] });
      toast({ type: 'warning', title: 'Transferencia cancelada' });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl animate-scale-in">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-hotel text-xl font-bold">
                Transferencia #{String(transferencia.id).padStart(4, '0')}
              </h2>
              <EstadoBadge estado={transferencia.estado} />
            </div>
            <div className="text-xs text-slate-500">
              {new Date(transferencia.creadoEn).toLocaleString('es-PE')}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto scroll-premium flex-1">
          {/* Ruta */}
          <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                De
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                <Building size={14} />
                {transferencia.sedeOrigen.nombre}
              </div>
            </div>
            <ArrowRight size={20} className="text-violet-500 dark:text-violet-300" />
            <div className="flex-1 text-right">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                A
              </div>
              <div className="flex items-center justify-end gap-1.5 font-semibold text-slate-900">
                <Building size={14} />
                {transferencia.sedeDestino.nombre}
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">
              Productos
            </div>
            <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100">
              {transferencia.items.map((i) => (
                <div key={i.id} className="flex items-center gap-3 p-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Package size={14} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-800">
                      {i.nombreProducto}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      S/ {Number(i.precio).toFixed(2)} c/u
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-hotel text-xl font-bold text-violet-700 dark:text-violet-300 tabular-nums">
                      × {i.cantidad}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {transferencia.notas && (
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">
                Notas
              </div>
              {transferencia.notas}
            </div>
          )}

          {transferencia.motivoRechazo && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-800 dark:text-rose-200">
              <div className="text-[10px] uppercase tracking-widest font-bold mb-1">
                Motivo de rechazo
              </div>
              {transferencia.motivoRechazo}
            </div>
          )}

          <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>Creado por: <b>{transferencia.creadoPor.nombre}</b></span>
            {transferencia.recibidoPor && (
              <span>
                Recibido por: <b>{transferencia.recibidoPor.nombre}</b>
              </span>
            )}
          </div>
        </div>

        {(puedeRecibir || puedeCancelar) && (
          <div className="border-t border-slate-100 p-4 bg-slate-50 flex gap-2 justify-end">
            {puedeCancelar && (
              <button
                onClick={async () => {
                  const ok = await dialog.confirm({
                    title: 'Cancelar transferencia',
                    message:
                      'El stock regresará a la sede principal. ¿Continuar?',
                    variant: 'danger',
                    confirmText: 'Cancelar envío',
                  });
                  if (ok) cancelar.mutate();
                }}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-xl font-medium text-sm"
              >
                Cancelar envío
              </button>
            )}
            {puedeRecibir && (
              <>
                <button
                  onClick={async () => {
                    const motivo = await dialog.prompt({
                      title: 'Rechazar transferencia',
                      message:
                        'Motivo del rechazo. Los productos volverán al stock de la sede origen.',
                      placeholder: 'Ej. Cantidad equivocada',
                      variant: 'danger',
                      multiline: true,
                      minLength: 3,
                      confirmText: 'Rechazar',
                    });
                    if (motivo) rechazar.mutate(motivo);
                  }}
                  className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm"
                >
                  Rechazar
                </button>
                <button
                  onClick={() => recibir.mutate()}
                  disabled={recibir.isPending}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md shadow-emerald-500/30 dark:shadow-emerald-900/40 btn-press"
                >
                  <CheckCircle size={14} />
                  {recibir.isPending ? 'Recibiendo...' : 'Confirmar recepción'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
