import { useState, useEffect, useCallback } from 'react';

import Portal from '../components/atoms/Portal.jsx';
import {
  listErrors,
  getErrorStats,
  createError,
  updateError,
  updateErrorStatus,
  deleteError,
} from '../services/errorJournal.js';
import { getSubjects, getTopics } from '../services/subject.js';

const ERROR_TYPES = [
  { id: 'conceptual', label: 'Conceptuales', badgeClass: 'badge--conceptual', desc: 'Fallas en la comprensión de conceptos teóricos o definiciones' },
  { id: 'procedural', label: 'Procedimentales', badgeClass: 'badge--procedural', desc: 'Fallos en los pasos del método, algoritmo o secuencia' },
  { id: 'calculation', label: 'Cálculo', badgeClass: 'badge--calculation', desc: 'Errores aritméticos, signos o álgebra básica' },
  { id: 'interpretation', label: 'Interpretación', badgeClass: 'badge--interpretation', desc: 'Lectura errónea del enunciado, variables o unidades' },
  { id: 'memory', label: 'Memoria', badgeClass: 'badge--memory', desc: 'Olvido de fórmulas, propiedades o reglas específicas' },
];

const STATUS_OPTIONS = [
  { id: 'pending', label: 'Pendiente', pillClass: 'status-pill--pending', icon: '⏳' },
  { id: 'in_review', label: 'En revisión', pillClass: 'status-pill--in_review', icon: '🔍' },
  { id: 'understood', label: 'Comprendido', pillClass: 'status-pill--understood', icon: '✓' },
];

/**
 * STUDIA - Error Journal (Diario Inteligente de Errores)
 * ------------------------------------------------------------------
 * Núcleo del aprendizaje a partir de errores:
 * Permite registrar, clasificar, buscar, filtrar, editar y comprender fallos
 * cometidos en ejercicios de estudio.
 */
