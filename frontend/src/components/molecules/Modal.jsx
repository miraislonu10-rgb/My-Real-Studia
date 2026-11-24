/**
 * STUDIA - Molecula: Modal
 * ------------------------------------------------------------------
 * Panel flotante reutilizable para formularios de alta y edicion.
 * Se cierra con la tecla Escape y al pulsar el fondo.
 *
 * ACCESIBILIDAD (PROMPT 16):
 *  - El dialogo se titula con aria-labelledby (no con un aria-label suelto).
 *  - Al abrirse, el foco entra en el panel; al cerrarse, vuelve al elemento
 *    que lo abrio.
 *  - El foco queda atrapado dentro del dialogo mientras esta abierto, de modo
 *    que la navegacion por teclado (Tab) no se escapa al contenido de fondo.
 *  - El overlay se monta en <body> mediante un portal de React (createPortal),
 *    de modo que ningun ancestro con overflow/transform lo recorte o lo deje
 *    por debajo de otros elementos.
 *
 * @param {{open:boolean, title:string, onClose:Function, children:React.ReactNode,
 *          footer?:React.ReactNode, size?:'md'|'sm'}} props
 */

import { useEffect, useId, useRef } from 'react';

import Icon from '../atoms/Icon.jsx';
import Portal from '../atoms/Portal.jsx';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ open, title, onClose, children, footer, size = 'md' }) {
  const panelRef = useRef(null);
  const titleId = useId();

  // Guardamos onClose en un ref para que el efecto principal NO dependa de su
  // identidad. Si el padre pasa un onClose inline (una funcion nueva en cada
  // render), el efecto se re-ejecutaria en cada tecla y volveria a enfocar el
  // primer control (el boton "Cerrar"), expulsando el cursor del formulario.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    // Recuerda quien abrio el dialogo para devolverle el foco al cerrar.
    const previouslyFocused = document.activeElement;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCloseRef.current?.();
        return;
      }

      // Atrapa el foco dentro del panel mientras el dialogo este abierto.
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(panelRef.current.querySelectorAll(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    // Lleva el foco al primer control del dialogo al abrirlo. Si el contenido
    // marca un control con [data-autofocus], se respeta esa preferencia para no
    // aterrizar siempre en el boton "Cerrar" (util en formularios de alta/edicion).
    const preferred = panelRef.current?.querySelector('[data-autofocus]');
    const focusable = panelRef.current?.querySelectorAll(FOCUSABLE);
    if (preferred instanceof HTMLElement) {
      preferred.focus();
    } else if (focusable && focusable.length > 0) {
      focusable[0].focus();
    } else {
      panelRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
    // Solo depende de `open`: el autoenfoque ocurre unicamente al abrirse.
  }, [open]);

  if (!open) return null;

  return (
    <Portal>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={onClose}
      >
        <div
          ref={panelRef}
          className={`modal__panel${size === 'sm' ? ' modal__panel--sm' : ''}`}
          tabIndex={-1}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="modal__head">
            <h2 className="modal__title" id={titleId}>
              {title}
            </h2>
            <button type="button" className="button button--icon" onClick={onClose} aria-label="Cerrar">
              <Icon name="close" size={18} />
            </button>
          </header>

          <div className="modal__body">{children}</div>

          {footer && <footer className="modal__foot">{footer}</footer>}
        </div>
      </div>
    </Portal>
  );
}
