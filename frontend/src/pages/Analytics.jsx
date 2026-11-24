import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import ChartCard from '../components/molecules/ChartCard.jsx';
import StatCard from '../components/atoms/StatCard.jsx';
import EmptyState from '../components/atoms/EmptyState.jsx';
import { getAnalyticsOverview, getWeeklyReport } from '../services/analytics.js';
import { formatDate, formatMinutes, todayISO } from '../utils/format.js';

/** Colores de graficas coherentes con la paleta del sistema de diseno. */
const COLORS = {
  primary: '#8574d8',
  success: '#4fa77b',
  danger: '#c0564f',
  slate: '#64748b',
  axis: '#64748b',
  grid: '#ece7e1',
};

/** Rango de fechas rapidos que el estudiante puede aplicar. */
const PRESETS = [
  { id: '7d', label: 'Ultimos 7 dias', days: 6 },
  { id: '30d', label: 'Ultimos 30 dias', days: 29 },
  { id: '90d', label: 'Ultimos 90 dias', days: 89 },
  { id: 'all', label: 'Todo el historial', days: null },
];

const EVOLUTION_TABS = [
  { id: 'daily', label: 'Diaria (30 dias)' },
  { id: 'weekly', label: 'Semanal (8 semanas)' },
  { id: 'monthly', label: 'Mensual (12 meses)' },
];

/** Fecha de hoy desplazada N dias atras en formato YYYY-MM-DD (zona local). */
const isoDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

/** Normaliza cada serie de evolucion a { label, minutos, sesiones }. */
const toEvolutionSeries = (rows, kind) =>
  (rows || []).map((row) => {
    let label = '';
    if (kind === 'daily') label = String(row.date || '').slice(5);
    else if (kind === 'weekly') {
      const start = String(row.weekStart || '');
      label = start ? `${start.slice(8)}/${start.slice(5, 7)}` : `S${row.yearWeek || ''}`;
    } else {
      const month = String(row.month || '');
      label = month ? `${month.slice(5)}/${month.slice(2, 4)}` : '';
    }
    return {
      label,
      minutos: Number(row.minutes || 0),
      sesiones: Number(row.sessions || 0),
    };
  });

/**
 * STUDIA - Academic Analytics (Estadisticas)
 * ------------------------------------------------------------------
 * Panel de analisis academico construido EXCLUSIVAMENTE con informacion real
 * almacenada en MySQL. Incluye tiempo total de estudio, sesiones, tiempo por
 * materia, ejercicios, porcentaje de aciertos, errores (recurrentes), objetivos
 * cumplidos, evolucion diaria/semanal/mensual y el informe semanal comparativo.
 * Cuando no existen datos suficientes se indica de forma honesta, sin inventar.
 */
