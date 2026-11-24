/**
 * STUDIA - Modelo de perfil del estudiante (relacion 1:1 con users)
 */

import { pool } from '../config/database.js';

const PROFILE_COLUMNS = [
  'id',
  'user_id AS userId',
  'birth_date AS birthDate',
  'education_level AS educationLevel',
  'institution',
  'academic_program AS academicProgram',
  'grade_level AS gradeLevel',
  'main_goal AS mainGoal',
  'daily_goal_minutes AS dailyGoalMinutes',
  'timezone',
  'avatar_url AS avatarUrl',
  'bio',
  'created_at AS createdAt',
  'updated_at AS updatedAt',
].join(', ');

/** Crea el perfil academico asociado a un usuario. */
export const createForUser = async (userId, data = {}, connection = pool) => {
  const [result] = await connection.execute(
    `INSERT INTO student_profiles
       (user_id, birth_date, education_level, institution, academic_program,
        grade_level, main_goal, daily_goal_minutes, timezone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      data.birthDate || null,
      data.educationLevel || null,
      data.institution || null,
      data.academicProgram || null,
      data.gradeLevel || null,
      data.mainGoal || null,
      data.dailyGoalMinutes || 60,
      data.timezone || 'America/Mexico_City',
    ]
  );
  return result.insertId;
};

/** Busca el perfil por user_id. */
export const findByUserId = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT ${PROFILE_COLUMNS} FROM student_profiles WHERE user_id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

/**
 * Actualiza los campos permitidos del perfil.
 * Solo se actualizan las claves presentes en `data`; los nombres de columna
 * son una lista blanca fija, por lo que no pueden inyectarse.
 */
const UPDATABLE_FIELDS = {
  birthDate: 'birth_date',
  educationLevel: 'education_level',
  institution: 'institution',
  academicProgram: 'academic_program',
  gradeLevel: 'grade_level',
  mainGoal: 'main_goal',
  dailyGoalMinutes: 'daily_goal_minutes',
  timezone: 'timezone',
  avatarUrl: 'avatar_url',
  bio: 'bio',
};

export const updateByUserId = async (userId, data) => {
  const assignments = [];
  const params = [];

  for (const [key, column] of Object.entries(UPDATABLE_FIELDS)) {
    if (data[key] !== undefined) {
      assignments.push(`${column} = ?`);
      params.push(data[key]);
    }
  }

  if (assignments.length === 0) return 0;

  params.push(userId);
  const [result] = await pool.execute(
    `UPDATE student_profiles SET ${assignments.join(', ')} WHERE user_id = ?`,
    params
  );
  return result.affectedRows;
};

/** Perfil completo (usuario + datos academicos) para la pantalla de cuenta. */
export const getFullProfile = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT u.uuid, u.email, u.first_name AS firstName, u.last_name AS lastName,
            u.role, u.status, u.created_at AS memberSince,
            p.birth_date AS birthDate, p.education_level AS educationLevel,
            p.institution, p.academic_program AS academicProgram, p.grade_level AS gradeLevel,
            p.main_goal AS mainGoal, p.daily_goal_minutes AS dailyGoalMinutes,
            p.timezone, p.avatar_url AS avatarUrl, p.bio
       FROM users u
       LEFT JOIN student_profiles p ON p.user_id = u.id
      WHERE u.id = ?
      LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

export default {
  createForUser,
  findByUserId,
  updateByUserId,
  getFullProfile,
};
