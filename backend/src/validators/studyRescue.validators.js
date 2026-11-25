/**
 * STUDIA - Validadores del plan de rescate (study-rescue)
 * ------------------------------------------------------------------
 * La fecha del examen es obligatoria; el resto de parametros son opcionales
 * y se acotan a rangos razonables.
 */

import { body } from 'express-validator';

export const rescuePlanValidator = [
  body('examDate')
    .notEmpty()
    .withMessage('La fecha del examen es obligatoria (YYYY-MM-DD).')
    .bail()
    .isISO8601()
    .withMessage('La fecha del examen no es valida (YYYY-MM-DD).'),
  body('subjectId')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('La materia indicada no es valida.')
    .toInt(),
  body('availableMinutesPerDay')
    .optional()
    .isInt({ min: 20, max: 600 })
    .withMessage('Los minutos disponibles al dia deben estar entre 20 y 600.')
    .toInt(),
  body('maxTopics')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('El numero maximo de temas debe estar entre 1 y 20.')
    .toInt(),
];

export default { rescuePlanValidator };
