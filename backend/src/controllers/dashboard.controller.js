/**
 * STUDIA - Controlador del panel (/api/dashboard)
 * ------------------------------------------------------------------
 * Devuelve el resumen REAL de la actividad del estudiante y del sistema.
 *
 * PRINCIPIO DE DATOS HONESTOS
 *   No se inventan cifras ni series de relleno presentadas como estadisticas.
 *   Cuando todavia no existen registros, los agregados son 0 y las listas
 *   vacias; el frontend se encarga de mostrar un estado vacio atractivo.
 *   Las series por dia SI rellenan con 0 los dias sin actividad, porque "0
 *   minutos ese dia" es un dato veraz (no hubo sesiones), no una invencion.
 *
 * AUTORIZACION
 *   - Un estudiante solo obtiene su propio resumen (user_id de la sesion).
 *   - El resumen global queda restringido al administrador.
 */

import * as dashboardModel from '../models/dashboard.model.js';
import { sendSuccess } from '../utils/respond.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Fecha (Y-M-D) en UTC a partir de un Date. */
const toISODate = (date) => date.toISOString().slice(0, 10);

/** Suma dias a una fecha. */
const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);

/** Lunes (00:00) de la semana a la que pertenece `date` (ISO: lunes = 0). */
const startOfWeek = (date) => {
  const day = date.getUTCDay(); // 0 = domingo
  const offset = day === 0 ? 6 : day - 1;
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - offset);
  return monday;
};

/** Construye una serie diaria desde `from` (inclusive) hasta `to` (inclusive). */
const buildDailySeries = (from, to, indexed, valueKey, extraKey) => {
  const series = [];
  for (let cursor = new Date(from); cursor <= to; cursor = addDays(cursor, 1)) {
    const day = toISODate(cursor);
    const found = indexed.get(day);
    series.push({
      date: day,
      [valueKey]: found ? Number(found[valueKey]) : 0,
      ...(extraKey ? { [extraKey]: found ? Number(found[extraKey]) : 0 } : {}),
    });
  }
  return series;
};

/** Mes solicitado (?month=YYYY-MM) o el mes actual. */
const resolveMonthRange = (monthParam) => {
  const now = new Date();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth();

  if (typeof monthParam === 'string' && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split('-').map(Number);
    if (m >= 1 && m <= 12) {
      year = y;
      month = m - 1;
    }
  }

  const first = new Date(Date.UTC(year, month, 1));
  const last = new Date(Date.UTC(year, month + 1, 0));
  return {
    month: `${year}-${String(month + 1).padStart(2, '0')}`,
    from: `${toISODate(first)} 00:00:00`,
    to: `${toISODate(last)} 23:59:59`,
    daysInMonth: last.getUTCDate(),
  };
};

/**
 * GET /api/dashboard/student
 * Resumen completo del estudiante autenticado.
 */
export const getStudentDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Ventana movil de 7 dias (incluye hoy).
    const weekStartDate = startOfWeek(now);
    const windowFrom = addDays(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), -6);
    const calendar = resolveMonthRange(req.query.month);

    const [
      counts,
      weekTotals,
      activityRows,
      subjectProgress,
      upcomingTasks,
      recommendations,
      calendarRows,
      latestReport,
    ] = await Promise.all([
      dashboardModel.getStudentCounts(userId),
      dashboardModel.getWeekTotals(userId, `${toISODate(weekStartDate)} 00:00:00`),
      dashboardModel.getStudyActivityByDay(userId, `${toISODate(windowFrom)} 00:00:00`, `${toISODate(now)} 23:59:59`),
      dashboardModel.getSubjectProgress(userId),
      dashboardModel.getUpcomingTasks(userId, 5),
      dashboardModel.getPendingRecommendations(userId, 5),
      dashboardModel.getCalendarEntries(userId, calendar.from, calendar.to),
      dashboardModel.getLatestWeeklyReport(userId),
    ]);

    const activityIndex = new Map(activityRows.map((r) => [r.day, r]));
    const dailyActivity = buildDailySeries(windowFrom, now, activityIndex, 'minutes', 'sessions');

    sendSuccess(res, {
      message: 'Resumen del estudiante.',
      data: {
        role: 'student',
        counts,
        weekTotals,
        dailyActivity,
        subjectProgress,
        upcomingTasks,
        recommendations,
        latestReport,
        calendar: {
          month: calendar.month,
          daysInMonth: calendar.daysInMonth,
          entries: calendarRows.map((r) => ({ date: r.day, count: Number(r.total) })),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/admin  (solo administrador)
 * Resumen global del sistema.
 */
export const getAdminDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const trendFrom = addDays(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())),
      -13
    );

    const [counts, trendRows, recentUsers, resourcesByType] = await Promise.all([
      dashboardModel.getAdminCounts(),
      dashboardModel.getRegistrationTrend(`${toISODate(trendFrom)} 00:00:00`),
      dashboardModel.getRecentUsers(5),
      dashboardModel.getResourcesByType(),
    ]);

    const trendIndex = new Map(trendRows.map((r) => [r.day, r]));
    const registrationTrend = buildDailySeries(trendFrom, now, trendIndex, 'total');

    sendSuccess(res, {
      message: 'Resumen del sistema.',
      data: {
        role: 'admin',
        counts,
        registrationTrend,
        recentUsers,
        resourcesByType,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default { getStudentDashboard, getAdminDashboard };
