import { useId } from "react";
import { TextField } from "./Field.jsx";

/* A date, on the browser's own date input, so the keyboard, the calendar and
   screen readers work everywhere. value and onChange use YYYY-MM-DD. */
export function DatePicker({ label, value, onChange, min, max, hint, error, id, className }) {
  return <TextField type="date" label={label} value={value ?? ""} min={min} max={max} hint={hint} error={error} id={id} className={className} onChange={(e) => onChange?.(e.target.value)} />;
}

/* A date range: From and To dates in a group named by label. The To date
   cannot be before the From date. onChange({ from, to }) with YYYY-MM-DD. */
export function DateRangePicker({ label, from, to, onChange, min, max, fromLabel = "From", toLabel = "To", className }) {
  const id = useId();
  return (
    <fieldset className={`piq-date-range${className ? ` ${className}` : ""}`}>
      <legend className="piq-field__label">{label}</legend>
      <div className="piq-date-range__fields">
        <DatePicker id={`${id}-from`} label={fromLabel} value={from} min={min} max={to || max} onChange={(v) => onChange?.({ from: v, to })} />
        <DatePicker id={`${id}-to`} label={toLabel} value={to} min={from || min} max={max} onChange={(v) => onChange?.({ from, to: v })} />
      </div>
    </fieldset>
  );
}
