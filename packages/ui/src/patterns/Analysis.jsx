import { Fragment, useEffect, useId, useRef, useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { Checkbox, RadioGroup } from "../widgets/Choice.jsx";
import { Dialog } from "../widgets/Dialog.jsx";
import { TextField } from "../widgets/Field.jsx";
import { Icon } from "../icons/Icon.jsx";
import { ConfirmDialog } from "./Forms.jsx";

/* The path of a drill-down kept in the page's URL (param), one history
   entry per level, so a link opens the same level and Back returns to the
   one before. Returns { path, drill(id), goTo(index) }; path is the list of
   level ids. */
export function useDrillPath({ param = "drill" } = {}) {
  const read = () => { const v = new URLSearchParams(window.location.search).get(param); return v ? v.split("/") : []; };
  const [path, setPath] = useState(read);
  useEffect(() => { const on = () => setPath(read()); window.addEventListener("popstate", on); return () => window.removeEventListener("popstate", on); }, [param]);
  const write = (next) => {
    const p = new URLSearchParams(window.location.search);
    if (next.length) p.set(param, next.join("/")); else p.delete(param);
    window.history.pushState({ [param]: next }, "", `${window.location.pathname}${p.toString() ? `?${p}` : ""}${window.location.hash}`);
    setPath(next);
  };
  return { path, drill: (id) => write([...path, id]), goTo: (i) => write(path.slice(0, i)) };
}

/* A drill-down's trail: the summary, then each applied level, the current
   one marked; choosing an earlier one goes back to it. trail: [{ label }]
   from the summary to the current level; onSelect(index). */
export function DrillDown({ trail = [], onSelect, label = "Drill-down", children, className }) {
  return (
    <section className={`piq-drill${className ? ` ${className}` : ""}`} aria-label={label}>
      <nav aria-label="Levels" className="piq-breadcrumbs">
        <ol className="piq-breadcrumbs__list piq-drill__trail">
          {trail.map((t, i) => (
            <li key={i} className="piq-breadcrumbs__item">
              {i === trail.length - 1 ? <span aria-current="location">{t.label}</span> : <a href="#" onClick={(e) => { e.preventDefault(); onSelect?.(i); }}>{t.label}</a>}
            </li>
          ))}
        </ol>
      </nav>
      {children}
    </section>
  );
}

/* A figure now against before (or a target): both values, the difference
   with its sign, and the direction in words ("down 8% on last quarter"), so
   it never depends on colour (WCAG 1.4.1). format(n) writes a value. */
export function PeriodComparison({ label, current, previous, comparison = "on the previous period", format = (n) => String(n), currentLabel = "This period", previousLabel = "Previous", className }) {
  const diff = current - previous;
  const pct = previous ? Math.round((Math.abs(diff) / Math.abs(previous)) * 100) : null;
  const words = diff === 0 ? `no change ${comparison}` : `${diff > 0 ? "up" : "down"}${pct != null ? ` ${pct}%` : ""} ${comparison}`;
  return (
    <section className={`piq-comparison${className ? ` ${className}` : ""}`} aria-label={label}>
      <p className="piq-comparison__label">{label}</p>
      <dl className="piq-comparison__values">
        <div><dt>{currentLabel}</dt><dd className="piq-comparison__current">{format(current)}</dd></div>
        <div><dt>{previousLabel}</dt><dd>{format(previous)}</dd></div>
        <div><dt>Difference</dt><dd className="piq-comparison__diff">{`${diff > 0 ? "+" : diff < 0 ? "−" : "±"}${format(Math.abs(diff))}`}</dd></div>
      </dl>
      <p className="piq-comparison__words" data-direction={diff > 0 ? "up" : diff < 0 ? "down" : "flat"}><Icon name="arrow-right" className="piq-comparison__arrow" />{words}</p>
    </section>
  );
}

/* A report laid out for paper: a header with the title, the logo and the
   run date on the first page; each section from a new page; table headers
   repeat; navigation and actions are left out. While printing, the theme is
   switched to its light appearance and back afterwards. sections: [{ id,
   title, content }]. */
export function PrintLayout({ title, logo, runDate, locale, sections = [], children, className }) {
  const root = useRef(null);
  useEffect(() => {
    let host = null, before = null;
    const toLight = () => { host = root.current?.closest("[data-theme]") ?? document.documentElement; before = host.getAttribute("data-appearance"); host.setAttribute("data-appearance", "light"); };
    const back = () => { if (!host) return; if (before == null) host.removeAttribute("data-appearance"); else host.setAttribute("data-appearance", before); host = null; };
    window.addEventListener("beforeprint", toLight);
    window.addEventListener("afterprint", back);
    return () => { window.removeEventListener("beforeprint", toLight); window.removeEventListener("afterprint", back); };
  }, []);
  const when = runDate ? new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short" }).format(new Date(runDate)) : null;
  return (
    <article ref={root} className={`piq-print${className ? ` ${className}` : ""}`}>
      <header className="piq-print__header">
        {logo && <div className="piq-print__logo">{logo}</div>}
        <h1 className="piq-print__title">{title}</h1>
        {when && <p className="piq-print__date">Run <time dateTime={new Date(runDate).toISOString()}>{when}</time></p>}
      </header>
      {sections.map((s) => <section key={s.id} className="piq-print__section" aria-label={s.title}><h2 className="piq-print__section-title">{s.title}</h2>{s.content}</section>)}
      {children}
    </article>
  );
}

/* Rows by columns with subtotals and a grand total, the row groups opening
   and closing: the WAI-ARIA Treegrid pattern. Right opens a group (or moves
   into it), Left closes it (or moves to its group), Up and Down move between
   visible rows. groups: [{ id, label, rows: [{ id, label }] }]; columns:
   [{ key, label }]; value(rowId, key) gives a cell's number. */
export function PivotTable({ label, groups = [], columns = [], value = () => 0, format = (n) => String(n), totalLabel = "Total", className }) {
  const [open, setOpen] = useState({});
  const [focus, setFocus] = useState(groups[0]?.id);
  const body = useRef(null);
  const sum = (ids, k) => ids.reduce((t, id) => t + (Number(value(id, k)) || 0), 0);
  const visible = groups.flatMap((g) => [{ id: g.id, group: g }, ...(open[g.id] ? g.rows.map((r) => ({ id: r.id, row: r, parent: g.id })) : [])]);
  const focusRow = (id) => { setFocus(id); requestAnimationFrame(() => body.current?.querySelector(`[data-row="${id}"]`)?.focus()); };
  function onKey(e) {
    const i = visible.findIndex((v) => v.id === focus);
    const v = visible[i];
    if (!v) return;
    if (e.key === "ArrowDown" && i < visible.length - 1) { e.preventDefault(); focusRow(visible[i + 1].id); }
    else if (e.key === "ArrowUp" && i > 0) { e.preventDefault(); focusRow(visible[i - 1].id); }
    else if (e.key === "ArrowRight" && v.group) { e.preventDefault(); if (!open[v.id]) setOpen({ ...open, [v.id]: true }); else if (v.group.rows[0]) focusRow(v.group.rows[0].id); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); if (v.group && open[v.id]) setOpen({ ...open, [v.id]: false }); else if (v.parent) focusRow(v.parent); }
  }
  const all = groups.flatMap((g) => g.rows.map((r) => r.id));
  return (
    <div className="piq-table-wrap">
      <table role="treegrid" aria-label={label} className={`piq-table piq-pivot${className ? ` ${className}` : ""}`}>
        <thead><tr><th scope="col"><span className="piq-visually-hidden">Row</span></th>{columns.map((c) => <th key={c.key} scope="col" className="piq-num">{c.label}</th>)}<th scope="col" className="piq-num">{totalLabel}</th></tr></thead>
        <tbody ref={body} onKeyDown={onKey}>
          {groups.map((g) => {
            const ids = g.rows.map((r) => r.id);
            return (
              <Fragment key={g.id}>
                <tr data-row={g.id} aria-level={1} aria-expanded={!!open[g.id]} tabIndex={focus === g.id ? 0 : -1} className="piq-pivot__group" onFocus={() => setFocus(g.id)} onClick={() => setOpen({ ...open, [g.id]: !open[g.id] })}>
                  <th scope="row" role="rowheader"><Icon name={open[g.id] ? "chevron-down" : "chevron-right"} className="piq-pivot__toggle" />{g.label} <span className="piq-pivot__subtotal">subtotal</span></th>
                  {columns.map((c) => <td key={c.key} role="gridcell" className="piq-num">{format(sum(ids, c.key))}</td>)}
                  <td role="gridcell" className="piq-num">{format(columns.reduce((t, c) => t + sum(ids, c.key), 0))}</td>
                </tr>
                {open[g.id] && g.rows.map((r) => (
                  <tr key={r.id} data-row={r.id} aria-level={2} tabIndex={focus === r.id ? 0 : -1} className="piq-pivot__row" onFocus={() => setFocus(r.id)}>
                    <th scope="row" role="rowheader" className="piq-pivot__child">{r.label}</th>
                    {columns.map((c) => <td key={c.key} role="gridcell" className="piq-num">{format(Number(value(r.id, c.key)) || 0)}</td>)}
                    <td role="gridcell" className="piq-num">{format(columns.reduce((t, c) => t + (Number(value(r.id, c.key)) || 0), 0))}</td>
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot><tr className="piq-pivot__total"><th scope="row">{totalLabel}</th>{columns.map((c) => <td key={c.key} className="piq-num">{format(sum(all, c.key))}</td>)}<td className="piq-num">{format(columns.reduce((t, c) => t + sum(all, c.key), 0))}</td></tr></tfoot>
      </table>
    </div>
  );
}

/* Making a report: choose measures and groupings, see a preview table as
   you choose (groupings as rows, measures as columns), and save it with a
   name. measures and groupings: [{ value, label }]; preview(choice) returns
   the preview's rows; onSave({ name, measures, groupings }). */
export function ReportBuilder({ measures = [], groupings = [], preview = () => [], onSave, saveLabel = "Save report", className }) {
  const [m, setM] = useState([]);
  const [g, setG] = useState([]);
  const [name, setName] = useState("");
  const [tried, setTried] = useState(false);
  const toggle = (set, v, on) => set((x) => (on ? [...x, v] : x.filter((y) => y !== v)));
  const cols = [...groupings.filter((x) => g.includes(x.value)), ...measures.filter((x) => m.includes(x.value))];
  const rows = cols.length ? preview({ measures: m, groupings: g }) : [];
  const save = (e) => { e.preventDefault(); setTried(true); if (!name.trim()) return; onSave?.({ name: name.trim(), measures: m, groupings: g }); };
  return (
    <form className={`piq-report-builder${className ? ` ${className}` : ""}`} noValidate onSubmit={save}>
      <div className="piq-report-builder__choices">
        <fieldset className="piq-export__fields"><legend className="piq-field__label">Measures</legend>{measures.map((x) => <Checkbox key={x.value} label={x.label} checked={m.includes(x.value)} onChange={(e) => toggle(setM, x.value, e.target.checked)} />)}</fieldset>
        <fieldset className="piq-export__fields"><legend className="piq-field__label">Group by</legend>{groupings.map((x) => <Checkbox key={x.value} label={x.label} checked={g.includes(x.value)} onChange={(e) => toggle(setG, x.value, e.target.checked)} />)}</fieldset>
      </div>
      <div className="piq-table-wrap" aria-live="polite">
        <table className="piq-table piq-report-builder__preview"><caption className="piq-visually-hidden">Preview</caption>
          <thead><tr>{cols.map((c) => <th key={c.value} scope="col">{c.label}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{cols.map((c) => <td key={c.value}>{r[c.value]}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <TextField label="Report name" required aria-required="true" value={name} onChange={(e) => setName(e.target.value)} error={tried && !name.trim() ? "Enter a name for the report" : undefined} />
      <div className="piq-wizard__actions"><Button type="submit">{saveLabel}</Button></div>
    </form>
  );
}

/* A report's scheduled deliveries and alerts: each with its frequency or
   threshold and its recipients; add one, pause one ("Paused" in text), or
   delete one after confirmation. items: [{ id, kind: delivery or alert,
   name, frequency?, threshold?, recipients: [], paused? }]; onAdd(item),
   onPause(item), onDelete(item). */
export function Subscriptions({ items = [], onAdd, onPause, onDelete, title = "Subscriptions", className }) {
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [draft, setDraft] = useState({ kind: "delivery", name: "", frequency: "Weekly", threshold: "", recipients: "" });
  const base = useId();
  const add = (e) => {
    e.preventDefault();
    const { kind, name, frequency, threshold, recipients } = draft;
    onAdd?.({ kind, name, ...(kind === "delivery" ? { frequency } : { threshold }), recipients: recipients.split(",").map((r) => r.trim()).filter(Boolean) });
    setAdding(false);
  };
  return (
    <section className={`piq-subscriptions${className ? ` ${className}` : ""}`} aria-labelledby={`${base}-h`}>
      <div className="piq-subscriptions__head"><h2 id={`${base}-h`} className="piq-import__title">{title}</h2><Button variant="secondary" onClick={() => setAdding(true)}><Icon name="add" />Add</Button></div>
      <ul className="piq-subscriptions__list">
        {items.map((s) => (
          <li key={s.id} className="piq-subscriptions__item">
            <div className="piq-subscriptions__text">
              <p className="piq-subscriptions__name">{s.name}{s.paused && <strong className="piq-subscriptions__paused"> Paused</strong>}</p>
              <p className="piq-subscriptions__detail">{s.kind === "alert" ? `Alert when ${s.threshold}` : s.frequency} · {`To ${s.recipients.join(", ")}`}</p>
            </div>
            <div className="piq-subscriptions__actions">
              {!s.paused && <Button variant="text" size="sm" onClick={() => onPause?.(s)} aria-label={`Pause ${s.name}`}>Pause</Button>}
              <Button variant="text" size="sm" onClick={() => setDeleting(s)} aria-label={`Delete ${s.name}`}><Icon name="delete" /></Button>
            </div>
          </li>
        ))}
      </ul>
      <Dialog open={adding} onClose={() => setAdding(false)} title="Add a subscription">
        <form className="piq-quick-edit" onSubmit={add}>
          <RadioGroup label="Kind" name={`${base}-kind`} value={draft.kind} onChange={(v) => setDraft({ ...draft, kind: v })} options={[{ value: "delivery", label: "Scheduled delivery" }, { value: "alert", label: "Alert" }]} />
          <TextField label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          {draft.kind === "delivery"
            ? <TextField label="Frequency" value={draft.frequency} onChange={(e) => setDraft({ ...draft, frequency: e.target.value })} />
            : <TextField label="Threshold" value={draft.threshold} onChange={(e) => setDraft({ ...draft, threshold: e.target.value })} />}
          <TextField label="Recipients" hint="Email addresses, separated by commas" value={draft.recipients} onChange={(e) => setDraft({ ...draft, recipients: e.target.value })} />
          <div className="piq-quick-edit__actions"><Button type="submit">Add</Button><Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button></div>
        </form>
      </Dialog>
      <ConfirmDialog open={!!deleting} objectName={deleting?.name} consequence="Its recipients stop receiving it." onCancel={() => setDeleting(null)} onConfirm={() => { onDelete?.(deleting); setDeleting(null); }} />
    </section>
  );
}
