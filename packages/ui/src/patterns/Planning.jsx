import { useId, useRef, useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { MenuButton } from "../widgets/MenuButton.jsx";
import { Tabs } from "../widgets/Tabs.jsx";
import { Icon } from "../icons/Icon.jsx";
import { ConfirmDialog } from "./Forms.jsx";
import { sizeAtLeast, useSizeClass } from "./Regions.jsx";

/* Records grouped by status in columns, each headed with its count. A card
   moves by dragging it to a column or by its "Move to" menu, so dragging is
   never the only way (WCAG 2.5.7). Below the medium size class one column
   shows at a time, with tabs to switch. columns: [{ id, title }]; cards:
   [{ id, title, status, content? }]; onMove(card, status). */
export function Board({ label, columns = [], cards = [], onMove, moveLabel = "Move to", className }) {
  const root = useRef(null);
  const size = useSizeClass(root);
  const [dragging, setDragging] = useState(null);
  const of = (id) => cards.filter((c) => c.status === id);
  const heading = (col) => `${col.title} (${of(col.id).length})`;

  const card = (c) => (
    <li key={c.id} className="piq-board__card" draggable onDragStart={(e) => { setDragging(c.id); e.dataTransfer?.setData("text/plain", c.id); }} onDragEnd={() => setDragging(null)}>
      <p className="piq-board__card-title">{c.title}</p>
      {c.content}
      <MenuButton label={moveLabel} size="sm" variant="text" buttonLabel={`${moveLabel}: ${c.title}`}
        items={columns.filter((x) => x.id !== c.status).map((x) => ({ label: x.title, onSelect: () => onMove?.(c, x.id) }))} />
    </li>
  );
  const column = (col, withHeading = true) => (
    <section key={col.id} className="piq-board__column" aria-label={heading(col)}
      onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer?.getData("text/plain") || dragging; const c = cards.find((x) => x.id === id); if (c && c.status !== col.id) onMove?.(c, col.id); setDragging(null); }}>
      {withHeading && <h3 className="piq-board__heading">{heading(col)}</h3>}
      <ul className="piq-board__cards">{of(col.id).map(card)}</ul>
    </section>
  );

  return (
    <div ref={root} className={`piq-board${className ? ` ${className}` : ""}`} role="region" aria-label={label} data-size={size}>
      {sizeAtLeast(size, "medium")
        ? <div className="piq-board__columns">{columns.map((c) => column(c))}</div>
        : <Tabs label={label} tabs={columns.map((c) => ({ id: c.id, label: c.title, count: of(c.id).length, panel: column(c, false) }))} />}
    </div>
  );
}

const day = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const same = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* Events in time: month, week and day views from a view switch. The month
   is a grid of days that the arrow keys move through (WAI-ARIA Grid); every
   event is named in text with its time. Below the medium size class it is
   an agenda list grouped by date. events: [{ id, title, start }] (start a
   date or ISO string); date is the day in view; view and onViewChange
   (month, week or day). */
