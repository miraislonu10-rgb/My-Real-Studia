import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { getMyProfile } from '../services/auth.js';
import { seedDemoData } from '../services/demo.js';
import Button from '../components/atoms/Button.jsx';
import StatusMessage from '../components/molecules/StatusMessage.jsx';

/**
 * Panel principal tras iniciar sesion.
 * Muestra los datos de la cuenta, el perfil academico y los accesos
 * disponibles segun el rol (estudiante, docente o administrador).
 */
const ROLE_LABELS = { student: 'estudiante', tutor: 'docente', admin: 'administrador' };

export default function Dashboard() {
  const { user, fullName, isAdmin, isStudent, isTeacher } = useAuth();

  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [seed, setSeed] = useState({ loading: false, message: null, type: 'info' });

  const handleSeed = async () => {
    setSeed({ loading: true, message: null, type: 'info' });
    try {
      const response = await seedDemoData();
      setSeed({ loading: false, type: 'ok', message: response.message });
    } catch (err) {
      setSeed({ loading: false, type: 'error', message: err.message });
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const profileData = await getMyProfile();
        if (cancelled) return;
        setProfile(profileData);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="page">
      <h2 className="page__title">Hola, {fullName || user?.email}</h2>
      <p className="page__text">
        Has iniciado sesion como <strong>{ROLE_LABELS[user?.role] || user?.role}</strong>.
      </p>

      {error && (
        <div className="status status--error" role="alert">
          {error}
        </div>
      )}

      {isTeacher && (
        <div className="card">
          <h3>Docencia — acompanamiento del grupo</h3>
          <p className="hint">
            Revisa en modo solo lectura las estadisticas del grupo, el nombre de cada alumno, su
            progreso y los temas que estan viendo. Desde aqui tambien puedes abrir la ficha
            individual de cada estudiante.
          </p>
          <div className="actions">
            <Link className="button button--primary" to="/docencia">
              Ir a Docencia
            </Link>
            {isAdmin && (
              <Link className="button button--secondary" to="/admin/usuarios">
                Administrar usuarios
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <h3>Tu cuenta</h3>
        <table className="table">
          <tbody>
            <tr>
              <th>Correo</th>
              <td>{user?.email}</td>
            </tr>
            <tr>
              <th>Rol</th>
              <td>{ROLE_LABELS[user?.role] ? ROLE_LABELS[user?.role][0].toUpperCase() + ROLE_LABELS[user?.role].slice(1) : user?.role}</td>
            </tr>
            <tr>
              <th>Identificador publico</th>
              <td>
                <code>{user?.uuid}</code>
              </td>
            </tr>
            <tr>
              <th>Ultimo acceso</th>
              <td>{user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Primer acceso'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {profile && (
        <div className="card">
          <h3>Perfil academico</h3>
          <table className="table">
            <tbody>
              <tr>
                <th>Nivel educativo</th>
                <td>{profile.educationLevel || 'Sin definir'}</td>
              </tr>
              <tr>
                <th>Institucion</th>
                <td>{profile.institution || 'Sin definir'}</td>
              </tr>
              <tr>
                <th>Meta diaria</th>
                <td>{profile.dailyGoalMinutes} minutos</td>
              </tr>
            </tbody>
          </table>
          <p className="hint">
            <Link to="/perfil">Editar mi perfil</Link>
          </p>
        </div>
      )}

      {isStudent && (
        <div className="card">
          <h3>Datos de ejemplo</h3>
          <p className="hint">
            Si acabas de crear tu cuenta y quieres explorar la plataforma, puedes cargar un
            conjunto de materias, temas, tareas, errores y tarjetas de ejemplo. Solo funciona en
            cuentas que todavía no tienen materias, para no alterar contenido real.
          </p>
          <div className="actions">
            <Button icon="plus" onClick={handleSeed} loading={seed.loading}>
              Cargar datos de ejemplo
            </Button>
          </div>
          {seed.message && (
            <div style={{ marginTop: '1rem' }}>
              <StatusMessage type={seed.type}>{seed.message}</StatusMessage>
            </div>
          )}
        </div>
      )}

      {isStudent && (
        <div className="card">
          <h3>Herramientas inteligentes de aprendizaje</h3>
        <p className="hint">Acceso directo a tus módulos de estudio activo, planificación y análisis de progreso.</p>
        <div className="grid grid--2" style={{ gap: '1rem', marginTop: '1rem' }}>
          <div style={{ background: 'var(--warm-50)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--lav-200)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-heading)' }}>⏱ Smart Focus — Cronómetro</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)', margin: '0 0 1rem 0' }}>
              Sesiones de estudio con cálculo temporal en servidor, pausas, registro de productividad percibida e historial.
            </p>
            <Link className="button button--primary button--small" to="/cronometro">
              Abrir cronómetro
            </Link>
          </div>

          <div style={{ background: 'var(--warm-50)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--lav-200)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-heading)' }}>📅 Smart Planner — Organizador</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)', margin: '0 0 1rem 0' }}>
              Tareas, prioridades, fechas límite, objetivos diarios/semanales, calendario y reorganización inteligente sin choques de horario.
            </p>
            <Link className="button button--primary button--small" to="/planificador">
              Abrir organizador
            </Link>
          </div>

          <div style={{ background: 'var(--warm-50)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--lav-200)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-heading)' }}>📓 Error Journal — Diario de errores</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)', margin: '0 0 1rem 0' }}>
              Registra, categoriza (conceptuales, cálculo, memoria...), busca y comprende tus fallos para dominarlos.
            </p>
            <Link className="button button--secondary button--small" to="/diario-errores">
              Abrir diario de errores
            </Link>
          </div>

          <div style={{ background: 'var(--warm-50)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--lav-200)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-heading)' }}>🧠 Learning Profile — Preferencias</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)', margin: '0 0 1rem 0' }}>
              Cuestionario científico y perfil dinámico multidimensional (sin categorías rígidas VAK) para personalizar recomendaciones.
            </p>
            <Link className="button button--secondary button--small" to="/perfil-aprendizaje">
              Ver perfil cognitivo
            </Link>
          </div>

          <div style={{ background: 'var(--warm-50)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--lav-200)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-heading)' }}>📊 Academic Analytics — Estadísticas</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)', margin: '0 0 1rem 0' }}>
              Tiempo de estudio, sesiones, aciertos, errores recurrentes, objetivos y evolución diaria, semanal y mensual con filtros por fechas e informe semanal comparativo.
            </p>
            <Link className="button button--secondary button--small" to="/estadisticas">
              Ver estadísticas
            </Link>
          </div>

          <div style={{ background: 'var(--warm-50)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--lav-200)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-heading)' }}>🗂 Memory Lab — Repetición espaciada</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)', margin: '0 0 1rem 0' }}>
              Tarjetas de memoria asociadas a materias y temas con algoritmo SM-2: registra tus respuestas, evalúa tu comprensión y programa los repasos.
            </p>
            <Link className="button button--secondary button--small" to="/memory-lab">
              Abrir Memory Lab
            </Link>
          </div>

          <div style={{ background: 'var(--warm-50)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--lav-200)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-heading)' }}>✨ MY REAL STUDIA AI Companion — Tutor inteligente</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)', margin: '0 0 1rem 0' }}>
              Explica conceptos, genera ejercicios, da pistas, analiza tus errores frecuentes y crea repasos personalizados mediante el backend seguro.
            </p>
            <Link className="button button--secondary button--small" to="/ai-companion">
              Hablar con el asistente
            </Link>
          </div>
        </div>
        </div>
      )}

      <div className="actions">
        {isStudent && (
          <>
            <Link className="button button--primary" to="/cronometro">
              ⏱ Smart Focus
            </Link>
            <Link className="button button--secondary" to="/planificador">
              📅 Smart Planner
            </Link>
            <Link className="button button--secondary" to="/diario-errores">
              📓 Diario de errores
            </Link>
            <Link className="button button--ghost" to="/perfil-aprendizaje">
              🧠 Perfil de aprendizaje
            </Link>
            <Link className="button button--ghost" to="/estadisticas">
              📊 Estadísticas
            </Link>
          </>
        )}
        {isTeacher && (
          <Link className="button button--primary" to="/docencia">
            Docencia
          </Link>
        )}
        <Link className="button button--ghost" to="/perfil">
          Mi cuenta
        </Link>
        {isAdmin && (
          <Link className="button button--secondary" to="/admin/usuarios">
            Administracion de usuarios
          </Link>
        )}
      </div>
    </section>
  );
}
