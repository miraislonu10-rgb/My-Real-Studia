/**
 * STUDIA - Utilidades de formato (fechas y numeros) para el cliente.
 */

const DATE_FORMATTER = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
const MONTH_FORMATTER = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });

/** Convierte un valor de fecha del backend en Date (o null). */
const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** 2026-03-14 -> "14 mar 2026" */
export const formatDate = (value) => {
  const date = toDate(value);
  return date ? DATE_FORMATTER.format(date) : 'Sin fecha';
};

/** 2026-03 -> "marzo de 2026" */
export const formatMonth = (value) => {
  const date = toDate(`${value}-01`);
  return date ? MONTH_FORMATTER.format(date) : '';
};

/** minutos -> "2 h 30 min" | "45 min" */
export const formatMinutes = (minutes) => {
  const total = Number(minutes) || 0;
  if (total <= 0) return '0 min';
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!hours) return `${rest} min`;
  if (!rest) return `${hours} h`;
  return `${hours} h ${rest} min`;
};

/** Fecha de hoy en formato YYYY-MM-DD (zona local del navegador). */
export const todayISO = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

/**
 * Texto de vencimiento legible: "Hoy", "Manana", "En 3 dias" o "Vencida hace 2 dias".
 */
export const describeDueDate = (value) => {
  const date = toDate(value);
  if (!date) return null;

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000);

  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence manana';
  if (days === -1) return 'Vencio ayer';
  if (days > 1) return `Vence en ${days} dias`;
  return `Vencida hace ${Math.abs(days)} dias`;
};

export default { formatDate, formatMonth, formatMinutes, todayISO, describeDueDate };
