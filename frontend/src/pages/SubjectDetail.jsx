/**
 * STUDIA - Panel de la materia (/materias/:id)
 * ------------------------------------------------------------------
 * Concentra en un unico lugar todo lo que pertenece a una materia:
 *   - Datos de la materia (cabecera) y resumen de progreso REAL calculado a
 *     partir de sus temas (nunca cifras inventadas).
 *   - Gestion completa (CRUD) de Temas, Tareas y Ejercicios.
 *
 * El dueño de los recursos NO se envia desde aqui para un estudiante: el
 * backend lo deriva de la materia (temas y ejercicios) o de la sesion. Solo el
 * ADMINISTRADOR envia `userUuid` al crear una TAREA, porque el dueño de una
 * tarea se toma del cuerpo de la peticion y no de la materia.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import {
  subjects as subjectsService,
  topics as topicsService,
  tasks as tasksService,
  exercises as exercisesService,
} from '../services/academic.js';

import Button from '../components/atoms/Button.jsx';
import EmptyState from '../components/atoms/EmptyState.jsx';
import Icon from '../components/atoms/Icon.jsx';
import ProgressBar from '../components/atoms/ProgressBar.jsx';
import Spinner from '../components/atoms/Spinner.jsx';
import StatCard from '../components/atoms/StatCard.jsx';
import ConfirmDialog from '../components/molecules/ConfirmDialog.jsx';
import DataTable from '../components/molecules/DataTable.jsx';
import FormField from '../components/molecules/FormField.jsx';
import Modal from '../components/molecules/Modal.jsx';
import Pagination from '../components/molecules/Pagination.jsx';
import StatusMessage from '../components/molecules/StatusMessage.jsx';

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Fácil' },
  { value: 'medium', label: 'Media' },
  { value: 'hard', label: 'Difícil' },
];

const SUBJECT_STATUS_OPTIONS = [
  { value: 'active', label: 'Activa', badge: 'badge--active' },
  { value: 'paused', label: 'Pausada', badge: 'badge--warning' },
  { value: 'archived', label: 'Archivada', badge: '' },
];

const TOPIC_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente', badge: 'badge--pending' },
  { value: 'in_progress', label: 'En progreso', badge: 'badge--info' },
  { value: 'mastered', label: 'Dominado', badge: 'badge--active' },
  { value: 'needs_review', label: 'Por repasar', badge: 'badge--warning' },
];

const TASK_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baja', badge: 'badge--low' },
  { value: 'medium', label: 'Media', badge: 'badge--medium' },
  { value: 'high', label: 'Alta', badge: 'badge--high' },
  { value: 'urgent', label: 'Urgente', badge: 'badge--urgent' },
];

const TASK_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente', badge: 'badge--pending' },
  { value: 'in_progress', label: 'En progreso', badge: 'badge--info' },
  { value: 'completed', label: 'Completada', badge: 'badge--active' },
  { value: 'cancelled', label: 'Cancelada', badge: 'badge--danger' },
];

const EXERCISE_TYPE_OPTIONS = [
  { value: 'multiple_choice', label: 'Opción múltiple' },
  { value: 'open_answer', label: 'Respuesta abierta' },
  { value: 'true_false', label: 'Verdadero / Falso' },
  { value: 'problem_solving', label: 'Resolución de problemas' },
  { value: 'coding', label: 'Programación' },
];

const PRIORITY_OPTIONS = [1, 2, 3, 4, 5];
const LIMIT = 10;
const TOPIC_LIMIT = 100;
const DEFAULT_COLOR = '#8574d8';

const TABS = [
  { key: 'temas', label: 'Temas' },
  { key: 'tareas', label: 'Tareas' },
  { key: 'ejercicios', label: 'Ejercicios' },
];

/** Busca la opcion de una lista de constantes por su valor. */
const metaOf = (options, value) => options.find((option) => option.value === value) || null;

const labelOf = (options, value) => metaOf(options, value)?.label || value || '—';

/** Formatea una fecha soportando cadenas 'YYYY-MM-DD' (sin desfase de zona). */
const formatDate = (value) => {
  if (!value) return '—';
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-MX');
};

/** Convierte una fecha de la API al formato de <input type="date">. */
const toDateInput = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) {
    const pad = (number) => String(number).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return '';
};

/** Minutos -> texto legible; 0/ausente devuelve null para mostrar "Sin datos". */
const formatMinutes = (minutes) => {
  const total = Number(minutes) || 0;
  if (total <= 0) return null;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours && rest) return `${hours} h ${rest} min`;
  if (hours) return `${hours} h`;
  return `${rest} min`;
};

const emptyTopicForm = () => ({
  name: '',
  description: '',
  difficultyLevel: 'medium',
  status: 'pending',
  priority: 3,
  progressPercent: 0,
  estimatedMinutes: '',
});

