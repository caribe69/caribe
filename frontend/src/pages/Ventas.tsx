import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingCart,
  Plus,
  X,
  Trash2,
  Minus,
  Search,
  Wallet,
  Lock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useDialog } from '@/components/ConfirmProvider';
import { useToast } from '@/components/ToastProvider';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

interface Producto {
  id: number;
  nombre: string;
  precio: string;
  stock: number;
}

interface Venta {
  id: number;
  total: string;
  metodoPago: string;
  estado: string;
  motivoAnulacion?: string | null;
  creadoEn: string;
  notas?: string | null;
  items: Array<{
    id: number;
    cantidad: number;
    subtotal: string;
    producto: { nombre: string };
  }>;
  usuario: { nombre: string; username: string };
}

interface Turno {
  id: number;
  estado: string;
  sede?: { id: number; nombre: string } | null;
  abiertoEn?: string;
}

export default function Ventas() {
  const qc = useQueryClient();
  const dialog = useDialog();
  const { show: toast } = useToast();
  const navigate = useNavigate();
  const [showNew, setShowNew] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'ACTIVA' | 'ANULADA'>(
    'todas',
  );

  const turnoQ = useQuery<Turno | null>({
    queryKey: ['caja', 'mi-turno'],
    queryFn: async () => (await api.get('/caja/mi-turno')).data,
  });
  const turnoAbierto = !!turnoQ.data?.id && turnoQ.data.estado === 'ABIERTO';

  const { data, isLoading } = useQuery({
    queryKey: ['ventas'],
    queryFn: async () => (await api.get<Venta[]>('/ventas')).data,
  });

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    let arr = data || [];
    if (filtroEstado !== 'todas') arr = arr.filter((v) => v.estado === filtroEstado);
    if (q)
      arr = arr.filter(
        (v) =>
          String(v.id).includes(q) ||
          v.metodoPago.toLowerCase().includes(q) ||
          v.usuario?.nombre?.toLowerCase().includes(q) ||
          v.items.some((i) => i.producto.nombre.toLowerCase().includes(q)),
      );
    return arr;
  }, [data, busqueda, filtroEstado]);

  const pag = usePagination(filtradas, 15);

  const anular = useMutation({
    mutationFn: async ({ id, motivo }: { id: number; motivo: string }) =>
      (await api.patch(`/ventas/${id}/anular`, { motivo })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventas'] });
      qc.invalidateQueries({ queryKey: ['productos'] });
      toast({ type: 'success', title: 'Venta anulada' });
    },
    onError: (err: any) =>
      toast({
        type: 'error',
        title: 'No se pudo anular',
        description: err.response?.data?.message || undefined,
      }),
  });

  const handleNuevaVenta = () => {
    if (!turnoAbierto) {
      dialog
        .confirm({
          title: 'Debes abrir caja primero',
          message:
            'Para registrar una venta necesitas tener un turno de caja abierto. ¿Quieres ir a Caja ahora?',
          variant: 'warning',
          confirmText: 'Ir a Caja',
          cancelText: 'Cancelar',
        })
        .then((ok) => {
          if (ok) navigate('/caja');
        });
      return;
    }
    setShowNew(true);
  };

  return (
    <div className="space-y-4">
      {/* Banner estado del turno */}
      <div
        className={`rounded-2xl p-3 shadow-sm flex items-center gap-3 ${
          turnoAbierto
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50'
            : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50'
        }`}
      >
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            turnoAbierto
              ? 'bg-emerald-500 text-white'
              : 'bg-amber-500 text-white'
          }`}
        >
          {turnoAbierto ? <Wallet size={16} /> : <Lock size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-bold ${
              turnoAbierto
                ? 'text-emerald-800 dark:text-emerald-200'
                : 'text-amber-800 dark:text-amber-200'
            }`}
          >
            {turnoAbierto
              ? `Caja abierta · Turno #${turnoQ.data!.id}`
              : 'Caja cerrada'}
          </div>
          <div
            className={`text-[11px] ${
              turnoAbierto
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-amber-700 dark:text-amber-300'
            }`}
          >
            {turnoAbierto
              ? 'Podés registrar ventas directas.'
              : 'Abre un turno de caja para poder registrar ventas.'}
          </div>
        </div>
        {!turnoAbierto && (
          <button
            onClick={() => navigate('/caja')}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-2 rounded-lg btn-press"
          >
            Ir a Caja
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-3xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por #, método, producto o cajero..."
            className="w-full bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30"
          />
        </div>

        <div className="flex gap-1.5">
          <Chip active={filtroEstado === 'todas'} onClick={() => setFiltroEstado('todas')}>
            Todas
          </Chip>
          <Chip
            active={filtroEstado === 'ACTIVA'}
            color="emerald"
            onClick={() => setFiltroEstado('ACTIVA')}
          >
            Activas
          </Chip>
          <Chip
            active={filtroEstado === 'ANULADA'}
            color="rose"
            onClick={() => setFiltroEstado('ANULADA')}
          >
            Anuladas
          </Chip>
        </div>

        <div className="text-[11px] text-slate-400 ml-auto">
          {filtradas.length} de {data?.length || 0}
        </div>

        <button
          onClick={handleNuevaVenta}
          disabled={!turnoAbierto}
          title={
            turnoAbierto
              ? 'Registrar nueva venta directa'
              : 'Abre un turno de caja primero'
          }
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium btn-press transition ${
            turnoAbierto
              ? 'bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white shadow-md shadow-violet-500/30 dark:shadow-violet-900/40'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
          }`}
        >
          {turnoAbierto ? <Plus size={15} /> : <Lock size={14} />}
          Nueva venta
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>#</Th>
                <Th>Fecha</Th>
                <Th>Cajero</Th>
                <Th>Productos</Th>
                <Th align="right">Total</Th>
                <Th>Método</Th>
                <Th align="center">Estado</Th>
                <Th align="right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-50 dark:border-slate-800/60"
                  >
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!isLoading && filtradas.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-0">
                    <EmptyState
                      icon={<ShoppingCart size={28} />}
                      title={busqueda ? `Sin resultados para "${busqueda}"` : 'Sin ventas aún'}
                      description={
                        !busqueda && turnoAbierto
                          ? 'Registra la primera con el botón "Nueva venta".'
                          : !busqueda
                            ? 'Abre un turno de caja para registrar ventas.'
                            : undefined
                      }
                    />
                  </td>
                </tr>
              )}

              {!isLoading &&
                pag.paginated.map((v) => (
                  <FilaVenta
                    key={v.id}
                    v={v}
                    onAnular={async () => {
                      const motivo = await dialog.prompt({
                        title: `Anular venta #${v.id}`,
                        message:
                          'Escribe el motivo. Los productos vuelven al stock automáticamente.',
                        placeholder: 'Ej. Error de cobro',
                        confirmText: 'Anular',
                        variant: 'danger',
                        multiline: true,
                        minLength: 3,
                      });
                      if (motivo) anular.mutate({ id: v.id, motivo });
                    }}
                  />
                ))}
            </tbody>
          </table>
        </div>

        {filtradas.length > 0 && (
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

      {showNew && (
        <NuevaVentaModal
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false);
            qc.invalidateQueries({ queryKey: ['ventas'] });
            qc.invalidateQueries({ queryKey: ['productos'] });
            qc.invalidateQueries({ queryKey: ['caja', 'mi-turno'] });
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// Fila de venta (con expandible para ver items)
// ────────────────────────────────────────────
function FilaVenta({
  v,
  onAnular,
}: {
  v: Venta;
  onAnular: () => void;
}) {
  const fecha = new Date(v.creadoEn);
  const anulada = v.estado !== 'ACTIVA';
  const resumen = v.items
    .map((i) => `${i.producto.nombre} ×${i.cantidad}`)
    .join(' · ');

  return (
    <tr
      className={`border-b border-slate-50 dark:border-slate-800/60 last:border-0 hover:bg-violet-50/30 dark:hover:bg-violet-900/20 transition ${
        anulada ? 'opacity-60' : ''
      }`}
    >
      <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200 tabular-nums">
        #{v.id}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-[12px] tabular-nums">
        <div className="font-semibold text-slate-800 dark:text-slate-100">
          {fecha.toLocaleDateString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
          })}
        </div>
        <div className="text-[11px] text-slate-400 dark:text-slate-500">
          {fecha.toLocaleTimeString('es-PE', { hour12: false })}
        </div>
      </td>
      <td className="px-4 py-3 text-[12px] text-slate-700 dark:text-slate-300">
        {v.usuario?.nombre || '—'}
      </td>
      <td className="px-4 py-3 text-[12px] text-slate-600 dark:text-slate-400 max-w-[320px]">
        <div className="truncate" title={resumen}>
          {resumen}
        </div>
        {v.motivoAnulacion && (
          <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5 truncate">
            ✕ {v.motivoAnulacion}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900 dark:text-slate-100">
        S/ {Number(v.total).toFixed(2)}
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
          {v.metodoPago}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
            anulada
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
          }`}
        >
          {v.estado}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {!anulada && (
          <button
            onClick={onAnular}
            className="inline-flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 px-2.5 py-1.5 rounded-lg transition"
            title="Anular venta"
          >
            <Trash2 size={12} /> Anular
          </button>
        )}
      </td>
    </tr>
  );
}

// ────────────────────────────────────────────
// Modal Nueva venta
// ────────────────────────────────────────────
function NuevaVentaModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { show: toast } = useToast();
  const [items, setItems] = useState<{ productoId: number; cantidad: number }[]>([]);
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const productos = useQuery({
    queryKey: ['productos'],
    queryFn: async () => (await api.get<Producto[]>('/productos')).data,
  });

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const arr = productos.data || [];
    if (!q) return arr;
    return arr.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [productos.data, busqueda]);

  const crear = useMutation({
    mutationFn: async () =>
      (
        await api.post('/ventas', {
          items,
          metodoPago,
          notas: notas || undefined,
        })
      ).data,
    onSuccess: () => {
      toast({ type: 'success', title: `Venta registrada · S/ ${total.toFixed(2)}` });
      onSaved();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Error'),
  });

  const addItem = (productoId: number) => {
    setError(null);
    const existing = items.find((i) => i.productoId === productoId);
    if (existing) {
      setItems(
        items.map((i) =>
          i.productoId === productoId ? { ...i, cantidad: i.cantidad + 1 } : i,
        ),
      );
    } else {
      setItems([...items, { productoId, cantidad: 1 }]);
    }
  };

  const updateQty = (productoId: number, cantidad: number) => {
    if (cantidad <= 0) {
      setItems(items.filter((i) => i.productoId !== productoId));
    } else {
      setItems(
        items.map((i) => (i.productoId === productoId ? { ...i, cantidad } : i)),
      );
    }
  };

  const total = items.reduce((s, i) => {
    const p = productos.data?.find((x) => x.id === i.productoId);
    return s + (p ? Number(p.precio) * i.cantidad : 0);
  }, 0);

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden shadow-2xl animate-scale-in flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart
              size={18}
              className="text-violet-600 dark:text-violet-400"
            />
            <h2 className="font-hotel text-lg font-bold text-slate-900 dark:text-slate-100">
              Nueva venta directa
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-0 flex-1 overflow-hidden">
          {/* Columna productos */}
          <div className="p-5 border-r border-slate-100 dark:border-slate-800 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Productos disponibles
              </div>
            </div>
            <div className="relative mb-2">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                autoFocus
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg pl-7 pr-3 py-2 text-xs focus:outline-none focus:border-violet-400"
              />
            </div>
            <div className="flex-1 overflow-y-auto scroll-premium space-y-1 pr-1">
              {productosFiltrados.length === 0 && (
                <div className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">
                  Sin productos
                </div>
              )}
              {productosFiltrados.map((p) => {
                const out = p.stock === 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => addItem(p.id)}
                    disabled={out}
                    className={`w-full flex items-center justify-between text-left px-3 py-2 rounded-lg text-sm transition ${
                      out
                        ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-800/40'
                        : 'hover:bg-violet-50 dark:hover:bg-violet-900/20 bg-slate-50 dark:bg-slate-800/60'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {p.nombre}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Stock: {p.stock}
                      </div>
                    </div>
                    <div className="font-bold text-violet-700 dark:text-violet-300 tabular-nums ml-2">
                      S/ {Number(p.precio).toFixed(2)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Columna carrito */}
          <div className="p-5 flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
              Carrito ({items.length})
            </div>
            <div className="flex-1 overflow-y-auto scroll-premium space-y-2">
              {items.length === 0 && (
                <div className="text-xs text-slate-400 dark:text-slate-500 text-center py-8">
                  Agrega productos desde la lista
                </div>
              )}
              {items.map((i) => {
                const p = productos.data?.find((x) => x.id === i.productoId);
                if (!p) return null;
                return (
                  <div
                    key={i.productoId}
                    className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-lg p-2 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {p.nombre}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        S/ {Number(p.precio).toFixed(2)} c/u
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQty(p.id, i.cantidad - 1)}
                        className="w-7 h-7 rounded bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center btn-press"
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number"
                        value={i.cantidad}
                        min="1"
                        onChange={(e) => updateQty(p.id, Number(e.target.value))}
                        className="w-12 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded py-1 text-sm font-bold tabular-nums"
                      />
                      <button
                        onClick={() => updateQty(p.id, i.cantidad + 1)}
                        className="w-7 h-7 rounded bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center btn-press"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="w-20 text-right text-[12px] font-bold tabular-nums text-slate-900 dark:text-slate-100">
                      S/ {(Number(p.precio) * i.cantidad).toFixed(2)}
                    </div>
                    <button
                      onClick={() => updateQty(p.id, 0)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Quitar"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">
                  Total
                </span>
                <span className="text-2xl font-hotel font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  S/ {total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pie: método de pago + notas + botón */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Método de pago
              </label>
              <select
                className="w-full mt-1 bg-white dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="VISA">Visa</option>
                <option value="MASTERCARD">Mastercard</option>
                <option value="YAPE">Yape</option>
                <option value="PLIN">Plin</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Notas (opcional)
              </label>
              <input
                placeholder="Ej: comanda especial"
                className="w-full mt-1 bg-white dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-lg p-2.5">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl font-medium btn-press"
            >
              Cancelar
            </button>
            <button
              onClick={() => crear.mutate()}
              disabled={crear.isPending || items.length === 0}
              className="flex-[2] bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white py-2.5 rounded-xl font-semibold shadow-md shadow-violet-500/30 disabled:opacity-40 btn-press"
            >
              {crear.isPending
                ? 'Registrando...'
                : items.length === 0
                  ? 'Agrega productos'
                  : `Registrar venta · S/ ${total.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// helpers
// ────────────────────────────────────────────
function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <th
      className={`px-4 py-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-${align}`}
    >
      {children}
    </th>
  );
}

function Chip({
  children,
  active,
  onClick,
  color = 'violet',
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  color?: 'violet' | 'emerald' | 'rose';
}) {
  const activeCls = {
    violet: 'bg-violet-600 text-white shadow-sm',
    emerald: 'bg-emerald-500 text-white shadow-sm',
    rose: 'bg-rose-500 text-white shadow-sm',
  }[color];
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
        active
          ? activeCls
          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );
}
