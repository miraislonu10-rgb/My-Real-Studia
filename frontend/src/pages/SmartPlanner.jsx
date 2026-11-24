import { useState, useEffect, useCallback } from 'react';

import Portal from '../components/atoms/Portal.jsx';
import {
  listTasks,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getCalendarTasks,
  getGoals,
  getRescheduleRecommendations,
  applyRescheduleRecommendation,
} from '../services/planner.js';
import { getSubjects, getTopics } from '../services/subject.js';

const PRIORITIES = [
  { id: 'low', label: 'Baja', badgeClass: 'badge--low' },
  { id: 'medium', label: 'Media', badgeClass: 'badge--medium' },
  { id: 'high', label: 'Alta', badgeClass: 'badge--high' },
  { id: 'urgent', label: 'Urgente', badgeClass: 'badge--urgent' },
];

/**
 * STUDIA - Smart Planner (Organizador Académico Inteligente)
 * ------------------------------------------------------------------
 * - Gestión completa de tareas, prioridades y fechas de entrega.
 * - Objetivos diarios y semanales.
 * - Calendario académico visual e interactivo.
 * - Registro y consulta de actividades pendientes y completadas.
 * - Sistema inteligente de reorganización de tareas atrasadas
 *   que respeta la disponibilidad del estudiante y evita horarios ocupados.
 */