export function Calendar({ label = "Calendar", events = [], date = new Date(), view: viewProp, onViewChange, locale, className }) {
  const root = useRef(null), grid = useRef(null);
  const size = useSizeClass(root);
  const [ownView, setOwnView] = useState("month");
  const view = viewProp ?? ownView;
  const anchor = day(new Date(date));
  const [focus, setFocus] = useState(anchor);
  const base = useId();
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });
  const longDay = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" });
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const evs = events.map((e) => ({ ...e, at: new Date(e.start) })).sort((a, b) => a.at - b.at);
  const on = (d) => evs.filter((e) => same(e.at, d));
  const item = (e) => <li key={e.id} className="piq-calendar__event"><time dateTime={e.at.toISOString()}>{time.format(e.at)}</time> {e.title}</li>;
  const setView = (v) => { if (viewProp === undefined) setOwnView(v); onViewChange?.(v); };

  if (!sizeAtLeast(size, "medium")) {
    const dates = [...new Set(evs.map((e) => iso(e.at)))];
    return (
      <section ref={root} className={`piq-calendar piq-calendar--agenda${className ? ` ${className}` : ""}`} aria-label={label} data-size={size}>
        {dates.map((d) => { const dt = new Date(`${d}T00:00`); return (
          <div key={d} className="piq-calendar__agenda-day"><h3 className="piq-calendar__date">{longDay.format(dt)}</h3><ul className="piq-calendar__events">{on(dt).map(item)}</ul></div>
        ); })}
      </section>
    );
  }

  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = addDays(first, -((first.getDay() + 6) % 7)); // weeks start on Monday
  const weeks = Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  const focusDay = (d) => { setFocus(d); requestAnimationFrame(() => grid.current?.querySelector(`[data-date="${iso(d)}"]`)?.focus()); };
  function onKey(e) {
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 }[e.key];
    if (step) { e.preventDefault(); focusDay(addDays(focus, step)); }
    else if (e.key === "Home") { e.preventDefault(); focusDay(addDays(focus, -((focus.getDay() + 6) % 7))); }
    else if (e.key === "End") { e.preventDefault(); focusDay(addDays(focus, 6 - ((focus.getDay() + 6) % 7))); }
  }
  const weekStart = addDays(anchor, -((anchor.getDay() + 6) % 7));
  return (
    <section ref={root} className={`piq-calendar${className ? ` ${className}` : ""}`} aria-label={label} data-size={size}>
      <div className="piq-calendar__views" role="radiogroup" aria-label="View">
        {["month", "week", "day"].map((v) => <button key={v} type="button" role="radio" aria-checked={view === v} className="piq-calendar__view" onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}
      </div>
      {view === "month" && (
        <table ref={grid} role="grid" aria-label={new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(anchor)} className="piq-calendar__month" onKeyDown={onKey}>
          <thead><tr>{weeks[0].map((d) => <th key={iso(d)} scope="col">{weekday.format(d)}</th>)}</tr></thead>
          <tbody>
            {weeks.map((w, i) => (
              <tr key={i}>{w.map((d) => (
                <td key={iso(d)} role="gridcell" data-date={iso(d)} tabIndex={same(d, focus) ? 0 : -1} aria-label={longDay.format(d)} data-outside={d.getMonth() !== anchor.getMonth() || undefined}
                  className="piq-calendar__day" onFocus={() => setFocus(d)}>
                  <span className="piq-calendar__number" aria-hidden="true">{d.getDate()}</span>
                  <ul className="piq-calendar__events">{on(d).map(item)}</ul>
                </td>
              ))}</tr>
            ))}
          </tbody>
        </table>
      )}
      {view === "week" && (
        <ol className="piq-calendar__week" aria-label={`Week of ${longDay.format(weekStart)}`}>
          {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((d) => <li key={iso(d)} className="piq-calendar__week-day"><h3 className="piq-calendar__date">{longDay.format(d)}</h3><ul className="piq-calendar__events">{on(d).map(item)}</ul></li>)}
        </ol>
      )}
      {view === "day" && (
        <div className="piq-calendar__single" id={`${base}-day`}><h3 className="piq-calendar__date">{longDay.format(anchor)}</h3><ul className="piq-calendar__events">{on(anchor).map(item)}</ul></div>
      )}
    </section>
  );
}

const sizeText = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`);

/* A record's files: upload by a button, or by dropping a file as an extra
   (WCAG 2.5.7); each file with its name (a link to it), type, size and
   version; removing one is confirmed. files: [{ id, name, href, type, size,
   version }]; onUpload(file); onRemove(file). */
export function Attachments({ label = "Attachments", files = [], onUpload, onRemove, accept, uploadLabel = "Upload a file", className }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const [removing, setRemoving] = useState(null);
  return (
    <section className={`piq-attachments${className ? ` ${className}` : ""}`} aria-label={label}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer?.files?.[0]; if (f) onUpload?.(f); }} data-over={over || undefined}>
      <div className="piq-attachments__bar">
        <input ref={input} type="file" accept={accept} className="piq-visually-hidden" tabIndex={-1} aria-hidden="true" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload?.(f); e.target.value = ""; }} />
        <Button variant="secondary" onClick={() => input.current?.click()}><Icon name="upload" />{uploadLabel}</Button>
        <span className="piq-attachments__hint">or drop a file here</span>
      </div>
      <div className="piq-table-wrap">
        <table className="piq-table piq-attachments__list">
          <caption className="piq-visually-hidden">{label}</caption>
          <thead><tr><th scope="col">Name</th><th scope="col">Type</th><th scope="col" className="piq-num">Size</th><th scope="col">Version</th><th scope="col"><span className="piq-visually-hidden">Actions</span></th></tr></thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.id}>
                <td><a href={f.href}>{f.name}</a></td><td>{f.type}</td><td className="piq-num">{sizeText(f.size ?? 0)}</td><td>{f.version}</td>
                <td><Button variant="text" size="sm" aria-label={`Remove ${f.name}`} onClick={() => setRemoving(f)}><Icon name="delete" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog open={!!removing} objectName={removing?.name} title={removing ? `Remove ${removing.name}?` : ""} confirmLabel="Remove"
        consequence="The file is removed from this record for everyone." onCancel={() => setRemoving(null)} onConfirm={() => { onRemove?.(removing); setRemoving(null); }} />
    </section>
  );
}
