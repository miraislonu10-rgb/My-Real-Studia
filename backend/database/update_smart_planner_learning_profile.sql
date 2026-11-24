-- =============================================================================
-- STUDIA - Actualizacion para Smart Planner y Learning Profile
-- =============================================================================
-- Ejecuta este script en phpMyAdmin si deseas actualizar las tablas tasks y
-- learning_preferences con las columnas para organizador y perfil dinámico.

USE `studia_db`;

-- 1. Actualización de tasks para Smart Planner
ALTER TABLE `tasks`
  ADD COLUMN IF NOT EXISTS `goal_period` ENUM('none','daily','weekly') NOT NULL DEFAULT 'none' AFTER `status`,
  ADD COLUMN IF NOT EXISTS `scheduled_date` DATE NULL AFTER `due_date`,
  ADD COLUMN IF NOT EXISTS `scheduled_start_time` TIME NULL AFTER `scheduled_date`,
  ADD COLUMN IF NOT EXISTS `scheduled_end_time` TIME NULL AFTER `scheduled_start_time`;

-- 2. Actualización de learning_preferences para Learning Profile multidimensional
ALTER TABLE `learning_preferences`
  ADD COLUMN IF NOT EXISTS `step_by_step_pref` TINYINT UNSIGNED NOT NULL DEFAULT 3 AFTER `learning_style`,
  ADD COLUMN IF NOT EXISTS `problem_solving_pref` TINYINT UNSIGNED NOT NULL DEFAULT 3 AFTER `step_by_step_pref`,
  ADD COLUMN IF NOT EXISTS `concept_maps_pref` TINYINT UNSIGNED NOT NULL DEFAULT 3 AFTER `problem_solving_pref`,
  ADD COLUMN IF NOT EXISTS `questioning_pref` TINYINT UNSIGNED NOT NULL DEFAULT 3 AFTER `concept_maps_pref`,
  ADD COLUMN IF NOT EXISTS `spaced_repetition_pref` TINYINT UNSIGNED NOT NULL DEFAULT 3 AFTER `questioning_pref`,
  ADD COLUMN IF NOT EXISTS `break_frequency_minutes` SMALLINT UNSIGNED NOT NULL DEFAULT 5 AFTER `spaced_repetition_pref`,
  ADD COLUMN IF NOT EXISTS `dynamic_profile` JSON NULL AFTER `break_frequency_minutes`;
