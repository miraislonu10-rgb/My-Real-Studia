/**
 * STUDIA - Modelo de usuarios
 * ------------------------------------------------------------------
 * SEGURIDAD: todas las consultas son SENTENCIAS PREPARADAS con marcadores
 * de posicion (?) y parametros enviados por separado al driver. Nunca se
 * concatenan ni interpola valores en el SQL, por lo que la inyeccion SQL
 * no es posible aunque el valor provenga del formulario.
 *
 * El modelo devuelve objetos "seguros" para la API que NUNCA incluyen
 * password_hash salvo que se pida explicitamente (uso interno de auth).
 */

import { pool } from '../config/database.js';

/** Columnas publicas: lo unico que puede salir hacia el cliente. */
export const PUBLIC_COLUMNS = [
  'id',
  'uuid',
  'email',
  'first_name AS firstName',
  'last_name AS lastName',
  'role',
  'status',
  'email_verified_at AS emailVerifiedAt',
  'last_login_at AS lastLoginAt',
  'created_at AS createdAt',
  'updated_at AS updatedAt',
].join(', ');

const SELECT_PUBLIC = `SELECT ${PUBLIC_COLUMNS} FROM users`;

/**
 * Crea un usuario. El hash de la contraseña llega ya calculado con bcrypt.
 * @param {{uuid:string,email:string,passwordHash:string,firstName:string,lastName:string,role?:string,status?:string}} data
 * @returns {Promise<number>} id del usuario creado
 */
export const createUser = async (data, connection = pool) => {
  const [result] = await connection.execute(
    `INSERT INTO users (uuid, email, password_hash, first_name, last_name, role, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.uuid,
      data.email,
      data.passwordHash,
      data.firstName,
      data.lastName,
      data.role || 'student',
      data.status || 'active',
    ]
  );
  return result.insertId;
};

/** Busca por correo INCLUYENDO el hash (solo para el proceso de login). */
export const findByEmailWithPassword = async (email) => {
  const [rows] = await pool.execute(
    `SELECT ${PUBLIC_COLUMNS}, password_hash AS passwordHash
       FROM users
      WHERE email = ?
      LIMIT 1`,
    [email]
  );
  return rows[0] || null;
};

/** Busca un usuario por correo devolviendo solo columnas publicas. */
export const findByEmail = async (email) => {
  const [rows] = await pool.execute(`${SELECT_PUBLIC} WHERE email = ? LIMIT 1`, [email]);
  return rows[0] || null;
};

/** Busca un usuario por id (crudo). */
export const findById = async (id) => {
  const [rows] = await pool.execute(`${SELECT_PUBLIC} WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

/** Busca un usuario por su uuid publico. */
export const findByUuid = async (uuid) => {
  const [rows] = await pool.execute(`${SELECT_PUBLIC} WHERE uuid = ? LIMIT 1`, [uuid]);
  return rows[0] || null;
};

/** Comprueba si un correo ya esta registrado. */
export const emailExists = async (email) => {
  const [rows] = await pool.execute('SELECT 1 AS found FROM users WHERE email = ? LIMIT 1', [email]);
  return rows.length > 0;
};

/** Cuenta los usuarios no eliminados de un rol (uso interno de la configuracion inicial). */
export const countByRole = async (role) => {
  const [[{ total }]] = await pool.execute(
    "SELECT COUNT(*) AS total FROM users WHERE role = ? AND status <> 'deleted'",
    [role]
  );
  return Number(total) || 0;
};

/** Registra la fecha del ultimo acceso. */
export const updateLastLogin = async (id) => {
  await pool.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [id]);
};

/** Actualiza la contraseña (hash bcrypt ya calculado). */
export const updatePassword = async (id, passwordHash) => {
  await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
};

/** Cambia el estado de la cuenta (active, suspended, deleted...). */
export const updateStatus = async (id, status) => {
  await pool.execute(
    `UPDATE users
        SET status = ?,
            deleted_at = CASE WHEN ? = 'deleted' THEN NOW() ELSE NULL END
      WHERE id = ?`,
    [status, status, id]
  );
};

/**
 * Actualiza los datos base de la cuenta (uso exclusivo del administrador).
 * Lista blanca de columnas: no es posible inyectar otras.
 * @param {number} id
 * @param {{email?:string, firstName?:string, lastName?:string, role?:string}} data
 */
const UPDATABLE_BASE = {
  email: 'email',
  firstName: 'first_name',
  lastName: 'last_name',
  role: 'role',
};

export const updateBasic = async (id, data) => {
  const assignments = [];
  const params = [];

  for (const [key, column] of Object.entries(UPDATABLE_BASE)) {
    if (data[key] !== undefined) {
      assignments.push(`${column} = ?`);
      params.push(data[key]);
    }
  }
  if (!assignments.length) return 0;

  params.push(id);
  const [result] = await pool.execute(
    `UPDATE users SET ${assignments.join(', ')} WHERE id = ?`,
    params
  );
  return result.affectedRows;
};

/**
 * Lista usuarios con paginacion (uso exclusivo del panel de administracion).
 * @param {{role?:string, status?:string, search?:string, limit:number, offset:number}} filters
 */
export const listUsers = async ({ role, status, search, limit, offset }) => {
  const conditions = [];
  const params = [];

  if (role) {
    conditions.push('role = ?');
    params.push(role);
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push('(email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.execute(
    `${SELECT_PUBLIC} ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM users ${where}`,
    params
  );

  return { rows, total };
};

export default {
  PUBLIC_COLUMNS,
  createUser,
  findByEmail,
  findByEmailWithPassword,
  findById,
  findByUuid,
  emailExists,
  countByRole,
  updateLastLogin,
  updatePassword,
  updateStatus,
  updateBasic,
  listUsers,
};
