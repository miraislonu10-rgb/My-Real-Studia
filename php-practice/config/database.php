<?php
/**
 * STUDIA · php-practice
 * --------------------------------------------------------------------------
 * Conexión a MySQL mediante PDO.
 *
 * Decisiones clave:
 *  - ERRMODE_EXCEPTION: todo error de SQL se convierte en una excepción
 *    capturable, en lugar de fallar en silencio.
 *  - EMULATE_PREPARES = false: obliga a usar consultas preparadas REALES del
 *    servidor (no simuladas por el driver), la defensa principal contra la
 *    inyección SQL.
 *  - utf8mb4: soporte completo de Unicode (acentos, emojis...).
 *
 * La conexión se guarda en una variable estática para reutilizarla durante
 * toda la petición (una sola conexión por script).
 */

/**
 * Devuelve la conexión PDO activa, creándola la primera vez.
 *
 * @throws RuntimeException si no se puede conectar.
 */
function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = require __DIR__ . '/config.php';

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['database'],
        $config['charset']
    );

    try {
        $pdo = new PDO($dsn, $config['user'], $config['password'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::ATTR_STRINGIFY_FETCHES  => false,
        ]);
    } catch (PDOException $exception) {
        throw new RuntimeException(
            'No se pudo conectar con MySQL. Verifica que Apache y MySQL estén activos en XAMPP '
            . 'y que la base de datos "php_practice" haya sido importada desde sql/php_practice.sql. '
            . 'Detalle técnico: ' . $exception->getMessage(),
            0,
            $exception
        );
    }

    return $pdo;
}
