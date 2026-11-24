/**
 * STUDIA - Atomo: Portal
 * ------------------------------------------------------------------
 * Renderiza sus hijos directamente en <body> mediante createPortal.
 *
 * Se usa para overlays (modales y dialogos) porque un ancestro con
 * `overflow: hidden`, `transform` o `filter` crea un contexto de apilamiento
 * que recortaria o atraparia el overlay. Con un portal el nodo escapa de ese
 * arbol y siempre queda por encima, sin depender de la posicion en el DOM.
 *
 * @param {{children:React.ReactNode}} props
 */

import { createPortal } from 'react-dom';

export default function Portal({ children }) {
  if (typeof document === 'undefined') return null;

  return createPortal(children, document.body);
}
