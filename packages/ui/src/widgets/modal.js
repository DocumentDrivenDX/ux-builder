import { useEffect, useRef } from "react";

/* The behaviour Sheet and Dialog share: a native <dialog> opened with
   showModal() (the page behind becomes inert, so focus stays inside), focus
   on initialFocus if given, and focus back on whatever opened it when it
   closes. Returns the ref for the <dialog>. */
export function useModalDialog(open, initialFocus) {
  const dialog = useRef(null), opener = useRef(null);
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement;
      if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
      initialFocus?.current?.focus();
    } else if (!open && d.open) {
      d.close();
      opener.current?.focus?.();
    }
  }, [open, initialFocus]);
  useEffect(() => () => { if (dialog.current?.open) dialog.current.close(); }, []);
  return dialog;
}
