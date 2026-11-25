import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import Icon from '../components/atoms/Icon.jsx';
import EmptyState from '../components/atoms/EmptyState.jsx';
import StatCard from '../components/atoms/StatCard.jsx';
import { applyRescuePlan, previewRescuePlan } from '../services/studyRescue.js';
import { getSubjects } from '../services/subject.js';
import { formatDate, formatMinutes, todayISO } from '../utils/format.js';

const PRIORITY_META = {
  urgent: { label: 'Urgente', tone: 'danger' },
  high: { label: 'Alta', tone: 'warning' },
  medium: { label: 'Media', tone: 'info' },
  low: { label: 'Baja', tone: 'neutral' },
};

/**
 * STUDIA - Study Rescue (plan de rescate pre-examen)
 * ------------------------------------------------------------------
 * Genera un plan de estudio personalizado para preparar un examen con fecha
 * limite, apoyandose en datos reales: el dominio por tema (Knowledge Map), las
 * tarjetas pendientes (Memory Lab) y los errores recurrentes (Error DNA).
 * El plan puede volcarse como tareas reales en el Smart Planner.
 */
export default function StudyRescue() {
  const [subjects, setSubjects] = useState([]);

  const [examDate, setExamDate] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [availableMinutesPerDay, setAvailableMinutesPerDay] = useState(90);
  const [maxTopics, setMaxTopics] = useState(8);

  const [plan, setPlan] = useState(null);
  const [createdTasks, setCreatedTasks] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    getSubjects()
      .then(setSubjects)
      .catch(() => setSubjects([]));
  }, []);

  const buildPayload = useCallback(
    () => ({
      examDate,
      subjectId: subjectId ? Number(subjectId) : undefined,
      availableMinutesPerDay: Number(availableMinutesPerDay) || 90,
      maxTopics: Number(maxTopics) || 8,
    }),
    [examDate, subjectId, availableMinutesPerDay, maxTopics]
  );

  const handlePreview = async (event) => {
    event.preventDefault();
    if (!examDate) {
      setError('Indica la fecha del examen.');
      return;
    }
    setLoading(true);
    setError('');
    setNotice('');
    setCreatedTasks(null);
    try {
      setPlan(await previewRescuePlan(buildPayload()));
    } catch (err) {
      setPlan(null);
      setError(err.message || 'No se pudo generar el plan de rescate.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    setError('');
    setNotice('');
    try {
      const result = await applyRescuePlan(buildPayload());
      setCreatedTasks(result?.tasks || []);
      setPlan(result?.plan || plan);
      setNotice(
        `Se crearon ${result?.tasks?.length || 0} tarea(s) en tu Smart Planner. Las encontraras programadas segun la fecha del examen.`
      );
    } catch (err) {
      setError(err.message || 'No se pudieron crear las tareas del plan.');
    } finally {
      setApplying(false);
    }
  };

  /** Agrupa los items del plan por fecha. */
  const itemsByDate = useMemo(() => {
    if (!plan?.items) return [];
    const groups = new Map();
    plan.items.forEach((item) => {
      if (!groups.has(item.date)) groups.set(item.date, []);
      groups.get(item.date).push(item);
    });
    const loads = new Map((plan.dayLoads || []).map((day) => [day.date, day]));
    return Array.from(groups.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, items]) => ({ date, items, load: loads.get(date) || null }));
  }, [plan]);

  /** Distintivo de procedencia del comentario del plan (IA o motor local). */
  const coachBadge = () => {
    if (!plan?.coach) return null;
    const { source, provider, model, aiGenerated } = plan.coach;
    if (aiGenerated || ['gemini_ai', 'openai_ai'].includes(source)) {
      return (
        <span className="badge badge--success">
          IA activa · {provider} · {model}
        </span>
      );
    }
    return <span className="badge badge--info">Motor local STUDIA (sin credenciales de IA)</span>;
  };

  return (
    <section className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Study Rescue — Plan pre-examen</h2>
          <p className="page__text">
            Prepara un examen con un plan personalizado calculado a partir de tu dominio real
            por tema, tus errores recurrentes y las tarjetas pendientes de repaso, comentado con
            IA (diagnóstico y estrategias). Convierte el plan en tareas reales en tu Smart Planner.
          </p>
        </div>
      </div>

      {error && (
        <div className="status status--error" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}
      {notice && (
        <div className="status status--ok" style={{ marginBottom: '1rem' }}>
          {notice} <Link to="/planificador">Ver Smart Planner</Link>
        </div>
      )}

      {/* --------------------------------------------------------- Formulario */}
      <form className="card" onSubmit={handlePreview}>
        <div className="card__head">
          <div>
            <h3 className="card__title">Configura tu rescate</h3>
            <p className="card__subtitle">
              Indica la fecha del examen y cuanto tiempo puedes dedicar cada dia.
            </p>
          </div>
        </div>

        <div className="form__row">
          <div className="form-field">
            <label htmlFor="srExamDate">Fecha del examen</label>
            <input
              id="srExamDate"
              type="date"
              className="input"
              value={examDate}
              min={todayISO()}
              required
              data-autofocus
              onChange={(event) => setExamDate(event.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="srSubject">Materia (opcional)</label>
            <select
              id="srSubject"
              className="input"
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
            >
              <option value="">Todas mis materias</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form__row">
          <div className="form-field">
            <label htmlFor="srMinutes">Minutos disponibles por dia</label>
            <input
              id="srMinutes"
              type="number"
              className="input"
              min={20}
              max={600}
              value={availableMinutesPerDay}
              onChange={(event) => setAvailableMinutesPerDay(event.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="srMaxTopics">Maximo de temas a rescatar</label>
            <input
              id="srMaxTopics"
              type="number"
              className="input"
              min={1}
              max={20}
              value={maxTopics}
              onChange={(event) => setMaxTopics(event.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button className="button button--primary" type="submit" disabled={loading}>
            <Icon name="shield" size={16} />
            {loading ? 'Generando plan...' : 'Generar plan de rescate'}
          </button>
        </div>
      </form>

      {!plan && !loading && (
        <div className="card">
          <EmptyState
            icon="shield"
            title="Genera tu plan de rescate"
            text="Completa la fecha del examen y pulsa «Generar plan». Analizaremos tus temas debiles, tus errores recurrentes y tus tarjetas pendientes para proponerte un plan dia a dia."
            plain
          />
        </div>
      )}

      {plan && (
        <>
          {!plan.hasData ? (
            <div className="card">
              <EmptyState
                icon="check"
                title="No hay nada urgente que rescatar"
                text="No detectamos temas con bajo dominio, errores recurrentes ni tarjetas pendientes en el alcance elegido. Tu preparacion va al dia."
                plain
              />
            </div>
          ) : (
            <>
              {/* --------------------------------------------- Resumen del plan */}
              <div className="grid grid--stats" style={{ marginBottom: '1.1rem' }}>
                <StatCard label="Dias hasta el examen" value={plan.daysAvailable} icon="calendar" />
                <StatCard label="Bloques de estudio" value={plan.itemCount} icon="checkSquare" />
                <StatCard
                  label="Tiempo total planificado"
                  value={formatMinutes(plan.totalPlannedMinutes)}
                  icon="clock"
                />
                <StatCard
                  label="Tarjetas pendientes"
                  value={plan.context.dueFlashcards}
                  hint="Repaso espaciado"
                  icon="layers"
                  tone="slate"
                />
                <StatCard
                  label="Errores recurrentes"
                  value={plan.context.recurringPatterns}
                  hint="Patrones a corregir"
                  icon="bug"
                  tone="slate"
                />
              </div>

              {plan.coach && (
                <div className="card">
                  <div className="card__head">
                    <div>
                      <h3 className="card__title">Diagnóstico del plan</h3>
                      <p className="card__subtitle">
                        Comentario pedagógico sobre tu preparación pre-examen.
                      </p>
                    </div>
                    {coachBadge()}
                  </div>
                  {plan.coach.diagnostic && <p>{plan.coach.diagnostic}</p>}
                  {plan.coach.providerNotice && (
                    <div className="status status--warning" style={{ marginTop: '0.5rem' }}>
                      {plan.coach.providerNotice}
                    </div>
                  )}
                </div>
              )}

              {plan.context.weakTopics.length > 0 && (
                <div className="card">
                  <div className="card__head">
                    <div>
                      <h3 className="card__title">Temas objetivo</h3>
                      <p className="card__subtitle">Los temas con menor dominio que abordara el plan.</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {plan.context.weakTopics.map((topic) => (
                      <span key={topic.topicId} className="badge badge--warning" style={{ padding: '0.35rem 0.7rem' }}>
                        {topic.name} · {topic.masteryScore}%
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* --------------------------------------------- Plan dia a dia */}
              {itemsByDate.map((day) => (
                <div className="card" key={day.date}>
                  <div className="card__head">
                    <div>
                      <h3 className="card__title">{formatDate(day.date)}</h3>
                      <p className="card__subtitle">
                        {day.items.length} bloque(s)
                        {day.load ? ` · ${formatMinutes(day.load.minutes)}` : ''}
                      </p>
                    </div>
                    {day.load?.exceedsAvailability && (
                      <span className="badge badge--danger">Excede tu disponibilidad diaria</span>
                    )}
                  </div>

                  <div className="subject-progress">
                    {day.items.map((item, index) => {
                      const priority = PRIORITY_META[item.priority] || PRIORITY_META.medium;
                      return (
                        <div className="subject-progress__row" key={`${item.title}-${index}`}>
                          <div className="subject-progress__meta">
                            <span className="subject-progress__name">
                              <span
                                className="subject-progress__dot"
                                style={{ background: item.subjectColor || 'var(--lav-500)' }}
                              />
                              {item.title}
                              <span className={`badge badge--${priority.tone}`}>{priority.label}</span>
                              {item.subjectName && <span className="badge badge--info">{item.subjectName}</span>}
                            </span>
                            <span className="subject-progress__value">
                              {formatMinutes(item.estimatedMinutes)}
                              {item.masteryScore !== null ? ` · dominio ${item.masteryScore}%` : ''}
                            </span>
                          </div>
                          <p className="hint" style={{ marginTop: '0.2rem' }}>
                            {item.description}
                          </p>
                          {item.strategy && (
                            <p className="hint" style={{ marginTop: '0.2rem' }}>
                              <strong>{item.focus ? `${item.focus}: ` : 'Estrategia: '}</strong>
                              {item.strategy}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* --------------------------------------------- Aplicar */}
              <div className="card">
                <div className="card__head">
                  <div>
                    <h3 className="card__title">Llevar el plan a tu Smart Planner</h3>
                    <p className="card__subtitle">
                      Se crearan {plan.itemCount} tarea(s) con su fecha, prioridad y duracion estimada.
                    </p>
                  </div>
                  <button
                    className="button button--primary"
                    type="button"
                    onClick={handleApply}
                    disabled={applying || createdTasks !== null}
                  >
                    <Icon name="check" size={16} />
                    {applying ? 'Creando tareas...' : createdTasks !== null ? 'Tareas creadas' : 'Crear tareas'}
                  </button>
                </div>
                {createdTasks !== null && (
                  <p className="hint">
                    {createdTasks.length} tarea(s) creadas en el Smart Planner. Ábrelas en{' '}
                    <Link to="/planificador">Smart Planner</Link> para marcarlas como completadas.
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
