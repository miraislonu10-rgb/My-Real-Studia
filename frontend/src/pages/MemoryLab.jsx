import { useCallback, useEffect, useState } from 'react';

import Icon from '../components/atoms/Icon.jsx';
import StatCard from '../components/atoms/StatCard.jsx';
import EmptyState from '../components/atoms/EmptyState.jsx';
import Modal from '../components/molecules/Modal.jsx';
import {
  listFlashcards,
  getPendingFlashcards,
  getReviewHistory,
  getFlashcardStats,
  createFlashcard,
  updateFlashcard,
  reviewFlashcard,
  deleteFlashcard,
} from '../services/flashcards.js';
import { getSubjects, getTopics } from '../services/subject.js';
import { formatDate, describeDueDate } from '../utils/format.js';

/** Escala de comprensión SM-2 (0-5). */
const RATING_OPTIONS = [
  { value: 0, label: '0 · Olvido total' },
  { value: 1, label: '1 · Incorrecto, familiar' },
  { value: 2, label: '2 · Incorrecto con esfuerzo' },
  { value: 3, label: '3 · Correcto con dificultad' },
  { value: 4, label: '4 · Correcto con vacilación' },
  { value: 5, label: '5 · Recuerdo perfecto' },
];

const STATUS_META = {
  new: { label: 'Nueva', badge: 'badge--info' },
  learning: { label: 'Aprendiendo', badge: 'badge--warning' },
  review: { label: 'En repaso', badge: 'badge--primary' },
  mastered: { label: 'Dominada', badge: 'badge--success' },
};

const DIFFICULTY_LABELS = { easy: 'Fácil', medium: 'Media', hard: 'Difícil' };

const emptyForm = {
  id: null,
  frontText: '',
  backText: '',
  hint: '',
  subjectId: '',
  topicId: '',
  difficultyLevel: 'medium',
};

/**
 * STUDIA - Memory Lab (Repetición espaciada)
 * ------------------------------------------------------------------
 * Sistema de tarjetas de memoria con el algoritmo SM-2. Permite crear tarjetas,
 * asociarlas a materias y temas, registrar respuestas, evaluar la comprensión y
 * programar los repasos. Los intervalos, el factor de facilidad y el historial
 * se calculan y persisten en MySQL (backend).
 */
