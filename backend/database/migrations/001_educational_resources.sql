-- =============================================================================
--  STUDIA - Migracion 001: catalogo de recursos educativos
-- =============================================================================
--  Anade la tabla `educational_resources` (18a tabla) SIN borrar los datos
--  existentes. Usa esta migracion si ya tenias `studia_db` importada y no
--  quieres volver a ejecutar `studia_database.sql` completo.
--
--  Base de datos: studia_db
--  Aplicar en phpMyAdmin:
--    1. Selecciona la base de datos `studia_db`.
--    2. Pestana "SQL" -> pega el contenido de este archivo -> "Continuar".
--  O por linea de comandos:
--    C:\xampp\mysql\bin\mysql.exe -u root studia_db < 001_educational_resources.sql
-- =============================================================================

USE `studia_db`;

CREATE TABLE IF NOT EXISTS `educational_resources` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `created_by`       BIGINT UNSIGNED NOT NULL COMMENT 'Administrador que publico el recurso',
  `title`            VARCHAR(200)    NOT NULL,
  `description`      TEXT            NULL,
  `resource_type`    ENUM('link','article','video','book','document','course','other') NOT NULL DEFAULT 'link',
  `url`              VARCHAR(500)    NOT NULL,
  `provider`         VARCHAR(150)    NULL COMMENT 'Fuente: Khan Academy, Coursera...',
  `area`             VARCHAR(120)    NULL COMMENT 'Area o materia sugerida (texto libre)',
  `difficulty_level` ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  `language`         CHAR(5)         NOT NULL DEFAULT 'es',
  `is_published`     TINYINT(1)      NOT NULL DEFAULT 1 COMMENT '0 = oculto a los estudiantes',
  `created_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_resources_published` (`is_published`, `created_at`),
  KEY `idx_resources_type` (`resource_type`),
  KEY `idx_resources_area` (`area`),
  CONSTRAINT `fk_resources_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_resources_url` CHECK (`url` LIKE 'http%')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Catalogo de recursos educativos (gestionado por el administrador)';

-- Verificacion: debe devolver 18
SELECT COUNT(*) AS `tablas_creadas`
  FROM information_schema.tables
 WHERE table_schema = 'studia_db';
