/**
 * STUDIA - Control de propiedad de recursos (anti-IDOR)
 * ------------------------------------------------------------------
 * Todas las entidades del estudiante guardan a su dueño en la columna
 * `user_id`. Antes de leer o modificar una fila concreta, el controlador
 * comprueba que quien pide sea el dueño o un administrador.
 *
 * Gracias a esta comprobacion, cambiar un id en la URL o manipular la
 * peticion HTTP nunca da acceso a los datos de otro estudiante.
 */

import { AppError } from './errors.js';

/**
 * Lanza 403 si el solicitante no es el dueño ni un administrador.
 * @param {{id:number, role:string}} requester Usuario autenticado (req.user).
 * @param {number} ownerUserId Dueño real de la fila en la base de datos.
 * @param {string} [resourceName] Nombre visible del recurso para el mensaje.
 */
export const assertOwnership = (requester, ownerUserId, resourceName = 'recurso') => {
  if (requester.role === 'admin') return;

  if (Number(requester.id) !== Number(ownerUserId)) {
    throw AppError.forbidden(`No tienes permiso para acceder a este ${resourceName}.`);
  }
};

export default { assertOwnership };
