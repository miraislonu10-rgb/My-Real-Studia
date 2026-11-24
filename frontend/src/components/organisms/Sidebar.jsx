/**
 * STUDIA - Organismo: Barra lateral de navegacion
 * ------------------------------------------------------------------
 * Agrupa los accesos segun el rol. Es solo presentacion: la autorizacion real
 * la aplica el backend en cada peticion.
 *
 * Cada entrada debe apuntar a una ruta existente en App.jsx. Las materias,
 * temas, tareas y ejercicios se gestionan dentro del panel de la materia
 * (/materias/:id), por lo que aqui solo se enlaza a /materias.
 *
 * @param {{open:boolean, onNavigate:Function}} props
 */

import { NavLink, Link } from 'react-router-dom';

import Icon from '../atoms/Icon.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const appName = import.meta.env.VITE_APP_NAME || 'MY REAL STUDIA';

/** Secciones del estudiante: su propio contenido academico. */
const STUDENT_SECTIONS = [
  {
    label: 'General',
    items: [
      { to: '/panel', label: 'Panel', icon: 'dashboard' },
      { to: '/perfil', label: 'Mi perfil', icon: 'user' },
    ],
  },
  {
    label: 'Mi estudio',
    items: [
      { to: '/materias', label: 'Materias', icon: 'book' },
      { to: '/recursos', label: 'Recursos', icon: 'link' },
      { to: '/cronometro', label: 'Smart Focus', icon: 'clock' },
      { to: '/planificador', label: 'Smart Planner', icon: 'calendar' },
      { to: '/diario-errores', label: 'Diario de errores', icon: 'alert' },
    ],
  },
  {
    label: 'Aprendizaje',
    items: [
      { to: '/memory-lab', label: 'Memory Lab', icon: 'layers' },
      { to: '/estadisticas', label: 'Estadisticas', icon: 'chart' },
      { to: '/ai-companion', label: 'AI Companion', icon: 'sparkles' },
      { to: '/perfil-aprendizaje', label: 'Perfil de aprendizaje', icon: 'target' },
    ],
  },
];

/** Secciones del administrador: gestion del sistema y del contenido. */
const ADMIN_SECTIONS = [
  {
    label: 'General',
    items: [
      { to: '/panel', label: 'Panel', icon: 'dashboard' },
      { to: '/estadisticas', label: 'Estadisticas', icon: 'chart' },
      { to: '/perfil', label: 'Mi perfil', icon: 'user' },
    ],
  },
  {
    label: 'Administracion',
    items: [{ to: '/admin/usuarios', label: 'Usuarios', icon: 'users' }],
  },
  {
    label: 'Contenido academico',
    items: [
      { to: '/materias', label: 'Materias', icon: 'book' },
      { to: '/recursos', label: 'Recursos', icon: 'link' },
    ],
  },
];

export default function Sidebar({ open = false, onNavigate }) {
  const { isAdmin } = useAuth();
  const sections = isAdmin ? ADMIN_SECTIONS : STUDENT_SECTIONS;

  return (
    <aside className="shell__sidebar" aria-label="Navegacion principal">
      <Link to="/panel" className="brand" onClick={onNavigate}>
        <span className="brand__logo">S</span>
        <div>
          <h1 className="brand__title">{appName}</h1>
          <p className="brand__subtitle">Aprendizaje organizado</p>
        </div>
      </Link>

      <nav className="sidenav">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="sidenav__label">{section.label}</p>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="sidenav__link"
                onClick={onNavigate}
                end={item.to === '/panel'}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
