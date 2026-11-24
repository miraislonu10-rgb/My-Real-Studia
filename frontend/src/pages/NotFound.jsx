import { Link } from 'react-router-dom';

/** Pagina 404 del cliente. */
export default function NotFound() {
  return (
    <section className="page">
      <h2 className="page__title">Pagina no encontrada</h2>
      <p className="page__text">La ruta solicitada no existe en MY REAL STUDIA.</p>
      <Link className="button" to="/">
        Volver al inicio
      </Link>
    </section>
  );
}
