import { useId, useRef, useState } from "react";

/* Panels that share one place, one shown at a time, chosen by a row of
   tabs. Keyboard as the WAI-ARIA Tabs pattern: Left and Right (mirrored in a
   right-to-left page) move between tabs and show each, Home and End go to the
   ends; Tab moves into the panel. tabs: [{ id, label, panel, count? }].
   Controlled with value and onChange, or not with defaultValue. The design
   system decides whether the selected tab is underlined or enclosed. */
export function Tabs({ tabs = [], value, defaultValue, onChange, label, className, ...rest }) {
  const [own, setOwn] = useState(defaultValue ?? tabs[0]?.id);
  const current = value ?? own;
  const base = useId();
  const list = useRef(null);

  function select(id, focus) {
    if (value === undefined) setOwn(id);
    if (id !== current) onChange?.(id);
    if (focus) [...(list.current?.querySelectorAll('[role="tab"]') ?? [])].find((b) => b.dataset.tab === String(id))?.focus();
  }
  function onKey(e) {
    const i = tabs.findIndex((t) => t.id === current);
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[e.key];
    let next = null;
    if (step) next = (i + step + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    select(tabs[next].id, true);
  }

  return (
    <div className={`piq-tabs${className ? ` ${className}` : ""}`} {...rest}>
      <div ref={list} role="tablist" aria-label={label} className="piq-tabs__list" onKeyDown={onKey}>
        {tabs.map((t) => {
          const on = t.id === current;
          return (
            <button key={t.id} type="button" role="tab" data-tab={t.id} id={`${base}-tab-${t.id}`} aria-selected={on} aria-controls={`${base}-panel-${t.id}`}
              tabIndex={on ? 0 : -1} className="piq-tabs__tab" onClick={() => select(t.id)}>
              {t.label}
              {t.count != null && <span className="piq-tabs__count">{t.count}</span>}
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`${base}-panel-${t.id}`} aria-labelledby={`${base}-tab-${t.id}`} tabIndex={0} hidden={t.id !== current} className="piq-tabs__panel">
          {t.panel}
        </div>
      ))}
    </div>
  );
}
