<?php
/**
 * STUDIA · php-practice
 * --------------------------------------------------------------------------
 * Encabezado común: <head>, barra de navegación y avisos flash.
 * Espera que la página defina $pageTitle (y opcionalmente $pageIntro).
 */

$pageTitle = $pageTitle ?? 'Módulo PHP de práctica';

$navItems = [
    'index.php'      => 'Inicio',
    'formulario.php' => 'Formularios',
    'get.php'        => 'GET',
    'post.php'       => 'POST',
    'servidor.php'   => '$_SERVER',
    'crud/index.php' => 'CRUD MySQL',
];

$currentPage = current_page();
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Módulo complementario de MY REAL STUDIA para demostrar PHP básico, formularios GET y POST, superglobales y CRUD con MySQL mediante PDO.">
  <meta name="robots" content="noindex, nofollow">
  <title><?= e($pageTitle) ?> · MY REAL STUDIA PHP Practice</title>
  <link rel="stylesheet" href="<?= e(url('assets/style.css')) ?>">
</head>
<body>
  <a class="skip-link" href="#contenido">Saltar al contenido</a>

  <header class="topbar">
    <div class="topbar__inner">
      <a class="brand" href="<?= e(url('index.php')) ?>">
        <span class="brand__logo" aria-hidden="true">S</span>
        <span>
          <strong class="brand__title">MY REAL STUDIA PHP Practice</strong>
          <small class="brand__subtitle">PHP básico · GET/POST · Superglobales · CRUD con MySQL</small>
        </span>
      </a>

      <nav class="nav" aria-label="Navegación del módulo PHP">
        <?php foreach ($navItems as $path => $label): ?>
          <a
            class="nav__link<?= $currentPage === $path ? ' nav__link--active' : '' ?>"
            href="<?= e(url($path)) ?>"
            <?= $currentPage === $path ? 'aria-current="page"' : '' ?>
          ><?= e($label) ?></a>
        <?php endforeach; ?>
      </nav>
    </div>
  </header>

  <main class="page" id="contenido">
    <?php foreach (flashes() as $flash): ?>
      <div class="alert alert--<?= e($flash['type']) ?>" role="status"><?= e($flash['message']) ?></div>
    <?php endforeach; ?>

    <header class="page__head">
      <h1 class="page__title"><?= e($pageTitle) ?></h1>
      <?php if (!empty($pageIntro)): ?>
        <p class="page__intro"><?= $pageIntro ?></p>
      <?php endif; ?>
    </header>
