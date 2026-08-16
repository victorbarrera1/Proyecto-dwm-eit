import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, limit, total, onPageChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / limit));
  if (pageCount <= 1) return null;

  return (
    <nav className="pagination" aria-label="Paginación">
      <button className="button button--secondary button--small" type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft size={16} /> Anterior
      </button>
      <span aria-live="polite">
        Página <strong>{page}</strong> de {pageCount}
      </span>
      <button className="button button--secondary button--small" type="button" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
        Siguiente <ChevronRight size={16} />
      </button>
    </nav>
  );
}
