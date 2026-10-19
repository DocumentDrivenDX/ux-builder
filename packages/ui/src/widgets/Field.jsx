import { useId } from "react";

/* The labelled controls that take typed or chosen input. Each is the native
   element, restyled, so the keyboard, autofill, form submission and the
   accessible name all come from the browser. The hint and the error are tied
   to the control with aria-describedby, and an error sets aria-invalid, so a
   screen reader hears what is wrong without seeing the colour. */

export function Frame({ label, hint, error, id, className, children }) {
  const auto = useId();
  const controlId = id ?? auto;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const control = {
    id: controlId,
    "aria-invalid": error ? "true" : undefined,
    "aria-describedby": [errorId, hintId].filter(Boolean).join(" ") || undefined,
  };
  return (
    <div className={`piq-field${className ? ` ${className}` : ""}`}>
      <label className="piq-field__label" htmlFor={controlId}>{label}</label>
      {children(control)}
      {error && <span id={errorId} className="piq-field__error">{error}</span>}
      {hint && <span id={hintId} className="piq-field__hint">{hint}</span>}
    </div>
  );
}

/* A single line of typed input with its label, and an optional hint or error. */
export function TextField({ label, hint, error, id, className = "", ...input }) {
  return (
    <Frame label={label} hint={hint} error={error} id={id} className={className}>
      {(control) => <input type="text" className="piq-field__input" {...control} {...input} />}
    </Frame>
  );
}

/* Several lines of typed input with its label, and an optional hint or error. */
export function TextArea({ label, hint, error, id, className = "", rows = 4, ...input }) {
  return (
    <Frame label={label} hint={hint} error={error} id={id} className={className}>
      {(control) => <textarea rows={rows} className="piq-field__input piq-field__input--multi" {...control} {...input} />}
    </Frame>
  );
}

/* A dropdown. Where the browser supports appearance: base-select (Chrome 135
   and later) the open list is styled by the theme too; elsewhere it opens the
   platform's own list, which is still fully accessible.
   options: [{ value, label, disabled? }]; placeholder adds an empty first
   option that cannot be chosen again. */
/* A dropdown: one choice from a longer list, with its label, and an optional placeholder, hint or error. */
export function Select({ label, hint, error, id, className = "", options, placeholder, ...select }) {
  return (
    <Frame label={label} hint={hint} error={error} id={id} className={className}>
      {(control) => (
        <span className="piq-select">
          <select className="piq-field__input piq-select__input" {...control} {...select}>
            {placeholder && <option value="" disabled>{placeholder}</option>}
            {options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
          </select>
        </span>
      )}
    </Frame>
  );
}
