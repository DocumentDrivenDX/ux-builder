import { useRef } from "react";

/* One choice from a few, every option in view: a radio group drawn as
   segments. It is a single tab stop; the arrow keys, Home and End move the
   selection, as a native radio group does. */

export function ChoicePicker({ label, options, value, onChange, disabled }) {
  const refs = useRef([]);
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  function select(i) {
    const next = (i + options.length) % options.length;
    onChange?.(options[next].value);
    refs.current[next]?.focus();
  }

  function onKeyDown(e) {
    const moves = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: options.length - 1 };
    if (e.key in moves) { e.preventDefault(); select(moves[e.key]); }
  }

  return (
    <div className="piq-seg" role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={i === index ? 0 : -1}
            disabled={disabled}
            className="piq-seg__opt"
            onClick={() => onChange?.(o.value)}
          >
            <span className="piq-seg__tick" aria-hidden="true">✓</span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
