/**
 * STUDIA - Modelo de tokens de refresco (sesiones)
 * ------------------------------------------------------------------
 * En la base de datos solo se guarda el HMAC-SHA256 del token. Esto permite
 * cerrar sesiones de verdad (logout) y revocar tokens robados sin conservar
 * nunca el token en claro.
 */

import { pool } from '../config/database.js';

/**
 * Guarda un token de refresco.
 * @param {{userId:number, tokenHash:string, userAgent?:string, ipAddress?:string, expiresAt:string}} data
 */
export const create = async (data, connection = pool) => {
  const [result] = await connection.execute(
    `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip_address, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.userId,
      data.tokenHash,
      data.userAgent ? data.userAgent.slice(0, 255) : null,
      data.ipAddress || null,
      data.expiresAt,
    ]
  );
  return result.insertId;
};

/**
 * Busca un token vigente: no revocado y no expirado.
 * @returns {Promise<{id:number, userId:number, expiresAt:string}|null>}
 */
export const findActiveByHash = async (tokenHash) => {
  const [rows] = await pool.execute(
    `SELECT id, user_id AS userId, expires_at AS expiresAt
       FROM refresh_tokens
      WHERE token_hash = ?
        AND revoked_at IS NULL
        AND expires_at > NOW()
      LIMIT 1`,
    [tokenHash]
  );
  return rows[0] || null;
};

/** Marca un token como usado (rotacion). */
export const touchLastUsed = async (id) => {
  await pool.execute('UPDATE refresh_tokens SET last_used_at = NOW() WHERE id = ?', [id]);
};

/**
 * Revoca un token concreto.
 * @param {string} tokenHash
 * @param {'logout'|'rotation'|'password_change'|'admin'} reason
 */
export const revokeByHash = async (tokenHash, reason) => {
  const [result] = await pool.execute(
    `UPDATE refresh_tokens
        SET revoked_at = NOW(), revoked_reason = ?
      WHERE token_hash = ? AND revoked_at IS NULL`,
    [reason, tokenHash]
  );
  return result.affectedRows;
};

/**
 * Revoca todas las sesiones de un usuario.
 * Se usa al cambiar la contraseña (invalida cualquier sesion robada) o al
 * cerrar sesion en todos los dispositivos.
 */
export const revokeAllForUser = async (userId, reason) => {
  const [result] = await pool.execute(
    `UPDATE refresh_tokens
        SET revoked_at = NOW(), revoked_reason = ?
      WHERE user_id = ? AND revoked_at IS NULL`,
    [reason, userId]
  );
  return result.affectedRows;
};

/** Cuenta las sesiones activas de un usuario. */
export const countActiveForUser = async (userId) => {
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total
       FROM refresh_tokens
      WHERE user_id = ? AND revoked_at IS NULL AND expires_at > NOW()`,
    [userId]
  );
  return Number(total);
};

/** Elimina tokens ya expirados o revocados (tarea de mantenimiento). */
export const deleteStale = async () => {
  const [result] = await pool.execute(
    'DELETE FROM refresh_tokens WHERE expires_at <= NOW() OR revoked_at IS NOT NULL'
  );
  return result.affectedRows;
};

export default {
  create,
  findActiveByHash,
  touchLastUsed,
  revokeByHash,
  revokeAllForUser,
  countActiveForUser,
  deleteStale,
};
