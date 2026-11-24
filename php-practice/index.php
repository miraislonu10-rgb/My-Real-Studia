<?php
/**
 * STUDIA · php-practice · Inicio
 * --------------------------------------------------------------------------
 * Portada del módulo: explica qué demuestra cada archivo y comprueba en vivo
 * la conexión con MySQL mediante PDO.
 */

require_once __DIR__ . '/includes/bootstrap.php';

$pageTitle = 'Módulo PHP de práctica';
$pageIntro = 'Demostración de los contenidos del curso: PHP básico, formularios '
    . '<strong>GET</strong> y <strong>POST</strong>, superglobales '
    . '(<code>$_GET</code>, <code>$_POST</code>, <code>$_SERVER</code>), validación, '
    . 'conexión a MySQL con <strong>PDO</strong> y operaciones <strong>CRUD</strong> '
    . 'con consultas preparadas.';

// --- Comprobación en vivo de la conexión y lectura de datos ----------------
$dbStatus = null;   // ['ok' => bool, 'total' => int]
$recientes = [];
$dbError = null;

try {
    $total = (int) db()->query('SELECT COUNT(*) FROM php_demo_estudiantes')->fetchColumn();

    $statement = db()->query(
        'SELECT id, nombre, programa, semestre, promedio
           FROM php_demo_estudiantes
          ORDER BY created_at DESC, id DESC
          LIMIT 5'
    );

    $recientes = $statement->fetchAll();
    $dbStatus = ['ok' => true, 'total' => $total];
} catch (Throwable $exception) {
    $dbError = $exception->getMessage();
    $dbStatus = ['ok' => false, 'total' => 0];
}

require __DIR__ . '/includes/header.php';
?>

<div class="card">
  <h2>Estado de la conexión</h2>
  <?php if ($dbStatus['ok']): ?>
    <p>
      <span class="badge badge--ok">Conectado</span>
      Conexión PDO establecida con la base de datos de demostración
      <code>php_practice</code>.
      Actualmente hay <strong><?= e($dbStatus['total']) ?></strong> registro(s) en
      <code>php_demo_estudiantes</code>.
    </p>
  <?php else: ?>
    <p>
      <span class="badge badge--post">Sin conexión</span>
      No se pudo contactar con MySQL todavía.
    </p>
    <div class="alert alert--error" role="alert"><?= e($dbError) ?></div>
    <p class="hint">
      Importa <code>php-practice/sql/php_practice.sql</code> desde phpMyAdmin y asegúrate
      de que MySQL esté iniciado en el panel de control de XAMPP.
    </p>
  <?php endif; ?>
</div>

<div class="grid">
  <div class="card">
    <h2>1. Formularios GET y POST</h2>
    <p class="hint">
      Un formulario HTML con dos variantes: envío por <code>GET</code> (parámetros visibles
      en la URL) y por <code>POST</code> (datos en el cuerpo de la petición).
    </p>
    <p><a class="button" href="<?= e(url('formulario.php')) ?>">Abrir formularios</a></p>
  </div>

  <div class="card">
    <h2>2. Procesamiento con <code>$_GET</code></h2>
    <p class="hint">
      Lectura de la superglobal <code>$_GET</code>, validación de los parámetros recibidos y
      búsqueda filtrada con una consulta preparada (evita la inyección SQL).
    </p>
    <p><a class="button button--ghost" href="<?= e(url('get.php')) ?>">Ver ejemplo GET</a></p>
  </div>

  <div class="card">
    <h2>3. Procesamiento con <code>$_POST</code></h2>
    <p class="hint">
      Lectura de <code>$_POST</code>, validación campo a campo, inserción con sentencia
      preparada, control del correo duplicado y patrón POST/Redirect/GET.
    </p>
    <p><a class="button button--ghost" href="<?= e(url('post.php')) ?>">Ver ejemplo POST</a></p>
  </div>

  <div class="card">
    <h2>4. Superglobal <code>$_SERVER</code></h2>
    <p class="hint">
      Información que el servidor web pone a disposición del script: método, ruta, agente de
      usuario, dirección IP, etc.
    </p>
    <p><a class="button button--ghost" href="<?= e(url('servidor.php')) ?>">Ver $_SERVER</a></p>
  </div>

  <div class="card">
    <h2>5. CRUD completo con MySQL</h2>
    <p class="hint">
      Crear, leer, actualizar y eliminar registros de <code>php_demo_estudiantes</code> con
      PDO, consultas preparadas, validación, CSRF y manejo de errores.
    </p>
    <p><a class="button button--ghost" href="<?= e(url('crud/index.php')) ?>">Abrir el CRUD</a></p>
  </div>
</div>

<?php if ($dbStatus['ok']): ?>
  <div class="card">
    <h2>Últimos registros guardados</h2>
    <?php if (empty($recientes)): ?>
      <p class="empty">Todavía no hay registros. Crea el primero desde el CRUD.</p>
    <?php else: ?>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Nombre</th>
              <th scope="col">Programa</th>
              <th scope="col">Semestre</th>
              <th scope="col">Promedio</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($recientes as $fila): ?>
              <tr>
                <td><?= e($fila['id']) ?></td>
                <td><?= e($fila['nombre']) ?></td>
                <td><?= e($fila['programa']) ?></td>
                <td><?= e($fila['semestre']) ?></td>
                <td><?= e(number_format((float) $fila['promedio'], 2)) ?></td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    <?php endif; ?>
  </div>
<?php endif; ?>

<?php require __DIR__ . '/includes/footer.php'; ?>
