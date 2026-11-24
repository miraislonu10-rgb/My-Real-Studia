/**
 * STUDIA - Controlador de usuarios y perfil del estudiante
 * ------------------------------------------------------------------
 * CONTROL DE PROPIEDAD (anti-IDOR)
 * Un estudiante NUNCA debe poder ver ni modificar datos de otro estudiante
 * cambiando un id en la URL o manipulando la peticion HTTP. Para lograrlo:
 *
 *   1. Los datos propios se exponen en rutas "self" (/api/users/me/...) que
 *      no aceptan ningun identificador: siempre operan sobre req.user.id, que
 *      proviene del token verificado. No hay nada que manipular.
 *   2. Cuando una ruta SI lleva un identificador en la URL (por ejemplo
 *      /api/users/:uuid), el controlador compara ese valor con la identidad
 *      autenticada y responde 403 si no coinciden (salvo administradores).
 *   3. La consulta de actualizacion incluye siempre WHERE user_id = ?, asi que
 *      aunque se colara un id ajeno, no afectaria a otra fila.
 */

import * as userModel from '../models/user.model.js';
import * as profileModel from '../models/studentProfile.model.js';
import * as refreshTokenModel from '../models/refreshToken.model.js';
import { AppError } from '../utils/errors.js';
import { hashPassword } from '../utils/security.js';
import { withTransaction } from '../config/database.js';
import { sendSuccess } from '../utils/respond.js';
import crypto from 'node:crypto';

/** Comprueba que quien pide es el propietario del recurso o un administrador. */
const assertOwnership = (requester, ownerUuid) => {
  const isOwner = requester.uuid === ownerUuid;
  const isAdmin = requester.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw AppError.forbidden('No puedes acceder a la informacion de otro estudiante.');
  }
};

