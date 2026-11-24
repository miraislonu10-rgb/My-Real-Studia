/**
 * STUDIA - Conexion a MySQL/MariaDB mediante mysql2
 * ------------------------------------------------------------------
 * Archivo de conexion independiente. Responsabilidades:
 *   - Crear el pool de conexiones con los datos de config/env.js
 *   - Comprobar el estado de la base de datos (ruta /api/health/db)
 *   - Ofrecer transacciones para operaciones que deben ser atomicas
 *   - Cerrar el pool de forma ordenada al apagar el servidor
 *
 * SEGURIDAD (evitar inyeccion SQL):
 *   Toda consulta que incluya datos del usuario DEBE usar sentencias
 *   preparadas con marcadores de posicion:
 *       await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
 *   Nunca se debe concatenar ni interpolar valores en el SQL.
 *   El driver envia la consulta y los parametros por separado, por lo que el
 *   valor siempre se trata como dato y jamas como codigo SQL.
 */

import mysql from 'mysql2/promise';
import { env } from './env.js';

/** Numero de tablas del esquema actual (15 de dominio + 1 catalogo de recursos + 2 de seguridad). */
export const EXPECTED_SCHEMA_TABLES = 18;

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
 * Fija la zona horaria de cada sesion en UTC (+00:00).
 * Las fechas se guardan y comparan siempre en UTC, por lo que NOW() y las
 * fechas calculadas en JavaScript coinciden aunque el servidor MySQL este
 * configurado en hora local (caso habitual en XAMPP).
 */
pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

/**
 * Comprueba la conexion y devuelve informacion del servidor.
 * @returns {Promise<{database:string, host:string, port:number, version:string, latencyMs:number}>}
 */
export const testConnection = async () => {
  const connection = await pool.getConnection();
  try {
    const startedAt = process.hrtime.bigint();
    const [rows] = await connection.query(
      'SELECT DATABASE() AS `database`, @@hostname AS `host`, @@port AS `port`, VERSION() AS `version`'
    );
    const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

    return {
      database: rows[0].database,
      host: env.db.host,
      port: rows[0].port,
      version: rows[0].version,
      latencyMs: Math.round(latencyMs * 100) / 100,
    };
  } finally {
    connection.release();
  }
};

/**
 * Ping ligero usado por la ruta de estado de la base de datos.
 * @returns {Promise<{status:'up'|'down', latencyMs:number|null, error:string|null}>}
 */
export const pingDatabase = async () => {
  const startedAt = process.hrtime.bigint();
  try {
    await pool.query('SELECT 1');
    const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    return { status: 'up', latencyMs: Math.round(latencyMs * 100) / 100, error: null };
  } catch (error) {
    return { status: 'down', latencyMs: null, error: error.message };
  }
};

/**
 * Ejecuta un bloque de operaciones dentro de una transaccion.
 * Si el callback lanza un error, se deshace todo el bloque (rollback).
 *
 * @param {(connection: import('mysql2/promise').PoolConnection) => Promise<any>} callback
 */
export const withTransaction = async (callback) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/** Cierra el pool de conexiones (se usa en el apagado ordenado del servidor). */
export const closePool = async () => {
  await pool.end();
};

export default pool;
