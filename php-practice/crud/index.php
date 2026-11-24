<?php
/**
 * STUDIA · php-practice · CRUD · Listado
 * --------------------------------------------------------------------------
 * READ: lista los registros de php_demo_estudiantes con búsqueda (GET) y
 * paginación. Todas las consultas son preparadas.
 */

require_once dirname(__DIR__) . '/includes/bootstrap.php';

$pageTitle = 'CRUD · Listado';
$pageIntro = 'Operaciones sobre la tabla de demostración <code>php_demo_estudiantes</code>: '
    . 'aquí se listan y buscan los registros; desde esta tabla se editan y eliminan.';

// --- Parámetros de la vista (llegan por GET) --------------------------------
$busqueda = trim((string) ($_GET['q'] ?? ''));
$pagina   = max(1, (int) ($_GET['pagina'] ?? 1));
$porPagina = 8;
$desplazamiento = ($pagina - 1) * $porPagina;

$condiciones = [];
$parametros = [];

if ($busqueda !== '') {
    $condiciones[] = '(nombre LIKE :q1 OR correo LIKE :q2 OR programa LIKE :q3)';
    $termino = '%' . like_escape($busqueda) . '%';
    $parametros['q1'] = $termino;
    $parametros['q2'] = $termino;
    $parametros['q3'] = $termino;
}

$where = $condiciones ? ' WHERE ' . implode(' AND ', $condiciones) : '';

// Total de registros (para la paginación)
$sqlTotal = 'SELECT COUNT(*) FROM php_demo_estudiantes' . $where;
$stmtTotal = db()->prepare($sqlTotal);
$stmtTotal->execute($parametros);
$total = (int) $stmtTotal->fetchColumn();
$totalPaginas = max(1, (int) ceil($total / $porPagina));

// Página actual (con los tipos explícitos: con prepares nativos LIMIT/OFFSET
// deben enviarse como enteros, no como cadenas).
$sql = 'SELECT id, nombre, correo, programa, semestre, promedio, created_at
          FROM php_demo_estudiantes'
    . $where
    . ' ORDER BY nombre ASC LIMIT :limite OFFSET :desplazamiento';

$stmt = db()->prepare($sql);
foreach ($parametros as $clave => $valorParam) {
    $stmt->bindValue(':' . $clave, $valorParam, PDO::PARAM_STR);
}
$stmt->bindValue(':limite', $porPagina, PDO::PARAM_INT);
$stmt->bindValue(':desplazamiento', $desplazamiento, PDO::PARAM_INT);
$stmt->execute();
$registros = $stmt->fetchAll();

/** Construye una URL del listado conservando la búsqueda actual. */
$enlace = static function (int $destino) use ($busqueda): string {
    $parametrosUrl = ['pagina' => $destino];
    if ($busqueda !== '') {
        $parametrosUrl['q'] = $busqueda;
    }

    return url('crud/index.php') . '?' . http_build_query($parametrosUrl);
};

require dirname(__DIR__) . '/includes/header.php';
?>

<div class="card">
  <h2>Buscar</h2>
  <form class="form" method="get" action="<?= e(url('crud/index.php')) ?>">
    <div class="form__row">
      <div class="field">
        <label for="q">Nombre, correo o programa</label>
        <input type="search" id="q" name="q" maxlength="120" autocomplete="off"
               value="<?= e($busqueda) ?>" placeholder="Ej. Ana, Medicina...">
      </div>
    </div>
    <div class="actions">
      <button class="button" type="submit">Buscar</button>
      <?php if ($busqueda !== ''): ?>
        <a class="button button--ghost" href="<?= e(url('crud/index.php')) ?>">Limpiar</a>
      <?php endif; ?>
      <a class="button button--ghost" href="<?= e(url('crud/crear.php')) ?>">Nuevo registro</a>
    </div>
  </form>
</div>

<div class="card">
  <h2>
    Registros
    <span class="badge badge--ok"><?= e($total) ?> en total</span>
  </h2>

  <?php if (empty($registros)): ?>
    <p class="empty">
      <?= $busqueda !== ''
          ? 'No hay registros que coincidan con la búsqueda.'
          : 'Todavía no hay registros. Crea el primero con el botón "Nuevo registro".' ?>
    </p>
  <?php else: ?>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Nombre</th>
            <th scope="col">Correo</th>
            <th scope="col">Programa</th>
            <th scope="col">Sem.</th>
            <th scope="col">Promedio</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($registros as $registro): ?>
            <tr>
              <td><?= e($registro['id']) ?></td>
              <td><?= e($registro['nombre']) ?></td>
              <td><?= e($registro['correo']) ?></td>
              <td><?= e($registro['programa']) ?></td>
              <td><?= e($registro['semestre']) ?></td>
              <td><?= e(number_format((float) $registro['promedio'], 2)) ?></td>
              <td>
                <a class="button button--ghost button--small"
                   href="<?= e(url('crud/editar.php?id=' . (int) $registro['id'])) ?>">Editar</a>

                <?php /* Eliminar siempre por POST: un enlace GET podría ejecutarse
                         solo con que un rastreador o el navegador lo precargara. */ ?>
                <a class="button button--ghost button--small"
                   href="<?= e(url('crud/eliminar.php?id=' . (int) $registro['id'])) ?>">Eliminar</a>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>

    <?php if ($totalPaginas > 1): ?>
      <nav class="actions" aria-label="Paginación de resultados">
        <?php for ($i = 1; $i <= $totalPaginas; $i++): ?>
          <a class="button <?= $i === $pagina ? '' : 'button--ghost' ?> button--small"
             href="<?= e($enlace($i)) ?>"
             <?= $i === $pagina ? 'aria-current="page"' : '' ?>><?= e($i) ?></a>
        <?php endfor; ?>
      </nav>
    <?php endif; ?>
  <?php endif; ?>
</div>

<div class="card">
  <h2>Consultas empleadas</h2>
  <p class="hint">Ninguna de ellas concatena datos del usuario; todas usan marcadores de posición.</p>
  <pre class="code-block">-- READ (listado paginado)
SELECT id, nombre, correo, programa, semestre, promedio, created_at
  FROM php_demo_estudiantes
 WHERE nombre LIKE :q1 OR correo LIKE :q2 OR programa LIKE :q3
 ORDER BY nombre ASC
 LIMIT :limite OFFSET :desplazamiento</pre>
</div>

<?php require dirname(__DIR__) . '/includes/footer.php'; ?>
