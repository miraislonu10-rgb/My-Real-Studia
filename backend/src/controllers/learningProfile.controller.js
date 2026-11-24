/**
 * STUDIA - Controlador de perfil de aprendizaje (Learning Profile)
 * ------------------------------------------------------------------
 * Gestiona el cuestionario de preferencias de estudio y el generador
 * dinámico de estrategias sin categorías rígidas.
 */

import * as learningProfileModel from '../models/learningProfile.model.js';
import { sendSuccess } from '../utils/respond.js';

/**
 * GET /api/learning-profile
 * Obtiene el perfil dinámico de aprendizaje del estudiante autenticado.
 */
export const getProfile = async (req, res, next) => {
  try {
    const profile = await learningProfileModel.findByUserId(req.user.id);
    sendSuccess(res, {
      message: 'Perfil de preferencias de aprendizaje recuperado.',
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/learning-profile
 * Guarda las respuestas del cuestionario y genera el perfil dinámico actualizado.
 */
export const updateProfile = async (req, res, next) => {
  try {
    const updated = await learningProfileModel.savePreferences(req.user.id, req.body);
    sendSuccess(res, {
      message: 'Preferencias actualizadas y perfil dinámico generado con éxito.',
      data: { profile: updated },
    });
  } catch (error) {
    next(error);
  }
};
