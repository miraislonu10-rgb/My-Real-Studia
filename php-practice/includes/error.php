<?php
/**
 * STUDIA · php-practice
 * --------------------------------------------------------------------------
 * Página de error. Se muestra desde el manejador de excepciones de
 * bootstrap.php, así que NO depende de header.php ni del CSS (la base de
 * datos puede estar caída). El HTML y los estilos van en línea a propósito.
 */

$errorMessage = $errorMessage ?? 'Ocurrió un error inesperado.';
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Error · MY REAL STUDIA PHP Practice</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #faf9f7;
      color: #3a4453;
      font-family: 'Segoe UI', Roboto, system-ui, sans-serif;
      line-height: 1.55;
    }
    .error-card {
      max-width: 620px;
      margin: 2rem;
      padding: 2rem;
      background: #fff;
      border: 1px solid #e9e4de;
      border-left: 4px solid #c0564f;
      border-radius: 14px;
      box-shadow: 0 4px 16px rgba(58, 68, 83, 0.07);
    }
    .error-card h1 { margin: 0 0 0.5rem; font-size: 1.3rem; color: #333b48; }
    .error-card p { margin: 0 0 1rem; }
    .error-card code {
      display: block;
      padding: 0.85rem 1rem;
      background: #fbeceb;
      border-radius: 8px;
      color: #8f3f39;
      font-size: 0.9rem;
      word-break: break-word;
    }
    .error-card a { color: #5a4aa3; font-weight: 600; }
  </style>
</head>
<body>
  <div class="error-card" role="alert">
    <h1>No se pudo completar la operación</h1>
    <p><?= htmlspecialchars($errorMessage, ENT_QUOTES, 'UTF-8') ?></p>
    <code>Revisa C:\xampp\apache\logs\error.log y que MySQL esté iniciado en XAMPP.</code>
    <p style="margin-top:1.25rem">
      <a href="<?= htmlspecialchars(defined('BASE_URL') ? BASE_URL . '/index.php' : '/php-practice/index.php', ENT_QUOTES, 'UTF-8') ?>">
        Volver al inicio del módulo
      </a>
    </p>
  </div>
</body>
</html>
