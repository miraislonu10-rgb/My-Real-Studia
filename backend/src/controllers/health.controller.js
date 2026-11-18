/**
 * STUDIA - Controladores de estado del sistema
 */

import { env } from '../config/env.js';
import { pool } from '../config/database.js';

const OK = { success: true, error: null };

/**
 * GET /api/health
 * Informa el estado de la API y de la base de datos.
 */
export const getHealth = async (req, res) => {
  let database = 'down';
  let databaseMessage = 'Sin conexion con MySQL/MariaDB';

  try {
    await pool.query('SELECT 1');
    database = 'up';
    databaseMessage = `Conectada a "${env.db.name}"`;
  } catch (error) {
    databaseMessage = error.message;
  }

  res.status(200).json({
    ...OK,
    message: 'STUDIA API operativa',
    data: {
      service: 'studia-api',
      version: '0.1.0',
      environment: env.nodeEnv,
      database,
      databaseMessage,
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
    const [[{ tables }]] = await pool.query(
      'SELECT COUNT(*) AS tables FROM information_schema.tables WHERE table_schema = DATABASE()'
    );

    const [rows] = await pool.query(
      `SELECT table_name AS tableName, table_rows AS tableRows
         FROM information_schema.tables
        WHERE table_schema = DATABASE()
        ORDER BY table_name`
    );

    res.status(200).json({
      ...OK,
      message: 'Conexion a la base de datos verificada',
      data: {
        database: env.db.name,
        host: `${env.db.host}:${env.db.port}`,
        tablesCount: tables,
        tablesCountExpected: 15,
        isSchemaReady: tables >= 15,
        tables: rows.map((row) => ({ name: row.tableName, rows: Number(row.tableRows) })),
      },
    });
  } catch (error) {
    next(error);
  }
};
