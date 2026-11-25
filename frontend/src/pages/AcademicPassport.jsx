import { useCallback, useEffect, useMemo, useState } from 'react';

import Icon from '../components/atoms/Icon.jsx';
import EmptyState from '../components/atoms/EmptyState.jsx';
import StatCard from '../components/atoms/StatCard.jsx';
import Modal from '../components/molecules/Modal.jsx';
import {
  createPassportEntry,
  deletePassportEntry,
  getPassport,
  updatePassportEntry,
} from '../services/passport.js';
import { formatDate, formatMinutes } from '../utils/format.js';

const ENTRY_TYPES = {
  skill: { label: 'Habilidad', icon: 'target' },
  project: { label: 'Proyecto', icon: 'layers' },
  certification: { label: 'Certificacion', icon: 'shield' },
  achievement: { label: 'Logro', icon: 'award' },
};

const FILTERS = [
  { id: 'all', label: 'Todo' },
  { id: 'skill', label: 'Habilidades' },
  { id: 'project', label: 'Proyectos' },
  { id: 'certification', label: 'Certificaciones' },
  { id: 'achievement', label: 'Logros' },
];

const emptyForm = {
  id: null,
  entryType: 'skill',
  title: '',
  description: '',
  category: '',
  level: '',
  link: '',
  dateCompleted: '',
};

/**
 * STUDIA - Academic Passport (pasaporte academico)
 * ------------------------------------------------------------------
 * Reune dos capas: (1) el progreso academico REAL calculado desde MySQL
 * (sesiones, temas dominados, errores superados, tarjetas, tareas, precision)
 * con sus distintivos, y (2) las entradas que el estudiante documenta a mano
 * (habilidades, proyectos, certificaciones y logros).
 */
