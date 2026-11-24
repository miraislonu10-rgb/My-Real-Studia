/**
 * STUDIA - Controlador de analíticas académicas (Academic Analytics)
 * ------------------------------------------------------------------
 * Entrega métricas agregadas reales y el informe semanal de progreso.
 */

import * as analyticsModel from '../models/analytics.model.js';
import { sendSuccess } from '../utils/respond.js';

/**
 * GET /api/analytics/overview
 * Resumen general con filtros opcionales de fechas (from, to).
 */
export const getOverview = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const data = await analyticsModel.getAcademicOverview(req.user.id, { from, to });
    sendSuccess(res, {
      message: 'Analíticas académicas recuperadas.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/weekly-report
 * Genera el informe semanal basado estrictamente en registros de MySQL.
 */
export const getWeeklyReport = async (req, res, next) => {
  try {
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    const report = await analyticsModel.getWeeklyReport(req.user.id, targetDate);
    sendSuccess(res, {
      message: 'Informe semanal de aprendizaje.',
      data: { report },
    });
  } catch (error) {
    next(error);
  }
};