/** GET /api/users/me - cuenta del usuario autenticado. */
export const getMyAccount = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      error: null,
      message: 'Cuenta del usuario autenticado.',
      data: { user: req.user },
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/users/me/profile - perfil academico propio (usuario + perfil). */
export const getMyProfile = async (req, res, next) => {
  try {
    const profile = await profileModel.getFullProfile(req.user.id);
    res.status(200).json({
      success: true,
      error: null,
      message: 'Perfil del estudiante.',
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

/** PUT /api/users/me/profile - actualiza SOLO el perfil propio. */
export const updateMyProfile = async (req, res, next) => {
  try {
    // WHERE user_id = req.user.id: es imposible tocar el perfil de otro.
    await profileModel.updateByUserId(req.user.id, req.body);
    const profile = await profileModel.getFullProfile(req.user.id);

    res.status(200).json({
      success: true,
      error: null,
      message: 'Perfil actualizado correctamente.',
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/:uuid/profile
 * Ruta con identificador en la URL: solo el propio estudiante o un admin.
 * Demuestra explicitamente la defensa contra IDOR.
 */
export const getProfileByUuid = async (req, res, next) => {
  try {
    const { uuid } = req.params;

    // 1) Control de propiedad ANTES de tocar la base de datos.
    assertOwnership(req.user, uuid);

    const owner = await userModel.findByUuid(uuid);
    if (!owner) throw AppError.notFound('No existe un estudiante con ese identificador.');

    const profile = await profileModel.getFullProfile(owner.id);

    res.status(200).json({
      success: true,
      error: null,
      message: 'Perfil solicitado.',
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users  (solo administradores)
 * Listado paginado de usuarios para el panel de administracion.
 */
export const listUsers = async (req, res, next) => {
  try {
    const page = Number.parseInt(req.query.page ?? '1', 10) || 1;
    const limit = Math.min(Number.parseInt(req.query.limit ?? '20', 10) || 20, 100);
    const offset = (page - 1) * limit;

    const { rows, total } = await userModel.listUsers({
      role: req.query.role,
      status: req.query.status,
      search: req.query.search,
      limit,
      offset,
    });

    res.status(200).json({
      success: true,
      error: null,
      message: 'Listado de usuarios.',
      data: {
        users: rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/:uuid  (solo administradores)
 */
export const getUserByUuid = async (req, res, next) => {
  try {
    const user = await userModel.findByUuid(req.params.uuid);
    if (!user) throw AppError.notFound('No existe un usuario con ese identificador.');

    const profile = await profileModel.getFullProfile(user.id);

    res.status(200).json({
      success: true,
      error: null,
      message: 'Detalle del usuario.',
      data: { user, profile },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/:uuid/status  (solo administradores)
 * Permite activar o suspender cuentas.
 */
export const updateUserStatus = async (req, res, next) => {
  try {
    if (req.params.uuid === req.user.uuid) {
      throw AppError.badRequest('No puedes cambiar el estado de tu propia cuenta.');
    }

    const user = await userModel.findByUuid(req.params.uuid);
    if (!user) throw AppError.notFound('No existe un usuario con ese identificador.');

    await userModel.updateStatus(user.id, req.body.status);
    const updated = await userModel.findById(user.id);

    res.status(200).json({
      success: true,
      error: null,
      message: `Estado actualizado a "${req.body.status}".`,
      data: { user: updated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users  (solo administradores)
 * Crea una cuenta eligiendo el rol. Sustituye al registro publico, que
 * siempre crea estudiantes.
 */
export const createUser = async (req, res, next) => {
  try {
    const email = String(req.body.email).trim().toLowerCase();

    if (await userModel.emailExists(email)) {
      throw AppError.conflict('Ya existe una cuenta registrada con ese correo.');
    }

    const role = req.body.role || 'student';
    const passwordHash = await hashPassword(req.body.password);

    const userId = await withTransaction(async (connection) => {
      const id = await userModel.createUser(
        {
          uuid: crypto.randomUUID(),
          email,
          passwordHash,
          firstName: req.body.firstName.trim(),
          lastName: req.body.lastName.trim(),
          role,
          status: req.body.status || 'active',
        },
        connection
      );

      // Los estudiantes mantienen la relacion 1:1 con su perfil academico.
      if (role === 'student') {
        await profileModel.createForUser(id, { dailyGoalMinutes: 60 }, connection);
      }
      return id;
    });

    const user = await userModel.findById(userId);
    sendSuccess(res, { status: 201, message: 'Usuario creado correctamente.', data: { user } });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/:uuid  (solo administradores)
 * Edita los datos base de una cuenta (nombre, apellido, correo y rol).
 * El estado se gestiona por separado en PATCH /:uuid/status.
 */
export const updateUser = async (req, res, next) => {
  try {
    const user = await userModel.findByUuid(req.params.uuid);
    if (!user) throw AppError.notFound('No existe un usuario con ese identificador.');

    // Un administrador no puede cambiarse el rol a si mismo: evita bloquearse.
    if (user.uuid === req.user.uuid && req.body.role && req.body.role !== req.user.role) {
      throw AppError.badRequest('No puedes cambiar tu propio rol.');
    }

    const data = {};
    if (req.body.firstName !== undefined) data.firstName = req.body.firstName.trim();
    if (req.body.lastName !== undefined) data.lastName = req.body.lastName.trim();
    if (req.body.role !== undefined) data.role = req.body.role;

    if (req.body.email !== undefined) {
      const email = String(req.body.email).trim().toLowerCase();
      if (email !== user.email) {
        const existing = await userModel.findByEmail(email);
        if (existing) throw AppError.conflict('Ya existe otra cuenta con ese correo.');
        data.email = email;
      }
    }

    if (!Object.keys(data).length) {
      throw AppError.badRequest('No se enviaron campos para actualizar.');
    }

    await userModel.updateBasic(user.id, data);
    const updated = await userModel.findById(user.id);

    sendSuccess(res, { message: 'Usuario actualizado correctamente.', data: { user: updated } });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/me
 * Actualiza los datos base de la PROPIA cuenta (nombre, apellido y correo).
 * Ruta "self": opera siempre sobre req.user.id, no acepta identificadores, de
 * modo que es imposible modificar la cuenta de otra persona.
 */
export const updateMyAccount = async (req, res, next) => {
  try {
    const data = {};
    if (req.body.firstName !== undefined) data.firstName = req.body.firstName.trim();
    if (req.body.lastName !== undefined) data.lastName = req.body.lastName.trim();

    if (req.body.email !== undefined) {
      const email = String(req.body.email).trim().toLowerCase();
      if (email !== req.user.email) {
        const existing = await userModel.findByEmail(email);
        if (existing) throw AppError.conflict('Ya existe otra cuenta con ese correo.');
        data.email = email;
      }
    }

    if (!Object.keys(data).length) {
      throw AppError.badRequest('No se enviaron campos para actualizar.');
    }

    // WHERE id = req.user.id: solo puede tocar su propia fila.
    await userModel.updateBasic(req.user.id, data);
    const updated = await userModel.findById(req.user.id);

    sendSuccess(res, { message: 'Cuenta actualizada correctamente.', data: { user: updated } });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/me
 * BORRADO LOGICO de la propia cuenta: pasa a estado 'deleted' y se revocan
 * todas sus sesiones (incluida la actual). Se conserva la integridad
 * referencial (materias, temas, tareas...) igual que en el borrado del admin.
 */
export const deleteMyAccount = async (req, res, next) => {
  try {
    await userModel.updateStatus(req.user.id, 'deleted');
    await refreshTokenModel.revokeAllForUser(req.user.id, 'self');

    sendSuccess(res, { message: 'Tu cuenta ha sido eliminada.', data: { uuid: req.user.uuid } });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/:uuid  (solo administradores)
 * BORRADO LOGICO: la cuenta pasa a estado 'deleted' y se revocan todas sus
 * sesiones. Se conserva la integridad referencial (materias, tareas...).
 */
export const deleteUser = async (req, res, next) => {
  try {
    if (req.params.uuid === req.user.uuid) {
      throw AppError.badRequest('No puedes eliminar tu propia cuenta.');
    }

    const user = await userModel.findByUuid(req.params.uuid);
    if (!user) throw AppError.notFound('No existe un usuario con ese identificador.');

    await userModel.updateStatus(user.id, 'deleted');
    await refreshTokenModel.revokeAllForUser(user.id, 'admin');

    sendSuccess(res, { message: 'Usuario eliminado correctamente.', data: { uuid: user.uuid } });
  } catch (error) {
    next(error);
  }
};

export default {
  getMyAccount,
  getMyProfile,
  updateMyProfile,
  getProfileByUuid,
  listUsers,
  getUserByUuid,
  updateUserStatus,
  createUser,
  updateUser,
  updateMyAccount,
  deleteMyAccount,
  deleteUser,
};
