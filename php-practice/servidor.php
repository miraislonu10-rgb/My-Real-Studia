<?php
/**
 * STUDIA · php-practice · Superglobal $_SERVER
 * --------------------------------------------------------------------------
 * Muestra la información que el servidor web (Apache) pone a disposición del
 * script dentro de la superglobal $_SERVER.
 *
 * Se listan sólo claves conocidas: volcar el array completo podría exponer
 * rutas internas o variables de configuración del hosting.
 */

require_once __DIR__ . '/includes/bootstrap.php';

$pageTitle = 'Superglobal $_SERVER';
$pageIntro = 'La superglobal <code>$_SERVER</code> contiene datos del servidor y de la '
    . 'petición actual: método HTTP, ruta, agente de usuario, dirección IP, etc.';

// Claves seleccionadas con su explicación.
$claves = [
    'REQUEST_METHOD'       => 'Método HTTP de la petición (GET, POST...).',
    'REQUEST_URI'          => 'Ruta y parámetros solicitados.',
    'SCRIPT_NAME'          => 'Ruta del script que se está ejecutando.',
    'QUERY_STRING'         => 'Cadena de consulta (lo que va tras "?").',
    'HTTP_HOST'            => 'Dominio o host solicitado por el navegador.',
    'SERVER_NAME'          => 'Nombre del servidor según su configuración.',
    'SERVER_PORT'          => 'Puerto de escucha (80 para Apache en XAMPP).',
    'SERVER_SOFTWARE'      => 'Servidor web y versión.',
    'SERVER_PROTOCOL'      => 'Versión del protocolo HTTP.',
    'REMOTE_ADDR'          => 'Dirección IP del visitante.',
    'HTTP_USER_AGENT'      => 'Navegador y sistema operativo del visitante.',
    'HTTP_REFERER'         => 'Página desde la que se llegó (puede venir vacía).',
    'HTTP_ACCEPT_LANGUAGE' => 'Idiomas preferidos por el navegador.',
    'DOCUMENT_ROOT'        => 'Carpeta raíz del sitio según Apache.',
    'SCRIPT_FILENAME'      => 'Ruta absoluta del script en el servidor.',
];

$datosServidor = [];
foreach ($claves as $clave => $descripcion) {
    $datosServidor[$clave] = [
        'valor'       => $_SERVER[$clave] ?? '(no definido)',
        'descripcion' => $descripcion,
    ];
}

$marcaTiempo = isset($_SERVER['REQUEST_TIME']) ? (int) $_SERVER['REQUEST_TIME'] : time();
$totalClaves = count($_SERVER);

require __DIR__ . '/includes/header.php';
?>

<div class="card">
  <h2>Resumen de la petición</h2>
  <ul class="list">
    <li>
      Se ejecutó <code><?= e(basename(__FILE__)) ?></code> mediante el método
      <strong><?= e(request_method()) ?></strong>.
    </li>
    <li>
      Visitante: <code><?= e($_SERVER['REMOTE_ADDR'] ?? 'desconocido') ?></code> ·
      Hora del servidor: <?= e(date('d/m/Y H:i:s', $marcaTiempo)) ?>.
    </li>
    <li>
      <code>$_SERVER</code> contiene actualmente <strong><?= e($totalClaves) ?></strong>
      claves; aquí se muestran sólo las más útiles.
    </li>
    <li>
      Tu módulo se sirve desde <code><?= e(BASE_URL) ?></code>.
    </li>
  </ul>
</div>

<div class="card">
  <h2>Claves de <code>$_SERVER</code></h2>
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th scope="col">Clave</th>
          <th scope="col">Valor</th>
          <th scope="col">Para qué sirve</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($datosServidor as $clave => $fila): ?>
          <tr>
            <td><code><?= e($clave) ?></code></td>
            <td><?= e((string) $fila['valor']) ?></td>
            <td class="hint"><?= e($fila['descripcion']) ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>

<div class="card">
  <h2>Buenas prácticas al usar <code>$_SERVER</code></h2>
  <ul class="list">
    <li>
      Los valores que controla el visitante (como <code>HTTP_USER_AGENT</code> o
      <code>HTTP_REFERER</code>) <strong>no son de fiar</strong>: úsalos sólo como
      información, nunca para tomar decisiones de seguridad.
    </li>
    <li>
      Imprime siempre los valores escapados (por ejemplo con
      <code>htmlspecialchars()</code>): si no, un valor malicioso podría inyectar HTML. En
      este módulo todo se imprime a través de la función <code>e()</code>.
    </li>
    <li>
      Antes de leer una clave, comprueba que existe con <code>isset()</code> o el operador
      <code>??</code>, como se hace en esta página.
    </li>
  </ul>
</div>

<?php require __DIR__ . '/includes/footer.php'; ?>
