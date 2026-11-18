/**
 * STUDIA - Pool de conexiones MySQL/MariaDB (driver mysql2/promise)
 * ------------------------------------------------------------------
 * IMPORTANTE (seguridad): todas las consultas con datos del usuario deben
 * usar sentencias preparadas con marcadores de posicion (`?` o `:nombre`)
 * mediante pool.execute(). Nunca concatenar valores en el SQL.
 */

import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit,
  queueLimit: 0,
  charset: 'utf8mb4_unicode_ci',
  namedPlaceholders: true,
  timezone: 'Z',
  dateStrings: false,
  decimalNumbers: true,
});

/**
 * Comprueba que la conexion funciona y devuelve informacion util del servidor.
 * @returns {Promise<{database: string, host: string, port: number, version: string}>}
 */
export const testConnection = async () => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      'SELECT DATABASE() AS `database`, @@hostname AS `host`, @@port AS `port`, VERSION() AS `version`'
    );
    return {
      database: rows[0].database,
      host: env.db.host,
      port: rows[0].port,
      version: rows[0].version,
    };
  } finally {
    connection.release();
  }
};

/** Cierra el pool (se usa en el apagado ordenado del servidor). */
export const closePool = async () => {
  await pool.end();
};

export default pool;