export default function SmartPlanner() {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'completed' | 'goals' | 'calendar' | 'reschedule'

  // Datos
  const [pendingTasks, setPendingTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [goals, setGoals] = useState({ daily: [], weekly: [], dailyCompleted: 0, dailyTotal: 0, weeklyCompleted: 0, weeklyTotal: 0 });
  const [recommendations, setRecommendations] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [modalTopics, setModalTopics] = useState([]);

  // Calendario
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // Estados de carga y feedback
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modal Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subjectId: '',
    topicId: '',
    priority: 'medium',
    dueDate: '',
    scheduledDate: '',
    scheduledStartTime: '',
    scheduledEndTime: '',
    goalPeriod: 'none',
    estimatedMinutes: 45,
  });

  // Modal Eliminar
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  // -------------------------------------------------------------------------
  // 1. Carga de datos
  // -------------------------------------------------------------------------
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [subs, pendData, compData, goalsData, recData] = await Promise.all([
        getSubjects(),
        listTasks({ status: 'pending', limit: 100 }),
        listTasks({ status: 'completed', limit: 100 }),
        getGoals().catch(() => ({ daily: [], weekly: [], dailyCompleted: 0, dailyTotal: 0, weeklyCompleted: 0, weeklyTotal: 0 })),
        getRescheduleRecommendations().catch(() => []),
      ]);

      setSubjects(subs);
      setPendingTasks(pendData.tasks || []);
      setCompletedTasks(compData.tasks || []);
      setGoals(goalsData);
      setRecommendations(recData);
    } catch (err) {
      setErrorMessage(err.message || 'Error cargando datos del organizador.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga eventos del calendario para el mes seleccionado
  const loadCalendarMonth = useCallback(async (year, month) => {
    try {
      const firstDay = new Date(Date.UTC(year, month, 1));
      const lastDay = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
      const fromStr = firstDay.toISOString();
      const toStr = lastDay.toISOString();

      const events = await getCalendarTasks(fromStr, toStr);
      setCalendarEvents(events);
    } catch (err) {
      console.warn('Error cargando calendario:', err.message);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (activeTab === 'calendar') {
      loadCalendarMonth(calendarYear, calendarMonth);
    }
  }, [activeTab, calendarYear, calendarMonth, loadCalendarMonth]);

  // Carga temas dinámicos según materia
  const loadModalTopics = async (subjectId) => {
    if (!subjectId) {
      setModalTopics([]);
      setFormData((prev) => ({ ...prev, topicId: '' }));
      return;
    }
    try {
      const list = await getTopics(subjectId);
      setModalTopics(list);
    } catch {
      setModalTopics([]);
    }
  };

  // -------------------------------------------------------------------------
  // 2. Acciones sobre tareas
  // -------------------------------------------------------------------------
  const handleOpenCreateModal = (period = 'none') => {
    setEditingTask(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDue = tomorrow.toISOString().slice(0, 16);

    setFormData({
      title: '',
      description: '',
      subjectId: '',
      topicId: '',
      priority: 'medium',
      dueDate: defaultDue,
      scheduledDate: new Date().toISOString().slice(0, 10),
      scheduledStartTime: '15:00',
      scheduledEndTime: '16:00',
      goalPeriod: period,
      estimatedMinutes: 45,
    });
    setModalTopics([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (task) => {
    setEditingTask(task);
    const subId = task.subjectId ? String(task.subjectId) : '';
    setFormData({
      title: task.title || '',
      description: task.description || '',
      subjectId: subId,
      topicId: task.topicId ? String(task.topicId) : '',
      priority: task.priority || 'medium',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '',
      scheduledDate: task.scheduledDate ? task.scheduledDate.slice(0, 10) : '',
      scheduledStartTime: task.scheduledStartTime ? String(task.scheduledStartTime).slice(0, 5) : '',
      scheduledEndTime: task.scheduledEndTime ? String(task.scheduledEndTime).slice(0, 5) : '',
      goalPeriod: task.goalPeriod || 'none',
      estimatedMinutes: task.estimatedMinutes || 45,
    });

    if (subId) {
      await loadModalTopics(subId);
    } else {
      setModalTopics([]);
    }
    setIsModalOpen(true);
  };

  const handleModalSubjectChange = async (e) => {
    const subId = e.target.value;
    setFormData((prev) => ({ ...prev, subjectId: subId, topicId: '' }));
    await loadModalTopics(subId);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setErrorMessage('El título de la tarea u objetivo es obligatorio.');
      return;
    }

    setActionLoading(true);
    setErrorMessage('');
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        subjectId: formData.subjectId ? Number(formData.subjectId) : null,
        topicId: formData.topicId ? Number(formData.topicId) : null,
        priority: formData.priority,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
        scheduledDate: formData.scheduledDate || null,
        scheduledStartTime: formData.scheduledStartTime || null,
        scheduledEndTime: formData.scheduledEndTime || null,
        goalPeriod: formData.goalPeriod,
        estimatedMinutes: Number(formData.estimatedMinutes) || 45,
      };

      if (editingTask) {
        await updateTask(editingTask.id, payload);
        setSuccessMessage('Tarea actualizada correctamente.');
      } else {
        await createTask(payload);
        setSuccessMessage('Tarea guardada exitosamente en MySQL.');
      }

      setIsModalOpen(false);
      await loadInitialData();
    } catch (err) {
      setErrorMessage(err.message || 'Error al guardar la tarea.');
    } finally {
      setActionLoading(false);
    }
  };

  // Marcar como completada o pendiente con un solo clic
  const handleToggleTaskStatus = async (task) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await updateTaskStatus(task.id, nextStatus);
      await loadInitialData();
      setSuccessMessage(
        nextStatus === 'completed' ? '¡Actividad marcada como completada!' : 'Actividad movida a pendientes.'
      );
    } catch (err) {
      setErrorMessage(err.message || 'No se pudo actualizar el estado.');
    }
  };

  // Eliminar tarea
  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    setActionLoading(true);
    try {
      await deleteTask(deleteCandidate.id);
      setDeleteCandidate(null);
      setSuccessMessage('Tarea eliminada.');
      await loadInitialData();
    } catch (err) {
      setErrorMessage(err.message || 'No se pudo eliminar la tarea.');
    } finally {
      setActionLoading(false);
    }
  };

  // Aplicar recomendación de reorganización
  const handleApplyRecommendation = async (rec) => {
    setActionLoading(true);
    setErrorMessage('');
    try {
      await applyRescheduleRecommendation({
        taskId: rec.taskId,
        suggestedDate: rec.suggestedDate,
        suggestedStartTime: rec.suggestedStartTime,
        suggestedEndTime: rec.suggestedEndTime,
        suggestedDueDateTime: rec.suggestedDueDateTime,
      });

      setSuccessMessage(`¡Tarea "${rec.title}" reorganizada con éxito para el ${rec.suggestedDate} de ${rec.suggestedStartTime} a ${rec.suggestedEndTime}!`);
      await loadInitialData();
    } catch (err) {
      setErrorMessage(err.message || 'No se pudo aplicar la reorganización.');
    } finally {
      setActionLoading(false);
    }
  };

  // Formato de fecha
  const formatDate = (isoString) => {
    if (!isoString) return 'Sin fecha';
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Render del Calendario
  const renderCalendar = () => {
    const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay(); // 0 = Domingo
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const cells = [];
    // Celdas vacías previas al día 1
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="calendar-cell" style={{ background: 'var(--warm-50)' }} />);
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;

      // Eventos del día
      const dayTasks = calendarEvents.filter((ev) => {
        const evScheduled = ev.scheduledDate ? String(ev.scheduledDate).slice(0, 10) : null;
        const evDue = ev.dueDate ? new Date(ev.dueDate).toISOString().slice(0, 10) : null;
        return evScheduled === dateStr || evDue === dateStr;
      });

      cells.push(
        <div key={`day-${day}`} className={`calendar-cell ${isToday ? 'calendar-cell--today' : ''}`}>
          <span className="calendar-day-number">{day}</span>
          <div>
            {dayTasks.map((t) => (
              <span
                key={t.id}
                className="calendar-event"
                style={{
                  backgroundColor: t.subjectColor ? `${t.subjectColor}20` : 'var(--lav-100)',
                  color: t.subjectColor || 'var(--lav-700)',
                  borderLeftColor: t.subjectColor || 'var(--color-primary)',
                  textDecoration: t.status === 'completed' ? 'line-through' : 'none',
                }}
                onClick={() => handleOpenEditModal(t)}
                title={`${t.title} (${t.priority})`}
              >
                {t.scheduledStartTime ? `${String(t.scheduledStartTime).slice(0, 5)} ` : ''}
                {t.title}
              </span>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="calendar-view">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0 }}>
            {monthNames[calendarMonth]} {calendarYear}
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => {
                if (calendarMonth === 0) {
                  setCalendarMonth(11);
                  setCalendarYear((y) => y - 1);
                } else {
                  setCalendarMonth((m) => m - 1);
                }
              }}
            >
              ◀ Mes anterior
            </button>
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => {
                const now = new Date();
                setCalendarMonth(now.getMonth());
                setCalendarYear(now.getFullYear());
              }}
            >
              Hoy
            </button>
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => {
                if (calendarMonth === 11) {
                  setCalendarMonth(0);
                  setCalendarYear((y) => y + 1);
                } else {
                  setCalendarMonth((m) => m + 1);
                }
              }}
            >
              Mes siguiente ▶
            </button>
          </div>
        </div>

        <div className="calendar-grid">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
            <div key={d} className="calendar-header-day">
              {d}
            </div>
          ))}
          {cells}
        </div>
      </div>
    );
  };

  return (
    <section className="page">
      {/* ---------------------------------------------------------------------
          CABECERA
          --------------------------------------------------------------------- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 className="page__title">Smart Planner — Organizador Académico</h2>
          <p className="page__text">
            Planifica tus tareas, fechas de entrega, objetivos y reorganiza actividades no completadas sin conflictos de horario.
          </p>
        </div>
        <button
          type="button"
          className="button button--primary"
          onClick={() => handleOpenCreateModal('none')}
        >
          + Nueva tarea / objetivo
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
          ALERT DE RECOMENDACIONES DISPONIBLES
          --------------------------------------------------------------------- */}
      {recommendations.length > 0 && activeTab !== 'reschedule' && (
        <div
          style={{
            background: '#fef3c7',
            border: '1.5px solid #fde047',
            borderRadius: 'var(--radius)',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <strong style={{ color: '#854d0e' }}>
              💡 Tienes {recommendations.length} tarea(s) atrasada(s) pendientes de reorganizar
            </strong>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.88rem', color: '#713f12' }}>
              El planificador detectó espacios libres en tu disponibilidad para reprogramarlas sin chocar con tus horarios ocupados.
            </p>
          </div>
          <button
            type="button"
            className="button button--primary button--small"
            style={{ backgroundColor: '#b45309', borderColor: '#b45309' }}
            onClick={() => setActiveTab('reschedule')}
          >
            Ver recomendaciones de reorganización
          </button>
        </div>
      )}

      {/* ---------------------------------------------------------------------
          PESTAÑAS DE NAVEGACIÓN
          --------------------------------------------------------------------- */}
      <nav className="tab-nav" aria-label="Secciones del organizador">
        <button
          type="button"
          className={`tab-nav__item ${activeTab === 'pending' ? 'tab-nav__item--active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pendientes ({pendingTasks.length})
        </button>
        <button
          type="button"
          className={`tab-nav__item ${activeTab === 'completed' ? 'tab-nav__item--active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completadas ({completedTasks.length})
        </button>
        <button
          type="button"
          className={`tab-nav__item ${activeTab === 'goals' ? 'tab-nav__item--active' : ''}`}
          onClick={() => setActiveTab('goals')}
        >
          Objetivos Diarios y Semanales
        </button>
        <button
          type="button"
          className={`tab-nav__item ${activeTab === 'calendar' ? 'tab-nav__item--active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          Calendario Académico
        </button>
        <button
          type="button"
          className={`tab-nav__item ${activeTab === 'reschedule' ? 'tab-nav__item--active' : ''}`}
          onClick={() => setActiveTab('reschedule')}
        >
          Reorganizar Atrasadas {recommendations.length > 0 && `(${recommendations.length})`}
        </button>
      </nav>

      {/* ---------------------------------------------------------------------
          CONTENIDO SEGÚN PESTAÑA
          --------------------------------------------------------------------- */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p className="hint">Cargando Smart Planner...</p>
        </div>
      ) : (
        <>
          {/* PESTAÑA 1: PENDIENTES */}
          {activeTab === 'pending' && (
            <div>
              {pendingTasks.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-heading)' }}>
                    ¡Todo al día! No tienes actividades pendientes.
                  </p>
                  <p className="hint">Crea una nueva tarea u objetivo para seguir organizando tu aprendizaje.</p>
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={() => handleOpenCreateModal('none')}
                  >
                    + Crear tarea
                  </button>
                </div>
              ) : (
                pendingTasks.map((task) => (
                  <article key={task.id} className="task-item">
                    <input
                      type="checkbox"
                      className="task-item__checkbox"
                      checked={task.status === 'completed'}
                      onChange={() => handleToggleTaskStatus(task)}
                      title="Marcar como completada"
                    />
                    <div className="task-item__content">
                      <h4 className="task-item__title">{task.title}</h4>
                      <div className="task-item__meta">
                        {task.subjectName && (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: task.subjectColor ? `${task.subjectColor}20` : 'var(--lav-100)',
                              color: task.subjectColor || 'var(--lav-700)',
                            }}
                          >
                            {task.subjectName}
                          </span>
                        )}
                        {task.topicName && <span className="hint">Tema: {task.topicName}</span>}
                        <span className={`badge badge--${task.priority}`}>
                          {task.priority === 'urgent'
                            ? 'Urgente'
                            : task.priority === 'high'
                            ? 'Alta'
                            : task.priority === 'medium'
                            ? 'Media'
                            : 'Baja'}
                        </span>
                        {task.dueDate && (
                          <span style={{ color: new Date(task.dueDate) < new Date() ? 'var(--color-danger)' : 'inherit' }}>
                            📅 Entrega: {formatDate(task.dueDate)}
                          </span>
                        )}
                        {task.scheduledDate && (
                          <span className="badge badge--neutral">
                            ⏱ Programada: {task.scheduledDate.slice(0, 10)}{' '}
                            {task.scheduledStartTime ? `(${String(task.scheduledStartTime).slice(0, 5)})` : ''}
                          </span>
                        )}
                        {task.goalPeriod !== 'none' && (
                          <span className="badge badge--neutral" style={{ fontWeight: 600 }}>
                            🎯 {task.goalPeriod === 'daily' ? 'Objetivo Diario' : 'Objetivo Semanal'}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p style={{ margin: '0.4rem 0 0', fontSize: '0.88rem', color: 'var(--slate-600)' }}>
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="button button--ghost button--small"
                        onClick={() => handleOpenEditModal(task)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="button button--ghost button--small"
                        style={{ color: 'var(--color-danger)' }}
                        onClick={() => setDeleteCandidate(task)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}

          {/* PESTAÑA 2: COMPLETADAS */}
          {activeTab === 'completed' && (
            <div>
              {completedTasks.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                  <p className="hint">Aún no has completado actividades. ¡Marca tus tareas al concluirlas!</p>
                </div>
              ) : (
                completedTasks.map((task) => (
                  <article key={task.id} className="task-item task-item--completed">
                    <input
                      type="checkbox"
                      className="task-item__checkbox"
                      checked={true}
                      onChange={() => handleToggleTaskStatus(task)}
                      title="Desmarcar actividad"
                    />
                    <div className="task-item__content">
                      <h4 className="task-item__title">{task.title}</h4>
                      <div className="task-item__meta">
                        {task.subjectName && <span className="badge badge--neutral">{task.subjectName}</span>}
                        <span style={{ color: 'var(--green-600)', fontWeight: 600 }}>
                          ✓ Completada: {formatDate(task.completedAt)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      style={{ color: 'var(--color-danger)' }}
                      onClick={() => setDeleteCandidate(task)}
                    >
                      Eliminar
                    </button>
                  </article>
                ))
              )}
            </div>
          )}

          {/* PESTAÑA 3: OBJETIVOS DIARIOS Y SEMANALES */}
          {activeTab === 'goals' && (
            <div>
              <div className="grid grid--2" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Objetivos Diarios */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ margin: 0 }}>Objetivos Diarios</h3>
                      <span className="hint">
                        {goals.dailyCompleted} de {goals.dailyTotal} cumplidos hoy
                      </span>
                    </div>
                    <button
                      type="button"
                      className="button button--secondary button--small"
                      onClick={() => handleOpenCreateModal('daily')}
                    >
                      + Añadir objetivo diario
                    </button>
                  </div>

                  <div className="dimension-bar" style={{ marginBottom: '1.25rem' }}>
                    <div
                      className="dimension-fill"
                      style={{
                        width: `${goals.dailyTotal > 0 ? (goals.dailyCompleted / goals.dailyTotal) * 100 : 0}%`,
                        background: 'var(--green-500)',
                      }}
                    />
                  </div>

                  {goals.daily.length === 0 ? (
                    <p className="hint">No has definido objetivos para hoy.</p>
                  ) : (
                    goals.daily.map((g) => (
                      <div key={g.id} className={`task-item ${g.status === 'completed' ? 'task-item--completed' : ''}`}>
                        <input
                          type="checkbox"
                          className="task-item__checkbox"
                          checked={g.status === 'completed'}
                          onChange={() => handleToggleTaskStatus(g)}
                        />
                        <div className="task-item__content">
                          <span style={{ fontWeight: 600 }}>{g.title}</span>
                          {g.subjectName && <div className="hint">{g.subjectName}</div>}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Objetivos Semanales */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ margin: 0 }}>Objetivos Semanales</h3>
                      <span className="hint">
                        {goals.weeklyCompleted} de {goals.weeklyTotal} cumplidos esta semana
                      </span>
                    </div>
                    <button
                      type="button"
                      className="button button--secondary button--small"
                      onClick={() => handleOpenCreateModal('weekly')}
                    >
                      + Añadir objetivo semanal
                    </button>
                  </div>

                  <div className="dimension-bar" style={{ marginBottom: '1.25rem' }}>
                    <div
                      className="dimension-fill"
                      style={{
                        width: `${goals.weeklyTotal > 0 ? (goals.weeklyCompleted / goals.weeklyTotal) * 100 : 0}%`,
                      }}
                    />
                  </div>

                  {goals.weekly.length === 0 ? (
                    <p className="hint">No has definido objetivos para esta semana.</p>
                  ) : (
                    goals.weekly.map((g) => (
                      <div key={g.id} className={`task-item ${g.status === 'completed' ? 'task-item--completed' : ''}`}>
                        <input
                          type="checkbox"
                          className="task-item__checkbox"
                          checked={g.status === 'completed'}
                          onChange={() => handleToggleTaskStatus(g)}
                        />
                        <div className="task-item__content">
                          <span style={{ fontWeight: 600 }}>{g.title}</span>
                          {g.subjectName && <div className="hint">{g.subjectName}</div>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 4: CALENDARIO */}
          {activeTab === 'calendar' && renderCalendar()}

          {/* PESTAÑA 5: REORGANIZACIÓN INTELIGENTE (RECOMENDACIONES) */}
          {activeTab === 'reschedule' && (
            <div>
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3>Sistema inteligente de reorganización académica</h3>
                <p className="hint">
                  Analiza tus tareas no completadas y busca espacios óptimos en tu agenda futura según tu disponibilidad,
                  evitando programar actividades en horarios que ya estén ocupados.
                </p>
              </div>

              {recommendations.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--green-600)' }}>
                    ✓ ¡Todas tus actividades están al día!
                  </p>
                  <p className="hint">No hay tareas no completadas que requieran reprogramación inmediata.</p>
                </div>
              ) : (
                recommendations.map((rec) => (
                  <article key={rec.taskId} className="recommendation-card">
                    <div className="recommendation-card__header">
                      <div>
                        <h4 className="recommendation-card__title">{rec.title}</h4>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: `${rec.subjectColor}20`,
                            color: rec.subjectColor,
                            marginTop: '0.25rem',
                          }}
                        >
                          {rec.subjectName}
                        </span>
                        <span className={`badge badge--${rec.priority}`} style={{ marginLeft: '0.5rem' }}>
                          Prioridad: {rec.priority}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="button button--primary button--small"
                        onClick={() => handleApplyRecommendation(rec)}
                        disabled={actionLoading}
                      >
                        ✓ Aceptar y reorganizar
                      </button>
                    </div>

                    <div className="recommendation-slot">
                      <span>📅 Nuevo horario recomendado:</span>
                      <strong>{rec.suggestedDate} de {rec.suggestedStartTime} a {rec.suggestedEndTime}</strong>
                      <span className="hint">({rec.estimatedMinutes} min libres)</span>
                    </div>

                    <p style={{ margin: '0.4rem 0 0', fontSize: '0.88rem', color: '#713f12' }}>
                      {rec.rationale}
                    </p>
                  </article>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* ---------------------------------------------------------------------
          MODAL CREAR / EDITAR TAREA U OBJETIVO
          --------------------------------------------------------------------- */}
      {isModalOpen && (
        <Portal>
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-dialog__header">
              <h3 style={{ margin: 0 }}>
                {editingTask ? 'Editar tarea u objetivo' : 'Crear nueva tarea u objetivo'}
              </h3>
              <button
                type="button"
                className="modal-dialog__close"
                onClick={() => setIsModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveTask}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="taskTitle">
                  Título de la actividad <strong style={{ color: 'var(--color-danger)' }}>*</strong>
                </label>
                <input
                  id="taskTitle"
                  type="text"
                  className="input"
                  placeholder="Ej. Terminar resumen de Bioquímica, resolver 10 derivadas..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid--2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="taskSubject">Materia</label>
                  <select
                    id="taskSubject"
                    className="input"
                    value={formData.subjectId}
                    onChange={handleModalSubjectChange}
                  >
                    <option value="">-- Sin materia asignada (General) --</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="taskTopic">Tema</label>
                  <select
                    id="taskTopic"
                    className="input"
                    value={formData.topicId}
                    onChange={(e) => setFormData({ ...formData, topicId: e.target.value })}
                    disabled={!formData.subjectId}
                  >
                    <option value="">
                      {formData.subjectId ? '-- Seleccionar tema (Opcional) --' : '-- Elige primero materia --'}
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
                  <label htmlFor="taskPriority">Prioridad</label>
                  <select
                    id="taskPriority"
                    className="input"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="taskDueDate">Fecha y hora límite de entrega</label>
                  <input
                    id="taskDueDate"
                    type="datetime-local"
                    className="input"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Programación de horario en disponibilidad */}
              <div style={{ background: 'var(--warm-50)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', border: '1px solid var(--color-border)' }}>
                <strong style={{ fontSize: '0.9rem', color: 'var(--color-heading)', display: 'block', marginBottom: '0.5rem' }}>
                  ⏱ Programar horario de estudio en agenda (Disponibilidad)
                </strong>
                <div className="grid grid--3" style={{ gap: '0.75rem' }}>
                  <div className="form-group">
                    <label htmlFor="scheduledDate" style={{ fontSize: '0.8rem' }}>Fecha programada</label>
                    <input
                      id="scheduledDate"
                      type="date"
                      className="input"
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="scheduledStartTime" style={{ fontSize: '0.8rem' }}>Hora inicio</label>
                    <input
                      id="scheduledStartTime"
                      type="time"
                      className="input"
                      value={formData.scheduledStartTime}
                      onChange={(e) => setFormData({ ...formData, scheduledStartTime: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="scheduledEndTime" style={{ fontSize: '0.8rem' }}>Hora fin</label>
                    <input
                      id="scheduledEndTime"
                      type="time"
                      className="input"
                      value={formData.scheduledEndTime}
                      onChange={(e) => setFormData({ ...formData, scheduledEndTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid--2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="taskGoalPeriod">Vincular a objetivo</label>
                  <select
                    id="taskGoalPeriod"
                    className="input"
                    value={formData.goalPeriod}
                    onChange={(e) => setFormData({ ...formData, goalPeriod: e.target.value })}
                  >
                    <option value="none">Tarea estándar (Sin vincular)</option>
                    <option value="daily">🎯 Objetivo Diario</option>
                    <option value="weekly">🎯 Objetivo Semanal</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="taskMinutes">Duración estimada (minutos)</label>
                  <input
                    id="taskMinutes"
                    type="number"
                    min="5"
                    max="600"
                    className="input"
                    value={formData.estimatedMinutes}
                    onChange={(e) => setFormData({ ...formData, estimatedMinutes: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="taskDesc">Descripción o notas de la actividad</label>
                <textarea
                  id="taskDesc"
                  className="input"
                  rows={3}
                  placeholder="Detalles sobre lo que debes realizar, recursos o entregables..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => setIsModalOpen(false)}
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="button button--primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Guardando...' : editingTask ? 'Actualizar tarea' : 'Crear tarea en MySQL'}
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
            <h3 style={{ marginTop: 0 }}>¿Eliminar esta tarea?</h3>
            <p className="hint">
              Se eliminará &ldquo;{deleteCandidate.title}&rdquo; de forma permanente.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => setDeleteCandidate(null)}
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="button button--primary"
                style={{ backgroundColor: 'var(--color-danger)' }}
                onClick={handleConfirmDelete}
                disabled={actionLoading}
              >
                {actionLoading ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}
    </section>
  );
}
