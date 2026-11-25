import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import Icon from '../components/atoms/Icon.jsx';
import EmptyState from '../components/atoms/EmptyState.jsx';
import { generateQuizFromNotes } from '../services/ai.js';
import { getSubjects, getTopics } from '../services/subject.js';

const EXERCISE_TYPE_LABELS = {
  multiple_choice: 'Opcion multiple',
  open_answer: 'Respuesta abierta',
  true_false: 'Verdadero / Falso',
  problem_solving: 'Resolucion de problemas',
  coding: 'Programacion',
};

const DIFFICULTY_LABELS = { easy: 'Facil', medium: 'Media', hard: 'Dificil' };

/** Convierte cualquier respuesta correcta en texto legible. */
const readableAnswer = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.join(' · ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

/**
 * STUDIA - Note-to-Quiz (apuntes a cuestionario con IA)
 * ------------------------------------------------------------------
 * Convierte los apuntes del estudiante en preguntas de practica. El backend
 * genera las preguntas (con IA o con el motor local de STUDIA) y las guarda
 * como ejercicios REALES ligados a la materia y al tema, reutilizando el modulo
 * de ejercicios existente. Se indica siempre el origen del texto generado.
 */
export default function NoteToQuiz() {
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);

  const [notes, setNotes] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [difficultyLevel, setDifficultyLevel] = useState('medium');

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const selectedSubject = useMemo(
    () => subjects.find((item) => String(item.id) === String(subjectId)) || null,
    [subjects, subjectId]
  );
  const selectedTopic = useMemo(
    () => topics.find((item) => String(item.id) === String(topicId)) || null,
    [topics, topicId]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (notes.trim().length < 20) {
      setError('Escribe al menos 20 caracteres de apuntes para poder generar preguntas.');
      return;
    }
    if (!subjectId) {
      setError('Selecciona la materia a la que pertenecen estos apuntes.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await generateQuizFromNotes({
        notes: notes.trim(),
        subjectId: Number(subjectId),
        topicId: topicId ? Number(topicId) : undefined,
        subjectName: selectedSubject?.name,
        topicName: selectedTopic?.name,
        questionCount: Number(questionCount) || 5,
        difficultyLevel,
      });
      setResult(data);
    } catch (err) {
      if (err.code === 'TOO_MANY_AI_REQUESTS') {
        setError('Has alcanzado el limite de generaciones por minuto. Espera un momento e intentalo de nuevo.');
      } else {
        setError(err.message || 'No se pudieron generar las preguntas.');
      }
    } finally {
      setLoading(false);
    }
  };

  const generationBadge = () => {
    if (!result?.generation) return null;
    const { source, provider, model, aiGenerated } = result.generation;
    if (aiGenerated || ['gemini_ai', 'openai_ai'].includes(source)) {
      return <span className="badge badge--success">IA activa · {provider} · {model}</span>;
    }
    return <span className="badge badge--info">Motor local MY REAL STUDIA (sin credenciales de IA)</span>;
  };

  return (
    <section className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">Note-to-Quiz — De apuntes a cuestionario</h2>
          <p className="page__text">
            Pega tus apuntes y STUDIA generara preguntas de practica que se guardaran como
            ejercicios reales en la materia y el tema que elijas. Podras practicarlas desde el
            panel de la materia.
          </p>
        </div>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <div className="card__head">
          <div>
            <h3 className="card__title">Tus apuntes</h3>
            <p className="card__subtitle">
              Funciona mejor con frases completas, definiciones y datos clave.
            </p>
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="ntqNotes">Apuntes o texto de estudio</label>
          <textarea
            id="ntqNotes"
            className="input"
            rows={8}
            value={notes}
            maxLength={8000}
            data-autofocus
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Pega aqui tus apuntes. Ej. La fotosintesis convierte la energia luminosa en energia quimica..."
          />
          <span className="hint">{notes.length} / 8000 caracteres</span>
        </div>

        <div className="form__row">
          <div className="form-field">
            <label htmlFor="ntqSubject">Materia</label>
            <select
              id="ntqSubject"
              className="input"
              value={subjectId}
              required
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
            <label htmlFor="ntqTopic">Tema (opcional)</label>
            <select
              id="ntqTopic"
              className="input"
              value={topicId}
              disabled={!subjectId}
              onChange={(event) => setTopicId(event.target.value)}
            >
              <option value="">Sin tema especifico</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form__row">
          <div className="form-field">
            <label htmlFor="ntqCount">Numero de preguntas</label>
            <input
              id="ntqCount"
              type="number"
              className="input"
              min={1}
              max={20}
              value={questionCount}
              onChange={(event) => setQuestionCount(event.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="ntqDifficulty">Dificultad</label>
            <select
              id="ntqDifficulty"
              className="input"
              value={difficultyLevel}
              onChange={(event) => setDifficultyLevel(event.target.value)}
            >
              {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="status status--error" role="alert" style={{ marginBottom: '0.75rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="button button--primary" type="submit" disabled={loading}>
            <Icon name="quiz" size={16} />
            {loading ? 'Generando preguntas...' : 'Generar cuestionario'}
          </button>
          <span className="hint">Las preguntas quedan guardadas como ejercicios de la materia.</span>
        </div>
      </form>

      {!result && !loading && (
        <div className="card">
          <EmptyState
            icon="quiz"
            title="Convierte tus apuntes en practica"
            text="Pega tus apuntes, elige la materia (y un tema opcional) y genera un cuestionario. Las preguntas se guardaran como ejercicios reales que podras practicar."
            plain
          />
        </div>
      )}

      {result && (
        <div className="card">
          <div className="card__head">
            <div>
              <h3 className="card__title">Cuestionario generado</h3>
              <p className="card__subtitle">
                {result.exercises.length} ejercicio(s) guardado(s)
                {selectedSubject ? ` en ${selectedSubject.name}` : ''}
                {selectedTopic ? ` · ${selectedTopic.name}` : ''}.
              </p>
            </div>
            <div>{generationBadge()}</div>
          </div>

          {result.generation?.providerNotice && (
            <div className="status status--warning" style={{ marginBottom: '0.75rem' }}>
              {result.generation.providerNotice}
            </div>
          )}

          <div className="subject-progress">
            {result.exercises.map((exercise, index) => (
              <div className="subject-progress__row" key={exercise.id}>
                <div className="subject-progress__meta">
                  <span className="subject-progress__name">
                    {index + 1}. {exercise.title}
                    <span className="badge badge--info">
                      {EXERCISE_TYPE_LABELS[exercise.exerciseType] || exercise.exerciseType}
                    </span>
                    <span className="badge">
                      {DIFFICULTY_LABELS[exercise.difficultyLevel] || exercise.difficultyLevel}
                    </span>
                  </span>
                </div>
                <p className="hint" style={{ marginTop: '0.2rem' }}>
                  {exercise.statement}
                </p>
                {Array.isArray(exercise.options) && exercise.options.length > 0 && (
                  <ul className="ai-answer__list" style={{ marginTop: '0.3rem' }}>
                    {exercise.options.map((option, optionIndex) => (
                      <li key={`${exercise.id}-opt-${optionIndex}`}>{option}</li>
                    ))}
                  </ul>
                )}
                <p className="hint" style={{ marginTop: '0.3rem' }}>
                  <strong>Respuesta:</strong> {readableAnswer(exercise.correctAnswer)}
                  {exercise.solution ? ` · ${exercise.solution}` : ''}
                </p>
              </div>
            ))}
          </div>

          <p className="hint" style={{ marginTop: '0.75rem' }}>
            Practica estos ejercicios desde el panel de la materia. <Link to="/materias">Ir a Materias</Link>
          </p>
        </div>
      )}
    </section>
  );
}
