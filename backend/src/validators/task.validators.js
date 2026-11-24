/**
 * STUDIA - Validadores de tareas (tasks)
 * ------------------------------------------------------------------
 * Se ejecutan antes del controlador y sanean los datos. Los nombres de campo
 * siguen el formato JSON (camelCase) que consume el frontend.
 */

import { body, param, query } from 'express-validator';

const priorityRule = (optional = true) =>
  (optional ? body('priority').optional() : body('priority'))
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('La prioridad debe ser low, medium, high o urgent.');

const statusRule = (optional = true) =>
  (optional ? body('status').optional() : body('status'))
    .isIn(['pending', 'in_progress', 'completed', 'cancelled'])
    .withMessage('El estado debe ser pending, in_progress, completed o cancelled.');

/** Creacion de una tarea. `title` es obligatorio. */
export const createTaskValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('El titulo de la tarea es obligatorio.')
    .isLength({ max: 200 })
    .withMessage('El titulo no puede superar 200 caracteres.'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }),
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
  body('dueDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('La fecha de vencimiento no es valida.'),
  body('goalPeriod')
    .optional()
    .isIn(['none', 'daily', 'weekly'])
    .withMessage('El periodo del objetivo debe ser none, daily o weekly.'),
  body('scheduledDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('La fecha programada no es valida.'),
  body('scheduledStartTime')
    .optional({ values: 'falsy' })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/)
    .withMessage('La hora de inicio programada debe tener formato HH:mm.'),
  body('scheduledEndTime')
    .optional({ values: 'falsy' })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/)
    .withMessage('La hora de fin programada debe tener formato HH:mm.'),
  priorityRule(),
  statusRule(),
  body('estimatedMinutes')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('Los minutos estimados deben ser mayores que 0.')
    .toInt(),
  body('actualMinutes')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 })
    .withMessage('Los minutos reales no pueden ser negativos.')
    .toInt(),
  body('userUuid')
    .optional({ values: 'falsy' })
    .isUUID()
    .withMessage('El usuario indicado no es valido.'),
];

/** Actualizacion: todos los campos son opcionales. */
export const updateTaskValidator = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El titulo de la tarea es obligatorio.')
    .isLength({ max: 200 })
    .withMessage('El titulo no puede superar 200 caracteres.'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }),
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
  body('dueDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('La fecha de vencimiento no es valida.'),
  body('goalPeriod')
    .optional()
    .isIn(['none', 'daily', 'weekly'])
    .withMessage('El periodo del objetivo debe ser none, daily o weekly.'),
  body('scheduledDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('La fecha programada no es valida.'),
  body('scheduledStartTime')
    .optional({ values: 'falsy' })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/)
    .withMessage('La hora de inicio programada debe tener formato HH:mm.'),
  body('scheduledEndTime')
    .optional({ values: 'falsy' })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/)
    .withMessage('La hora de fin programada debe tener formato HH:mm.'),
  priorityRule(),
  statusRule(),
  body('estimatedMinutes')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('Los minutos estimados deben ser mayores que 0.')
    .toInt(),
  body('actualMinutes')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 })
    .withMessage('Los minutos reales no pueden ser negativos.')
    .toInt(),
];

/** El id numerico de la tarea. */
export const taskIdParamValidator = [
  param('id').isInt({ min: 1 }).withMessage('El identificador no es valido.').toInt(),
];

/** Filtros del listado. */
export const listTasksValidator = [
  query('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed', 'cancelled'])
    .withMessage('El estado no es valido.'),
  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('La prioridad no es valida.'),
  query('goalPeriod')
    .optional()
    .isIn(['none', 'daily', 'weekly'])
    .withMessage('El periodo de objetivo debe ser none, daily o weekly.'),
  query('subjectId')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('La materia no es valida.')
    .toInt(),
  query('from').optional({ values: 'falsy' }).isISO8601().withMessage('La fecha inicial no es valida.'),
  query('to').optional({ values: 'falsy' }).isISO8601().withMessage('La fecha final no es valida.'),
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
  query('userUuid').optional({ values: 'falsy' }).isUUID().withMessage('El usuario indicado no es valido.'),
  query('page').optional().isInt({ min: 1 }).withMessage('La pagina no es valida.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El limite no es valido.').toInt(),
];

export default {
  createTaskValidator,
  updateTaskValidator,
  taskIdParamValidator,
  listTasksValidator,
};
