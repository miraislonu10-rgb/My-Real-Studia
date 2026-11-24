import { useCallback, useEffect, useMemo, useState } from 'react';

import Icon from '../components/atoms/Icon.jsx';
import EmptyState from '../components/atoms/EmptyState.jsx';
import { consultAiCompanion } from '../services/ai.js';
import { getSubjects, getTopics } from '../services/subject.js';

/** Acciones pedagógicas que ofrece el asistente. */
const ACTIONS = [
  { id: 'explain_concept', label: 'Explicar concepto', icon: 'book', hint: 'Explica un concepto con un ejemplo práctico.' },
  { id: 'generate_exercise', label: 'Generar ejercicio', icon: 'pencil', hint: 'Crea un ejercicio de práctica sobre un tema.' },
  { id: 'provide_hint', label: 'Dar pista', icon: 'sparkles', hint: 'Pista progresiva sin revelar la respuesta.' },
  { id: 'explain_wrong_answer', label: 'Explicar error', icon: 'alert', hint: 'Explica por qué falló una respuesta.' },
  { id: 'analyze_frequent_errors', label: 'Analizar errores', icon: 'chart', hint: 'Analiza tus errores reales registrados.' },
  { id: 'recommend_theory', label: 'Recomendar teoría', icon: 'link', hint: 'Recomienda teoría según tus materias.' },
  { id: 'personalized_review', label: 'Plan de repaso', icon: 'target', hint: 'Diseña un repaso personalizado.' },
  { id: 'general_help', label: 'Consulta libre', icon: 'sparkles', hint: 'Pregunta lo que necesites.' },
];

/** Acciones que no requieren datos de entrada (usan tus registros reales). */
const CONTEXT_ONLY_ACTIONS = ['analyze_frequent_errors', 'recommend_theory', 'personalized_review'];

/** Convierte un texto con markdown ligero en nodos de React (sin innerHTML). */
const renderInline = (text, keyPrefix) =>
  text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((chunk, index) => {
    const key = `${keyPrefix}-${index}`;
    if (chunk.startsWith('**') && chunk.endsWith('**')) {
      return <strong key={key}>{chunk.slice(2, -2)}</strong>;
    }
    if (chunk.startsWith('`') && chunk.endsWith('`')) {
      return <code key={key}>{chunk.slice(1, -1)}</code>;
    }
    return <span key={key}>{chunk}</span>;
  });

const RichText = ({ text }) => {
  const lines = String(text || '').split('\n');
  const blocks = [];
  let list = [];

  const flushList = () => {
    if (list.length > 0) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="ai-answer__list">
          {list.map((item, index) => (
            <li key={`li-${index}`}>{renderInline(item, `li-${index}`)}</li>
          ))}
        </ul>
      );
      list = [];
    }
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      return;
    }
    if (line.startsWith('### ')) {
      flushList();
      blocks.push(
        <h4 key={`h-${index}`} className="ai-answer__heading">
          {renderInline(line.slice(4), `h-${index}`)}
        </h4>
      );
      return;
    }
    if (/^([-*]|\d+\.)\s+/.test(line)) {
      list.push(line.replace(/^([-*]|\d+\.)\s+/, ''));
      return;
    }
    flushList();
    blocks.push(
      <p key={`p-${index}`} className="ai-answer__paragraph">
        {renderInline(line, `p-${index}`)}
      </p>
    );
  });
  flushList();

  return <div className="ai-answer">{blocks}</div>;
};

/**
 * STUDIA - STUDIA AI Companion
 * ------------------------------------------------------------------
 * Asistente pedagógico que se comunica con el proveedor de IA a través del
 * backend (las claves viven solo en variables de entorno del servidor).
 * La interfaz distingue siempre entre:
 *   - el contexto académico REAL del estudiante (registros en MySQL), y
 *   - el texto sugerido por el modelo de IA o por el motor local de STUDIA.
 */
