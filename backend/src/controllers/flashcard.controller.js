/**
 * STUDIA - Controlador de tarjetas de memoria (Memory Lab)
 * ------------------------------------------------------------------
 * Gestiona el ciclo de vida de las flashcards y los repasos con SM-2.
 */

import * as flashcardModel from '../models/flashcard.model.js';
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

/** GET /api/flashcards */
export const listFlashcards = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const { rows, total } = await flashcardModel.list({
      userId: req.user.id,
      subjectId: req.query.subjectId,
      topicId: req.query.topicId,
      status: req.query.status,
      search: req.query.search,
      limit,
      offset,
    });

    sendSuccess(res, {
      message: 'Listado de tarjetas de memoria.',
      data: {
        flashcards: rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/flashcards/pending - Tarjetas pendientes de repaso */
export const getPendingFlashcards = async (req, res, next) => {
  try {
    const cards = await flashcardModel.getPendingReview(req.user.id, 50);
    sendSuccess(res, {
      message: 'Tarjetas pendientes de repaso para hoy.',
      data: { flashcards: cards },
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/flashcards/history - Historial de repasos */
export const getReviewHistory = async (req, res, next) => {
  try {
    const history = await flashcardModel.getReviewHistory(req.user.id, 30);
    sendSuccess(res, {
      message: 'Historial de repasos recuperado.',
      data: { history },
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/flashcards/stats - Estadísticas de Memory Lab */
export const getFlashcardStats = async (req, res, next) => {
  try {
    const stats = await flashcardModel.getStats(req.user.id);
    sendSuccess(res, {
      message: 'Estadísticas de Memory Lab.',
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/flashcards/:id */
export const getFlashcard = async (req, res, next) => {
  try {
    const card = await flashcardModel.findById(req.params.id);
    if (!card) throw AppError.notFound('Tarjeta no encontrada.');
    assertOwnership(req.user, card.userId, 'tarjeta de memoria');

    sendSuccess(res, { message: 'Detalle de la tarjeta.', data: { flashcard: card } });
  } catch (error) {
    next(error);
  }
};

/** POST /api/flashcards */
export const createFlashcard = async (req, res, next) => {
  try {
    const { subjectId, topicId } = req.body;
    if (subjectId) {
      const subject = await subjectModel.findById(subjectId);
      if (!subject) throw AppError.notFound('La materia indicada no existe.');
      assertOwnership(req.user, subject.userId, 'materia');
    }
    if (topicId) {
      const topic = await topicModel.findById(topicId);
      if (!topic) throw AppError.notFound('El tema indicado no existe.');
      assertOwnership(req.user, topic.userId, 'tema');
    }

    const created = await flashcardModel.create(req.user.id, req.body);
    sendSuccess(res, {
      status: 201,
      message: 'Tarjeta creada exitosamente.',
      data: { flashcard: created },
    });
  } catch (error) {
    next(error);
  }
};

/** PUT /api/flashcards/:id */
export const updateFlashcard = async (req, res, next) => {
  try {
    const card = await flashcardModel.findById(req.params.id);
    if (!card) throw AppError.notFound('Tarjeta no encontrada.');
    assertOwnership(req.user, card.userId, 'tarjeta de memoria');

    const updated = await flashcardModel.update(req.params.id, req.user.id, req.body);
    sendSuccess(res, { message: 'Tarjeta actualizada.', data: { flashcard: updated } });
  } catch (error) {
    next(error);
  }
};

/** POST /api/flashcards/:id/review - Registra respuesta y evalúa nivel de comprensión SM-2 */
export const reviewFlashcard = async (req, res, next) => {
  try {
    const card = await flashcardModel.findById(req.params.id);
    if (!card) throw AppError.notFound('Tarjeta no encontrada.');
    assertOwnership(req.user, card.userId, 'tarjeta de memoria');

    const { rating, timeTakenSeconds } = req.body;
    const reviewed = await flashcardModel.review(req.params.id, req.user.id, rating, timeTakenSeconds);

    sendSuccess(res, {
      message: `Repaso registrado. Próxima revisión programada en ${reviewed.intervalDays} día(s).`,
      data: { flashcard: reviewed },
    });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/flashcards/:id */
export const deleteFlashcard = async (req, res, next) => {
  try {
    const card = await flashcardModel.findById(req.params.id);
    if (!card) throw AppError.notFound('Tarjeta no encontrada.');
    assertOwnership(req.user, card.userId, 'tarjeta de memoria');

    await flashcardModel.remove(req.params.id, req.user.id);
    sendSuccess(res, { message: 'Tarjeta eliminada con éxito.', data: { id: req.params.id } });
  } catch (error) {
    next(error);
  }
};
