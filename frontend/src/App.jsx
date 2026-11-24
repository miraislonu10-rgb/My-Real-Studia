import { useEffect } from 'react';
import { Navigate, Routes, Route, useLocation } from 'react-router-dom';

import Layout from './components/layout/Layout.jsx';
import AuthLayout from './components/templates/AuthLayout.jsx';
import AppShell from './components/templates/AppShell.jsx';
import { ProtectedRoute, RoleRoute, PublicOnlyRoute } from './routes/guards.jsx';

import Home from './pages/Home.jsx';
import NotFound from './pages/NotFound.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Setup from './pages/Setup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import SmartFocus from './pages/SmartFocus.jsx';
import ErrorJournal from './pages/ErrorJournal.jsx';
import SmartPlanner from './pages/SmartPlanner.jsx';
import LearningProfile from './pages/LearningProfile.jsx';
import Analytics from './pages/Analytics.jsx';
import MemoryLab from './pages/MemoryLab.jsx';
import AiCompanion from './pages/AiCompanion.jsx';
import Subjects from './pages/Subjects.jsx';
import SubjectDetail from './pages/SubjectDetail.jsx';
import Resources from './pages/Resources.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import AccessDenied from './pages/AccessDenied.jsx';

const APP_NAME = import.meta.env.VITE_APP_NAME || 'MY REAL STUDIA';

/**
 * Titulo y descripcion por ruta (SEO y accesibilidad de la pestaña).
 * Cada entrada es [titulo, meta descripcion]; las rutas desconocidas usan el
 * texto por defecto ("Pagina no encontrada").
 */
const PAGE_META = {
  '/': ['Inicio', 'Bienvenido a MY REAL STUDIA: organiza tu estudio, registra tu avance y aprende con técnicas de estudio eficaces.'],
  '/iniciar-sesion': ['Iniciar sesion', 'Accede a tu cuenta de MY REAL STUDIA para gestionar materias, tareas, habitos y estadisticas de estudio.'],
  '/registro': ['Crear cuenta', 'Crea tu cuenta de estudiante en MY REAL STUDIA y comienza a organizar y mejorar tu aprendizaje.'],
  '/recuperar-password': ['Recuperar contraseña', 'Solicita un enlace para restablecer la contraseña de tu cuenta de MY REAL STUDIA.'],
  '/restablecer-password': ['Restablecer contraseña', 'Define una nueva contraseña para tu cuenta de MY REAL STUDIA.'],
  '/configuracion-inicial': ['Configuracion inicial', 'Crea la primera cuenta de administrador de MY REAL STUDIA.'],
  '/recursos': ['Recursos', 'Explora recursos educativos recomendados para tu estudio en MY REAL STUDIA.'],
  '/panel': ['Panel', 'Resumen de tu actividad academica en MY REAL STUDIA.'],
  '/cronometro': ['Smart Focus', 'Registra tus sesiones de estudio con el cronometro de MY REAL STUDIA.'],
  '/planificador': ['Smart Planner', 'Planifica tus tareas y tu estudio segun prioridad y fecha.'],
  '/diario-errores': ['Diario de errores', 'Registra y revisa tus errores recurrentes para mejorar tu aprendizaje.'],
  '/estadisticas': ['Estadisticas', 'Analitica real de tiempo de estudio, sesiones, ejercicios y errores.'],
  '/memory-lab': ['Memory Lab', 'Repasa tus tarjetas con el sistema de repeticion espaciada SM-2.'],
  '/ai-companion': ['MY REAL STUDIA AI', 'Asistente academico para explicar conceptos, generar ejercicios y analizar errores.'],
  '/perfil-aprendizaje': ['Perfil de aprendizaje', 'Define tus preferencias y objetivos de aprendizaje en MY REAL STUDIA.'],
  '/perfil': ['Mi perfil', 'Consulta y actualiza los datos de tu cuenta y tu perfil de estudiante.'],
  '/materias': ['Materias', 'Crea, edita y organiza las materias que estudias en MY REAL STUDIA.'],
  '/admin/usuarios': ['Gestion de usuarios', 'Administra las cuentas de usuario registradas en MY REAL STUDIA.'],
  '/acceso-denegado': ['Acceso denegado', 'No tienes permisos para acceder a esta seccion de MY REAL STUDIA.'],
};

