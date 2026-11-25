/**
 * STUDIA - Controlador del pasaporte academico (Academic Passport)
 * ------------------------------------------------------------------
 * Gestiona las entradas manuales (habilidades, proyectos, certificaciones y
 * logros). El bloque automatico de progreso y los distintivos los calcula el
 * modelo a partir de los datos reales del estudiante.
 *
 * SEGURIDAD (anti-IDOR): cada entrada se comprueba contra su propietario antes
 * de actualizarla o eliminarla.
 */

import * as passportModel from '../models/passport.model.js';
import { AppError } from '../utils/errors.js';
import { assertOwnership } from '../utils/ownership.js';
import { sendSuccess } from '../utils/respond.js';

/**
 * GET /api/passport
 * Pasaporte completo: entradas manuales + progreso real + distintivos.
 */
export const getPassport = async (req, res, next) => {
  try {
    const passport = await passportModel.getPassport(req.user.id);
    sendSuccess(res, {
      message: 'Pasaporte academico recuperado.',
      data: { passport },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/passport/entries
 * Añade una entrada manual al pasaporte.
 */
export const createEntry = async (req, res, next) => {
  try {
    const entry = await passportModel.create(req.user.id, req.body);
    sendSuccess(res, {
      status: 201,
      message: 'Entrada anadida a tu pasaporte.',
      data: { entry },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/passport/entries/:id
 * Actualiza una entrada existente.
 */
export const updateEntry = async (req, res, next) => {
  try {
    const current = await passportModel.findById(req.params.id);
    if (!current) throw AppError.notFound('La entrada del pasaporte no existe.');
    assertOwnership(req.user, current.userId, 'entrada del pasaporte');

    const updated = await passportModel.update(req.params.id, req.user.id, req.body);
    sendSuccess(res, { message: 'Entrada actualizada.', data: { entry: updated } });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/passport/entries/:id
 * Elimina una entrada del pasaporte.
 */
export const deleteEntry = async (req, res, next) => {
  try {
    const current = await passportModel.findById(req.params.id);
    if (!current) throw AppError.notFound('La entrada del pasaporte no existe.');
    assertOwnership(req.user, current.userId, 'entrada del pasaporte');

    const removed = await passportModel.remove(req.params.id, req.user.id);
    sendSuccess(res, {
      message: removed ? 'Entrada eliminada.' : 'No se pudo eliminar la entrada.',
      data: { removed },
    });
  } catch (error) {
    next(error);
  }
};