const emptyTaskForm = () => ({
  title: '',
  description: '',
  topicId: '',
  priority: 'medium',
  status: 'pending',
  dueDate: '',
  estimatedMinutes: '',
  actualMinutes: '',
});

const emptyExerciseForm = () => ({
  title: '',
  statement: '',
  exerciseType: 'open_answer',
  difficultyLevel: 'medium',
  topicId: '',
  correctAnswer: '',
  solution: '',
  timeLimitSeconds: '',
  isActive: true,
});

/* ============================================================== Temas ==== */
function TopicsTab({ subjectId, topics, loading, onReload, notify, requestCreate, onRequestConsumed }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyTopicForm());
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyTopicForm());
    setFieldErrors({});
    setAdvancedOpen(false);
    setModalOpen(true);
  };

  const openEdit = (topic) => {
    setEditing(topic);
    setForm({
      name: topic.name || '',
      description: topic.description || '',
      difficultyLevel: topic.difficultyLevel || 'medium',
      status: topic.status || 'pending',
      priority: topic.priority ?? 3,
      progressPercent: topic.progressPercent ?? 0,
      estimatedMinutes: topic.estimatedMinutes != null ? String(topic.estimatedMinutes) : '',
    });
    setFieldErrors({});
    setAdvancedOpen(true);
    setModalOpen(true);
  };

  // Cuando la cabecera del panel pide crear un tema, abrimos el formulario una
  // sola vez y avisamos de que la peticion ya se atendio.
  useEffect(() => {
    if (requestCreate) {
      openCreate();
      onRequestConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestCreate]);

  const handleChange = (field) => (event) => {
    const { value, type, checked } = event.target;
    setForm((previous) => ({ ...previous, [field]: type === 'checkbox' ? checked : value }));
  };

  const buildPayload = () => {
    const payload = {
      subjectId,
      name: form.name.trim(),
      difficultyLevel: form.difficultyLevel,
      status: form.status,
      priority: Number(form.priority),
      progressPercent: Number(form.progressPercent) || 0,
    };
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.estimatedMinutes !== '' && Number(form.estimatedMinutes) >= 1) {
      payload.estimatedMinutes = Number(form.estimatedMinutes);
    }
    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFieldErrors({});

    if (!form.name.trim()) {
      setFieldErrors({ name: 'El nombre del tema es obligatorio.' });
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await topicsService.update(editing.id, buildPayload());
        notify('ok', 'Tema actualizado correctamente.');
      } else {
        await topicsService.create(buildPayload());
        notify('ok', 'Tema creado correctamente.');
      }
      setModalOpen(false);
      await onReload();
    } catch (error) {
      if (Array.isArray(error.details)) {
        const map = {};
        for (const detail of error.details) map[detail.field] = detail.message;
        setFieldErrors(map);
      }
      notify('error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    setDeleting(true);
    try {
      await topicsService.remove(deleteCandidate.id);
      setDeleteCandidate(null);
      notify('ok', 'Tema eliminado correctamente.');
      await onReload();
    } catch (error) {
      notify('error', error.message);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'name', header: 'Tema' },
    {
      key: 'difficultyLevel',
      header: 'Dificultad',
      render: (row) => labelOf(DIFFICULTY_OPTIONS, row.difficultyLevel),
    },
    {
      key: 'priority',
      header: 'Prioridad',
      align: 'right',
      render: (row) => row.priority ?? <span className="hint">—</span>,
    },
    {
      key: 'progressPercent',
      header: 'Progreso',
      align: 'right',
      render: (row) => `${row.progressPercent ?? 0}%`,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row) => {
        const meta = metaOf(TOPIC_STATUS_OPTIONS, row.status) || TOPIC_STATUS_OPTIONS[0];
        return <span className={`badge ${meta.badge}`}>{meta.label}</span>;
      },
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      render: (row) => (
        <div className="actions actions--inline">
          <Button
            variant="ghost"
            size="sm"
            icon="pencil"
            onClick={() => openEdit(row)}
            aria-label={`Editar ${row.name}`}
          />
          <Button
            variant="ghost"
            size="sm"
            icon="trash"
            onClick={() => setDeleteCandidate(row)}
            aria-label={`Eliminar ${row.name}`}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="card__head">
        <div>
          <h3 className="card__title">Temas de la materia</h3>
          <p className="card__subtitle">
            Un tema es una unidad de la materia (por ejemplo «Ecuaciones»). Agrégalos para ordenar tu
            temario.
          </p>
        </div>
        <Button icon="plus" onClick={openCreate}>
          Agregar tema
        </Button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          rows={topics}
          rowKey={(row) => row.id}
          loading={loading}
          loadingLabel="Cargando temas..."
          caption="Listado de temas de la materia"
          empty={
            <EmptyState
              icon="layers"
              title="Todavía no hay temas"
              text="Crea el primer tema de esta materia para organizar su temario."
              action={
                <Button icon="plus" onClick={openCreate}>
                  Agregar tema
                </Button>
              }
            />
          }
        />
      </div>

      <Modal
        open={modalOpen}
        title={editing ? 'Editar tema' : 'Agregar tema'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="topic-form" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear tema'}
            </Button>
          </>
        }
      >
        <form id="topic-form" onSubmit={handleSubmit} noValidate>
          <p className="hint" style={{ marginTop: 0 }}>
            Solo el nombre es obligatorio. Puedes completar el resto cuando quieras.
          </p>

          <FormField
            label="Nombre del tema"
            name="name"
            error={fieldErrors.name}
            hint="Por ejemplo: «Ecuaciones de primer grado»."
          >
            <input
              id="name"
              name="name"
              type="text"
              maxLength={150}
              value={form.name}
              onChange={handleChange('name')}
              data-autofocus
            />
          </FormField>

          <Button
            variant="ghost"
            size="sm"
            icon={advancedOpen ? 'chevronDown' : 'chevronRight'}
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((value) => !value)}
            style={{ marginTop: '0.25rem' }}
          >
            {advancedOpen ? 'Ocultar opciones avanzadas' : 'Mostrar opciones avanzadas'}
          </Button>

          {advancedOpen && (
            <div id="topic-advanced" style={{ marginTop: '1rem' }}>
              <div className="grid grid--2" style={{ gap: '1rem' }}>
                <FormField label="Dificultad" name="difficultyLevel" error={fieldErrors.difficultyLevel}>
                  <select
                    id="difficultyLevel"
                    name="difficultyLevel"
                    value={form.difficultyLevel}
                    onChange={handleChange('difficultyLevel')}
                  >
                    {DIFFICULTY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Estado" name="status" error={fieldErrors.status}>
                  <select id="status" name="status" value={form.status} onChange={handleChange('status')}>
                    {TOPIC_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="grid grid--2" style={{ gap: '1rem' }}>
                <FormField
                  label="Prioridad"
                  name="priority"
                  error={fieldErrors.priority}
                  hint="1 = baja, 5 = alta."
                >
                  <select
                    id="priority"
                    name="priority"
                    value={form.priority}
                    onChange={handleChange('priority')}
                  >
                    {PRIORITY_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Progreso (%)" name="progressPercent" error={fieldErrors.progressPercent}>
                  <input
                    id="progressPercent"
                    name="progressPercent"
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    value={form.progressPercent}
                    onChange={handleChange('progressPercent')}
                  />
                </FormField>
              </div>

              <FormField
                label="Minutos estimados"
                name="estimatedMinutes"
                error={fieldErrors.estimatedMinutes}
                hint="Tiempo previsto de estudio (opcional)."
              >
                <input
                  id="estimatedMinutes"
                  name="estimatedMinutes"
                  type="number"
                  min="1"
                  value={form.estimatedMinutes}
                  onChange={handleChange('estimatedMinutes')}
                />
              </FormField>

              <FormField
                label="Descripción"
                name="description"
                error={fieldErrors.description}
                hint="Contenido, objetivos o notas (opcional)."
              >
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  maxLength={2000}
                  value={form.description}
                  onChange={handleChange('description')}
                />
              </FormField>
            </div>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteCandidate)}
        title="Eliminar tema"
        text={`Se eliminará «${deleteCandidate?.name || ''}». Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteCandidate(null)}
        loading={deleting}
      />
    </>
  );
}

/* ============================================================= Tareas ==== */
function TasksTab({ subjectId, subjectUserUuid, topics, notify }) {
  const { isAdmin } = useAuth();

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: LIMIT, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyTaskForm());
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tasksService.list({
        subjectId,
        page,
        limit: LIMIT,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(priorityFilter ? { priority: priorityFilter } : {}),
      });
      setRows(data.tasks || []);
      setPagination(data.pagination || { page, limit: LIMIT, total: 0, totalPages: 1 });
    } catch (error) {
      setRows([]);
      notify('error', error.message);
    } finally {
      setLoading(false);
    }
  }, [subjectId, page, statusFilter, priorityFilter, notify]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyTaskForm());
    setFieldErrors({});
    setModalOpen(true);
  };

  const openEdit = (task) => {
    setEditing(task);
    setForm({
      title: task.title || '',
      description: task.description || '',
      topicId: task.topicId != null ? String(task.topicId) : '',
      priority: task.priority || 'medium',
      status: task.status || 'pending',
      dueDate: toDateInput(task.dueDate),
      estimatedMinutes: task.estimatedMinutes != null ? String(task.estimatedMinutes) : '',
      actualMinutes: task.actualMinutes != null ? String(task.actualMinutes) : '',
    });
    setFieldErrors({});
    setModalOpen(true);
  };

  const handleChange = (field) => (event) => {
    const { value } = event.target;
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const buildPayload = () => {
    const payload = {
      subjectId,
      title: form.title.trim(),
      priority: form.priority,
      status: form.status,
    };
    if (form.topicId) payload.topicId = Number(form.topicId);
    if (form.dueDate) payload.dueDate = form.dueDate;
    if (form.estimatedMinutes !== '') payload.estimatedMinutes = Number(form.estimatedMinutes);
    if (form.actualMinutes !== '') payload.actualMinutes = Number(form.actualMinutes);
    if (form.description.trim()) payload.description = form.description.trim();
    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFieldErrors({});

    if (!form.title.trim()) {
      setFieldErrors({ title: 'El título de la tarea es obligatorio.' });
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await tasksService.update(editing.id, buildPayload());
        notify('ok', 'Tarea actualizada correctamente.');
      } else {
        const payload = buildPayload();
        // El dueño de una tarea se toma del cuerpo: el admin debe indicar el
        // uuid del dueño de la materia para que quede bien asignada.
        if (isAdmin && subjectUserUuid) payload.userUuid = subjectUserUuid;
        await tasksService.create(payload);
        notify('ok', 'Tarea creada correctamente.');
        setPage(1);
      }
      setModalOpen(false);
      await load();
    } catch (error) {
      if (Array.isArray(error.details)) {
        const map = {};
        for (const detail of error.details) map[detail.field] = detail.message;
        setFieldErrors(map);
      }
      notify('error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    setDeleting(true);
    try {
      await tasksService.remove(deleteCandidate.id);
      setDeleteCandidate(null);
      notify('ok', 'Tarea eliminada correctamente.');
      await load();
    } catch (error) {
      notify('error', error.message);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'title', header: 'Tarea' },
    {
      key: 'topicName',
      header: 'Tema',
      render: (row) => row.topicName || <span className="hint">—</span>,
    },
    {
      key: 'priority',
      header: 'Prioridad',
      render: (row) => {
        const meta = metaOf(TASK_PRIORITY_OPTIONS, row.priority);
        return meta ? <span className={`badge ${meta.badge}`}>{meta.label}</span> : <span className="hint">—</span>;
      },
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row) => {
        const meta = metaOf(TASK_STATUS_OPTIONS, row.status) || TASK_STATUS_OPTIONS[0];
        return <span className={`badge ${meta.badge}`}>{meta.label}</span>;
      },
    },
    {
      key: 'dueDate',
      header: 'Vence',
      render: (row) => formatDate(row.dueDate),
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      render: (row) => (
        <div className="actions actions--inline">
          <Button
            variant="ghost"
            size="sm"
            icon="pencil"
            onClick={() => openEdit(row)}
            aria-label={`Editar ${row.title}`}
          />
          <Button
            variant="ghost"
            size="sm"
            icon="trash"
            onClick={() => setDeleteCandidate(row)}
            aria-label={`Eliminar ${row.title}`}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="card__head">
        <h3 className="card__title">Tareas de la materia</h3>
        <Button icon="plus" onClick={openCreate}>
          Nueva tarea
        </Button>
      </div>

      <form className="toolbar" onSubmit={(event) => event.preventDefault()}>
        <div className="toolbar__field">
          <FormField label="Estado" name="taskStatusFilter">
            <select
              id="taskStatusFilter"
              name="taskStatusFilter"
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
            >
              <option value="">Todos</option>
              {TASK_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="toolbar__field">
          <FormField label="Prioridad" name="taskPriorityFilter">
            <select
              id="taskPriorityFilter"
              name="taskPriorityFilter"
              value={priorityFilter}
              onChange={(event) => {
                setPage(1);
                setPriorityFilter(event.target.value);
              }}
            >
              <option value="">Todas</option>
              {TASK_PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </form>

      <div className="card">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          loading={loading}
          loadingLabel="Cargando tareas..."
          caption="Listado de tareas de la materia"
          empty={
            <EmptyState
              icon="checkSquare"
              title="Todavía no hay tareas"
              text={
                statusFilter || priorityFilter
                  ? 'No hay tareas que coincidan con los filtros aplicados.'
                  : 'Crea la primera tarea de esta materia para planificar tu estudio.'
              }
              action={
                <Button icon="plus" onClick={openCreate}>
                  Nueva tarea
                </Button>
              }
            />
          }
        />
      </div>

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        limit={pagination.limit || LIMIT}
        onChange={setPage}
      />

      <Modal
        open={modalOpen}
        title={editing ? 'Editar tarea' : 'Nueva tarea'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="task-form" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear tarea'}
            </Button>
          </>
        }
      >
        <form id="task-form" onSubmit={handleSubmit} noValidate>
          <FormField
            label="Título de la tarea"
            name="title"
            error={fieldErrors.title}
            hint="Obligatorio. Máximo 200 caracteres."
          >
            <input
              id="title"
              name="title"
              type="text"
              maxLength={200}
              value={form.title}
              onChange={handleChange('title')}
            />
          </FormField>

          <div className="grid grid--2" style={{ gap: '1rem' }}>
            <FormField label="Tema" name="topicId" error={fieldErrors.topicId} hint="Opcional.">
              <select id="topicId" name="topicId" value={form.topicId} onChange={handleChange('topicId')}>
                <option value="">Sin tema</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Fecha de entrega" name="dueDate" error={fieldErrors.dueDate}>
              <input
                id="dueDate"
                name="dueDate"
                type="date"
                value={form.dueDate}
                onChange={handleChange('dueDate')}
              />
            </FormField>
          </div>

          <div className="grid grid--2" style={{ gap: '1rem' }}>
            <FormField label="Prioridad" name="priority" error={fieldErrors.priority}>
              <select id="priority" name="priority" value={form.priority} onChange={handleChange('priority')}>
                {TASK_PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Estado" name="status" error={fieldErrors.status}>
              <select id="status" name="status" value={form.status} onChange={handleChange('status')}>
                {TASK_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid grid--2" style={{ gap: '1rem' }}>
            <FormField
              label="Minutos estimados"
              name="estimatedMinutes"
              error={fieldErrors.estimatedMinutes}
              hint="Opcional."
            >
              <input
                id="estimatedMinutes"
                name="estimatedMinutes"
                type="number"
                min="1"
                value={form.estimatedMinutes}
                onChange={handleChange('estimatedMinutes')}
              />
            </FormField>

            <FormField
              label="Minutos reales"
              name="actualMinutes"
              error={fieldErrors.actualMinutes}
              hint="Opcional."
            >
              <input
                id="actualMinutes"
                name="actualMinutes"
                type="number"
                min="0"
                value={form.actualMinutes}
                onChange={handleChange('actualMinutes')}
              />
            </FormField>
          </div>

          <FormField label="Descripción" name="description" error={fieldErrors.description} hint="Opcional.">
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={2000}
              value={form.description}
              onChange={handleChange('description')}
            />
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteCandidate)}
        title="Eliminar tarea"
        text={`Se eliminará «${deleteCandidate?.title || ''}». Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteCandidate(null)}
        loading={deleting}
      />
    </>
  );
}

/* ========================================================= Ejercicios ==== */
function ExercisesTab({ subjectId, topics, notify }) {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: LIMIT, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyExerciseForm());
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const topicMap = useMemo(() => {
    const map = new Map();
    for (const topic of topics) map.set(topic.id, topic);
    return map;
  }, [topics]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await exercisesService.list({
        subjectId,
        page,
        limit: LIMIT,
        ...(typeFilter ? { exerciseType: typeFilter } : {}),
        ...(difficultyFilter ? { difficultyLevel: difficultyFilter } : {}),
      });
      setRows(data.exercises || []);
      setPagination(data.pagination || { page, limit: LIMIT, total: 0, totalPages: 1 });
    } catch (error) {
      setRows([]);
      notify('error', error.message);
    } finally {
      setLoading(false);
    }
  }, [subjectId, page, typeFilter, difficultyFilter, notify]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyExerciseForm());
    setFieldErrors({});
    setModalOpen(true);
  };

  const openEdit = (exercise) => {
    setEditing(exercise);
    setForm({
      title: exercise.title || '',
      statement: exercise.statement || '',
      exerciseType: exercise.exerciseType || 'open_answer',
      difficultyLevel: exercise.difficultyLevel || 'medium',
      topicId: exercise.topicId != null ? String(exercise.topicId) : '',
      correctAnswer: exercise.correctAnswer || '',
      solution: exercise.solution || '',
      timeLimitSeconds: exercise.timeLimitSeconds != null ? String(exercise.timeLimitSeconds) : '',
      isActive: exercise.isActive === undefined ? true : Boolean(exercise.isActive),
    });
    setFieldErrors({});
    setModalOpen(true);
  };

  const handleChange = (field) => (event) => {
    const { value, type, checked } = event.target;
    setForm((previous) => ({ ...previous, [field]: type === 'checkbox' ? checked : value }));
  };

  const buildPayload = () => {
    const payload = {
      subjectId,
      title: form.title.trim(),
      statement: form.statement.trim(),
      exerciseType: form.exerciseType,
      difficultyLevel: form.difficultyLevel,
      isActive: Boolean(form.isActive),
    };
    if (form.topicId) payload.topicId = Number(form.topicId);
    if (form.correctAnswer.trim()) payload.correctAnswer = form.correctAnswer.trim();
    if (form.solution.trim()) payload.solution = form.solution.trim();
    if (form.timeLimitSeconds !== '' && Number(form.timeLimitSeconds) >= 1) {
      payload.timeLimitSeconds = Number(form.timeLimitSeconds);
    }
    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFieldErrors({});

    const errors = {};
    if (!form.title.trim()) errors.title = 'El título del ejercicio es obligatorio.';
    if (!form.statement.trim()) errors.statement = 'El enunciado del ejercicio es obligatorio.';
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await exercisesService.update(editing.id, buildPayload());
        notify('ok', 'Ejercicio actualizado correctamente.');
      } else {
        await exercisesService.create(buildPayload());
        notify('ok', 'Ejercicio creado correctamente.');
        setPage(1);
      }
      setModalOpen(false);
      await load();
    } catch (error) {
      if (Array.isArray(error.details)) {
        const map = {};
        for (const detail of error.details) map[detail.field] = detail.message;
        setFieldErrors(map);
      }
      notify('error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    setDeleting(true);
    try {
      await exercisesService.remove(deleteCandidate.id);
      setDeleteCandidate(null);
      notify('ok', 'Ejercicio eliminado correctamente.');
      await load();
    } catch (error) {
      notify('error', error.message);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'title', header: 'Ejercicio' },
    {
      key: 'exerciseType',
      header: 'Tipo',
      render: (row) => labelOf(EXERCISE_TYPE_OPTIONS, row.exerciseType),
    },
    {
      key: 'difficultyLevel',
      header: 'Dificultad',
      render: (row) => labelOf(DIFFICULTY_OPTIONS, row.difficultyLevel),
    },
    {
      key: 'topicId',
      header: 'Tema',
      render: (row) => topicMap.get(row.topicId)?.name || <span className="hint">—</span>,
    },
    {
      key: 'isActive',
      header: 'Estado',
      render: (row) => (
        <span className={`badge ${row.isActive ? 'badge--active' : 'badge--warning'}`}>
          {row.isActive ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      render: (row) => (
        <div className="actions actions--inline">
          <Button
            variant="ghost"
            size="sm"
            icon="pencil"
            onClick={() => openEdit(row)}
            aria-label={`Editar ${row.title}`}
          />
          <Button
            variant="ghost"
            size="sm"
            icon="trash"
            onClick={() => setDeleteCandidate(row)}
            aria-label={`Eliminar ${row.title}`}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="card__head">
        <h3 className="card__title">Ejercicios de la materia</h3>
        <Button icon="plus" onClick={openCreate}>
          Nuevo ejercicio
        </Button>
      </div>

      <form className="toolbar" onSubmit={(event) => event.preventDefault()}>
        <div className="toolbar__field">
          <FormField label="Tipo" name="exerciseTypeFilter">
            <select
              id="exerciseTypeFilter"
              name="exerciseTypeFilter"
              value={typeFilter}
              onChange={(event) => {
                setPage(1);
                setTypeFilter(event.target.value);
              }}
            >
              <option value="">Todos</option>
              {EXERCISE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="toolbar__field">
          <FormField label="Dificultad" name="exerciseDifficultyFilter">
            <select
              id="exerciseDifficultyFilter"
              name="exerciseDifficultyFilter"
              value={difficultyFilter}
              onChange={(event) => {
                setPage(1);
                setDifficultyFilter(event.target.value);
              }}
            >
              <option value="">Todas</option>
              {DIFFICULTY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </form>

      <div className="card">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          loading={loading}
          loadingLabel="Cargando ejercicios..."
          caption="Listado de ejercicios de la materia"
          empty={
            <EmptyState
              icon="file"
              title="Todavía no hay ejercicios"
              text={
                typeFilter || difficultyFilter
                  ? 'No hay ejercicios que coincidan con los filtros aplicados.'
                  : 'Crea el primer ejercicio de práctica de esta materia.'
              }
              action={
                <Button icon="plus" onClick={openCreate}>
                  Nuevo ejercicio
                </Button>
              }
            />
          }
        />
      </div>

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        limit={pagination.limit || LIMIT}
        onChange={setPage}
      />

      <Modal
        open={modalOpen}
        title={editing ? 'Editar ejercicio' : 'Nuevo ejercicio'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="exercise-form" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear ejercicio'}
            </Button>
          </>
        }
      >
        <form id="exercise-form" onSubmit={handleSubmit} noValidate>
          <FormField
            label="Título del ejercicio"
            name="title"
            error={fieldErrors.title}
            hint="Obligatorio. Máximo 200 caracteres."
          >
            <input
              id="title"
              name="title"
              type="text"
              maxLength={200}
              value={form.title}
              onChange={handleChange('title')}
            />
          </FormField>

          <FormField
            label="Enunciado"
            name="statement"
            error={fieldErrors.statement}
            hint="Obligatorio. Texto del ejercicio o pregunta."
          >
            <textarea
              id="statement"
              name="statement"
              rows={4}
              value={form.statement}
              onChange={handleChange('statement')}
            />
          </FormField>

          <div className="grid grid--2" style={{ gap: '1rem' }}>
            <FormField label="Tipo" name="exerciseType" error={fieldErrors.exerciseType}>
              <select
                id="exerciseType"
                name="exerciseType"
                value={form.exerciseType}
                onChange={handleChange('exerciseType')}
              >
                {EXERCISE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Dificultad" name="difficultyLevel" error={fieldErrors.difficultyLevel}>
              <select
                id="difficultyLevel"
                name="difficultyLevel"
                value={form.difficultyLevel}
                onChange={handleChange('difficultyLevel')}
              >
                {DIFFICULTY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid grid--2" style={{ gap: '1rem' }}>
            <FormField label="Tema" name="topicId" error={fieldErrors.topicId} hint="Opcional.">
              <select id="topicId" name="topicId" value={form.topicId} onChange={handleChange('topicId')}>
                <option value="">Sin tema</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Tiempo límite (segundos)"
              name="timeLimitSeconds"
              error={fieldErrors.timeLimitSeconds}
              hint="Opcional."
            >
              <input
                id="timeLimitSeconds"
                name="timeLimitSeconds"
                type="number"
                min="1"
                value={form.timeLimitSeconds}
                onChange={handleChange('timeLimitSeconds')}
              />
            </FormField>
          </div>

          <FormField
            label="Respuesta correcta"
            name="correctAnswer"
            error={fieldErrors.correctAnswer}
            hint="Opcional."
          >
            <input
              id="correctAnswer"
              name="correctAnswer"
              type="text"
              value={form.correctAnswer}
              onChange={handleChange('correctAnswer')}
            />
          </FormField>

          <FormField label="Solución" name="solution" error={fieldErrors.solution} hint="Opcional.">
            <textarea
              id="solution"
              name="solution"
              rows={3}
              value={form.solution}
              onChange={handleChange('solution')}
            />
          </FormField>

          <FormField label="Activo" name="isActive" error={fieldErrors.isActive}>
            <label className="hint" htmlFor="isActive" style={{ display: 'inline-flex', gap: '0.5rem' }}>
              <input
                id="isActive"
                name="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={handleChange('isActive')}
              />
              Disponible para practicar
            </label>
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteCandidate)}
        title="Eliminar ejercicio"
        text={`Se eliminará «${deleteCandidate?.title || ''}». Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteCandidate(null)}
        loading={deleting}
      />
    </>
  );
}

/* ==================================================== Panel (pagina) ==== */
export default function SubjectDetail() {
  const { id } = useParams();
  const subjectId = Number(id);

  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [topics, setTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(true);

  const [tab, setTab] = useState('temas');
  const [message, setMessage] = useState(null);
  const [requestNewTopic, setRequestNewTopic] = useState(false);

  const notify = useCallback((type, text) => setMessage({ type, text }), []);

  // Abre el formulario de "Agregar tema" desde la cabecera del panel.
  const handleNewTopic = useCallback(() => {
    setTab('temas');
    setRequestNewTopic(true);
  }, []);

  const loadSubject = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await subjectsService.get(subjectId);
      setSubject(data.subject || null);
    } catch (error) {
      setSubject(null);
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  const loadTopics = useCallback(async () => {
    setTopicsLoading(true);
    try {
      const data = await topicsService.list({ subjectId, limit: TOPIC_LIMIT });
      setTopics(data.topics || []);
    } catch {
      setTopics([]);
    } finally {
      setTopicsLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    if (!Number.isInteger(subjectId) || subjectId < 1) {
      setLoading(false);
      setLoadError('La materia indicada no es válida.');
      return;
    }
    loadSubject();
    loadTopics();
  }, [subjectId, loadSubject, loadTopics]);

  // Resumen de progreso calculado con datos reales de los temas cargados.
  const summary = useMemo(() => {
    const total = topics.length;
    const mastered = topics.filter((topic) => topic.status === 'mastered').length;
    const inProgress = topics.filter((topic) => topic.status === 'in_progress').length;
    const sum = topics.reduce((acc, topic) => acc + (Number(topic.progressPercent) || 0), 0);
    const avgProgress = total ? Math.round(sum / total) : 0;
    const estimated = topics.reduce((acc, topic) => acc + (Number(topic.estimatedMinutes) || 0), 0);
    return { total, mastered, inProgress, avgProgress, estimated };
  }, [topics]);

  if (loading) {
    return (
      <section className="page page--wide">
        <Spinner label="Cargando materia..." />
      </section>
    );
  }

  if (loadError || !subject) {
    return (
      <section className="page page--wide">
        <Link className="button button--ghost button--small" to="/materias" style={{ marginBottom: '1rem' }}>
          <Icon name="chevronLeft" /> Volver a materias
        </Link>
        <div className="card">
          <EmptyState
            icon="alert"
            title="No se pudo abrir la materia"
            text={loadError || 'La materia solicitada no existe o no tienes acceso a ella.'}
            action={
              <Link className="button button--small" to="/materias">
                Ir a Materias
              </Link>
            }
          />
        </div>
      </section>
    );
  }

  const subjectStatus = metaOf(SUBJECT_STATUS_OPTIONS, subject.status) || SUBJECT_STATUS_OPTIONS[0];

  return (
    <section className="page page--wide">
      <Link className="button button--ghost button--small" to="/materias" style={{ marginBottom: '1rem' }}>
        <Icon name="chevronLeft" /> Volver a materias
      </Link>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
              <span
                aria-hidden="true"
                style={{
                  width: '0.9rem',
                  height: '0.9rem',
                  borderRadius: '50%',
                  background: subject.color || DEFAULT_COLOR,
                  flexShrink: 0,
                }}
              />
              <h2 className="page__title" style={{ margin: 0 }}>
                {subject.name}
              </h2>
            </div>
            <p className="page__text" style={{ marginTop: '0.4rem', marginBottom: 0 }}>
              {subject.description || 'Sin descripción registrada.'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {tab === 'temas' && (
              <Button icon="plus" onClick={handleNewTopic}>
                Agregar tema
              </Button>
            )}
            <span className={`badge ${subjectStatus.badge}`}>{subjectStatus.label}</span>
          </div>
        </div>

        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '0.85rem',
            margin: '1.1rem 0 0',
          }}
        >
          <div>
            <dt className="hint">Código</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>{subject.code || '—'}</dd>
          </div>
          <div>
            <dt className="hint">Docente</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>{subject.teacherName || '—'}</dd>
          </div>
          <div>
            <dt className="hint">Dificultad</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>{labelOf(DIFFICULTY_OPTIONS, subject.difficultyLevel)}</dd>
          </div>
          <div>
            <dt className="hint">Horas meta</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>
              {subject.targetHours != null ? `${subject.targetHours} h` : '—'}
            </dd>
          </div>
        </dl>
      </div>

      <h3 className="card__title" style={{ margin: '0 0 0.75rem' }}>
        Resumen de progreso
      </h3>
      <div className="grid grid--stats">
        <StatCard label="Temas" value={summary.total} icon="layers" hint="Temas registrados" />
        <StatCard
          label="Dominados"
          value={summary.mastered}
          icon="check"
          tone="success"
          hint="Temas con estado «Dominado»"
        />
        <StatCard
          label="En progreso"
          value={summary.inProgress}
          icon="trend"
          hint="Temas con estado «En progreso»"
        />
        <StatCard
          label="Tiempo estimado"
          value={formatMinutes(summary.estimated)}
          icon="clock"
          tone="slate"
          hint="Suma de minutos estimados de los temas"
        />
      </div>

      <div className="card" style={{ marginTop: '1.1rem' }}>
        <div className="subject-progress__meta" style={{ marginBottom: '0.5rem' }}>
          <span className="subject-progress__name">Progreso medio de los temas</span>
          <span className="subject-progress__value">{summary.avgProgress}%</span>
        </div>
        <ProgressBar value={summary.avgProgress} success={summary.avgProgress >= 80} label="Progreso medio de los temas" />
      </div>

      {topics.length > TOPIC_LIMIT && (
        <p className="hint">
          El resumen se calcula con los primeros {TOPIC_LIMIT} temas de la materia.
        </p>
      )}

      {message && (
        <div style={{ margin: '1rem 0' }}>
          <StatusMessage type={message.type}>{message.text}</StatusMessage>
        </div>
      )}

      <div className="tab-nav" role="tablist" aria-label="Secciones de la materia">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            id={`tab-${item.key}`}
            aria-selected={tab === item.key}
            aria-controls={`panel-${item.key}`}
            className={`tab-nav__item${tab === item.key ? ' tab-nav__item--active' : ''}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0}>
        {tab === 'temas' && (
          <TopicsTab
            subjectId={subjectId}
            topics={topics}
            loading={topicsLoading}
            onReload={loadTopics}
            notify={notify}
            requestCreate={requestNewTopic}
            onRequestConsumed={() => setRequestNewTopic(false)}
          />
        )}

        {tab === 'tareas' && (
          <TasksTab
            subjectId={subjectId}
            subjectUserUuid={subject.userUuid}
            topics={topics}
            notify={notify}
          />
        )}

        {tab === 'ejercicios' && (
          <ExercisesTab subjectId={subjectId} topics={topics} notify={notify} />
        )}
      </div>
    </section>
  );
}
