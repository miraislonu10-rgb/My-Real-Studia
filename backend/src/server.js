/**
 * STUDIA - Servidor HTTP
 * ------------------------------------------------------------------
 * Punto de entrada del backend. Levanta Express, comprueba la conexion
 * con MySQL/MariaDB y registra un apagado ordenado (graceful shutdown).
 */

import app from './app.js';
import { env, assertEnv } from './config/env.js';
import { testConnection, closePool } from './config/database.js';

const start = async () => {
  assertEnv();

  try {
    const info = await testConnection();
    console.log(`[db]  Conexion establecida con "${info.database}" en ${info.host}:${info.port}`);
  } catch (error) {
    console.warn(`[db]  No se pudo conectar a MySQL: ${error.message}`);
    console.warn('[db]  El servidor arrancara igualmente. Importa backend/database/studia_database.sql desde phpMyAdmin.');
  }

  const server = app.listen(env.port, () => {
    console.log(`[api] STUDIA API escuchando en http://localhost:${env.port}${env.apiPrefix}`);
    console.log(`[api] Entorno: ${env.nodeEnv}`);
  });

  const shutdown = async (signal) => {
    console.log(`\n[srv] Señal recibida (${signal}). Cerrando servidor...`);
    server.close(async () => {
      await closePool();
      console.log('[srv] Servidor y pool de conexiones cerrados correctamente.');
      process.exit(0);
    });
  };

  ['SIGINT', 'SIGTERM'].forEach((signal) => process.on(signal, () => shutdown(signal)));
};

start();
