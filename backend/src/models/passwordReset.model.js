/**
 * STUDIA - Modelo de tokens de recuperacion de contraseña
 * ------------------------------------------------------------------
 * Un solo uso (used_at) y con caducidad corta (expires_at). Igual que en las
 * sesiones, se almacena unicamente el HMAC-SHA256 del token.
 */

import { pool } from '../config/database.js';

/**
 * Crea un token de recuperacion.
 * @param {{userId:number, tokenHash:string, requestedIp?:string, expiresAt:string}} data
 */
export const create = async (data, connection = pool) => {
  const [result] = await connection.execute(
    `INSERT INTO password_reset_tokens (user_id, token_hash, requested_ip, expires_at)
     VALUES (?, ?, ?, ?)`,
    [data.userId, data.tokenHash, data.requestedIp || null, data.expiresAt]
  );
  return result.insertId;
};

/**
 * Busca un token vigente (no usado y no expirado).
 * @returns {Promise<{id:number, userId:number}|null>}
 */
export const findActiveByHash = async (tokenHash) => {
  const [rows] = await pool.execute(
    `SELECT id, user_id AS userId
       FROM password_reset_tokens
      WHERE token_hash = ?
        AND used_at IS NULL
        AND expires_at > NOW()
      LIMIT 1`,
    [tokenHash]
  );
  return rows[0] || null;
};

/** Marca un token como usado para que no pueda reutilizarse. */
export const markUsed = async (id, connection = pool) => {
  await connection.execute('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [id]);
};

/** Invalida todos los tokens pendientes de un usuario. */
export const invalidateAllForUser = async (userId, connection = pool) => {
  const [result] = await connection.execute(
    `UPDATE password_reset_tokens
        SET used_at = NOW()
      WHERE user_id = ? AND used_at IS NULL`,
    [userId]
  );
  return result.affectedRows;
};

export default { create, findActiveByHash, markUsed, invalidateAllForUser };
