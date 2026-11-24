/**
 * STUDIA - Molecula: Lista de recomendaciones
 * ------------------------------------------------------------------
 * Presenta las recomendaciones registradas para el estudiante. Son datos
 * reales: si no hay ninguna, se muestra el estado vacio correspondiente.
 *
 * @param {{items:Array<object>}} props
 */

import Badge from '../atoms/Badge.jsx';
import EmptyState from '../atoms/EmptyState.jsx';
import { formatDate } from '../../utils/format.js';

const TYPE_LABELS = {
  study_plan: 'Plan de estudio',
  review: 'Repaso',
  practice: 'Practica',
  break: 'Descanso',
  resource: 'Recurso',
  habit: 'Habito',
  motivation: 'Motivacion',
};

const PRIORITY_LABELS = { low: 'Baja', medium: 'Media', high: 'Alta' };
const PRIORITY_TONES = { low: 'neutral', medium: 'info', high: 'warning' };

export default function RecommendationList({ items = [] }) {
  if (!items.length) {
    return (
      <EmptyState
        icon="sparkles"
        title="Sin recomendaciones por ahora"
        text="A medida que registres tu actividad, MY REAL STUDIA mostrara aqui las sugerencias disponibles para ti."
        plain
      />
    );
  }

  return (
    <ul className="item-list">
      {items.map((item) => (
        <li className="item item--plain" key={item.id}>
          <div className="item__body">
            <p className="item__title">{item.title}</p>
            {item.description && <p className="item__note">{item.description}</p>}
            <div className="item__meta">
              <Badge tone="primary">{TYPE_LABELS[item.type] || item.type}</Badge>
              <Badge tone={PRIORITY_TONES[item.priority] || 'neutral'}>
                Prioridad {PRIORITY_LABELS[item.priority] || 'media'}
              </Badge>
              <span>{formatDate(item.createdAt)}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
