import { NavLink, Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext.jsx';

const appName = import.meta.env.VITE_APP_NAME || 'MY REAL STUDIA';

/**
 * Plantilla general de la aplicacion: cabecera con navegacion segun la sesion,
 * contenido y pie.
 * @param {{children: React.ReactNode}} props
 */
export default function Layout({ children }) {
  const { isAuthenticated, isAdmin, fullName, user, signOut, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/iniciar-sesion', { replace: true });
  };

  return (
    <div className="app">
      {/* Enlace de salto: permite a los usuarios de teclado ir directo al
          contenido sin recorrer toda la navegacion (accesibilidad). */}
      <a className="skip-link" href="#contenido">
        Saltar al contenido principal
      </a>

      <header className="app__header">
        <Link to={isAuthenticated ? '/panel' : '/'} className="app__brand">
          <span className="app__logo" aria-hidden="true">
            S
          </span>
          <div>
            <h1 className="app__title">{appName}</h1>
            <p className="app__subtitle">Organiza, estudia y mejora tu aprendizaje</p>
          </div>
        </Link>

        <nav className="app__nav" aria-label="Navegacion principal">
          <NavLink to="/" end>
            Inicio
          </NavLink>

          {isAuthenticated && (
            <>
              <NavLink to="/panel">Panel</NavLink>
              <NavLink to="/materias">Materias</NavLink>
              <NavLink to="/cronometro">Smart Focus</NavLink>
              <NavLink to="/planificador">Smart Planner</NavLink>
              <NavLink to="/diario-errores">Diario de errores</NavLink>
              <NavLink to="/perfil-aprendizaje">Perfil de aprendizaje</NavLink>
              <NavLink to="/perfil">Mi perfil</NavLink>
              {/* La seccion de administracion solo se muestra al rol admin */}
              {isAdmin && <NavLink to="/admin/usuarios">Usuarios</NavLink>}
            </>
          )}

          {!isLoading && !isAuthenticated && (
            <>
              <NavLink to="/iniciar-sesion">Iniciar sesion</NavLink>
              <NavLink to="/registro">Crear cuenta</NavLink>
            </>
          )}
        </nav>

        {isAuthenticated && (
          <div className="app__session">
            <div className="app__session-info">
              <strong>{fullName || user?.email}</strong>
              <span>{isAdmin ? 'Administrador' : 'Estudiante'}</span>
            </div>
            <button type="button" className="button button--ghost button--small" onClick={handleSignOut}>
              Cerrar sesion
            </button>
          </div>
        )}
      </header>

      <main className="app__main" id="contenido" tabIndex={-1}>
        {children}
      </main>

      <footer className="app__footer">
        <p>
          {appName} &middot; Frontend React + Vite &middot; Backend Node.js + Express + MySQL &middot;
          Autenticacion JWT con roles
        </p>
      </footer>
    </div>
  );
}
