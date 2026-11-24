<?php
/**
 * STUDIA · php-practice
 * --------------------------------------------------------------------------
 * Funciones auxiliares del módulo: escape de salida, entrada segura, avisos
 * flash, redirecciones, protección CSRF y validación de formularios.
 */

/**
 * Escapa texto antes de imprimirlo en HTML (defensa contra XSS).
 */
function e($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/**
 * Construye una URL absoluta dentro del módulo php-practice.
 */
function url(string $path = ''): string
{
    return BASE_URL . '/' . ltrim($path, '/');
}

/**
 * Lee un valor enviado por el usuario desde $_POST o $_GET.
 * Nunca se confía en su contenido: sólo se normaliza.
 */
function input(string $key, $default = '')
{
    $value = $_POST[$key] ?? $_GET[$key] ?? $default;

    return is_string($value) ? trim($value) : $value;
}

/**
 * Guarda un aviso para mostrarlo en la siguiente página (patrón PRG).
 */
function flash(string $type, string $message): void
{
    $_SESSION['flash'][] = ['type' => $type, 'message' => $message];
}

/**
 * Recupera los avisos pendientes y los elimina de la sesión.
 */
function flashes(): array
{
    $messages = $_SESSION['flash'] ?? [];
    unset($_SESSION['flash']);

    return $messages;
}

/**
 * Redirige y detiene el script (evita reenviar el formulario al recargar).
 */
function redirect(string $path): void
{
    header('Location: ' . $path);
    exit;
}

/**
 * Devuelve el token CSRF de la sesión, generándolo si aún no existe.
 */
function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf_token'];
}

/**
 * Campo oculto con el token CSRF, listo para insertar en un formulario.
 */
function csrf_field(): string
{
    return '<input type="hidden" name="csrf_token" value="' . e(csrf_token()) . '">';
}

/**
 * Comprueba el token CSRF recibido. Compara en tiempo constante para no
 * filtrar información con el tiempo de respuesta.
 *
 * @throws RuntimeException si el token falta o no coincide.
 */
function verify_csrf(): void
{
    $sent = $_POST['csrf_token'] ?? '';

    if (!is_string($sent) || $sent === '' || !hash_equals(csrf_token(), $sent)) {
        throw new RuntimeException('El formulario ha caducado o no es válido. Vuelve a enviarlo.');
    }
}

/**
 * Ruta del script actual relativa a la raíz del módulo (para marcar la
 * navegación activa). Ejemplo: "crud/index.php".
 */
function current_page(): string
{
    $script = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));

    return ltrim(substr($script, strlen(BASE_URL)), '/');
}

/**
 * Método HTTP de la petición actual.
 */
function request_method(): string
{
    return strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
}

/**
 * Escapa los comodines de LIKE ("%" y "_") para que el texto escrito por el
 * usuario se busque de forma literal y no como patrón.
 */
function like_escape(string $value): string
{
    return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
}

/**
 * Recupera y limpia el estado dejado por un formulario rechazado
 * (valores enviados y errores por campo), usado tras una redirección.
 *
 * @return array{old: array<string, mixed>, errors: array<string, string>}
 */
function pull_form_state(): array
{
    $state = [
        'old'    => $_SESSION['form_old'] ?? [],
        'errors' => $_SESSION['form_errors'] ?? [],
    ];

    unset($_SESSION['form_old'], $_SESSION['form_errors']);

    return $state;
}

/**
 * Normaliza los datos de un estudiante recibidos por un formulario.
 *
 * @param array $data Normalmente $_POST o $_GET.
 * @return array<string, mixed>
 */
function datos_estudiante(array $data): array
{
    return [
        'nombre'   => trim((string) ($data['nombre'] ?? '')),
        'correo'   => trim((string) ($data['correo'] ?? '')),
        'programa' => trim((string) ($data['programa'] ?? '')),
        'semestre' => (int) ($data['semestre'] ?? 0),
        'promedio' => round((float) ($data['promedio'] ?? 0), 2),
    ];
}

/**
 * Valida los datos de un estudiante y devuelve los errores por campo.
 *
 * La validación del servidor es la única autoridad: el atributo `required`
 * del HTML mejora la experiencia, pero puede saltarse manipulando la petición.
 *
 * @param array    $data     Datos crudos del formulario.
 * @param int|null $ignoreId Id que se ignora al comprobar el correo duplicado
 *                           (necesario al editar un registro existente).
 * @return array<string, string> Errores indexados por nombre de campo.
 */
