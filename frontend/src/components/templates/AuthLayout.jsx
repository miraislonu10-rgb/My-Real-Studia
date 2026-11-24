/**
 * STUDIA - Plantilla: pantallas publicas de acceso
 * ------------------------------------------------------------------
 * Centra las pantallas de inicio de sesion, registro y recuperacion de
 * contraseña en una tarjeta con la marca del proyecto.
 */

import { Link, Outlet } from 'react-router-dom';

const appName = import.meta.env.VITE_APP_NAME || 'MY REAL STUDIA';

export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <Link to="/" className="auth-brand__logo" aria-label={appName}>
            S
          </Link>
          <h1>{appName}</h1>
          <p>Organiza, estudia y mejora tu aprendizaje</p>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
