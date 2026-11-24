/**
 * STUDIA - Molecula: Resumen de estudio semanal
 * ------------------------------------------------------------------
 * Combina los totales reales de la semana en curso (minutos, sesiones y tareas
 * completadas) con el ultimo reporte semanal generado, cuando existe.
 *
 * @param {{weekTotals?:{studyMinutes:number, sessions:number, tasksCompleted:number},
 *          report?:object|null}} props
 */

import EmptyState from '../atoms/EmptyState.jsx';
import { formatDate, formatMinutes } from '../../utils/format.js';

export default function WeeklySummary({ weekTotals, report }) {
  const totals = weekTotals || { studyMinutes: 0, sessions: 0, tasksCompleted: 0 };
  const hasActivity = Number(totals.studyMinutes) > 0 || Number(totals.sessions) > 0 || Number(totals.tasksCompleted) > 0;

  return (
    <section className="card">
      <div className="card__head">
        <div>
          <h3 className="card__title">Resumen de estudio semanal</h3>
          <p className="card__subtitle">Semana en curso, desde el lunes</p>
        </div>
      </div>

      <div className="summary-metrics">
        <div className="summary-metric">
          <div className="summary-metric__value">{formatMinutes(totals.studyMinutes)}</div>
          <span className="summary-metric__label">Tiempo de estudio</span>
        </div>
        <div className="summary-metric">
          <div className="summary-metric__value">{totals.sessions}</div>
          <span className="summary-metric__label">Sesiones registradas</span>
        </div>
        <div className="summary-metric">
          <div className="summary-metric__value">{totals.tasksCompleted}</div>
          <span className="summary-metric__label">Tareas completadas</span>
        </div>
      </div>

      {!hasActivity && (
        <EmptyState
          icon="clock"
          title="Todavia sin actividad esta semana"
          text="Registra una sesion de estudio o completa una tarea para ver aqui tu avance."
          plain
        />
      )}

      {report ? (
        <div className="summary-report">
          <h4>Ultimo reporte generado</h4>
          <p className="hint">
            Semana del {formatDate(report.weekStartDate)} al {formatDate(report.weekEndDate)}
          </p>
          {report.summary && <p>{report.summary}</p>}
          {report.nextWeekFocus && (
            <p>
              <strong>Enfoque sugerido:</strong> {report.nextWeekFocus}
            </p>
          )}
        </div>
      ) : (
        <p className="hint">
          Aun no se ha generado un reporte semanal. Los reportes aparecen una vez que se cierra una
          semana de estudio.
        </p>
      )}
    </section>
  );
}
