/**
 * STUDIA - Migraciones y verificacion automatica del esquema
 * ------------------------------------------------------------------
 * Asegura que las tablas `study_sessions` y `errors` contengan todas las
 * columnas e indices necesarios para los modulos Smart Focus y Error Journal.
 * Es idempotente: puede ejecutarse en cada inicio sin alterar datos existentes.
 */

import { pool } from './database.js';

export const runMigrations = async () => {
  try {
    const connection = await pool.getConnection();
    try {
      // 1. Verificar si la base de datos existe y tiene tablas
      const [tables] = await connection.query(
        "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()"
      );
      const tableNames = new Set(tables.map((t) => t.TABLE_NAME || t.table_name));

      // Si las tablas aun no existen (la BD no fue importada), salimos limpiamente
      if (!tableNames.has('study_sessions') || !tableNames.has('errors')) {
        console.log('[migrate] Tablas base aun no importadas. Las migraciones se aplicaran cuando se importe el esquema.');
        return;
      }

      // 2. Comprobar columnas de study_sessions
      const [sessionCols] = await connection.query(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'study_sessions'"
      );
      const sessionColSet = new Set(sessionCols.map((c) => c.COLUMN_NAME || c.column_name));

      if (!sessionColSet.has('client_session_id')) {
        await connection.query(
          "ALTER TABLE `study_sessions` ADD COLUMN `client_session_id` VARCHAR(64) NULL AFTER `user_id`"
        );
        console.log('[migrate] Columna study_sessions.client_session_id añadida.');
      }

      if (!sessionColSet.has('duration_seconds')) {
        await connection.query(
          "ALTER TABLE `study_sessions` ADD COLUMN `duration_seconds` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `duration_minutes`"
        );
        console.log('[migrate] Columna study_sessions.duration_seconds añadida.');
      }

      if (!sessionColSet.has('paused_seconds')) {
        await connection.query(
          "ALTER TABLE `study_sessions` ADD COLUMN `paused_seconds` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `duration_seconds`"
        );
        console.log('[migrate] Columna study_sessions.paused_seconds añadida.');
      }

      if (!sessionColSet.has('is_paused')) {
        await connection.query(
          "ALTER TABLE `study_sessions` ADD COLUMN `is_paused` TINYINT(1) NOT NULL DEFAULT 0 AFTER `paused_seconds`"
        );
        console.log('[migrate] Columna study_sessions.is_paused añadida.');
      }

      if (!sessionColSet.has('last_paused_at')) {
        await connection.query(
          "ALTER TABLE `study_sessions` ADD COLUMN `last_paused_at` DATETIME NULL AFTER `is_paused`"
        );
        console.log('[migrate] Columna study_sessions.last_paused_at añadida.');
      }

      // 3. Comprobar columnas de errors
      const [errorCols] = await connection.query(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'errors'"
      );
      const errorColSet = new Set(errorCols.map((c) => c.COLUMN_NAME || c.column_name));

      if (!errorColSet.has('exercise_title')) {
        await connection.query(
          "ALTER TABLE `errors` ADD COLUMN `exercise_title` VARCHAR(255) NULL AFTER `exercise_id`"
        );
        console.log('[migrate] Columna errors.exercise_title añadida.');
      }

      if (!errorColSet.has('user_answer')) {
        await connection.query(
          "ALTER TABLE `errors` ADD COLUMN `user_answer` TEXT NULL AFTER `exercise_title`"
        );
        console.log('[migrate] Columna errors.user_answer añadida.');
      }

      if (!errorColSet.has('correct_answer')) {
        await connection.query(
          "ALTER TABLE `errors` ADD COLUMN `correct_answer` TEXT NULL AFTER `user_answer`"
        );
        console.log('[migrate] Columna errors.correct_answer añadida.');
      }

      if (!errorColSet.has('explanation')) {
        await connection.query(
          "ALTER TABLE `errors` ADD COLUMN `explanation` TEXT NULL AFTER `correct_answer`"
        );
        console.log('[migrate] Columna errors.explanation añadida.');
      }

      if (!errorColSet.has('error_date')) {
        await connection.query(
          "ALTER TABLE `errors` ADD COLUMN `error_date` DATE NULL AFTER `explanation`"
        );
        console.log('[migrate] Columna errors.error_date añadida.');
      }

      // 4. Actualizar ENUMs si es necesario
      try {
        await connection.query(
          "ALTER TABLE `errors` MODIFY COLUMN `error_type` ENUM('conceptual','procedural','calculation','interpretation','memory','careless','time_management') NOT NULL DEFAULT 'conceptual'"
        );
        await connection.query(
          "ALTER TABLE `errors` MODIFY COLUMN `status` ENUM('pending','in_review','understood','open','resolved') NOT NULL DEFAULT 'pending'"
        );
      } catch (enumErr) {
        // En MariaDB/MySQL antiguas si falla modificar ENUM se registra advertencia
        console.warn('[migrate] Advertencia actualizando ENUM de errors:', enumErr.message);
      }

      // 5. Comprobar columnas de tasks (Smart Planner)
      if (tableNames.has('tasks')) {
        const [taskCols] = await connection.query(
          "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks'"
        );
        const taskColSet = new Set(taskCols.map((c) => c.COLUMN_NAME || c.column_name));

        if (!taskColSet.has('goal_period')) {
          await connection.query(
            "ALTER TABLE `tasks` ADD COLUMN `goal_period` ENUM('none','daily','weekly') NOT NULL DEFAULT 'none' AFTER `status`"
          );
          console.log('[migrate] Columna tasks.goal_period añadida.');
        }

        if (!taskColSet.has('scheduled_date')) {
          await connection.query(
            "ALTER TABLE `tasks` ADD COLUMN `scheduled_date` DATE NULL AFTER `due_date`"
          );
          console.log('[migrate] Columna tasks.scheduled_date añadida.');
        }

        if (!taskColSet.has('scheduled_start_time')) {
          await connection.query(
            "ALTER TABLE `tasks` ADD COLUMN `scheduled_start_time` TIME NULL AFTER `scheduled_date`"
          );
          console.log('[migrate] Columna tasks.scheduled_start_time añadida.');
        }

        if (!taskColSet.has('scheduled_end_time')) {
          await connection.query(
            "ALTER TABLE `tasks` ADD COLUMN `scheduled_end_time` TIME NULL AFTER `scheduled_start_time`"
          );
          console.log('[migrate] Columna tasks.scheduled_end_time añadida.');
        }
      }

      // 6. Comprobar columnas de learning_preferences (Learning Profile)
      if (tableNames.has('learning_preferences')) {
        const [prefCols] = await connection.query(
          "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'learning_preferences'"
        );
        const prefColSet = new Set(prefCols.map((c) => c.COLUMN_NAME || c.column_name));

        if (!prefColSet.has('step_by_step_pref')) {
          await connection.query(
            "ALTER TABLE `learning_preferences` ADD COLUMN `step_by_step_pref` TINYINT UNSIGNED NOT NULL DEFAULT 3 AFTER `learning_style`"
          );
          console.log('[migrate] Columna learning_preferences.step_by_step_pref añadida.');
        }

        if (!prefColSet.has('problem_solving_pref')) {
          await connection.query(
            "ALTER TABLE `learning_preferences` ADD COLUMN `problem_solving_pref` TINYINT UNSIGNED NOT NULL DEFAULT 3 AFTER `step_by_step_pref`"
          );
          console.log('[migrate] Columna learning_preferences.problem_solving_pref añadida.');
        }

        if (!prefColSet.has('concept_maps_pref')) {
          await connection.query(
            "ALTER TABLE `learning_preferences` ADD COLUMN `concept_maps_pref` TINYINT UNSIGNED NOT NULL DEFAULT 3 AFTER `problem_solving_pref`"
          );
          console.log('[migrate] Columna learning_preferences.concept_maps_pref añadida.');
        }

        if (!prefColSet.has('questioning_pref')) {
          await connection.query(
            "ALTER TABLE `learning_preferences` ADD COLUMN `questioning_pref` TINYINT UNSIGNED NOT NULL DEFAULT 3 AFTER `concept_maps_pref`"
          );
          console.log('[migrate] Columna learning_preferences.questioning_pref añadida.');
        }

        if (!prefColSet.has('spaced_repetition_pref')) {
          await connection.query(
            "ALTER TABLE `learning_preferences` ADD COLUMN `spaced_repetition_pref` TINYINT UNSIGNED NOT NULL DEFAULT 3 AFTER `questioning_pref`"
          );
          console.log('[migrate] Columna learning_preferences.spaced_repetition_pref añadida.');
        }

        if (!prefColSet.has('break_frequency_minutes')) {
          await connection.query(
            "ALTER TABLE `learning_preferences` ADD COLUMN `break_frequency_minutes` SMALLINT UNSIGNED NOT NULL DEFAULT 5 AFTER `spaced_repetition_pref`"
          );
          console.log('[migrate] Columna learning_preferences.break_frequency_minutes añadida.');
        }

        if (!prefColSet.has('dynamic_profile')) {
          await connection.query(
            "ALTER TABLE `learning_preferences` ADD COLUMN `dynamic_profile` JSON NULL AFTER `break_frequency_minutes`"
          );
          console.log('[migrate] Columna learning_preferences.dynamic_profile añadida.');
        }
      }

      // 7. Comprobar tabla flashcard_reviews (Memory Lab)
      if (tableNames.has('flashcards') && !tableNames.has('flashcard_reviews')) {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS \`flashcard_reviews\` (
            \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            \`flashcard_id\` BIGINT UNSIGNED NOT NULL,
            \`user_id\` BIGINT UNSIGNED NOT NULL,
            \`rating\` TINYINT UNSIGNED NOT NULL COMMENT 'Calificacion SM-2 (0-5)',
            \`review_date\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`scheduled_interval\` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
            \`ease_factor\` DECIMAL(4,2) NOT NULL DEFAULT 2.50,
            \`time_taken_seconds\` SMALLINT UNSIGNED NULL,
            PRIMARY KEY (\`id\`),
            KEY \`idx_reviews_user_card\` (\`user_id\`, \`flashcard_id\`),
            KEY \`idx_reviews_date\` (\`review_date\`),
            CONSTRAINT \`fk_reviews_flashcard\` FOREIGN KEY (\`flashcard_id\`) REFERENCES \`flashcards\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT \`fk_reviews_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Historial de repasos espaciados';
        `);
        console.log('[migrate] Tabla flashcard_reviews creada con exito.');
      }

      // 8. Comprobar tabla passport_entries (Academic Passport)
      if (tableNames.has('users') && !tableNames.has('passport_entries')) {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS \`passport_entries\` (
            \`id\`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            \`user_id\`        BIGINT UNSIGNED NOT NULL,
            \`entry_type\`     ENUM('skill','project','certification','achievement') NOT NULL DEFAULT 'skill',
            \`title\`          VARCHAR(200)    NOT NULL,
            \`description\`    TEXT            NULL,
            \`category\`       VARCHAR(120)    NULL,
            \`level\`          VARCHAR(60)     NULL,
            \`link\`           VARCHAR(500)    NULL,
            \`date_completed\` DATE            NULL,
            \`created_at\`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`),
            KEY \`idx_passport_user_type\` (\`user_id\`, \`entry_type\`),
            KEY \`idx_passport_user_date\` (\`user_id\`, \`date_completed\`),
            CONSTRAINT \`fk_passport_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
              ON DELETE CASCADE ON UPDATE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Pasaporte academico: habilidades, proyectos, certificaciones y logros';
        `);
        console.log('[migrate] Tabla passport_entries creada con exito.');
      }

      console.log('[migrate] Esquema verificado y actualizado con exito.');
    } finally {
      connection.release();
    }
  } catch (error) {
    console.warn('[migrate] No se pudo verificar o migrar el esquema automaticamente:', error.message);
  }
};
