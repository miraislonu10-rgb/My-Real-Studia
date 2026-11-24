<?php
/**
 * STUDIA · php-practice
 * --------------------------------------------------------------------------
 * Arranque común: sesión, manejo de errores, URL base del módulo y conexión.
 * Todos los scripts del módulo empiezan incluyendo este archivo.
 */

// --- Sesión: necesaria para los avisos flash y el token CSRF -----------------
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

// --- Errores: se registran en el log, nunca se muestran al visitante --------
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
date_default_timezone_set('America/Bogota');

// --- URL base del módulo, deducida del servidor web -------------------------
// Permite que el módulo funcione igual en /php-practice o en una subcarpeta.
$documentRoot = str_replace('\\', '/', (string) realpath($_SERVER['DOCUMENT_ROOT'] ?? ''));
$moduleRoot   = str_replace('\\', '/', (string) realpath(dirname(__DIR__)));

if ($documentRoot !== '' && strpos($moduleRoot, $documentRoot) === 0) {
    $baseUrl = substr($moduleRoot, strlen($documentRoot));
} else {
    $baseUrl = '/php-practice';
}

define('BASE_URL', rtrim($baseUrl, '/') !== '' ? rtrim($baseUrl, '/') : '/php-practice');

require_once __DIR__ . '/functions.php';
require_once dirname(__DIR__) . '/config/database.php';

// --- Manejo centralizado de errores ----------------------------------------
// Cualquier excepción no capturada termina en una página de error amable.
set_exception_handler(static function (Throwable $exception): void {
    error_log('[php-practice] ' . $exception->getMessage());

    if (!headers_sent()) {
        http_response_code(500);
    }

    $errorMessage = $exception->getMessage();
    require __DIR__ . '/error.php';
    exit;
});
