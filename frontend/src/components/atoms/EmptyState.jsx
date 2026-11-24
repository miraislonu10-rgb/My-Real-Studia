/**
 * STUDIA - Atomo: Estado vacio
 * ------------------------------------------------------------------
 * Se muestra cuando una coleccion todavia no tiene registros. Sustituye a los
 * datos falsos: explica que falta y ofrece la accion para empezar.
 *
 * @param {{icon?:string, title:string, text?:string, action?:React.ReactNode, plain?:boolean}} props
 */

import Icon from './Icon.jsx';

export default function EmptyState({ icon = 'inbox', title, text, action, plain = false }) {
  return (
    <div className={`empty${plain ? ' empty--plain' : ''}`}>
      <span className="empty__icon">
        <Icon name={icon} size={22} />
      </span>
      <h3 className="empty__title">{title}</h3>
      {text && <p className="empty__text">{text}</p>}
      {action && <div className="empty__action">{action}</div>}
    </div>
  );
}
