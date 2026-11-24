/**
 * STUDIA - Molecula: Lista de tareas pendientes
 * ------------------------------------------------------------------
 * Muestra las tareas reales del estudiante ordenadas por vencimiento. Sin
 * tareas, presenta un estado vacio con la accion para crear la primera.
 *
 * @param {{tasks:Array<object>, emptyAction?:React.ReactNode}} props
 */

import Badge from '../atoms/Badge.jsx';
import EmptyState from '../atoms/EmptyState.jsx';
import { describeDueDate, formatDate } from '../../utils/format.js';

const PRIORITY_LABELS = { low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente' };
const PRIORITY_TONES = { low: 'neutral', medium: 'info', high: 'warning', urgent: 'danger' };

export default function TaskList({ tasks = [], emptyAction }) {
  if (!tasks.length) {
    return (
      <EmptyState
        icon="checkSquare"
        title="Sin actividades pendientes"
        text="Cuando registres tareas apareceran aqui, ordenadas por fecha de vencimiento."
        action={emptyAction}
        plain
      />
    );
  }

  return (
    <ul className="item-list">
      {tasks.map((task) => (
        <li className="item item--plain" key={task.id}>
          <span className={`priority-dot priority-dot--${task.priority || 'medium'}`} aria-hidden="true" />
          <div className="item__body">
            <p className="item__title">{task.title}</p>
            <div className="item__meta">
              <Badge tone={PRIORITY_TONES[task.priority] || 'neutral'}>
                {PRIORITY_LABELS[task.priority] || 'Media'}
              </Badge>
              {task.subject && (
                <span className="item__recurrence" style={{ color: task.subjectColor || undefined }}>
                  {task.subject}
                </span>
              )}
              <span>{task.dueDate ? `${describeDueDate(task.dueDate)} (${formatDate(task.dueDate)})` : 'Sin fecha limite'}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
