-- =============================================================================
-- STUDIA - Actualizacion para Smart Focus y Error Journal
-- =============================================================================
-- Ejecuta este script si ya tenias la base de datos studia_db creada y deseas
-- actualizar las tablas study_sessions y errors con las nuevas columnas y tipos.

USE `studia_db`;

-- 1. Actualizacion de study_sessions para cronometro inteligente
ALTER TABLE `study_sessions`
  ADD COLUMN IF NOT EXISTS `client_session_id` VARCHAR(64) NULL AFTER `user_id`,
  ADD COLUMN IF NOT EXISTS `duration_seconds` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `duration_minutes`,
  ADD COLUMN IF NOT EXISTS `paused_seconds` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `duration_seconds`,
  ADD COLUMN IF NOT EXISTS `is_paused` TINYINT(1) NOT NULL DEFAULT 0 AFTER `paused_seconds`,
  ADD COLUMN IF NOT EXISTS `last_paused_at` DATETIME NULL AFTER `is_paused`;

-- 2. Actualizacion de errors para diario inteligente de errores
ALTER TABLE `errors`
  ADD COLUMN IF NOT EXISTS `exercise_title` VARCHAR(255) NULL AFTER `exercise_id`,
  ADD COLUMN IF NOT EXISTS `user_answer` TEXT NULL AFTER `exercise_title`,
  ADD COLUMN IF NOT EXISTS `correct_answer` TEXT NULL AFTER `user_answer`,
  ADD COLUMN IF NOT EXISTS `explanation` TEXT NULL AFTER `correct_answer`,
  ADD COLUMN IF NOT EXISTS `error_date` DATE NULL AFTER `explanation`;

ALTER TABLE `errors`
  MODIFY COLUMN `error_type` ENUM('conceptual','procedural','calculation','interpretation','memory','careless','time_management') NOT NULL DEFAULT 'conceptual',
  MODIFY COLUMN `status` ENUM('pending','in_review','understood','open','resolved') NOT NULL DEFAULT 'pending';