export default function AiCompanion() {
  const [action, setAction] = useState('explain_concept');
  const [prompt, setPrompt] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [exerciseText, setExerciseText] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');

  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const activeAction = useMemo(() => ACTIONS.find((item) => item.id === action), [action]);

  useEffect(() => {
    getSubjects()
      .then(setSubjects)
      .catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    if (!subjectId) {
      setTopics([]);
      setTopicId('');
      return;
    }
    getTopics(subjectId)
      .then(setTopics)
      .catch(() => setTopics([]));
  }, [subjectId]);

  const selectAction = useCallback((id) => {
    setAction(id);
    setError('');
    setResult(null);
  }, []);

  const buildPayload = () => {
    const payload = { action };
    if (prompt.trim()) payload.prompt = prompt.trim();
    const subject = subjects.find((item) => String(item.id) === String(subjectId));
    if (subject) payload.subjectName = subject.name;
    const topic = topics.find((item) => String(item.id) === String(topicId));
    if (topic) payload.topicName = topic.name;
    if (exerciseText.trim()) payload.exerciseText = exerciseText.trim();
    if (userAnswer.trim()) payload.userAnswer = userAnswer.trim();
    if (correctAnswer.trim()) payload.correctAnswer = correctAnswer.trim();
    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await consultAiCompanion(buildPayload());
      setResult(data);
    } catch (err) {
      if (err.code === 'TOO_MANY_AI_REQUESTS') {
        setError('Has alcanzado el límite de consultas por minuto. Espera un momento e inténtalo de nuevo.');
      } else {
        setError(err.message || 'No se pudo obtener respuesta del asistente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = () => {
    if (!result) return null;
    if (result.aiGenerated || ['gemini_ai', 'openai_ai'].includes(result.source)) {
      return (
        <span className="badge badge--success">
          IA activa · {result.provider} · {result.model}
        </span>
      );
    }
    if (result.isAiConfigured) {
      return <span className="badge badge--warning">Respaldo local (el proveedor de IA no respondió)</span>;
    }
    return <span className="badge badge--info">Motor local MY REAL STUDIA (sin credenciales de IA)</span>;
  };

  return (
    <section className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">MY REAL STUDIA AI Companion</h2>
          <p className="page__text">
            Tutor pedagógico inteligente. El backend actúa como pasarela segura hacia el proveedor de IA:
            las claves API permanecen en las variables de entorno del servidor y nunca llegan al navegador.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------ Selector de acción */}
      <div className="card">
        <div className="card__head">
          <div>
            <h3 className="card__title">¿En qué te ayudo hoy?</h3>
            <p className="card__subtitle">{activeAction?.hint}</p>
          </div>
        </div>

        <div className="grid grid--stats">
          {ACTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`button ${action === item.id ? 'button--primary' : 'button--ghost'}`}
              onClick={() => selectAction(item.id)}
              style={{ justifyContent: 'flex-start', gap: '0.5rem' }}
            >
              <Icon name={item.icon} size={16} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------ Formulario */}
      <form className="card" onSubmit={handleSubmit}>
        <div className="card__head">
          <div>
            <h3 className="card__title">Consulta: {activeAction?.label}</h3>
            {CONTEXT_ONLY_ACTIONS.includes(action) && (
              <p className="card__subtitle">
                Esta función analiza tus registros reales (materias, errores y perfil) almacenados en MySQL.
              </p>
            )}
          </div>
        </div>

        {action === 'explain_concept' && (
          <div className="form-field">
            <label htmlFor="aiConcept">
              Concepto o tema a explicar
            </label>
            <input
              id="aiConcept"
              className="input"
              value={prompt}
              maxLength={4000}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ej. Teorema de Pitágoras, la célula, las leyes de Newton..."
            />
          </div>
        )}

        {action === 'generate_exercise' && (
          <>
            <div className="form-field">
              <label htmlFor="aiSubject">
                Materia
              </label>
              <select
                id="aiSubject"
                className="input"
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
              >
                <option value="">Selecciona una materia</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="aiTopic">
                Tema
              </label>
              <select
                id="aiTopic"
                className="input"
                value={topicId}
                onChange={(event) => setTopicId(event.target.value)}
                disabled={!subjectId}
              >
                <option value="">Selecciona un tema (opcional)</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="aiExerciseFocus">
                Enfoque o dificultad deseada (opcional)
              </label>
              <input
                id="aiExerciseFocus"
                className="input"
                value={prompt}
                maxLength={4000}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ej. nivel intermedio, con gráficos, dos incógnitas..."
              />
            </div>
          </>
        )}

        {action === 'provide_hint' && (
          <div className="form-field">
            <label htmlFor="aiHintExercise">
              Enunciado del ejercicio
            </label>
            <textarea
              id="aiHintExercise"
              className="input"
              rows={4}
              value={exerciseText}
              maxLength={4000}
              onChange={(event) => setExerciseText(event.target.value)}
              placeholder="Pega aquí el ejercicio para recibir una pista."
            />
          </div>
        )}

        {action === 'explain_wrong_answer' && (
          <>
            <div className="form-field">
              <label htmlFor="aiWrongExercise">
                Enunciado del ejercicio
              </label>
              <textarea
                id="aiWrongExercise"
                className="input"
                rows={3}
                value={exerciseText}
                maxLength={4000}
                onChange={(event) => setExerciseText(event.target.value)}
              />
            </div>
            <div className="grid grid--2">
              <div className="form-field">
                <label htmlFor="aiUserAnswer">
                  Tu respuesta
                </label>
                <input
                  id="aiUserAnswer"
                  className="input"
                  value={userAnswer}
                  maxLength={2000}
                  onChange={(event) => setUserAnswer(event.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="aiCorrectAnswer">
                  Respuesta correcta
                </label>
                <input
                  id="aiCorrectAnswer"
                  className="input"
                  value={correctAnswer}
                  maxLength={2000}
                  onChange={(event) => setCorrectAnswer(event.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {action === 'general_help' && (
          <div className="form-field">
            <label htmlFor="aiGeneral">
              Tu consulta
            </label>
            <textarea
              id="aiGeneral"
              className="input"
              rows={4}
              value={prompt}
              maxLength={4000}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Escribe tu duda académica."
            />
          </div>
        )}

        {error && (
          <div className="status status--error" role="alert" style={{ marginBottom: '0.75rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="button button--primary" type="submit" disabled={loading}>
            <Icon name="sparkles" size={16} />
            {loading ? 'Consultando al asistente...' : 'Consultar al asistente'}
          </button>
          <span className="hint">Límite: 20 consultas por minuto por seguridad.</span>
        </div>
      </form>

      {/* ------------------------------------------------------ Respuesta */}
      {result && (
        <div className="card">
          <div className="card__head">
            <div>
              <h3 className="card__title">Respuesta del asistente</h3>
              <p className="card__subtitle">Acción: {activeAction?.label}</p>
            </div>
            <div>{statusBadge()}</div>
          </div>

          <RichText text={result.response} />

          {result.providerNotice && (
            <div className="status status--warning" style={{ marginTop: '0.75rem' }}>
              {result.providerNotice}
            </div>
          )}

          <div className="status status--info" style={{ marginTop: '1rem' }}>
            <p>
              <strong>Contexto académico real utilizado</strong> (registros de MySQL):{' '}
              {(result.dataProvenance?.studentRecordsUsed || []).join(', ') || 'ninguno'} ·{' '}
              {result.dataProvenance?.counts?.subjects ?? 0} materia(s) y{' '}
              {result.dataProvenance?.counts?.recentErrors ?? 0} error(es) reciente(s).
            </p>
            <p>
              <strong>
                {result.dataProvenance?.aiGenerated
                  ? 'Texto generado por IA:'
                  : 'Texto generado por el motor local (no IA externa):'}
              </strong>{' '}
              {result.disclaimer}
            </p>
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="card">
          <EmptyState
            icon="sparkles"
            title="Elige una función para comenzar"
            text="Selecciona una de las funciones del asistente y pulsa Consultar. El asistente usará únicamente tu información académica pertinente y te dirá siempre si el texto proviene de IA o del motor local de MY REAL STUDIA."
            plain
          />
        </div>
      )}
    </section>
  );
}
