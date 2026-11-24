/**
 * STUDIA - Validadores de formularios de autenticacion
 * ------------------------------------------------------------------
 * express-validator sane a y valida CADA campo antes de que la peticion
 * llegue al controlador. Si algo falla, el middleware `validate` responde 422
 * con el detalle por campo (nunca se llega a consultar la base de datos).
 *
 * La validacion del servidor es la unica autoridad: la del frontend mejora la
 * experiencia de usuario, pero puede saltarse manipulando la peticion HTTP.
 */

import { body } from 'express-validator';
import { env } from '../config/env.js';

const MIN_PASSWORD = env.auth.minPasswordLength;

/** Regla de contraseña reutilizable. */
const passwordRule = (field = 'password') =>
  body(field)
    .isString()
    .withMessage('La contraseña debe ser texto.')
    .isLength({ min: MIN_PASSWORD, max: 128 })
    .withMessage(`La contraseña debe tener entre ${MIN_PASSWORD} y 128 caracteres.`)
    .matches(/[a-zA-Z]/)
    .withMessage('La contraseña debe incluir al menos una letra.')
    .matches(/\d/)
    .withMessage('La contraseña debe incluir al menos un numero.');

const emailRule = body('email')
  .trim()
  .notEmpty()
  .withMessage('El correo es obligatorio.')
  .isEmail()
  .withMessage('El correo no tiene un formato valido.')
  .isLength({ max: 191 })
  .withMessage('El correo es demasiado largo.')
  .normalizeEmail({ gmail_remove_dots: false });

/** Validacion del formulario de registro de estudiantes. */
export const registerValidator = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('El nombre es obligatorio.')
    .isLength({ min: 2, max: 80 })
    .withMessage('El nombre debe tener entre 2 y 80 caracteres.')
    .matches(/^[\p{L}\s'.-]+$/u)
    .withMessage('El nombre contiene caracteres no permitidos.'),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('El apellido es obligatorio.')
    .isLength({ min: 2, max: 80 })
    .withMessage('El apellido debe tener entre 2 y 80 caracteres.')
    .matches(/^[\p{L}\s'.-]+$/u)
    .withMessage('El apellido contiene caracteres no permitidos.'),

  emailRule,
  passwordRule('password'),

  body('passwordConfirm')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Las contraseñas no coinciden.'),

  // Campos opcionales del perfil academico
  body('birthDate').optional({ values: 'falsy' }).isISO8601().withMessage('La fecha de nacimiento no es valida.'),
  body('educationLevel')
    .optional({ values: 'falsy' })
    .isIn(['primary', 'secondary', 'high_school', 'undergraduate', 'postgraduate', 'self_taught'])
    .withMessage('El nivel educativo no es valido.'),
  body('institution').optional({ values: 'falsy' }).trim().isLength({ max: 150 }).withMessage('La institucion es demasiado larga.'),
  body('academicProgram').optional({ values: 'falsy' }).trim().isLength({ max: 150 }).withMessage('El programa academico es demasiado largo.'),
  body('gradeLevel').optional({ values: 'falsy' }).trim().isLength({ max: 50 }).withMessage('El grado o semestre es demasiado largo.'),
  body('mainGoal').optional({ values: 'falsy' }).trim().isLength({ max: 255 }).withMessage('El objetivo es demasiado largo.'),
  body('dailyGoalMinutes')
    .optional({ values: 'falsy' })
    .isInt({ min: 10, max: 1440 })
    .withMessage('La meta diaria debe estar entre 10 y 1440 minutos.')
    .toInt(),
  body('timezone').optional({ values: 'falsy' }).trim().isLength({ max: 64 }).withMessage('La zona horaria no es valida.'),
];

/** Validacion del formulario de inicio de sesion. */
export const loginValidator = [
  emailRule,
  body('password').isString().notEmpty().withMessage('La contraseña es obligatoria.').isLength({ max: 128 }),
];

/** Validacion de la solicitud de recuperacion de contraseña. */
export const forgotPasswordValidator = [emailRule];

/** Validacion del restablecimiento de contraseña. */
export const resetPasswordValidator = [
  body('token').trim().notEmpty().withMessage('El token de recuperacion es obligatorio.').isLength({ max: 128 }),
  passwordRule('password'),
  body('passwordConfirm')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Las contraseñas no coinciden.'),
];

/** Validacion del refresco de sesion (el token puede venir en body o cookie). */
export const refreshValidator = [
  body('refreshToken')
    .optional()
    .isString()
    .withMessage('El token de refresco no es valido.')
    .isLength({ max: 256 })
    .withMessage('El token de refresco no es valido.'),
];

/** Validacion del cierre de sesion (igual, tolerante si no se envia token). */
export const logoutValidator = refreshValidator;

export default {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  refreshValidator,
  logoutValidator,
};
