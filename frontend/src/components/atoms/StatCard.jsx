/**
 * STUDIA - Atomo: Tarjeta de estadistica
 * ------------------------------------------------------------------
 * Muestra un unico dato. Si el valor todavia no existe se muestra "Sin datos",
 * nunca una cifra inventada.
 *
 * @param {{label:string, value?:number|string|null, hint?:string, icon?:string,
 *          tone?:'primary'|'success'|'slate', loading?:boolean}} props
 */

import Icon from './Icon.jsx';

export default function StatCard({ label, value, hint, icon, tone = 'primary', loading = false }) {
  const hasValue = value !== null && value !== undefined && value !== '';
  const display = hasValue ? (typeof value === 'number' ? value.toLocaleString('es-MX') : value) : 'Sin datos';

  return (
    <article className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        {icon && (
          <span className="stat-card__icon">
            <Icon name={icon} size={19} />
          </span>
        )}
      </div>

      {loading ? (
        <span className="spinner" aria-hidden="true" />
      ) : (
        <span className={`stat-card__value${hasValue ? '' : ' hint'}`}>{display}</span>
      )}

      {hint && <p className="stat-card__hint">{hint}</p>}
    </article>
  );
}
