import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';

/**
 * Pagina de inicio (bienvenida).
 * Presenta la plataforma y distintas tecnicas de estudio contrastadas.
 * No expone detalles tecnicos (API, endpoints o base de datos): es una
 * pantalla de acogida para cualquier visitante.
 */

const STUDY_TECHNIQUES = [
  {
    icon: '⏱',
    name: 'Pomodoro',
    text: 'Trabaja en bloques de 25 minutos con 5 de descanso. Mantiene la concentración y evita la fatiga mental.',
  },
  {
    icon: '🔁',
    name: 'Repetición espaciada',
    text: 'Repasa el contenido en intervalos crecientes. Consolida la memoria a largo plazo con menos esfuerzo.',
  },
  {
    icon: '🧠',
    name: 'Recuerdo activo',
    text: 'Cierra los apuntes e intenta explicar lo aprendido de memoria. Recuperar es más eficaz que releer.',
  },
  {
    icon: '🗣',
    name: 'Técnica Feynman',
    text: 'Explica el tema como si enseñaras a alguien sin conocimientos: las lagunas salen a la luz de inmediato.',
  },
  {
    icon: '🗺',
    name: 'Mapas mentales',
    text: 'Organiza ideas y conexiones de forma visual para comprender la estructura global de un tema.',
  },
  {
    icon: '🔀',
    name: 'Práctica intercalada',
    text: 'Alterna materias o tipos de ejercicio en una misma sesión. Mejora la discriminación y la transferencia.',
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="page">
      <h2 className="page__title">Bienvenido a MY REAL STUDIA</h2>
      <p className="page__text">
        Un espacio para organizar tu estudio, registrar tu avance y aprender con técnicas que de
        verdad funcionan. Elige una materia, planifica tus sesiones y deja que el sistema te
        acompañe paso a paso.
      </p>

      <div className="actions">
        {isAuthenticated ? (
          <Link className="button button--primary" to="/panel">
            Ir a mi panel
          </Link>
        ) : (
          <>
            <Link className="button button--primary" to="/registro">
              Crear mi cuenta
            </Link>
            <Link className="button button--secondary" to="/iniciar-sesion">
              Iniciar sesión
            </Link>
          </>
        )}
      </div>

      <div className="card">
        <h3>Técnicas de estudio</h3>
        <p className="hint">
          Métodos respaldados por la investigación sobre aprendizaje. Combínalos según la materia y
          el momento.
        </p>
        <div className="grid grid--2" style={{ gap: '1rem', marginTop: '1rem' }}>
          {STUDY_TECHNIQUES.map((technique) => (
            <div
              key={technique.name}
              style={{
                background: 'var(--warm-50)',
                padding: '1.25rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--lav-200)',
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-heading)' }}>
                <span aria-hidden="true" style={{ marginRight: '0.5rem' }}>
                  {technique.icon}
                </span>
                {technique.name}
              </h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)', margin: 0 }}>
                {technique.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Cómo aprovechar la plataforma</h3>
        <ul className="list">
          <li>
            <strong>Organiza</strong>
            <span>Crea tus materias y sus temas para tener todo el temario bajo control.</span>
          </li>
          <li>
            <strong>Concéntrate</strong>
            <span>Usa el cronómetro para estudiar en bloques y registrar tu tiempo real.</span>
          </li>
          <li>
            <strong>Repasa</strong>
            <span>Programa repasos y tarjetas de memoria para no olvidar lo aprendido.</span>
          </li>
          <li>
            <strong>Mejora</strong>
            <span>Revisa tus estadísticas y tu diario de errores para corregir a tiempo.</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
