/**
 * STUDIA - Controlador de recursos educativos (/api/resources)
 * ------------------------------------------------------------------
 * REGLAS DE ACCESO
 *   - El catalogo es GLOBAL: no pertenece a un estudiante.
 *   - Cualquier usuario autenticado puede LISTAR y CONSULTAR, pero un
 *     ESTUDIANTE solo ve los recursos publicados (is_published = 1). Un recurso
 *     oculto se responde como inexistente para no revelar su existencia.
 *   - El ADMINISTRADOR ve todo (publicado y oculto) y es el UNICO que puede
 *     crear, actualizar y eliminar recursos (rutas con requireAdmin).
 *   - `created_by` siempre procede de la sesion verificada (req.user.id).
 */

import * as resourceModel from '../models/resource.model.js';
import { AppError } from '../utils/errors.js';
import { sendSuccess } from '../utils/respond.js';

/** Calcula la paginacion a partir de la consulta. */
const getPagination = (query) => {
  const page = Number.parseInt(query.page ?? '1', 10) || 1;
  const limit = Math.min(Number.parseInt(query.limit ?? '20', 10) || 20, 100);
  return { page, limit, offset: (page - 1) * limit };
};

/** GET /api/resources */
export const listResources = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const isAdmin = req.user.role === 'admin';

    // El estudiante solo ve lo publicado; el admin decide con ?isPublished=
    // (si no lo envia, ve todos los recursos).
    const publishedOnly = isAdmin ? req.query.isPublished === true : true;

    const { rows, total } = await resourceModel.list({
      publishedOnly,
      resourceType: req.query.resourceType,
      area: req.query.area,
      search: req.query.search,
      limit,
      offset,
    });

    sendSuccess(res, {
      message: 'Listado de recursos educativos.',
      data: {
        resources: rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/resources/:id */
export const getResource = async (req, res, next) => {
  try {
    const resource = await resourceModel.findById(req.params.id);
    if (!resource) throw AppError.notFound('No existe el recurso solicitado.');

    // Un estudiante no debe poder ver un recurso oculto ni saber que existe.
    if (req.user.role !== 'admin' && !resource.isPublished) {
      throw AppError.notFound('No existe el recurso solicitado.');
    }

    sendSuccess(res, { message: 'Recurso encontrado.', data: { resource } });
  } catch (error) {
    next(error);
  }
};

/** POST /api/resources (solo administrador) */
export const createResource = async (req, res, next) => {
  try {
    const id = await resourceModel.create(req.user.id, req.body);
    const resource = await resourceModel.findById(id);

    sendSuccess(res, {
      status: 201,
      message: 'Recurso educativo creado correctamente.',
      data: { resource },
    });
  } catch (error) {
    next(error);
  }
};

/** PUT /api/resources/:id (solo administrador) */
export const updateResource = async (req, res, next) => {
  try {
    const existing = await resourceModel.findById(req.params.id);
    if (!existing) throw AppError.notFound('No existe el recurso solicitado.');

    await resourceModel.update(req.params.id, req.body);
    const resource = await resourceModel.findById(req.params.id);

    sendSuccess(res, {
      message: 'Recurso educativo actualizado correctamente.',
      data: { resource },
    });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/resources/:id (solo administrador) */
export const deleteResource = async (req, res, next) => {
  try {
    const existing = await resourceModel.findById(req.params.id);
    if (!existing) throw AppError.notFound('No existe el recurso solicitado.');

    await resourceModel.remove(req.params.id);

    sendSuccess(res, {
      message: 'Recurso educativo eliminado correctamente.',
      data: { id: req.params.id },
    });
  } catch (error) {
    next(error);
  }
};

export default { listResources, getResource, createResource, updateResource, deleteResource };
