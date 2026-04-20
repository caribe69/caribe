import { useQuery } from '@tanstack/react-query';
import { BedDouble, ClipboardList, Sparkles, Wallet } from 'lucide-react';
import { api } from '@/lib/api';

interface Habitacion {
  id: number;
  numero: string;
  estado: string;
}

export default function Dashboard() {
  const habsQ = useQuery({
    queryKey: ['habitaciones'],
    queryFn: async () => (await api.get<Habitacion[]>('/habitaciones')).data,
  });

  const porEstado = (estado: string) =>
    habsQ.data?.filter((h) => h.estado === estado).length ?? 0;

  const cards = [
    {
      label: 'Disponibles',
      value: porEstado('DISPONIBLE'),
      icon: BedDouble,
      color: 'bg-emerald-500',
    },
    {
      label: 'Ocupadas',
      value: porEstado('OCUPADA'),
      icon: ClipboardList,
      color: 'bg-rose-500',
    },
    {
      label: 'Alistando',
      value: porEstado('ALISTANDO'),
      icon: Sparkles,
      color: 'bg-amber-500',
    },
    {
      label: 'Mantenimiento',
      value: porEstado('MANTENIMIENTO'),
      icon: Wallet,
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Panel general</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="bg-white rounded-xl p-5 shadow-sm border flex items-center gap-4"
            >
              <div
                className={`w-12 h-12 rounded-lg ${c.color} text-white flex items-center justify-center`}
              >
                <Icon size={22} />
              </div>
              <div>
                <div className="text-sm text-slate-500">{c.label}</div>
                <div className="text-2xl font-bold">{c.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="font-semibold mb-3">Resumen de habitaciones</h2>
        {habsQ.isLoading && <div className="text-slate-500">Cargando...</div>}
        {habsQ.data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {habsQ.data.map((h) => (
              <div
                key={h.id}
                className={`estado-${h.estado} rounded-lg px-3 py-2 text-sm font-medium text-center`}
              >
                {h.numero}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
