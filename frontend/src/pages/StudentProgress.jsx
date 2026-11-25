/**
 * STUDIA - Ficha de progreso de un alumno (vista del profesor)
 * ------------------------------------------------------------------
 * Detalle de SOLO LECTURA de un estudiante: su analitica academica, las
 * materias con sus temas (lo que esta viendo), el informe de la semana y sus
 * ultimas sesiones. Los numeros provienen de las mismas consultas que ve el
 * propio estudiante; no se recalcula ni se estima nada.
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import StatCard from '../components/atoms/StatCard.jsx';
import ProgressBar from '../components/atoms/ProgressBar.jsx';
import Badge from '../components/atoms/Badge.jsx';
import EmptyState from '../components/atoms/EmptyState.jsx';
import DataTable from '../components/molecules/DataTable.jsx';
import { getStudentProgress } from '../services/teacher.js';
import { formatDate, formatMinutes } from '../utils/format.js';

/** Etiqueta y color de cada estado de tema. */
const TOPIC_STATUS = {
  pending: { label: 'Pendiente', tone: 'neutral' },
  in_progress: { label: 'En curso', tone: 'primary' },
  needs_review: { label: 'Por repasar', tone: 'warning' },
  mastered: { label: 'Dominado', tone: 'success' },
};

const STUDENT_STATUS = {
  pending: { label: 'Cuenta pendiente', tone: 'warning' },
  active: { label: 'Cuenta activa', tone: 'success' },
  suspended: { label: 'Cuenta suspendida', tone: 'danger' },
};

const EDUCATION_LABELS = {
  primary: 'Primaria',
  secondary: 'Secundaria',
  high_school: 'Bachillerato',
  undergraduate: 'Universidad',
  postgraduate: 'Posgrado',
  self_taught: 'Autodidacta',
};

const SESSION_COLUMNS = [
  {
    key: 'startedAt',
    header: 'Fecha',
    render: (row) => formatDate(row.startedAt),
  },
  {
    key: 'subject',
    header: 'Materia',
    render: (row) => row.subjectName || <span className="hint">Sin materia</span>,
  },
  {
    key: 'topic',
    header: 'Tema',
    render: (row) => row.topicName || <span className="hint">Sin tema</span>,
  },
  {
    key: 'duration',
    header: 'Duracion',
    render: (row) => formatMinutes(row.durationMinutes),
  },
  {
    key: 'focus',
    header: 'Concentracion',
    align: 'center',
    render: (row) => (row.focusScore === null ? <span className="hint">—</span> : `${row.focusScore}/5`),
  },
];

