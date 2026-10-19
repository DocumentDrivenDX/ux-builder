import { useId } from "react";
import { Button } from "./Button.jsx";
import { useModalDialog } from "./modal.js";
import { Icon } from "../icons/Icon.jsx";

/* A modal dialog in the middle of the screen: a short task or a decision.
   The page behind is inert, focus moves in (to initialFocus, a ref, if
   given) and returns to what opened it; Escape or the close button calls
   onClose. actions go in the footer. role="alertdialog" for a confirmation
   that needs an answer. */
export function Dialog({ open = false, onClose, title, description, actions, closeLabel = "Close", initialFocus, role, className, children, ...rest }) {
  const dialog = useModalDialog(open, initialFocus);
  const titleId = useId(), descId = useId();
  return (
    <dialog ref={dialog} role={role} className={`piq-dialog${className ? ` ${className}` : ""}`} aria-labelledby={titleId} aria-describedby={description ? descId : undefined}
      onCancel={(e) => { e.preventDefault(); onClose?.(); }} {...rest}>
      <div className="piq-dialog__head">
        <h2 id={titleId} className="piq-dialog__title">{title}</h2>
        {onClose && <Button variant="text" className="piq-dialog__close" aria-label={closeLabel} onClick={() => onClose()}><Icon name="close" /></Button>}
      </div>
      {description && <p id={descId} className="piq-dialog__description">{description}</p>}
      {children && <div className="piq-dialog__body">{children}</div>}
      {actions && <div className="piq-dialog__actions">{actions}</div>}
    </dialog>
  );
}
