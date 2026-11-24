/**
 * STUDIA - Validadores de sesiones de estudio (study_sessions)
 * ------------------------------------------------------------------
 * Sanean y validan las peticiones para el cronometro inteligente.
 */

import { body, param, query } from 'express-validator';

export const startSessionValidator = [
  body('subjectId')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('La materia indicada no es valida.')
    .toInt(),
  body('topicId')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('El tema indicado no es valido.')
    .toInt(),
  body('sessionType')
    .optional()
    .isIn(['pomodoro', 'free', 'review', 'exam_practice'])
    .withMessage('El tipo de sesion debe ser pomodoro, free, review o exam_practice.'),
  body('notes')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('La descripcion de la actividad no puede superar 2000 caracteres.'),
  body('clientSessionId')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 64 })
    .withMessage('Identificador de cliente invalido.'),
];

export const finishSessionValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El identificador de sesion debe ser un numero positivo.')
    .toInt(),
  body('focusScore')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 5 })
    .withMessage('La productividad percibida debe ser una calificacion de 1 a 5.')
    .toInt(),
  body('notes')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('La descripcion de la actividad no puede superar 2000 caracteres.'),
  body('mood')
    .optional({ values: 'falsy' })
    .isIn(['motivated', 'neutral', 'tired', 'stressed', 'distracted'])
    .withMessage('El estado de animo debe ser motivated, neutral, tired, stressed o distracted.'),
  body('subjectId')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .toInt(),
  body('topicId')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .toInt(),
];

export const sessionIdParamValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El identificador de la sesion no es valido.')
    .toInt(),
];

export const listSessionsValidator = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('subjectId').optional().isInt({ min: 1 }).toInt(),
  query('sessionType')
    .optional()
    .isIn(['pomodoro', 'free', 'review', 'exam_practice']),
  query('from').optional().isISO8601().withMessage('Fecha desde invalida.'),
  query('to').optional().isISO8601().withMessage('Fecha hasta invalida.'),
];
