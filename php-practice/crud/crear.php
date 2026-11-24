<?php
/**
 * STUDIA · php-practice · CRUD · Crear
 * --------------------------------------------------------------------------
 * CREATE: alta de un registro.
 *   GET  -> muestra el formulario vacío.
 *   POST -> valida, inserta con sentencia preparada y redirige (POST/Redirect/GET).
 */

require_once dirname(__DIR__) . '/includes/bootstrap.php';

$pageTitle = 'CRUD · Nuevo registro';
$pageIntro = 'Alta de un estudiante en la tabla de demostración. El servidor valida todos los '
    . 'campos antes de escribir en MySQL.';

$valores = datos_estudiante([]);
$errores = [];

if (request_method() === 'POST') {
    try {
        verify_csrf();

        $valores = datos_estudiante($_POST);
        $errores = validar_estudiante($_POST);

        if (empty($errores)) {
            $statement = db()->prepare(
                'INSERT INTO php_demo_estudiantes (nombre, correo, programa, semestre, promedio)
                 VALUES (:nombre, :correo, :programa, :semestre, :promedio)'
            );
            $statement->execute([
                'nombre'   => $valores['nombre'],
                'correo'   => $valores['correo'],
                'programa' => $valores['programa'],
                'semestre' => $valores['semestre'],
                'promedio' => $valores['promedio'],
            ]);

            flash('success', 'Registro creado correctamente (id ' . (int) db()->lastInsertId() . ').');
            redirect(url('crud/index.php'));
        }

        flash('error', 'Revisa los campos marcados para poder guardar.');
    } catch (PDOException $exception) {
        flash('error', mensaje_error_pdo($exception));
    } catch (Throwable $exception) {
        flash('error', $exception->getMessage());
    }
}

$formAction  = url('crud/crear.php');
$submitLabel = 'Crear registro';

require dirname(__DIR__) . '/includes/header.php';
?>

<div class="card">
  <h2>Datos del estudiante</h2>
  <?php require __DIR__ . '/_formulario.php'; ?>
</div>

<div class="card">
  <h2>Consulta empleada</h2>
  <pre class="code-block">INSERT INTO php_demo_estudiantes
       (nombre, correo, programa, semestre, promedio)
VALUES (:nombre, :correo, :programa, :semestre, :promedio)</pre>
</div>

<?php require dirname(__DIR__) . '/includes/footer.php'; ?>
