/**
 * STUDIA - Validadores del perfil y preferencias de aprendizaje
 * ------------------------------------------------------------------
 * Valida los datos del cuestionario multidimensional.
 */

import { body } from 'express-validator';

export const savePreferencesValidator = [
  body('stepByStepPref')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('La preferencia por explicaciones paso a paso debe estar entre 1 y 5.')
    .toInt(),
  body('problemSolvingPref')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('La preferencia por resolución de problemas debe estar entre 1 y 5.')
    .toInt(),
  body('conceptMapsPref')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('La preferencia por esquemas y mapas conceptuales debe estar entre 1 y 5.')
    .toInt(),
  body('questioningPref')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('La preferencia por práctica mediante preguntas debe estar entre 1 y 5.')
    .toInt(),
  body('spacedRepetitionPref')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('La preferencia por repetición espaciada debe estar entre 1 y 5.')
    .toInt(),
  body('preferredSessionLength')
    .optional()
    .isInt({ min: 10, max: 240 })
    .withMessage('La duración preferida de sesión debe estar entre 10 y 240 minutos.')
    .toInt(),
  body('breakFrequencyMinutes')
    .optional()
    .isInt({ min: 2, max: 60 })
    .withMessage('La frecuencia de descansos debe estar entre 2 y 60 minutos.')
    .toInt(),
  body('preferredStudyTime')
    .optional()
    .isIn(['early_morning', 'morning', 'afternoon', 'evening', 'night', 'flexible'])
    .withMessage('El horario preferido no es válido.'),
  body('weeklyGoalMinutes')
    .optional()
    .isInt({ min: 60, max: 10080 })
    .withMessage('La meta semanal debe estar entre 60 y 10080 minutos.')
    .toInt(),
];
