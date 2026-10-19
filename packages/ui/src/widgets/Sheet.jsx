import { useId } from "react";
import { Button } from "./Button.jsx";
import { useModalDialog } from "./modal.js";
import { Icon } from "../icons/Icon.jsx";

/* A modal panel that slides in from an edge: the navigation drawer, filters
   on a phone, a short form. It is a modal dialog: the page behind is inert,
   focus moves into it and returns to what opened it, and Escape, the close
   button or a click outside calls onClose. side is start, end, bottom or
   full (the whole screen). */
export function Sheet({ open = false, onClose, title, label, side = "start", closeLabel = "Close", initialFocus, className, children, ...rest }) {
  const dialog = useModalDialog(open, initialFocus);
  const titleId = useId();
  return (
    <dialog ref={dialog} className={`piq-sheet${className ? ` ${className}` : ""}`} data-side={side} aria-labelledby={title ? titleId : undefined} aria-label={title ? undefined : label}
      onCancel={(e) => { e.preventDefault(); onClose?.(); }} onClick={(e) => { if (e.target === dialog.current) onClose?.(); }} {...rest}>
      <div className="piq-sheet__body">
        <div className="piq-sheet__head">
          {title && <h2 id={titleId} className="piq-sheet__title">{title}</h2>}
          <Button variant="text" className="piq-sheet__close" aria-label={closeLabel} onClick={() => onClose?.()}><Icon name="close" /></Button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
