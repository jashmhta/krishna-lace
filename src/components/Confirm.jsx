import { Modal } from "./Modal.jsx";
import { Warning } from "@phosphor-icons/react";

export function Confirm({
  open, onClose, onConfirm,
  title = "Are you sure?", message = "This cannot be undone.",
  confirmLabel = "Delete", danger = true,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button
            onClick={() => { onConfirm?.(); onClose?.(); }}
            className={danger ? "btn-danger" : "btn-primary"}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className="grid place-items-center w-10 h-10 rounded-xl bg-danger-soft text-danger shrink-0">
          <Warning size={20} weight="duotone" />
        </div>
        <p className="text-sm text-ink-soft leading-relaxed pt-1">{message}</p>
      </div>
    </Modal>
  );
}
