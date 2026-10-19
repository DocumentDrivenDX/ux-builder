import { useId, useRef, useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { Sheet } from "../widgets/Sheet.jsx";
import { Skeleton } from "../widgets/Loading.jsx";
import { Icon } from "../icons/Icon.jsx";
import { PageHeader, StatePanel, sizeAtLeast, useSizeClass } from "./Regions.jsx";

const DIRECTION = { up: { icon: "arrow-right", word: "up" }, down: { icon: "arrow-right", word: "down" }, flat: { icon: "arrow-right", word: "no change" } };

/* One figure that matters: its label, its value and, optionally, its change
   (change: { direction: up, down or flat, amount, comparison }), written out
   in words ("up 8% on August") so direction never depends on colour or an
   icon. */
export function StatTile({ label, value, change, words = DIRECTION, className }) {
  const d = change ? words[change.direction] ?? words.flat : null;
  return (
    <section className={`piq-stat-tile${className ? ` ${className}` : ""}`} aria-label={label}>
      <p className="piq-stat-tile__label">{label}</p>
      <p className="piq-stat-tile__value">{value}</p>
      {change && (
        <p className="piq-stat-tile__change" data-direction={change.direction}>
          <Icon name={d.icon} className="piq-stat-tile__arrow" />
          <span>{[d.word, change.direction === "flat" ? null : change.amount, change.comparison].filter(Boolean).join(" ")}</span>
        </p>
      )}
    </section>
  );
}

/* The frame around a chart the app draws: a title, a legend in text, the
   chart, and a data table with the same values behind a button, for keyboard
   and screen-reader users and anyone who wants the numbers. status is ready,
   loading, empty or error, shown in the chart's own space; error offers
   retry. table: { columns: [{ key, label, numeric? }], rows }. legend:
   [{ label, marker? }], where marker is the series' swatch from the chart. */
export function ChartFrame({ title, description, legend = [], table, status = "ready", onRetry, showTableLabel = "Show data table", hideTableLabel = "Hide data table", emptyTitle = "No data for this period", actions, children, className }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  let body = children;
  if (status === "loading") body = <div className="piq-chart-frame__state" aria-busy="true"><Skeleton variant="rect" height="100%" /></div>;
  else if (status === "empty") body = <div className="piq-chart-frame__state"><StatePanel kind="empty" title={emptyTitle}><p>Try a different date range or filters.</p></StatePanel></div>;
  else if (status === "error") body = <div className="piq-chart-frame__state"><StatePanel kind="error" onRetry={onRetry} /></div>;
  return (
    <figure className={`piq-chart-frame${className ? ` ${className}` : ""}`} aria-labelledby={`${id}-title`} data-status={status}>
      <div className="piq-chart-frame__head">
        <figcaption id={`${id}-title`} className="piq-chart-frame__title">{title}</figcaption>
        {actions && <div className="piq-chart-frame__actions">{actions}</div>}
      </div>
      {description && <p className="piq-chart-frame__description">{description}</p>}
      <div className="piq-chart-frame__chart">{body}</div>
      {status === "ready" && legend.length > 0 && (
        <ul className="piq-chart-frame__legend" aria-label="Legend">
          {legend.map((l, i) => <li key={i} className="piq-chart-frame__legend-item">{l.marker}<span>{l.label}</span></li>)}
        </ul>
      )}
      {status === "ready" && table && (
        <div className="piq-chart-frame__data">
          <Button variant="text" size="sm" aria-expanded={open} aria-controls={`${id}-table`} onClick={() => setOpen((o) => !o)}>{open ? hideTableLabel : showTableLabel}</Button>
          <div id={`${id}-table`} hidden={!open} className="piq-table-wrap">
            <table className="piq-table">
              <caption className="piq-visually-hidden">{title}</caption>
              <thead><tr>{table.columns.map((c) => <th key={c.key} scope="col" className={c.numeric ? "piq-num" : undefined}>{c.label}</th>)}</tr></thead>
              <tbody>{table.rows.map((r, i) => <tr key={i}>{table.columns.map((c) => <td key={c.key} className={c.numeric ? "piq-num" : undefined}>{r[c.key]}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      )}
    </figure>
  );
}

const when = (t, locale) => (t ? new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(t instanceof Date ? t : new Date(t)) : null);

/* A dashboard: page-wide filters, the date range and when the data was last
   refreshed, above a grid of number tiles (two across at compact size, four
   from expanded) and a grid of charts (one, then two across). filters and
   dateRange are slots; tiles and charts are lists of elements. */
export function Dashboard({ title, breadcrumbs, actions, filters, dateRange, refreshedAt, refreshedLabel = "Last refreshed", locale, tiles = [], charts = [], children, className }) {
  const at = when(refreshedAt, locale);
  return (
    <div className={`piq-dashboard${className ? ` ${className}` : ""}`}>
      <PageHeader title={title} breadcrumbs={breadcrumbs} actions={actions} />
      {(filters || dateRange || at) && (
        <div className="piq-dashboard__toolbar">
          {filters}
          {dateRange}
          {at && <p className="piq-dashboard__refreshed">{refreshedLabel} <time dateTime={new Date(refreshedAt).toISOString()}>{at}</time></p>}
        </div>
      )}
      {tiles.length > 0 && <div className="piq-dashboard__tiles">{tiles}</div>}
      {charts.length > 0 && <div className="piq-dashboard__charts">{charts}</div>}
      {children}
    </div>
  );
}

/* A report: its parameters, a Run action, and the results with a summary of
   the parameters they were run with above them at every size. Parameters sit
   in a side panel from the expanded size class, in a panel that opens and
   closes at medium, and in a sheet at compact. Export and Print are always
   offered; the printed page carries only the report. applied: [{ label,
   value }]. */
export function ReportViewer({ title, breadcrumbs, parameters, onRun, runLabel = "Run report", parametersLabel = "Parameters", applied = [], appliedLabel = "Run with", results, status = "ready", onRetry, onExport, exportLabel = "Export", onPrint, printLabel = "Print", className }) {
  const root = useRef(null);
  const size = useSizeClass(root);
  const [open, setOpen] = useState(false);
  const id = useId();
  const mode = sizeAtLeast(size, "expanded") ? "side" : sizeAtLeast(size, "medium") ? "collapsible" : "sheet";
  const form = (
    <form className="piq-report__form" onSubmit={(e) => { e.preventDefault(); setOpen(false); onRun?.(); }}>
      {parameters}
      <Button type="submit">{runLabel}</Button>
    </form>
  );
  const print = () => (onPrint ? onPrint() : window.print());
  return (
    <div ref={root} className={`piq-report${className ? ` ${className}` : ""}`} data-mode={mode}>
      <PageHeader title={title} breadcrumbs={breadcrumbs}
        actions={<div className="piq-report__actions">
          {mode !== "side" && <Button variant="secondary" aria-expanded={open} aria-controls={mode === "collapsible" ? `${id}-params` : undefined} onClick={() => setOpen((o) => !o)}><Icon name="filter" />{parametersLabel}</Button>}
          {onExport && <Button variant="secondary" onClick={onExport}><Icon name="download" />{exportLabel}</Button>}
          <Button variant="secondary" onClick={print}>{printLabel}</Button>
        </div>} />
      <div className="piq-report__body">
        {mode === "side" && <aside className="piq-report__params" aria-label={parametersLabel}>{form}</aside>}
        {mode === "collapsible" && <section id={`${id}-params`} className="piq-report__params" aria-label={parametersLabel} hidden={!open}>{form}</section>}
        {mode === "sheet" && <Sheet open={open} onClose={() => setOpen(false)} title={parametersLabel} side="full">{form}</Sheet>}
        <div className="piq-report__results">
          {applied.length > 0 && (
            <dl className="piq-report__applied" aria-label={appliedLabel}>
              {applied.map((a, i) => <div key={i} className="piq-chip"><dt>{a.label}:</dt><dd>{a.value}</dd></div>)}
            </dl>
          )}
          {status === "ready" ? results : status === "loading" ? <div aria-busy="true"><Skeleton lines={8} /></div> : <StatePanel kind={status} onRetry={onRetry} />}
        </div>
      </div>
    </div>
  );
}
