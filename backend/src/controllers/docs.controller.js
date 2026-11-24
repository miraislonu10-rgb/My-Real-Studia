/**
 * STUDIA - Controlador de documentación de la API REST (/api/docs)
 * ------------------------------------------------------------------
 * Especifica todos los endpoints, parámetros, métodos HTTP y formatos de respuesta.
 */

import { sendSuccess } from '../utils/respond.js';

export const getApiDocumentation = (req, res) => {
  const documentation = {
    title: 'STUDIA RESTful API Specification',
    version: '1.0.0',
    description: 'API REST para la plataforma académica STUDIA. Formato uniforme de respuesta: { success, error, message, data }',
    baseUrl: '/api',
    authentication: 'Bearer Token (JWT) en cabecera Authorization o cookie HttpOnly refresh_token',
    modules: [
      {
        name: 'Autenticación (/api/auth)',
        endpoints: [
          { method: 'POST', path: '/auth/register', description: 'Registro de nuevo estudiante', auth: false, body: { email: 'string', password: 'string (min 8)', firstName: 'string', lastName: 'string' } },
          { method: 'POST', path: '/auth/login', description: 'Inicio de sesión, genera access token y cookie httpOnly', auth: false, body: { email: 'string', password: 'string' } },
          { method: 'POST', path: '/auth/refresh', description: 'Renovación de token de acceso mediante cookie httpOnly', auth: false },
          { method: 'POST', path: '/auth/logout', description: 'Cierre de sesión y revocación del token', auth: true },
          { method: 'GET', path: '/auth/me', description: 'Obtiene el usuario en sesión', auth: true },
          { method: 'POST', path: '/auth/forgot-password', description: 'Solicita recuperación de contraseña', auth: false, body: { email: 'string' } },
          { method: 'POST', path: '/auth/reset-password', description: 'Restablece la contraseña con token', auth: false, body: { token: 'string', password: 'string' } },
        ],
      },
      {
        name: 'Smart Focus — Cronómetro (/api/study-sessions)',
        endpoints: [
          { method: 'GET', path: '/study-sessions/active', description: 'Obtiene la sesión activa en curso con duración calculada por timestamps', auth: true },
          { method: 'GET', path: '/study-sessions/stats', description: 'Métricas de tiempo de estudio de hoy, semana e histórico', auth: true },
          { method: 'GET', path: '/study-sessions', description: 'Historial de sesiones completadas con paginación y filtros', auth: true, query: { page: 'int', limit: 'int', subjectId: 'int', from: 'ISO8601', to: 'ISO8601' } },
          { method: 'POST', path: '/study-sessions/start', description: 'Inicia sesión de estudio y previene duplicados', auth: true, body: { subjectId: 'int?', topicId: 'int?', sessionType: 'string', notes: 'string?', clientSessionId: 'string?' } },
          { method: 'POST', path: '/study-sessions/:id/pause', description: 'Pausa sesión activa', auth: true },
          { method: 'POST', path: '/study-sessions/:id/resume', description: 'Reanuda sesión pausada', auth: true },
          { method: 'POST', path: '/study-sessions/:id/finish', description: 'Finaliza sesión, calcula duración con timestamps y registra productividad', auth: true, body: { focusScore: 'int (1-5)', notes: 'string?', mood: 'string?' } },
          { method: 'DELETE', path: '/study-sessions/:id', description: 'Descarta sesión en curso', auth: true },
        ],
      },
      {
        name: 'Smart Planner — Organizador (/api/tasks)',
        endpoints: [
          { method: 'GET', path: '/tasks', description: 'Lista tareas con filtros de estado, prioridad y búsqueda', auth: true, query: { status: 'string', priority: 'string', subjectId: 'int', goalPeriod: 'string', search: 'string' } },
          { method: 'POST', path: '/tasks', description: 'Crea tarea u objetivo diario/semanal', auth: true, body: { title: 'string', description: 'string?', subjectId: 'int?', topicId: 'int?', priority: 'low|medium|high|urgent', dueDate: 'ISO8601?', scheduledDate: 'YYYY-MM-DD?', scheduledStartTime: 'HH:mm?', scheduledEndTime: 'HH:mm?', goalPeriod: 'none|daily|weekly' } },
          { method: 'GET', path: '/tasks/:id', description: 'Obtiene detalle de tarea', auth: true },
          { method: 'PUT', path: '/tasks/:id', description: 'Actualiza tarea completa', auth: true, body: { title: 'string', priority: 'string', dueDate: 'ISO8601?' } },
          { method: 'PATCH', path: '/tasks/:id/status', description: 'Actualiza estado rápido (pending, completed)', auth: true, body: { status: 'string' } },
          { method: 'DELETE', path: '/tasks/:id', description: 'Elimina tarea', auth: true },
          { method: 'GET', path: '/tasks/calendar', description: 'Obtiene tareas para vista de calendario', auth: true, query: { from: 'ISO8601', to: 'ISO8601' } },
          { method: 'GET', path: '/tasks/goals', description: 'Obtiene objetivos diarios y semanales con conteos', auth: true },
          { method: 'GET', path: '/tasks/recommendations/reschedule', description: 'Recomendaciones inteligentes para reorganizar tareas atrasadas sin choques de horario', auth: true },
          { method: 'POST', path: '/tasks/recommendations/apply', description: 'Aplica una reprogramación libre de solapamientos', auth: true, body: { taskId: 'int', suggestedDate: 'YYYY-MM-DD', suggestedStartTime: 'HH:mm', suggestedEndTime: 'HH:mm' } },
        ],
      },
      {
        name: 'Error Journal — Diario de Errores (/api/errors)',
        endpoints: [
          { method: 'GET', path: '/errors', description: 'Lista errores con filtros por materia, tipo de error y estado de revisión', auth: true, query: { subjectId: 'int', errorType: 'string', status: 'string', search: 'string' } },
          { method: 'POST', path: '/errors', description: 'Registra nuevo error de aprendizaje', auth: true, body: { exerciseTitle: 'string', subjectId: 'int?', topicId: 'int?', userAnswer: 'string?', correctAnswer: 'string?', explanation: 'string?', errorType: 'conceptual|procedural|calculation|interpretation|memory', status: 'pending|in_review|understood', errorDate: 'YYYY-MM-DD?' } },
          { method: 'GET', path: '/errors/:id', description: 'Obtiene detalle de un error', auth: true },
          { method: 'PUT', path: '/errors/:id', description: 'Actualiza error completo', auth: true, body: { exerciseTitle: 'string', explanation: 'string' } },
          { method: 'PATCH', path: '/errors/:id/status', description: 'Actualiza estado de revisión rápidamente', auth: true, body: { status: 'pending|in_review|understood' } },
          { method: 'DELETE', path: '/errors/:id', description: 'Elimina error', auth: true },
          { method: 'GET', path: '/errors/stats', description: 'Métricas de errores por tipo y estado', auth: true },
        ],
      },
      {
        name: 'Learning Profile — Preferencias (/api/learning-profile)',
        endpoints: [
          { method: 'GET', path: '/learning-profile', description: 'Obtiene las preferencias y el perfil dinámico multidimensional', auth: true },
          { method: 'PUT', path: '/learning-profile', description: 'Actualiza respuestas del cuestionario y recalcula perfil dinámico', auth: true, body: { stepByStepPref: '1-5', problemSolvingPref: '1-5', conceptMapsPref: '1-5', questioningPref: '1-5', spacedRepetitionPref: '1-5', preferredSessionLength: 'int', breakFrequencyMinutes: 'int', preferredStudyTime: 'string', weeklyGoalMinutes: 'int' } },
        ],
      },
      {
        name: 'Memory Lab — Repetición Espaciada (/api/flashcards)',
        endpoints: [
          { method: 'GET', path: '/flashcards', description: 'Lista tarjetas con filtros', auth: true },
          { method: 'POST', path: '/flashcards', description: 'Crea tarjeta de memoria', auth: true, body: { frontText: 'string', backText: 'string', hint: 'string?', subjectId: 'int?', topicId: 'int?', difficultyLevel: 'easy|medium|hard' } },
          { method: 'GET', path: '/flashcards/pending', description: 'Obtiene tarjetas pendientes de repaso para hoy', auth: true },
          { method: 'GET', path: '/flashcards/history', description: 'Historial de repasos completados', auth: true },
          { method: 'GET', path: '/flashcards/stats', description: 'Métricas de tarjetas y repasos', auth: true },
          { method: 'GET', path: '/flashcards/:id', description: 'Detalle de tarjeta', auth: true },
          { method: 'PUT', path: '/flashcards/:id', description: 'Actualiza contenido de tarjeta', auth: true, body: { frontText: 'string', backText: 'string' } },
          { method: 'POST', path: '/flashcards/:id/review', description: 'Registra repaso y evalúa comprensión con algoritmo SM-2', auth: true, body: { rating: 'int (0-5)', timeTakenSeconds: 'int?' } },
          { method: 'DELETE', path: '/flashcards/:id', description: 'Elimina tarjeta', auth: true },
        ],
      },
      {
        name: 'Academic Analytics (/api/analytics)',
        endpoints: [
          { method: 'GET', path: '/analytics/overview', description: 'Tiempo total, sesiones, tiempo por materia, aciertos, errores recurrentes y objetivos', auth: true, query: { from: 'ISO8601?', to: 'ISO8601?' } },
          { method: 'GET', path: '/analytics/weekly-report', description: 'Informe semanal con datos reales y comparativa con semanas anteriores', auth: true, query: { date: 'YYYY-MM-DD?' } },
        ],
      },
      {
        name: 'AI Companion (/api/ai)',
        endpoints: [
          { method: 'POST', path: '/ai/companion', description: 'Consulta al tutor pedagógico inteligente con contexto académico seguro', auth: true, body: { action: 'explain_concept|generate_exercise|provide_hint|explain_wrong_answer|analyze_frequent_errors|recommend_theory|personalized_review', prompt: 'string?', subjectName: 'string?', topicName: 'string?', exerciseText: 'string?', userAnswer: 'string?', correctAnswer: 'string?' } },
        ],
      },
    ],
  };

  sendSuccess(res, {
    message: 'Catálogo y especificación de endpoints RESTful de STUDIA.',
    data: documentation,
  });
};
