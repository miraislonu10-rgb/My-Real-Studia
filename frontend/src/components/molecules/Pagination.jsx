/**
 * STUDIA - Molecula: Paginacion
 * @param {{page:number, totalPages:number, total:number, limit:number, onChange:Function}} props
 */

import Button from '../atoms/Button.jsx';

export default function Pagination({ page = 1, totalPages = 1, total = 0, limit = 20, onChange }) {
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav className="pagination" aria-label="Paginacion">
      <span>
        Mostrando {from}-{to} de {total} registros
      </span>

      <div className="pagination__controls">
        <Button
          variant="ghost"
          size="sm"
          icon="chevronLeft"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Anterior
        </Button>
        <span>
          Pagina {page} de {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          iconAfter="chevronRight"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}
