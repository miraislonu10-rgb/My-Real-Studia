/**
 * STUDIA - Atomo: Indicador de carga
 * @param {{label?:string}} props
 */

export default function Spinner({ label }) {
  return (
    <div className="status status--loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {label && <span>{label}</span>}
    </div>
  );
}
