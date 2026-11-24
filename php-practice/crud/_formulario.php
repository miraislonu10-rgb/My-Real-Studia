<?php
/**
 * STUDIA · php-practice · CRUD
 * --------------------------------------------------------------------------
 * Parcial reutilizable: formulario de alta y edición.
 *
 * Requiere que el script que lo incluye defina:
 *   $formAction  URL a la que se envía el formulario (POST).
 *   $valores     Valores actuales de cada campo.
 *   $errores     Errores de validación indexados por campo.
 *   $submitLabel Texto del botón de envío.
 */

$formAction  = $formAction ?? url('crud/crear.php');
$valores     = $valores ?? [];
$errores     = $errores ?? [];
$submitLabel = $submitLabel ?? 'Guardar';

/** Valor actual de un campo. */
$valor = static function (string $campo) use ($valores): string {
    return (string) ($valores[$campo] ?? '');
};
?>
<form class="form" method="post" action="<?= e($formAction) ?>" novalidate>
  <?= csrf_field() ?>

  <div class="form__row">
    <div class="field<?= isset($errores['nombre']) ? ' field--invalid' : '' ?>">
      <label for="nombre">Nombre completo</label>
      <input type="text" id="nombre" name="nombre" maxlength="120" required
             value="<?= e($valor('nombre')) ?>"
             <?= isset($errores['nombre']) ? 'aria-describedby="error-nombre" aria-invalid="true"' : '' ?>>
      <?php if (isset($errores['nombre'])): ?>
        <small class="field__error" role="alert" id="error-nombre"><?= e($errores['nombre']) ?></small>
      <?php endif; ?>
    </div>

    <div class="field<?= isset($errores['correo']) ? ' field--invalid' : '' ?>">
      <label for="correo">Correo electrónico</label>
      <input type="email" id="correo" name="correo" maxlength="150" required
             value="<?= e($valor('correo')) ?>"
             <?= isset($errores['correo']) ? 'aria-describedby="error-correo" aria-invalid="true"' : '' ?>>
      <?php if (isset($errores['correo'])): ?>
        <small class="field__error" role="alert" id="error-correo"><?= e($errores['correo']) ?></small>
      <?php endif; ?>
    </div>
  </div>

  <div class="form__row">
    <div class="field<?= isset($errores['programa']) ? ' field--invalid' : '' ?>">
      <label for="programa">Programa académico</label>
      <input type="text" id="programa" name="programa" maxlength="120" required
             value="<?= e($valor('programa')) ?>"
             <?= isset($errores['programa']) ? 'aria-describedby="error-programa" aria-invalid="true"' : '' ?>>
      <?php if (isset($errores['programa'])): ?>
        <small class="field__error" role="alert" id="error-programa"><?= e($errores['programa']) ?></small>
      <?php endif; ?>
    </div>

    <div class="field<?= isset($errores['semestre']) ? ' field--invalid' : '' ?>">
      <label for="semestre">Semestre (1-12)</label>
      <input type="number" id="semestre" name="semestre" min="1" max="12" step="1" required
             value="<?= e($valor('semestre')) ?>"
             <?= isset($errores['semestre']) ? 'aria-describedby="error-semestre" aria-invalid="true"' : '' ?>>
      <?php if (isset($errores['semestre'])): ?>
        <small class="field__error" role="alert" id="error-semestre"><?= e($errores['semestre']) ?></small>
      <?php endif; ?>
    </div>

    <div class="field<?= isset($errores['promedio']) ? ' field--invalid' : '' ?>">
      <label for="promedio">Promedio (0.00 - 5.00)</label>
      <input type="number" id="promedio" name="promedio" min="0" max="5" step="0.01" required
             value="<?= e($valor('promedio')) ?>"
             <?= isset($errores['promedio']) ? 'aria-describedby="error-promedio" aria-invalid="true"' : '' ?>>
      <?php if (isset($errores['promedio'])): ?>
        <small class="field__error" role="alert" id="error-promedio"><?= e($errores['promedio']) ?></small>
      <?php endif; ?>
    </div>
  </div>

  <div class="actions">
    <button class="button" type="submit"><?= e($submitLabel) ?></button>
    <a class="button button--ghost" href="<?= e(url('crud/index.php')) ?>">Cancelar</a>
  </div>
</form>
