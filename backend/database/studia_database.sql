-- =============================================================================
--  STUDIA - Script de creacion de la base de datos
-- =============================================================================
--  Motor        : MySQL / MariaDB (probado en MariaDB 10.4.32 incluido en XAMPP)
--  Base de datos: studia_db
--  Codificacion : utf8mb4 / utf8mb4_unicode_ci
--  Archivo      : backend/database/studia_database.sql
--
--  CONTENIDO
--    1. Creacion de la base de datos
--    2. Eliminacion controlada de tablas (permite reejecutar el script)
--    3. Definicion de las 15 tablas, indices y restricciones de integridad
--    4. Datos de demostracion claramente identificados (dominio @studia.demo)
--    5. Consultas de verificacion de relaciones
--
--  COMO IMPORTARLO EN phpMyAdmin (XAMPP)
--    1. Abre el Panel de Control de XAMPP e inicia Apache y MySQL.
--    2. Entra en http://localhost/phpmyadmin
--    3. Pestana "Importar" -> "Seleccionar archivo" -> elige este .sql
--    4. Verifica que el juego de caracteres sea utf-8 y pulsa "Continuar".
--    Alternativa por linea de comandos (Windows):
--      C:\xampp\mysql\bin\mysql.exe -u root -p < studia_database.sql
--      (si root no tiene contrasena, omite -p)
--
--  SEGURIDAD
--    * Las contrasenas se almacenan unicamente como hash bcrypt (coste 12).
--      No existe ninguna contrasena en texto plano en este archivo.
--    * La contrasena de los usuarios de demostracion se documenta en el README
--      solo porque se trata de datos de prueba sin valor real.
--    * Todas las claves foraneas usan ON UPDATE CASCADE y una estrategia de
--      borrado explicita (CASCADE o SET NULL), nunca borrado implicito.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. BASE DE DATOS
-- -----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `studia_db`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `studia_db`;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- -----------------------------------------------------------------------------
-- 2. LIMPIEZA CONTROLADA (orden inverso a las dependencias)
--    Permite volver a ejecutar el script sin errores de objetos existentes.
--    ADVERTENCIA: elimina los datos de las tablas de STUDIA.
-- -----------------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `achievements`;
DROP TABLE IF EXISTS `flashcards`;
DROP TABLE IF EXISTS `weekly_reports`;
DROP TABLE IF EXISTS `recommendations`;
DROP TABLE IF EXISTS `study_plans`;
DROP TABLE IF EXISTS `learning_preferences`;
DROP TABLE IF EXISTS `errors`;
DROP TABLE IF EXISTS `exercise_attempts`;
DROP TABLE IF EXISTS `exercises`;
DROP TABLE IF EXISTS `tasks`;
DROP TABLE IF EXISTS `study_sessions`;
DROP TABLE IF EXISTS `topics`;
DROP TABLE IF EXISTS `subjects`;
DROP TABLE IF EXISTS `student_profiles`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 3. TABLAS
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 3.1 users : cuenta de acceso de cada persona (estudiante, tutor o admin)
--     Borrado: LOGICO (status = 'deleted' + deleted_at) para conservar historico.
--     El borrado fisico de un usuario arrastra todos sus datos (CASCADE).
-- -----------------------------------------------------------------------------
CREATE TABLE `users` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid`              CHAR(36)        NOT NULL COMMENT 'Identificador publico (no expone el id secuencial)',
  `email`             VARCHAR(191)    NOT NULL,
  `password_hash`     VARCHAR(255)    NOT NULL COMMENT 'Hash bcrypt; nunca contrasena en texto plano',
  `first_name`        VARCHAR(80)     NOT NULL,
  `last_name`         VARCHAR(80)     NOT NULL,
  `role`              ENUM('student','tutor','admin') NOT NULL DEFAULT 'student',
  `status`            ENUM('pending','active','suspended','deleted') NOT NULL DEFAULT 'active',
  `email_verified_at` DATETIME        NULL,
  `last_login_at`     DATETIME        NULL,
  `created_at`        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`        DATETIME        NULL COMMENT 'Fecha del borrado logico de la cuenta',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_uuid` (`uuid`),
  KEY `idx_users_role_status` (`role`, `status`),
  KEY `idx_users_created_at` (`created_at`),
  CONSTRAINT `chk_users_email` CHECK (`email` LIKE '%_@_%._%'),
  CONSTRAINT `chk_users_deleted_at` CHECK (
    (`status` = 'deleted' AND `deleted_at` IS NOT NULL) OR (`status` <> 'deleted')
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Cuentas de usuario de STUDIA';

-- -----------------------------------------------------------------------------
-- 3.2 student_profiles : datos academicos del estudiante (relacion 1:1 con users)
-- -----------------------------------------------------------------------------
CREATE TABLE `student_profiles` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`           BIGINT UNSIGNED NOT NULL,
  `birth_date`        DATE            NULL,
  `education_level`   ENUM('primary','secondary','high_school','undergraduate','postgraduate','self_taught')
                                      NULL,
  `institution`       VARCHAR(150)    NULL COMMENT 'Escuela, colegio o universidad',
  `academic_program`  VARCHAR(150)    NULL COMMENT 'Carrera, curso o programa',
  `grade_level`       VARCHAR(50)     NULL COMMENT 'Grado, semestre o nivel actual',
  `main_goal`         VARCHAR(255)    NULL COMMENT 'Objetivo principal de estudio',
  `daily_goal_minutes` SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  `timezone`          VARCHAR(64)     NOT NULL DEFAULT 'America/Mexico_City',
  `avatar_url`        VARCHAR(500)    NULL,
  `bio`               TEXT            NULL,
  `created_at`        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_profiles_user` (`user_id`) COMMENT 'Relacion 1:1 con users',
  KEY `idx_student_profiles_level` (`education_level`),
  CONSTRAINT `fk_student_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_student_profiles_daily_goal` CHECK (`daily_goal_minutes` BETWEEN 10 AND 1440)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Perfil academico del estudiante';

-- -----------------------------------------------------------------------------
-- 3.3 subjects : materias o asignaturas de cada estudiante
-- -----------------------------------------------------------------------------
CREATE TABLE `subjects` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`          BIGINT UNSIGNED NOT NULL COMMENT 'Propietario de la materia',
  `name`             VARCHAR(120)    NOT NULL,
  `code`             VARCHAR(30)     NULL COMMENT 'Clave o codigo de la asignatura',
  `description`      TEXT            NULL,
  `color`            CHAR(7)         NULL COMMENT 'Color hexadecimal para la interfaz (#RRGGBB)',
  `icon`             VARCHAR(60)     NULL,
  `difficulty_level` ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  `teacher_name`     VARCHAR(120)    NULL,
  `target_hours`     DECIMAL(5,1)    NULL COMMENT 'Horas de estudio objetivo para el periodo',
  `status`           ENUM('active','paused','archived') NOT NULL DEFAULT 'active',
  `created_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_subjects_user_name` (`user_id`, `name`) COMMENT 'Evita materias duplicadas por estudiante',
  KEY `idx_subjects_user_status` (`user_id`, `status`),
  KEY `idx_subjects_code` (`code`),
  CONSTRAINT `fk_subjects_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_subjects_color` CHECK (`color` IS NULL OR `color` REGEXP '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT `chk_subjects_target_hours` CHECK (`target_hours` IS NULL OR `target_hours` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Materias del estudiante';

-- -----------------------------------------------------------------------------
-- 3.4 topics : temas dentro de una materia
--     Se conserva user_id (desnormalizacion controlada) para poder filtrar por
--     estudiante sin unir con subjects y para garantizar la propiedad del dato.
-- -----------------------------------------------------------------------------
CREATE TABLE `topics` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `subject_id`        BIGINT UNSIGNED NOT NULL,
  `user_id`           BIGINT UNSIGNED NOT NULL COMMENT 'Propietario (debe coincidir con subjects.user_id)',
  `name`              VARCHAR(150)    NOT NULL,
  `description`       TEXT            NULL,
  `difficulty_level`  ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  `priority`          TINYINT UNSIGNED NOT NULL DEFAULT 3 COMMENT '1 = maxima prioridad, 5 = minima',
  `status`            ENUM('pending','in_progress','mastered','needs_review') NOT NULL DEFAULT 'pending',
  `progress_percent`  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `estimated_minutes` SMALLINT UNSIGNED NULL,
  `created_at`        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_topics_subject_name` (`subject_id`, `name`),
  KEY `idx_topics_user_status` (`user_id`, `status`),
  KEY `idx_topics_subject` (`subject_id`),
  KEY `idx_topics_priority` (`user_id`, `priority`),
  CONSTRAINT `fk_topics_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_topics_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_topics_priority` CHECK (`priority` BETWEEN 1 AND 5),
  CONSTRAINT `chk_topics_progress` CHECK (`progress_percent` BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Temas de estudio por materia';

-- -----------------------------------------------------------------------------
-- 3.5 study_sessions : sesiones de estudio registradas
--     Si se elimina la materia o el tema, la sesion se conserva (SET NULL) para
--     no perder el historico de estudio del estudiante.
-- -----------------------------------------------------------------------------
CREATE TABLE `study_sessions` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`          BIGINT UNSIGNED NOT NULL,
  `subject_id`       BIGINT UNSIGNED NULL,
  `topic_id`         BIGINT UNSIGNED NULL,
  `started_at`       DATETIME        NOT NULL,
  `ended_at`         DATETIME        NULL,
  `duration_minutes` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `session_type`     ENUM('pomodoro','free','review','exam_practice') NOT NULL DEFAULT 'pomodoro',
  `focus_score`      TINYINT UNSIGNED NULL COMMENT 'Nivel de concentracion percibido (1-5)',
  `mood`             ENUM('motivated','neutral','tired','stressed','distracted') NULL,
  `notes`            TEXT            NULL,
  `created_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_study_sessions_user_started` (`user_id`, `started_at`),
  KEY `idx_study_sessions_subject` (`subject_id`),
  KEY `idx_study_sessions_topic` (`topic_id`),
  KEY `idx_study_sessions_type` (`user_id`, `session_type`),
  CONSTRAINT `fk_study_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_study_sessions_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_study_sessions_topic` FOREIGN KEY (`topic_id`) REFERENCES `topics` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_study_sessions_focus` CHECK (`focus_score` IS NULL OR `focus_score` BETWEEN 1 AND 5),
  CONSTRAINT `chk_study_sessions_range` CHECK (`ended_at` IS NULL OR `ended_at` >= `started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Sesiones de estudio del estudiante';

-- -----------------------------------------------------------------------------
-- 3.6 tasks : tareas y pendientes academicos
-- -----------------------------------------------------------------------------
CREATE TABLE `tasks` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`           BIGINT UNSIGNED NOT NULL,
  `subject_id`        BIGINT UNSIGNED NULL,
  `topic_id`          BIGINT UNSIGNED NULL,
  `title`             VARCHAR(200)    NOT NULL,
  `description`       TEXT            NULL,
  `due_date`          DATETIME        NULL,
  `priority`          ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  `status`            ENUM('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
  `estimated_minutes` SMALLINT UNSIGNED NULL,
  `actual_minutes`    SMALLINT UNSIGNED NULL,
  `completed_at`      DATETIME        NULL,
  `created_at`        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tasks_user_status_due` (`user_id`, `status`, `due_date`),
  KEY `idx_tasks_subject` (`subject_id`),
  KEY `idx_tasks_topic` (`topic_id`),
  CONSTRAINT `fk_tasks_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_tasks_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tasks_topic` FOREIGN KEY (`topic_id`) REFERENCES `topics` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_tasks_completed` CHECK (
    (`status` = 'completed' AND `completed_at` IS NOT NULL) OR (`status` <> 'completed')
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tareas y pendientes academicos';

-- -----------------------------------------------------------------------------
-- 3.7 exercises : ejercicios de practica creados o guardados por el estudiante
-- -----------------------------------------------------------------------------
CREATE TABLE `exercises` (
  `id`                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`            BIGINT UNSIGNED NOT NULL,
  `subject_id`         BIGINT UNSIGNED NOT NULL,
  `topic_id`           BIGINT UNSIGNED NULL,
  `title`              VARCHAR(200)    NOT NULL,
  `statement`          TEXT            NOT NULL COMMENT 'Enunciado del ejercicio',
  `exercise_type`      ENUM('multiple_choice','open_answer','true_false','problem_solving','coding')
                                       NOT NULL DEFAULT 'open_answer',
  `difficulty_level`   ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  `source`             VARCHAR(150)    NULL COMMENT 'Origen: libro, examen, plataforma...',
  `options`            JSON            NULL COMMENT 'Alternativas para multiple_choice/true_false',
  `correct_answer`     TEXT            NULL,
  `solution`           TEXT            NULL COMMENT 'Explicacion o procedimiento de solucion',
  `time_limit_seconds` SMALLINT UNSIGNED NULL,
  `is_active`          TINYINT(1)      NOT NULL DEFAULT 1,
  `created_at`         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_exercises_user_subject` (`user_id`, `subject_id`),
  KEY `idx_exercises_topic` (`topic_id`),
  KEY `idx_exercises_type_difficulty` (`exercise_type`, `difficulty_level`),
  CONSTRAINT `fk_exercises_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_exercises_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_exercises_topic` FOREIGN KEY (`topic_id`) REFERENCES `topics` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_exercises_time_limit` CHECK (`time_limit_seconds` IS NULL OR `time_limit_seconds` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Ejercicios de practica';

-- -----------------------------------------------------------------------------
-- 3.8 exercise_attempts : intentos de resolucion de un ejercicio
--     Historial de intentos: se elimina junto con el ejercicio (CASCADE).
-- -----------------------------------------------------------------------------
CREATE TABLE `exercise_attempts` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `exercise_id`      BIGINT UNSIGNED NOT NULL,
  `user_id`          BIGINT UNSIGNED NOT NULL,
  `attempt_number`   SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  `started_at`       DATETIME        NOT NULL,
  `completed_at`     DATETIME        NULL,
  `duration_seconds` INT UNSIGNED    NOT NULL DEFAULT 0,
  `user_answer`      TEXT            NULL,
  `is_correct`       TINYINT(1)      NULL COMMENT 'NULL = aun sin calificar',
  `score`            DECIMAL(5,2)    NULL COMMENT 'Puntaje del intento (0-100)',
  `hints_used`       TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `feedback`         TEXT            NULL,
  `created_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attempts_exercise_user_number` (`exercise_id`, `user_id`, `attempt_number`),
  KEY `idx_attempts_user_started` (`user_id`, `started_at`),
  KEY `idx_attempts_correct` (`exercise_id`, `is_correct`),
  CONSTRAINT `fk_attempts_exercise` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_attempts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_attempts_score` CHECK (`score` IS NULL OR `score` BETWEEN 0 AND 100),
  CONSTRAINT `chk_attempts_attempt_number` CHECK (`attempt_number` >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Intentos de resolucion de ejercicios';

-- -----------------------------------------------------------------------------
-- 3.9 errors : registro de errores cometidos y su analisis
--     Núcleo del aprendizaje basado en errores de STUDIA.
--     Si se elimina el ejercicio o el intento, el error se conserva (SET NULL).
-- -----------------------------------------------------------------------------
CREATE TABLE `errors` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`          BIGINT UNSIGNED NOT NULL,
  `subject_id`       BIGINT UNSIGNED NULL,
  `topic_id`         BIGINT UNSIGNED NULL,
  `exercise_id`      BIGINT UNSIGNED NULL,
  `attempt_id`       BIGINT UNSIGNED NULL COMMENT 'Intento concreto en el que ocurrio el error',
  `title`            VARCHAR(200)    NOT NULL,
  `description`      TEXT            NULL COMMENT 'Que ocurrio exactamente',
  `error_type`       ENUM('conceptual','procedural','careless','interpretation','time_management')
                                     NOT NULL DEFAULT 'conceptual',
  `severity`         ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  `status`           ENUM('open','in_review','resolved') NOT NULL DEFAULT 'open',
  `root_cause`       TEXT            NULL COMMENT 'Causa raiz identificada',
  `correction_notes` TEXT            NULL COMMENT 'Como se corrige y que se debe recordar',
  `review_count`     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `last_reviewed_at` DATETIME        NULL,
  `resolved_at`      DATETIME        NULL,
  `created_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_errors_user_status` (`user_id`, `status`),
  KEY `idx_errors_user_type` (`user_id`, `error_type`),
  KEY `idx_errors_subject` (`subject_id`),
  KEY `idx_errors_topic` (`topic_id`),
  KEY `idx_errors_exercise` (`exercise_id`),
  KEY `idx_errors_attempt` (`attempt_id`),
  CONSTRAINT `fk_errors_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_errors_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_errors_topic` FOREIGN KEY (`topic_id`) REFERENCES `topics` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_errors_exercise` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_errors_attempt` FOREIGN KEY (`attempt_id`) REFERENCES `exercise_attempts` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_errors_resolved` CHECK (
    (`status` = 'resolved' AND `resolved_at` IS NOT NULL) OR (`status` <> 'resolved')
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Registro y analisis de errores de aprendizaje';

-- -----------------------------------------------------------------------------
-- 3.10 learning_preferences : preferencias de estudio (relacion 1:1 con users)
-- -----------------------------------------------------------------------------
CREATE TABLE `learning_preferences` (
  `id`                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`                  BIGINT UNSIGNED NOT NULL,
  `learning_style`           ENUM('visual','auditory','reading','kinesthetic','mixed') NOT NULL DEFAULT 'mixed',
  `preferred_session_length` SMALLINT UNSIGNED NOT NULL DEFAULT 25 COMMENT 'Minutos por bloque de estudio',
  `preferred_study_time`     ENUM('early_morning','morning','afternoon','evening','night','flexible')
                                                  NOT NULL DEFAULT 'flexible',
  `notifications_enabled`    TINYINT(1)      NOT NULL DEFAULT 1,
  `reminder_time`            TIME            NULL,
  `pomodoro_work_minutes`    TINYINT UNSIGNED NOT NULL DEFAULT 25,
  `pomodoro_break_minutes`   TINYINT UNSIGNED NOT NULL DEFAULT 5,
  `weekly_goal_minutes`      SMALLINT UNSIGNED NOT NULL DEFAULT 420,
  `theme`                    ENUM('light','dark','system') NOT NULL DEFAULT 'system',
  `language`                 CHAR(5)         NOT NULL DEFAULT 'es-MX',
  `created_at`               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_learning_preferences_user` (`user_id`) COMMENT 'Relacion 1:1 con users',
  CONSTRAINT `fk_learning_preferences_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_preferences_session_length` CHECK (`preferred_session_length` BETWEEN 5 AND 240),
  CONSTRAINT `chk_preferences_pomodoro_work` CHECK (`pomodoro_work_minutes` BETWEEN 5 AND 120),
  CONSTRAINT `chk_preferences_pomodoro_break` CHECK (`pomodoro_break_minutes` BETWEEN 1 AND 60),
  CONSTRAINT `chk_preferences_weekly_goal` CHECK (`weekly_goal_minutes` BETWEEN 60 AND 10080)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Preferencias y habitos de estudio';

-- -----------------------------------------------------------------------------
-- 3.11 study_plans : planes de estudio con objetivo y periodo
-- -----------------------------------------------------------------------------
CREATE TABLE `study_plans` (
  `id`                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`                BIGINT UNSIGNED NOT NULL,
  `subject_id`             BIGINT UNSIGNED NULL,
  `title`                  VARCHAR(200)    NOT NULL,
  `description`            TEXT            NULL,
  `goal`                   VARCHAR(255)    NULL COMMENT 'Objetivo medible del plan',
  `start_date`             DATE            NOT NULL,
  `end_date`               DATE            NULL,
  `status`                 ENUM('draft','active','paused','completed','cancelled') NOT NULL DEFAULT 'draft',
  `weekly_target_minutes`  SMALLINT UNSIGNED NULL,
  `total_planned_minutes`  INT UNSIGNED    NULL,
  `completed_minutes`      INT UNSIGNED    NOT NULL DEFAULT 0,
  `progress_percent`       DECIMAL(5,2)    NOT NULL DEFAULT 0.00,
  `created_at`             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_study_plans_user_status` (`user_id`, `status`),
  KEY `idx_study_plans_dates` (`start_date`, `end_date`),
  KEY `idx_study_plans_subject` (`subject_id`),
  CONSTRAINT `fk_study_plans_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_study_plans_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_study_plans_dates` CHECK (`end_date` IS NULL OR `end_date` >= `start_date`),
  CONSTRAINT `chk_study_plans_progress` CHECK (`progress_percent` BETWEEN 0 AND 100),
  CONSTRAINT `chk_study_plans_completed` CHECK (
    `total_planned_minutes` IS NULL OR `completed_minutes` <= `total_planned_minutes` * 2
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Planes de estudio';

-- -----------------------------------------------------------------------------
-- 3.12 recommendations : recomendaciones generadas para el estudiante
-- -----------------------------------------------------------------------------
CREATE TABLE `recommendations` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`        BIGINT UNSIGNED NOT NULL,
  `study_plan_id`  BIGINT UNSIGNED NULL,
  `subject_id`     BIGINT UNSIGNED NULL,
  `topic_id`       BIGINT UNSIGNED NULL,
  `type`           ENUM('task','study_session','review','flashcard','resource') NOT NULL DEFAULT 'study_session',
  `title`          VARCHAR(200)    NOT NULL,
  `description`    TEXT            NULL,
  `rationale`      TEXT            NULL COMMENT 'Motivo de la recomendacion (que dato la origino)',
  `source`         ENUM('system','ai','tutor') NOT NULL DEFAULT 'system',
  `priority`       ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  `status`         ENUM('pending','accepted','dismissed','completed','expired') NOT NULL DEFAULT 'pending',
  `score`          DECIMAL(5,2)    NULL COMMENT 'Puntaje de relevancia calculado',
  `valid_until`    DATETIME        NULL,
  `acted_at`       DATETIME        NULL COMMENT 'Momento en que el estudiante acepto o descarto',
  `created_at`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_recommendations_user_status` (`user_id`, `status`, `priority`),
  KEY `idx_recommendations_plan` (`study_plan_id`),
  KEY `idx_recommendations_subject` (`subject_id`),
  KEY `idx_recommendations_topic` (`topic_id`),
  KEY `idx_recommendations_valid_until` (`valid_until`),
  CONSTRAINT `fk_recommendations_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_recommendations_plan` FOREIGN KEY (`study_plan_id`) REFERENCES `study_plans` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_recommendations_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_recommendations_topic` FOREIGN KEY (`topic_id`) REFERENCES `topics` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Recomendaciones personalizadas de estudio';

-- -----------------------------------------------------------------------------
-- 3.13 weekly_reports : reporte semanal de progreso (uno por semana y usuario)
-- -----------------------------------------------------------------------------
CREATE TABLE `weekly_reports` (
  `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`               BIGINT UNSIGNED NOT NULL,
  `week_start_date`       DATE            NOT NULL COMMENT 'Lunes de la semana reportada',
  `week_end_date`         DATE            NOT NULL,
  `total_study_minutes`   INT UNSIGNED    NOT NULL DEFAULT 0,
  `total_sessions`        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `tasks_completed`       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `tasks_pending`         SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `exercises_attempted`   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `exercises_correct`     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `accuracy_percentage`   DECIMAL(5,2)    NULL,
  `average_focus_score`   DECIMAL(3,2)    NULL,
  `errors_created`        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `errors_resolved`       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `current_streak_days`   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `summary`               TEXT            NULL,
  `strengths`             TEXT            NULL,
  `improvement_areas`     TEXT            NULL,
  `next_week_focus`       TEXT            NULL,
  `generated_at`          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at`            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_weekly_reports_user_week` (`user_id`, `week_start_date`) COMMENT 'Un reporte por semana',
  KEY `idx_weekly_reports_week` (`week_start_date`),
  CONSTRAINT `fk_weekly_reports_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_weekly_reports_dates` CHECK (`week_end_date` >= `week_start_date`),
  CONSTRAINT `chk_weekly_reports_accuracy` CHECK (`accuracy_percentage` IS NULL OR `accuracy_percentage` BETWEEN 0 AND 100),
  CONSTRAINT `chk_weekly_reports_focus` CHECK (`average_focus_score` IS NULL OR `average_focus_score` BETWEEN 1 AND 5),
  CONSTRAINT `chk_weekly_reports_correct` CHECK (`exercises_correct` <= `exercises_attempted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Reportes semanales de progreso';

-- -----------------------------------------------------------------------------
-- 3.14 flashcards : tarjetas de repaso con repeticion espaciada (SM-2)
-- -----------------------------------------------------------------------------
CREATE TABLE `flashcards` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`          BIGINT UNSIGNED NOT NULL,
  `subject_id`       BIGINT UNSIGNED NULL,
  `topic_id`         BIGINT UNSIGNED NULL,
  `error_id`         BIGINT UNSIGNED NULL COMMENT 'Tarjeta creada a partir de un error',
  `front_text`       TEXT            NOT NULL COMMENT 'Pregunta o concepto',
  `back_text`        TEXT            NOT NULL COMMENT 'Respuesta o explicacion',
  `hint`             TEXT            NULL,
  `difficulty_level` ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  `status`           ENUM('new','learning','review','mastered') NOT NULL DEFAULT 'new',
  `source`           ENUM('manual','from_error','auto') NOT NULL DEFAULT 'manual',
  `ease_factor`      DECIMAL(4,2)    NOT NULL DEFAULT 2.50 COMMENT 'Factor de facilidad (SM-2)',
  `interval_days`    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `repetitions`      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `lapses`           SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `last_reviewed_at` DATETIME        NULL,
  `next_review_at`   DATETIME        NULL,
  `created_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_flashcards_user_status` (`user_id`, `status`),
  KEY `idx_flashcards_next_review` (`user_id`, `next_review_at`),
  KEY `idx_flashcards_subject` (`subject_id`),
  KEY `idx_flashcards_topic` (`topic_id`),
  KEY `idx_flashcards_error` (`error_id`),
  CONSTRAINT `fk_flashcards_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_flashcards_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_flashcards_topic` FOREIGN KEY (`topic_id`) REFERENCES `topics` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_flashcards_error` FOREIGN KEY (`error_id`) REFERENCES `errors` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_flashcards_ease` CHECK (`ease_factor` BETWEEN 1.30 AND 5.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tarjetas de repaso espaciado';

-- -----------------------------------------------------------------------------
-- 3.15 achievements : logros desbloqueados por el estudiante
--      (user_id, code) es unico: un mismo logro se guarda una sola vez por
--      usuario, evitando duplicar la definicion de cada logro.
-- -----------------------------------------------------------------------------
CREATE TABLE `achievements` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`       BIGINT UNSIGNED NOT NULL,
  `code`          VARCHAR(60)     NOT NULL COMMENT 'Clave estable del logro (ej. first_week_streak)',
  `name`          VARCHAR(120)    NOT NULL,
  `description`   VARCHAR(255)    NULL,
  `category`      ENUM('consistency','progress','mastery','effort','social') NOT NULL DEFAULT 'progress',
  `icon`          VARCHAR(60)     NULL,
  `points`        SMALLINT UNSIGNED NOT NULL DEFAULT 10,
  `target_value`  INT UNSIGNED    NOT NULL DEFAULT 1 COMMENT 'Meta necesaria para desbloquearlo',
  `current_value` INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT 'Progreso actual hacia la meta',
  `unlocked_at`   DATETIME        NULL COMMENT 'NULL = aun no desbloqueado',
  `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_achievements_user_code` (`user_id`, `code`),
  KEY `idx_achievements_user_unlocked` (`user_id`, `unlocked_at`),
  KEY `idx_achievements_category` (`category`),
  CONSTRAINT `fk_achievements_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_achievements_progress` CHECK (`current_value` <= `target_value` * 10),
  CONSTRAINT `chk_achievements_points` CHECK (`points` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Logros del estudiante';

-- =============================================================================
-- 4. DATOS DE DEMOSTRACION
-- =============================================================================
--  Todo dato de prueba es identificable:
--    * Correos con el dominio reservado @studia.demo
--    * Nombres de usuario: admin_demo, ana_demo, luis_demo
--    * Contrasena de demostracion: StudiaDemo123!  (almacenada solo como hash bcrypt)
--  Para eliminar la demo completa basta con borrar los usuarios de demostracion:
--    DELETE FROM users WHERE email LIKE '%@studia.demo';
-- =============================================================================

-- --- Usuarios -----------------------------------------------------------------
-- password_hash = bcrypt(coste 12) de "StudiaDemo123!"
INSERT INTO `users`
  (`id`, `uuid`, `email`, `password_hash`, `first_name`, `last_name`, `role`, `status`, `email_verified_at`, `created_at`)
VALUES
  (1, 'a1b2c3d4-0001-4000-8000-000000000001', 'admin@studia.demo',
   '$2b$12$2mPuJBGqDn5RqhjbIBHXYuLaD7/JEuVJLjo1f/ruWirckexmvnOW2',
   'Administrador', 'STUDIA', 'admin', 'active', NOW(), NOW() - INTERVAL 30 DAY),
  (2, 'a1b2c3d4-0001-4000-8000-000000000002', 'ana@studia.demo',
   '$2b$12$AnMGjDjDBa5TYkd1gSwUBuUFjMcAJOAE0gKJyCuab0zV5ahTQWUv6',
   'Ana', 'Ramirez', 'student', 'active', NOW(), NOW() - INTERVAL 21 DAY),
  (3, 'a1b2c3d4-0001-4000-8000-000000000003', 'luis@studia.demo',
   '$2b$12$W4x397zLUbDstD3/c8lqSOQVKmbcuK8Hz6kOYSkPexASZPBbFpLzm',
   'Luis', 'Hernandez', 'student', 'active', NOW(), NOW() - INTERVAL 14 DAY);

-- --- Perfiles de estudiante ---------------------------------------------------
INSERT INTO `student_profiles`
  (`id`, `user_id`, `birth_date`, `education_level`, `institution`, `academic_program`, `grade_level`,
   `main_goal`, `daily_goal_minutes`, `timezone`, `bio`)
VALUES
  (1, 2, '2003-04-12', 'undergraduate', 'Universidad Nacional', 'Ingenieria en Sistemas', '4to semestre',
   'Aprobar calculo y mejorar mi promedio general', 120, 'America/Mexico_City',
   'Estudiante demo con dificultades en derivadas e integrales.'),
  (2, 3, '2001-09-30', 'undergraduate', 'Universidad Nacional', 'Licenciatura en Historia', '6to semestre',
   'Preparar el examen final de historia e ingles B1', 90, 'America/Mexico_City',
   'Estudiante demo enfocado en lectura y repaso con tarjetas.');

-- --- Materias -----------------------------------------------------------------
INSERT INTO `subjects`
  (`id`, `user_id`, `name`, `code`, `description`, `color`, `icon`, `difficulty_level`, `teacher_name`, `target_hours`, `status`)
VALUES
  (1, 2, 'Matematicas', 'MAT-101', 'Calculo diferencial e integral.', '#3f51b5', 'calculator', 'hard', 'Prof. Gomez', 40.0, 'active'),
  (2, 2, 'Programacion Web', 'PRG-201', 'HTML, CSS, JavaScript y React.', '#1b7f4b', 'code', 'medium', 'Prof. Sanchez', 30.0, 'active'),
  (3, 2, 'Fisica', 'FIS-150', 'Cinematica y leyes de Newton.', '#b3261e', 'atom', 'medium', 'Prof. Torres', 20.0, 'paused'),
  (4, 3, 'Historia Universal', 'HIS-210', 'Revoluciones y siglo XX.', '#8a5a00', 'book', 'easy', 'Prof. Diaz', 25.0, 'active'),
  (5, 3, 'Ingles B1', 'ENG-B1', 'Gramatica y comprension intermedia.', '#00695c', 'language', 'medium', 'Prof. Ruiz', 18.0, 'active');

-- --- Temas --------------------------------------------------------------------
INSERT INTO `topics`
  (`id`, `subject_id`, `user_id`, `name`, `description`, `difficulty_level`, `priority`, `status`, `progress_percent`, `estimated_minutes`)
VALUES
  (1, 1, 2, 'Derivadas', 'Reglas de derivacion y aplicaciones.', 'hard', 1, 'needs_review', 45, 240),
  (2, 1, 2, 'Integrales', 'Integrales inmediatas y por partes.', 'hard', 2, 'in_progress', 20, 300),
  (3, 1, 2, 'Limites', 'Limites y continuidad.', 'medium', 3, 'mastered', 100, 150),
  (4, 2, 2, 'JavaScript basico', 'Variables, funciones y DOM.', 'medium', 1, 'in_progress', 60, 200),
  (5, 2, 2, 'React fundamentos', 'Componentes, props y estado.', 'medium', 2, 'pending', 0, 240),
  (6, 3, 2, 'Cinematica', 'MRU y MRUA.', 'medium', 4, 'pending', 10, 120),
  (7, 4, 3, 'Revolucion Industrial', 'Causas y consecuencias.', 'easy', 1, 'mastered', 100, 120),
  (8, 4, 3, 'Guerras Mundiales', 'Causas, desarrollo y tratados.', 'medium', 2, 'in_progress', 55, 200),
  (9, 5, 3, 'Past Simple', 'Verbos regulares e irregulares.', 'easy', 1, 'in_progress', 70, 90);

-- --- Sesiones de estudio ------------------------------------------------------
INSERT INTO `study_sessions`
  (`id`, `user_id`, `subject_id`, `topic_id`, `started_at`, `ended_at`, `duration_minutes`,
   `session_type`, `focus_score`, `mood`, `notes`)
VALUES
  (1, 2, 1, 1, NOW() - INTERVAL 5 DAY - INTERVAL 2 HOUR, NOW() - INTERVAL 5 DAY - INTERVAL 50 MINUTE, 70,
   'pomodoro', 4, 'motivated', 'Practique reglas de la cadena y del producto.'),
  (2, 2, 1, 2, NOW() - INTERVAL 3 DAY - INTERVAL 3 HOUR, NOW() - INTERVAL 3 DAY - INTERVAL 105 MINUTE, 75,
   'pomodoro', 3, 'neutral', 'Me confundi con la integracion por partes.'),
  (3, 2, 2, 4, NOW() - INTERVAL 2 DAY - INTERVAL 1 HOUR, NOW() - INTERVAL 2 DAY - INTERVAL 25 MINUTE, 35,
   'free', 5, 'focused', 'Manipulacion del DOM con eventos.'),
  (4, 2, 1, 1, NOW() - INTERVAL 1 DAY - INTERVAL 90 MINUTE, NOW() - INTERVAL 1 DAY - INTERVAL 30 MINUTE, 60,
   'review', 4, 'motivated', 'Repaso de derivadas con tarjetas.'),
  (5, 3, 4, 7, NOW() - INTERVAL 4 DAY - INTERVAL 2 HOUR, NOW() - INTERVAL 4 DAY - INTERVAL 65 MINUTE, 55,
   'free', 4, 'neutral', 'Resumen de la revolucion industrial.'),
  (6, 3, 5, 9, NOW() - INTERVAL 2 DAY - INTERVAL 100 MINUTE, NOW() - INTERVAL 2 DAY - INTERVAL 40 MINUTE, 60,
   'exam_practice', 3, 'tired', 'Ejercicios de past simple.');

-- --- Tareas -------------------------------------------------------------------
INSERT INTO `tasks`
  (`id`, `user_id`, `subject_id`, `topic_id`, `title`, `description`, `due_date`, `priority`, `status`,
   `estimated_minutes`, `actual_minutes`, `completed_at`)
VALUES
  (1, 2, 1, 1, 'Resolver guia de derivadas', 'Ejercicios 1 al 20 del cuadernillo.', NOW() + INTERVAL 2 DAY, 'high',
   'in_progress', 90, NULL, NULL),
  (2, 2, 1, 2, 'Entregar tarea de integrales', 'Tarea semanal del profesor Gomez.', NOW() + INTERVAL 5 DAY, 'urgent',
   'pending', 120, NULL, NULL),
  (3, 2, 2, 5, 'Practicar componentes en React', 'Crear un contador y una lista de tareas.', NOW() + INTERVAL 7 DAY, 'medium',
   'pending', 150, NULL, NULL),
  (4, 2, 1, 3, 'Repasar limites', 'Ejercicios de limites con indeterminaciones.', NOW() - INTERVAL 2 DAY, 'low',
   'completed', 45, 50, NOW() - INTERVAL 2 DAY),
  (5, 3, 4, 8, 'Ensayo de la Segunda Guerra Mundial', 'Ensayo de 3 cuartillas.', NOW() + INTERVAL 4 DAY, 'high',
   'in_progress', 180, NULL, NULL),
  (6, 3, 5, 9, 'Lista de verbos irregulares', 'Memorizar 40 verbos irregulares.', NOW() - INTERVAL 1 DAY, 'medium',
   'completed', 60, 75, NOW() - INTERVAL 1 DAY);

-- --- Ejercicios ---------------------------------------------------------------
INSERT INTO `exercises`
  (`id`, `user_id`, `subject_id`, `topic_id`, `title`, `statement`, `exercise_type`, `difficulty_level`,
   `source`, `options`, `correct_answer`, `solution`, `time_limit_seconds`, `is_active`)
VALUES
  (1, 2, 1, 1, 'Derivada de un producto',
   'Calcula la derivada de f(x) = x^2 * sen(x).',
   'multiple_choice', 'medium', 'Cuadernillo MAT-101',
   '[{"key":"a","text":"2x * cos(x)"},{"key":"b","text":"2x * sen(x) + x^2 * cos(x)"},{"key":"c","text":"x^2 * cos(x)"},{"key":"d","text":"2x * sen(x)"}]',
   'b',
   'Se aplica la regla del producto: (u*v)'' = u''v + uv''.',
   180, 1),
  (2, 2, 1, 2, 'Integral inmediata',
   'Resuelve la integral indefinida de 3x^2 dx.',
   'open_answer', 'easy', 'Cuadernillo MAT-101', NULL,
   'x^3 + C', 'La integral de x^n es x^(n+1)/(n+1).', 120, 1),
  (3, 2, 2, 4, 'Manipulacion del DOM',
   'Escribe el codigo que cambia el texto de un elemento con id "titulo" al hacer clic en un boton.',
   'coding', 'medium', 'Practica PRG-201', NULL,
   'document.getElementById("titulo").textContent = "Nuevo titulo";',
   'Se obtiene el elemento y se asigna la propiedad textContent dentro del evento click.', 300, 1),
  (4, 3, 4, 8, 'Causas de la Segunda Guerra Mundial',
   'Menciona tres causas de la Segunda Guerra Mundial.',
   'open_answer', 'medium', 'Libro de texto HIS-210', NULL,
   'Tratado de Versalles, expansionismo aleman y fracaso de la Sociedad de Naciones.',
   'Se valora la pertinencia historica de cada causa mencionada.', NULL, 1),
  (5, 3, 5, 9, 'Past simple de "go"',
   'Cual es el pasado simple del verbo "go"?',
   'true_false', 'easy', 'Workbook ENG-B1',
   '[{"key":"a","text":"Verdadero: went"},{"key":"b","text":"Falso: goed"}]',
   'a', 'El verbo "go" es irregular y su pasado simple es "went".', 60, 1);

-- --- Intentos de ejercicios ---------------------------------------------------
INSERT INTO `exercise_attempts`
  (`id`, `exercise_id`, `user_id`, `attempt_number`, `started_at`, `completed_at`, `duration_seconds`,
   `user_answer`, `is_correct`, `score`, `hints_used`, `feedback`)
VALUES
  (1, 1, 2, 1, NOW() - INTERVAL 5 DAY - INTERVAL 10 MINUTE, NOW() - INTERVAL 5 DAY - INTERVAL 7 MINUTE, 180,
   'a', 0, 0.00, 1, 'Se confundio la regla del producto con la de la cadena.'),
  (2, 1, 2, 2, NOW() - INTERVAL 1 DAY - INTERVAL 8 MINUTE, NOW() - INTERVAL 1 DAY - INTERVAL 5 MINUTE, 160,
   'b', 1, 100.00, 0, 'Correcto. Aplico bien la regla del producto.'),
  (3, 2, 2, 1, NOW() - INTERVAL 3 DAY - INTERVAL 20 MINUTE, NOW() - INTERVAL 3 DAY - INTERVAL 15 MINUTE, 240,
   'x^2 + C', 0, 0.00, 2, 'Falto incrementar el exponente antes de dividir.'),
  (4, 5, 3, 1, NOW() - INTERVAL 2 DAY - INTERVAL 30 MINUTE, NOW() - INTERVAL 2 DAY - INTERVAL 29 MINUTE, 45,
   'a', 1, 100.00, 0, 'Correcto.'),
  (5, 4, 3, 1, NOW() - INTERVAL 4 DAY - INTERVAL 40 MINUTE, NOW() - INTERVAL 4 DAY - INTERVAL 25 MINUTE, 900,
   'Versalles y la crisis economica.', NULL, NULL, 0, 'Pendiente de calificacion manual.');

-- --- Errores ------------------------------------------------------------------
INSERT INTO `errors`
  (`id`, `user_id`, `subject_id`, `topic_id`, `exercise_id`, `attempt_id`, `title`, `description`,
   `error_type`, `severity`, `status`, `root_cause`, `correction_notes`, `review_count`, `last_reviewed_at`, `resolved_at`)
VALUES
  (1, 2, 1, 1, 1, 1, 'Confusion entre regla del producto y de la cadena',
   'Aplique la regla de la cadena en lugar de la regla del producto.',
   'conceptual', 'high', 'resolved',
   'No identifico cuando hay un producto de dos funciones.',
   'Antes de derivar, escribir u y v por separado y la formula u''v + uv''.',
   3, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY),
  (2, 2, 1, 2, 2, 3, 'Error al integrar potencias',
   'Escribi x^2 + C en vez de x^3 + C al integrar 3x^2.',
   'procedural', 'medium', 'in_review',
   'Olvido incrementar el exponente antes de dividir por el nuevo exponente.',
   'Recordar la formula: integral de x^n = x^(n+1)/(n+1) + C.',
   1, NOW(), NULL),
  (3, 2, 2, 4, NULL, NULL, 'No elimino el listener de eventos',
   'El evento se registraba varias veces y el contador se incrementaba de mas.',
   'procedural', 'medium', 'open',
   'Poca practica con el ciclo de vida de los eventos.',
   'Usar removeEventListener o registrar el listener una sola vez.',
   0, NULL, NULL);

-- --- Preferencias de aprendizaje ----------------------------------------------
INSERT INTO `learning_preferences`
  (`id`, `user_id`, `learning_style`, `preferred_session_length`, `preferred_study_time`,
   `notifications_enabled`, `reminder_time`, `pomodoro_work_minutes`, `pomodoro_break_minutes`,
   `weekly_goal_minutes`, `theme`, `language`)
VALUES
  (1, 2, 'visual', 25, 'evening', 1, '19:30:00', 25, 5, 600, 'dark', 'es-MX'),
  (2, 3, 'reading', 45, 'morning', 1, '08:00:00', 45, 10, 420, 'system', 'es-MX'),
  (3, 1, 'mixed', 30, 'flexible', 0, NULL, 30, 5, 300, 'light', 'es-MX');

-- --- Planes de estudio --------------------------------------------------------
INSERT INTO `study_plans`
  (`id`, `user_id`, `subject_id`, `title`, `description`, `goal`, `start_date`, `end_date`, `status`,
   `weekly_target_minutes`, `total_planned_minutes`, `completed_minutes`, `progress_percent`)
VALUES
  (1, 2, 1, 'Plan de recuperacion en Matematicas',
   'Reforzar derivadas e integrales antes del examen parcial.',
   'Obtener al menos 80 en el examen parcial', CURDATE() - INTERVAL 7 DAY, CURDATE() + INTERVAL 14 DAY, 'active',
   420, 1260, 240, 19.05),
  (2, 3, 4, 'Preparacion del examen final de Historia',
   'Repaso cronologico con mapas mentales y tarjetas.',
   'Aprobar el examen final con 90 o mas', CURDATE() - INTERVAL 3 DAY, CURDATE() + INTERVAL 21 DAY, 'active',
   300, 900, 110, 12.22),
  (3, 2, 2, 'Fundamentos de React',
   'Practicar componentes, estado y hooks.',
   'Construir una aplicacion de tareas funcional', CURDATE() + INTERVAL 2 DAY, CURDATE() + INTERVAL 30 DAY, 'draft',
   240, 960, 0, 0.00);

-- --- Recomendaciones ----------------------------------------------------------
INSERT INTO `recommendations`
  (`id`, `user_id`, `study_plan_id`, `subject_id`, `topic_id`, `type`, `title`, `description`, `rationale`,
   `source`, `priority`, `status`, `score`, `valid_until`, `acted_at`)
VALUES
  (1, 2, 1, 1, 2, 'review', 'Repasar integracion por partes',
   'Dedica 25 minutos a repasar la integracion por partes con 3 ejercicios guiados.',
   'Tienes un error procedural abierto en el tema Integrales.',
   'system', 'high', 'pending', 92.50, NOW() + INTERVAL 3 DAY, NULL),
  (2, 2, 1, 1, 1, 'flashcard', 'Reforzar la regla del producto',
   'Repasa las tarjetas sobre la regla del producto antes del siguiente bloque de estudio.',
   'Has acertado 1 de 2 intentos: conviene consolidar con repaso espaciado.',
   'system', 'medium', 'accepted', 78.00, NOW() + INTERVAL 2 DAY, NOW() - INTERVAL 1 DAY),
  (3, 2, NULL, 2, 5, 'study_session', 'Iniciar el tema de React',
   'Programa una sesion de 50 minutos para comenzar con componentes y props.',
   'El tema React fundamentos sigue sin avance (0%).',
   'system', 'medium', 'pending', 65.00, NOW() + INTERVAL 7 DAY, NULL),
  (4, 3, 2, 4, 8, 'task', 'Cerrar el ensayo de la Segunda Guerra Mundial',
   'Planifica dos bloques para terminar el ensayo antes de la entrega.',
   'La tarea vence en 4 dias y sigue en progreso.',
   'system', 'high', 'pending', 88.00, NOW() + INTERVAL 4 DAY, NULL);

-- --- Reportes semanales -------------------------------------------------------
INSERT INTO `weekly_reports`
  (`id`, `user_id`, `week_start_date`, `week_end_date`, `total_study_minutes`, `total_sessions`,
   `tasks_completed`, `tasks_pending`, `exercises_attempted`, `exercises_correct`, `accuracy_percentage`,
   `average_focus_score`, `errors_created`, `errors_resolved`, `current_streak_days`,
   `summary`, `strengths`, `improvement_areas`, `next_week_focus`)
VALUES
  (1, 2, CURDATE() - INTERVAL 7 DAY, CURDATE() - INTERVAL 1 DAY, 240, 4, 1, 3, 3, 1, 33.33, 4.00, 3, 1, 5,
   'Semana de repaso centrada en derivadas; la precision en ejercicios aun es baja.',
   'Buena constancia diaria y alta concentracion en las sesiones de repaso.',
   'Precision al aplicar reglas de derivacion e integracion.',
   'Practicar integracion por partes y cerrar los errores abiertos.'),
  (2, 3, CURDATE() - INTERVAL 7 DAY, CURDATE() - INTERVAL 1 DAY, 115, 2, 1, 1, 2, 1, 50.00, 3.50, 0, 0, 3,
   'Avance estable en historia e ingles, con ritmo mas lento en el ensayo.',
   'Comprension lectora y constancia en el repaso con tarjetas.',
   'Redaccion y gestion del tiempo para tareas largas.',
   'Dividir el ensayo en bloques de 45 minutos.');

-- --- Tarjetas de repaso -------------------------------------------------------
INSERT INTO `flashcards`
  (`id`, `user_id`, `subject_id`, `topic_id`, `error_id`, `front_text`, `back_text`, `hint`,
   `difficulty_level`, `status`, `source`, `ease_factor`, `interval_days`, `repetitions`, `lapses`,
   `last_reviewed_at`, `next_review_at`)
VALUES
  (1, 2, 1, 1, 1, 'Cual es la regla del producto?',
   '(u * v)'' = u'' * v + u * v''', 'Piensa en dos funciones multiplicandose.',
   'medium', 'review', 'from_error', 2.36, 3, 4, 1, NOW() - INTERVAL 1 DAY, NOW() + INTERVAL 3 DAY),
  (2, 2, 1, 2, 2, 'Integral de x^n dx',
   'x^(n+1)/(n+1) + C, para n distinto de -1', 'Incrementa el exponente y divide entre el nuevo exponente.',
   'medium', 'learning', 'from_error', 2.10, 1, 2, 1, NOW(), NOW() + INTERVAL 1 DAY),
  (3, 2, 2, 4, NULL, 'Como seleccionar un elemento por id en JavaScript?',
   'document.getElementById("id")', 'Usa el objeto document.',
   'easy', 'mastered', 'manual', 2.60, 15, 6, 0, NOW() - INTERVAL 5 DAY, NOW() + INTERVAL 15 DAY),
  (4, 3, 5, 9, NULL, 'Pasado simple de "go"',
   'went', 'Verbo irregular.', 'easy', 'review', 'manual', 2.50, 4, 3, 0,
   NOW() - INTERVAL 2 DAY, NOW() + INTERVAL 4 DAY);

-- --- Logros -------------------------------------------------------------------
INSERT INTO `achievements`
  (`id`, `user_id`, `code`, `name`, `description`, `category`, `icon`, `points`,
   `target_value`, `current_value`, `unlocked_at`)
VALUES
  (1, 2, 'first_session', 'Primer paso', 'Completa tu primera sesion de estudio.', 'effort', 'play', 10,
   1, 1, NOW() - INTERVAL 21 DAY),
  (2, 2, 'streak_5_days', 'Racha de 5 dias', 'Estudia 5 dias consecutivos.', 'consistency', 'flame', 50,
   5, 5, NOW() - INTERVAL 5 DAY),
  (3, 2, 'error_hunter', 'Cazador de errores', 'Resuelve 10 errores registrados.', 'mastery', 'target', 80,
   10, 3, NULL),
  (4, 2, 'flashcard_master', 'Maestro de tarjetas', 'Domina 20 tarjetas de repaso.', 'progress', 'cards', 60,
   20, 1, NULL),
  (5, 3, 'first_session', 'Primer paso', 'Completa tu primera sesion de estudio.', 'effort', 'play', 10,
   1, 1, NOW() - INTERVAL 14 DAY),
  (6, 3, 'week_goal', 'Meta semanal cumplida', 'Alcanza tu meta semanal de estudio.', 'consistency', 'calendar', 40,
   420, 115, NULL);

-- =============================================================================
-- 5. VERIFICACION DE RELACIONES Y CONSULTAS
-- =============================================================================

-- 5.1 Tablas creadas (deben ser 15)
SELECT COUNT(*) AS `tablas_creadas`
  FROM information_schema.tables
 WHERE table_schema = 'studia_db';

-- 5.2 Claves foraneas por tabla (comprueba la integridad referencial)
SELECT `TABLE_NAME` AS `tabla`, `COLUMN_NAME` AS `columna`, `REFERENCED_TABLE_NAME` AS `referencia`,
       `CONSTRAINT_NAME` AS `restriccion`
  FROM information_schema.KEY_COLUMN_USAGE
 WHERE `TABLE_SCHEMA` = 'studia_db' AND `REFERENCED_TABLE_NAME` IS NOT NULL
 ORDER BY `TABLE_NAME`, `COLUMN_NAME`;

-- 5.3 Indices definidos (claves primarias, unicas y de busqueda)
SELECT `TABLE_NAME` AS `tabla`, `INDEX_NAME` AS `indice`, `NON_UNIQUE` AS `no_unico`,
       GROUP_CONCAT(`COLUMN_NAME` ORDER BY `SEQ_IN_INDEX`) AS `columnas`
  FROM information_schema.STATISTICS
 WHERE `TABLE_SCHEMA` = 'studia_db'
 GROUP BY `TABLE_NAME`, `INDEX_NAME`, `NON_UNIQUE`
 ORDER BY `TABLE_NAME`, `INDEX_NAME`;

-- 5.4 Perfil completo del estudiante (union de 5 tablas)
SELECT u.id AS `usuario_id`, CONCAT(u.first_name, ' ', u.last_name) AS `estudiante`,
       sp.academic_program AS `programa`, sp.daily_goal_minutes AS `meta_diaria_min`,
       COUNT(DISTINCT s.id) AS `materias`, COUNT(DISTINCT t.id) AS `temas`
  FROM users u
  JOIN student_profiles sp ON sp.user_id = u.id
  LEFT JOIN subjects s       ON s.user_id = u.id
  LEFT JOIN topics t         ON t.subject_id = s.id
 WHERE u.email LIKE '%@studia.demo' AND u.role = 'student'
 GROUP BY u.id, u.first_name, u.last_name, sp.academic_program, sp.daily_goal_minutes
 ORDER BY u.id;

-- 5.5 Tiempo de estudio por materia (agregacion con GROUP BY y HAVING)
SELECT u.first_name AS `estudiante`, s.name AS `materia`,
       COUNT(ss.id) AS `sesiones`, SUM(ss.duration_minutes) AS `minutos_totales`,
       ROUND(AVG(ss.focus_score), 2) AS `concentracion_promedio`
  FROM users u
  JOIN subjects s       ON s.user_id = u.id
  LEFT JOIN study_sessions ss ON ss.subject_id = s.id
 WHERE u.email LIKE '%@studia.demo'
 GROUP BY u.first_name, s.name
 HAVING `sesiones` > 0
 ORDER BY `minutos_totales` DESC;

-- 5.6 Precision por ejercicio (subconsulta + intentos del estudiante)
SELECT e.id AS `ejercicio_id`, e.title AS `ejercicio`,
       COUNT(ea.id) AS `intentos`,
       SUM(CASE WHEN ea.is_correct = 1 THEN 1 ELSE 0 END) AS `aciertos`,
       ROUND(100 * SUM(CASE WHEN ea.is_correct = 1 THEN 1 ELSE 0 END) / COUNT(ea.id), 2) AS `precision_pct`
  FROM exercises e
  JOIN exercise_attempts ea ON ea.exercise_id = e.id
 WHERE e.user_id = 2
 GROUP BY e.id, e.title
 ORDER BY `precision_pct` DESC;

-- 5.7 Errores abiertos con su contexto completo (LEFT JOIN en cascada)
SELECT er.id AS `error_id`, u.first_name AS `estudiante`, s.name AS `materia`, t.name AS `tema`,
       er.title AS `error`, er.error_type AS `tipo`, er.severity AS `severidad`, er.status AS `estado`,
       er.review_count AS `repasos`
  FROM errors er
  JOIN users u        ON u.id = er.user_id
  LEFT JOIN subjects s ON s.id = er.subject_id
  LEFT JOIN topics t   ON t.id = er.topic_id
 WHERE er.status <> 'resolved'
 ORDER BY FIELD(er.severity, 'high', 'medium', 'low'), er.created_at DESC;

-- 5.8 Tarjetas pendientes de repaso (repeticion espaciada)
SELECT u.first_name AS `estudiante`, f.front_text AS `tarjeta`, f.status AS `estado`,
       f.interval_days AS `intervalo_dias`, f.next_review_at AS `proximo_repaso`,
       DATEDIFF(f.next_review_at, NOW()) AS `dias_restantes`
  FROM flashcards f
  JOIN users u ON u.id = f.user_id
 WHERE f.next_review_at IS NOT NULL
 ORDER BY f.next_review_at ASC;

-- 5.9 Logros alcanzados y pendientes
SELECT u.first_name AS `estudiante`, a.name AS `logro`, a.category AS `categoria`,
       a.current_value AS `avance`, a.target_value AS `meta`,
       CASE WHEN a.unlocked_at IS NULL THEN 'pendiente' ELSE 'desbloqueado' END AS `estado`
  FROM achievements a
  JOIN users u ON u.id = a.user_id
 ORDER BY u.first_name, `estado` DESC;

-- 5.10 Volumen de datos de demostracion por tabla
SELECT 'users' AS `tabla`, COUNT(*) AS `registros` FROM users
UNION ALL SELECT 'student_profiles', COUNT(*) FROM student_profiles
UNION ALL SELECT 'subjects', COUNT(*) FROM subjects
UNION ALL SELECT 'topics', COUNT(*) FROM topics
UNION ALL SELECT 'study_sessions', COUNT(*) FROM study_sessions
UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL SELECT 'errors', COUNT(*) FROM errors
UNION ALL SELECT 'exercises', COUNT(*) FROM exercises
UNION ALL SELECT 'exercise_attempts', COUNT(*) FROM exercise_attempts
UNION ALL SELECT 'learning_preferences', COUNT(*) FROM learning_preferences
UNION ALL SELECT 'study_plans', COUNT(*) FROM study_plans
UNION ALL SELECT 'recommendations', COUNT(*) FROM recommendations
UNION ALL SELECT 'weekly_reports', COUNT(*) FROM weekly_reports
UNION ALL SELECT 'flashcards', COUNT(*) FROM flashcards
UNION ALL SELECT 'achievements', COUNT(*) FROM achievements;

-- =============================================================================
--  FIN DEL SCRIPT - STUDIA
-- =============================================================================
