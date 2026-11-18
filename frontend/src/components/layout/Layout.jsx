import { NavLink } from 'react-router-dom';

const appName = import.meta.env.VITE_APP_NAME || 'STUDIA';

/**
 * Plantilla general de la aplicacion: cabecera, contenido y pie.
 * @param {{children: React.ReactNode}} props
 */
export default function Layout({ children }) {
  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__logo">S</span>
          <div>
            <h1 className="app__title">{appName}</h1>
            <p className="app__subtitle">Organiza, estudia y mejora tu aprendizaje</p>
          </div>
        </div>

        <nav className="app__nav">
          <NavLink to="/" end>
            Inicio
          </NavLink>
        </nav>
      </header>

      <main className="app__main">{children}</main>

      <footer className="app__footer">
        <p>{appName} &middot; Frontend React + Vite &middot; Backend Node.js + Express + MySQL</p>
      </footer>
    </div>
  );
}
