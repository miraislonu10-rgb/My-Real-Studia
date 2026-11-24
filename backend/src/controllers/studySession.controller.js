/**
 * STUDIA - Controlador de sesiones de estudio (Smart Focus)
 * ------------------------------------------------------------------
 * Administra el ciclo de vida del cronometro inteligente en el backend:
 *   - Inicio, pausa, reanudacion y finalizacion basados en marcas de tiempo UTC.
 *   - Calculo de duracion con precision y registro de productividad percibida.
 *   - Prevencion de sesiones duplicadas.
 *   - Historial y metricas de estudio.
 */

import * as studySessionModel from '../models/studySession.model.js';
import * as subjectModel from '../models/subject.model.js';
import * as topicModel from '../models/topic.model.js';
import { AppError } from '../utils/errors.js';
import { assertOwnership } from '../utils/ownership.js';
import { sendSuccess } from '../utils/respond.js';

const getPagination = (query) => {
  const page = Number.parseInt(query.page ?? '1', 10) || 1;
  const limit = Math.min(Number.parseInt(query.limit ?? '20', 10) || 20, 100);
  return { page, limit, offset: (page - 1) * limit };
};

/**
 * GET /api/study-sessions/active
 * Devuelve la sesion en curso del estudiante (si existe) y los segundos
 * transcurridos calculados a partir de las marcas de tiempo.
 */
export const getActiveSession = async (req, res, next) => {
  try {
    const active = await studySessionModel.findActiveSession(req.user.id);
    sendSuccess(res, {
      message: active ? 'Sesion activa recuperada.' : 'No hay ninguna sesion activa en curso.',
      data: { activeSession: active },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/study-sessions/start
 * Inicia una sesion de estudio. Evita registrar duplicados si ya hay una activa.
 */
export const startSession = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { subjectId, topicId, sessionType, notes, clientSessionId } = req.body;

    // Validar pertenencia de materia si se envia
    if (subjectId) {
      const subject = await subjectModel.findById(subjectId);
      if (!subject) throw AppError.notFound('La materia seleccionada no existe.');
      assertOwnership(req.user, subject.userId, 'materia');
    }

    // Validar pertenencia de tema si se envia
    if (topicId) {
      const topic = await topicModel.findById(topicId);
      if (!topic) throw AppError.notFound('El tema seleccionado no existe.');
      assertOwnership(req.user, topic.userId, 'tema');
    }

    const session = await studySessionModel.start(userId, {
      subjectId,
      topicId,
      sessionType,
      notes,
      clientSessionId,
    });

    sendSuccess(res, {
      status: 201,
      message: 'Sesion de estudio iniciada correctamente.',
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/study-sessions/:id/pause
 * Pausa la sesion de estudio activa.
 */
export const pauseSession = async (req, res, next) => {
  try {
    const session = await studySessionModel.findById(req.params.id);
    if (!session) throw AppError.notFound('No se encontro la sesion de estudio.');
    assertOwnership(req.user, session.userId, 'sesion de estudio');

    if (session.endedAt) {
      throw AppError.badRequest('Esta sesion ya fue finalizada.');
    }

    const updated = await studySessionModel.pause(req.params.id, req.user.id);

    sendSuccess(res, {
      message: 'Sesion pausada.',
      data: { session: updated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/study-sessions/:id/resume
 * Reanuda la sesion de estudio pausada.
 */
export const resumeSession = async (req, res, next) => {
  try {
    const session = await studySessionModel.findById(req.params.id);
    if (!session) throw AppError.notFound('No se encontro la sesion de estudio.');
    assertOwnership(req.user, session.userId, 'sesion de estudio');

    if (session.endedAt) {
      throw AppError.badRequest('Esta sesion ya fue finalizada.');
    }

    const updated = await studySessionModel.resume(req.params.id, req.user.id);

    sendSuccess(res, {
      message: 'Sesion reanudada.',
      data: { session: updated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/study-sessions/:id/finish
 * Finaliza la sesion de estudio, calcula duracion con marcas de tiempo,
 * registra productividad percibida y guarda en el historial.
 */
export const finishSession = async (req, res, next) => {
  try {
    const session = await studySessionModel.findById(req.params.id);
    if (!session) throw AppError.notFound('No se encontro la sesion de estudio.');
    assertOwnership(req.user, session.userId, 'sesion de estudio');

    const { focusScore, notes, mood, subjectId, topicId } = req.body;

    const finished = await studySessionModel.finish(req.params.id, req.user.id, {
      focusScore,
      notes,
      mood,
      subjectId,
      topicId,
    });

    sendSuccess(res, {
      message: 'Sesion de estudio completada y guardada en el historial.',
      data: { session: finished },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/study-sessions/:id
 * Descarta o cancela una sesion no completada.
 */
export const discardSession = async (req, res, next) => {
  try {
    const session = await studySessionModel.findById(req.params.id);
    if (!session) throw AppError.notFound('No se encontro la sesion de estudio.');
    assertOwnership(req.user, session.userId, 'sesion de estudio');

    const deleted = await studySessionModel.discard(req.params.id, req.user.id);

    sendSuccess(res, {
      message: deleted ? 'Sesion descartada.' : 'No se pudo descartar la sesion.',
      data: { discarded: deleted },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/study-sessions
 * Lista el historial de sesiones completadas con paginacion y filtros.
 */
export const listSessions = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    const { rows, total } = await studySessionModel.list({
      userId: req.user.id,
      subjectId: req.query.subjectId,
      sessionType: req.query.sessionType,
      from: req.query.from,
      to: req.query.to,
      limit,
      offset,
    });

    sendSuccess(res, {
      message: 'Historial de sesiones de estudio.',
      data: {
        sessions: rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/study-sessions/stats
 * Devuelve metricas agregadas de tiempo y sesiones de estudio.
 */
export const getStats = async (req, res, next) => {
  try {
    const stats = await studySessionModel.getStats(req.user.id);
    sendSuccess(res, {
      message: 'Estadisticas de estudio.',
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};
