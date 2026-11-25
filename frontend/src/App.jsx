import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Routes, Route, useLocation } from 'react-router-dom';

import Layout from './components/layout/Layout.jsx';
import AuthLayout from './components/templates/AuthLayout.jsx';
import AppShell from './components/templates/AppShell.jsx';
import { ProtectedRoute, RoleRoute, PublicOnlyRoute } from './routes/guards.jsx';

const Home = lazy(() => import('./pages/Home.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const Setup = lazy(() => import('./pages/Setup.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const SmartFocus = lazy(() => import('./pages/SmartFocus.jsx'));
const ErrorJournal = lazy(() => import('./pages/ErrorJournal.jsx'));
const SmartPlanner = lazy(() => import('./pages/SmartPlanner.jsx'));
const LearningProfile = lazy(() => import('./pages/LearningProfile.jsx'));
const Analytics = lazy(() => import('./pages/Analytics.jsx'));
const MemoryLab = lazy(() => import('./pages/MemoryLab.jsx'));
const ErrorDna = lazy(() => import('./pages/ErrorDna.jsx'));
const KnowledgeMap = lazy(() => import('./pages/KnowledgeMap.jsx'));
const StudyRescue = lazy(() => import('./pages/StudyRescue.jsx'));
const NoteToQuiz = lazy(() => import('./pages/NoteToQuiz.jsx'));
const AcademicPassport = lazy(() => import('./pages/AcademicPassport.jsx'));
const AiCompanion = lazy(() => import('./pages/AiCompanion.jsx'));
const Subjects = lazy(() => import('./pages/Subjects.jsx'));
const SubjectDetail = lazy(() => import('./pages/SubjectDetail.jsx'));
const Resources = lazy(() => import('./pages/Resources.jsx'));
const AdminUsers = lazy(() => import('./pages/AdminUsers.jsx'));
const Teaching = lazy(() => import('./pages/Teaching.jsx'));
const StudentProgress = lazy(() => import('./pages/StudentProgress.jsx'));
const AccessDenied = lazy(() => import('./pages/AccessDenied.jsx'));

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
  '/error-dna': ['Error DNA', 'Detecta los patrones de tus errores recurrentes para corregir su origen.'],
  '/knowledge-map': ['Knowledge Map', 'Visualiza tu dominio por materia y las relaciones entre temas.'],
  '/study-rescue': ['Study Rescue', 'Genera un plan de estudio personalizado antes de un examen.'],
  '/note-to-quiz': ['Note-to-Quiz', 'Convierte tus apuntes en cuestionarios de practica con IA.'],
  '/passport': ['Academic Passport', 'Habilidades, proyectos, certificaciones y progreso academico real.'],
  '/ai-companion': ['MY REAL STUDIA AI', 'Asistente academico para explicar conceptos, generar ejercicios y analizar errores.'],
  '/perfil-aprendizaje': ['Perfil de aprendizaje', 'Define tus preferencias y objetivos de aprendizaje en MY REAL STUDIA.'],
  '/perfil': ['Mi perfil', 'Consulta y actualiza los datos de tu cuenta y tu perfil de estudiante.'],
  '/materias': ['Materias', 'Crea, edita y organiza las materias que estudias en MY REAL STUDIA.'],
  '/docencia': ['Docencia', 'Acompanamiento del grupo: progreso, temas en curso y estadisticas de cada alumno.'],
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
  if (/^\/docencia\/[0-9a-f-]{36}$/i.test(pathname)) {
    return ['Progreso del alumno', 'Ficha de solo lectura con el progreso y los temas en curso de un alumno.'];
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
    <Suspense
      fallback={
        <div className="page" role="status" aria-live="polite">
          Cargando página...
        </div>
      }
    >
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
          <Route path="/error-dna" element={<ErrorDna />} />
          <Route path="/knowledge-map" element={<KnowledgeMap />} />
          <Route path="/study-rescue" element={<StudyRescue />} />
          <Route path="/note-to-quiz" element={<NoteToQuiz />} />
          <Route path="/passport" element={<AcademicPassport />} />
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

      {/* Docencia (administradores y tutores): acompanamiento de solo lectura */}
      <Route element={<RoleRoute allow={['admin', 'tutor']} />}>
        <Route element={<AppShell />}>
          <Route path="/docencia" element={<Teaching />} />
          <Route path="/docencia/:uuid" element={<StudentProgress />} />
        </Route>
      </Route>

      {/* Publicas con cabecera y pie */}
      <Route path="/" element={<Layout><Home /></Layout>} />
      <Route path="/acceso-denegado" element={<Layout><AccessDenied /></Layout>} />
      <Route path="*" element={<Layout><NotFound /></Layout>} />
      </Routes>
    </Suspense>
  );
}
