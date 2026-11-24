<?php
/**
 * STUDIA · php-practice
 * --------------------------------------------------------------------------
 * Configuración de la conexión a MySQL.
 *
 * Las credenciales NO se escriben en el código: se leen de variables de
 * entorno y, si no están definidas, se usan los valores por defecto de XAMPP
 * (usuario "root" sin contraseña). Así nunca se versionan datos sensibles.
 */

$defaults = [
    'host'     => '127.0.0.1',
    'port'     => 3306,
    'database' => 'php_practice',
    'user'     => 'root',
    'password' => '',
    'charset'  => 'utf8mb4',
];

$env = [
    'host'     => getenv('PHP_PRACTICE_DB_HOST'),
    'port'     => getenv('PHP_PRACTICE_DB_PORT'),
    'database' => getenv('PHP_PRACTICE_DB_NAME'),
    'user'     => getenv('PHP_PRACTICE_DB_USER'),
    'password' => getenv('PHP_PRACTICE_DB_PASSWORD'),
];

return [
    'host'     => ($env['host'] !== false && $env['host'] !== '') ? $env['host'] : $defaults['host'],
    'port'     => ($env['port'] !== false && $env['port'] !== '') ? (int) $env['port'] : $defaults['port'],
    'database' => ($env['database'] !== false && $env['database'] !== '') ? $env['database'] : $defaults['database'],
    'user'     => ($env['user'] !== false && $env['user'] !== '') ? $env['user'] : $defaults['user'],
    'password' => ($env['password'] !== false) ? $env['password'] : $defaults['password'],
    'charset'  => $defaults['charset'],
];
