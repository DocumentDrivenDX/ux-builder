import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/* A short confirmation after an action, with Undo. The region is a polite
   live region, so a screen reader announces each toast without moving focus.
   A toast waits while the pointer or focus is on it, so nobody loses the Undo
   by reading slowly (WCAG 2.2.1). */

export function Toast({ message, actionLabel, onAction, onMouseEnter, onMouseLeave, onFocus, onBlur }) {
  return (
    <div className="piq-toast" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onFocus={onFocus} onBlur={onBlur}>
      <p className="piq-toast__text">{message}</p>
      {actionLabel && <button type="button" className="piq-toast__action" onClick={onAction}>{actionLabel}</button>}
    </div>
  );
}

const ToastContext = createContext(null);

function Timed({ toast, dismiss }) {
  const [paused, setPaused] = useState(false);
  const left = useRef(toast.duration);
  useEffect(() => {
    if (paused) return undefined;
    const started = Date.now();
    const timer = setTimeout(() => dismiss(toast.id), left.current);
    return () => { clearTimeout(timer); left.current -= Date.now() - started; };
  }, [paused, toast.id, dismiss]);
  const hold = () => setPaused(true), go = () => setPaused(false);
  return (
    <Toast
      message={toast.message}
      actionLabel={toast.actionLabel}
      onAction={() => { toast.onAction?.(); dismiss(toast.id); }}
      onMouseEnter={hold} onMouseLeave={go} onFocus={hold} onBlur={go}
    />
  );
}

/* Holds the toasts for its subtree and shows them in a polite live region; wrap the app once. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const next = useRef(0);
  const dismiss = useCallback((id) => setToasts((all) => all.filter((t) => t.id !== id)), []);
  const show = useCallback(({ message, actionLabel, onAction, duration = 6000 }) => {
    const id = ++next.current;
    setToasts((all) => [...all, { id, message, actionLabel, onAction, duration }]);
    return id;
  }, []);
  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div className="piq-toasts" role="status" aria-live="polite">
        {toasts.map((t) => <Timed key={t.id} toast={t} dismiss={dismiss} />)}
      </div>
    </ToastContext.Provider>
  );
}

/* show({ message, actionLabel: "Undo", onAction }) puts up a toast; inside a
   ToastProvider only. */
/* show({ message, actionLabel, onAction, duration }) a toast, or dismiss(id) one. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast needs a <ToastProvider> above it");
  return ctx;
}