function validar_estudiante(array $data, ?int $ignoreId = null): array
{
    $errors = [];
    $datos = datos_estudiante($data);

    // --- nombre ---
    if ($datos['nombre'] === '') {
        $errors['nombre'] = 'El nombre es obligatorio.';
    } elseif (mb_strlen($datos['nombre']) < 3 || mb_strlen($datos['nombre']) > 120) {
        $errors['nombre'] = 'El nombre debe tener entre 3 y 120 caracteres.';
    } elseif (!preg_match("/^[\p{L}\s'.\-]+$/u", $datos['nombre'])) {
        $errors['nombre'] = 'El nombre sólo admite letras, espacios, puntos, guiones y apóstrofes.';
    }

    // --- correo (formato + duplicado con consulta preparada) ---
    if ($datos['correo'] === '') {
        $errors['correo'] = 'El correo es obligatorio.';
    } elseif (!filter_var($datos['correo'], FILTER_VALIDATE_EMAIL)) {
        $errors['correo'] = 'El correo no tiene un formato válido.';
    } elseif (mb_strlen($datos['correo']) > 150) {
        $errors['correo'] = 'El correo es demasiado largo.';
    } elseif (correo_registrado($datos['correo'], $ignoreId)) {
        $errors['correo'] = 'Ya existe un estudiante registrado con ese correo.';
    }

    // --- programa ---
    if ($datos['programa'] === '') {
        $errors['programa'] = 'El programa académico es obligatorio.';
    } elseif (mb_strlen($datos['programa']) > 120) {
        $errors['programa'] = 'El programa no puede superar los 120 caracteres.';
    }

    // --- semestre ---
    $semestreCrudo = $data['semestre'] ?? '';
    if ($semestreCrudo === '' || filter_var($semestreCrudo, FILTER_VALIDATE_INT) === false) {
        $errors['semestre'] = 'El semestre debe ser un número entero.';
    } elseif ($datos['semestre'] < 1 || $datos['semestre'] > 12) {
        $errors['semestre'] = 'El semestre debe estar entre 1 y 12.';
    }

    // --- promedio ---
    $promedioCrudo = $data['promedio'] ?? '';
    if ($promedioCrudo === '' || !is_numeric($promedioCrudo)) {
        $errors['promedio'] = 'El promedio debe ser un número.';
    } elseif ($datos['promedio'] < 0 || $datos['promedio'] > 5) {
        $errors['promedio'] = 'El promedio debe estar entre 0.00 y 5.00.';
    }

    return $errors;
}

/**
 * Indica si el correo ya existe en la tabla de demostración.
 * Usa una consulta preparada (nunca concatena el valor en el SQL).
 */
function correo_registrado(string $correo, ?int $ignoreId = null): bool
{
    $sql = 'SELECT id FROM php_demo_estudiantes WHERE correo = :correo';
    $params = ['correo' => $correo];

    if ($ignoreId !== null) {
        $sql .= ' AND id <> :id';
        $params['id'] = $ignoreId;
    }

    $sql .= ' LIMIT 1';

    $statement = db()->prepare($sql);
    $statement->execute($params);

    return (bool) $statement->fetch();
}

/**
 * Busca un estudiante por su id. Devuelve null si no existe.
 */
function obtener_estudiante(int $id): ?array
{
    $statement = db()->prepare(
        'SELECT id, nombre, correo, programa, semestre, promedio
           FROM php_demo_estudiantes
          WHERE id = :id
          LIMIT 1'
    );
    $statement->execute(['id' => $id]);

    $fila = $statement->fetch();

    return $fila === false ? null : $fila;
}

/**
 * Traduce un error de PDO a un mensaje comprensible para el visitante.
 */
function mensaje_error_pdo(PDOException $exception): string
{
    // Código 23000 = violación de restricción (clave única, clave foránea...).
    if ($exception->getCode() === '23000') {
        return 'El registro incumple una restricción de la base de datos (por ejemplo, un correo duplicado).';
    }

    return 'Ocurrió un error al consultar la base de datos. Intenta de nuevo.';
}
