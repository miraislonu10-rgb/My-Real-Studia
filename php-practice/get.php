<?php
/**
 * STUDIA · php-practice · Procesamiento GET
 * --------------------------------------------------------------------------
 * Demuestra:
 *   - El uso de la superglobal $_GET.
 *   - La validación de los parámetros recibidos.
 *   - Una consulta filtrada con sentencia preparada (sin concatenar datos).
 */

require_once __DIR__ . '/includes/bootstrap.php';

$pageTitle = 'Procesamiento mediante GET';
$pageIntro = 'Los parámetros enviados por el formulario llegan al servidor dentro de la '
    . 'superglobal <code>$_GET</code>. Aquí se validan y se usan para filtrar la tabla de '
    . 'demostración con una consulta preparada.';

// --- 1. Lectura de la superglobal $_GET ------------------------------------
$parametros = $_GET;                 // array asociativo con todo lo recibido en la URL
$nombre     = trim((string) ($_GET['nombre'] ?? ''));
$programa   = trim((string) ($_GET['programa'] ?? ''));

// --- 2. Validación básica de la entrada ------------------------------------
$avisos = [];

if (mb_strlen($nombre) > 120) {
    $avisos[] = 'El parámetro "nombre" supera los 120 caracteres permitidos y se ignoró.';
    $nombre = '';
}

if (mb_strlen($programa) > 120) {
    $avisos[] = 'El parámetro "programa" supera los 120 caracteres permitidos y se ignoró.';
    $programa = '';
}

// --- 3. Consulta filtrada con sentencia preparada --------------------------
$resultados = [];
$huboBusqueda = $nombre !== '' || $programa !== '';

if ($huboBusqueda) {
    $sql = 'SELECT id, nombre, correo, programa, semestre, promedio
              FROM php_demo_estudiantes
             WHERE 1 = 1';
    $params = [];

    if ($nombre !== '') {
        // Los comodines "%" y "_" escritos por el usuario se escapan para que se
        // traten como texto literal y no alteren el patrón de búsqueda.
        $sql .= ' AND nombre LIKE :nombre';
        $params['nombre'] = '%' . like_escape($nombre) . '%';
    }

    if ($programa !== '') {
        $sql .= ' AND programa LIKE :programa';
        $params['programa'] = '%' . like_escape($programa) . '%';
    }

    $sql .= ' ORDER BY nombre ASC LIMIT 50';

    $statement = db()->prepare($sql);   // preparada: los datos NUNCA se concatenan
    $statement->execute($params);
    $resultados = $statement->fetchAll();
}

$mostrarResultados = $huboBusqueda;

require __DIR__ . '/includes/header.php';
?>

<?php foreach ($avisos as $aviso): ?>
  <div class="alert alert--error" role="alert"><?= e($aviso) ?></div>
<?php endforeach; ?>

<div class="card">
  <h2>1. Contenido recibido en <code>$_GET</code></h2>
  <?php if (empty($parametros)): ?>
    <p class="empty">No se recibió ningún parámetro. Prueba a enviar el formulario GET.</p>
  <?php else: ?>
    <div class="table-wrap">
      <table class="table table--compact">
        <thead>
          <tr>
            <th scope="col">Clave</th>
            <th scope="col">Valor recibido</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($parametros as $clave => $valor): ?>
            <tr>
              <td><code><?= e($clave) ?></code></td>
              <td><?= e(is_array($valor) ? implode(', ', $valor) : $valor) ?></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
    <p class="hint">
      Esta es exactamente la información que el navegador envía como
      <code>?clave=valor&amp;clave2=valor2</code> en la barra de direcciones.
    </p>
  <?php endif; ?>
</div>

<div class="card">
  <h2>2. Consulta preparada ejecutada</h2>
  <?php if (!$huboBusqueda): ?>
    <p class="empty">Envía al menos un criterio para ejecutar la búsqueda.</p>
  <?php else: ?>
    <pre class="code-block"><?= e(
        "SELECT id, nombre, correo, programa, semestre, promedio\n"
        . "  FROM php_demo_estudiantes\n"
        . " WHERE 1 = 1"
        . ($nombre !== '' ? "\n   AND nombre   LIKE :nombre" : '')
        . ($programa !== '' ? "\n   AND programa LIKE :programa" : '')
        . "\n ORDER BY nombre ASC\n LIMIT 50"
    ) ?><?php if ($params): ?>


-- Parámetros vinculados (nunca concatenados al SQL):
<?php foreach ($params as $clave => $valor): ?>   :<?= e($clave) ?> = <?= e(var_export($valor, true)) ?>

<?php endforeach; ?><?php endif; ?></pre>
  <?php endif; ?>
</div>

<?php if ($mostrarResultados): ?>
  <div class="card">
    <h2>3. Resultados</h2>
    <?php if (empty($resultados)): ?>
      <p class="empty">Ningún registro coincide con la búsqueda.</p>
    <?php else: ?>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Nombre</th>
              <th scope="col">Correo</th>
              <th scope="col">Programa</th>
              <th scope="col">Semestre</th>
              <th scope="col">Promedio</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($resultados as $fila): ?>
              <tr>
                <td><?= e($fila['id']) ?></td>
                <td><?= e($fila['nombre']) ?></td>
                <td><?= e($fila['correo']) ?></td>
                <td><?= e($fila['programa']) ?></td>
                <td><?= e($fila['semestre']) ?></td>
                <td><?= e(number_format((float) $fila['promedio'], 2)) ?></td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
      <p class="hint"><?= e(count($resultados)) ?> resultado(s).</p>
    <?php endif; ?>
  </div>
<?php endif; ?>

<div class="card">
  <h2>¿Por qué no hay inyección SQL?</h2>
  <p>
    El SQL se prepara con marcadores de posición (<code>:nombre</code>,
    <code>:programa</code>) y los valores se envían aparte en
    <code>execute($params)</code>. El motor de MySQL los trata como datos, nunca como
    instrucciones, así que un valor como <code>' OR 1=1 --</code> se busca literalmente.
  </p>
  <p class="actions">
    <a class="button button--ghost" href="<?= e(url('formulario.php')) ?>">Volver al formulario</a>
    <a class="button button--ghost" href="<?= e(url('crud/index.php')) ?>">Ir al CRUD</a>
  </p>
</div>

<?php require __DIR__ . '/includes/footer.php'; ?>
