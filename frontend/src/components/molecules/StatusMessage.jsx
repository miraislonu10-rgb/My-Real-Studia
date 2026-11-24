/**
 * STUDIA - Molecula: Mensaje de estado
 * ------------------------------------------------------------------
 * Aviso unico de exito, error o informacion. Los errores de la API llegan con
 * un mensaje legible, y los de validacion se muestran campo por campo.
 *
 * @param {{type?:'ok'|'error'|'info', children:React.ReactNode}} props
 */

export default function StatusMessage({ type = 'info', children }) {
  if (!children) return null;

  return (
    <div className={`status status--${type}`} role={type === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
