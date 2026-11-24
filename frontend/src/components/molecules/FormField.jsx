/**
 * STUDIA - Molecula: Campo de formulario
 * ------------------------------------------------------------------
 * Agrupa etiqueta, control, ayuda y error. El control lo aporta quien lo usa,
 * de modo que sirve para input, select, textarea o un campo combinado.
 *
 * ACCESIBILIDAD (PROMPT 16): el campo conecta la etiqueta con el control
 * (htmlFor/id) y ademas anuncia el estado del campo a los lectores de pantalla:
 *  - aria-invalid="true" cuando hay error de validacion.
 *  - aria-describedby apuntando al texto de ayuda y/o al mensaje de error.
 *
 * @param {{label:string, name:string, error?:string, hint?:string, children:React.ReactNode}} props
 */

import { cloneElement, isValidElement } from 'react';

export default function FormField({ label, name, error, hint, children }) {
  const hintId = `${name}-hint`;
  const errorId = `${name}-error`;

  // Solo se referencian ids que realmente se renderizan (ayuda visible o error).
  const describedBy = [hint && !error ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ');

  const control = isValidElement(children)
    ? cloneElement(children, {
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': describedBy || undefined,
      })
    : children;

  return (
    <div className={`form-field${error ? ' form-field--invalid' : ''}`}>
      <label htmlFor={name}>{label}</label>
      {control}
      {hint && !error && (
        <small className="form-field__hint" id={hintId}>
          {hint}
        </small>
      )}
      {error && (
        <small className="form-field__error" id={errorId} role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
