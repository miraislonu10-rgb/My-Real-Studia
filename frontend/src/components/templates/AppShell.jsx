/**
 * STUDIA - Plantilla: armazon de la aplicacion
 * ------------------------------------------------------------------
 * Estructura comun a las pantallas privadas: barra lateral, encabezado y
 * contenido. En pantallas pequenas la barra lateral se convierte en un panel
 * deslizante que se cierra al elegir una opcion.
 *
 * El titulo de la cabecera se toma del elemento de navegacion activo.
 */

import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import Sidebar from '../organisms/Sidebar.jsx';
import Topbar from '../organisms/Topbar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

/** Titulo de cabecera por ruta (debe coincidir con las rutas de App.jsx). */
const TITLES = {
  '/panel': 'Panel',
  '/perfil': 'Mi perfil',
  '/materias': 'Materias',
  '/recursos': 'Recursos',
  '/cronometro': 'Smart Focus',
  '/planificador': 'Smart Planner',
  '/diario-errores': 'Diario de errores',
  '/estadisticas': 'Estadisticas',
  '/memory-lab': 'Memory Lab',
  '/error-dna': 'Error DNA',
  '/knowledge-map': 'Knowledge Map',
  '/study-rescue': 'Study Rescue',
  '/note-to-quiz': 'Note-to-Quiz',
  '/passport': 'Academic Passport',
  '/ai-companion': 'AI Companion',
  '/perfil-aprendizaje': 'Perfil de aprendizaje',
  '/admin/usuarios': 'Usuarios',
};

const SUBTITLES = {
  '/panel': 'Resumen de tu actividad',
};

export default function AppShell() {
  const { isAdmin, fullName } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Al cambiar de ruta se oculta el panel deslizante.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const title = /^\/materias\/\d+$/.test(location.pathname)
    ? 'Materia'
    : TITLES[location.pathname] || 'MY REAL STUDIA';
  const subtitle = SUBTITLES[location.pathname] || (isAdmin ? `Sesion de administrador` : `Hola, ${fullName || ''}`.trim());

  return (
    <div className={`shell${open ? ' shell--open' : ''}`}>
      {/* Enlace de salto para usuarios de teclado (accesibilidad). */}
      <a className="skip-link" href="#contenido">
        Saltar al contenido principal
      </a>

      <Sidebar open={open} onNavigate={() => setOpen(false)} />
      <div className="shell__overlay" onClick={() => setOpen(false)} aria-hidden="true" />

      <div className="shell__body">
        <Topbar title={title} subtitle={subtitle} onMenuClick={() => setOpen(true)} />
        <main className="shell__main" id="contenido" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
