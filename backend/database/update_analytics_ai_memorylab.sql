-- =============================================================================
-- STUDIA - Actualizacion para Memory Lab, AI Companion y Academic Analytics
-- =============================================================================
-- Ejecuta este script en phpMyAdmin si ya tenias la base creada.

USE `studia_db`;

-- 1. Tabla de historial de repasos de flashcards (Memory Lab)
CREATE TABLE IF NOT EXISTS `flashcard_reviews` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `flashcard_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `rating` TINYINT UNSIGNED NOT NULL COMMENT 'Calificacion de comprension (0-5)',
  `review_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `scheduled_interval` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  `ease_factor` DECIMAL(4,2) NOT NULL DEFAULT 2.50,
  `time_taken_seconds` SMALLINT UNSIGNED NULL,
  PRIMARY KEY (`id`),
  KEY `idx_reviews_user_card` (`user_id`, `flashcard_id`),
  KEY `idx_reviews_date` (`review_date`),
  CONSTRAINT `fk_reviews_flashcard` FOREIGN KEY (`flashcard_id`) REFERENCES `flashcards` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_reviews_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Historial de repasos espaciados';
