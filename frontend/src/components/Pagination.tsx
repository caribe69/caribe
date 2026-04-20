import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  totalPages: number;
  totalItems: number;
  from: number;
  to: number;
  size: number;
  setPage: (p: number) => void;
  setSize?: (n: number) => void;
  pageSizes?: number[];
}

export default function Pagination({
  page,
  totalPages,
  totalItems,
  from,
  to,
  size,
  setPage,
  setSize,
  pageSizes = [10, 25, 50, 100],
}: Props) {
  if (totalItems === 0) return null;

  // Construye lista de páginas a mostrar (con elipsis)
  const pages: (number | 'dots')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('dots');
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push('dots');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-sm">
      <div className="text-slate-500">
        Mostrando <span className="font-semibold text-slate-700">{from}</span>{' '}
        – <span className="font-semibold text-slate-700">{to}</span> de{' '}
        <span className="font-semibold text-slate-700">{totalItems}</span>
      </div>

      <div className="flex items-center gap-2">
        {setSize && (
          <select
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-lg text-xs px-2 py-1.5 font-medium text-slate-600 focus:outline-none focus:border-violet-400 cursor-pointer"
          >
            {pageSizes.map((s) => (
              <option key={s} value={s}>
                {s} / página
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-slate-200">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed btn-press"
          >
            <ChevronLeft size={16} />
          </button>

          {pages.map((p, i) =>
            p === 'dots' ? (
              <span
                key={`dots-${i}`}
                className="w-8 text-center text-slate-400 text-xs"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition btn-press ${
                  p === page
                    ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-md shadow-violet-500/30'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ),
          )}

          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed btn-press"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
