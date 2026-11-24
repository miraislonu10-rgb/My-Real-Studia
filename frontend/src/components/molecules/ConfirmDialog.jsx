/**
 * STUDIA - Molecula: Dialogo de confirmacion
 * ------------------------------------------------------------------
 * Se usa antes de una accion destructiva (eliminar, suspender). Nunca elimina
 * por si solo: delega la operacion a la API mediante onConfirm.
 *
 * @param {{open:boolean, title:string, text:string, confirmLabel?:string,
 *          onConfirm:Function, onCancel:Function, loading?:boolean, danger?:boolean}} props
 */

import Button from '../atoms/Button.jsx';
import Modal from './Modal.jsx';

export default function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel = 'Confirmar',
  onConfirm,
  onCancel,
  loading = false,
  danger = true,
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={loading ? undefined : onCancel}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="page__text">{text}</p>
    </Modal>
  );
}
