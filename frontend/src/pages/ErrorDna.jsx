import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import StatCard from '../components/atoms/StatCard.jsx';
import EmptyState from '../components/atoms/EmptyState.jsx';
import ChartCard from '../components/molecules/ChartCard.jsx';
import { getErrorDnaAnalysis } from '../services/errorDna.js';
import { formatDate, formatMonth, todayISO } from '../utils/format.js';

/** Colores coherentes con la paleta del sistema de diseno. */
const COLORS = {
  primary: '#8574d8',
  danger: '#c0564f',
  success: '#4fa77b',
  slate: '#64748b',
  axis: '#64748b',
  grid: '#ece7e1',
};

/** Rango de fechas rapidos. */
const PRESETS = [
  { id: '30d', label: 'Ultimos 30 dias', days: 29 },
  { id: '90d', label: 'Ultimos 90 dias', days: 89 },
  { id: 'all', label: 'Todo el historial', days: null },
];

/** Fecha de hoy desplazada N dias atras en formato YYYY-MM-DD (zona local). */
const isoDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

/**
 * STUDIA - Error DNA (patrones de errores)
 * ------------------------------------------------------------------
 * Analiza el diario de errores REAL del estudiante para descubrir su "huella"
 * de error: tipos dominantes, materias y temas mas afectados, patrones que se
 * repiten y su evolucion en el tiempo. Todo proviene de la tabla `errors` en
 * MySQL; si no hay registros, la interfaz lo indica sin inventar cifras.
 */
