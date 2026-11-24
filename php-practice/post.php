<?php
/**
 * STUDIA · php-practice · Procesamiento POST
 * --------------------------------------------------------------------------
 * Demuestra:
 *   - El uso de la superglobal $_POST.
 *   - La validación campo a campo antes de tocar la base de datos.
 *   - El alta de un registro con sentencia preparada.
 *   - El manejo de errores (correo duplicado) y el patrón POST/Redirect/GET.
 */

require_once __DIR__ . '/includes/bootstrap.php';

// Este script SOLO procesa el formulario: si se abre por GET, vuelve al formulario.
if (request_method() !== 'POST') {
    redirect(url('formulario.php'));
}

$errores = [];
$datos = datos_estudiante($_POST);

try {
    // --- 1. Seguridad: comprobar el token CSRF -----------------------------
    verify_csrf();

    // --- 2. Lectura y validación de la superglobal $_POST ------------------
    // Nótese que se recorre $_POST, nunca se confía en su contenido.
    $errores = validar_estudiante($_POST);

    if (!empty($errores)) {
        flash('error', 'No se pudo guardar: revisa los campos marcados.');
        // Se conservan los datos enviados para no obligar a reescribirlos.
        $_SESSION['form_old']  = $datos;
        $_SESSION['form_errors'] = $errores;
        redirect(url('formulario.php'));
    }

    // --- 3. Inserción con consulta preparada -------------------------------
    $sql = 'INSERT INTO php_demo_estudiantes (nombre, correo, programa, semestre, promedio)
            VALUES (:nombre, :correo, :programa, :semestre, :promedio)';

    $statement = db()->prepare($sql);
    $statement->execute([
        'nombre'   => $datos['nombre'],
        'correo'   => $datos['correo'],
        'programa' => $datos['programa'],
        'semestre' => $datos['semestre'],
        'promedio' => $datos['promedio'],
    ]);

    $nuevoId = (int) db()->lastInsertId();

    // --- 4. Patrón POST/Redirect/GET: evita reenviar al recargar ------------
    flash('success', 'Registro creado correctamente (id ' . $nuevoId . ').');
    redirect(url('crud/index.php'));
} catch (PDOException $exception) {
    // Error de la base de datos (por ejemplo, clave única duplicada: código 23000).
    flash('error', mensaje_error_pdo($exception));
    $_SESSION['form_old'] = $datos;
    redirect(url('formulario.php'));
} catch (Throwable $exception) {
    // Error controlado (CSRF caducado, etc.).
    flash('error', $exception->getMessage());
    $_SESSION['form_old'] = $datos;
    redirect(url('formulario.php'));
}
