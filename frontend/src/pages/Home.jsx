import { useCallback, useEffect, useState } from 'react';
import { getApiHealth, getDatabaseHealth, API_URL } from '../services/api.js';

/**
 * Pagina inicial: confirma que el cliente React, la API Express y la base de
 * datos MySQL estan operativos y comunicandose correctamente.
 */
export default function Home() {
  const [health, setHealth] = useState(null);
  const [schema, setSchema] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkConnection = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthData, schemaData] = await Promise.all([getApiHealth(), getDatabaseHealth()]);
      setHealth(healthData.data);
      setSchema(schemaData.data);
    } catch (err) {
      setHealth(null);
      setSchema(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return (
    <section className="page">
      <h2 className="page__title">Estado del proyecto</h2>
      <p className="page__text">
        Esta pantalla verifica la comunicacion entre el frontend (React + Vite), el backend
        (Node.js + Express) y la base de datos (MySQL/MariaDB de XAMPP).
      </p>

      <div className="card">
        <h3>Endpoints consumidos</h3>
        <ul className="list">
          <li>
            <code>GET {API_URL}/health</code>
            <span>Estado de la API y de la conexion a MySQL</span>
          </li>
          <li>
            <code>GET {API_URL}/health/db</code>
            <span>Tablas creadas en la base de datos</span>
          </li>
        </ul>
      </div>

      {loading && <p className="status status--loading">Consultando el estado del sistema...</p>}

      {error && (
        <div className="status status--error">
          <strong>Sin conexion con la API</strong>
          <p>{error}</p>
          <p className="hint">
            Inicia el backend con <code>npm run dev</code> dentro de la carpeta <code>backend</code>.
          </p>
        </div>
      )}

      {health && (
        <div className="status status--ok">
          <strong>API operativa</strong>
          <table className="table">
            <tbody>
              <tr>
                <th>Servicio</th>
                <td>{health.service} v{health.version}</td>
              </tr>
              <tr>
                <th>Entorno</th>
                <td>{health.environment}</td>
              </tr>
              <tr>
                <th>Base de datos</th>
                <td>{health.database === 'up' ? 'Conectada' : 'Sin conexion'}</td>
              </tr>
              <tr>
                <th>Detalle</th>
                <td>{health.databaseMessage}</td>
              </tr>
              <tr>
                <th>Tiempo activo</th>
                <td>{health.uptimeSeconds} s</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {schema && (
        <div className="card">
          <h3>Esquema de la base de datos</h3>
          <p>
            Base <strong>{schema.database}</strong> en {schema.host} &middot; {schema.tablesCount} de{' '}
            {schema.tablesCountExpected} tablas creadas.
          </p>
          <p className={schema.isSchemaReady ? 'hint' : 'hint hint--warning'}>
            {schema.isSchemaReady
              ? 'Esquema completo. Las relaciones estan listas.'
              : 'Importa backend/database/studia_database.sql desde phpMyAdmin para completar el esquema.'}
          </p>
        </div>
      )}

      <button type="button" className="button" onClick={checkConnection} disabled={loading}>
        {loading ? 'Verificando...' : 'Volver a verificar'}
      </button>
    </section>
  );
}
