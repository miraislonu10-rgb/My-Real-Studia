<?php
/**
 * STUDIA · php-practice · CRUD · Eliminar
 * --------------------------------------------------------------------------
 * DELETE: baja de un registro.
 *   GET  -> muestra una pantalla de confirmación (no borra nada).
 *   POST -> comprueba el token CSRF, elimina y redirige.
 *
 * Eliminar por POST (y no por un enlace GET) evita que una simple visita o el
 * prefetch del navegador provoquen un borrado accidental.
 */

require_once dirname(__DIR__) . '/includes/bootstrap.php';

$pageTitle = 'CRUD · Eliminar registro';

$id = (int) ($_POST['id'] ?? $_GET['id'] ?? 0);

if ($id <= 0) {
    flash('error', 'El identificador del registro no es válido.');
    redirect(url('crud/index.php'));
}

if (request_method() === 'POST') {
    try {
        verify_csrf();

        $statement = db()->prepare('DELETE FROM php_demo_estudiantes WHERE id = :id');
        $statement->execute(['id' => $id]);

        if ($statement->rowCount() === 0) {
            flash('error', 'El registro ya no existía o no se pudo eliminar.');
        } else {
            flash('success', 'Registro eliminado correctamente.');
        }
    } catch (PDOException $exception) {
        flash('error', mensaje_error_pdo($exception));
    } catch (Throwable $exception) {
        flash('error', $exception->getMessage());
    }

    redirect(url('crud/index.php'));
}

// --- GET: pantalla de confirmación -----------------------------------------
$registro = obtener_estudiante($id);

if ($registro === null) {
    flash('error', 'El registro solicitado no existe.');
    redirect(url('crud/index.php'));
}

require dirname(__DIR__) . '/includes/header.php';
?>

<div class="card">
  <h2>Confirmar eliminación</h2>
  <p>¿Seguro que quieres eliminar el siguiente registro? Esta acción no se puede deshacer.</p>

  <div class="table-wrap">
    <table class="table">
      <tbody>
        <tr><th scope="row">Identificador</th><td><?= e($registro['id']) ?></td></tr>
        <tr><th scope="row">Nombre</th><td><?= e($registro['nombre']) ?></td></tr>
        <tr><th scope="row">Correo</th><td><?= e($registro['correo']) ?></td></tr>
        <tr><th scope="row">Programa</th><td><?= e($registro['programa']) ?></td></tr>
        <tr><th scope="row">Semestre</th><td><?= e($registro['semestre']) ?></td></tr>
        <tr><th scope="row">Promedio</th><td><?= e(number_format((float) $registro['promedio'], 2)) ?></td></tr>
      </tbody>
    </table>
  </div>

  <form class="form" method="post" action="<?= e(url('crud/eliminar.php?id=' . $id)) ?>">
    <?= csrf_field() ?>
    <input type="hidden" name="id" value="<?= e($id) ?>">

    <?php /* Este botón es el único realmente destructivo: ocultarlo no protege
             nada, la autorización y la validación ocurren en el servidor. */ ?>
    <div class="actions">
      <button class="button button--danger" type="submit">Sí, eliminar</button>
      <a class="button button--ghost" href="<?= e(url('crud/index.php')) ?>">Cancelar</a>
    </div>
  </form>
</div>

<div class="card">
  <h2>Consulta empleada</h2>
  <pre class="code-block">DELETE FROM php_demo_estudiantes WHERE id = :id</pre>
</div>

<?php require dirname(__DIR__) . '/includes/footer.php'; ?>
