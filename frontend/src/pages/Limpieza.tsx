import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Play, CheckCircle, Upload } from 'lucide-react';
import { api } from '@/lib/api';

interface Tarea {
  id: number;
  estado: string;
  notas?: string;
  habitacion: { numero: string; piso: { numero: number } };
  asignadaA?: { id: number; nombre: string } | null;
  fotos: Array<{ id: number; path: string }>;
  productosUsados: Array<{
    id: number;
    cantidad: number;
    producto: { nombre: string };
  }>;
}

export default function Limpieza() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['limpieza'],
    queryFn: async () => (await api.get<Tarea[]>('/limpieza')).data,
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

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="text-brand-500" />
        <h1 className="text-2xl font-bold">Tareas de limpieza</h1>
      </div>

      {isLoading && <div>Cargando...</div>}

      <div className="space-y-3">
        {data?.map((t) => (
          <div key={t.id} className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold">
                  #{t.id} · Hab. {t.habitacion.numero} (Piso{' '}
                  {t.habitacion.piso.numero})
                </div>
                <div className="text-xs text-slate-500">
                  {t.asignadaA
                    ? `Asignada a: ${t.asignadaA.nombre}`
                    : 'Sin asignar'}
                </div>
                {t.notas && (
                  <div className="text-xs text-slate-600 mt-1">{t.notas}</div>
                )}
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  t.estado === 'PENDIENTE'
                    ? 'bg-amber-100 text-amber-700'
                    : t.estado === 'EN_PROCESO'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {t.estado}
              </span>
            </div>

            {t.fotos.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {t.fotos.map((f) => (
                  <img
                    key={f.id}
                    src={f.path}
                    className="w-20 h-20 object-cover rounded border"
                  />
                ))}
              </div>
            )}

            <div className="mt-3 flex gap-2 flex-wrap">
              {t.estado === 'PENDIENTE' && (
                <button
                  onClick={() => iniciar.mutate(t.id)}
                  className="text-xs flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded"
                >
                  <Play size={14} /> Iniciar
                </button>
              )}
              {t.estado !== 'COMPLETADA' && (
                <>
                  <label className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded cursor-pointer">
                    <Upload size={14} /> Subir fotos
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
                    disabled={t.fotos.length === 0}
                    onClick={() => completar.mutate(t.id)}
                    className="text-xs flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded disabled:opacity-50"
                  >
                    <CheckCircle size={14} /> Completar
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {data?.length === 0 && (
          <div className="text-center text-slate-500 py-8">
            No hay tareas de limpieza
          </div>
        )}
      </div>
    </div>
  );
}
