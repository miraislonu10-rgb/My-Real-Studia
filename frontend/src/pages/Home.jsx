import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <section className="page page--registration">
      <article className="card registration-sheet" aria-labelledby="registration-title">
        <header className="registration-sheet__header">
          <p className="registration-sheet__eyebrow">Ficha de registro</p>
          <h1 id="registration-title">MY REAL STUDIA</h1>
        </header>

        <div className="registration-sheet__video">
          <iframe
            src="https://www.youtube-nocookie.com/embed/-pmDSOsbys4"
            title="Video de MY REAL STUDIA"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        <section className="registration-sheet__description" aria-labelledby="registration-description">
          <h2 id="registration-description">Descripción</h2>
          <p>
            MY REAL STUDIA es una plataforma de apoyo académico para organizar materias, planificar
            sesiones de estudio y registrar el progreso. Reúne herramientas para practicar,
            repasar y dar seguimiento al aprendizaje desde un mismo espacio.
          </p>
        </section>

        <div className="registration-sheet__details">
          <div className="registration-sheet__price">
            <span>Costo</span>
            <strong>$129</strong>
          </div>
          <div className="registration-sheet__url" aria-label="Espacio reservado para una URL externa">
            <span>URL externa</span>
            <span className="registration-sheet__url-slot">Espacio reservado para agregar la URL</span>
          </div>
        </div>

        <Link className="button button--primary registration-sheet__action" to="/registro">
          Ir al formulario de registro
        </Link>
        <a
          className="registration-sheet__video-link"
          href="https://youtu.be/-pmDSOsbys4?si=dr02k0eoPb2KXojw"
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir video en YouTube
        </a>
      </article>
    </section>
  );
}
