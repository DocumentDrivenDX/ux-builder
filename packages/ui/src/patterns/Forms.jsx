import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { Dialog } from "../widgets/Dialog.jsx";
import { Sheet } from "../widgets/Sheet.jsx";
import { PageHeader, useStickyClearance } from "./Regions.jsx";

/* Warns before the page is left with unsaved changes (the browser's own
   prompt on reload, close or a link out of the app). An app's router should
   also block its own navigation while dirty is true. */
export function useUnsavedChangesWarning(dirty) {
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}

/* A form's values, errors and submission, as the form patterns expect.
   validate(values) returns { field: message } for what is wrong. An error
   shows once its field has been left (blur) or the form submitted, never
   while the user is still typing a first answer. field(name) gives a field
   widget its props: id, name, value, onChange, onBlur and error. submit()
   validates everything; with errors it shows the summary, otherwise calls
   onSubmit(values). dirty is true once a value differs from the initial. */
export function useFormState({ initial = {}, validate = () => ({}), onSubmit } = {}) {
  const formId = useId();
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const start = useRef(initial);
  const errors = useMemo(() => Object.fromEntries(Object.entries(validate(values) ?? {}).filter(([, m]) => m)), [values, validate]);
  const dirty = Object.keys({ ...start.current, ...values }).some((k) => values[k] !== start.current[k]);
  const idOf = useCallback((name) => `${formId}-${name}`, [formId]);

  const field = (name) => ({
    id: idOf(name), name, value: values[name] ?? "",
    onChange: (e) => setValues((v) => ({ ...v, [name]: e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e })),
    onBlur: () => setTouched((t) => ({ ...t, [name]: true })),
    error: touched[name] || submitted ? errors[name] : undefined,
  });
  async function submit(e) {
    e?.preventDefault?.();
    setSubmitted(true);
    setAttempt((n) => n + 1);
    if (Object.keys(errors).length) return false;
    setBusy(true);
    try { await onSubmit?.(values); start.current = values; } finally { setBusy(false); }
    return true;
  }
  const reset = (to = start.current) => { start.current = to; setValues(to); setTouched({}); setSubmitted(false); };
  const shownErrors = submitted ? errors : {};
  return { values, setValues, errors, shownErrors, field, submit, reset, dirty, busy, submitted, attempt, idOf };
}

/* The problems with a submitted form, at its top: a heading and a link to
   each invalid field. It takes focus when it appears, so keyboard and screen
   reader users learn what is wrong at once, and each link moves focus to its
   field. errors: { field: message }; idOf(field) gives each field's id. */
