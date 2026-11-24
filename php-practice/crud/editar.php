<?php
/**
 * STUDIA · php-practice · CRUD · Editar
 * --------------------------------------------------------------------------
 * UPDATE: modificación de un registro existente.
 *   GET  -> carga el registro y muestra el formulario relleno.
 *   POST -> valida, actualiza con sentencia preparada y redirige.
 *
 * El identificador se lee SIEMPRE del servidor (URL o campo oculto) y se
 * valida como entero: nunca se confía en él para construir el SQL.
 */

require_once dirname(__DIR__) . '/includes/bootstrap.php';

$pageTitle = 'CRUD · Editar registro';

$id = (int) ($_POST['id'] ?? $_GET['id'] ?? 0);

if ($id <= 0) {
    flash('error', 'El identificador del registro no es válido.');
    redirect(url('crud/index.php'));
}

$registro = obtener_estudiante($id);

if ($registro === null) {
    flash('error', 'El registro solicitado no existe.');
    redirect(url('crud/index.php'));
}

$valores = [
    'nombre'   => $registro['nombre'],
    'correo'   => $registro['correo'],
    'programa' => $registro['programa'],
    'semestre' => $registro['semestre'],
    'promedio' => $registro['promedio'],
];
$errores = [];

if (request_method() === 'POST') {
    try {
        verify_csrf();

        $valores = datos_estudiante($_POST);
        // Se ignora el propio id al comprobar el correo duplicado.
        $errores = validar_estudiante($_POST, $id);

        if (empty($errores)) {
            $statement = db()->prepare(
                'UPDATE php_demo_estudiantes
                    SET nombre = :nombre,
                        correo = :correo,
                        programa = :programa,
                        semestre = :semestre,
                        promedio = :promedio
                  WHERE id = :id'
            );
            $statement->execute([
                'nombre'   => $valores['nombre'],
                'correo'   => $valores['correo'],
                'programa' => $valores['programa'],
                'semestre' => $valores['semestre'],
                'promedio' => $valores['promedio'],
                'id'       => $id,
            ]);

            flash('success', 'Registro actualizado correctamente.');
            redirect(url('crud/index.php'));
        }

        flash('error', 'Revisa los campos marcados para poder guardar.');
    } catch (PDOException $exception) {
        flash('error', mensaje_error_pdo($exception));
    } catch (Throwable $exception) {
        flash('error', $exception->getMessage());
    }
}

$formAction  = url('crud/editar.php?id=' . $id);
$submitLabel = 'Guardar cambios';

require dirname(__DIR__) . '/includes/header.php';
?>

<div class="card">
  <h2>Editar registro #<?= e($id) ?></h2>
  <p class="hint">Modifica los campos necesarios y guarda. El correo debe seguir siendo único.</p>

  <?php require __DIR__ . '/_formulario.php'; ?>
</div>

<div class="card">
  <h2>Consulta empleada</h2>
  <pre class="code-block">UPDATE php_demo_estudiantes
   SET nombre = :nombre, correo = :correo, programa = :programa,
       semestre = :semestre, promedio = :promedio
 WHERE id = :id</pre>
</div>

<?php require dirname(__DIR__) . '/includes/footer.php'; ?>
