/**
 * STUDIA - Validadores de la configuracion inicial
 * ------------------------------------------------------------------
 * Reglas equivalentes a las del registro publico (auth.validators.js), pero
 * para el formulario del PRIMER administrador. La validacion del servidor es
 * la unica autoridad: el cliente puede manipular la peticion HTTP.
 */

import { body } from 'express-validator';
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

/** Validacion del formulario de creacion del primer administrador. */
export const firstAdminValidator = [
  nameRule('firstName', 'nombre'),
  nameRule('lastName', 'apellido'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('El correo es obligatorio.')
    .isEmail()
    .withMessage('El correo no tiene un formato valido.')
    .isLength({ max: 191 })
    .withMessage('El correo es demasiado largo.')
    .normalizeEmail({ gmail_remove_dots: false }),

  body('password')
    .isString()
    .withMessage('La contraseña debe ser texto.')
    .isLength({ min: MIN_PASSWORD, max: 128 })
    .withMessage(`La contraseña debe tener entre ${MIN_PASSWORD} y 128 caracteres.`)
    .matches(/[a-zA-Z]/)
    .withMessage('La contraseña debe incluir al menos una letra.')
    .matches(/\d/)
    .withMessage('La contraseña debe incluir al menos un numero.'),

  body('passwordConfirm')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Las contraseñas no coinciden.'),
];

export default { firstAdminValidator };
