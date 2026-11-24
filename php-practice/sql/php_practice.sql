-- ==========================================================================
-- STUDIA · Módulo complementario "php-practice"
-- --------------------------------------------------------------------------
-- Base de datos INDEPENDIENTE y de demostración. No toca `studia_db` ni
-- ninguna tabla de la aplicación principal.
--
-- Cómo importar (XAMPP):
--   1. Abre http://localhost/phpmyadmin
--   2. Pestaña "Importar" -> "Seleccionar archivo" -> elige este .sql
--   3. Pulsa "Importar"
--
-- Alternativa por línea de comandos:
--   C:\xampp\mysql\bin\mysql -u root -p < php_practice.sql
-- ==========================================================================

CREATE DATABASE IF NOT EXISTS php_practice
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE php_practice;

-- Tabla de demostración exclusiva del módulo.
DROP TABLE IF EXISTS php_demo_estudiantes;

CREATE TABLE php_demo_estudiantes (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(120)    NOT NULL,
  correo      VARCHAR(150)    NOT NULL,
  programa    VARCHAR(120)    NOT NULL,
  semestre    TINYINT UNSIGNED NOT NULL,
  promedio    DECIMAL(4, 2)   NOT NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- La clave única permite demostrar el manejo del error de duplicado.
  UNIQUE KEY uq_php_demo_estudiantes_correo (correo)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Datos de ejemplo para poder listar, editar y eliminar desde el CRUD.
INSERT INTO php_demo_estudiantes (nombre, correo, programa, semestre, promedio) VALUES
  ('Ana Torres',   'ana.torres@example.com',   'Ingeniería de Sistemas', 4, 4.35),
  ('Luis Ramírez', 'luis.ramirez@example.com', 'Medicina',               7, 3.90),
  ('María Gómez',  'maria.gomez@example.com',  'Derecho',                2, 4.60);