export default function MemoryLab() {
  const [tab, setTab] = useState('review');

  const [stats, setStats] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // --- Repaso en curso
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(true);

  // --- Mis tarjetas
  const [cards, setCards] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '', subjectId: '', status: '' });

  // --- Historial
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // --- Modal de alta/edición
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formTopics, setFormTopics] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const loadStats = useCallback(async () => {
    try {
      setStats(await getFlashcardStats());
    } catch {
      setStats(null);
    }
  }, []);

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const pending = await getPendingFlashcards();
      setQueue(pending);
      setQueueIndex(0);
      setRevealed(false);
      setShowHint(false);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las tarjetas pendientes.');
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const loadCards = useCallback(async (activeFilters = filters) => {
    setCardsLoading(true);
    try {
      const params = {};
      if (activeFilters.search.trim()) params.search = activeFilters.search.trim();
      if (activeFilters.subjectId) params.subjectId = activeFilters.subjectId;
      if (activeFilters.status) params.status = activeFilters.status;
      const data = await listFlashcards({ ...params, limit: 50 });
      setCards(data.flashcards || []);
      setPagination(data.pagination || null);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las tarjetas.');
    } finally {
      setCardsLoading(false);
    }
  }, [filters]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      setHistory(await getReviewHistory());
    } catch (err) {
      setError(err.message || 'No se pudo cargar el historial de repasos.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    getSubjects()
      .then(setSubjects)
      .catch(() => setSubjects([]));
    loadStats();
    loadPending();
  }, [loadStats, loadPending]);

  useEffect(() => {
    if (tab === 'cards') loadCards();
    if (tab === 'history') loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (form.subjectId) {
      getTopics(form.subjectId)
        .then(setFormTopics)
        .catch(() => setFormTopics([]));
    } else {
      setFormTopics([]);
    }
  }, [form.subjectId]);

  const currentCard = queue[queueIndex] || null;

  // ------------------------------------------------------------------ Repaso
  const handleRate = async (rating) => {
    if (!currentCard) return;
    setReviewing(true);
    setError('');
    setNotice('');
    try {
      const updated = await reviewFlashcard(currentCard.id, { rating });
      setNotice(
        `Repaso guardado. Próxima revisión: ${describeDueDate(updated?.nextReviewAt) || 'programada'} (intervalo de ${
          updated?.intervalDays ?? 0
        } día(s)).`
      );
      await loadStats();
      setRevealed(false);
      setShowHint(false);
      setQueueIndex((index) => index + 1);
    } catch (err) {
      setError(err.message || 'No se pudo registrar el repaso.');
    } finally {
      setReviewing(false);
    }
  };

  // ------------------------------------------------------------------ Tarjetas
  const openCreate = () => {
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (card) => {
    setForm({
      id: card.id,
      frontText: card.frontText,
      backText: card.backText,
      hint: card.hint || '',
      subjectId: card.subjectId ? String(card.subjectId) : '',
      topicId: card.topicId ? String(card.topicId) : '',
      difficultyLevel: card.difficultyLevel || 'medium',
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.frontText.trim() || !form.backText.trim()) {
      setFormError('El anverso y el reverso son obligatorios.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        frontText: form.frontText.trim(),
        backText: form.backText.trim(),
        hint: form.hint.trim() || null,
        subjectId: form.subjectId ? Number(form.subjectId) : undefined,
        topicId: form.topicId ? Number(form.topicId) : undefined,
        difficultyLevel: form.difficultyLevel,
      };
      if (form.id) await updateFlashcard(form.id, payload);
      else await createFlashcard(payload);

      setModalOpen(false);
      setNotice(form.id ? 'Tarjeta actualizada.' : 'Tarjeta creada y programada para repaso.');
      await Promise.all([loadCards(), loadStats(), loadPending()]);
    } catch (err) {
      setFormError(err.message || 'No se pudo guardar la tarjeta.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (card) => {
    if (!window.confirm(`¿Eliminar la tarjeta "${card.frontText.slice(0, 40)}..."?`)) return;
    try {
      await deleteFlashcard(card.id);
      setNotice('Tarjeta eliminada.');
      await Promise.all([loadCards(), loadStats(), loadPending()]);
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la tarjeta.');
    }
  };

  const applyFilters = (event) => {
    event.preventDefault();
    loadCards();
  };

  const reviewComplete = !pendingLoading && queue.length > 0 && queueIndex >= queue.length;

  return (
    <section className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Memory Lab — Repetición espaciada</h2>
          <p className="page__text">
            Crea tarjetas, regístralas por materia y tema y evalúa tu comprensión. El algoritmo SM-2
            programa automáticamente cada repaso según tu desempeño real y guarda el historial en MySQL.
          </p>
        </div>
      </div>

      {error && (
        <div className="status status--error" role="alert">
          {error}
        </div>
      )}
      {notice && <div className="status status--ok">{notice}</div>}

      {/* --------------------------------------------------------- Métricas */}
      <div className="grid grid--stats" style={{ marginBottom: '1.1rem' }}>
        <StatCard label="Tarjetas totales" value={stats?.totalCards ?? 0} icon="layers" />
        <StatCard label="Pendientes hoy" value={stats?.pendingReview ?? 0} icon="clock" tone="slate" />
        <StatCard label="Dominadas" value={stats?.masteredCards ?? 0} icon="award" tone="success" />
        <StatCard label="Repasos completados" value={stats?.totalReviewsCompleted ?? 0} icon="trend" />
      </div>

      {/* --------------------------------------------------------- Pestañas */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          { id: 'review', label: 'Repasar', icon: 'sparkles' },
          { id: 'cards', label: 'Mis tarjetas', icon: 'layers' },
          { id: 'history', label: 'Historial', icon: 'clock' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            className={`button ${tab === item.id ? 'button--primary' : 'button--ghost'}`}
            onClick={() => setTab(item.id)}
          >
            <Icon name={item.icon} size={16} />
            {item.label}
          </button>
        ))}
      </div>

      {/* --------------------------------------------------------- Repasar */}
      {tab === 'review' && (
        <div className="card">
          {pendingLoading ? (
            <p className="hint">Cargando tarjetas pendientes...</p>
          ) : queue.length === 0 ? (
            <EmptyState
              icon="check"
              title="No hay tarjetas pendientes de repaso"
              text="Todas tus tarjetas están al día. Crea nuevas tarjetas en «Mis tarjetas» o vuelve más tarde."
              plain
            />
          ) : reviewComplete ? (
            <EmptyState
              icon="award"
              title="¡Repaso de hoy completado!"
              text={`Has repasado ${queue.length} tarjeta(s). Los repasos se han reprogramado con el algoritmo SM-2.`}
              plain
            />
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span className="hint">
                  Tarjeta {queueIndex + 1} de {queue.length}
                </span>
                {currentCard.subjectName && (
                  <span className="badge badge--info">{currentCard.subjectName}</span>
                )}
              </div>

              <div
                className="flashcard"
                onClick={() => setRevealed((value) => !value)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') setRevealed((value) => !value);
                }}
              >
                <span className="flashcard__side">{revealed ? 'Reverso' : 'Anverso'}</span>
                <p className="flashcard__text">
                  {revealed ? currentCard.backText : currentCard.frontText}
                </p>
                <span className="hint">Haz clic para {revealed ? 'ver la pregunta' : 'revelar la respuesta'}</span>
              </div>

              {currentCard.hint && (
                <div style={{ marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="button button--ghost button--small"
                    onClick={() => setShowHint((value) => !value)}
                  >
                    {showHint ? 'Ocultar pista' : 'Ver pista'}
                  </button>
                  {showHint && <p className="hint">💡 {currentCard.hint}</p>}
                </div>
              )}

              <p className="hint" style={{ margin: '1.25rem 0 0.5rem 0' }}>
                ¿Qué tan bien recordaste la respuesta? (evalúa tu comprensión)
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {RATING_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="button button--ghost button--small"
                    disabled={reviewing || !revealed}
                    onClick={() => handleRate(option.value)}
                    title={!revealed ? 'Revela la respuesta antes de calificar' : undefined}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {!revealed && (
                <p className="hint" style={{ marginTop: '0.5rem' }}>
                  Revela la respuesta para poder calificarte.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* --------------------------------------------------------- Mis tarjetas */}
      {tab === 'cards' && (
        <>
          <form className="card" onSubmit={applyFilters}>
            <div className="form__row form__row--filters">
              <div className="form-field">
                <label htmlFor="fcSearch">Buscar</label>
                <input
                  id="fcSearch"
                  className="input"
                  value={filters.search}
                  onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                  placeholder="Texto del anverso o reverso"
                />
              </div>
              <div className="form-field">
                <label htmlFor="fcSubject">Materia</label>
                <select
                  id="fcSubject"
                  className="input"
                  value={filters.subjectId}
                  onChange={(event) => setFilters((prev) => ({ ...prev, subjectId: event.target.value }))}
                >
                  <option value="">Todas</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="fcStatus">Estado</label>
                <select
                  id="fcStatus"
                  className="input"
                  value={filters.status}
                  onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                >
                  <option value="">Todos</option>
                  {Object.entries(STATUS_META).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label aria-hidden="true">&nbsp;</label>
                <button className="button button--primary" type="submit">
                  Filtrar
                </button>
              </div>
            </div>
          </form>

          <div className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Mis tarjetas</h3>
                <p className="card__subtitle">
                  {pagination ? `${pagination.total} tarjeta(s)` : 'Tu colección de estudio'}
                </p>
              </div>
              <button className="button button--primary" type="button" onClick={openCreate}>
                <Icon name="plus" size={16} />
                Nueva tarjeta
              </button>
            </div>

            {cardsLoading ? (
              <p className="hint">Cargando tarjetas...</p>
            ) : cards.length === 0 ? (
              <EmptyState
                icon="layers"
                title="Aún no tienes tarjetas"
                text="Crea tu primera tarjeta de memoria para empezar a repasar de forma espaciada."
                plain
              />
            ) : (
              <div className="subject-progress">
                {cards.map((card) => {
                  const meta = STATUS_META[card.status] || STATUS_META.new;
                  return (
                    <div className="subject-progress__row" key={card.id}>
                      <div className="subject-progress__meta">
                        <span className="subject-progress__name">
                          <span
                            className="subject-progress__dot"
                            style={{ background: card.subjectColor || 'var(--lav-500)' }}
                          />
                          {card.frontText}
                          <span className={`badge ${meta.badge}`}>{meta.label}</span>
                          {card.subjectName && <span className="badge badge--info">{card.subjectName}</span>}
                        </span>
                        <span className="subject-progress__value">
                          {DIFFICULTY_LABELS[card.difficultyLevel] || card.difficultyLevel} · repaso{' '}
                          {describeDueDate(card.nextReviewAt) || 'sin programar'} · {card.repetitions} repetición(es)
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          className="button button--ghost button--small"
                          onClick={() => openEdit(card)}
                        >
                          <Icon name="pencil" size={14} />
                          Editar
                        </button>
                        <button
                          type="button"
                          className="button button--ghost button--small"
                          onClick={() => handleDelete(card)}
                        >
                          <Icon name="trash" size={14} />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* --------------------------------------------------------- Historial */}
      {tab === 'history' && (
        <div className="card">
          <div className="card__head">
            <div>
              <h3 className="card__title">Historial de repasos</h3>
              <p className="card__subtitle">Últimos repasos registrados con el intervalo programado.</p>
            </div>
          </div>

          {historyLoading ? (
            <p className="hint">Cargando historial...</p>
          ) : history.length === 0 ? (
            <EmptyState
              icon="clock"
              title="Sin repasos registrados"
              text="Cuando completes repasos aparecerán aquí con su calificación e intervalo."
              plain
            />
          ) : (
            <table className="table table--grid">
              <thead>
                <tr>
                  <th>Tarjeta</th>
                  <th>Materia</th>
                  <th>Calificación</th>
                  <th>Intervalo</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id}>
                    <td>{row.frontText}</td>
                    <td>{row.subjectName || '—'}</td>
                    <td>{row.rating} / 5</td>
                    <td>{row.scheduledInterval} día(s)</td>
                    <td>{formatDate(row.reviewDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* --------------------------------------------------------- Modal */}
      <Modal
        open={modalOpen}
        title={form.id ? 'Editar tarjeta' : 'Nueva tarjeta'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button className="button button--ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button className="button button--primary" type="submit" form="flashcardForm" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar tarjeta'}
            </button>
          </>
        }
      >
        <form id="flashcardForm" onSubmit={handleSave}>
          {formError && <div className="status status--error">{formError}</div>}

          <div className="form-field">
            <label htmlFor="fcFront">Anverso (pregunta o concepto)</label>
            <textarea
              id="fcFront"
              className="input"
              rows={3}
              value={form.frontText}
              maxLength={5000}
              onChange={(event) => setForm((prev) => ({ ...prev, frontText: event.target.value }))}
            />
          </div>

          <div className="form-field">
            <label htmlFor="fcBack">Reverso (respuesta o explicación)</label>
            <textarea
              id="fcBack"
              className="input"
              rows={3}
              value={form.backText}
              maxLength={5000}
              onChange={(event) => setForm((prev) => ({ ...prev, backText: event.target.value }))}
            />
          </div>

          <div className="form-field">
            <label htmlFor="fcHint">Pista (opcional)</label>
            <input
              id="fcHint"
              className="input"
              value={form.hint}
              maxLength={1000}
              onChange={(event) => setForm((prev) => ({ ...prev, hint: event.target.value }))}
            />
          </div>

          <div className="form__row">
            <div className="form-field">
              <label htmlFor="fcFormSubject">Materia</label>
              <select
                id="fcFormSubject"
                className="input"
                value={form.subjectId}
                onChange={(event) => setForm((prev) => ({ ...prev, subjectId: event.target.value, topicId: '' }))}
              >
                <option value="">Sin materia</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="fcFormTopic">Tema</label>
              <select
                id="fcFormTopic"
                className="input"
                value={form.topicId}
                disabled={!form.subjectId}
                onChange={(event) => setForm((prev) => ({ ...prev, topicId: event.target.value }))}
              >
                <option value="">Sin tema</option>
                {formTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="fcDifficulty">Dificultad</label>
            <select
              id="fcDifficulty"
              className="input"
              value={form.difficultyLevel}
              onChange={(event) => setForm((prev) => ({ ...prev, difficultyLevel: event.target.value }))}
            >
              {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>
    </section>
  );
}
