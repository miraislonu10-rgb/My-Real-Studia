<?php
/**
 * STUDIA · php-practice · Formularios
 * --------------------------------------------------------------------------
 * Formulario HTML de demostración con las dos formas de envío:
 *   - method="get"  -> los datos viajan en la URL     -> se leen con $_GET
 *   - method="post" -> los datos viajan en el cuerpo  -> se leen con $_POST
 *
 * Este archivo sólo presenta el formulario. El procesamiento ocurre en
 * get.php y post.php, que es la separación recomendada (vista / controlador).
 */

require_once __DIR__ . '/includes/bootstrap.php';

$pageTitle = 'Formulario HTML';
$pageIntro = 'El mismo formulario se envía de dos maneras distintas. Compara la barra de '
    . 'direcciones del navegador en cada caso.';

// Estado dejado por un envío POST rechazado (valores y errores por campo).
$formState  = pull_form_state();
$oldValues  = $formState['old'];
$formErrors = $formState['errors'];

/** Valor enviado anteriormente para un campo del formulario POST. */
$oldValue = static function (string $campo) use ($oldValues): string {
    return (string) ($oldValues[$campo] ?? '');
};

/** Clase del contenedor del campo, marcándolo si tiene error. */
$fieldClass = static function (string $campo) use ($formErrors): string {
    return 'field' . (isset($formErrors[$campo]) ? ' field--invalid' : '');
};

/** Mensaje de error del campo, listo para imprimir. */
$fieldError = static function (string $campo) use ($formErrors): string {
    if (!isset($formErrors[$campo])) {
        return '';
    }

    return '<small class="field__error" role="alert">' . e($formErrors[$campo]) . '</small>';
};

require __DIR__ . '/includes/header.php';
?>

<div class="card">
  <h2>Envío por <span class="badge badge--get">GET</span></h2>
  <p class="hint">
    Con <code>method="get"</code> los campos se añaden a la URL como
    <code>?clave=valor</code>. Es útil para búsquedas y filtros, pero <strong>nunca</strong>
    debe usarse para contraseñas ni datos sensibles: quedan visibles en el historial y en los
    registros del servidor.
  </p>

  <form class="form" method="get" action="<?= e(url('get.php')) ?>">
    <div class="form__row">
      <div class="field">
        <label for="g-nombre">Nombre a buscar</label>
        <input type="text" id="g-nombre" name="nombre" maxlength="120"
               placeholder="Ej. Ana" autocomplete="off">
      </div>

      <div class="field">
        <label for="g-programa">Programa académico</label>
        <input type="text" id="g-programa" name="programa" maxlength="120"
               placeholder="Ej. Medicina" autocomplete="off">
      </div>
    </div>

    <div class="actions">
      <button class="button" type="submit">Enviar por GET</button>
    </div>
  </form>
</div>

<div class="card">
  <h2>Envío por <span class="badge badge--post">POST</span></h2>
  <p class="hint">
    Con <code>method="post"</code> los datos viajan en el cuerpo de la petición: no aparecen en
    la URL. Es la opción correcta para crear o modificar información. El backend valida cada
    campo antes de escribir en MySQL.
  </p>

  <form class="form" method="post" action="<?= e(url('post.php')) ?>" novalidate>
    <?= csrf_field() ?>

    <div class="form__row">
      <div class="<?= $fieldClass('nombre') ?>">
        <label for="p-nombre">Nombre completo</label>
        <input type="text" id="p-nombre" name="nombre" maxlength="120" required
               value="<?= e($oldValue('nombre')) ?>" autocomplete="name"
               <?= isset($formErrors['nombre']) ? 'aria-describedby="p-nombre-error" aria-invalid="true"' : '' ?>>
        <?php if (isset($formErrors['nombre'])): ?>
          <small class="field__error" role="alert" id="p-nombre-error"><?= e($formErrors['nombre']) ?></small>
        <?php else: ?>
          <small class="field__hint">Entre 3 y 120 caracteres, sólo letras.</small>
        <?php endif; ?>
      </div>

      <div class="<?= $fieldClass('correo') ?>">
        <label for="p-correo">Correo electrónico</label>
        <input type="email" id="p-correo" name="correo" maxlength="150" required
               value="<?= e($oldValue('correo')) ?>" autocomplete="email"
               <?= isset($formErrors['correo']) ? 'aria-describedby="p-correo-error" aria-invalid="true"' : '' ?>>
        <?php if (isset($formErrors['correo'])): ?>
          <small class="field__error" role="alert" id="p-correo-error"><?= e($formErrors['correo']) ?></small>
        <?php else: ?>
          <small class="field__hint">Debe ser único en la tabla de demostración.</small>
        <?php endif; ?>
      </div>
    </div>

    <div class="form__row">
      <div class="<?= $fieldClass('programa') ?>">
        <label for="p-programa">Programa académico</label>
        <input type="text" id="p-programa" name="programa" maxlength="120" required
               value="<?= e($oldValue('programa')) ?>"
               <?= isset($formErrors['programa']) ? 'aria-describedby="p-programa-error" aria-invalid="true"' : '' ?>>
        <?= $fieldError('programa') ?>
      </div>

      <div class="<?= $fieldClass('semestre') ?>">
        <label for="p-semestre">Semestre (1-12)</label>
        <input type="number" id="p-semestre" name="semestre" min="1" max="12" step="1" required
               value="<?= e($oldValue('semestre')) ?>"
               <?= isset($formErrors['semestre']) ? 'aria-describedby="p-semestre-error" aria-invalid="true"' : '' ?>>
        <?= $fieldError('semestre') ?>
      </div>

      <div class="<?= $fieldClass('promedio') ?>">
        <label for="p-promedio">Promedio (0.00 - 5.00)</label>
        <input type="number" id="p-promedio" name="promedio" min="0" max="5" step="0.01" required
               value="<?= e($oldValue('promedio')) ?>"
               <?= isset($formErrors['promedio']) ? 'aria-describedby="p-promedio-error" aria-invalid="true"' : '' ?>>
        <?= $fieldError('promedio') ?>
      </div>
    </div>

    <div class="actions">
      <button class="button" type="submit">Enviar por POST</button>
      <a class="button button--ghost" href="<?= e(url('crud/index.php')) ?>">Ir al CRUD</a>
    </div>
  </form>
</div>

<div class="card">
  <h2>¿Cuándo usar cada método?</h2>
  <ul class="list">
    <li><strong>GET</strong>: consultas, búsquedas y filtros. Idempotente y enlazable.</li>
    <li><strong>POST</strong>: altas, cambios y cualquier dato sensible. No queda en la URL.</li>
    <li>
      En ambos casos el servidor <strong>debe validar</strong> los datos: revisar aquí
      <code>includes/functions.php</code> → <code>validar_estudiante()</code>.
    </li>
  </ul>
</div>

<?php require __DIR__ . '/includes/footer.php'; ?>
