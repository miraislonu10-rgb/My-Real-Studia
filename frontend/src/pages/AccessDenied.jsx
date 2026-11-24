import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';

/**
 * Pantalla de acceso denegado.
 * Se muestra cuando un usuario autenticado intenta entrar en una seccion que no
 * corresponde a su rol. El backend tambien rechazaria esas peticiones.
 */
export default function AccessDenied() {
  const { fullName } = useAuth();

  return (
    <section className="page">
      <h2 className="page__title">Acceso denegado</h2>
      <div className="status status--error" role="alert">
        <strong>No tienes permisos para ver esta seccion.</strong>
        <p>
          Tu cuenta{fullName ? ` (${fullName})` : ''} no dispone de los privilegios necesarios. Si crees que es un
          error, contacta con el administrador del sistema.
        </p>
      </div>
      <Link className="button" to="/panel">
        Volver a mi panel
      </Link>
    </section>
  );
}
