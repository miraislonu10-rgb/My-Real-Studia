/**
 * STUDIA - Controladores de estado del sistema
 * ------------------------------------------------------------------
 * PROMPT 3: ruta de prueba para verificar el estado de la base de datos.
 *  - GET /api/health      -> estado general de la API y de MySQL
 *  - GET /api/health/db   -> conexion, latencia y tablas del esquema
 *
 * NOTA DE SEGURIDAD (PROMPT 16): el detalle de infraestructura (nombre del
 * host, nombre de la base y listado de tablas) solo se expone fuera de
 * produccion. En produccion estas rutas son publicas y ese detalle ayudaria a
 * un atacante a conocer el esquema; alli solo se devuelven conteos.
 */

import { env, isProduction } from '../config/env.js';
import { pool, pingDatabase, EXPECTED_SCHEMA_TABLES } from '../config/database.js';

const OK = { success: true, error: null };

/**
 * GET /api/health
 * Informa el estado de la API y de la base de datos.
 */
export const getHealth = async (req, res) => {
  const database = await pingDatabase();

  res.status(200).json({
    ...OK,
    message: 'STUDIA API operativa',
    data: {
      service: 'studia-api',
      version: '0.1.0',
      environment: env.nodeEnv,
      database: database.status,
      // El nombre de la base de datos solo se revela en desarrollo.
      databaseMessage:
        database.status === 'up'
          ? isProduction
            ? 'Conexion con la base de datos establecida'
            : `Conectada a "${env.db.name}"`
          : 'Sin conexion con MySQL/MariaDB.',
      databaseLatencyMs: database.latencyMs,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    },
  });
};

/**
 * GET /api/health/db
 * Verifica la conexion y cuenta las tablas de STUDIA creadas en la base.
 */
export const getDatabaseHealth = async (req, res, next) => {
  try {
    const ping = await pingDatabase();

    const [[{ tables }]] = await pool.query(
      'SELECT COUNT(*) AS tables FROM information_schema.tables WHERE table_schema = DATABASE()'
    );

    const missingTables = EXPECTED_SCHEMA_TABLES - tables;

    const data = {
      status: ping.status,
      latencyMs: ping.latencyMs,
      tablesCount: tables,
      tablesCountExpected: EXPECTED_SCHEMA_TABLES,
      isSchemaReady: tables >= EXPECTED_SCHEMA_TABLES,
      missingTables: missingTables > 0 ? missingTables : 0,
    };

    // Detalle de infraestructura reservado al entorno de desarrollo.
    if (!isProduction) {
      const [rows] = await pool.query(
        `SELECT table_name AS tableName, table_rows AS tableRows
           FROM information_schema.tables
          WHERE table_schema = DATABASE()
          ORDER BY table_name`
      );
      data.database = env.db.name;
      data.host = `${env.db.host}:${env.db.port}`;
      data.tables = rows.map((row) => ({ name: row.tableName, rows: Number(row.tableRows) }));
    }

    res.status(200).json({
      ...OK,
      message: 'Conexion a la base de datos verificada',
      data,
    });
  } catch (error) {
    next(error);
  }
};
