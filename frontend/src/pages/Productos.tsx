import { useQuery } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { api } from '@/lib/api';

interface Producto {
  id: number;
  nombre: string;
  precio: string;
  stock: number;
  stockMinimo: number;
}

export default function Productos() {
  const { data, isLoading } = useQuery({
    queryKey: ['productos'],
    queryFn: async () => (await api.get<Producto[]>('/productos')).data,
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Package className="text-brand-500" />
        <h1 className="text-2xl font-bold">Productos</h1>
      </div>

      {isLoading && <div>Cargando...</div>}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Precio</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Mínimo</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3">{p.nombre}</td>
                <td className="px-4 py-3">S/ {p.precio}</td>
                <td
                  className={`px-4 py-3 font-medium ${
                    p.stock <= p.stockMinimo ? 'text-red-600' : ''
                  }`}
                >
                  {p.stock}
                </td>
                <td className="px-4 py-3 text-slate-500">{p.stockMinimo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
