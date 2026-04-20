import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building, Plus } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';

export default function Sedes() {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ nombre: '', direccion: '', telefono: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['sedes'],
    queryFn: async () => (await api.get<any[]>('/sedes')).data,
  });

  const pag = usePagination(data, 10);

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
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="text-sm text-slate-500">
          {data?.length ?? 0} sedes en la red
        </div>
        <button
          onClick={() => setShow(true)}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-violet-500/30 transition btn-press"
        >
          <Plus size={16} /> Nueva sede
        </button>
      </div>

      {isLoading && (
        <div className="text-slate-400 text-center py-12">Cargando...</div>
      )}

      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest w-14">
                #
              </th>
              <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Sede
              </th>
              <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Dirección
              </th>
              <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Teléfono
              </th>
              <th className="text-left px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {pag.paginated.map((s: any) => (
              <tr
                key={s.id}
                className="border-b border-slate-50 last:border-0 hover:bg-violet-50/30 transition"
              >
                <td className="px-6 py-4 text-slate-400 font-mono">
                  {String(s.id).padStart(2, '0')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shrink-0">
                      <Building size={18} className="text-white" />
                    </div>
                    <div className="font-semibold text-slate-800">
                      {s.nombre}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">{s.direccion || '—'}</td>
                <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                  {s.telefono || '—'}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      s.activa
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${s.activa ? 'bg-emerald-500' : 'bg-slate-400'}`}
                    />
                    {s.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
              </tr>
            ))}
            {data?.length === 0 && !isLoading && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-16 text-center text-slate-400"
                >
                  <Building
                    size={40}
                    className="mx-auto text-slate-300 mb-2"
                  />
                  Sin sedes registradas
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
