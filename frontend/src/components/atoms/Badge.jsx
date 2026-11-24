/**
 * STUDIA - Atomo: Insignia
 * @param {{children:React.ReactNode, tone?:'neutral'|'primary'|'success'|'warning'|'danger'|'info', solid?:boolean}} props
 */

export default function Badge({ children, tone = 'neutral', solid = false }) {
  const toneClass = tone === 'neutral' ? '' : `badge--${tone}`;
  return <span className={`badge ${toneClass}${solid ? ' badge--solid' : ''}`.trim()}>{children}</span>;
}