export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(true);
  const [error, setError] = useState('');

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [activePreset, setActivePreset] = useState('all');
  const [evolutionTab, setEvolutionTab] = useState('daily');

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = `${to} 23:59:59`;
      const data = await getAnalyticsOverview(params);
      setOverview(data);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las estadisticas.');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  const loadReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const data = await getWeeklyReport({ date: todayISO() });
      setReport(data);
    } catch {
      setReport(null);
    } finally {
      setReportLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const applyPreset = (preset) => {
    setActivePreset(preset.id);
    if (preset.days === null) {
      setFrom('');
      setTo('');
    } else {
      setFrom(isoDaysAgo(preset.days));
      setTo(todayISO());
    }
  };

  const clearFilters = () => {
    setActivePreset('all');
    setFrom('');
    setTo('');
  };

  const metrics = overview?.overview || null;
  const timeBySubject = overview?.timeBySubject || [];
  const recurringErrors = overview?.recurringErrors || [];

  const evolutionSeries = useMemo(
    () => toEvolutionSeries(overview?.evolution?.[evolutionTab], evolutionTab),
    [overview, evolutionTab]
  );

  const subjectChartData = useMemo(
    () =>
      timeBySubject.map((row) => ({
        name: row.subjectName,
        minutos: Number(row.totalMinutes || 0),
        color: row.subjectColor || COLORS.primary,
      })),
    [timeBySubject]
  );

  const accuracyData = useMemo(() => {
    if (!metrics || !metrics.exercisesAttempted) return [];
    const correct = Number(metrics.exercisesCorrect || 0);
    const incorrect = Math.max(Number(metrics.exercisesAttempted) - correct, 0);
    return [
      { name: 'Correctas', value: correct, color: COLORS.success },
      { name: 'Incorrectas', value: incorrect, color: COLORS.danger },
    ];
  }, [metrics]);

  // Honestidad de datos: solo hay analisis cuando existe actividad real.
  const hasAnyActivity =
    !!metrics &&
    (metrics.totalSessions > 0 ||
      metrics.exercisesAttempted > 0 ||
      metrics.totalErrors > 0 ||
      metrics.goalsCompleted > 0);

  const comparisons = report?.comparisons;
  const dateRangeLabel =
    from || to
      ? `${from ? formatDate(from) : 'Inicio'} — ${to ? formatDate(to) : 'Hoy'}`
      : 'Todo el historial';

  return (
    <section className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Academic Analytics — Estadisticas</h2>
          <p className="page__text">
            Analisis de tu progreso academico construido solo con tus datos reales
            almacenados en MySQL. Filtra por fechas y revisa tu evolucion.
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------------------- Filtros */}
      <div className="filter-bar" aria-label="Filtros de fecha">
        <div className="filter-bar__search" style={{ gap: '0.6rem', display: 'flex' }}>
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`button button--small ${activePreset === preset.id ? 'button--primary' : 'button--ghost'}`}
              onClick={() => applyPreset(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div style={{ minWidth: '160px' }}>
          <label className="hint" htmlFor="anFrom" style={{ display: 'block' }}>
            Desde
          </label>
          <input
            id="anFrom"
            type="date"
            className="input"
            value={from}
            max={to || undefined}
            onChange={(e) => {
              setFrom(e.target.value);
              setActivePreset('custom');
            }}
          />
        </div>

        <div style={{ minWidth: '160px' }}>
          <label className="hint" htmlFor="anTo" style={{ display: 'block' }}>
            Hasta
          </label>
          <input
            id="anTo"
            type="date"
            className="input"
            value={to}
            min={from || undefined}
            onChange={(e) => {
              setTo(e.target.value);
              setActivePreset('custom');
            }}
          />
        </div>

        {(from || to) && (
          <button type="button" className="button button--ghost button--small" onClick={clearFilters}>
            ✕ Limpiar
          </button>
        )}
      </div>

      <p className="hint" style={{ marginTop: '-0.4rem' }}>
        Rango analizado: <strong>{dateRangeLabel}</strong>
      </p>

      {error && (
        <div className="status status--error" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p className="hint">Calculando tus estadisticas academicas...</p>
        </div>
      ) : !hasAnyActivity ? (
        <div className="card">
          <EmptyState
            icon="chart"
            title="Aun no hay datos de estudio en este rango"
            text="Cuando registres sesiones de estudio, resuelvas ejercicios, completes objetivos o registres errores, aqui apareceran tus estadisticas reales."
            plain
          />
        </div>
      ) : (
        <>
          {/* --------------------------------------------------- Tarjetas resumen */}
          <div className="grid grid--stats" style={{ marginBottom: '1.1rem' }}>
            <StatCard
              label="Tiempo total de estudio"
              value={formatMinutes(metrics.totalStudyMinutes)}
              hint={`${metrics.totalStudyHours} horas acumuladas`}
              icon="clock"
            />
            <StatCard
              label="Sesiones realizadas"
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
              label="Ejercicios realizados"
              value={metrics.exercisesAttempted}
              hint={`${metrics.exercisesCorrect} respuestas correctas`}
              icon="pencil"
            />
            <StatCard
              label="Porcentaje de aciertos"
              value={metrics.exercisesAttempted ? `${metrics.accuracyPercentage}%` : null}
              hint={`${metrics.exercisesCorrect} de ${metrics.exercisesAttempted} intentos`}
              icon="trend"
              tone="success"
            />
            <StatCard
              label="Errores registrados"
              value={metrics.totalErrors}
              hint={`${metrics.pendingErrors} pendientes · ${metrics.understoodErrors} comprendidos`}
              icon="alert"
            />
            <StatCard
              label="Errores recurrentes"
              value={recurringErrors.length}
              hint="Ejercicios o temas con 2 o mas fallos"
              icon="alert"
              tone="slate"
            />
            <StatCard
              label="Objetivos cumplidos"
              value={metrics.goalsCompleted}
              hint={`${metrics.dailyGoalsCompleted} diarios · ${metrics.weeklyGoalsCompleted} semanales`}
              icon="award"
              tone="success"
            />
          </div>

          {/* --------------------------------------------------- Informe semanal */}
          <section className="card">
            <div className="card__head">
              <div>
                <h3 className="card__title">Informe semanal</h3>
                <p className="card__subtitle">
                  {report
                    ? `${formatDate(report.weekRange.from)} al ${formatDate(report.weekRange.to)}`
                    : 'Semana en curso'}
                </p>
              </div>
            </div>

            {reportLoading ? (
              <p className="hint">Generando informe semanal...</p>
            ) : !report ? (
              <p className="hint">No se pudo generar el informe semanal.</p>
            ) : (
              <>
                <div className="summary-metrics">
                  <div className="summary-metric">
                    <div className="summary-metric__value">
                      {formatMinutes(report.metrics.studyMinutes)}
                    </div>
                    <span className="summary-metric__label">Tiempo de estudio</span>
                  </div>
                  <div className="summary-metric">
                    <div className="summary-metric__value">{report.metrics.sessions}</div>
                    <span className="summary-metric__label">Sesiones</span>
                  </div>
                  <div className="summary-metric">
                    <div className="summary-metric__value">{report.metrics.tasksCompleted}</div>
                    <span className="summary-metric__label">Tareas completadas</span>
                  </div>
                  <div className="summary-metric">
                    <div className="summary-metric__value">{report.metrics.exercisesAttempted}</div>
                    <span className="summary-metric__label">Ejercicios</span>
                  </div>
                  <div className="summary-metric">
                    <div className="summary-metric__value">
                      {report.metrics.accuracyPercentage === null
                        ? '—'
                        : `${report.metrics.accuracyPercentage}%`}
                    </div>
                    <span className="summary-metric__label">Aciertos</span>
                  </div>
                  <div className="summary-metric">
                    <div className="summary-metric__value">{report.metrics.errorsRecorded}</div>
                    <span className="summary-metric__label">Errores nuevos</span>
                  </div>
                </div>

                {report.topSubject && (
                  <p className="hint">
                    Materia con mas estudio esta semana:{' '}
                    <strong>{report.topSubject.subjectName}</strong> (
                    {formatMinutes(report.topSubject.minutes)}).
                  </p>
                )}

                <div
                  className={`status ${comparisons?.hasSufficientData ? 'status--ok' : 'status--info'}`}
                  style={{ marginTop: '0.75rem' }}
                >
                  {comparisons?.summaryText ||
                    'Sin datos historicos suficientes para comparar con semanas anteriores.'}
                </div>

                {comparisons?.hasSufficientData && (
                  <div className="summary-metrics" style={{ marginTop: '0.9rem' }}>
                    <div className="summary-metric">
                      <div className="summary-metric__value">
                        {comparisons.minuteDelta >= 0 ? '+' : ''}
                        {comparisons.minuteDelta} min
                      </div>
                      <span className="summary-metric__label">Variacion de tiempo</span>
                    </div>
                    <div className="summary-metric">
                      <div className="summary-metric__value">
                        {comparisons.sessionDelta >= 0 ? '+' : ''}
                        {comparisons.sessionDelta}
                      </div>
                      <span className="summary-metric__label">Variacion de sesiones</span>
                    </div>
                    <div className="summary-metric">
                      <div className="summary-metric__value">
                        {comparisons.taskDelta >= 0 ? '+' : ''}
                        {comparisons.taskDelta}
                      </div>
                      <span className="summary-metric__label">Variacion de tareas</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          {/* --------------------------------------------------- Evolucion */}
          <ChartCard
            title="Evolucion del tiempo de estudio"
            subtitle="Minutos estudiados por periodo (datos reales)"
            actions={
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {EVOLUTION_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`button button--small ${evolutionTab === tab.id ? 'button--primary' : 'button--ghost'}`}
                    onClick={() => setEvolutionTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            }
          >
            {evolutionSeries.length === 0 ? (
              <EmptyState
                icon="trend"
                title="Sin sesiones en este periodo"
                text="No hay sesiones de estudio finalizadas para mostrar la evolucion."
                plain
              />
            ) : (
              <div className="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolutionSeries} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="analyticsArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: COLORS.axis }} />
                    <YAxis tick={{ fontSize: 11, fill: COLORS.axis }} width={44} />
                    <Tooltip formatter={(value) => [`${value} min`, 'Estudio']} />
                    <Area
                      type="monotone"
                      dataKey="minutos"
                      stroke={COLORS.primary}
                      strokeWidth={2}
                      fill="url(#analyticsArea)"
                      name="Minutos"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <div className="grid grid--2">
            {/* --------------------------------------------- Tiempo por materia */}
            <ChartCard title="Tiempo por materia" subtitle="Minutos estudiados por materia">
              {subjectChartData.length === 0 ? (
                <EmptyState
                  icon="book"
                  title="Sin tiempo por materia"
                  text="Asigna una materia a tus sesiones de estudio para ver su distribucion."
                  plain
                />
              ) : (
                <div className="chart" style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={subjectChartData}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: COLORS.axis }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        tick={{ fontSize: 11, fill: COLORS.axis }}
                      />
                      <Tooltip formatter={(value) => [`${value} min`, 'Estudio']} />
                      <Bar dataKey="minutos" radius={[0, 6, 6, 0]}>
                        {subjectChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color || COLORS.primary} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            {/* --------------------------------------------- Precisión */}
            <ChartCard title="Precision en ejercicios" subtitle="Respuestas correctas vs incorrectas">
              {accuracyData.length === 0 ? (
                <EmptyState
                  icon="pencil"
                  title="Sin intentos de ejercicios"
                  text="Cuando resuelvas ejercicios podras ver tu porcentaje de aciertos."
                  plain
                />
              ) : (
                <div className="chart" style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={accuracyData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                      >
                        {accuracyData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip formatter={(value) => [`${value} intentos`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {accuracyData.length > 0 && (
                <p className="hint" style={{ textAlign: 'center' }}>
                  Precision global: <strong>{metrics.accuracyPercentage}%</strong>
                </p>
              )}
            </ChartCard>
          </div>

          {/* --------------------------------------------------- Errores recurrentes */}
          <ChartCard
            title="Errores recurrentes"
            subtitle="Ejercicios o temas con 2 o mas errores registrados"
          >
            {recurringErrors.length === 0 ? (
              <EmptyState
                icon="shield"
                title="Sin errores recurrentes"
                text="No hay errores repetidos. Sigue asi o registra tus errores en el diario."
                plain
              />
            ) : (
              <div className="subject-progress">
                {recurringErrors.map((item) => (
                  <div className="subject-progress__row" key={`${item.title}-${item.lastOccurred}`}>
                    <div className="subject-progress__meta">
                      <span className="subject-progress__name">
                        <span
                          className="subject-progress__dot"
                          style={{ background: item.subjectColor || COLORS.primary }}
                        />
                        {item.title}
                        {item.subjectName && (
                          <span className="badge badge--info">{item.subjectName}</span>
                        )}
                      </span>
                      <span className="subject-progress__value">
                        {item.occurrences} errores · ultimo {formatDate(item.lastOccurred)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        </>
      )}
    </section>
  );
}
