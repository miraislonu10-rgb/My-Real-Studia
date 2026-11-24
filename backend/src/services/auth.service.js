/**
 * STUDIA - Servicio de autenticacion
 * ------------------------------------------------------------------
 * Concentra la logica de negocio de PROMPT 4: registro de estudiantes,
 * inicio y cierre de sesion, rotacion de tokens y recuperacion de contraseña.
 *
 * MEDIDAS DE SEGURIDAD APLICADAS
 *  1. Contraseñas hasheadas con bcrypt (coste configurable, 12 por defecto).
 *     Nunca se almacena ni se registra la contraseña en texto plano.
 *  2. Access token JWT de vida corta (JWT_EXPIRES_IN, 15m por defecto).
 *  3. Refresh token aleatorio (48 bytes) guardado SOLO como HMAC-SHA256: si se
 *     filtra la base de datos no se puede reconstruir la sesion.
 *  4. Rotacion de refresh token en cada refresco: el token usado se revoca, de
 *     modo que un token robado deja de servir en cuanto el legitimo se usa.
 *  5. Mensajes de error genericos en login ("Credenciales incorrectas") para no
 *     revelar si un correo esta registrado.
 *  6. forgot-password responde SIEMPRE lo mismo exista o no la cuenta, evitando
 *     la enumeracion de usuarios.
 *  7. Los tokens de recuperacion son de un solo uso y caducan en minutos.
 *  8. Al cambiar la contraseña se revocan TODAS las sesiones activas.
 *  9. El registro publico fuerza siempre role = 'student': el administrador no
 *     puede crearse desde el formulario (ver scripts/createAdmin.js).
 */

import crypto from 'node:crypto';
import { pool, withTransaction } from '../config/database.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  mysqlDateAfter,
} from '../utils/security.js';
import { signAccessToken } from '../utils/jwt.js';
import * as userModel from '../models/user.model.js';
import * as profileModel from '../models/studentProfile.model.js';
import * as refreshTokenModel from '../models/refreshToken.model.js';
import * as passwordResetModel from '../models/passwordReset.model.js';
import { sendPasswordResetEmail } from './mail.service.js';

/** Normaliza el correo: minusculas y sin espacios. */
const normalizeEmail = (email) => String(email).trim().toLowerCase();

/** Extrae la IP del cliente respetando proxies solo si estos son de confianza. */
const getClientIp = (req) => req.ip || req.socket?.remoteAddress || null;

const getUserAgent = (req) => (req.get ? req.get('user-agent') : null) || null;

/**
 * Emite un par de tokens (acceso + refresco) y registra la sesion.
 * El refresh token en claro solo se devuelve al cliente una vez.
 */
const issueTokens = async ({ user, userAgent, ipAddress, connection = pool }) => {
  const accessToken = signAccessToken({ id: user.id, role: user.role });
  const refreshToken = generateToken(48);

  await refreshTokenModel.create(
    {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      userAgent,
      ipAddress,
      expiresAt: mysqlDateAfter(env.jwt.refreshTtlMs),
    },
    connection
  );

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    accessTokenExpiresIn: env.jwt.expiresIn,
    refreshTokenExpiresIn: env.jwt.refreshExpiresIn,
  };
};

/** Serializa el usuario para la API: sin password_hash ni datos internos. */
export const toPublicUser = (user) => ({
  id: user.id,
  uuid: user.uuid,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
  status: user.status,
  emailVerifiedAt: user.emailVerifiedAt,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});

/**
 * Registro publico de estudiantes.
 * El rol se fija en 'student': es imposible crear un administrador por aqui.
 */
export const registerStudent = async (data, req) => {
  const email = normalizeEmail(data.email);

  if (await userModel.emailExists(email)) {
    throw AppError.conflict('Ya existe una cuenta registrada con ese correo.');
  }

  const passwordHash = await hashPassword(data.password);

  const userId = await withTransaction(async (connection) => {
    const id = await userModel.createUser(
      {
        uuid: crypto.randomUUID(),
        email,
        passwordHash,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        role: 'student',
        status: 'active',
      },
      connection
    );

    await profileModel.createForUser(
      id,
      {
        birthDate: data.birthDate || null,
        educationLevel: data.educationLevel || null,
        institution: data.institution || null,
        academicProgram: data.academicProgram || null,
        gradeLevel: data.gradeLevel || null,
        mainGoal: data.mainGoal || null,
        dailyGoalMinutes: data.dailyGoalMinutes || 60,
        timezone: data.timezone || 'America/Mexico_City',
      },
      connection
    );

    return id;
  });

  const user = await userModel.findById(userId);

  const tokens = await issueTokens({
    user,
    userAgent: getUserAgent(req),
    ipAddress: getClientIp(req),
  });

  return { user: toPublicUser(user), tokens };
};

