import { useEffect, useId, useRef, useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { Icon } from "../icons/Icon.jsx";
import { SplitView } from "./Layout.jsx";
import { PageHeader, StatePanel, sizeAtLeast, useSizeClass } from "./Regions.jsx";

/* A settings screen: section navigation beside the current section from
   the expanded size class; below it the list of sections first, and a
   chosen section on its own with a link back to the list. Sections swap in
   place, so the current one is marked aria-current="true"; choosing one moves
   focus to its heading. A section the user may not use is left out (hidden)
   or shown disabled with its reason (disabled: "reason"); with none left the
   screen says the user has no access. Sections stay mounted, so typed input
   survives a change of layout. sections: [{ id, label, content, disabled?,
   hidden? }]. */
export function SettingsPage({ title = "Settings", breadcrumbs, sections = [], current, onChange, navLabel = "Settings sections", backLabel = "All settings", className }) {
  const root = useRef(null);
  const size = useSizeClass(root);
  const wide = sizeAtLeast(size, "expanded");
  const shown = sections.filter((s) => !s.hidden);
  const usable = shown.filter((s) => !s.disabled);
  const [own, setOwn] = useState(current ?? usable[0]?.id);
  const active = current ?? own;
  const [view, setView] = useState("list");
  const base = useId();
  const headings = useRef({});

  // From expanded up the current section is open, so a narrower layout keeps it open (AC6).
  useEffect(() => { if (wide && active != null) setView("section"); }, [wide, active]);

  const choose = (id) => {
    if (current === undefined) setOwn(id);
    onChange?.(id);
    setView("section");
    requestAnimationFrame(() => headings.current[id]?.focus());
  };
  const back = () => { setView("list"); requestAnimationFrame(() => root.current?.querySelector(`[data-section="${active}"]`)?.focus()); };

  if (!usable.length) {
    return (
      <div ref={root} className={`piq-settings${className ? ` ${className}` : ""}`}>
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        <StatePanel kind="forbidden" />
      </div>
    );
  }

  return (
    <div ref={root} className={`piq-settings${className ? ` ${className}` : ""}`} data-size={size}>
      <PageHeader title={title} breadcrumbs={breadcrumbs} />
      <SplitView show={view === "section" ? "secondary" : "primary"}
        primary={
          <nav aria-label={navLabel} className="piq-settings__nav">
            <ul className="piq-primary-nav__list">
              {shown.map((s) => (
                <li key={s.id} className="piq-primary-nav__item">
                  <button type="button" data-section={s.id} className="piq-primary-nav__link" aria-current={s.id === active ? "true" : undefined}
                    aria-disabled={s.disabled ? "true" : undefined} aria-describedby={s.disabled ? `${base}-${s.id}-why` : undefined}
                    onClick={() => !s.disabled && choose(s.id)}>
                    <span className="piq-primary-nav__label">{s.label}</span>
                    {!s.disabled && <Icon name="chevron-right" className="piq-settings__chevron" />}
                  </button>
                  {s.disabled && <p id={`${base}-${s.id}-why`} className="piq-settings__why">{typeof s.disabled === "string" ? s.disabled : "Not available to you"}</p>}
                </li>
              ))}
            </ul>
          </nav>
        }
        secondary={
          <div className="piq-settings__sections">
            <Button variant="text" className="piq-settings__back" onClick={back}><Icon name="arrow-left" />{backLabel}</Button>
            {usable.map((s) => (
              <section key={s.id} className="piq-settings__section" aria-labelledby={`${base}-${s.id}-h`} hidden={s.id !== active}>
                <h2 id={`${base}-${s.id}-h`} tabIndex={-1} ref={(el) => { headings.current[s.id] = el; }} className="piq-settings__heading">{s.label}</h2>
                {s.content}
              </section>
            ))}
          </div>
        } />
    </div>
  );
}
