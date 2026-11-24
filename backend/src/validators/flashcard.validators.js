/**
 * STUDIA - Validadores de tarjetas de memoria (Memory Lab)
 * ------------------------------------------------------------------
 * Valida creación, edición y calificaciones del algoritmo SM-2.
 */

import { body, param, query } from 'express-validator';

export const createFlashcardValidator = [
  body('frontText')
    .trim()
    .notEmpty()
    .withMessage('El anverso (pregunta o concepto) es obligatorio.')
    .isLength({ max: 5000 }),
  body('backText')
    .trim()
    .notEmpty()
    .withMessage('El reverso (respuesta o explicación) es obligatorio.')
    .isLength({ max: 5000 }),
  body('hint').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }),
  body('subjectId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('topicId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('errorId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('difficultyLevel')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('La dificultad debe ser easy, medium o hard.'),
];

export const updateFlashcardValidator = [
  param('id').isInt({ min: 1 }).toInt(),
  ...createFlashcardValidator,
];

export const reviewFlashcardValidator = [
  param('id').isInt({ min: 1 }).toInt(),
  body('rating')
    .isInt({ min: 0, max: 5 })
    .withMessage('La calificación SM-2 debe ser un número entero entre 0 y 5.')
    .toInt(),
  body('timeTakenSeconds').optional().isInt({ min: 0 }).toInt(),
];

export const flashcardIdParamValidator = [
  param('id').isInt({ min: 1 }).toInt(),
];

export const listFlashcardsValidator = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('subjectId').optional().isInt({ min: 1 }).toInt(),
  query('topicId').optional().isInt({ min: 1 }).toInt(),
  query('status').optional().isIn(['new', 'learning', 'review', 'mastered']),
  query('search').optional().trim(),
];
