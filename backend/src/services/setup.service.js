/**
 * STUDIA - Servicio de configuracion inicial
 * ------------------------------------------------------------------
 * Permite crear el PRIMER administrador desde la interfaz cuando la base de
 * datos todavia no tiene ninguno (instalacion recien importada).
 *
 * SEGURIDAD
 *  1. Solo funciona si NO existe ningun administrador activo. En cuanto hay
 *     uno, el endpoint responde 409 y deja de estar disponible para siempre
 *     (los administradores posteriores se crean desde el panel o con el script
 *     `npm run create:admin`).
 *  2. El rol se fija aqui en 'admin': el cuerpo de la peticion nunca lo decide.
 *  3. La contraseña se guarda unicamente como hash bcrypt.
 *  4. Se aplican las mismas reglas de validacion que en el resto de la API
 *     (validadores de express-validator en setup.validators.js).
 */

import crypto from 'node:crypto';

import { AppError } from '../utils/errors.js';
import { hashPassword } from '../utils/security.js';
import * as userModel from '../models/user.model.js';
import { toPublicUser } from './auth.service.js';

/** Numero de administradores activos (no eliminados). */
const countActiveAdmins = () => userModel.countByRole('admin');

/**
 * Estado de la configuracion inicial.
 * `needsFirstAdmin` es true mientras no exista ningun administrador.
 */
export const getSetupStatus = async () => {
  const adminCount = await countActiveAdmins();
  return { needsFirstAdmin: adminCount === 0, adminCount };
};

/**
 * Crea el primer administrador.
 * @param {{email:string, firstName:string, lastName:string, password:string}} data
 */
export const createFirstAdmin = async ({ email, firstName, lastName, password }) => {
  const normalizedEmail = String(email).trim().toLowerCase();

  // La condicion se comprueba de nuevo aqui: la validacion del cliente no basta.
  if ((await countActiveAdmins()) > 0) {
    throw AppError.conflict(
      'La configuracion inicial ya se completo: existe al menos un administrador.'
    );
  }

  if (await userModel.emailExists(normalizedEmail)) {
    throw AppError.conflict('Ya existe una cuenta registrada con ese correo.');
  }

  const passwordHash = await hashPassword(password);

  const id = await userModel.createUser({
    uuid: crypto.randomUUID(),
    email: normalizedEmail,
    passwordHash,
    firstName: String(firstName).trim(),
    lastName: String(lastName).trim(),
    role: 'admin',
    status: 'active',
  });

  const user = await userModel.findById(id);
  return toPublicUser(user);
};

export default { getSetupStatus, createFirstAdmin };
