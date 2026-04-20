import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building, Plus } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';

export default function Sedes() {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ nombre: '', direccion: '', telefono: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['sedes'],
    queryFn: async () => (await api.get<any[]>('/sedes')).data,
  });

  const crear = useMutation({
    mutationFn: async () => (await api.post('/sedes', form)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sedes'] });
      setShow(false);
      setForm({ nombre: '', direccion: '', telefono: '' });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Building className="text-brand-500" />
          <h1 className="text-2xl font-bold">Sedes</h1>
        </div>
        <button
          onClick={() => setShow(true)}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm"
        >
          <Plus size={16} /> Nueva sede
        </button>
      </div>

      {isLoading && <div>Cargando...</div>}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Dirección</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((s: any) => (
              <tr key={s.id} className="border-t">
                <td className="px-4 py-3">{s.id}</td>
                <td className="px-4 py-3 font-medium">{s.nombre}</td>
                <td className="px-4 py-3">{s.direccion}</td>
                <td className="px-4 py-3">{s.telefono}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      s.activa
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {s.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Nueva sede</h2>
            <div className="space-y-3">
              <input
                placeholder="Nombre"
                className="w-full border rounded-lg px-3 py-2"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
              <input
                placeholder="Dirección"
                className="w-full border rounded-lg px-3 py-2"
                value={form.direccion}
                onChange={(e) =>
                  setForm({ ...form, direccion: e.target.value })
                }
              />
              <input
                placeholder="Teléfono"
                className="w-full border rounded-lg px-3 py-2"
                value={form.telefono}
                onChange={(e) =>
                  setForm({ ...form, telefono: e.target.value })
                }
              />
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShow(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 py-2 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => crear.mutate()}
                  disabled={crear.isPending || !form.nombre}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2 rounded-lg disabled:opacity-50"
                >
                  Crear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
