import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BedDouble } from 'lucide-react';

interface Habitacion {
  id: number;
  numero: string;
  descripcion?: string;
  caracteristicas?: string;
  estado: string;
  precioHora: string;
  precioNoche: string;
  piso: { id: number; numero: number; nombre?: string };
}

const estados = [
  'DISPONIBLE',
  'OCUPADA',
  'ALISTANDO',
  'MANTENIMIENTO',
  'FUERA_SERVICIO',
];

export default function Habitaciones() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['habitaciones'],
    queryFn: async () => (await api.get<Habitacion[]>('/habitaciones')).data,
  });

  const cambiarEstado = useMutation({
    mutationFn: async ({ id, estado }: { id: number; estado: string }) =>
      (await api.patch(`/habitaciones/${id}/estado`, { estado })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habitaciones'] }),
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <BedDouble className="text-brand-500" />
        <h1 className="text-2xl font-bold">Habitaciones</h1>
      </div>

      {isLoading && <div>Cargando...</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.map((h) => (
          <div
            key={h.id}
            className="bg-white rounded-xl border p-5 shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xl font-bold">Hab. {h.numero}</div>
                <div className="text-xs text-slate-500">
                  Piso {h.piso.numero}
                </div>
              </div>
              <span
                className={`estado-${h.estado} text-xs px-2 py-1 rounded-full font-medium`}
              >
                {h.estado}
              </span>
            </div>
            {h.descripcion && (
              <p className="text-sm text-slate-600 mt-2">{h.descripcion}</p>
            )}
            {h.caracteristicas && (
              <p className="text-xs text-slate-500 mt-1">{h.caracteristicas}</p>
            )}
            <div className="mt-3 text-sm">
              <span className="font-medium">S/ {h.precioHora}</span>/hora ·{' '}
              <span className="font-medium">S/ {h.precioNoche}</span>/noche
            </div>

            <div className="mt-4 flex gap-2 flex-wrap">
              {estados.map((e) => (
                <button
                  key={e}
                  disabled={e === h.estado || cambiarEstado.isPending}
                  onClick={() =>
                    cambiarEstado.mutate({ id: h.id, estado: e })
                  }
                  className={`text-xs px-2 py-1 rounded ${
                    e === h.estado
                      ? 'bg-slate-100 text-slate-400'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
