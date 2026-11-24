import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { subjects as subjectsService } from '../services/academic.js';
import { listUsers } from '../services/auth.js';

import Button from '../components/atoms/Button.jsx';
import EmptyState from '../components/atoms/EmptyState.jsx';
import Icon from '../components/atoms/Icon.jsx';
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

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activa', badge: 'badge--active' },
  { value: 'paused', label: 'Pausada', badge: 'badge--warning' },
  { value: 'archived', label: 'Archivada', badge: '' },
];

const DEFAULT_COLOR = '#8574d8';
const LIMIT = 10;

const emptyForm = () => ({
  name: '',
  code: '',
  description: '',
  color: DEFAULT_COLOR,
  difficultyLevel: 'medium',
  teacherName: '',
  targetHours: '',
  status: 'active',
});

const difficultyLabel = (value) =>
  DIFFICULTY_OPTIONS.find((option) => option.value === value)?.label || value;

const statusMeta = (value) =>
  STATUS_OPTIONS.find((option) => option.value === value) || STATUS_OPTIONS[0];

/**
 * STUDIA - Materias
 * ------------------------------------------------------------------
 * CRUD de materias sobre /api/subjects.
 *  - El ESTUDIANTE administra sus propias materias.
 *  - El ADMINISTRADOR elige un estudiante y gestiona las materias de ese
 *    estudiante (soporte). El dueño lo determina siempre el backend: un
 *    estudiante nunca puede operar sobre datos de otro.
 */
