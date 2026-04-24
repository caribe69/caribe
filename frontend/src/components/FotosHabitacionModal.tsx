import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Upload,
  Trash2,
  ImagePlus,
  Star,
  GripVertical,
  Camera,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { useDialog } from '@/components/ConfirmProvider';

interface Foto {
  id: number;
  path: string;
  orden: number;
  creadoEn: string;
}

export default function FotosHabitacionModal({
  habitacionId,
  numero,
  onClose,
}: {
  habitacionId: number;
  numero: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const dialog = useDialog();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const fotos = useQuery<Foto[]>({
    queryKey: ['habitacion', habitacionId, 'fotos'],
    queryFn: async () =>
      (await api.get(`/habitaciones/${habitacionId}/fotos`)).data,
  });

  const subir = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('foto', file);
      return (
        await api.post(`/habitaciones/${habitacionId}/fotos`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      ).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habitacion', habitacionId, 'fotos'] });
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
      toast({ type: 'success', title: 'Foto subida' });
    },
    onError: (err: any) =>
      toast({
        type: 'error',
        title: 'Error al subir',
        description: err.response?.data?.message || err.message,
      }),
  });

  const eliminar = useMutation({
    mutationFn: async (fotoId: number) =>
      (await api.delete(`/habitaciones/${habitacionId}/fotos/${fotoId}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habitacion', habitacionId, 'fotos'] });
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
      toast({ type: 'success', title: 'Foto eliminada' });
    },
  });

  const reordenar = useMutation({
    mutationFn: async (orden: number[]) =>
      (
        await api.patch(`/habitaciones/${habitacionId}/fotos/reorder`, {
          orden,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habitacion', habitacionId, 'fotos'] });
      qc.invalidateQueries({ queryKey: ['habitaciones'] });
    },
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      await subir.mutateAsync(f);
    }
  };

  // Drag & drop para reordenar
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (i: number) => (dragItem.current = i);
  const handleDragEnter = (i: number) => (dragOverItem.current = i);
  const handleDragEnd = () => {
    if (
      dragItem.current === null ||
      dragOverItem.current === null ||
      !fotos.data
    )
      return;
    const lista = [...fotos.data];
    const [item] = lista.splice(dragItem.current, 1);
    lista.splice(dragOverItem.current, 0, item);
    dragItem.current = null;
    dragOverItem.current = null;
    reordenar.mutate(lista.map((f) => f.id));
  };

  const data = fotos.data || [];
  const principales = data.slice(0, 4);
  const extras = data.slice(4);

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl dark:shadow-slate-950/60 animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <div>
            <h2 className="font-hotel text-xl font-bold text-slate-900">
              Fotos · Hab. {numero}
            </h2>
            <div className="text-xs text-slate-500 mt-0.5">
              Las primeras 4 son las principales (se muestran en el mapa).
              Arrastra para reordenar.
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scroll-premium p-5 space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${
              dragging
                ? 'border-violet-500 bg-violet-50'
                : 'border-slate-300 dark:border-slate-700 hover:border-violet-400 hover:bg-violet-50/50'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                if (e.target) e.target.value = '';
              }}
            />
            <Camera
              size={32}
              className="mx-auto text-slate-400 mb-2"
            />
            <div className="text-sm font-semibold text-slate-700">
              {subir.isPending
                ? 'Subiendo...'
                : 'Click o arrastra fotos aquí'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              JPG, PNG, WEBP · máx. 10 MB c/u · puedes subir varias a la vez
            </div>
          </div>

          {/* Principales (4) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star size={14} className="text-amber-500 fill-amber-500" />
              <div className="text-[11px] uppercase tracking-widest font-bold text-slate-700">
                Principales (4)
              </div>
              <div className="text-[10px] text-slate-400">
                · Visibles en el mapa y la tarjeta
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => {
                const foto = principales[i];
                if (!foto) {
                  return (
                    <div
                      key={`empty-${i}`}
                      onClick={() => inputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-300 dark:text-slate-600 hover:border-violet-400 hover:text-violet-500 cursor-pointer transition"
                    >
                      <ImagePlus size={22} />
                    </div>
                  );
                }
                return (
                  <div
                    key={foto.id}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragEnter={() => handleDragEnter(i)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className="relative aspect-square rounded-xl overflow-hidden group shadow-sm border border-slate-200 cursor-move"
                  >
                    <img
                      src={foto.path}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {/* Badge posición */}
                    <div className="absolute top-1.5 left-1.5 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      {i + 1}
                    </div>
                    {/* Botón eliminar */}
                    <button
                      onClick={async () => {
                        const ok = await dialog.confirm({
                          title: 'Eliminar foto',
                          message: '¿Seguro? Esta acción no se puede deshacer.',
                          variant: 'danger',
                          confirmText: 'Eliminar',
                        });
                        if (ok) eliminar.mutate(foto.id);
                      }}
                      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-rose-500 text-white hover:bg-rose-600 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                    >
                      <Trash2 size={13} />
                    </button>
                    {/* Drag handle */}
                    <div className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded bg-white/90 dark:bg-slate-900/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-slate-500">
                      <GripVertical size={12} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Extras */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ImagePlus size={14} className="text-slate-500" />
              <div className="text-[11px] uppercase tracking-widest font-bold text-slate-700">
                Extras ({extras.length})
              </div>
              <div className="text-[10px] text-slate-400">
                · Solo galería, no en el mapa
              </div>
            </div>
            {extras.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                {extras.map((foto, i) => (
                  <div
                    key={foto.id}
                    draggable
                    onDragStart={() => handleDragStart(i + 4)}
                    onDragEnter={() => handleDragEnter(i + 4)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className="relative aspect-square rounded-lg overflow-hidden group shadow-sm border border-slate-200 cursor-move"
                  >
                    <img
                      src={foto.path}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={async () => {
                        const ok = await dialog.confirm({
                          title: 'Eliminar foto',
                          variant: 'danger',
                          confirmText: 'Eliminar',
                        });
                        if (ok) eliminar.mutate(foto.id);
                      }}
                      className="absolute top-1 right-1 w-6 h-6 rounded bg-rose-500 text-white hover:bg-rose-600 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-400 text-xs py-8 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                Las fotos más allá de la 4ª se mostrarán aquí como extras
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <div className="text-xs text-slate-500">
            <b className="text-slate-700">{data.length}</b> foto
            {data.length === 1 ? '' : 's'} · {principales.length}/4
            principales
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md shadow-violet-500/30 btn-press"
          >
            <Upload size={14} /> Subir más
          </button>
        </div>
      </div>
    </div>
  );
}
