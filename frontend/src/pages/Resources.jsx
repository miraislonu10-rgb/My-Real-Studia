import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../context/AuthContext.jsx';
import { resources as resourcesService } from '../services/academic.js';
import { mapFieldErrors } from '../utils/formErrors.js';

import Button from '../components/atoms/Button.jsx';
import EmptyState from '../components/atoms/EmptyState.jsx';
import Icon from '../components/atoms/Icon.jsx';
import ConfirmDialog from '../components/molecules/ConfirmDialog.jsx';
import DataTable from '../components/molecules/DataTable.jsx';
import FormField from '../components/molecules/FormField.jsx';
import Modal from '../components/molecules/Modal.jsx';
import Pagination from '../components/molecules/Pagination.jsx';
import StatusMessage from '../components/molecules/StatusMessage.jsx';

const RESOURCE_TYPES = [
  { value: 'link', label: 'Enlace', icon: 'link' },
  { value: 'article', label: 'Artículo', icon: 'file' },
  { value: 'video', label: 'Video', icon: 'video' },
  { value: 'book', label: 'Libro', icon: 'book' },
  { value: 'document', label: 'Documento', icon: 'file' },
  { value: 'course', label: 'Curso', icon: 'layers' },
  { value: 'other', label: 'Otro', icon: 'inbox' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Fácil' },
  { value: 'medium', label: 'Media' },
  { value: 'hard', label: 'Difícil' },
];

const LIMIT = 10;

const typeMeta = (value) =>
  RESOURCE_TYPES.find((option) => option.value === value) || RESOURCE_TYPES[0];

const difficultyLabel = (value) =>
  DIFFICULTY_OPTIONS.find((option) => option.value === value)?.label || value;

const emptyForm = () => ({
  title: '',
  url: '',
  resourceType: 'link',
  description: '',
  provider: '',
  area: '',
  difficultyLevel: 'medium',
  language: 'es',
  isPublished: true,
});

/**
 * STUDIA - Recursos educativos
 * ------------------------------------------------------------------
 * Catalogo GLOBAL de recursos sobre /api/resources.
 *  - El ESTUDIANTE solo puede listar y abrir los recursos PUBLICADOS.
 *  - El ADMINISTRADOR ve todo (publicado y oculto) y es el único que puede
 *    crear, editar y eliminar recursos.
 * El estado del recurso lo determina siempre el backend segun el rol verificado.
 */
export default function Resources() {
  const { isAdmin } = useAuth();

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: LIMIT, total: 0, totalPages: 1 });

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [publishedFilter, setPublishedFilter] = useState('');
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await resourcesService.list({
        page,
        limit: LIMIT,
        ...(typeFilter ? { resourceType: typeFilter } : {}),
        ...(search ? { search } : {}),
        ...(isAdmin && publishedFilter ? { isPublished: publishedFilter === 'published' } : {}),
      });
      setRows(data.resources || []);
      setPagination(data.pagination || { page, limit: LIMIT, total: 0, totalPages: 1 });
    } catch (error) {
      setRows([]);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, search, publishedFilter, isAdmin]);

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

  const openEdit = (resource) => {
    setEditing(resource);
    setForm({
      title: resource.title || '',
      url: resource.url || '',
      resourceType: resource.resourceType || 'link',
      description: resource.description || '',
      provider: resource.provider || '',
      area: resource.area || '',
      difficultyLevel: resource.difficultyLevel || 'medium',
      language: resource.language || 'es',
      isPublished: resource.isPublished !== false,
    });
    setFieldErrors({});
    setMessage(null);
    setModalOpen(true);
  };

  const handleChange = (field) => (event) => {
    const { value, type, checked } = event.target;
    setForm((previous) => ({ ...previous, [field]: type === 'checkbox' ? checked : value }));
  };

  /** Solo se envían los campos con valor: los vacíos se omiten. */
  const buildPayload = () => {
    const payload = {
      title: form.title.trim(),
      url: form.url.trim(),
      resourceType: form.resourceType,
      difficultyLevel: form.difficultyLevel,
      isPublished: form.isPublished,
    };
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.provider.trim()) payload.provider = form.provider.trim();
    if (form.area.trim()) payload.area = form.area.trim();
    if (form.language.trim()) payload.language = form.language.trim();
    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFieldErrors({});
    setMessage(null);

    if (!form.title.trim()) {
      setFieldErrors({ title: 'El título del recurso es obligatorio.' });
      return;
    }
    if (!form.url.trim()) {
      setFieldErrors({ url: 'La URL del recurso es obligatoria.' });
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await resourcesService.update(editing.id, buildPayload());
        setMessage({ type: 'ok', text: 'Recurso actualizado correctamente.' });
      } else {
        await resourcesService.create(buildPayload());
        setMessage({ type: 'ok', text: 'Recurso creado correctamente.' });
        setPage(1);
      }
      setModalOpen(false);
      await load();
    } catch (error) {
      setFieldErrors(mapFieldErrors(error));
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    setDeleting(true);
    try {
      await resourcesService.remove(deleteCandidate.id);
      setDeleteCandidate(null);
      setMessage({ type: 'ok', text: 'Recurso eliminado correctamente.' });
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

  const columns = [
    {
      key: 'title',
      header: 'Recurso',
      render: (row) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon name={typeMeta(row.resourceType).icon} size={16} />
          {row.title}
        </span>
      ),
    },
    {
      key: 'resourceType',
      header: 'Tipo',
      render: (row) => typeMeta(row.resourceType).label,
    },
    {
      key: 'provider',
      header: 'Proveedor',
      render: (row) => row.provider || <span className="hint">—</span>,
    },
    {
      key: 'area',
      header: 'Área',
      render: (row) => row.area || <span className="hint">—</span>,
    },
    {
      key: 'difficultyLevel',
      header: 'Dificultad',
      render: (row) => difficultyLabel(row.difficultyLevel),
    },
    ...(isAdmin
      ? [
          {
            key: 'isPublished',
            header: 'Publicación',
            render: (row) =>
              row.isPublished ? (
                <span className="badge badge--active">Publicado</span>
              ) : (
                <span className="badge badge--warning">Oculto</span>
              ),
          },
        ]
      : []),
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      render: (row) => (
        <div className="actions actions--inline">
          <a
            href={row.url}
            target="_blank"
            rel="noopener noreferrer"
            className="button button--ghost button--small button--icon"
            aria-label={`Abrir el recurso ${row.title} en una pestaña nueva`}
            title="Abrir recurso"
          >
            <Icon name="external" size={17} />
          </a>
          {isAdmin && (
            <>
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
            </>
          )}
        </div>
      ),
    },
  ];

  const hasFilters = Boolean(search || typeFilter || (isAdmin && publishedFilter));

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
          <h2 className="page__title">Recursos</h2>
          <p className="page__text">
            {isAdmin
              ? 'Publica y organiza enlaces, artículos, videos y libros de apoyo para tus estudiantes.'
              : 'Enlaces, artículos, videos y libros recomendados para acompañar tu estudio.'}
          </p>
        </div>
        {isAdmin && (
          <Button icon="plus" onClick={openCreate}>
            Nuevo recurso
          </Button>
        )}
      </div>

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
              placeholder="Título del recurso"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </FormField>
        </div>

        <div className="toolbar__field">
          <FormField label="Tipo" name="typeFilter">
            <select
              id="typeFilter"
              name="typeFilter"
              value={typeFilter}
              onChange={(event) => {
                setPage(1);
                setTypeFilter(event.target.value);
              }}
            >
              <option value="">Todos</option>
              {RESOURCE_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {isAdmin && (
          <div className="toolbar__field">
            <FormField label="Publicación" name="publishedFilter">
              <select
                id="publishedFilter"
                name="publishedFilter"
                value={publishedFilter}
                onChange={(event) => {
                  setPage(1);
                  setPublishedFilter(event.target.value);
                }}
              >
                <option value="">Todos</option>
                <option value="published">Solo publicados</option>
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
          loadingLabel="Cargando recursos..."
          caption="Listado de recursos educativos"
          empty={
            <EmptyState
              icon="link"
              title="Todavía no hay recursos"
              text={
                hasFilters
                  ? 'No hay recursos que coincidan con los filtros aplicados.'
                  : isAdmin
                    ? 'Publica el primer recurso para que tus estudiantes lo encuentren aquí.'
                    : 'Aún no hay recursos publicados. Vuelve más tarde.'
              }
              action={
                isAdmin ? (
                  <Button icon="plus" onClick={openCreate}>
                    Nuevo recurso
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
        title={editing ? 'Editar recurso' : 'Nuevo recurso'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="resource-form" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear recurso'}
            </Button>
          </>
        }
      >
        <form id="resource-form" onSubmit={handleSubmit} noValidate>
          <FormField
            label="Título del recurso"
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
              data-autofocus
            />
          </FormField>

          <FormField
            label="URL"
            name="url"
            error={fieldErrors.url}
            hint="Obligatoria. Enlace completo, por ejemplo https://..."
          >
            <input
              id="url"
              name="url"
              type="url"
              maxLength={500}
              placeholder="https://"
              value={form.url}
              onChange={handleChange('url')}
            />
          </FormField>

          <div className="grid grid--2" style={{ gap: '1rem' }}>
            <FormField label="Tipo" name="resourceType" error={fieldErrors.resourceType}>
              <select
                id="resourceType"
                name="resourceType"
                value={form.resourceType}
                onChange={handleChange('resourceType')}
              >
                {RESOURCE_TYPES.map((option) => (
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
            <FormField label="Proveedor" name="provider" error={fieldErrors.provider} hint="Opcional.">
              <input
                id="provider"
                name="provider"
                type="text"
                maxLength={150}
                value={form.provider}
                onChange={handleChange('provider')}
              />
            </FormField>

            <FormField label="Área" name="area" error={fieldErrors.area} hint="Temática (opcional).">
              <input
                id="area"
                name="area"
                type="text"
                maxLength={120}
                value={form.area}
                onChange={handleChange('area')}
              />
            </FormField>
          </div>

          <FormField
            label="Idioma"
            name="language"
            error={fieldErrors.language}
            hint="Código corto, por ejemplo es o en (opcional)."
          >
            <input
              id="language"
              name="language"
              type="text"
              maxLength={5}
              value={form.language}
              onChange={handleChange('language')}
            />
          </FormField>

          <FormField
            label="Descripción"
            name="description"
            error={fieldErrors.description}
            hint="Qué aporta el recurso y cuándo usarlo (opcional)."
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

          <FormField
            label="Publicado (visible para los estudiantes)"
            name="isPublished"
            hint="Si lo desmarcas, el recurso queda oculto para los estudiantes."
          >
            <input
              id="isPublished"
              name="isPublished"
              type="checkbox"
              checked={form.isPublished}
              onChange={handleChange('isPublished')}
            />
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteCandidate)}
        title="Eliminar recurso"
        text={`Se eliminará «${deleteCandidate?.title || ''}» del catálogo. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteCandidate(null)}
        loading={deleting}
      />
    </section>
  );
}
