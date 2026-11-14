import { useEffect, useId, useRef, useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { MenuButton } from "../widgets/MenuButton.jsx";
import { Sheet } from "../widgets/Sheet.jsx";
import { Icon } from "../icons/Icon.jsx";

const isCurrent = (item, current) => item.current === true || (current !== undefined && item.id === current);
const holdsCurrent = (item, current) => isCurrent(item, current) || (item.items ?? []).some((c) => holdsCurrent(c, current));

function NavGroup({ item, current, onNavigate }) {
  const [open, setOpen] = useState(() => holdsCurrent(item, current));
  const id = useId();
  return (
    <li className="piq-primary-nav__item">
      <button type="button" className="piq-primary-nav__link piq-primary-nav__group" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        {item.icon && <Icon name={item.icon} />}
        <span className="piq-primary-nav__label">{item.label}</span>
        <Icon name={open ? "chevron-up" : "chevron-down"} className="piq-primary-nav__chevron" />
      </button>
      <ul id={id} className="piq-primary-nav__list piq-primary-nav__sublist" hidden={!open}>
        {item.items.map((c) => <NavItem key={c.id ?? c.label} item={c} current={current} onNavigate={onNavigate} />)}
      </ul>
    </li>
  );
}

function NavItem({ item, current, onNavigate }) {
  if (item.items?.length) return <NavGroup item={item} current={current} onNavigate={onNavigate} />;
  const on = isCurrent(item, current);
  return (
    <li className="piq-primary-nav__item">
      <a href={item.href} className="piq-primary-nav__link" aria-current={on ? "page" : undefined}
        onClick={(e) => { if (onNavigate) { e.preventDefault(); onNavigate(item, e); } }}>
        {item.icon && <Icon name={item.icon} />}
        <span className="piq-primary-nav__label">{item.label}</span>
      </a>
    </li>
  );
}

/* An app's main navigation: destinations as links in a labelled navigation
   landmark, the current one marked (aria-current="page") and shown by the
   design system's active state. A destination with items is a group that
   opens and closes by a disclosure button, open while it holds the current
   page. items: [{ id, label, href, icon?, items? }]; current is the id of the
   current destination. onNavigate(item, event), if given, replaces following
   the link, for an app's own router. */
export function PrimaryNav({ items = [], current, label = "Main", onNavigate, className, ...rest }) {
  return (
    <nav aria-label={label} className={`piq-primary-nav${className ? ` ${className}` : ""}`} {...rest}>
      <ul className="piq-primary-nav__list">
        {items.map((it) => <NavItem key={it.id ?? it.label} item={it} current={current} onNavigate={onNavigate} />)}
      </ul>
    </nav>
  );
}

/* The workspace or tenant switcher in an app's top bar. Up to seven
   workspaces it is a menu; from eight (searchAt) its popup has a search that
   narrows the list, as a combobox: type to filter, Up and Down to move,
   Enter to switch, Escape to close and return to the button.
   workspaces: [{ id, label }]. */
export function WorkspaceSwitcher({ workspaces = [], current, onSwitch, label = "Workspace", searchLabel = "Search workspaces", searchAt = 8, emptyLabel = "No workspace matches", className }) {
  const now = workspaces.find((w) => w.id === current) ?? workspaces[0];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const button = useRef(null), popup = useRef(null), input = useRef(null);
  const base = useId();

  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const outside = (e) => { if (!button.current?.contains(e.target) && !popup.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  if (workspaces.length < searchAt) {
    return (
      <MenuButton className={className} variant="text" label={now?.label} buttonLabel={`${label}: ${now?.label ?? ""}`}
        items={workspaces.map((w) => ({ label: w.label, checked: w.id === now?.id, onSelect: () => onSwitch?.(w.id) }))} />
    );
  }

  const shown = workspaces.filter((w) => w.label.toLowerCase().includes(query.trim().toLowerCase()));
  const close = () => { setOpen(false); setQuery(""); setActive(0); button.current?.focus(); };
  const pick = (w) => { close(); if (w.id !== now?.id) onSwitch?.(w.id); };
  function onKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, shown.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (shown[active]) pick(shown[active]); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
  }

  return (
    <div className={`piq-menubutton piq-workspace${className ? ` ${className}` : ""}`}>
      <Button ref={button} variant="text" aria-haspopup="dialog" aria-expanded={open} aria-label={`${label}: ${now?.label ?? ""}`} onClick={() => (open ? close() : setOpen(true))}>
        {now?.label}
        <Icon name="chevron-down" className="piq-menubutton__chevron" />
      </Button>
      {open && (
        <div ref={popup} role="dialog" aria-label={label} className="piq-menu piq-menubutton__menu piq-workspace__popup">
          <input ref={input} type="search" role="combobox" className="piq-field__input piq-workspace__search" aria-label={searchLabel} aria-expanded="true" aria-controls={`${base}-list`}
            aria-autocomplete="list" aria-activedescendant={shown[active] ? `${base}-${shown[active].id}` : undefined}
            value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} onKeyDown={onKey} />
          <ul id={`${base}-list`} role="listbox" aria-label={label} className="piq-workspace__list">
            {shown.map((w, i) => (
              <li key={w.id} id={`${base}-${w.id}`} role="option" aria-selected={w.id === now?.id} className={`piq-menu__item${i === active ? " is-hover" : ""}`}
                onMouseDown={(e) => e.preventDefault()} onClick={() => pick(w)}>{w.label}</li>
            ))}
          </ul>
          {!shown.length && <p className="piq-workspace__empty" role="status">{emptyLabel}</p>}
        </div>
      )}
    </div>
  );
}

/* The frame of an app: its navigation, a top bar for the brand, workspace and
   account, and the content. Navigation follows the window: from the expanded
   size class a persistent side navigation in the design system's style; at
   medium a rail; below it a bottom bar with up to five destinations (four
   and More when there are more), the rest in a drawer. The content scrolls
   between the bars, so neither ever covers what has focus.
   nav and current are PrimaryNav's items and current; brand, actions and
   breadcrumbs are slots. adapt="container" lays the shell out by the width of
   the element it is in rather than the window, for a preview or an embed
   (give that element a height).
   frame is the app frame the person chose (US-162): "side-nav" (the
   default, above), "top-nav" (the destinations across the top bar from
   medium up, the bottom bar below it), "top-bar" (the top bar with the
   brand and actions, no navigation) or "screen" (the content alone, no top
   bar or navigation, for a one-screen app). */
export function AppShell({ nav = [], current, navLabel = "Main", brand, actions, breadcrumbs, onNavigate, moreLabel = "More", skipLabel = "Skip to content", adapt = "window", frame = "side-nav", children, className }) {
  const [drawer, setDrawer] = useState(false);
  const mainId = useId();
  const side = useRef(null);
  const bar = nav.length <= 5 ? nav : [...nav.slice(0, 4), { id: "piq-more", label: moreLabel, icon: "more", more: true }];

  useEffect(() => {
    if (!drawer || adapt === "container" || typeof window.matchMedia !== "function") return undefined;
    const wide = window.matchMedia("(min-width: 600px)");
    const onWide = () => {
      if (!wide.matches) return;
      setDrawer(false);
      // After the sheet has given focus back: the current destination in the side navigation.
      requestAnimationFrame(() => side.current?.querySelector('[aria-current="page"]')?.focus());
    };
    wide.addEventListener("change", onWide);
    return () => wide.removeEventListener("change", onWide);
  }, [drawer]);

  const go = (item) => (e) => {
    if (item.more || item.items?.length) { e.preventDefault(); setDrawer(true); return; }
    if (onNavigate) { e.preventDefault(); onNavigate(item, e); }
  };
  const navigate = onNavigate ? (item, e) => { setDrawer(false); onNavigate(item, e); } : undefined;

  // What the chosen frame draws: the top bar, navigation at all, and where it sits from medium up.
  const kind = ["screen", "top-bar", "top-nav"].includes(frame) ? frame : "side-nav";
  const top = kind !== "screen", navigates = kind === "top-nav" || kind === "side-nav";
  const shell = (
    <div className={`piq-shell${className ? ` ${className}` : ""}`} data-adapt={adapt === "container" ? "container" : undefined} data-frame={kind === "side-nav" ? undefined : kind}>
      {top && <a className="piq-shell__skip" href={`#${mainId}`}>{skipLabel}</a>}
      {top && (
        <header className="piq-shell__top">
          {brand && <div className="piq-shell__brand">{brand}</div>}
          {kind === "top-nav" && <PrimaryNav className="piq-shell__topnav" items={nav} current={current} label={navLabel} onNavigate={onNavigate} />}
          {actions && <div className="piq-shell__actions">{actions}</div>}
        </header>
      )}
      {kind === "side-nav" && (
        <div ref={side} className="piq-shell__side">
          <PrimaryNav items={nav} current={current} label={navLabel} onNavigate={onNavigate} />
        </div>
      )}
      <main id={mainId} className="piq-shell__main" tabIndex={-1}>
        {breadcrumbs && <div className="piq-shell__breadcrumbs">{breadcrumbs}</div>}
        {children}
      </main>
      {navigates && <nav className="piq-shell__bar" aria-label={navLabel}>
        <ul className="piq-shell__bar-list">
          {bar.map((it) => {
            const on = !it.more && holdsCurrent(it, current);
            const inner = <>{it.icon && <Icon name={it.icon} />}<span className="piq-shell__bar-label">{it.label}</span></>;
            return (
              <li key={it.id ?? it.label}>
                {it.more || it.items?.length
                  ? <button type="button" className="piq-shell__bar-item" aria-haspopup="dialog" aria-expanded={drawer} data-current={on || undefined} onClick={go(it)}>{inner}</button>
                  : <a href={it.href} className="piq-shell__bar-item" aria-current={on ? "page" : undefined} onClick={go(it)}>{inner}</a>}
              </li>
            );
          })}
        </ul>
      </nav>}
      {navigates && (
        <Sheet open={drawer} onClose={() => setDrawer(false)} label={navLabel} side="start">
          <PrimaryNav items={nav} current={current} label={navLabel} onNavigate={navigate} />
        </Sheet>
      )}
    </div>
  );
  return adapt === "container" ? <div className="piq-shell-frame">{shell}</div> : shell;
}
