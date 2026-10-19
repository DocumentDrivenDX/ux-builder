import { cloneElement, useEffect, useId, useRef, useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { Dialog } from "../widgets/Dialog.jsx";
import { Icon } from "../icons/Icon.jsx";
import { PageHeader } from "./Regions.jsx";

function ItemList({ list }) {
  const id = useId();
  return (
    <section className="piq-home__list" aria-labelledby={id}>
      <h2 id={id} className="piq-home__heading">{list.title}</h2>
      {list.items?.length
        ? <ul className="piq-home__items">{list.items.map((it) => <li key={it.id}><a href={it.href}>{it.label}</a>{it.meta && <span className="piq-home__meta">{it.meta}</span>}</li>)}</ul>
        : <p className="piq-home__empty">{list.emptyText ?? "Nothing here yet."}</p>}
    </section>
  );
}

/* The first screen after signing in: a summary for this person, from
   slots: number tiles (StatTile elements), their assigned work and their
   recent items, each list with its own empty state. assigned and recent:
   { title, items: [{ id, label, href, meta? }], emptyText }. */
export function HomeScreen({ title = "Home", tiles = [], assigned, recent, children, className }) {
  return (
    <div className={`piq-home${className ? ` ${className}` : ""}`}>
      <PageHeader title={title} />
      {tiles.length > 0 && <div className="piq-dashboard__tiles piq-home__tiles">{tiles}</div>}
      <div className="piq-home__lists">
        {assigned && <ItemList list={assigned} />}
        {recent && <ItemList list={recent} />}
      </div>
      {children}
    </div>
  );
}

/* Search everything and go: Ctrl+K or Cmd+K (or its button) opens a modal
   dialog with focus in a combobox. Before typing it lists recent items;
   typing asks the app (onSearch(query)) and lists the results it returns
   (results: [{ label, items: [{ id, label }] }]) in labelled groups. Up and
   Down move, Enter goes to the active result (onSelect(item)), Escape closes
   and returns focus. */
export function CommandPalette({ recent = [], results = [], onSearch, onSelect, buttonLabel = "Search", placeholder = "Search records and actions", recentLabel = "Recent", emptyLabel = "No results", className }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef(null);
  const base = useId();
  const groups = query.trim() ? results : recent.length ? [{ label: recentLabel, items: recent }] : [];
  const flat = groups.flatMap((g) => g.items);

  useEffect(() => {
    const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(true); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (!open) { setQuery(""); setActive(0); } }, [open]);

  function onKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); const it = flat[active]; if (it) { setOpen(false); onSelect?.(it); } }
  }
  let n = -1;
  return (
    <div className={`piq-palette${className ? ` ${className}` : ""}`}>
      <Button variant="secondary" aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K" onClick={() => setOpen(true)}><Icon name="search" />{buttonLabel}<kbd className="piq-palette__kbd" aria-hidden="true">⌘K</kbd></Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={buttonLabel} initialFocus={input} className="piq-palette__dialog">
        <input ref={input} type="text" role="combobox" aria-label={placeholder} placeholder={placeholder} className="piq-field__input" autoComplete="off"
          aria-expanded={flat.length > 0} aria-controls={`${base}-list`} aria-autocomplete="list" aria-activedescendant={flat[active] ? `${base}-${flat[active].id}` : undefined}
          value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); onSearch?.(e.target.value); }} onKeyDown={onKey} />
        <div id={`${base}-list`} role="listbox" aria-label="Results" className="piq-palette__results">
          {groups.map((g) => (
            <div key={g.label} role="group" aria-labelledby={`${base}-${g.label}-g`} className="piq-palette__group">
              <p id={`${base}-${g.label}-g`} className="piq-palette__group-label" role="presentation">{g.label}</p>
              {g.items.map((it) => { n++; const i = n; return (
                <div key={it.id} id={`${base}-${it.id}`} role="option" aria-selected={i === active} className={`piq-menu__item${i === active ? " is-hover" : ""}`}
                  onMouseDown={(e) => e.preventDefault()} onClick={() => { setOpen(false); onSelect?.(it); }}>{it.label}</div>
              ); })}
            </div>
          ))}
        </div>
        {query.trim() && !flat.length && <p role="status" className="piq-workspace__empty">{emptyLabel}</p>}
      </Dialog>
    </div>
  );
}

/* Right-click shortcuts for an element: a menu at the pointer on right-click,
   or beside the element on Shift+F10 or the ContextMenu key; the WAI-ARIA
   Menu pattern (arrows, Enter, Escape returns focus). Its items must also be
   in a visible menu (a MenuButton) so nothing depends on right-clicking:
   pass the same items to both. children is the one element. */
export function ContextMenu({ items = [], label = "Actions", children }) {
  const [at, setAt] = useState(null); // { x, y } in the viewport
  const [active, setActive] = useState(0);
  const menu = useRef(null), owner = useRef(null);
  useEffect(() => { if (at) menu.current?.querySelectorAll('[role="menuitem"]')[active]?.focus(); }, [at, active]);
  useEffect(() => {
    if (!at) return undefined;
    const outside = (e) => { if (!menu.current?.contains(e.target)) setAt(null); };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [at]);
  const openAt = (x, y) => { setActive(0); setAt({ x, y }); };
  const close = () => { setAt(null); owner.current?.focus(); };
  const child = cloneElement(children, {
    ref: owner,
    "aria-haspopup": "menu",
    onContextMenu: (e) => { e.preventDefault(); owner.current = e.currentTarget; openAt(e.clientX, e.clientY); },
    onKeyDown: (e) => {
      children.props.onKeyDown?.(e);
      if ((e.shiftKey && e.key === "F10") || e.key === "ContextMenu") {
        e.preventDefault(); owner.current = e.currentTarget;
        const r = e.currentTarget.getBoundingClientRect();
        openAt(r.left, r.bottom);
      }
    },
  });
  function onKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % items.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + items.length) % items.length); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(items.length - 1); }
    else if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); close(); }
  }
  return (
    <>
      {child}
      {at && (
        <ul ref={menu} role="menu" aria-label={label} className="piq-menu piq-context-menu" style={{ insetInlineStart: `${at.x}px`, insetBlockStart: `${at.y}px` }} onKeyDown={onKey}>
          {items.map((it, i) => (
            <li key={i} role="none">
              <button type="button" role="menuitem" tabIndex={-1} className={`piq-menu__item${i === active ? " is-hover" : ""}`} onClick={() => { close(); it.onSelect?.(); }}>{it.label}</button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
