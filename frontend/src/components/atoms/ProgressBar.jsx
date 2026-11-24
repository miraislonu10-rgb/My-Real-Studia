/**
 * STUDIA - Atomo: Barra de progreso
 * @param {{value?:number, success?:boolean, label?:string}} props
 */

export default function ProgressBar({ value = 0, success = false, label }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={`progress__fill${success ? ' progress__fill--success' : ''}`} style={{ width: `${safe}%` }} />
    </div>
  );
}
