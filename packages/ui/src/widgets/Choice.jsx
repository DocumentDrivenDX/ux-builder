import { useId } from "react";

/* Choices on native inputs: a checkbox, a switch (a checkbox with
   role="switch", so it is announced as on or off), and a radio group in a
   fieldset whose legend names it. */

/* One on/off choice with its label. */
export function Checkbox({ label, className = "", ...input }) {
  return (
    <label className={`piq-check${className ? ` ${className}` : ""}`}>
      <input type="checkbox" className="piq-check__box" {...input} />
      <span>{label}</span>
    </label>
  );
}

/* A setting that takes effect at once: a checkbox announced as on or off. */
export function Switch({ label, className = "", ...input }) {
  return (
    <label className={`piq-check piq-switch${className ? ` ${className}` : ""}`}>
      <input type="checkbox" role="switch" className="piq-switch__track" {...input} />
      <span>{label}</span>
    </label>
  );
}

/* options: [{ value, label, disabled? }]. Controlled with value and onChange,
   or uncontrolled with defaultValue. */
/* One choice from a short list, each option with its label, in a fieldset with a legend. */
export function RadioGroup({ label, options, name, value, defaultValue, onChange, disabled }) {
  const auto = useId();
  const group = name ?? auto;
  return (
    <fieldset className="piq-radios" disabled={disabled}>
      <legend className="piq-field__label">{label}</legend>
      {options.map((o) => (
        <label key={o.value} className="piq-check">
          <input
            type="radio"
            className="piq-radio"
            name={group}
            value={o.value}
            disabled={o.disabled}
            {...(value !== undefined ? { checked: value === o.value, onChange: () => onChange?.(o.value) } : { defaultChecked: defaultValue === o.value })}
          />
          <span>{o.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
