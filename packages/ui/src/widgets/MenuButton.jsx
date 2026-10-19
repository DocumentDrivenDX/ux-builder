import { useEffect, useId, useRef, useState } from "react";
import { Button } from "./Button.jsx";
import { Icon } from "../icons/Icon.jsx";

/* A button that opens a menu of actions: account, workspace, a page's or a
   row's "More". Keyboard as the WAI-ARIA Menu Button pattern: Enter, Space
   or Down opens on the first item, Up on the last; arrows, Home and End move;
   a letter jumps to the next item starting with it; Escape closes and returns
   focus to the button. items: [{ label, onSelect?, href?, disabled?,
   checked? }]; an item with checked is a radio item, for a current choice.
   Not for navigation between pages: that is links (PrimaryNav). */
export function MenuButton({ label, items = [], icon, variant = "secondary", size, align = "start", buttonLabel, className, ...rest }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const button = useRef(null), menu = useRef(null);
  const id = useId();
  const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);

  const openAt = (where) => { setOpen(true); setActive(where === "last" ? enabled.at(-1) : enabled[0]); };
  const close = (refocus = true) => { setOpen(false); setActive(-1); if (refocus) button.current?.focus(); };
  const move = (delta) => setActive((a) => enabled[(enabled.indexOf(a) + delta + enabled.length) % enabled.length]);

  useEffect(() => {
    if (open && active >= 0) menu.current?.querySelectorAll("[data-index]")[active]?.focus();
  }, [open, active]);
  useEffect(() => {
    if (!open) return undefined;
    const outside = (e) => { if (!button.current?.contains(e.target) && !menu.current?.contains(e.target)) close(false); };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  function onButtonKey(e) {
    if (["ArrowDown", "Enter", " "].includes(e.key)) { e.preventDefault(); openAt("first"); }
    else if (e.key === "ArrowUp") { e.preventDefault(); openAt("last"); }
  }
  function onMenuKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Home") { e.preventDefault(); setActive(enabled[0]); }
    else if (e.key === "End") { e.preventDefault(); setActive(enabled.at(-1)); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") close(false);
    else if (e.key.length === 1 && /\S/.test(e.key)) {
      const from = enabled.indexOf(active);
      const order = [...enabled.slice(from + 1), ...enabled.slice(0, from + 1)];
      const hit = order.find((i) => String(items[i].label).toLowerCase().startsWith(e.key.toLowerCase()));
      if (hit !== undefined) setActive(hit);
    }
  }
  function choose(item, e) {
    if (item.disabled) { e.preventDefault(); return; }
    close();
    item.onSelect?.(e);
  }

  const name = (typeof label === "string" && label) || buttonLabel;
  return (
    <div className={`piq-menubutton${className ? ` ${className}` : ""}`} data-align={align} {...rest}>
      <Button ref={button} variant={variant} size={size} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} aria-label={buttonLabel}
        onClick={() => (open ? close() : openAt("first"))} onKeyDown={onButtonKey}>
        {icon && <Icon name={icon} />}
        {label}
        <Icon name="chevron-down" className="piq-menubutton__chevron" />
      </Button>
      {open && (
        <ul ref={menu} id={id} role="menu" aria-label={name} className="piq-menu piq-menubutton__menu" onKeyDown={onMenuKey}>
          {items.map((it, i) => {
            const props = {
              "data-index": i, tabIndex: -1, className: `piq-menu__item${i === active ? " is-hover" : ""}`,
              role: it.checked === undefined ? "menuitem" : "menuitemradio", "aria-checked": it.checked === undefined ? undefined : !!it.checked,
              "aria-disabled": it.disabled || undefined, onClick: (e) => choose(it, e), onMouseEnter: () => !it.disabled && setActive(i),
            };
            return (
              <li key={i} role="none">
                {it.href ? <a href={it.href} {...props}>{it.label}</a> : <button type="button" {...props}>{it.label}</button>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