export default function StudentProgress() {
  const { uuid } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const result = await getStudentProgress(uuid);
        if (!cancelled) {
          setData(result);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uuid]);

  if (loading) {
    return (
      <section className="page">
        <div className="card">
          <p className="hint">Cargando la ficha del alumno...</p>
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="page">
        <div className="status status--error" role="alert">
          {error || 'No se pudo cargar la ficha del alumno.'}
        </div>
        <p className="hint">
          <Link to="/docencia">Volver a Docencia</Link>
        </p>
      </section>
    );
  }

  const { student, analytics, weeklyReport, subjects, recentSessions } = data;
  const metrics = analytics?.overview || null;
  const recurringErrors = analytics?.recurringErrors || [];
  const statusInfo = STUDENT_STATUS[student.status] || { label: student.status, tone: 'neutral' };
  const hasActivity =
    !!metrics &&
    (metrics.totalSessions > 0 || metrics.exercisesAttempted > 0 || metrics.totalErrors > 0);

  return (
    <section className="page page--wide">
      <p className="hint" style={{ marginBottom: '0.4rem' }}>
        <Link to="/docencia">← Volver a Docencia</Link>
      </p>

      <div className="page__head">
        <div>
          <h2 className="page__title">
            {student.firstName} {student.lastName}
          </h2>
          <p className="page__text">
            {student.email} · <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------- Ficha de cuenta */}
      <section className="card" style={{ marginBottom: '1.1rem' }}>
        <div className="card__head">
          <div>
            <h3 className="card__title">Datos del alumno</h3>
            <p className="card__subtitle">Informacion de su perfil academico</p>
          </div>
        </div>
        <table className="table">
          <tbody>
            <tr>
              <th scope="row">Nivel educativo</th>
              <td>{EDUCATION_LABELS[student.educationLevel] || student.educationLevel || 'No especificado'}</td>
            </tr>
            <tr>
              <th scope="row">Institucion</th>
              <td>{student.institution || 'No especificada'}</td>
            </tr>
            <tr>
              <th scope="row">Programa / grado</th>
              <td>{student.academicProgram || student.gradeLevel || 'No especificado'}</td>
            </tr>
            <tr>
              <th scope="row">Objetivo principal</th>
              <td>{student.mainGoal || 'No especificado'}</td>
            </tr>
            <tr>
              <th scope="row">Meta diaria</th>
              <td>
                {student.dailyGoalMinutes ? `${student.dailyGoalMinutes} minutos` : 'No definida'}
              </td>
            </tr>
            <tr>
              <th scope="row">Alta en la plataforma</th>
              <td>{formatDate(student.createdAt)}</td>
            </tr>
            <tr>
              <th scope="row">Ultimo acceso</th>
              <td>{student.lastLoginAt ? formatDate(student.lastLoginAt) : 'Sin registros'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ------------------------------------------------------------ Analitica */}
      {!hasActivity ? (
        <div className="card" style={{ marginBottom: '1.1rem' }}>
          <EmptyState
            icon="chart"
            title="Aun no hay actividad registrada"
            text="Este alumno todavia no ha registrado sesiones de estudio, ejercicios ni errores."
            plain
          />
        </div>
      ) : (
        <div className="grid grid--stats" style={{ marginBottom: '1.1rem' }}>
          <StatCard
            label="Tiempo de estudio"
            value={formatMinutes(metrics.totalStudyMinutes)}
            hint={`${metrics.totalStudyHours} horas acumuladas`}
            icon="clock"
          />
          <StatCard
            label="Sesiones"
            value={metrics.totalSessions}
            hint={
              metrics.totalSessions > 0
                ? `Concentracion media ${metrics.averageFocusScore || 0}/5`
                : 'Sin sesiones finalizadas'
            }
            icon="target"
            tone="slate"
          />
          <StatCard
            label="Ejercicios"
            value={metrics.exercisesAttempted}
            hint={`${metrics.exercisesCorrect} respuestas correctas`}
            icon="pencil"
          />
          <StatCard
            label="Aciertos"
            value={metrics.exercisesAttempted ? `${metrics.accuracyPercentage}%` : null}
            hint={`${metrics.exercisesCorrect} de ${metrics.exercisesAttempted} intentos`}
            icon="trend"
            tone="success"
          />
          <StatCard
            label="Errores"
            value={metrics.totalErrors}
            hint={`${metrics.pendingErrors} pendientes · ${metrics.understoodErrors} comprendidos`}
            icon="alert"
          />
          <StatCard
            label="Objetivos cumplidos"
            value={metrics.goalsCompleted}
            hint={`${metrics.dailyGoalsCompleted} diarios · ${metrics.weeklyGoalsCompleted} semanales`}
            icon="award"
            tone="success"
          />
        </div>
      )}

      {/* ------------------------------------------------- Materias y sus temas */}
      <section className="card" style={{ marginBottom: '1.1rem' }}>
        <div className="card__head">
          <div>
            <h3 className="card__title">Que esta viendo</h3>
            <p className="card__subtitle">Materias del alumno con sus temas y el progreso de cada uno</p>
          </div>
        </div>

        {!subjects.length ? (
          <EmptyState
            icon="book"
            title="Sin materias registradas"
            text="El alumno aun no ha creado materias ni temas."
            plain
          />
        ) : (
          <div className="subject-progress">
            {subjects.map((subject) => (
              <div className="subject-progress__row" key={subject.id} style={{ display: 'block' }}>
                <div className="subject-progress__meta">
                  <span className="subject-progress__name">
                    <span
                      className="subject-progress__dot"
                      style={{ background: subject.color || '#8574d8' }}
                    />
                    {subject.name}
                    <Badge tone="info">{subject.topics.length} temas</Badge>
                  </span>
                  <span className="subject-progress__value">
                    {formatMinutes(subject.minutes)} · {subject.averageProgress}% promedio
                  </span>
                </div>

                {subject.topics.length === 0 ? (
                  <p className="hint">Sin temas registrados en esta materia.</p>
                ) : (
                  <div style={{ marginTop: '0.5rem' }}>
                    {subject.topics.map((topic) => {
                      const info = TOPIC_STATUS[topic.status] || { label: topic.status, tone: 'neutral' };
                      return (
                        <div key={topic.id} style={{ marginBottom: '0.6rem' }}>
                          <div className="subject-progress__meta">
                            <span className="subject-progress__name">
                              {topic.name}
                              <Badge tone={info.tone}>{info.label}</Badge>
                            </span>
                            <span className="subject-progress__value">{topic.progressPercent}%</span>
                          </div>
                          <ProgressBar
                            value={topic.progressPercent}
                            success={topic.status === 'mastered'}
                            label={`Progreso de ${topic.name}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------ Informe semanal */}
      {weeklyReport && (
        <section className="card" style={{ marginBottom: '1.1rem' }}>
          <div className="card__head">
            <div>
              <h3 className="card__title">Informe de la semana</h3>
              <p className="card__subtitle">
                {formatDate(weeklyReport.weekRange.from)} al {formatDate(weeklyReport.weekRange.to)}
              </p>
            </div>
          </div>

          <div className="summary-metrics">
            <div className="summary-metric">
              <div className="summary-metric__value">{formatMinutes(weeklyReport.metrics.studyMinutes)}</div>
              <span className="summary-metric__label">Tiempo de estudio</span>
            </div>
            <div className="summary-metric">
              <div className="summary-metric__value">{weeklyReport.metrics.sessions}</div>
              <span className="summary-metric__label">Sesiones</span>
            </div>
            <div className="summary-metric">
              <div className="summary-metric__value">{weeklyReport.metrics.tasksCompleted}</div>
              <span className="summary-metric__label">Tareas completadas</span>
            </div>
            <div className="summary-metric">
              <div className="summary-metric__value">{weeklyReport.metrics.exercisesAttempted}</div>
              <span className="summary-metric__label">Ejercicios</span>
            </div>
            <div className="summary-metric">
              <div className="summary-metric__value">
                {weeklyReport.metrics.accuracyPercentage === null
                  ? '—'
                  : `${weeklyReport.metrics.accuracyPercentage}%`}
              </div>
              <span className="summary-metric__label">Aciertos</span>
            </div>
            <div className="summary-metric">
              <div className="summary-metric__value">{weeklyReport.metrics.errorsRecorded}</div>
              <span className="summary-metric__label">Errores nuevos</span>
            </div>
          </div>

          {weeklyReport.topSubject && (
            <p className="hint">
              Materia con mas estudio esta semana: <strong>{weeklyReport.topSubject.subjectName}</strong> (
              {formatMinutes(weeklyReport.topSubject.minutes)}).
            </p>
          )}

          <div
            className={`status ${weeklyReport.comparisons?.hasSufficientData ? 'status--ok' : 'status--info'}`}
            style={{ marginTop: '0.75rem' }}
          >
            {weeklyReport.comparisons?.summaryText ||
              'Sin datos historicos suficientes para comparar con semanas anteriores.'}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------- Errores recurrentes */}
      {recurringErrors.length > 0 && (
        <section className="card" style={{ marginBottom: '1.1rem' }}>
          <div className="card__head">
            <div>
              <h3 className="card__title">Errores recurrentes</h3>
              <p className="card__subtitle">Ejercicios o temas con 2 o mas fallos registrados</p>
            </div>
          </div>
          <div className="subject-progress">
            {recurringErrors.map((item, index) => (
              <div className="subject-progress__row" key={`${item.title}-${index}`}>
                <div className="subject-progress__meta">
                  <span className="subject-progress__name">
                    <span
                      className="subject-progress__dot"
                      style={{ background: item.subjectColor || '#8574d8' }}
                    />
                    {item.title}
                    {item.subjectName && <Badge tone="info">{item.subjectName}</Badge>}
                  </span>
                  <span className="subject-progress__value">
                    {item.occurrences} errores · ultimo {formatDate(item.lastOccurred)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------- Ultimas sesiones */}
      <section className="card">
        <div className="card__head">
          <div>
            <h3 className="card__title">Ultimas sesiones de estudio</h3>
            <p className="card__subtitle">Registro cronologico de las sesiones finalizadas mas recientes</p>
          </div>
        </div>

        <DataTable
          columns={SESSION_COLUMNS}
          rows={recentSessions}
          rowKey={(row) => row.id}
          caption="Ultimas sesiones de estudio del alumno"
          empty={
            <EmptyState
              icon="clock"
              title="Sin sesiones registradas"
              text="El alumno aun no ha finalizado ninguna sesion de estudio."
              plain
            />
          }
        />
      </section>
    </section>
  );
}
