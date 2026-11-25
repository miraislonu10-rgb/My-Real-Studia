/**
 * STUDIA - Docencia (vista del profesor)
 * ------------------------------------------------------------------
 * Panel de acompanamiento para administradores y tutores. Es de SOLO LECTURA:
 * muestra el resumen del grupo, el nombre de cada alumno con su progreso y los
 * temas que estan trabajando. No permite modificar datos academicos.
 *
 * Todos los numeros provienen de /api/teacher, que a su vez los calcula con las
 * mismas consultas que ve el estudiante: nada se estima ni se rellena.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import StatCard from '../components/atoms/StatCard.jsx';
import ProgressBar from '../components/atoms/ProgressBar.jsx';
import Badge from '../components/atoms/Badge.jsx';
import EmptyState from '../components/atoms/EmptyState.jsx';
import DataTable from '../components/molecules/DataTable.jsx';
import Pagination from '../components/molecules/Pagination.jsx';
import SearchInput from '../components/molecules/SearchInput.jsx';
import { getTeacherSummary, listStudents } from '../services/teacher.js';
import { formatDate, formatMinutes } from '../utils/format.js';

const PAGE_SIZE = 20;

/** Criterios de orden ofrecidos por la API (lista blanca). */
const SORT_OPTIONS = [
  { id: 'name', label: 'Nombre' },
  { id: 'studyTime', label: 'Mas estudiado' },
  { id: 'progress', label: 'Mayor progreso' },
  { id: 'accuracy', label: 'Mejores aciertos' },
  { id: 'inactive', label: 'Sin actividad reciente' },
];

const STATUS_TONE = { pending: 'warning', active: 'success', suspended: 'danger', deleted: 'neutral' };

