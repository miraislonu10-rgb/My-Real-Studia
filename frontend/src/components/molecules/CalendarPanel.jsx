/**
 * STUDIA - Molecula: Calendario mensual
 * ------------------------------------------------------------------
 * Solo marca los dias que tienen tareas con vencimiento (dato real enviado por
 * la API). Si el mes no tiene ninguna, lo indica en lugar de rellenarlo.
 *
 * @param {{
 *   month: string,                  // 'YYYY-MM'
 *   daysInMonth: number,
 *   entries: Array<{date:string, count:number}>,
 *   onPrev: Function,
 *   onNext: Function,
 * }} props
 */

import Button from '../atoms/Button.jsx';
import Icon from '../atoms/Icon.jsx';
import { formatMonth, todayISO } from '../../utils/format.js';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Desplazamiento (0 = lunes) del primer dia del mes. */
const firstWeekdayOffset = (month) => {
  const [year, monthNumber] = month.split('-').map(Number);
  const day = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  return day === 0 ? 6 : day - 1;
};

export default function CalendarPanel({ month, daysInMonth, entries = [], onPrev, onNext }) {
  const marked = new Map(entries.map((entry) => [entry.date, Number(entry.count)]));
  const offset = firstWeekdayOffset(month);
  const today = todayISO();
  const monthPrefix = month;

  const cells = [
    ...Array.from({ length: offset }, (_, index) => ({ key: `pad-${index}`, empty: true })),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const iso = `${monthPrefix}-${String(day).padStart(2, '0')}`;
      return { key: iso, day, iso, count: marked.get(iso) ?? 0 };
    }),
  ];

  return (
    <section className="card">
      <div className="calendar__head">
        <div>
          <h3 className="card__title">Calendario</h3>
          <p className="card__subtitle">Vencimiento de tus tareas</p>
        </div>
        <div className="pagination__controls">
          <Button variant="icon" className="button--icon" onClick={onPrev} aria-label="Mes anterior">
            <Icon name="chevronLeft" size={18} />
          </Button>
          <span className="calendar__month">{formatMonth(month)}</span>
          <Button variant="icon" className="button--icon" onClick={onNext} aria-label="Mes siguiente">
            <Icon name="chevronRight" size={18} />
          </Button>
        </div>
      </div>

      <div className="calendar__grid">
        {WEEKDAYS.map((weekday, index) => (
          <span className="calendar__weekday" key={`w-${index}`}>
            {weekday}
          </span>
        ))}

        {cells.map((cell) =>
          cell.empty ? (
            <span className="calendar__cell calendar__cell--empty" key={cell.key} />
          ) : (
            <span
              key={cell.key}
              className={[
                'calendar__cell',
                cell.iso === today ? 'calendar__cell--today' : '',
                cell.count > 0 ? 'calendar__cell--marked' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              title={cell.count > 0 ? `${cell.count} tarea(s) con vencimiento` : undefined}
            >
              {cell.day}
              {cell.count > 0 && <span className="calendar__dot" />}
            </span>
          )
        )}
      </div>

      <p className="calendar__legend">
        <span className="calendar__dot" style={{ position: 'static' }} />
        {marked.size > 0
          ? `Dias con tareas programadas este mes: ${marked.size}`
          : 'Sin tareas con fecha de vencimiento en este mes.'}
      </p>
    </section>
  );
}
