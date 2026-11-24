/**
 * STUDIA - Utilidades de conversion de tipos (sin dependencias)
 * ------------------------------------------------------------------
 * Se mantienen en un modulo aparte para que config/env.js pueda usarlas
 * sin crear importaciones circulares con otros modulos.
 */

/** Convierte a entero con valor por defecto. */
export const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

/** Convierte una lista separada por comas en arreglo. */
export const toList = (value, fallback) =>
  (value ?? fallback)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const UNIT_TO_MS = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/**
 * Convierte una duracion expresada como "15m", "7d", "1h", "300s" o "900000"
 * (milisegundos) a milisegundos.
 * @param {string|number} value
 * @param {number} fallback Milisegundos a usar si el valor no es valido.
 * @returns {number}
 */
export const parseDurationMs = (value, fallback) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const raw = String(value ?? '').trim();
  if (raw === '') return fallback;

  const match = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)?$/i.exec(raw);
  if (!match) return fallback;

  const amount = Number.parseFloat(match[1]);
  const unit = (match[2] || 'ms').toLowerCase();

  return Math.round(amount * UNIT_TO_MS[unit]);
};

/** Formatea milisegundos como fecha MySQL DATETIME (UTC). */
export const msToMysqlDate = (milliseconds) => {
  const date = new Date(Date.now() + milliseconds);
  return date.toISOString().slice(0, 19).replace('T', ' ');
};
