import { useMemo, useState, useEffect } from 'react';

export function usePagination<T>(data: T[] | undefined, pageSize = 10) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(pageSize);

  const totalItems = data?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / size));

  // Si cambia el tamaño de datos y la página queda fuera de rango, ajusta
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    if (!data) return [];
    const start = (page - 1) * size;
    return data.slice(start, start + size);
  }, [data, page, size]);

  return {
    page,
    setPage,
    size,
    setSize,
    totalPages,
    totalItems,
    paginated,
    from: totalItems === 0 ? 0 : (page - 1) * size + 1,
    to: Math.min(page * size, totalItems),
  };
}