export default function ErrorJournal() {
  const [errors, setErrors] = useState([]);
  const [stats, setStats] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [modalTopics, setModalTopics] = useState([]);

  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Estados de carga y feedback
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modal de Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingError, setEditingError] = useState(null); // null = nuevo registro
  const [formData, setFormData] = useState({
    subjectId: '',
    topicId: '',
    exerciseTitle: '',
    userAnswer: '',
    correctAnswer: '',
    explanation: '',
    errorType: 'conceptual',
    errorDate: new Date().toISOString().slice(0, 10),
    status: 'pending',
  });

  // Modal de confirmación de eliminación
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  // -------------------------------------------------------------------------
  // Carga de datos
  // -------------------------------------------------------------------------
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [subs, statsData] = await Promise.all([
        getSubjects(),
        getErrorStats().catch(() => null),
      ]);
      setSubjects(subs);
      setStats(statsData || null);
    } catch (err) {
      setErrorMessage(err.message || 'Error cargando datos iniciales.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchErrors = useCallback(async () => {
    try {
      const params = {};
      if (filterSubject) params.subjectId = filterSubject;
      if (filterType) params.errorType = filterType;
      if (filterStatus) params.status = filterStatus;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const data = await listErrors(params);
      setErrors(data.errors || []);

      // Actualizar estadísticas sincronizadas
      const statsData = await getErrorStats().catch(() => null);
      if (statsData) setStats(statsData);
    } catch (err) {
      setErrorMessage(err.message || 'Error al obtener el listado de errores.');
    }
  }, [filterSubject, filterType, filterStatus, searchTerm]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  // Carga de temas dinámicos para el formulario modal
  const loadModalTopics = async (subjectId) => {
    if (!subjectId) {
      setModalTopics([]);
      setFormData((prev) => ({ ...prev, topicId: '' }));
      return;
    }
    try {
      const topicsList = await getTopics(subjectId);
      setModalTopics(topicsList);
    } catch {
      setModalTopics([]);
    }
  };

  // -------------------------------------------------------------------------
  // Manejo de Formulario y Modales
  // -------------------------------------------------------------------------
  const handleOpenCreateModal = () => {
    setEditingError(null);
    setFormData({
      subjectId: '',
      topicId: '',
      exerciseTitle: '',
      userAnswer: '',
      correctAnswer: '',
      explanation: '',
      errorType: 'conceptual',
      errorDate: new Date().toISOString().slice(0, 10),
      status: 'pending',
    });
    setModalTopics([]);
    setIsModalOpen(true);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleOpenEditModal = async (errorItem) => {
    setEditingError(errorItem);
    const subId = errorItem.subjectId ? String(errorItem.subjectId) : '';
    setFormData({
      subjectId: subId,
      topicId: errorItem.topicId ? String(errorItem.topicId) : '',
      exerciseTitle: errorItem.exerciseTitle || errorItem.title || '',
      userAnswer: errorItem.userAnswer || '',
      correctAnswer: errorItem.correctAnswer || '',
      explanation: errorItem.explanation || errorItem.description || '',
      errorType: errorItem.errorType || 'conceptual',
      errorDate: errorItem.errorDate ? errorItem.errorDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      status: errorItem.status || 'pending',
    });

    if (subId) {
      await loadModalTopics(subId);
    } else {
      setModalTopics([]);
    }
    setIsModalOpen(true);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleModalSubjectChange = async (e) => {
    const subId = e.target.value;
    setFormData((prev) => ({ ...prev, subjectId: subId, topicId: '' }));
    await loadModalTopics(subId);
  };

  const handleSaveError = async (e) => {
    e.preventDefault();
    if (!formData.exerciseTitle.trim()) {
      setErrorMessage('Por favor ingresa el nombre o enunciado del ejercicio.');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    try {
      const payload = {
        exerciseTitle: formData.exerciseTitle.trim(),
        subjectId: formData.subjectId ? Number(formData.subjectId) : null,
        topicId: formData.topicId ? Number(formData.topicId) : null,
        userAnswer: formData.userAnswer.trim(),
        correctAnswer: formData.correctAnswer.trim(),
        explanation: formData.explanation.trim(),
        errorType: formData.errorType,
        errorDate: formData.errorDate,
        status: formData.status,
      };

      if (editingError) {
        await updateError(editingError.id, payload);
        setSuccessMessage('Error actualizado correctamente.');
      } else {
        await createError(payload);
        setSuccessMessage('Error registrado exitosamente en el diario.');
      }

      setIsModalOpen(false);
      await fetchErrors();
    } catch (err) {
      setErrorMessage(err.message || 'Ocurrió un error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  // Cambio rápido de estado de revisión (Pendiente -> En revisión -> Comprendido)
  const handleToggleStatus = async (errorItem, nextStatus) => {
    try {
      await updateErrorStatus(errorItem.id, nextStatus);
      setErrors((prev) =>
        prev.map((err) => (err.id === errorItem.id ? { ...err, status: nextStatus } : err))
      );
      const updatedStats = await getErrorStats().catch(() => null);
      if (updatedStats) setStats(updatedStats);
    } catch (err) {
      setErrorMessage(err.message || 'No se pudo actualizar el estado.');
    }
  };

  // Eliminación de error
  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    setSaving(true);
    try {
      await deleteError(deleteCandidate.id);
      setDeleteCandidate(null);
      setSuccessMessage('Error eliminado del diario.');
      await fetchErrors();
    } catch (err) {
      setErrorMessage(err.message || 'No se pudo eliminar el error.');
    } finally {
      setSaving(false);
    }
  };

  const getTypeObj = (typeId) => {
    return ERROR_TYPES.find((t) => t.id === typeId) || ERROR_TYPES[0];
  };

  const getStatusObj = (statusId) => {
    return STATUS_OPTIONS.find((s) => s.id === statusId) || STATUS_OPTIONS[0];
  };

  return (
    <section className="page">
      {/* ---------------------------------------------------------------------
          CABECERA Y ACCIONES
          --------------------------------------------------------------------- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 className="page__title">Error Journal — Diario de Errores</h2>
          <p className="page__text">
            Transforma cada fallo en aprendizaje duradero. Registra, clasifica y comprende tus errores.
          </p>
        </div>
        <button
          type="button"
          className="button button--primary"
          onClick={handleOpenCreateModal}
        >
          + Registrar nuevo error
        </button>
      </div>

      {errorMessage && (
        <div className="status status--error" role="alert" style={{ marginBottom: '1rem' }}>
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="status status--success" role="status" style={{ marginBottom: '1rem' }}>
          {successMessage}
        </div>
      )}

      {/* ---------------------------------------------------------------------
          TARJETAS DE MÉTRICAS Y ESTADOS DE REVISIÓN
          --------------------------------------------------------------------- */}
      {stats && (
        <div className="grid grid--4" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600 }}>TOTAL ERRORES</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-heading)', marginTop: '0.2rem' }}>
              {stats.total}
            </div>
            <span className="hint">En tu historial</span>
          </div>

          <div
            className="card"
            style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', border: filterStatus === 'pending' ? '2px solid #f59e0b' : '1px solid var(--color-border)' }}
            onClick={() => setFilterStatus(filterStatus === 'pending' ? '' : 'pending')}
            title="Filtrar por errores pendientes"
          >
            <span style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600 }}>⏳ PENDIENTES</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#b45309', marginTop: '0.2rem' }}>
              {stats.pending}
            </div>
            <span className="hint">Requieren estudio</span>
          </div>

          <div
            className="card"
            style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', border: filterStatus === 'in_review' ? '2px solid #2563eb' : '1px solid var(--color-border)' }}
            onClick={() => setFilterStatus(filterStatus === 'in_review' ? '' : 'in_review')}
            title="Filtrar por errores en revisión"
          >
            <span style={{ fontSize: '0.8rem', color: '#1d4ed8', fontWeight: 600 }}>🔍 EN REVISIÓN</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1d4ed8', marginTop: '0.2rem' }}>
              {stats.inReview}
            </div>
            <span className="hint">En proceso activo</span>
          </div>

          <div
            className="card"
            style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', border: filterStatus === 'understood' ? '2px solid #16a34a' : '1px solid var(--color-border)' }}
            onClick={() => setFilterStatus(filterStatus === 'understood' ? '' : 'understood')}
            title="Filtrar por errores comprendidos"
          >
            <span style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>✓ COMPRENDIDOS</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#047857', marginTop: '0.2rem' }}>
              {stats.understood}
            </div>
            <span className="hint">Lección dominada</span>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------
          BARRA DE BÚSQUEDA Y FILTROS
          --------------------------------------------------------------------- */}
      <div className="filter-bar">
        <div className="filter-bar__search">
          <input
            type="search"
            className="input"
            placeholder="🔍 Buscar por ejercicio, tema, respuesta, explicación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ minWidth: '180px' }}>
          <select
            className="input"
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
          >
            <option value="">Todas las materias</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: '170px' }}>
          <select
            className="input"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            {ERROR_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: '160px' }}>
          <select
            className="input"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Todos los estados</option>
            {STATUS_OPTIONS.map((st) => (
              <option key={st.id} value={st.id}>
                {st.label}
              </option>
            ))}
          </select>
        </div>

        {(searchTerm || filterSubject || filterType || filterStatus) && (
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={() => {
              setSearchTerm('');
              setFilterSubject('');
              setFilterType('');
              setFilterStatus('');
            }}
          >
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* ---------------------------------------------------------------------
          LISTADO DE ERRORES REGISTRADOS
          --------------------------------------------------------------------- */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p className="hint">Cargando diario de errores...</p>
        </div>
      ) : errors.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--slate-700)' }}>
            No se encontraron errores registrados
          </p>
          <p className="hint" style={{ maxWidth: '450px', margin: '0.5rem auto 1.5rem' }}>
            {searchTerm || filterSubject || filterType || filterStatus
              ? 'No hay registros que coincidan con los filtros aplicados.'
              : 'El diario de errores está limpio. Cuando cometas un error en una práctica o examen, regístralo aquí para analizarlo y no volver a repetirlo.'}
          </p>
          <button
            type="button"
            className="button button--primary"
            onClick={handleOpenCreateModal}
          >
            + Registrar mi primer error
          </button>
        </div>
      ) : (
        <div className="error-list">
          {errors.map((item) => {
            const typeInfo = getTypeObj(item.errorType);
            const statusInfo = getStatusObj(item.status);

            return (
              <article key={item.id} className="error-card">
                <div className="error-card__header">
                  <div>
                    <h3 className="error-card__title">
                      {item.exerciseTitle || item.title || 'Ejercicio sin título'}
                    </h3>
                    <div className="error-card__tags">
                      {item.subjectName && (
                        <span
                          className="badge"
                          style={{
                            backgroundColor: item.subjectColor ? `${item.subjectColor}20` : 'var(--lav-100)',
                            color: item.subjectColor || 'var(--lav-700)',
                            borderColor: item.subjectColor || 'transparent',
                          }}
                        >
                          {item.subjectName}
                        </span>
                      )}
                      {item.topicName && (
                        <span className="badge badge--neutral">
                          Tema: {item.topicName}
                        </span>
                      )}
                      <span className={`badge ${typeInfo.badgeClass}`}>
                        {typeInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Selector rápido de estado de revisión */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600 }}>Estado:</span>
                    <select
                      className={`status-pill ${statusInfo.pillClass}`}
                      value={item.status}
                      onChange={(e) => handleToggleStatus(item, e.target.value)}
                      title="Cambiar estado de revisión"
                    >
                      <option value="pending">⏳ Pendiente</option>
                      <option value="in_review">🔍 En revisión</option>
                      <option value="understood">✓ Comprendido</option>
                    </select>
                  </div>
                </div>

                {/* Contenido: Respuestas y Explicación */}
                <div className="error-card__body">
                  <div className="error-box error-box--provided">
                    <span className="error-box__label">Respuesta proporcionada</span>
                    <div className="error-box__content">
                      {item.userAnswer || <span className="hint">No especificada</span>}
                    </div>
                  </div>

                  <div className="error-box error-box--correct">
                    <span className="error-box__label">Respuesta correcta</span>
                    <div className="error-box__content">
                      {item.correctAnswer || <span className="hint">No especificada</span>}
                    </div>
                  </div>

                  <div className="error-box error-box--explanation" style={{ gridColumn: '1 / -1' }}>
                    <span className="error-box__label">Explicación y aprendizaje</span>
                    <div className="error-box__content">
                      {item.explanation || item.description || <span className="hint">Sin explicación detallada</span>}
                    </div>
                  </div>
                </div>

                {/* Pie de la tarjeta */}
                <div className="error-card__footer">
                  <div>
                    <span>Fecha: <strong>{item.errorDate ? new Date(item.errorDate).toLocaleDateString() : new Date(item.createdAt).toLocaleDateString()}</strong></span>
                    {item.reviewCount > 0 && (
                      <span style={{ marginLeft: '1rem' }}>
                        Revisiones: <strong>{item.reviewCount}</strong>
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      onClick={() => handleOpenEditModal(item)}
                    >
                      ✎ Editar
                    </button>
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      style={{ color: 'var(--color-danger)' }}
                      onClick={() => setDeleteCandidate(item)}
                    >
                      🗑 Eliminar
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ---------------------------------------------------------------------
          MODAL CREAR / EDITAR ERROR
          --------------------------------------------------------------------- */}
      {isModalOpen && (
        <Portal>
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-dialog__header">
              <h3 style={{ margin: 0 }}>
                {editingError ? 'Editar registro de error' : 'Registrar error en el diario'}
              </h3>
              <button
                type="button"
                className="modal-dialog__close"
                onClick={() => setIsModalOpen(false)}
                aria-label="Cerrar modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveError}>
              <div className="grid grid--2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="errSubject">Materia</label>
                  <select
                    id="errSubject"
                    className="input"
                    value={formData.subjectId}
                    onChange={handleModalSubjectChange}
                  >
                    <option value="">-- Seleccionar materia (Opcional) --</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="errTopic">Tema</label>
                  <select
                    id="errTopic"
                    className="input"
                    value={formData.topicId}
                    onChange={(e) => setFormData({ ...formData, topicId: e.target.value })}
                    disabled={!formData.subjectId}
                  >
                    <option value="">
                      {formData.subjectId ? '-- Seleccionar tema (Opcional) --' : '-- Elige primero una materia --'}
                    </option>
                    {modalTopics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid--2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="errExercise">
                    Ejercicio o pregunta <strong style={{ color: 'var(--color-danger)' }}>*</strong>
                  </label>
                  <input
                    id="errExercise"
                    type="text"
                    className="input"
                    placeholder="Ej. Problema 5 - Ecuaciones diferenciales"
                    value={formData.exerciseTitle}
                    onChange={(e) => setFormData({ ...formData, exerciseTitle: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="errDate">Fecha del error</label>
                  <input
                    id="errDate"
                    type="date"
                    className="input"
                    value={formData.errorDate}
                    onChange={(e) => setFormData({ ...formData, errorDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid--2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="errType">Clasificación del tipo de error</label>
                  <select
                    id="errType"
                    className="input"
                    value={formData.errorType}
                    onChange={(e) => setFormData({ ...formData, errorType: e.target.value })}
                  >
                    {ERROR_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label} — {t.desc}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="errStatus">Estado de revisión</label>
                  <select
                    id="errStatus"
                    className="input"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="pending">⏳ Pendiente (Por revisar)</option>
                    <option value="in_review">🔍 En revisión (Practicando)</option>
                    <option value="understood">✓ Comprendido (Lección dominada)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid--2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="errUserAnswer">Respuesta proporcionada</label>
                  <textarea
                    id="errUserAnswer"
                    className="input"
                    rows={3}
                    placeholder="Lo que respondiste o el resultado erróneo..."
                    value={formData.userAnswer}
                    onChange={(e) => setFormData({ ...formData, userAnswer: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="errCorrectAnswer">Respuesta correcta</label>
                  <textarea
                    id="errCorrectAnswer"
                    className="input"
                    rows={3}
                    placeholder="La respuesta o valor correcto esperado..."
                    value={formData.correctAnswer}
                    onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="errExplanation">
                  Explicación (¿Por qué ocurrió el error y cómo resolverlo?)
                </label>
                <textarea
                  id="errExplanation"
                  className="input"
                  rows={4}
                  placeholder="Explica la causa raíz del error, la regla o propiedad olvidada y el razonamiento para llegar a la solución correcta."
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="button button--primary"
                  disabled={saving}
                >
                  {saving ? 'Guardando...' : editingError ? 'Actualizar error' : 'Guardar error en el diario'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </Portal>
      )}

      {/* ---------------------------------------------------------------------
          MODAL DE CONFIRMACIÓN DE ELIMINACIÓN
          --------------------------------------------------------------------- */}
      {deleteCandidate && (
        <Portal>
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-dialog" style={{ maxWidth: '420px', textAlign: 'center' }}>
            <h3 style={{ marginTop: 0 }}>¿Eliminar este error?</h3>
            <p className="hint">
              Esta acción no se puede deshacer. Se eliminará el registro de{' '}
              <strong>&ldquo;{deleteCandidate.exerciseTitle || deleteCandidate.title}&rdquo;</strong> de tu diario.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => setDeleteCandidate(null)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="button button--primary"
                style={{ backgroundColor: 'var(--color-danger)' }}
                onClick={handleConfirmDelete}
                disabled={saving}
              >
                {saving ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}
    </section>
  );
}
