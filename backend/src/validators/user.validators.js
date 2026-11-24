/**
 * STUDIA - Validadores del perfil de estudiante y del panel de administracion
 */

import { body, param, query } from 'express-validator';
import { env } from '../config/env.js';

const MIN_PASSWORD = env.auth.minPasswordLength;

const nameRule = (field, label) =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage(`El ${label} es obligatorio.`)
    .isLength({ min: 2, max: 80 })
    .withMessage(`El ${label} debe tener entre 2 y 80 caracteres.`)
    .matches(/^[\p{L}\s'.-]+$/u)
    .withMessage(`El ${label} contiene caracteres no permitidos.`);

const emailRule = (optional = false) =>
  (optional ? body('email').optional() : body('email'))
    .trim()
    .notEmpty()
    .withMessage('El correo es obligatorio.')
    .isEmail()
    .withMessage('El correo no tiene un formato valido.')
    .isLength({ max: 191 })
    .withMessage('El correo es demasiado largo.')
    .normalizeEmail({ gmail_remove_dots: false });

/** Actualizacion del perfil propio. Solo se aceptan los campos editables. */
export const updateProfileValidator = [
  body('birthDate').optional({ values: 'falsy' }).isISO8601().withMessage('La fecha de nacimiento no es valida.'),
  body('educationLevel')
    .optional({ values: 'falsy' })
    .isIn(['primary', 'secondary', 'high_school', 'undergraduate', 'postgraduate', 'self_taught'])
    .withMessage('El nivel educativo no es valido.'),
  body('institution').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  body('academicProgram').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  body('gradeLevel').optional({ values: 'falsy' }).trim().isLength({ max: 50 }),
  body('mainGoal').optional({ values: 'falsy' }).trim().isLength({ max: 255 }),
  body('dailyGoalMinutes')
    .optional({ values: 'falsy' })
    .isInt({ min: 10, max: 1440 })
    .withMessage('La meta diaria debe estar entre 10 y 1440 minutos.')
    .toInt(),
  body('timezone').optional({ values: 'falsy' }).trim().isLength({ max: 64 }),
  body('avatarUrl').optional({ values: 'falsy' }).trim().isURL().withMessage('La URL del avatar no es valida.').isLength({ max: 500 }),
  body('bio').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }).withMessage('La biografia es demasiado larga.'),
];

/** El uuid publico siempre debe tener formato UUID v4. */
export const uuidParamValidator = [param('uuid').isUUID().withMessage('El identificador no es valido.')];

/** Cambio de estado de una cuenta desde el panel de administracion. */
export const updateStatusValidator = [
  ...uuidParamValidator,
  body('status')
    .isIn(['active', 'suspended', 'deleted'])
    .withMessage('El estado debe ser active, suspended o deleted.'),
];

/** Validacion del listado de usuarios (panel de administracion). */
export const listUsersValidator = [
  query('role').optional().isIn(['student', 'tutor', 'admin']).withMessage('El rol no es valido.'),
  query('status').optional().isIn(['pending', 'active', 'suspended', 'deleted']).withMessage('El estado no es valido.'),
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 191 }),
  query('page').optional().isInt({ min: 1 }).withMessage('La pagina no es valida.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El limite no es valido.').toInt(),
];

/**
 * Alta de usuario desde el panel de administracion.
 * El administrador SI puede elegir el rol (a diferencia del registro publico,
 * que fuerza siempre 'student').
 */
export const createUserValidator = [
  nameRule('firstName', 'nombre'),
  nameRule('lastName', 'apellido'),
  emailRule(false),
  body('password')
    .isString()
    .withMessage('La contraseña debe ser texto.')
    .isLength({ min: MIN_PASSWORD, max: 128 })
    .withMessage(`La contraseña debe tener entre ${MIN_PASSWORD} y 128 caracteres.`)
    .matches(/[a-zA-Z]/)
    .withMessage('La contraseña debe incluir al menos una letra.')
    .matches(/\d/)
    .withMessage('La contraseña debe incluir al menos un numero.'),
  body('role')
    .optional({ values: 'falsy' })
    .isIn(['student', 'tutor', 'admin'])
    .withMessage('El rol debe ser student, tutor o admin.'),
  body('status')
    .optional({ values: 'falsy' })
    .isIn(['pending', 'active', 'suspended'])
    .withMessage('El estado debe ser pending, active o suspended.'),
];

/** Edicion de los datos base de una cuenta (panel de administracion). */
export const updateUserValidator = [
  ...uuidParamValidator,
  nameRule('firstName', 'nombre').optional(),
  nameRule('lastName', 'apellido').optional(),
  emailRule(true),
  body('role')
    .optional({ values: 'falsy' })
    .isIn(['student', 'tutor', 'admin'])
    .withMessage('El rol debe ser student, tutor o admin.'),
];

/**
 * Edicion de los datos base de la PROPIA cuenta (rutas /me).
 * Solo nombre, apellido y correo: el rol y el estado no se pueden cambiar
 * desde aqui (los gestiona un administrador).
 */
export const updateMyAccountValidator = [
  nameRule('firstName', 'nombre').optional(),
  nameRule('lastName', 'apellido').optional(),
  emailRule(true),
];

export default {
  updateProfileValidator,
  uuidParamValidator,
  updateStatusValidator,
  listUsersValidator,
  createUserValidator,
  updateUserValidator,
  updateMyAccountValidator,
};
