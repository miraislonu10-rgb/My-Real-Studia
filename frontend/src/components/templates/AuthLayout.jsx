/**
 * STUDIA - Plantilla: pantallas publicas de acceso
 * ------------------------------------------------------------------
 * Centra las pantallas de inicio de sesion, registro y recuperacion de
 * contraseña en una tarjeta con la marca del proyecto. Detras de la tarjeta
 * se dibuja un fondo animado de ondas (atomo ShaderWaves) que respeta los
 * tokens de color del tema y se desactiva con "prefers-reduced-motion".
 */

import { Link, Outlet } from 'react-router-dom';

import ShaderWaves from '../atoms/ShaderWaves.jsx';

const appName = import.meta.env.VITE_APP_NAME || 'MY REAL STUDIA';

export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <ShaderWaves
        className="auth-shell__waves"
        speed={0.3}
        frequency={1.1}
        intensity={1}
        complexity={0.55}
        opacity={0.45}
        transparent
      />

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