const NOT_FOUND_META = ['Pagina no encontrada', 'La pagina solicitada no existe en MY REAL STUDIA.'];

/**
 * Resuelve el titulo y la meta descripcion de una ruta. Ademas del mapa exacto
 * cubre la ruta dinamica del panel de la materia (/materias/:id).
 */
const resolveMeta = (pathname) => {
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  if (/^\/materias\/\d+$/.test(pathname)) {
    return ['Materia', 'Detalle de la materia: gestiona sus temas, tareas y ejercicios en MY REAL STUDIA.'];
  }
  return NOT_FOUND_META;
};

/**
 * STUDIA - Rutas del cliente
 * ------------------------------------------------------------------
 * Agrupadas por nivel de acceso y por plantilla:
 *   - AuthLayout: acceso y recuperacion de contraseña (tarjeta centrada).
 *   - AppShell (menu lateral): pantallas privadas y administracion.
 *   - Layout (cabecera y pie): inicio y paginas de error.
 *
 * Las guardas del cliente ordenan la interfaz; la autorizacion efectiva la
 * realiza siempre el backend en cada peticion.
 */
export default function App() {
  const { pathname } = useLocation();
  const [title, description] = resolveMeta(pathname);

  // Mantiene el titulo de la pestaña y la meta descripcion alineados con la ruta.
  useEffect(() => {
    document.title = `${title} · ${APP_NAME}`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', description);
  }, [title, description]);

  return (
    <Routes>
      {/* Publicas exclusivas: acceso y recuperacion (tarjeta centrada) */}
      <Route element={<PublicOnlyRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/iniciar-sesion" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/recuperar-password" element={<ForgotPassword />} />
        </Route>
      </Route>

      {/* Accesible con o sin sesion (el enlace del correo puede abrirse ya logueado) */}
      <Route element={<AuthLayout />}>
        <Route path="/restablecer-password" element={<ResetPassword />} />
        {/* Configuracion inicial: crear el primer administrador de una instalacion nueva */}
        <Route path="/configuracion-inicial" element={<Setup />} />
      </Route>

      {/* Privadas (cualquier rol): armazon con menu lateral */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/panel" element={<Dashboard />} />
          <Route path="/cronometro" element={<SmartFocus />} />
          <Route path="/planificador" element={<SmartPlanner />} />
          <Route path="/diario-errores" element={<ErrorJournal />} />
          <Route path="/estadisticas" element={<Analytics />} />
          <Route path="/memory-lab" element={<MemoryLab />} />
          <Route path="/ai-companion" element={<AiCompanion />} />
          <Route path="/perfil-aprendizaje" element={<LearningProfile />} />
          <Route path="/materias" element={<Subjects />} />
          <Route path="/materias/:id" element={<SubjectDetail />} />
          <Route path="/recursos" element={<Resources />} />
          {/* La gestion de temas ahora vive en el panel de la materia */}
          <Route path="/temas" element={<Navigate to="/materias" replace />} />
          <Route path="/perfil" element={<Profile />} />
        </Route>
      </Route>

      {/* Solo administradores: mismo armazon con menu lateral */}
      <Route element={<RoleRoute allow={['admin']} />}>
        <Route element={<AppShell />}>
          <Route path="/admin/usuarios" element={<AdminUsers />} />
        </Route>
      </Route>

      {/* Publicas con cabecera y pie */}
      <Route path="/" element={<Layout><Home /></Layout>} />
      <Route path="/acceso-denegado" element={<Layout><AccessDenied /></Layout>} />
      <Route path="*" element={<Layout><NotFound /></Layout>} />
    </Routes>
  );
}