export function ErrorSummary({ errors = {}, idOf = (n) => n, title = "There is a problem", attempt = 0, className }) {
  const ref = useRef(null);
  const entries = Object.entries(errors);
  useEffect(() => { if (entries.length) ref.current?.focus(); }, [attempt]);
  if (!entries.length) return null;
  return (
    <div ref={ref} tabIndex={-1} className={`piq-error-summary${className ? ` ${className}` : ""}`} aria-labelledby={`${idOf("summary")}-title`}>
      <h2 id={`${idOf("summary")}-title`} className="piq-error-summary__title">{title}</h2>
      <ul className="piq-error-summary__list">
        {entries.map(([name, message]) => (
          <li key={name}>
            <a href={`#${idOf(name)}`} onClick={(e) => { e.preventDefault(); const f = document.getElementById(idOf(name)); f?.focus(); f?.scrollIntoView?.({ block: "center" }); }}>{message}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* A group of related fields with a heading. */
export function FormSection({ title, description, children, className }) {
  return (
    <fieldset className={`piq-form-section${className ? ` ${className}` : ""}`}>
      <legend className="piq-form-section__title">{title}</legend>
      {description && <p className="piq-form-section__description">{description}</p>}
      <div className="piq-form-section__fields">{children}</div>
    </fieldset>
  );
}

/* A full-page form for creating or editing a record: one column of fields
   with labels above, no wider than the design system's form width; an error
   summary that takes focus when a submit finds problems; Save and Cancel in
   a bar that stays in view (and above the on-screen keyboard) without ever
   covering the focused field; a warning before leaving with unsaved changes,
   and a question before Cancel discards them. form comes from
   useFormState; fields go in children. */
export function FormPage({ title, breadcrumbs, description, form, onCancel, submitLabel = "Save", cancelLabel = "Cancel", discardTitle = "Discard your changes?", discardText = "What you have typed will be lost.", keepLabel = "Keep editing", discardLabel = "Discard", children, className }) {
  const bar = useRef(null);
  const keep = useRef(null);
  const [asking, setAsking] = useState(false);
  useStickyClearance(bar, true);
  useUnsavedChangesWarning(form?.dirty);
  const cancel = () => (form?.dirty ? setAsking(true) : onCancel?.());
  return (
    <form className={`piq-form-page${className ? ` ${className}` : ""}`} noValidate onSubmit={form?.submit}>
      <PageHeader title={title} breadcrumbs={breadcrumbs} description={description} />
      <ErrorSummary errors={form?.shownErrors} idOf={form?.idOf} attempt={form?.attempt} />
      <div className="piq-form-page__fields">{children}</div>
      <div ref={bar} className="piq-form-page__actions">
        <Button type="submit" busy={form?.busy}>{submitLabel}</Button>
        {onCancel && <Button variant="secondary" onClick={cancel}>{cancelLabel}</Button>}
      </div>
      <Dialog open={asking} onClose={() => setAsking(false)} role="alertdialog" title={discardTitle} description={discardText} initialFocus={keep}
        actions={<><Button ref={keep} variant="secondary" onClick={() => setAsking(false)}>{keepLabel}</Button><Button onClick={() => { setAsking(false); onCancel?.(); }}>{discardLabel}</Button></>} />
    </form>
  );
}

function useWide() {
  const query = "(min-width: 600px)";
  const [wide, setWide] = useState(() => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const m = window.matchMedia(query);
    const on = () => setWide(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}

/* A short form for a quick create or edit, without leaving the page: a modal
   dialog from the medium size class, a full-screen sheet below it. Focus
   stays inside while it is open and returns to the control that opened it.
   form comes from useFormState; fields go in children. */
export function QuickEdit({ open = false, onClose, title, form, submitLabel = "Save", cancelLabel = "Cancel", children, className }) {
  const wide = useWide();
  const body = (
    <form className="piq-quick-edit" noValidate onSubmit={async (e) => { if (await form?.submit(e)) onClose?.(); }}>
      <ErrorSummary errors={form?.shownErrors} idOf={form?.idOf} attempt={form?.attempt} />
      <div className="piq-quick-edit__fields">{children}</div>
      <div className="piq-quick-edit__actions">
        <Button type="submit" busy={form?.busy}>{submitLabel}</Button>
        <Button variant="secondary" onClick={() => onClose?.()}>{cancelLabel}</Button>
      </div>
    </form>
  );
  return wide
    ? <Dialog open={open} onClose={onClose} title={title} className={className}>{body}</Dialog>
    : <Sheet open={open} onClose={onClose} title={title} side="full" className={className}>{body}</Sheet>;
}

/* The question before a destructive action: it names the object and what
   will be lost, starts focus on Cancel, and with requireTyping makes the
   user type the object's name before the action becomes available. */
export function ConfirmDialog({ open = false, onConfirm, onCancel, title, objectName, consequence, confirmLabel = "Delete", cancelLabel = "Cancel", requireTyping = false, typeLabel = (name) => `Type ${name} to confirm`, className }) {
  const cancel = useRef(null);
  const [typed, setTyped] = useState("");
  const id = useId();
  useEffect(() => { if (!open) setTyped(""); }, [open]);
  const ready = !requireTyping || typed.trim() === String(objectName);
  return (
    <Dialog open={open} onClose={onCancel} role="alertdialog" title={title ?? `Delete ${objectName}?`} description={consequence} initialFocus={cancel} className={`piq-confirm${className ? ` ${className}` : ""}`}
      actions={<>
        <Button ref={cancel} variant="secondary" onClick={() => onCancel?.()}>{cancelLabel}</Button>
        <Button className="piq-confirm__action" disabled={!ready} onClick={() => ready && onConfirm?.()}>{confirmLabel}</Button>
      </>}>
      {requireTyping && (
        <div className="piq-field">
          <label className="piq-field__label" htmlFor={id}>{typeLabel(objectName)}</label>
          <input id={id} className="piq-field__input" autoComplete="off" spellCheck={false} value={typed} onChange={(e) => setTyped(e.target.value)} />
        </div>
      )}
    </Dialog>
  );
}
