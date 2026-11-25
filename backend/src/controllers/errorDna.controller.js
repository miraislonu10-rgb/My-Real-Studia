/**
 * STUDIA - Controlador del Error DNA
 * ------------------------------------------------------------------
 * Expone el analisis de patrones de errores del estudiante autenticado.
 * Solo lectura: los datos los registra el Diario de errores.
 */

import * as errorDnaModel from '../models/errorDna.model.js';
import { sendSuccess } from '../utils/respond.js';

/**
 * GET /api/error-dna
 * Analiza el historial real de errores y devuelve la huella del estudiante.
 * Admite filtros opcionales de fecha (from/to en formato YYYY-MM-DD).
 */
export const getErrorDna = async (req, res, next) => {
  try {
    const analysis = await errorDnaModel.getAnalysis(req.user.id, {
      from: req.query.from,
      to: req.query.to,
    });

    sendSuccess(res, {
      message: analysis.hasData
        ? 'Patrones de error analizados a partir de tu diario.'
        : 'Aun no hay errores registrados para analizar.',
      data: { analysis },
    });
  } catch (error) {
    next(error);
  }
};
