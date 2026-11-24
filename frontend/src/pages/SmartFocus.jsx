import { useState, useEffect, useRef, useCallback } from 'react';

import Portal from '../components/atoms/Portal.jsx';
import {
  getActiveSession,
  startSession,
  pauseSession,
  resumeSession,
  finishSession,
  discardSession,
  listSessions,
  getSessionStats,
} from '../services/studySession.js';
import { getSubjects, getTopics } from '../services/subject.js';

/**
 * STUDIA - Smart Focus (Cronómetro Inteligente)
 * ------------------------------------------------------------------
 * Módulo de cronómetro resiliente basado en marcas de tiempo (timestamps):
 * - No depende de que el navegador permanezca abierto.
 * - Registra hora de inicio y fin en el servidor.
 * - Calcula la duración a partir de marcas temporales reales.
 * - Controla estados con useState y mediciones temporales con useRef.
 * - Previene registros duplicados.
 * - Permite seleccionar materia, tema, describir actividad, registrar duración,
 *   productividad percibida y consultar el historial completo.
 */
export default function SmartFocus() {
  // -------------------------------------------------------------------------
  // 1. Estados con useState
  // -------------------------------------------------------------------------
  const [activeSession, setActiveSession] = useState(null);
  const [sessionState, setSessionState] = useState('idle'); // 'idle' | 'running' | 'paused'
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Formulario de configuración de sesión
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [sessionType, setSessionType] = useState('free');
  const [activityDescription, setActivityDescription] = useState('');

  // Modal de finalización y productividad percibida
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [perceivedProductivity, setPerceivedProductivity] = useState(4); // 1-5
  const [finishNotes, setFinishNotes] = useState('');
  const [mood, setMood] = useState('motivated');

  // Historial y métricas
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Estados de carga y feedback
  const [initialLoading, setInitialLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // -------------------------------------------------------------------------
  // 2. Referencias con useRef para control temporal y anti-duplicados
  // -------------------------------------------------------------------------
  const timerIntervalRef = useRef(null);
  const startTimeMsRef = useRef(null); // Timestamp epoch de inicio en ms
  const accumulatedPausedMsRef = useRef(0); // Total de milisegundos en pausa acumulados
  const pauseEpochMsRef = useRef(null); // Momento en que inició la pausa actual
  const isSubmittingRef = useRef(false); // Bandera atómica contra doble envío
  const clientSessionIdRef = useRef(null);

  // -------------------------------------------------------------------------
  // 3. Función de cálculo temporal exacto (resiliente al cierre del navegador)
  // -------------------------------------------------------------------------
  const calculateCurrentElapsed = useCallback(() => {
    if (!startTimeMsRef.current) return 0;
    const now = Date.now();

    // Si está en pausa, el tiempo transcurrido se congela en el momento de la pausa
    if (pauseEpochMsRef.current) {
      const activePausedMs = accumulatedPausedMsRef.current;
      const diffMs = Math.max(0, pauseEpochMsRef.current - startTimeMsRef.current - activePausedMs);
      return Math.floor(diffMs / 1000);
    }

    // Si está corriendo, calculamos el delta real contra el reloj de pared
    const diffMs = Math.max(0, now - startTimeMsRef.current - accumulatedPausedMsRef.current);
    return Math.floor(diffMs / 1000);
  }, []);

  // Detiene el intervalo del segundero de la interfaz
  const clearTimerInterval = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Inicia el tick del cronómetro visual
  const startTimerInterval = useCallback(() => {
    clearTimerInterval();
    // Actualización inmediata
    setElapsedSeconds(calculateCurrentElapsed());
    // Intervalo regular cada 1s
    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds(calculateCurrentElapsed());
    }, 1000);
  }, [calculateCurrentElapsed, clearTimerInterval]);

  // Carga materias del estudiante
  const loadSubjects = useCallback(async () => {
    try {
      const subs = await getSubjects();
      setSubjects(subs);
    } catch (err) {
      console.warn('Error cargando materias:', err.message);
    }
  }, []);

  // Carga temas cuando cambia la materia seleccionada
  const loadTopicsForSubject = useCallback(async (subjectId) => {
    if (!subjectId) {
      setTopics([]);
      setSelectedTopicId('');
      return;
    }
    try {
      const topList = await getTopics(subjectId);
      setTopics(topList);
    } catch (err) {
      console.warn('Error cargando temas:', err.message);
    }
  }, []);

  // Carga historial de sesiones
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const [histData, statsData] = await Promise.all([
        listSessions({ limit: 10 }),
        getSessionStats().catch(() => null),
      ]);
      setHistory(histData.sessions || []);
      setStats(statsData || null);
    } catch (err) {
      console.warn('Error cargando historial:', err.message);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // -------------------------------------------------------------------------
  // 4. Inicialización: Restaurar sesión activa desde el servidor
  // -------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      setInitialLoading(true);
      setErrorMessage('');
      try {
        await loadSubjects();
        await loadHistory();

        const active = await getActiveSession();
        if (!isMounted) return;

        if (active) {
          setActiveSession(active);
          setSelectedSubjectId(active.subjectId ? String(active.subjectId) : '');
          if (active.subjectId) {
            loadTopicsForSubject(active.subjectId);
          }
          setSelectedTopicId(active.topicId ? String(active.topicId) : '');
          setActivityDescription(active.notes || '');
          setSessionType(active.sessionType || 'free');

          // Inicializar referencias temporales con marcas de tiempo reales del servidor
          const startedEpoch = new Date(active.startedAt).getTime();
          startTimeMsRef.current = startedEpoch;
          accumulatedPausedMsRef.current = (active.pausedSeconds || 0) * 1000;

          if (active.isPaused) {
            pauseEpochMsRef.current = active.lastPausedAt
              ? new Date(active.lastPausedAt).getTime()
              : Date.now();
            setSessionState('paused');
            setElapsedSeconds(calculateCurrentElapsed());
          } else {
            pauseEpochMsRef.current = null;
            setSessionState('running');
            startTimerInterval();
          }
        } else {
          setSessionState('idle');
          setElapsedSeconds(0);
        }
      } catch (err) {
        if (isMounted) setErrorMessage(err.message);
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
      clearTimerInterval();
    };
  }, [clearTimerInterval, calculateCurrentElapsed, loadSubjects, loadTopicsForSubject, loadHistory, startTimerInterval]);

  // Manejar cambio de materia
  const handleSubjectChange = (e) => {
    const subId = e.target.value;
    setSelectedSubjectId(subId);
    loadTopicsForSubject(subId);
  };

  // -------------------------------------------------------------------------
  // 5. Iniciar sesión de estudio (Evita duplicados mediante bandera y token)
  // -------------------------------------------------------------------------
  const handleStart = async () => {
    if (isSubmittingRef.current || actionLoading) return;
    isSubmittingRef.current = true;
    setActionLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Generar token único para evitar duplicación por doble clic
      const clientSessionId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      clientSessionIdRef.current = clientSessionId;

      const payload = {
        subjectId: selectedSubjectId ? Number(selectedSubjectId) : null,
        topicId: selectedTopicId ? Number(selectedTopicId) : null,
        sessionType,
        notes: activityDescription.trim(),
        clientSessionId,
      };

      const session = await startSession(payload);
      setActiveSession(session);

      // Inicializar marcas temporales en refs
      const startMs = new Date(session.startedAt).getTime();
      startTimeMsRef.current = startMs;
      accumulatedPausedMsRef.current = 0;
      pauseEpochMsRef.current = null;

      setSessionState('running');
      startTimerInterval();
      setSuccessMessage('¡Sesión de estudio iniciada! Concentración en marcha.');
    } catch (err) {
      setErrorMessage(err.message || 'No se pudo iniciar la sesión.');
    } finally {
      setActionLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // -------------------------------------------------------------------------
  // 6. Pausar sesión
  // -------------------------------------------------------------------------
  const handlePause = async () => {
    if (!activeSession || isSubmittingRef.current || actionLoading) return;
    isSubmittingRef.current = true;
    setActionLoading(true);
    setErrorMessage('');

    try {
      const now = Date.now();
      pauseEpochMsRef.current = now;
      clearTimerInterval();

      const updated = await pauseSession(activeSession.id);
      setActiveSession(updated);
      setSessionState('paused');
      setElapsedSeconds(calculateCurrentElapsed());
    } catch (err) {
      setErrorMessage(err.message || 'No se pudo pausar la sesión.');
      // Reanudar intervalo visual si falló la petición
      startTimerInterval();
    } finally {
      setActionLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // -------------------------------------------------------------------------
  // 7. Reanudar sesión
  // -------------------------------------------------------------------------
  const handleResume = async () => {
    if (!activeSession || isSubmittingRef.current || actionLoading) return;
    isSubmittingRef.current = true;
    setActionLoading(true);
    setErrorMessage('');

    try {
      const updated = await resumeSession(activeSession.id);
      setActiveSession(updated);

      // Actualizar milisegundos en pausa
      accumulatedPausedMsRef.current = (updated.pausedSeconds || 0) * 1000;
      pauseEpochMsRef.current = null;

      setSessionState('running');
      startTimerInterval();
    } catch (err) {
      setErrorMessage(err.message || 'No se pudo reanudar la sesión.');
    } finally {
      setActionLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // -------------------------------------------------------------------------
  // 8. Abrir diálogo de finalización
  // -------------------------------------------------------------------------
  const handleOpenFinish = () => {
    setFinishNotes(activityDescription);
    setShowFinishModal(true);
  };

  // -------------------------------------------------------------------------
  // 9. Confirmar finalización y registrar productividad percibida
  // -------------------------------------------------------------------------
  const handleConfirmFinish = async () => {
    if (!activeSession || isSubmittingRef.current || actionLoading) return;
    isSubmittingRef.current = true;
    setActionLoading(true);
    setErrorMessage('');

    try {
      clearTimerInterval();

      await finishSession(activeSession.id, {
        focusScore: perceivedProductivity,
        notes: finishNotes.trim() || activityDescription.trim(),
        mood,
        subjectId: selectedSubjectId ? Number(selectedSubjectId) : null,
        topicId: selectedTopicId ? Number(selectedTopicId) : null,
      });

      // Resetear referencias y estados
      clearTimerInterval();
      startTimeMsRef.current = null;
      accumulatedPausedMsRef.current = 0;
      pauseEpochMsRef.current = null;
      clientSessionIdRef.current = null;

      setActiveSession(null);
      setSessionState('idle');
      setElapsedSeconds(0);
      setActivityDescription('');
      setShowFinishModal(false);
      setSuccessMessage('¡Excelente trabajo! Sesión guardada con éxito en tu historial.');

      // Recargar historial y estadísticas
      await loadHistory();
    } catch (err) {
      setErrorMessage(err.message || 'No se pudo guardar la finalización.');
    } finally {
      setActionLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // -------------------------------------------------------------------------
  // 10. Descartar sesión en curso
  // -------------------------------------------------------------------------
  const handleDiscard = async () => {
    if (!activeSession) return;
    if (!window.confirm('¿Seguro que deseas descartar esta sesión? No se registrará en tu historial.')) {
      return;
    }

    setActionLoading(true);
    try {
      clearTimerInterval();
      await discardSession(activeSession.id);

      startTimeMsRef.current = null;
      accumulatedPausedMsRef.current = 0;
      pauseEpochMsRef.current = null;
      clientSessionIdRef.current = null;

      setActiveSession(null);
      setSessionState('idle');
      setElapsedSeconds(0);
      setSuccessMessage('Sesión descartada.');
    } catch (err) {
      setErrorMessage(err.message || 'No se pudo descartar.');
    } finally {
      setActionLoading(false);
    }
  };

  // Formato HH:MM:SS
  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  };

  // Formato amigable de duración (ej. 45m 12s o 1h 20m)
  const formatFriendlyDuration = (minutes, seconds) => {
    const totalSecs = seconds || minutes * 60 || 0;
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) return `${h}h ${m}m ${s > 0 ? `${s}s` : ''}`.trim();
    if (m > 0) return `${m}m ${s > 0 ? `${s}s` : ''}`.trim();
    return `${s}s`;
  };

  const getProductivityLabel = (score) => {
    const map = {
      1: '1 - Muy baja (Muchas distracciones)',
      2: '2 - Baja (Concentración irregular)',
      3: '3 - Media (Estudio productivo normal)',
      4: '4 - Alta (Buen nivel de enfoque)',
      5: '5 - Muy alta (Enfoque total y flujo óptimo)',
    };
    return map[score] || `${score} / 5`;
  };

  if (initialLoading) {
    return (
      <section className="page">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p className="hint">Sincronizando cronómetro inteligente con el servidor...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="page__title">Smart Focus — Cronómetro Inteligente</h2>
          <p className="page__text">
            Mide y optimiza tus sesiones de estudio con cálculo preciso basado en marcas de tiempo del servidor.
          </p>
        </div>
        {sessionState !== 'idle' && (
          <button
            type="button"
            className="button button--ghost button--small"
            style={{ color: 'var(--color-danger)' }}
            onClick={handleDiscard}
            disabled={actionLoading}
          >
            Descartar sesión
          </button>
        )}
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
          HERO DEL CRONÓMETRO
          --------------------------------------------------------------------- */}
      <div className="timer-hero">
        <div style={{ marginBottom: '0.5rem' }}>
          {sessionState === 'idle' && (
            <span className="timer-status timer-status--idle">Listo para estudiar</span>
          )}
          {sessionState === 'running' && (
            <span className="timer-status timer-status--running">● En sesión activa</span>
          )}
          {sessionState === 'paused' && (
            <span className="timer-status timer-status--paused">❚❚ En pausa temporal</span>
          )}
        </div>

        <div className="timer-display" aria-live="polite">
          {formatTime(elapsedSeconds)}
        </div>

        {/* Metadatos activos durante la sesión */}
        {sessionState !== 'idle' && activeSession && (
          <div className="timer-meta">
            {activeSession.subjectName && (
              <div>
                Materia:{' '}
                <strong style={{ color: activeSession.subjectColor || 'inherit' }}>
                  {activeSession.subjectName}
                </strong>
              </div>
            )}
            {activeSession.topicName && (
              <div>
                Tema: <strong>{activeSession.topicName}</strong>
              </div>
            )}
            <div>
              Modalidad:{' '}
              <strong>
                {activeSession.sessionType === 'pomodoro'
                  ? 'Pomodoro'
                  : activeSession.sessionType === 'review'
                  ? 'Repaso'
                  : 'Libre'}
              </strong>
            </div>
            {activityDescription && (
              <div style={{ maxWidth: '400px', margin: '0 auto', fontStyle: 'italic' }}>
                &ldquo;{activityDescription}&rdquo;
              </div>
            )}
          </div>
        )}

        {/* Botones de control del cronómetro */}
        <div className="timer-controls">
          {sessionState === 'idle' && (
            <button
              type="button"
              className="button button--primary"
              onClick={handleStart}
              disabled={actionLoading}
            >
              ▶ Iniciar sesión de estudio
            </button>
          )}

          {sessionState === 'running' && (
            <>
              <button
                type="button"
                className="button button--secondary"
                onClick={handlePause}
                disabled={actionLoading}
              >
                ❚❚ Pausar
              </button>
              <button
                type="button"
                className="button button--primary"
                onClick={handleOpenFinish}
                disabled={actionLoading}
              >
                ✓ Finalizar y registrar
              </button>
            </>
          )}

          {sessionState === 'paused' && (
            <>
              <button
                type="button"
                className="button button--primary"
                onClick={handleResume}
                disabled={actionLoading}
              >
                ▶ Reanudar
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={handleOpenFinish}
                disabled={actionLoading}
              >
                ✓ Finalizar y registrar
              </button>
            </>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------------
          CONFIGURACIÓN DE LA ACTIVIDAD (Editable cuando está libre o en curso)
          --------------------------------------------------------------------- */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3>Configuración de la actividad</h3>
        <p className="hint">
          {sessionState === 'idle'
            ? 'Define la materia, tema y objetivo de estudio antes de pulsar Iniciar.'
            : 'Puedes complementar los detalles de tu actividad mientras estudias.'}
        </p>

        <div className="grid grid--2" style={{ gap: '1.25rem' }}>
          <div className="form-group">
            <label htmlFor="subjectSelect">Seleccionar materia</label>
            <select
              id="subjectSelect"
              className="input"
              value={selectedSubjectId}
              onChange={handleSubjectChange}
              disabled={sessionState !== 'idle' && !!activeSession?.subjectId}
            >
              <option value="">-- Sin materia asignada (General) --</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `(${s.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="topicSelect">Seleccionar tema</label>
            <select
              id="topicSelect"
              className="input"
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              disabled={!selectedSubjectId || (sessionState !== 'idle' && !!activeSession?.topicId)}
            >
              <option value="">
                {selectedSubjectId ? '-- Selecciona un tema (Opcional) --' : '-- Elige primero una materia --'}
              </option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid--2" style={{ gap: '1.25rem', marginTop: '1rem' }}>
          <div className="form-group">
            <label htmlFor="sessionTypeSelect">Modalidad de estudio</label>
            <select
              id="sessionTypeSelect"
              className="input"
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value)}
              disabled={sessionState !== 'idle'}
            >
              <option value="free">Cronómetro Libre</option>
              <option value="pomodoro">Técnica Pomodoro (Bloque de enfoque)</option>
              <option value="review">Repaso Activo</option>
              <option value="exam_practice">Práctica para Examen</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="activityDesc">Describir la actividad o metas</label>
            <input
              id="activityDesc"
              type="text"
              className="input"
              placeholder="Ej. Resolver guía de derivadas parciales, memorizar conceptos..."
              value={activityDescription}
              onChange={(e) => setActivityDescription(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------
          MÉTRICAS Y RESUMEN RÁPIDO
          --------------------------------------------------------------------- */}
      {stats && (
        <div className="grid grid--3" style={{ gap: '1rem', marginBottom: '2rem' }}>
          <div className="card" style={{ padding: '1.2rem', textAlign: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--slate-500)', fontWeight: 600 }}>TIEMPO HOY</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.3rem' }}>
              {formatFriendlyDuration(stats.today.minutes, stats.today.seconds)}
            </div>
            <span className="hint">{stats.today.sessions} sesiones completadas</span>
          </div>

          <div className="card" style={{ padding: '1.2rem', textAlign: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--slate-500)', fontWeight: 600 }}>ÚLTIMOS 7 DÍAS</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--green-600)', marginTop: '0.3rem' }}>
              {Math.round((stats.week.minutes / 60) * 10) / 10} h
            </div>
            <span className="hint">{stats.week.sessions} sesiones acumuladas</span>
          </div>

          <div className="card" style={{ padding: '1.2rem', textAlign: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--slate-500)', fontWeight: 600 }}>PRODUCTIVIDAD MEDIA</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f59e0b', marginTop: '0.3rem' }}>
              ★ {stats.overall.averageFocusScore || '5.0'} / 5
            </div>
            <span className="hint">{stats.overall.totalSessions} sesiones históricas</span>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------
          HISTORIAL DE SESIONES GUARDADAS
          --------------------------------------------------------------------- */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0 }}>Historial de sesiones</h3>
            <p className="hint" style={{ margin: '0.2rem 0 0' }}>
              Registro de tiempo y productividad percibida guardados en MySQL.
            </p>
          </div>
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={loadHistory}
            disabled={historyLoading}
          >
            {historyLoading ? 'Cargando...' : '↻ Actualizar'}
          </button>
        </div>

        {history.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-500)' }}>
            Aún no has finalizado ninguna sesión de estudio. ¡Inicia el cronómetro y guarda tu primera sesión!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Materia / Tema</th>
                  <th>Modalidad</th>
                  <th>Duración</th>
                  <th>Productividad</th>
                  <th>Notas / Actividad</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{new Date(item.startedAt).toLocaleDateString()}</strong>
                      <div className="hint">
                        {new Date(item.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      {item.subjectName ? (
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
                      ) : (
                        <span className="hint">General</span>
                      )}
                      {item.topicName && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--slate-600)', marginTop: '0.2rem' }}>
                          {item.topicName}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge--neutral">
                        {item.sessionType === 'pomodoro'
                          ? 'Pomodoro'
                          : item.sessionType === 'review'
                          ? 'Repaso'
                          : 'Libre'}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--color-heading)' }}>
                        {formatFriendlyDuration(item.durationMinutes, item.durationSeconds)}
                      </strong>
                    </td>
                    <td>
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                        {'★'.repeat(item.focusScore || 5)}
                        {'☆'.repeat(5 - (item.focusScore || 5))}
                      </span>
                      <div className="hint">{item.focusScore || 5}/5</div>
                    </td>
                    <td style={{ maxWidth: '280px', whiteSpace: 'pre-wrap', fontSize: '0.88rem' }}>
                      {item.notes || <span className="hint">Sin notas</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------------
          MODAL DE FINALIZACIÓN Y EVALUACIÓN DE PRODUCTIVIDAD
          --------------------------------------------------------------------- */}
      {showFinishModal && (
        <Portal>
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-dialog__header">
              <h3 style={{ margin: 0 }}>Finalizar sesión de estudio</h3>
              <button
                type="button"
                className="modal-dialog__close"
                onClick={() => setShowFinishModal(false)}
                aria-label="Cerrar modal"
              >
                &times;
              </button>
            </div>

            <div style={{ textAlign: 'center', margin: '1rem 0' }}>
              <span className="hint">Tiempo total registrado</span>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                {formatFriendlyDuration(0, elapsedSeconds)}
              </div>
            </div>

            <div className="form-group" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
                ¿Cuál fue tu nivel de productividad percibida?
              </label>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`star-rating__btn ${star <= perceivedProductivity ? 'star-rating__btn--active' : ''}`}
                    onClick={() => setPerceivedProductivity(star)}
                    aria-label={`Calificar ${star} de 5 estrellas`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--slate-600)', marginTop: '0.25rem' }}>
                {getProductivityLabel(perceivedProductivity)}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="moodSelect">Estado de ánimo durante la sesión</label>
              <select
                id="moodSelect"
                className="input"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
              >
                <option value="motivated">Motivado y con energía</option>
                <option value="neutral">Neutro / Enfoque constante</option>
                <option value="tired">Cansado pero constante</option>
                <option value="distracted">Con distracciones</option>
                <option value="stressed">Con estrés o presión</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="finishNotes">Resumen o descripción de la actividad final</label>
              <textarea
                id="finishNotes"
                className="input"
                rows={3}
                placeholder="¿Qué temas cubriste? ¿Qué ejercicios completaste o aprendiste?"
                value={finishNotes}
                onChange={(e) => setFinishNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => setShowFinishModal(false)}
                disabled={actionLoading}
              >
                Volver al cronómetro
              </button>
              <button
                type="button"
                className="button button--primary"
                onClick={handleConfirmFinish}
                disabled={actionLoading}
              >
                {actionLoading ? 'Guardando...' : 'Guardar sesión en historial'}
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}
    </section>
  );
}
