import { useCallback, useEffect, useMemo, useState } from 'react';

import EmptyState from '../components/atoms/EmptyState.jsx';
import ProgressBar from '../components/atoms/ProgressBar.jsx';
import StatCard from '../components/atoms/StatCard.jsx';
import ChartCard from '../components/molecules/ChartCard.jsx';
import { getKnowledgeMap } from '../services/knowledgeMap.js';

/** Tono de insignia segun la banda de dominio. */
const BAND_TONE = {
  mastered: 'success',
  strong: 'success',
  developing: 'info',
  weak: 'warning',
  critical: 'danger',
};

const STATUS_LABELS = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  mastered: 'Dominado',
  needs_review: 'Repasar',
};

/**
 * STUDIA - Knowledge Map (mapa de dominio)
 * ------------------------------------------------------------------
 * Visualiza el dominio de cada tema combinando progreso declarado, precision
 * real en ejercicios, errores registrados y tarjetas de memoria (datos reales
 * de MySQL). Describe ademas como se relacionan los temas dentro de cada
 * materia y senala los puntos fuertes y debiles.
 */
export default function KnowledgeMap() {
  const [map, setMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setMap(await getKnowledgeMap());
    } catch (err) {
      setError(err.message || 'No se pudo cargar tu mapa de conocimiento.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const nodesBySubject = useMemo(() => {
    if (!map?.nodes) return [];
    const groups = new Map();
    map.nodes.forEach((node) => {
      if (!groups.has(node.subjectId)) groups.set(node.subjectId, []);
      groups.get(node.subjectId).push(node);
    });
    return Array.from(groups.entries()).map(([subjectId, list]) => ({
      subjectId,
      subjectName: list[0].subjectName,
      subjectColor: list[0].subjectColor,
      averageMastery: Math.round(list.reduce((sum, node) => sum + node.masteryScore, 0) / list.length),
      topics: list,
    }));
  }, [map]);

  const summary = map?.summary || null;

  return (
    <section className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Knowledge Map — Tu dominio por tema</h2>
          <p className="page__text">
            Mapa de dominio construido con tu progreso declarado, tu precision real en
            ejercicios, tus errores y tus tarjetas de memoria. Descubre que temas dominas
            y cuales conviene reforzar antes de avanzar.
          </p>
        </div>
      </div>

      {error && (
        <div className="status status--error" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p className="hint">Calculando tu mapa de dominio...</p>
        </div>
      ) : !map?.hasData ? (
        <div className="card">
          <EmptyState
            icon="map"
            title="Aun no tienes temas en tu mapa"
            text="Crea materias y temas, y registra tu progreso. El mapa combinara esa informacion con tus ejercicios, errores y tarjetas para mostrar tu dominio real."
            plain
          />
        </div>
      ) : (
        <>
          {/* --------------------------------------------------- Resumen */}
          <div className="grid grid--stats" style={{ marginBottom: '1.1rem' }}>
            <StatCard label="Temas totales" value={summary.totalTopics} icon="layers" />
            <StatCard
              label="Dominio medio"
              value={`${summary.averageMastery}%`}
              hint="Promedio de todos tus temas"
              icon="trend"
              tone="slate"
            />
            <StatCard label="Dominados" value={summary.mastered} icon="award" tone="success" />
            <StatCard label="En curso" value={summary.inProgress} icon="clock" />
            <StatCard label="Para repasar" value={summary.needsReview} icon="alert" />
            <StatCard label="Pendientes" value={summary.pending} icon="inbox" tone="slate" />
          </div>

          <div className="grid grid--2">
            {/* --------------------------------------------- Por materia */}
            <ChartCard title="Dominio por materia" subtitle="Promedio de dominio de tus temas">
              <div className="subject-progress">
                {map.subjects.map((subject) => (
                  <div className="subject-progress__row" key={subject.subjectId}>
                    <div className="subject-progress__meta">
                      <span className="subject-progress__name">
                        <span className="subject-progress__dot" style={{ background: subject.subjectColor }} />
                        {subject.subjectName}
                      </span>
                      <span className="subject-progress__value">
                        {subject.averageMastery}% · {subject.topicCount} tema(s)
                      </span>
                    </div>
                    <ProgressBar value={subject.averageMastery} success={subject.averageMastery >= 75} label={`Dominio en ${subject.subjectName}`} />
                  </div>
                ))}
              </div>
            </ChartCard>

            {/* --------------------------------------------- Puntos clave */}
            <ChartCard title="Puntos clave" subtitle="Que reforzar y que celebrar">
              <h4 className="card__title" style={{ marginBottom: '0.4rem' }}>
                Necesitan refuerzo
              </h4>
              {map.weakest.length === 0 ? (
                <p className="hint">Ningun tema por debajo del dominio solido.</p>
              ) : (
                <div className="subject-progress">
                  {map.weakest.map((node) => (
                    <div className="subject-progress__row" key={node.topicId}>
                      <div className="subject-progress__meta">
                        <span className="subject-progress__name">
                          <span className="subject-progress__dot" style={{ background: node.subjectColor }} />
                          {node.name}
                          <span className={`badge badge--${BAND_TONE[node.band.id]}`}>{node.band.label}</span>
                        </span>
                        <span className="subject-progress__value">{node.masteryScore}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h4 className="card__title" style={{ margin: '1rem 0 0.4rem' }}>
                Tus fortalezas
              </h4>
              <div className="subject-progress">
                {map.strongest.map((node) => (
                  <div className="subject-progress__row" key={node.topicId}>
                    <div className="subject-progress__meta">
                      <span className="subject-progress__name">
                        <span className="subject-progress__dot" style={{ background: node.subjectColor }} />
                        {node.name}
                        <span className={`badge badge--${BAND_TONE[node.band.id]}`}>{node.band.label}</span>
                      </span>
                      <span className="subject-progress__value">{node.masteryScore}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* --------------------------------------------------- Nodos por materia */}
          {nodesBySubject.map((group) => (
            <div className="card" key={group.subjectId}>
              <div className="card__head">
                <div>
                  <h3 className="card__title">
                    <span className="subject-progress__dot" style={{ background: group.subjectColor }} />{' '}
                    {group.subjectName}
                  </h3>
                  <p className="card__subtitle">
                    {group.topics.length} tema(s) · dominio medio {group.averageMastery}%
                  </p>
                </div>
              </div>

              <div className="subject-progress">
                {group.topics.map((node) => (
                  <div className="subject-progress__row" key={node.topicId}>
                    <div className="subject-progress__meta">
                      <span className="subject-progress__name">
                        {node.name}
                        <span className={`badge badge--${BAND_TONE[node.band.id]}`}>{node.band.label}</span>
                        <span className="badge">{STATUS_LABELS[node.status] || node.status}</span>
                      </span>
                      <span className="subject-progress__value">
                        {node.masteryScore}%
                        {node.accuracy !== null ? ` · precision ${node.accuracy}%` : ''}
                        {node.errorCount > 0 ? ` · ${node.errorCount} error(es)` : ''}
                        {node.cards > 0 ? ` · ${node.masteredCards}/${node.cards} tarjetas` : ''}
                      </span>
                    </div>
                    <ProgressBar
                      value={node.masteryScore}
                      success={node.masteryScore >= 75}
                      label={`Dominio de ${node.name}`}
                    />
                  </div>
                ))}
              </div>

              {group.topics.length > 1 && (
                <p className="hint" style={{ marginTop: '0.75rem' }}>
                  Relacion entre temas (orden del temario):{' '}
                  {group.topics.map((node) => node.name).join(' → ')}.
                </p>
              )}
            </div>
          ))}
        </>
      )}
    </section>
  );
}
