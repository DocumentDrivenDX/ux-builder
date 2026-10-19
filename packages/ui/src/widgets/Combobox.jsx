import { useEffect, useId, useRef, useState } from "react";
import { Frame } from "./Field.jsx";

/* A choice from a long list by typing: the WAI-ARIA Combobox pattern with a
   listbox popup. Typing filters the options; Down and Up move the active
   option (focus stays in the field, aria-activedescendant follows); Enter
   chooses; Escape closes without changing the choice; with no match it says
   so. Text matches the start of any word of an option. options: [{ value,
   label }]; value and onChange(value) hold the choice. */
export function Combobox({ label, options = [], value, onChange, placeholder, hint, error, emptyLabel = "No matches", id, className }) {
  const chosen = options.find((o) => o.value === value);
  const [text, setText] = useState(chosen?.label ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const base = useId();
  const input = useRef(null);

  useEffect(() => { if (!open) setText(chosen?.label ?? ""); }, [chosen?.label, open]);
  const query = text.trim().toLowerCase();
  // Matches the start of any word, so "lo" finds London and Los Angeles, not Barcelona.
  const matches = (label) => label.toLowerCase().startsWith(query) || label.toLowerCase().split(/[\s,./()-]+/).some((w) => w.startsWith(query));
  const shown = open && query && query !== (chosen?.label ?? "").toLowerCase() ? options.filter((o) => matches(o.label)) : options;

  const choose = (o) => { onChange?.(o.value); setText(o.label); setOpen(false); setActive(-1); };
  function onKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); if (!open) setOpen(true); setActive((a) => Math.min(a + 1, shown.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (!open) setOpen(true); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { if (open) { e.preventDefault(); if (shown[active]) choose(shown[active]); } }
    else if (e.key === "Escape") { if (open) { e.preventDefault(); setOpen(false); setActive(-1); setText(chosen?.label ?? ""); } }
  }

  return (
    <Frame label={label} hint={hint} error={error} id={id} className={`piq-combobox${className ? ` ${className}` : ""}`}>
      {(control) => (
        <span className="piq-combobox__field">
          <input ref={input} {...control} type="text" role="combobox" className="piq-field__input" autoComplete="off" placeholder={placeholder}
            aria-expanded={open} aria-controls={`${base}-list`} aria-autocomplete="list"
            aria-activedescendant={open && shown[active] ? `${base}-${shown[active].value}` : undefined}
            value={text} onChange={(e) => { setText(e.target.value); setOpen(true); setActive(0); }} onKeyDown={onKey}
            onBlur={() => { setOpen(false); setActive(-1); }} />
          <ul id={`${base}-list`} role="listbox" aria-label={typeof label === "string" ? label : undefined} className="piq-menu piq-combobox__list" hidden={!open || !shown.length}>
            {shown.map((o, i) => (
              <li key={o.value} id={`${base}-${o.value}`} role="option" aria-selected={o.value === value} className={`piq-menu__item${i === active ? " is-hover" : ""}`}
                onMouseDown={(e) => e.preventDefault()} onClick={() => choose(o)}>{o.label}</li>
            ))}
          </ul>
          <span className={open && !shown.length ? "piq-combobox__empty" : "piq-visually-hidden"} role="status">{open && !shown.length ? emptyLabel : ""}</span>
        </span>
      )}
    </Frame>
  );
}
