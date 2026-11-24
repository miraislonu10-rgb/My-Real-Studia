/**
 * STUDIA - Controlador del diario de errores (Error Journal)
 * ------------------------------------------------------------------
 * Gestiona el registro, analisis, clasificacion, revision, busqueda y
 * eliminacion de errores cometidos por los estudiantes.
 */

import * as errorModel from '../models/error.model.js';
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
 * GET /api/errors
 * Lista los errores del estudiante con filtros, busqueda de texto y paginacion.
 */
export const listErrors = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    const { rows, total } = await errorModel.list({
      userId: req.user.id,
      subjectId: req.query.subjectId,
      errorType: req.query.errorType,
      status: req.query.status,
      search: req.query.search,
      from: req.query.from,
      to: req.query.to,
      limit,
      offset,
    });

    sendSuccess(res, {
      message: 'Listado de errores recuperado.',
      data: {
        errors: rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/errors/stats
 * Metricas del diario de errores para el panel y los filtros.
 */
export const getErrorStats = async (req, res, next) => {
  try {
    const stats = await errorModel.getStats(req.user.id);
    sendSuccess(res, {
      message: 'Estadisticas del diario de errores.',
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/errors/:id
 * Detalle completo de un error registrado.
 */
export const getError = async (req, res, next) => {
  try {
    const errorRecord = await errorModel.findById(req.params.id);
    if (!errorRecord) throw AppError.notFound('El error indicado no existe.');
    assertOwnership(req.user, errorRecord.userId, 'registro de error');

    sendSuccess(res, {
      message: 'Detalle del error.',
      data: { error: errorRecord },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/errors
 * Registra un nuevo error de aprendizaje.
 */
export const createError = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { subjectId, topicId } = req.body;

    if (subjectId) {
      const subject = await subjectModel.findById(subjectId);
      if (!subject) throw AppError.notFound('La materia seleccionada no existe.');
      assertOwnership(req.user, subject.userId, 'materia');
    }

    if (topicId) {
      const topic = await topicModel.findById(topicId);
      if (!topic) throw AppError.notFound('El tema seleccionado no existe.');
      assertOwnership(req.user, topic.userId, 'tema');
    }

    const created = await errorModel.create(userId, req.body);

    sendSuccess(res, {
      status: 201,
      message: 'Error registrado exitosamente en el diario de errores.',
      data: { error: created },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/errors/:id
 * Actualiza la informacion completa de un error.
 */
export const updateError = async (req, res, next) => {
  try {
    const current = await errorModel.findById(req.params.id);
    if (!current) throw AppError.notFound('El error indicado no existe.');
    assertOwnership(req.user, current.userId, 'registro de error');

    const { subjectId, topicId } = req.body;

    if (subjectId) {
      const subject = await subjectModel.findById(subjectId);
      if (!subject) throw AppError.notFound('La materia seleccionada no existe.');
      assertOwnership(req.user, subject.userId, 'materia');
    }

    if (topicId) {
      const topic = await topicModel.findById(topicId);
      if (!topic) throw AppError.notFound('El tema seleccionado no existe.');
      assertOwnership(req.user, topic.userId, 'tema');
    }

    const updated = await errorModel.update(req.params.id, req.user.id, req.body);

    sendSuccess(res, {
      message: 'Error actualizado correctamente.',
      data: { error: updated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/errors/:id/status
 * Actualiza de forma rapida el estado de revision:
 * 'pending' (pendiente), 'in_review' (en revision) o 'understood' (comprendido).
 */
export const updateStatus = async (req, res, next) => {
  try {
    const current = await errorModel.findById(req.params.id);
    if (!current) throw AppError.notFound('El error indicado no existe.');
    assertOwnership(req.user, current.userId, 'registro de error');

    const updated = await errorModel.updateStatus(req.params.id, req.user.id, req.body.status);

    sendSuccess(res, {
      message: 'Estado de revision actualizado.',
      data: { error: updated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/errors/:id
 * Elimina un error del diario.
 */
export const deleteError = async (req, res, next) => {
  try {
    const current = await errorModel.findById(req.params.id);
    if (!current) throw AppError.notFound('El error indicado no existe.');
    assertOwnership(req.user, current.userId, 'registro de error');

    const deleted = await errorModel.remove(req.params.id, req.user.id);

    sendSuccess(res, {
      message: deleted ? 'Error eliminado correctamente.' : 'No se pudo eliminar el error.',
      data: { deleted },
    });
  } catch (error) {
    next(error);
  }
};