export default function ErrorDna() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [activePreset, setActivePreset] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      setAnalysis(await getErrorDnaAnalysis(params));
    } catch (err) {
      setError(err.message || 'No se pudo analizar tus patrones de errores.');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

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

  const typeData = useMemo(
    () =>
      (analysis?.typeDistribution || [])
        .filter((row) => row.count > 0)
        .map((row) => ({ name: row.label, errores: row.count, percentage: row.percentage })),
    [analysis]
  );

  const trendData = useMemo(
    () =>
      (analysis?.trend || []).map((row) => ({
        label: formatMonth(row.month).slice(0, 3),
        total: row.count,
        resueltos: row.resolved,
      })),
    [analysis]
  );

  const totals = analysis?.totals || null;
  const signature = analysis?.signature || null;
  const bySubject = analysis?.bySubject || [];
  const byTopic = analysis?.byTopic || [];
  const recurring = analysis?.recurring || [];

  return (
    <section className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Error DNA — Tu huella de errores</h2>
          <p className="page__text">
            Detecta los patrones que se repiten en tus errores reales: los tipos dominantes,
            las materias y temas mas afectados y las cadenas que conviene corregir de raiz.
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------------------- Filtros */}
      <div className="filter-bar" aria-label="Filtros de fecha">
        <div className="filter-bar__search" style={{ gap: '0.6rem', display: 'flex', flexWrap: 'wrap' }}>
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
          <label className="hint" htmlFor="dnaFrom" style={{ display: 'block' }}>
            Desde
          </label>
          <input
            id="dnaFrom"
            type="date"
            className="input"
            value={from}
            max={to || undefined}
            onChange={(event) => {
              setFrom(event.target.value);
              setActivePreset('custom');
            }}
          />
        </div>
        <div style={{ minWidth: '160px' }}>
          <label className="hint" htmlFor="dnaTo" style={{ display: 'block' }}>
            Hasta
          </label>
          <input
            id="dnaTo"
            type="date"
            className="input"
            value={to}
            min={from || undefined}
            onChange={(event) => {
              setTo(event.target.value);
              setActivePreset('custom');
            }}
          />
        </div>
        {(from || to) && (
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={() => {
              setFrom('');
              setTo('');
              setActivePreset('all');
            }}
          >
            ✕ Limpiar
          </button>
        )}
      </div>

      {error && (
        <div className="status status--error" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p className="hint">Analizando tus patrones de errores...</p>
        </div>
      ) : !analysis?.hasData ? (
        <div className="card">
          <EmptyState
            icon="bug"
            title="Aun no hay errores registrados"
            text="Registra tus errores en el Diario de errores. Error DNA analizara esos datos reales para revelar tus patrones y ayudarte a corregirlos."
            plain
          />
        </div>
      ) : (
        <>
          {/* --------------------------------------------------- Resumen */}
          <div className="grid grid--stats" style={{ marginBottom: '1.1rem' }}>
            <StatCard label="Errores en el periodo" value={totals.total} icon="bug" />
            <StatCard label="Pendientes" value={totals.pending} hint="Sin trabajar todavia" icon="alert" tone="slate" />
            <StatCard label="En revision" value={totals.inReview} icon="clock" tone="slate" />
            <StatCard label="Superados" value={totals.resolved} icon="check" tone="success" />
            <StatCard
              label="Tasa de resolucion"
              value={`${signature.resolutionRate}%`}
              hint={`${totals.resolved} de ${totals.total} superados`}
              icon="trend"
              tone="success"
            />
            <StatCard label="Alta severidad" value={totals.highSeverity} icon="shield" />
          </div>

          {/* --------------------------------------------------- Firma */}
          {signature.dominant.length > 0 && (
            <div className="card">
              <div className="card__head">
                <div>
                  <h3 className="card__title">Tu firma de error</h3>
                  <p className="card__subtitle">
                    Los tipos de error que mas se repiten en tu historial.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                {signature.dominant.map((item) => (
                  <span key={item.errorType} className="badge badge--danger" style={{ padding: '0.35rem 0.7rem' }}>
                    {item.label} · {item.count} ({item.percentage}%)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* --------------------------------------------------- Distribucion por tipo */}
          <ChartCard title="Distribucion por tipo de error" subtitle="Cuantos errores de cada tipo has registrado">
            {typeData.length === 0 ? (
              <EmptyState icon="bug" title="Sin tipos de error" text="No hay errores clasificados en este periodo." plain />
            ) : (
              <div className="chart" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeData} layout="vertical" margin={{ top: 4, right: 20, left: 12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: COLORS.axis }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: COLORS.axis }} />
                    <Tooltip formatter={(value) => [`${value} error(es)`, 'Total']} />
                    <Bar dataKey="errores" radius={[0, 6, 6, 0]} fill={COLORS.danger} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <div className="grid grid--2">
            {/* --------------------------------------------- Por materia */}
            <ChartCard title="Errores por materia" subtitle="Donde se concentran tus fallos">
              {bySubject.length === 0 ? (
                <EmptyState icon="book" title="Sin materias" text="Asigna una materia a tus errores para ver su distribucion." plain />
              ) : (
                <div className="subject-progress">
                  {bySubject.map((row) => (
                    <div className="subject-progress__row" key={`${row.subjectName}-${row.subjectId}`}>
                      <div className="subject-progress__meta">
                        <span className="subject-progress__name">
                          <span className="subject-progress__dot" style={{ background: row.subjectColor }} />
                          {row.subjectName}
                        </span>
                        <span className="subject-progress__value">
                          {row.count} error(es) · {row.pending} pendiente(s)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>

            {/* --------------------------------------------- Por tema */}
            <ChartCard title="Errores por tema" subtitle="Los temas mas fragiles">
              {byTopic.length === 0 ? (
                <EmptyState icon="layers" title="Sin temas" text="Asocia tus errores a un tema para identificar los mas fragiles." plain />
              ) : (
                <div className="subject-progress">
                  {byTopic.map((row) => (
                    <div className="subject-progress__row" key={`${row.topicName}-${row.topicId}`}>
                      <div className="subject-progress__meta">
                        <span className="subject-progress__name">
                          {row.topicName}
                          <span className="badge badge--info">{row.subjectName}</span>
                        </span>
                        <span className="subject-progress__value">{row.count} error(es)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>
          </div>

          {/* --------------------------------------------------- Recurrentes */}
          <ChartCard title="Patrones recurrentes" subtitle="Errores que has repetido 2 o mas veces">
            {recurring.length === 0 ? (
              <EmptyState
                icon="check"
                title="Sin patrones recurrentes"
                text="No repites errores sobre el mismo ejercicio o tema. Excelente."
                plain
              />
            ) : (
              <div className="subject-progress">
                {recurring.map((item) => (
                  <div className="subject-progress__row" key={`${item.pattern}-${item.lastOccurred}`}>
                    <div className="subject-progress__meta">
                      <span className="subject-progress__name">
                        <span className="subject-progress__dot" style={{ background: item.subjectColor }} />
                        {item.pattern}
                        <span className="badge badge--danger">{item.dominantTypeLabel}</span>
                        {item.subjectName && <span className="badge badge--info">{item.subjectName}</span>}
                      </span>
                      <span className="subject-progress__value">
                        {item.occurrences} veces · ultimo {formatDate(item.lastOccurred)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>

          {/* --------------------------------------------------- Evolucion */}
          <ChartCard title="Evolucion de errores" subtitle="Errores registrados y superados en los ultimos 6 meses">
            {trendData.length === 0 ? (
              <EmptyState icon="trend" title="Sin historial" text="No hay datos suficientes para mostrar la evolucion." plain />
            ) : (
              <div className="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dnaArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.danger} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={COLORS.danger} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: COLORS.axis }} />
                    <YAxis tick={{ fontSize: 11, fill: COLORS.axis }} width={40} allowDecimals={false} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Errores"
                      stroke={COLORS.danger}
                      strokeWidth={2}
                      fill="url(#dnaArea)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </>
      )}
    </section>
  );
}