export default function Teaching() {
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('name');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Resumen del grupo (una sola vez al entrar).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getTeacherSummary();
        if (!cancelled) setSummary(data);
      } catch (error) {
        if (!cancelled) setSummaryError(error.message);
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Busqueda con retardo: evita una peticion por cada tecla.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadStudents = useCallback(async () => {
    setListLoading(true);
    try {
      const data = await listStudents({ page, limit: PAGE_SIZE, sort, ...(search ? { search } : {}) });
      setStudents(data.students);
      setPagination(data.pagination);
      setListError('');
    } catch (error) {
      setStudents([]);
      setListError(error.message);
    } finally {
      setListLoading(false);
    }
  }, [page, search, sort]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const columns = useMemo(
    () => [
      {
        key: 'student',
        header: 'Alumno',
        render: (row) => (
          <div>
            <Link to={`/docencia/${row.uuid}`}>
              <strong>
                {row.firstName} {row.lastName}
              </strong>
            </Link>
            <div className="hint">{row.email}</div>
            {row.status !== 'active' && (
              <Badge tone={STATUS_TONE[row.status] || 'neutral'}>
                {row.status === 'pending' ? 'Pendiente' : row.status === 'suspended' ? 'Suspendida' : row.status}
              </Badge>
            )}
          </div>
        ),
      },
      {
        key: 'progress',
        header: 'Progreso',
        render: (row) =>
          row.averageTopicProgress === null ? (
            <span className="hint">Sin datos</span>
          ) : (
            <div style={{ minWidth: 130 }}>
              <ProgressBar value={row.averageTopicProgress} label={`Progreso de ${row.firstName}`} />
              <span className="hint">{row.averageTopicProgress}% promedio</span>
            </div>
          ),
      },
      {
        key: 'topics',
        header: 'Temas',
        render: (row) => (
          <span>
            {row.topicsInProgress} en curso
            <div className="hint">
              {row.topics} temas · {row.topicsMastered} dominados
            </div>
          </span>
        ),
      },
      {
        key: 'study',
        header: 'Estudio',
        render: (row) => (
          <span>
            {formatMinutes(row.studyMinutes)}
            <div className="hint">{row.sessions} sesiones</div>
          </span>
        ),
      },
      {
        key: 'accuracy',
        header: 'Aciertos',
        render: (row) =>
          row.accuracyPercentage === null ? (
            <span className="hint">Sin datos</span>
          ) : (
            <span>
              {row.accuracyPercentage}%
              <div className="hint">{row.exerciseAttempts} intentos</div>
            </span>
          ),
      },
      {
        key: 'attention',
        header: 'Errores',
        render: (row) =>
          row.pendingErrors > 0 ? (
            <Badge tone="warning">{row.pendingErrors} pendientes</Badge>
          ) : (
            <span className="hint">Al dia</span>
          ),
      },
      {
        key: 'lastSession',
        header: 'Ultima sesion',
        render: (row) =>
          row.lastSessionAt ? formatDate(row.lastSessionAt) : <span className="hint">Sin sesiones</span>,
      },
      {
        key: 'action',
        header: '',
        align: 'right',
        render: (row) => (
          <Link className="button button--ghost button--small" to={`/docencia/${row.uuid}`}>
            Ver ficha
          </Link>
        ),
      },
    ],
    []
  );

  const stats = summary?.students;
  const activity = summary?.activity;

  return (
    <section className="page page--wide">
      <div className="page__head">
        <div>
          <h2 className="page__title">Docencia</h2>
          <p className="page__text">
            Acompanamiento del grupo en modo <strong>solo lectura</strong>: revisa el avance de cada
            alumno y los temas que estan trabajando. Las cifras son las mismas que ellos ven en su
            panel de estadisticas.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------ Resumen del grupo */}
      {summaryLoading ? (
        <div className="card">
          <p className="hint">Cargando el resumen del grupo...</p>
        </div>
      ) : summaryError ? (
        <div className="status status--error" role="alert">
          {summaryError}
        </div>
      ) : (
        <>
          <div className="grid grid--stats" style={{ marginBottom: '1.1rem' }}>
            <StatCard
              label="Alumnos"
              value={stats?.total ?? 0}
              hint={`${stats?.active ?? 0} cuentas activas`}
              icon="users"
            />
            <StatCard
              label="Activos esta semana"
              value={stats?.loggedInThisWeek ?? 0}
              hint="Iniciaron sesion en los ultimos 7 dias"
              icon="user"
              tone="slate"
            />
            <StatCard
              label="Tiempo estudiado"
              value={formatMinutes(activity?.totalMinutes ?? 0)}
              hint={`${activity?.totalSessions ?? 0} sesiones registradas`}
              icon="clock"
            />
            <StatCard
              label="Alumnos con actividad"
              value={activity?.studentsWithActivity ?? 0}
              hint="Con al menos una sesion finalizada"
              icon="trend"
              tone="success"
            />
          </div>

          <div className="grid grid--2" style={{ marginBottom: '1.1rem' }}>
            {/* Temas que el grupo tiene entre manos */}
            <section className="card">
              <div className="card__head">
                <div>
                  <h3 className="card__title">Temas que estan viendo</h3>
                  <p className="card__subtitle">Temas en curso o por repasar en todo el grupo</p>
                </div>
              </div>
              {!summary?.activeTopics?.length ? (
                <EmptyState
                  icon="layers"
                  title="Ningun tema en curso"
                  text="Cuando los alumnos empiecen a trabajar en sus temas apareceran aqui."
                  plain
                />
              ) : (
                <div className="subject-progress">
                  {summary.activeTopics.map((topic, index) => (
                    <div className="subject-progress__row" key={`${topic.topicName}-${topic.subjectName}-${index}`}>
                      <div className="subject-progress__meta">
                        <span className="subject-progress__name">
                          <span
                            className="subject-progress__dot"
                            style={{ background: topic.subjectColor || '#8574d8' }}
                          />
                          {topic.topicName}
                          <Badge tone="info">{topic.subjectName}</Badge>
                        </span>
                        <span className="subject-progress__value">
                          {topic.students} {topic.students === 1 ? 'alumno' : 'alumnos'} · {topic.averageProgress}%
                        </span>
                      </div>
                      <ProgressBar
                        value={topic.averageProgress}
                        label={`Progreso promedio de ${topic.topicName}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Alumnos que requieren atencion */}
            <section className="card">
              <div className="card__head">
                <div>
                  <h3 className="card__title">Requieren atencion</h3>
                  <p className="card__subtitle">Sin actividad reciente o con errores pendientes</p>
                </div>
              </div>
              {!summary?.needsAttention?.length ? (
                <EmptyState
                  icon="shield"
                  title="Todo al dia"
                  text="Ningun alumno lleva mas de una semana sin estudiar ni acumula errores pendientes."
                  plain
                />
              ) : (
                <div className="subject-progress">
                  {summary.needsAttention.map((student) => (
                    <div className="subject-progress__row" key={student.uuid}>
                      <div className="subject-progress__meta">
                        <span className="subject-progress__name">
                          <Link to={`/docencia/${student.uuid}`}>
                            {student.firstName} {student.lastName}
                          </Link>
                        </span>
                        <span className="subject-progress__value">
                          {student.pendingErrors > 0 && (
                            <Badge tone="warning">{student.pendingErrors} errores</Badge>
                          )}{' '}
                          {student.lastSessionAt
                            ? `Ultima sesion ${formatDate(student.lastSessionAt)}`
                            : 'Sin sesiones registradas'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Materias con mas estudio acumulado */}
          {summary?.topSubjects?.length > 0 && (
            <section className="card" style={{ marginBottom: '1.1rem' }}>
              <div className="card__head">
                <div>
                  <h3 className="card__title">Materias con mas estudio</h3>
                  <p className="card__subtitle">Tiempo acumulado por todo el grupo</p>
                </div>
              </div>
              <div className="subject-progress">
                {summary.topSubjects.map((subject, index) => (
                  <div className="subject-progress__row" key={`${subject.subjectName}-${index}`}>
                    <div className="subject-progress__meta">
                      <span className="subject-progress__name">
                        <span
                          className="subject-progress__dot"
                          style={{ background: subject.subjectColor || '#8574d8' }}
                        />
                        {subject.subjectName}
                      </span>
                      <span className="subject-progress__value">
                        {formatMinutes(subject.minutes)} · {subject.students}{' '}
                        {subject.students === 1 ? 'alumno' : 'alumnos'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ------------------------------------------------------ Lista de alumnos */}
      <section className="card">
        <div className="card__head">
          <div>
            <h3 className="card__title">Alumnos</h3>
            <p className="card__subtitle">Selecciona un alumno para ver su progreso detallado</p>
          </div>
        </div>

        <div className="filter-bar" aria-label="Busqueda y orden de alumnos">
          <div className="filter-bar__search">
            <SearchInput
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Buscar por nombre o correo..."
              label="Buscar alumno"
            />
          </div>
          <div className="form-field" style={{ minWidth: '200px' }}>
            <label htmlFor="teacherSort">Ordenar por</label>
            <select
              id="teacherSort"
              name="sort"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(1);
              }}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {listError && (
          <div className="status status--error" role="alert" style={{ margin: '0.5rem 0' }}>
            {listError}
          </div>
        )}

        <DataTable
          columns={columns}
          rows={students}
          rowKey={(row) => row.uuid}
          loading={listLoading}
          loadingLabel="Cargando alumnos..."
          caption="Progreso de los alumnos"
          empty={
            <EmptyState
              icon="users"
              title="Sin alumnos"
              text={
                search
                  ? 'Ningun alumno coincide con la busqueda.'
                  : 'Todavia no hay alumnos registrados en la plataforma.'
              }
              plain
            />
          }
        />

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onChange={setPage}
        />
      </section>
    </section>
  );
}
