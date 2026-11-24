import { useState, useEffect, useCallback } from 'react';
import { getLearningProfile, updateLearningProfile } from '../services/learningProfile.js';

const SCALE_LABELS = {
  1: 'Total desacuerdo / Rara vez',
  2: 'Poco frecuente / Bajo',
  3: 'Moderado / A veces',
  4: 'Frecuente / Alto',
  5: 'Totalmente de acuerdo / Mi método principal',
};

/**
 * STUDIA - Learning Profile (Preferencias y Estrategias de Aprendizaje)
 * ------------------------------------------------------------------
 * Cuestionario interactivo basado en ciencia del aprendizaje.
 * NO clasifica al estudiante en categorías rígidas VAK (visual/auditivo/kinestésico).
 * Genera un perfil dinámico multidimensional que alimenta las recomendaciones
 * del cronómetro Smart Focus y del organizador Smart Planner.
 */
export default function LearningProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Estados del cuestionario
  const [stepByStepPref, setStepByStepPref] = useState(3);
  const [problemSolvingPref, setProblemSolvingPref] = useState(3);
  const [conceptMapsPref, setConceptMapsPref] = useState(3);
  const [questioningPref, setQuestioningPref] = useState(3);
  const [spacedRepetitionPref, setSpacedRepetitionPref] = useState(3);
  const [preferredSessionLength, setPreferredSessionLength] = useState(25);
  const [breakFrequencyMinutes, setBreakFrequencyMinutes] = useState(5);
  const [preferredStudyTime, setPreferredStudyTime] = useState('flexible');
  const [weeklyGoalMinutes, setWeeklyGoalMinutes] = useState(420);

  // Carga inicial
  const loadProfile = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await getLearningProfile();
      if (data) {
        setProfile(data);
        setStepByStepPref(data.stepByStepPref || 3);
        setProblemSolvingPref(data.problemSolvingPref || 3);
        setConceptMapsPref(data.conceptMapsPref || 3);
        setQuestioningPref(data.questioningPref || 3);
        setSpacedRepetitionPref(data.spacedRepetitionPref || 3);
        setPreferredSessionLength(data.preferredSessionLength || 25);
        setBreakFrequencyMinutes(data.breakFrequencyMinutes || 5);
        setPreferredStudyTime(data.preferredStudyTime || 'flexible');
        setWeeklyGoalMinutes(data.weeklyGoalMinutes || 420);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error cargando preferencias de aprendizaje.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        stepByStepPref,
        problemSolvingPref,
        conceptMapsPref,
        questioningPref,
        spacedRepetitionPref,
        preferredSessionLength,
        breakFrequencyMinutes,
        preferredStudyTime,
        weeklyGoalMinutes,
      };

      const updated = await updateLearningProfile(payload);
      setProfile(updated);
      setSuccessMessage('¡Tus preferencias han sido guardadas y tu perfil dinámico ha sido actualizado en MySQL!');
    } catch (err) {
      setErrorMessage(err.message || 'No se pudieron guardar las preferencias.');
    } finally {
      setSaving(false);
    }
  };

  const dynamicData = profile?.dynamicProfile || {};
  const dimensions = dynamicData.dimensions || {
    analisisEstructurado: stepByStepPref,
    resolucionPractica: problemSolvingPref,
    esquemasYConceptos: conceptMapsPref,
    recuerdoActivoPreguntas: questioningPref,
    repeticionEspaciada: spacedRepetitionPref,
  };

  if (loading) {
    return (
      <section className="page">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p className="hint">Cargando perfil de aprendizaje...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 className="page__title">Learning Profile — Preferencias de Aprendizaje</h2>
        <p className="page__text">
          Descubre y optimiza tus estrategias cognitivas reales. Modelo dinámico basado en evidencia científica.
        </p>
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
          BANNER DEL PERFIL DINÁMICO (SIN ETIQUETAS RÍGIDAS VAK)
          --------------------------------------------------------------------- */}
      <div className="archetype-banner">
        <span
          className="badge"
          style={{
            background: 'var(--white)',
            color: 'var(--lav-700)',
            borderColor: 'var(--lav-300)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Perfil Cognitivo Dinámico &middot; Sin clasificaciones rígidas
        </span>

        <h3 className="archetype-title">
          {dynamicData.archetypeTitle || 'Estratega Multidimensional Adaptativo'}
        </h3>

        <p style={{ maxWidth: '560px', margin: '0.5rem auto 1.25rem', color: 'var(--slate-600)', fontSize: '0.95rem' }}>
          La evidencia científica desaconseja clasificar a las personas en casillas fijas visuales o auditivas. Tu mente utiliza
          múltiples canales y estrategias según el tipo de materia, el nivel de dificultad y el objetivo de estudio.
        </p>

        {dynamicData.dominantTraits && dynamicData.dominantTraits.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1rem' }}>
            {dynamicData.dominantTraits.map((trait, idx) => (
              <span key={idx} className="badge badge--neutral" style={{ background: 'var(--white)', fontWeight: 600 }}>
                ★ {trait}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------------
          DESGLOSE DIMENSIONAL Y RECOMENDACIONES PERSONALIZADAS
          --------------------------------------------------------------------- */}
      <div className="grid grid--2" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <h3>Estrategias cognitivas clave</h3>
          <p className="hint">Puntuación multidimensional de tus hábitos de asimilación y práctica.</p>

          <div style={{ marginTop: '1.25rem' }}>
            <div className="dimension-row">
              <div className="dimension-header">
                <span>1. Explicaciones paso a paso</span>
                <strong>{dimensions.analisisEstructurado} / 5</strong>
              </div>
              <div className="dimension-bar">
                <div className="dimension-fill" style={{ width: `${(dimensions.analisisEstructurado / 5) * 100}%` }} />
              </div>
            </div>

            <div className="dimension-row">
              <div className="dimension-header">
                <span>2. Resolución de problemas práctica</span>
                <strong>{dimensions.resolucionPractica} / 5</strong>
              </div>
              <div className="dimension-bar">
                <div className="dimension-fill" style={{ width: `${(dimensions.resolucionPractica / 5) * 100}%`, background: 'var(--green-500)' }} />
              </div>
            </div>

            <div className="dimension-row">
              <div className="dimension-header">
                <span>3. Esquemas y mapas conceptuales</span>
                <strong>{dimensions.esquemasYConceptos} / 5</strong>
              </div>
              <div className="dimension-bar">
                <div className="dimension-fill" style={{ width: `${(dimensions.esquemasYConceptos / 5) * 100}%`, background: '#0284c7' }} />
              </div>
            </div>

            <div className="dimension-row">
              <div className="dimension-header">
                <span>4. Práctica mediante preguntas (recuerdo activo)</span>
                <strong>{dimensions.recuerdoActivoPreguntas} / 5</strong>
              </div>
              <div className="dimension-bar">
                <div className="dimension-fill" style={{ width: `${(dimensions.recuerdoActivoPreguntas / 5) * 100}%`, background: '#d97706' }} />
              </div>
            </div>

            <div className="dimension-row">
              <div className="dimension-header">
                <span>5. Repetición espaciada en el tiempo</span>
                <strong>{dimensions.repeticionEspaciada} / 5</strong>
              </div>
              <div className="dimension-bar">
                <div className="dimension-fill" style={{ width: `${(dimensions.repeticionEspaciada / 5) * 100}%`, background: '#7c3aed' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Recomendaciones generadas</h3>
          <p className="hint">Estrategias personalizadas para maximizar tu retención y rendimiento.</p>

          <ul className="list" style={{ marginTop: '1rem' }}>
            {(dynamicData.recommendations || [
              'Divide temas extensos en pasos manejables y apóyate en el cronómetro Smart Focus.',
              'Aplica recuperación activa contestando preguntas antes de revisar las notas.',
              'Distribuye repasos en intervalos regulares para afianzar en la memoria a largo plazo.',
            ]).map((rec, i) => (
              <li key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', padding: '0.6rem 0' }}>
                <span style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '1.1rem', lineHeight: 1 }}>
                  ✓
                </span>
                <span style={{ fontSize: '0.92rem', color: 'var(--slate-700)' }}>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ---------------------------------------------------------------------
          CUESTIONARIO INTERACTIVO (ACTUALIZAR PREFERENCIAS)
          --------------------------------------------------------------------- */}
      <div className="card">
        <h3>Cuestionario de preferencias y hábitos de estudio</h3>
        <p className="hint">
          Responde a las siguientes preguntas para ajustar tus preferencias. Puedes actualizarlas en cualquier momento.
        </p>

        <form onSubmit={handleSave} style={{ marginTop: '1.5rem' }}>
          {/* Pregunta 1: Paso a paso */}
          <div className="questionnaire-box">
            <label style={{ fontWeight: 600, color: 'var(--color-heading)' }}>
              1. Preferencia por explicaciones paso a paso
            </label>
            <p className="hint" style={{ margin: '0.2rem 0 0.5rem' }}>
              ¿Prefieres que los conceptos se te desglosen en secuencias lógicas detalladas paso a paso antes de resolver ejercicios?
            </p>
            <div className="scale-buttons">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`scale-btn ${stepByStepPref === val ? 'scale-btn--active' : ''}`}
                  onClick={() => setStepByStepPref(val)}
                >
                  {val} - {SCALE_LABELS[val].split('/')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Pregunta 2: Resolución de problemas */}
          <div className="questionnaire-box">
            <label style={{ fontWeight: 600, color: 'var(--color-heading)' }}>
              2. Resolución activa de problemas
            </label>
            <p className="hint" style={{ margin: '0.2rem 0 0.5rem' }}>
              ¿Aprendes y comprendes mejor enfrentándote de inmediato a problemas prácticos, ejercicios o retos aplicados?
            </p>
            <div className="scale-buttons">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`scale-btn ${problemSolvingPref === val ? 'scale-btn--active' : ''}`}
                  onClick={() => setProblemSolvingPref(val)}
                >
                  {val} - {SCALE_LABELS[val].split('/')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Pregunta 3: Esquemas y mapas conceptuales */}
          <div className="questionnaire-box">
            <label style={{ fontWeight: 600, color: 'var(--color-heading)' }}>
              3. Uso de esquemas, diagramas y mapas conceptuales
            </label>
            <p className="hint" style={{ margin: '0.2rem 0 0.5rem' }}>
              ¿Te resulta de gran ayuda resumir relaciones entre ideas mediante diagramas, tablas comparativas y mapas mentales?
            </p>
            <div className="scale-buttons">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`scale-btn ${conceptMapsPref === val ? 'scale-btn--active' : ''}`}
                  onClick={() => setConceptMapsPref(val)}
                >
                  {val} - {SCALE_LABELS[val].split('/')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Pregunta 4: Práctica mediante preguntas */}
          <div className="questionnaire-box">
            <label style={{ fontWeight: 600, color: 'var(--color-heading)' }}>
              4. Práctica mediante preguntas (recuerdo activo)
            </label>
            <p className="hint" style={{ margin: '0.2rem 0 0.5rem' }}>
              ¿Prefieres auto-evaluarte respondiendo preguntas, cuestionarios o flashcards antes que releer pasivamente tus apuntes?
            </p>
            <div className="scale-buttons">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`scale-btn ${questioningPref === val ? 'scale-btn--active' : ''}`}
                  onClick={() => setQuestioningPref(val)}
                >
                  {val} - {SCALE_LABELS[val].split('/')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Pregunta 5: Repetición espaciada */}
          <div className="questionnaire-box">
            <label style={{ fontWeight: 600, color: 'var(--color-heading)' }}>
              5. Repetición espaciada
            </label>
            <p className="hint" style={{ margin: '0.2rem 0 0.5rem' }}>
              ¿Distribuyes tus repasos a lo largo de varios días espaciados en el tiempo en lugar de estudiar todo en una sola sesión maratónica?
            </p>
            <div className="scale-buttons">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`scale-btn ${spacedRepetitionPref === val ? 'scale-btn--active' : ''}`}
                  onClick={() => setSpacedRepetitionPref(val)}
                >
                  {val} - {SCALE_LABELS[val].split('/')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Pregunta 6: Duración de sesiones */}
          <div className="questionnaire-box">
            <label style={{ fontWeight: 600, color: 'var(--color-heading)' }}>
              6. Duración preferida de bloques de estudio continuo
            </label>
            <p className="hint" style={{ margin: '0.2rem 0 0.5rem' }}>
              ¿Cuánto tiempo puedes concentrarte de manera continua con alta calidad antes de sentir fatiga mental?
            </p>
            <div className="scale-buttons">
              {[15, 25, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  className={`scale-btn ${preferredSessionLength === mins ? 'scale-btn--active' : ''}`}
                  onClick={() => setPreferredSessionLength(mins)}
                >
                  {mins} minutos {mins === 25 ? '(Pomodoro)' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Pregunta 7: Frecuencia de descansos */}
          <div className="questionnaire-box">
            <label style={{ fontWeight: 600, color: 'var(--color-heading)' }}>
              7. Duración de los descansos entre bloques
            </label>
            <p className="hint" style={{ margin: '0.2rem 0 0.5rem' }}>
              ¿De cuántos minutos prefieres que sean tus pausas activas para despejar la mente sin perder el ritmo?
            </p>
            <div className="scale-buttons">
              {[5, 10, 15, 20].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  className={`scale-btn ${breakFrequencyMinutes === mins ? 'scale-btn--active' : ''}`}
                  onClick={() => setBreakFrequencyMinutes(mins)}
                >
                  {mins} minutos de pausa
                </button>
              ))}
            </div>
          </div>

          {/* Pregunta 8 y 9: Horario y Meta Semanal */}
          <div className="grid grid--2" style={{ gap: '1.25rem', marginTop: '1rem' }}>
            <div className="form-group">
              <label htmlFor="prefStudyTime">8. Franja horaria preferida de mayor lucidez</label>
              <select
                id="prefStudyTime"
                className="input"
                value={preferredStudyTime}
                onChange={(e) => setPreferredStudyTime(e.target.value)}
              >
                <option value="early_morning">Madrugada / Primeras horas (06:00 - 09:00)</option>
                <option value="morning">Mañanas (09:00 - 13:00)</option>
                <option value="afternoon">Tardes (14:00 - 18:00)</option>
                <option value="evening">Atardecer / Noches tempranas (18:00 - 22:00)</option>
                <option value="night">Nocturno (22:00 en adelante)</option>
                <option value="flexible">Horario flexible / Variable</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="prefGoal">9. Meta semanal objetivo de estudio</label>
              <select
                id="prefGoal"
                className="input"
                value={weeklyGoalMinutes}
                onChange={(e) => setWeeklyGoalMinutes(Number(e.target.value))}
              >
                <option value="300">5 horas semanales (300 min)</option>
                <option value="420">7 horas semanales (420 min - 1h diaria)</option>
                <option value="600">10 horas semanales (600 min)</option>
                <option value="900">15 horas semanales (900 min)</option>
                <option value="1200">20 horas semanales (1200 min)</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="button button--primary"
              disabled={saving}
              style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}
            >
              {saving ? 'Guardando perfil...' : '✓ Guardar preferencias y actualizar perfil dinámico'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