export default function AcademicPassport() {
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPassport(await getPassport());
    } catch (err) {
      setError(err.message || 'No se pudo cargar tu pasaporte academico.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const academic = passport?.academic || null;
  const badges = passport?.badges || [];
  const entries = passport?.entries || [];

  const visibleEntries = useMemo(
    () => (filter === 'all' ? entries : entries.filter((entry) => entry.entryType === filter)),
    [entries, filter]
  );

  const openCreate = () => {
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (entry) => {
    setForm({
      id: entry.id,
      entryType: entry.entryType,
      title: entry.title,
      description: entry.description || '',
      category: entry.category || '',
      level: entry.level || '',
      link: entry.link || '',
      dateCompleted: entry.dateCompleted ? String(entry.dateCompleted).slice(0, 10) : '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setFormError('El titulo es obligatorio.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        entryType: form.entryType,
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        level: form.level.trim() || null,
        link: form.link.trim() || null,
        dateCompleted: form.dateCompleted || null,
      };
      if (form.id) await updatePassportEntry(form.id, payload);
      else await createPassportEntry(payload);

      setModalOpen(false);
      setNotice(form.id ? 'Entrada actualizada.' : 'Entrada anadida a tu pasaporte.');
      await load();
    } catch (err) {
      setFormError(err.message || 'No se pudo guardar la entrada.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry) => {
    if (!window.confirm(`¿Eliminar "${entry.title}" de tu pasaporte?`)) return;
    try {
      await deletePassportEntry(entry.id);
      setNotice('Entrada eliminada.');
      await load();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la entrada.');
    }
  };

  return (
    <section className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Academic Passport — Tu trayectoria</h2>
          <p className="page__text">
            Tu progreso academico real (calculado desde tus datos en MySQL) junto con las
            habilidades, proyectos, certificaciones y logros que documentas. Un registro
            honesto de lo que has construido.
          </p>
        </div>
      </div>

      {error && (
        <div className="status status--error" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}
      {notice && <div className="status status--ok" style={{ marginBottom: '1rem' }}>{notice}</div>}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p className="hint">Cargando tu pasaporte academico...</p>
        </div>
      ) : (
        <>
          {/* --------------------------------------------------- Progreso real */}
          <div className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Progreso academico verificado</h3>
                <p className="card__subtitle">Calculado automaticamente a partir de tu actividad real.</p>
              </div>
            </div>
            <div className="grid grid--stats">
              <StatCard label="Tiempo de estudio" value={formatMinutes(academic.studyMinutes)} hint={`${academic.studyHours} horas`} icon="clock" />
              <StatCard label="Sesiones" value={academic.sessions} icon="target" tone="slate" />
              <StatCard label="Materias" value={academic.subjects} icon="book" tone="slate" />
              <StatCard
                label="Temas dominados"
                value={`${academic.topicsMastered} / ${academic.topicsTotal}`}
                icon="award"
                tone="success"
              />
              <StatCard
                label="Errores superados"
                value={`${academic.errorsResolved} / ${academic.errorsTotal}`}
                icon="bug"
                tone="success"
              />
              <StatCard
                label="Tarjetas dominadas"
                value={`${academic.flashcardsMastered} / ${academic.flashcardsTotal}`}
                icon="layers"
              />
              <StatCard label="Tareas completadas" value={academic.tasksCompleted} icon="checkSquare" tone="success" />
              <StatCard
                label="Precision en ejercicios"
                value={academic.accuracy === null ? null : `${academic.accuracy}%`}
                hint={`${academic.correctAttempts} de ${academic.gradedAttempts} intentos`}
                icon="trend"
              />
            </div>
          </div>

          {/* --------------------------------------------------- Distintivos */}
          <div className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Distintivos</h3>
                <p className="card__subtitle">
                  {passport.badgesEarned} de {badges.length} conseguidos.
                </p>
              </div>
            </div>
            <div className="grid grid--stats">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className="stat-card"
                  style={{ opacity: badge.earned ? 1 : 0.45 }}
                >
                  <div className="stat-card__top">
                    <span className="stat-card__label">{badge.label}</span>
                    <span className="stat-card__icon">
                      <Icon name={badge.icon} size={19} />
                    </span>
                  </div>
                  <span className={`badge ${badge.earned ? 'badge--success' : ''}`}>
                    {badge.earned ? 'Conseguido' : 'En progreso'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* --------------------------------------------------- Entradas */}
          <div className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Mi portafolio</h3>
                <p className="card__subtitle">
                  {entries.length} entrada(s) documentada(s) por ti.
                </p>
              </div>
              <button className="button button--primary" type="button" onClick={openCreate}>
                <Icon name="plus" size={16} />
                Nueva entrada
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`button button--small ${filter === item.id ? 'button--primary' : 'button--ghost'}`}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {visibleEntries.length === 0 ? (
              <EmptyState
                icon="award"
                title="Aun no hay entradas en esta seccion"
                text="Documenta tus habilidades, proyectos, certificaciones y logros para construir tu pasaporte academico."
                plain
              />
            ) : (
              <div className="subject-progress">
                {visibleEntries.map((entry) => {
                  const meta = ENTRY_TYPES[entry.entryType] || ENTRY_TYPES.skill;
                  return (
                    <div className="subject-progress__row" key={entry.id}>
                      <div className="subject-progress__meta">
                        <span className="subject-progress__name">
                          <Icon name={meta.icon} size={16} />
                          {entry.title}
                          <span className="badge badge--primary">{meta.label}</span>
                          {entry.level && <span className="badge">{entry.level}</span>}
                          {entry.category && <span className="badge badge--info">{entry.category}</span>}
                        </span>
                        <span className="subject-progress__value">
                          {entry.dateCompleted ? formatDate(entry.dateCompleted) : 'Sin fecha'}
                          {entry.link ? (
                            <>
                              {' · '}
                              <a href={entry.link} target="_blank" rel="noreferrer">
                                Enlace
                              </a>
                            </>
                          ) : (
                            ''
                          )}
                        </span>
                      </div>
                      {entry.description && (
                        <p className="hint" style={{ marginTop: '0.2rem' }}>
                          {entry.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                        <button
                          type="button"
                          className="button button--ghost button--small"
                          onClick={() => openEdit(entry)}
                        >
                          <Icon name="pencil" size={14} />
                          Editar
                        </button>
                        <button
                          type="button"
                          className="button button--ghost button--small"
                          onClick={() => handleDelete(entry)}
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

      {/* --------------------------------------------------------- Modal */}
      <Modal
        open={modalOpen}
        title={form.id ? 'Editar entrada' : 'Nueva entrada'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button className="button button--ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button className="button button--primary" type="submit" form="passportForm" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar entrada'}
            </button>
          </>
        }
      >
        <form id="passportForm" onSubmit={handleSave}>
          {formError && <div className="status status--error">{formError}</div>}

          <div className="form-field">
            <label htmlFor="ppType">Tipo</label>
            <select
              id="ppType"
              className="input"
              value={form.entryType}
              onChange={(event) => setForm((prev) => ({ ...prev, entryType: event.target.value }))}
            >
              {Object.entries(ENTRY_TYPES).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="ppTitle">Titulo</label>
            <input
              id="ppTitle"
              className="input"
              value={form.title}
              maxLength={200}
              data-autofocus
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>

          <div className="form-field">
            <label htmlFor="ppDescription">Descripcion (opcional)</label>
            <textarea
              id="ppDescription"
              className="input"
              rows={3}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>

          <div className="form__row">
            <div className="form-field">
              <label htmlFor="ppCategory">Categoria (opcional)</label>
              <input
                id="ppCategory"
                className="input"
                value={form.category}
                maxLength={120}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              />
            </div>
            <div className="form-field">
              <label htmlFor="ppLevel">Nivel (opcional)</label>
              <input
                id="ppLevel"
                className="input"
                value={form.level}
                maxLength={60}
                placeholder="Ej. Basico, Intermedio, Avanzado"
                onChange={(event) => setForm((prev) => ({ ...prev, level: event.target.value }))}
              />
            </div>
          </div>

          <div className="form__row">
            <div className="form-field">
              <label htmlFor="ppLink">Enlace (opcional)</label>
              <input
                id="ppLink"
                className="input"
                value={form.link}
                maxLength={500}
                placeholder="https://..."
                onChange={(event) => setForm((prev) => ({ ...prev, link: event.target.value }))}
              />
            </div>
            <div className="form-field">
              <label htmlFor="ppDate">Fecha (opcional)</label>
              <input
                id="ppDate"
                type="date"
                className="input"
                value={form.dateCompleted}
                onChange={(event) => setForm((prev) => ({ ...prev, dateCompleted: event.target.value }))}
              />
            </div>
          </div>
        </form>
      </Modal>
    </section>
  );
}
