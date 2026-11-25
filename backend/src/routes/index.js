/**
 * STUDIA - Enrutador principal de la API (/api)
 * ------------------------------------------------------------------
 * Agrupa los modulos de rutas: seguridad, usuarios y los modulos academicos
 * (materias, temas, tareas, ejercicios, recursos) y el panel (dashboard).
 */

import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import setupRoutes from './setup.routes.js';
import userRoutes from './user.routes.js';
import subjectRoutes from './subject.routes.js';
import topicRoutes from './topic.routes.js';
import taskRoutes from './task.routes.js';
import exerciseRoutes from './exercise.routes.js';
import resourceRoutes from './resource.routes.js';
import demoRoutes from './demo.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import studySessionRoutes from './studySession.routes.js';
import errorRoutes from './error.routes.js';
import learningProfileRoutes from './learningProfile.routes.js';
import analyticsRoutes from './analytics.routes.js';
import flashcardRoutes from './flashcard.routes.js';
import aiRoutes from './ai.routes.js';
import errorDnaRoutes from './errorDna.routes.js';
import knowledgeMapRoutes from './knowledgeMap.routes.js';
import studyRescueRoutes from './studyRescue.routes.js';
import passportRoutes from './passport.routes.js';
import teacherRoutes from './teacher.routes.js';
import { getApiDocumentation } from '../controllers/docs.controller.js';

const router = Router();

// Indice de la API: describe los recursos disponibles
router.get('/', (req, res) => {
  res.json({
    success: true,
    error: null,
    message: 'STUDIA API v0.1.0',
    data: {
      service: 'studia-api',
      version: '0.1.0',
      status: 'online',
      endpoints: {
        health: '/api/health',
        database: '/api/health/db',
        auth: {
          register: 'POST /api/auth/register',
          login: 'POST /api/auth/login',
          refresh: 'POST /api/auth/refresh',
          logout: 'POST /api/auth/logout',
          logoutAll: 'POST /api/auth/logout-all',
          me: 'GET /api/auth/me',
          forgotPassword: 'POST /api/auth/forgot-password',
          resetPassword: 'POST /api/auth/reset-password',
        },
        setup: {
          status: 'GET /api/setup/status',
          firstAdmin: 'POST /api/setup/first-admin',
        },
        users: {
          me: 'GET /api/users/me',
          myProfile: 'GET /api/users/me/profile',
          updateMyProfile: 'PUT /api/users/me/profile',
          profileByUuid: 'GET /api/users/:uuid/profile',
        },
        admin: {
          listUsers: 'GET /api/users',
          createUser: 'POST /api/users',
          userDetail: 'GET /api/users/:uuid',
          updateUser: 'PUT /api/users/:uuid',
          deleteUser: 'DELETE /api/users/:uuid',
          updateUserStatus: 'PATCH /api/users/:uuid/status',
        },
        dashboard: {
          student: 'GET /api/dashboard/student',
          admin: 'GET /api/dashboard/admin',
        },
        subjects: 'GET|POST /api/subjects · GET|PUT|DELETE /api/subjects/:id',
        topics: 'GET|POST /api/topics · GET|PUT|DELETE /api/topics/:id',
        tasks: 'GET|POST /api/tasks · GET|PUT|DELETE /api/tasks/:id · GET /api/tasks/meta/upcoming',
        exercises: 'GET|POST /api/exercises · GET|PUT|DELETE /api/exercises/:id',
        resources: 'GET /api/resources · GET|PUT|DELETE /api/resources/:id (POST/PUT/DELETE solo admin)',
        demo: 'POST /api/demo/seed (carga datos de ejemplo en una cuenta vacia)',
        studySessions: 'GET /api/study-sessions/active · POST /api/study-sessions/start · POST /api/study-sessions/:id/finish',
        errors: 'GET|POST /api/errors · GET|PUT|DELETE /api/errors/:id · PATCH /api/errors/:id/status',
        learningProfile: 'GET|PUT /api/learning-profile',
        flashcards: 'GET|POST /api/flashcards · GET|PUT|DELETE /api/flashcards/:id · POST /api/flashcards/:id/review',
        analytics: {
          overview: 'GET /api/analytics/overview?from&to',
          weeklyReport: 'GET /api/analytics/weekly-report?date',
        },
        ai: 'POST /api/ai/companion · POST /api/ai/note-to-quiz',
        errorDna: 'GET /api/error-dna?from&to',
        knowledgeMap: 'GET /api/knowledge-map',
        studyRescue: 'POST /api/study-rescue/plan · POST /api/study-rescue/apply',
        passport: {
          overview: 'GET /api/passport',
          entries: 'POST /api/passport/entries · PUT|DELETE /api/passport/entries/:id',
        },
        teacher: {
          summary: 'GET /api/teacher/summary',
          students: 'GET /api/teacher/students?search&sort&page&limit',
          studentDetail: 'GET /api/teacher/students/:uuid',
        },
        docs: 'GET /api/docs',
      },
    },
  });
});

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/setup', setupRoutes);
router.use('/users', userRoutes);
router.use('/subjects', subjectRoutes);
router.use('/topics', topicRoutes);
router.use('/tasks', taskRoutes);
router.use('/exercises', exerciseRoutes);
router.use('/resources', resourceRoutes);
router.use('/demo', demoRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/study-sessions', studySessionRoutes);
router.use('/errors', errorRoutes);
router.use('/learning-profile', learningProfileRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/flashcards', flashcardRoutes);
router.use('/ai', aiRoutes);
router.use('/error-dna', errorDnaRoutes);
router.use('/knowledge-map', knowledgeMapRoutes);
router.use('/study-rescue', studyRescueRoutes);
router.use('/passport', passportRoutes);
router.use('/teacher', teacherRoutes);
router.get('/docs', getApiDocumentation);

export default router;
