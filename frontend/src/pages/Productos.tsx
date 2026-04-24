import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Plus,
  X,
  PackagePlus,
  Search,
  LayoutGrid,
  List,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

interface Producto {
  id: number;
  nombre: string;
  precio: string;
  stock: number;
  stockMinimo: number;
}

// Genera color determinístico desde el nombre (para cuando no hay foto)
function colorFor(name: string) {
  const colors = [
    'from-violet-400 to-violet-600',
    'from-rose-400 to-rose-600',
    'from-emerald-400 to-emerald-600',
    'from-amber-400 to-amber-600',
    'from-blue-400 to-blue-600',
    'from-pink-400 to-pink-600',
    'from-indigo-400 to-indigo-600',
    'from-teal-400 to-teal-600',
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return colors[Math.abs(h) % colors.length];
}

export default function Productos() {
  const qc = useQueryClient();
  const usuario = useAuthStore((s) => s.usuario);
  const puedeEditar =
    usuario?.rol === 'SUPERADMIN' || usuario?.rol === 'ADMIN_SEDE';
  const [showModal, setShowModal] = useState(false);
  const [showAjuste, setShowAjuste] = useState<Producto | null>(null);
  const [vista, setVista] = useState<'grid' | 'lista'>('grid');
  const [busqueda, setBusqueda] = useState('');
  const [filtroStock, setFiltroStock] = useState<'todos' | 'bajo' | 'agotado'>(
    'todos',
  );

  const { data, isLoading } = useQuery({
    queryKey: ['productos'],
    queryFn: async () => (await api.get<Producto[]>('/productos')).data,
  });

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    let arr = data || [];
    if (q) arr = arr.filter((p) => p.nombre.toLowerCase().includes(q));
    if (filtroStock === 'bajo')
      arr = arr.filter((p) => p.stock > 0 && p.stock <= p.stockMinimo);
    if (filtroStock === 'agotado') arr = arr.filter((p) => p.stock === 0);
    return arr;
  }, [data, busqueda, filtroStock]);

  const stats = useMemo(() => {
    const arr = data || [];
    return {
      total: arr.length,
      bajo: arr.filter((p) => p.stock > 0 && p.stock <= p.stockMinimo).length,
      agotado: arr.filter((p) => p.stock === 0).length,
      valor: arr.reduce((s, p) => s + Number(p.precio) * p.stock, 0),
    };
  }, [data]);

  const pag = usePagination(filtrados, vista === 'grid' ? 20 : 10);

  return (
    <div className="space-y-4">
      {/* Stats + acciones */}
      <div className="grid md:grid-cols-4 gap-3">
        <StatCard
          icon={<Package size={16} />}
          label="Productos"
          value={stats.total}
          color="from-violet-500 to-violet-600"
        />
        <StatCard
          icon={<AlertTriangle size={16} />}
          label="Stock bajo"
          value={stats.bajo}
          color="from-amber-500 to-amber-600"
        />
        <StatCard
          icon={<X size={16} />}
          label="Agotados"
          value={stats.agotado}
          color="from-rose-500 to-rose-600"
        />
        <StatCard
          icon={<Package size={16} />}
          label="Valor en stock"
          value={`S/ ${stats.valor.toFixed(0)}`}
          color="from-emerald-500 to-emerald-600"
        />
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-3xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        {/* Buscador */}
        <div className="relative flex-1 min-w-[240px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </div>

        {/* Filtros de stock */}
        <div className="flex gap-1.5">
          <FiltroChip
            active={filtroStock === 'todos'}
            onClick={() => setFiltroStock('todos')}
          >
            Todos
          </FiltroChip>
          <FiltroChip
            active={filtroStock === 'bajo'}
            color="amber"
            onClick={() => setFiltroStock('bajo')}
          >
            Stock bajo
          </FiltroChip>
          <FiltroChip
            active={filtroStock === 'agotado'}
            color="rose"
            onClick={() => setFiltroStock('agotado')}
          >
            Agotados
          </FiltroChip>
        </div>

        {/* Toggle vista */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setVista('grid')}
            className={`px-2.5 py-1.5 rounded-md text-xs transition ${
              vista === 'grid'
                ? 'bg-white shadow-sm text-violet-700 dark:text-violet-300'
                : 'text-slate-500'
            }`}
            title="Grid"
          >
            <LayoutGrid size={13} />
          </button>
          <button
            onClick={() => setVista('lista')}
            className={`px-2.5 py-1.5 rounded-md text-xs transition ${
              vista === 'lista'
                ? 'bg-white shadow-sm text-violet-700 dark:text-violet-300'
                : 'text-slate-500'
            }`}
            title="Lista"
          >
            <List size={13} />
          </button>
        </div>

        {/* Nuevo */}
        {puedeEditar && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md shadow-violet-500/30 dark:shadow-violet-900/40 btn-press"
          >
            <Plus size={15} /> Nuevo
          </button>
        )}
      </div>

      {/* VISTA GRID */}
      {vista === 'grid' && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl overflow-hidden border border-slate-100"
                >
                  <Skeleton className="aspect-square rounded-none" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-sm">
              <EmptyState
                icon={<Package size={28} />}
                title={
                  busqueda
                    ? `Sin resultados para "${busqueda}"`
                    : filtroStock === 'bajo'
                      ? 'Sin productos con stock bajo'
                      : filtroStock === 'agotado'
                        ? 'Ningún producto agotado'
                        : 'Aún no hay productos'
                }
                description={
                  !busqueda && filtroStock === 'todos' && puedeEditar
                    ? 'Crea el primero con el botón "Nuevo" arriba.'
                    : undefined
                }
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {pag.paginated.map((p) => (
                  <ProductoCard
                    key={p.id}
                    p={p}
                    onClick={() => puedeEditar && setShowAjuste(p)}
                  />
                ))}
              </div>
              <div className="bg-white rounded-2xl p-2 shadow-sm">
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
            </>
          )}
        </>
      )}

      {/* VISTA LISTA */}
      {vista === 'lista' && (
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                  Producto
                </th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                  Precio
                </th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                  Stock
                </th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                  Mínimo
                </th>
                {puedeEditar && (
                  <th className="text-right px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest w-32">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-14" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-10" />
                    </td>
                    {puedeEditar && (
                      <td className="px-6 py-4">
                        <Skeleton className="h-7 w-20 ml-auto" />
                      </td>
                    )}
                  </tr>
                ))}
              {!isLoading &&
                pag.paginated.map((p) => {
                  const low = p.stock <= p.stockMinimo;
                  const out = p.stock === 0;
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-slate-50 last:border-0 hover:bg-violet-50/30 transition"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorFor(p.nombre)} flex items-center justify-center shrink-0 text-white font-bold shadow-sm`}
                          >
                            {p.nombre[0]?.toUpperCase()}
                          </div>
                          <div className="font-semibold text-slate-800">
                            {p.nombre}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700">
                        S/ {Number(p.precio).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            out
                              ? 'bg-rose-100 text-rose-700 dark:text-rose-200'
                              : low
                                ? 'bg-amber-100 text-amber-800 dark:text-amber-200'
                                : 'bg-emerald-100 text-emerald-700 dark:text-emerald-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              out
                                ? 'bg-rose-500'
                                : low
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                            }`}
                          />
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {p.stockMinimo}
                      </td>
                      {puedeEditar && (
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setShowAjuste(p)}
                            className="inline-flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-violet-100 hover:text-violet-700 dark:hover:text-violet-200 text-slate-700 px-3 py-1.5 rounded-lg transition"
                          >
                            <PackagePlus size={13} /> Stock
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              {!isLoading && filtrados.length === 0 && (
                <tr>
                  <td colSpan={puedeEditar ? 5 : 4} className="p-0">
                    <EmptyState
                      icon={<Package size={28} />}
                      title="Sin productos"
                      description={
                        busqueda
                          ? `No encontramos coincidencias para "${busqueda}"`
                          : puedeEditar
                            ? 'Crea el primero con el botón "Nuevo".'
                            : undefined
                      }
                    />
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
      )}

      {showModal && <ProductoModal onClose={() => setShowModal(false)} />}
      {showAjuste && (
        <AjusteStockModal
          producto={showAjuste}
          onClose={() => {
            setShowAjuste(null);
            qc.invalidateQueries({ queryKey: ['productos'] });
          }}
        />
      )}
    </div>
  );
}

// ──────── subcomponentes ────────

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  color: string;
}) {
  return (
    <div
      className={`rounded-2xl p-4 text-white bg-gradient-to-br ${color} shadow-md relative overflow-hidden`}
    >
      <div className="absolute -right-4 -bottom-4 opacity-20 scale-[3]">
        {icon}
      </div>
      <div className="relative">
        <div className="text-[10px] uppercase tracking-widest opacity-90 font-semibold">
          {label}
        </div>
        <div className="text-2xl font-hotel font-bold mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function FiltroChip({
  children,
  active,
  onClick,
  color = 'violet',
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  color?: 'violet' | 'amber' | 'rose';
}) {
  const activeClasses = {
    violet: 'bg-violet-600 text-white shadow-sm',
    amber: 'bg-amber-500 text-white shadow-sm',
    rose: 'bg-rose-500 text-white shadow-sm',
  }[color];
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
        active ? activeClasses : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

function ProductoCard({
  p,
  onClick,
}: {
  p: Producto;
  onClick: () => void;
}) {
  const low = p.stock <= p.stockMinimo;
  const out = p.stock === 0;
  return (
    <button
      onClick={onClick}
      className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-violet-300 hover:shadow-lg transition-all text-left"
    >
      {/* "Foto" con inicial grande sobre gradient determinístico */}
      <div
        className={`aspect-square bg-gradient-to-br ${colorFor(p.nombre)} flex items-center justify-center relative`}
      >
        <span className="font-hotel text-white text-6xl font-bold opacity-90 drop-shadow-lg">
          {p.nombre[0]?.toUpperCase()}
        </span>
        {/* Badge de stock en esquina */}
        <span
          className={`absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${
            out
              ? 'bg-rose-500 text-white'
              : low
                ? 'bg-amber-500 text-white'
                : 'bg-white/90 text-slate-700 dark:bg-slate-900/80 dark:text-slate-100'
          }`}
        >
          {out ? 'Agotado' : `${p.stock}`}
        </span>
        {low && !out && (
          <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-0.5">
            <AlertTriangle size={9} />
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="font-semibold text-sm text-slate-800 line-clamp-2 min-h-[2.5em]">
          {p.nombre}
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div className="font-hotel text-xl font-bold text-violet-700 dark:text-violet-300 tabular-nums">
            S/ {Number(p.precio).toFixed(2)}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400 group-hover:text-violet-500 dark:group-hover:text-violet-300 transition">
            Stock ±
          </div>
        </div>
      </div>
    </button>
  );
}

function ProductoModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '0',
    stockMinimo: '5',
  });
  const [error, setError] = useState<string | null>(null);

  const crear = useMutation({
    mutationFn: async () =>
      (
        await api.post('/productos', {
          nombre: form.nombre,
          descripcion: form.descripcion || undefined,
          precio: Number(form.precio),
          stock: Number(form.stock),
          stockMinimo: Number(form.stockMinimo),
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Error'),
  });

  return (
    <Modal title="Nuevo producto" onClose={onClose}>
      <input
        placeholder="Nombre"
        className="w-full border rounded-lg px-3 py-2"
        value={form.nombre}
        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
      />
      <input
        placeholder="Descripción (opcional)"
        className="w-full border rounded-lg px-3 py-2"
        value={form.descripcion}
        onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
      />
      <input
        type="number"
        step="0.01"
        placeholder="Precio"
        className="w-full border rounded-lg px-3 py-2"
        value={form.precio}
        onChange={(e) => setForm({ ...form, precio: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          placeholder="Stock inicial"
          className="w-full border rounded-lg px-3 py-2"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
        />
        <input
          type="number"
          placeholder="Stock mínimo"
          className="w-full border rounded-lg px-3 py-2"
          value={form.stockMinimo}
          onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })}
        />
      </div>
      {error && (
        <div className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 p-2 rounded">
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
          onClick={() => crear.mutate()}
          disabled={crear.isPending || !form.nombre || !form.precio}
          className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2 rounded-lg disabled:opacity-50"
        >
          {crear.isPending ? 'Creando...' : 'Crear'}
        </button>
      </div>
    </Modal>
  );
}

function AjusteStockModal({
  producto,
  onClose,
}: {
  producto: Producto;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [modo, setModo] = useState<'ajuste' | 'establecer'>('ajuste');
  const [delta, setDelta] = useState('');
  const [absoluto, setAbsoluto] = useState(String(producto.stock));
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);

  // En modo 'establecer' la cantidad enviada es (nuevoStock - stockActual)
  const cantidadAEnviar =
    modo === 'ajuste'
      ? Number(delta)
      : Number(absoluto) - producto.stock;

  const stockResultante =
    modo === 'ajuste'
      ? producto.stock + (Number(delta) || 0)
      : Number(absoluto) || 0;

  const ajuste = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/productos/${producto.id}/ajuste-stock`, {
          cantidad: cantidadAEnviar,
          motivo:
            motivo ||
            (modo === 'establecer'
              ? `Conteo físico → ${absoluto}`
              : undefined),
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Error'),
  });

  const valido =
    modo === 'ajuste'
      ? delta !== '' && !isNaN(Number(delta)) && Number(delta) !== 0
      : absoluto !== '' &&
        !isNaN(Number(absoluto)) &&
        Number(absoluto) >= 0 &&
        Number(absoluto) !== producto.stock;

  return (
    <Modal title={`Stock · ${producto.nombre}`} onClose={onClose}>
      {/* Stock actual destacado */}
      <div className="bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold text-violet-600 dark:text-violet-300 uppercase tracking-widest">
            Stock actual
          </div>
          <div className="text-3xl font-hotel font-bold text-violet-700 dark:text-violet-200 mt-0.5">
            {producto.stock}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            Quedará
          </div>
          <div
            className={`text-3xl font-hotel font-bold mt-0.5 ${
              stockResultante < 0
                ? 'text-rose-600 dark:text-rose-300'
                : stockResultante !== producto.stock
                  ? 'text-emerald-600 dark:text-emerald-300'
                  : 'text-slate-400'
            }`}
          >
            {stockResultante}
          </div>
        </div>
      </div>

      {/* Tabs modo */}
      <div className="flex bg-slate-100 rounded-xl p-1">
        <button
          onClick={() => setModo('ajuste')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
            modo === 'ajuste'
              ? 'bg-white shadow-sm text-violet-700 dark:text-violet-300'
              : 'text-slate-600'
          }`}
        >
          Ajustar +/−
        </button>
        <button
          onClick={() => setModo('establecer')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
            modo === 'establecer'
              ? 'bg-white shadow-sm text-violet-700 dark:text-violet-300'
              : 'text-slate-600'
          }`}
        >
          Establecer exacto
        </button>
      </div>

      {modo === 'ajuste' ? (
        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            Cantidad a sumar o restar
          </label>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() =>
                setDelta(String((Number(delta) || 0) - 1))
              }
              className="w-10 h-10 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 dark:text-rose-200 font-bold text-xl btn-press"
            >
              −
            </button>
            <input
              type="number"
              placeholder="Ej: 10 (añadir) · -3 (quitar)"
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-center text-lg font-semibold tabular-nums focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
            />
            <button
              onClick={() =>
                setDelta(String((Number(delta) || 0) + 1))
              }
              className="w-10 h-10 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:text-emerald-200 font-bold text-xl btn-press"
            >
              +
            </button>
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {[-10, -5, -1, 1, 5, 10, 25, 50].map((n) => (
              <button
                key={n}
                onClick={() =>
                  setDelta(String((Number(delta) || 0) + n))
                }
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  n > 0
                    ? 'bg-emerald-50 text-emerald-700 dark:text-emerald-200 hover:bg-emerald-100'
                    : 'bg-rose-50 text-rose-700 dark:text-rose-200 hover:bg-rose-100'
                }`}
              >
                {n > 0 ? '+' : ''}
                {n}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            Nuevo stock exacto (conteo físico)
          </label>
          <input
            type="number"
            min="0"
            placeholder="Nuevo total"
            className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2.5 text-center text-2xl font-bold tabular-nums focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            value={absoluto}
            onChange={(e) => setAbsoluto(e.target.value)}
          />
          <div className="text-xs text-slate-500 mt-2">
            Se registrará el movimiento como{' '}
            <b className={cantidadAEnviar > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}>
              {cantidadAEnviar > 0 ? '+' : ''}
              {cantidadAEnviar}
            </b>{' '}
            para mantener el historial.
          </div>
        </div>
      )}

      <div>
        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
          Motivo (opcional)
        </label>
        <input
          placeholder={
            modo === 'establecer'
              ? 'Ej: Conteo físico mensual'
              : 'Ej: Compra, merma, devolución'
          }
          className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
      </div>

      {stockResultante < 0 && (
        <div className="text-xs text-rose-700 dark:text-rose-200 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
          ⚠ El stock no puede quedar negativo.
        </div>
      )}
      {error && (
        <div className="text-sm text-rose-700 dark:text-rose-200 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onClose}
          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-medium btn-press"
        >
          Cancelar
        </button>
        <button
          onClick={() => ajuste.mutate()}
          disabled={ajuste.isPending || !valido || stockResultante < 0}
          className="flex-1 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white py-2.5 rounded-xl font-semibold shadow-md shadow-violet-500/30 dark:shadow-violet-900/40 disabled:opacity-40 btn-press"
        >
          {ajuste.isPending ? 'Guardando...' : 'Guardar cambio'}
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
