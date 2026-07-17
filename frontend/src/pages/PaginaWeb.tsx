import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Image as ImageIcon,
  Plus,
  X,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  Eye,
  EyeOff,
  MessageCircle,
  Mail,
  MapPin,
  Save,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ToastProvider';
import { useDialog } from '@/components/ConfirmProvider';

interface Slide {
  id: number;
  titulo?: string | null;
  subtitulo?: string | null;
  descripcion?: string | null;
  imagen?: string | null;
  precio?: string | null;
  beneficios?: string | null;
  botonTexto?: string | null;
  botonUrl?: string | null;
  orden: number;
  activo: boolean;
}

export default function PaginaWeb() {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const { confirm } = useDialog();
  const [editar, setEditar] = useState<Slide | null>(null);
  const [nuevo, setNuevo] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['landing-slides'],
    queryFn: async () => (await api.get<Slide[]>('/landing-slides')).data,
  });

  const invalidar = () => qc.invalidateQueries({ queryKey: ['landing-slides'] });

  const toggleActivo = useMutation({
    mutationFn: async (s: Slide) =>
      (await api.patch(`/landing-slides/${s.id}`, { activo: !s.activo })).data,
    onSuccess: invalidar,
  });

  const mover = useMutation({
    mutationFn: async (ids: number[]) =>
      (await api.patch('/landing-slides/reordenar', { ids })).data,
    onSuccess: invalidar,
  });

  const eliminar = async (s: Slide) => {
    const ok = await confirm({
      title: `¿Eliminar este slide?`,
      message: s.titulo || 'Slide del carrusel',
      variant: 'danger',
      confirmText: 'Eliminar',
    });
    if (!ok) return;
    try {
      await api.delete(`/landing-slides/${s.id}`);
      toast({ type: 'success', title: 'Slide eliminado' });
      invalidar();
    } catch (err: any) {
      toast({ type: 'error', title: 'No se pudo eliminar', description: err.response?.data?.message });
    }
  };

  const list = data || [];
  const moverArriba = (i: number) => {
    if (i <= 0) return;
    const ids = list.map((s) => s.id);
    [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
    mover.mutate(ids);
  };
  const moverAbajo = (i: number) => {
    if (i >= list.length - 1) return;
    const ids = list.map((s) => s.id);
    [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]];
    mover.mutate(ids);
  };

  return (
    <div className="space-y-4">
      <ContactoCard />

      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-3xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 flex items-center justify-center">
            <ImageIcon size={18} />
          </div>
          <div>
            <div className="font-hotel text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">
              Carrusel de la página web
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Imágenes y textos del inicio de caribeperu.com
            </div>
          </div>
        </div>
        <div className="text-[11px] text-slate-400 ml-auto">{list.length} slides</div>
        <button
          onClick={() => setNuevo(true)}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md shadow-violet-500/30 btn-press"
        >
          <Plus size={15} /> Nuevo slide
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-3xl shadow-sm overflow-hidden">
        {isLoading && (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        )}
        {!isLoading && list.length === 0 && (
          <EmptyState
            icon={<ImageIcon size={28} />}
            title="Aún no hay slides"
            description='Crea el primero con "Nuevo slide". Aparecerá en el carrusel del inicio.'
          />
        )}
        {!isLoading && list.length > 0 && (
          <ul className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {list.map((s, i) => (
              <li key={s.id} className="flex items-center gap-4 p-4 hover:bg-violet-50/30 dark:hover:bg-violet-900/20 transition">
                <div className="flex flex-col gap-1">
                  <button onClick={() => moverArriba(i)} disabled={i === 0} className="text-slate-400 hover:text-violet-600 disabled:opacity-20"><ArrowUp size={14} /></button>
                  <button onClick={() => moverAbajo(i)} disabled={i === list.length - 1} className="text-slate-400 hover:text-violet-600 disabled:opacity-20"><ArrowDown size={14} /></button>
                </div>
                <div className="w-28 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                  {s.imagen ? (
                    <img src={s.imagen} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={20} /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{s.titulo || <span className="text-slate-400">(sin título)</span>}</div>
                  <div className="text-[11px] text-slate-400 truncate">{s.subtitulo || ''} {s.precio ? `· ${s.precio}` : ''}</div>
                </div>
                <button
                  onClick={() => toggleActivo.mutate(s)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${s.activo ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}
                  title={s.activo ? 'Visible (clic para ocultar)' : 'Oculto (clic para mostrar)'}
                >
                  {s.activo ? <Eye size={11} /> : <EyeOff size={11} />} {s.activo ? 'Visible' : 'Oculto'}
                </button>
                <button onClick={() => setEditar(s)} className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1.5 rounded-lg"><Pencil size={13} /> Editar</button>
                <button onClick={() => eliminar(s)} className="inline-flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 w-7 h-7 rounded-lg"><Trash2 size={13} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(nuevo || editar) && (
        <SlideModal
          slide={editar}
          onClose={() => { setNuevo(false); setEditar(null); }}
          onSaved={() => { setNuevo(false); setEditar(null); invalidar(); }}
        />
      )}
    </div>
  );
}

interface ContactoForm {
  landingWhatsapp: string;
  landingEmail: string;
  landingDireccion: string;
  landingMapsUrl: string;
}

function ContactoCard() {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const [form, setForm] = useState<ContactoForm | null>(null);

  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data,
  });

  // Inicializa el formulario cuando llega la config (una sola vez)
  if (data && form === null) {
    setForm({
      landingWhatsapp: data.landingWhatsapp || '',
      landingEmail: data.landingEmail || '',
      landingDireccion: data.landingDireccion || '',
      landingMapsUrl: data.landingMapsUrl || '',
    });
  }

  const guardar = useMutation({
    mutationFn: async (f: ContactoForm) => {
      const wsp = f.landingWhatsapp.replace(/\D/g, ''); // solo dígitos
      return (await api.patch('/settings', { ...f, landingWhatsapp: wsp })).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast({ type: 'success', title: 'Contacto actualizado' });
    },
    onError: (err: any) =>
      toast({ type: 'error', title: 'No se pudo guardar', description: err.response?.data?.message }),
  });

  return (
    <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 rounded-3xl p-5 shadow-sm">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
          <MessageCircle size={18} />
        </div>
        <div>
          <div className="font-hotel text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">
            Contacto de la página web
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            WhatsApp, correo y dirección que aparecen en caribeperu.com
          </div>
        </div>
      </div>

      {!form ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="WhatsApp (con código de país)">
              <div className="relative">
                <MessageCircle size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                <input
                  className={inp + ' pl-9'}
                  value={form.landingWhatsapp}
                  onChange={(e) => setForm({ ...form, landingWhatsapp: e.target.value })}
                  placeholder="51999888777"
                  inputMode="tel"
                />
              </div>
            </Campo>
            <Campo label="Correo de contacto">
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className={inp + ' pl-9'}
                  value={form.landingEmail}
                  onChange={(e) => setForm({ ...form, landingEmail: e.target.value })}
                  placeholder="info@caribeperu.com"
                />
              </div>
            </Campo>
            <Campo label="Dirección / ubicación">
              <div className="relative">
                <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className={inp + ' pl-9'}
                  value={form.landingDireccion}
                  onChange={(e) => setForm({ ...form, landingDireccion: e.target.value })}
                  placeholder="Av. Ejemplo 123, Santa Anita, Lima"
                />
              </div>
            </Campo>
            <Campo label="Enlace de Google Maps (opcional)">
              <input
                className={inp}
                value={form.landingMapsUrl}
                onChange={(e) => setForm({ ...form, landingMapsUrl: e.target.value })}
                placeholder="https://maps.app.goo.gl/…"
              />
            </Campo>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => guardar.mutate(form)}
              disabled={guardar.isPending}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md shadow-emerald-500/30 btn-press disabled:opacity-40"
            >
              <Save size={15} /> {guardar.isPending ? 'Guardando…' : 'Guardar contacto'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SlideModal({ slide, onClose, onSaved }: { slide: Slide | null; onClose: () => void; onSaved: () => void }) {
  const esEdicion = !!slide;
  const { show: toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    titulo: slide?.titulo || '',
    subtitulo: slide?.subtitulo || '',
    descripcion: slide?.descripcion || '',
    precio: slide?.precio || '',
    beneficios: slide?.beneficios || '',
    botonTexto: slide?.botonTexto || '',
    botonUrl: slide?.botonUrl || '',
    activo: slide?.activo ?? true,
  });
  const [imagen, setImagen] = useState<string | null>(slide?.imagen || null);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    setGuardando(true); setError(null);
    try {
      let id = slide?.id;
      if (esEdicion) {
        await api.patch(`/landing-slides/${id}`, form);
      } else {
        const { data } = await api.post('/landing-slides', form);
        id = data.id;
      }
      // subir imagen si se eligió una nueva
      if (id && fileRef.current?.files?.[0]) {
        const fd = new FormData();
        fd.append('imagen', fileRef.current.files[0]);
        setSubiendo(true);
        await api.post(`/landing-slides/${id}/imagen`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      toast({ type: 'success', title: esEdicion ? 'Slide actualizado' : 'Slide creado' });
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally {
      setGuardando(false); setSubiendo(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-700 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="font-hotel text-lg font-bold text-slate-900 dark:text-slate-100">{esEdicion ? 'Editar slide' : 'Nuevo slide'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Imagen */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Imagen de fondo</label>
            <div className="mt-1.5 relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 aspect-[16/7] flex items-center justify-center">
              {imagen ? (
                <img src={imagen} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="text-slate-400 text-sm">Sin imagen</div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 hover:bg-white text-slate-800 dark:text-slate-100 text-xs font-semibold px-3 py-1.5 rounded-lg shadow"
              >
                <Upload size={13} /> {imagen ? 'Cambiar' : 'Subir'} imagen
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setImagen(URL.createObjectURL(f));
              }}
            />
            <p className="text-[11px] text-slate-400 mt-1">Recomendado: horizontal, buena resolución (JPG/PNG/WEBP).</p>
          </div>

          <Campo label="Título (grande)"><input className={inp} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Alojamiento de calidad al mejor precio" /></Campo>
          <Campo label="Etiqueta / badge"><input className={inp} value={form.subtitulo} onChange={(e) => setForm({ ...form, subtitulo: e.target.value })} placeholder="ESTADÍA 100% SEGURA" /></Campo>
          <Campo label="Descripción"><textarea className={inp} rows={3} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="¿Buscas comodidad sin pagar de más?..." /></Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Precio (texto)"><input className={inp} value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} placeholder="Desde S/ 120" /></Campo>
            <Campo label="Texto del botón"><input className={inp} value={form.botonTexto} onChange={(e) => setForm({ ...form, botonTexto: e.target.value })} placeholder="Ver Ofertas" /></Campo>
          </div>
          <Campo label="Enlace del botón"><input className={inp} value={form.botonUrl} onChange={(e) => setForm({ ...form, botonUrl: e.target.value })} placeholder="#habitaciones" /></Campo>
          <Campo label="Beneficios (separados por coma)"><input className={inp} value={form.beneficios} onChange={(e) => setForm({ ...form, beneficios: e.target.value })} placeholder="Todo Incluido, Traslado Gratis, Wifi" /></Campo>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="w-4 h-4 accent-violet-600" />
            <span className="text-sm text-slate-700 dark:text-slate-200">Mostrar este slide en la página</span>
          </label>

          {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">{error}</div>}
        </div>
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex gap-2 sticky bottom-0">
          <button onClick={onClose} className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl font-medium">Cancelar</button>
          <button onClick={guardar} disabled={guardando} className="flex-[2] bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white py-2.5 rounded-xl font-semibold shadow-md disabled:opacity-40">
            {subiendo ? 'Subiendo imagen…' : guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear slide'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = 'w-full bg-white dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30';

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