export default function Subjects() {
  const { isAdmin } = useAuth();

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: LIMIT, total: 0, totalPages: 1 });
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // El administrador necesita la lista de estudiantes para elegir a quién gestiona.
  useEffect(() => {
    if (!isAdmin) return undefined;
    let cancelled = false;
    listUsers({ limit: 100, role: 'student' })
      .then((data) => {
        if (!cancelled) setStudents(data.users || []);
      })
      .catch(() => {
        if (!cancelled) setStudents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await subjectsService.list({
        page,
        limit: LIMIT,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(search ? { search } : {}),
        ...(isAdmin && selectedStudent ? { userUuid: selectedStudent } : {}),
      });
      setRows(data.subjects || []);
      setPagination(data.pagination || { page, limit: LIMIT, total: 0, totalPages: 1 });
    } catch (error) {
      setRows([]);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, isAdmin, selectedStudent]);

  useEffect(() => {
    load();
  }, [load]);

  // ---------------------------------------------------------------- Formulario
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFieldErrors({});
    setMessage(null);
    setModalOpen(true);
  };

  const openEdit = (subject) => {
    setEditing(subject);
    setForm({
      name: subject.name || '',
      code: subject.code || '',
      description: subject.description || '',
      color: subject.color || DEFAULT_COLOR,
      difficultyLevel: subject.difficultyLevel || 'medium',
      teacherName: subject.teacherName || '',
      targetHours: subject.targetHours != null ? String(subject.targetHours) : '',
      status: subject.status || 'active',
    });
    setFieldErrors({});
    setMessage(null);
    setModalOpen(true);
  };

  const handleChange = (field) => (event) => {
    const { value } = event.target;
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  /** Solo se envian los campos con valor: los vacios se omiten para no
   *  escribir cadenas vacias en columnas numericas. */
  const buildPayload = () => {
    const payload = {
      name: form.name.trim(),
      color: form.color || undefined,
      difficultyLevel: form.difficultyLevel,
      status: form.status,
    };
    if (form.code.trim()) payload.code = form.code.trim();
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.teacherName.trim()) payload.teacherName = form.teacherName.trim();
    if (form.targetHours !== '') payload.targetHours = Number(form.targetHours);
    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFieldErrors({});

    if (!form.name.trim()) {
      setFieldErrors({ name: 'El nombre de la materia es obligatorio.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      if (editing) {
        await subjectsService.update(editing.id, buildPayload());
        setMessage({ type: 'ok', text: 'Materia actualizada correctamente.' });
      } else {
        const payload = buildPayload();
        if (isAdmin && selectedStudent) payload.userUuid = selectedStudent;
        await subjectsService.create(payload);
        setMessage({ type: 'ok', text: 'Materia creada correctamente.' });
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
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    setDeleting(true);
    try {
      await subjectsService.remove(deleteCandidate.id);
      setDeleteCandidate(null);
      setMessage({ type: 'ok', text: 'Materia eliminada correctamente.' });
      await load();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setDeleting(false);
    }
  };

  // ------------------------------------------------------------------ Filtros
  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const canCreate = !isAdmin || Boolean(selectedStudent);

  const columns = [
    {
      key: 'name',
      header: 'Materia',
      render: (row) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            aria-hidden="true"
            style={{
              width: '0.65rem',
              height: '0.65rem',
              borderRadius: '50%',
              background: row.color || DEFAULT_COLOR,
              flexShrink: 0,
            }}
          />
          {row.name}
        </span>
      ),
    },
    {
      key: 'code',
      header: 'Código',
      render: (row) => row.code || <span className="hint">—</span>,
    },
    {
      key: 'teacherName',
      header: 'Docente',
      render: (row) => row.teacherName || <span className="hint">—</span>,
    },
    {
      key: 'difficultyLevel',
      header: 'Dificultad',
      render: (row) => difficultyLabel(row.difficultyLevel),
    },
    {
      key: 'targetHours',
      header: 'Horas meta',
      align: 'right',
      render: (row) =>
        row.targetHours != null ? `${row.targetHours} h` : <span className="hint">—</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row) => {
        const meta = statusMeta(row.status);
        return <span className={`badge ${meta.badge}`}>{meta.label}</span>;
      },
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      render: (row) => (
        <div className="actions actions--inline">
          <Link
            to={`/materias/${row.id}`}
            className="button button--ghost button--small button--icon"
            aria-label={`Abrir el panel de ${row.name}`}
            title="Abrir panel de la materia"
          >
            <Icon name="external" size={17} />
          </Link>
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
    <section className="page page--wide">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h2 className="page__title">Materias</h2>
          <p className="page__text">
            Crea, edita y organiza las asignaturas que estudias. Cada materia es privada de su
            dueño.
          </p>
        </div>
        <Button icon="plus" onClick={openCreate} disabled={!canCreate}>
          Nueva materia
        </Button>
      </div>

      {isAdmin && !selectedStudent && (
        <p className="hint" style={{ marginBottom: '1rem' }}>
          Selecciona un estudiante para poder crear materias a su nombre.
        </p>
      )}

      {message && (
        <div style={{ marginBottom: '1rem' }}>
          <StatusMessage type={message.type}>{message.text}</StatusMessage>
        </div>
      )}

      <form className="toolbar" onSubmit={handleSearchSubmit}>
        <div className="toolbar__field toolbar__search">
          <FormField label="Buscar" name="search">
            <input
              id="search"
              name="search"
              type="search"
              placeholder="Nombre o código de la materia"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </FormField>
        </div>

        <div className="toolbar__field">
          <FormField label="Estado" name="statusFilter">
            <select
              id="statusFilter"
              name="statusFilter"
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
            >
              <option value="">Todos</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {isAdmin && (
          <div className="toolbar__field">
            <FormField label="Estudiante" name="student">
              <select
                id="student"
                name="student"
                value={selectedStudent}
                onChange={(event) => {
                  setPage(1);
                  setSelectedStudent(event.target.value);
                }}
              >
                <option value="">Todos los estudiantes</option>
                {students.map((student) => (
                  <option key={student.uuid} value={student.uuid}>
                    {student.firstName} {student.lastName} ({student.email})
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        )}

        <Button type="submit" variant="ghost" icon="search">
          Buscar
        </Button>
      </form>

      <div className="card">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          loading={loading}
          loadingLabel="Cargando materias..."
          caption="Listado de materias"
          empty={
            <EmptyState
              icon="book"
              title="Todavía no hay materias"
              text={
                search || statusFilter
                  ? 'No hay materias que coincidan con los filtros aplicados.'
                  : 'Crea tu primera materia para empezar a organizar temas, tareas y repasos.'
              }
              action={
                canCreate ? (
                  <Button icon="plus" onClick={openCreate}>
                    Nueva materia
                  </Button>
                ) : null
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
        title={editing ? 'Editar materia' : 'Nueva materia'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="subject-form" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear materia'}
            </Button>
          </>
        }
      >
        <form id="subject-form" onSubmit={handleSubmit} noValidate>
          <FormField
            label="Nombre de la materia"
            name="name"
            error={fieldErrors.name}
            hint="Obligatorio. Máximo 120 caracteres."
          >
            <input
              id="name"
              name="name"
              type="text"
              maxLength={120}
              value={form.name}
              onChange={handleChange('name')}
            />
          </FormField>

          <div className="grid grid--2" style={{ gap: '1rem' }}>
            <FormField label="Código" name="code" error={fieldErrors.code} hint="Opcional.">
              <input
                id="code"
                name="code"
                type="text"
                maxLength={30}
                value={form.code}
                onChange={handleChange('code')}
              />
            </FormField>

            <FormField label="Docente" name="teacherName" error={fieldErrors.teacherName}>
              <input
                id="teacherName"
                name="teacherName"
                type="text"
                maxLength={120}
                value={form.teacherName}
                onChange={handleChange('teacherName')}
              />
            </FormField>
          </div>

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

            <FormField
              label="Horas meta"
              name="targetHours"
              error={fieldErrors.targetHours}
              hint="Horas de estudio previstas (opcional)."
            >
              <input
                id="targetHours"
                name="targetHours"
                type="number"
                min="0.5"
                max="9999"
                step="0.5"
                value={form.targetHours}
                onChange={handleChange('targetHours')}
              />
            </FormField>
          </div>

          <div className="grid grid--2" style={{ gap: '1rem' }}>
            <FormField label="Color" name="color" error={fieldErrors.color}>
              <input
                id="color"
                name="color"
                type="color"
                value={form.color}
                onChange={handleChange('color')}
              />
            </FormField>

            <FormField label="Estado" name="status" error={fieldErrors.status}>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange('status')}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField
            label="Descripción"
            name="description"
            error={fieldErrors.description}
            hint="Objetivos, temario o notas (opcional)."
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
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteCandidate)}
        title="Eliminar materia"
        text={`Se eliminará «${deleteCandidate?.name || ''}» junto con sus temas, ejercicios y recursos asociados. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteCandidate(null)}
        loading={deleting}
      />
    </section>
  );
}