/** Inicio de sesion. Valida credenciales y emite una nueva sesion. */
export const login = async ({ email, password }, req) => {
  const normalizedEmail = normalizeEmail(email);
  const account = await userModel.findByEmailWithPassword(normalizedEmail);

  // Mensaje unico para usuario inexistente y contraseña incorrecta:
  // evita revelar que correos estan registrados.
  const invalidCredentials = () => AppError.unauthorized('Correo o contraseña incorrectos.');

  if (!account) throw invalidCredentials();

  const passwordMatches = await verifyPassword(password, account.passwordHash);
  if (!passwordMatches) throw invalidCredentials();

  if (account.status === 'deleted' || account.status === 'suspended') {
    throw AppError.forbidden('La cuenta esta suspendida o eliminada. Contacta al administrador.');
  }

  await userModel.updateLastLogin(account.id);

  const tokens = await issueTokens({
    user: account,
    userAgent: getUserAgent(req),
    ipAddress: getClientIp(req),
  });

  return { user: toPublicUser(account), tokens };
};

/**
 * Renueva la sesion a partir de un refresh token valido.
 * Aplica ROTACION: el token usado se revoca y se emite uno nuevo.
 */
export const refreshSession = async ({ refreshToken }, req) => {
  const tokenHash = hashToken(refreshToken);
  const stored = await refreshTokenModel.findActiveByHash(tokenHash);

  if (!stored) {
    throw AppError.unauthorized('La sesion no es valida o ha expirado. Inicia sesion de nuevo.');
  }

  const user = await userModel.findById(stored.userId);
  if (!user || user.status === 'deleted' || user.status === 'suspended') {
    await refreshTokenModel.revokeByHash(tokenHash, 'admin');
    throw AppError.forbidden('La cuenta esta suspendida o eliminada.');
  }

  // Rotacion: se invalida el token anterior antes de emitir el nuevo par.
  await refreshTokenModel.revokeByHash(tokenHash, 'rotation');

  const tokens = await issueTokens({
    user,
    userAgent: getUserAgent(req),
    ipAddress: getClientIp(req),
  });

  return { user: toPublicUser(user), tokens };
};

/** Cierre de sesion del dispositivo actual (idempotente). */
export const logout = async ({ refreshToken }) => {
  if (refreshToken) {
    await refreshTokenModel.revokeByHash(hashToken(refreshToken), 'logout');
  }
};

/** Cierre de sesion en todos los dispositivos. */
export const logoutAllSessions = async (userId) => {
  const revoked = await refreshTokenModel.revokeAllForUser(userId, 'logout');
  return { revokedSessions: revoked };
};

/**
 * Solicita la recuperacion de contraseña.
 * Devuelve siempre la misma respuesta para no revelar si el correo existe.
 */
export const requestPasswordReset = async ({ email }, req) => {
  const genericResponse = {
    message: 'Si el correo esta registrado, recibiras un enlace para restablecer tu contraseña.',
  };

  const user = await userModel.findByEmail(normalizeEmail(email));
  if (!user || user.status === 'deleted' || user.status === 'suspended') {
    return genericResponse;
  }

  const token = generateToken(48);

  await withTransaction(async (connection) => {
    // Invalida enlaces anteriores pendientes: solo el ultimo es valido.
    await passwordResetModel.invalidateAllForUser(user.id, connection);
    await passwordResetModel.create(
      {
        userId: user.id,
        tokenHash: hashToken(token),
        requestedIp: getClientIp(req),
        expiresAt: mysqlDateAfter(env.auth.passwordResetTtlMs),
      },
      connection
    );
  });

  const resetUrl = `${env.frontendUrl}/restablecer-password?token=${token}`;

  await sendPasswordResetEmail({
    to: user.email,
    firstName: user.firstName,
    resetUrl,
    ttlMinutes: env.auth.passwordResetTtlMinutes,
  });

  return genericResponse;
};

/**
 * Restablece la contraseña con un token de un solo uso.
 * Revoca todas las sesiones activas por seguridad.
 */
export const resetPassword = async ({ token, password }) => {
  const tokenHash = hashToken(token);
  const stored = await passwordResetModel.findActiveByHash(tokenHash);

  if (!stored) {
    throw AppError.badRequest('El enlace de recuperacion no es valido o ya ha caducado.');
  }

  const passwordHash = await hashPassword(password);

  await withTransaction(async (connection) => {
    await passwordResetModel.markUsed(stored.id, connection);
    await userModel.updatePassword(stored.userId, passwordHash);
    // Cualquier sesion abierta con la contraseña antigua deja de ser valida.
    await refreshTokenModel.revokeAllForUser(stored.userId, 'password_change');
  });

  return { message: 'Contraseña actualizada. Ya puedes iniciar sesion con tu nueva contraseña.' };
};

/** Cuenta de sesiones activas del usuario autenticado. */
export const getActiveSessions = async (userId) => ({
  activeSessions: await refreshTokenModel.countActiveForUser(userId),
});

export default {
  registerStudent,
  login,
  refreshSession,
  logout,
  logoutAllSessions,
  requestPasswordReset,
  resetPassword,
  getActiveSessions,
  toPublicUser,
};
