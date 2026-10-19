import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { Skeleton } from "../widgets/Loading.jsx";
import { Tabs } from "../widgets/Tabs.jsx";
import { Icon } from "../icons/Icon.jsx";
import { SplitView } from "./Layout.jsx";
import { PageHeader, StatePanel, sizeAtLeast, useSizeClass } from "./Regions.jsx";

/* A record's fields as label and value pairs, read only: two columns where it
   has room (from the medium size class), one where it has not. An item with
   wide spans both columns. items: [{ label, value, wide? }]. */
export function DescriptionList({ items = [], className, ...rest }) {
  return (
    <div className={`piq-description-list${className ? ` ${className}` : ""}`} {...rest}>
      <dl className="piq-description-list__grid">
        {items.map((it, i) => (
          <div key={it.key ?? i} className="piq-description-list__item" data-wide={it.wide || undefined}>
            <dt className="piq-description-list__label">{it.label}</dt>
            <dd className="piq-description-list__value">{it.value ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const KIND = { comment: { icon: "edit", label: "Comment" }, change: { icon: "refresh", label: "Change" }, system: { icon: "info", label: "System" } };
const stamp = (t) => (t instanceof Date ? t : new Date(t));

/* What has happened to a record, in time order (newest first unless order
   is oldest): who, what and when, each kind of event (comment, change or
   system) named in text and marked with its own icon, so colour is never the
   only signal. events: [{ id, kind, actor, action, time, body? }]. */
export function Timeline({ events = [], label = "Activity", order = "newest", kindLabels = {}, locale, className }) {
  const sorted = [...events].sort((a, b) => (order === "oldest" ? 1 : -1) * (stamp(a.time) - stamp(b.time)));
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  return (
    <section className={`piq-timeline${className ? ` ${className}` : ""}`} aria-label={label}>
      <ol className="piq-timeline__list">
        {sorted.map((e, i) => {
          const k = KIND[e.kind] ?? KIND.system;
          const when = stamp(e.time);
          return (
            <li key={e.id ?? i} className="piq-timeline__event" data-kind={e.kind}>
              <Icon name={k.icon} className="piq-timeline__mark" />
              <div className="piq-timeline__content">
                <p className="piq-timeline__line">
                  <span className="piq-timeline__kind">{kindLabels[e.kind] ?? k.label}</span>
                  <span className="piq-timeline__actor">{e.actor}</span>
                  <span className="piq-timeline__action">{e.action}</span>
                </p>
                <time className="piq-timeline__time" dateTime={when.toISOString()}>{fmt.format(when)}</time>
                {e.body && <div className="piq-timeline__body">{e.body}</div>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* Tabs whose selection is kept in the page's URL (param), so a reload or a
   shared link opens the same tab. Tabs and their counts as for Tabs:
   [{ id, label, panel, count? }]. */
export function TabsSection({ tabs = [], param = "tab", label, defaultValue, onChange, className }) {
  const fromUrl = () => {
    if (typeof window === "undefined") return undefined;
    const v = new URLSearchParams(window.location.search).get(param);
    return tabs.some((t) => String(t.id) === v) ? tabs.find((t) => String(t.id) === v).id : undefined;
  };
  const [value, setValue] = useState(() => fromUrl() ?? defaultValue ?? tabs[0]?.id);
  useEffect(() => {
    const onPop = () => setValue(fromUrl() ?? defaultValue ?? tabs[0]?.id);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  });
  const change = (id) => {
    setValue(id);
    const p = new URLSearchParams(window.location.search);
    p.set(param, id);
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?${p}${window.location.hash}`);
    onChange?.(id);
  };
  return <Tabs className={`piq-tabs-section${className ? ` ${className}` : ""}`} tabs={tabs} value={value} onChange={change} label={label} />;
}

/* One record: its page header (title, status and actions), its fields, its
   tabs and its activity, which sits beside the rest from the expanded size
   class. status is ready, loading, empty (no record chosen), error,
   forbidden or not-found; each but ready and loading shows a state panel. A
   back slot (for ListDetail) goes above the header. */
export function RecordDetail({ title, statusPill, actions, secondaryActions, overflow, breadcrumbs, back, fields, tabs, tabsParam = "tab", tabsLabel, activity, activityLabel = "Activity", status = "ready", onRetry, emptyTitle = "Choose a record", emptyText = "Select a record in the list to see it here.", notFoundTitle = "This record no longer exists", children, className }) {
  if (status !== "ready" && status !== "loading") {
    const panel = {
      empty: <StatePanel kind="empty" title={emptyTitle}><p>{emptyText}</p></StatePanel>,
      error: <StatePanel kind="error" onRetry={onRetry} />,
      forbidden: <StatePanel kind="forbidden" />,
      "not-found": <StatePanel kind="empty" title={notFoundTitle}><p>It may have been deleted or moved.</p></StatePanel>,
    }[status] ?? <StatePanel kind="error" onRetry={onRetry} />;
    return <div className={`piq-record${className ? ` ${className}` : ""}`} data-status={status}>{back}{panel}</div>;
  }
  if (status === "loading") {
    return (
      <div className={`piq-record${className ? ` ${className}` : ""}`} data-status="loading" aria-busy="true">
        {back}
        <Skeleton variant="rect" height={40} />
        <Skeleton lines={6} />
      </div>
    );
  }
  return (
    <article className={`piq-record${className ? ` ${className}` : ""}`} data-status="ready">
      {back}
      <PageHeader title={title} breadcrumbs={breadcrumbs} status={statusPill} actions={actions} secondaryActions={secondaryActions} overflow={overflow} />
      <div className="piq-record__body" data-activity={activity ? "" : undefined}>
        <div className="piq-record__main">
          {fields?.length ? <DescriptionList items={fields} /> : null}
          {tabs?.length ? <TabsSection tabs={tabs} param={tabsParam} label={tabsLabel ?? title} /> : null}
          {children}
        </div>
        {activity && <aside className="piq-record__aside" aria-label={activityLabel}><Timeline events={activity} label={activityLabel} /></aside>}
      </div>
    </article>
  );
}

/* A list of records with the chosen record's detail: side by side from the
   expanded size class, where selection follows the arrow keys; below it the
   list first, and choosing a record (Enter, Space or a click) opens its
   detail as its own view with Back, which returns to the list on that
   record. When two panes become one, the pane holding focus is the one
   kept, so focus is never lost. The list is a listbox: items render as
   text, actions live in the detail. items: [{ id, ... }]; renderItem(item)
   draws one; selected is the chosen id; onSelect(id) chooses one. */
export function ListDetail({ items = [], selected, onSelect, renderItem = (it) => it.label ?? it.id, listLabel = "Records", detail, backLabel = "Back", ratio = "1:2", className }) {
  const root = useRef(null), list = useRef(null), detailRef = useRef(null);
  const size = useSizeClass(root);
  const wide = sizeAtLeast(size, "expanded");
  const [view, setView] = useState(selected != null ? "detail" : "list");
  const [focusId, setFocusId] = useState(selected ?? items[0]?.id);
  const base = useId();
  const index = items.findIndex((it) => it.id === focusId);

  const focusOption = useCallback((id) => {
    [...(list.current?.querySelectorAll('[role="option"]') ?? [])].find((o) => o.dataset.id === String(id))?.focus();
  }, []);
  const open = (id) => {
    onSelect?.(id);
    setFocusId(id);
    if (!wide) {
      setView("detail");
      requestAnimationFrame(() => detailRef.current?.focus());
    }
  };
  function onKey(e) {
    let next = null;
    if (e.key === "ArrowDown") next = Math.min(index + 1, items.length - 1);
    else if (e.key === "ArrowUp") next = Math.max(index - 1, 0);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else if ((e.key === "Enter" || e.key === " ") && focusId != null) { e.preventDefault(); open(focusId); return; }
    if (next === null || next < 0) return;
    e.preventDefault();
    const id = items[next].id;
    setFocusId(id);
    focusOption(id);
    if (wide) onSelect?.(id); // selection follows focus when the detail is beside the list
  }
  const back = () => { setView("list"); requestAnimationFrame(() => focusOption(selected ?? focusId)); };
  // Wherever focus is, that pane is the one a single-pane layout keeps (AC4).
  const track = (pane) => () => { if (wide) setView(pane); };

  useEffect(() => { if (selected != null) setFocusId(selected); }, [selected]);

  return (
    <div ref={root} className={`piq-list-detail${className ? ` ${className}` : ""}`} data-size={size}>
      <SplitView show={view === "detail" ? "secondary" : "primary"} ratio={ratio}
        primary={
          <div onFocus={track("list")}>
            <ul ref={list} role="listbox" aria-label={listLabel} className="piq-list-detail__list" onKeyDown={onKey}>
              {items.map((it) => (
                <li key={it.id} id={`${base}-${it.id}`} role="option" data-id={it.id} aria-selected={it.id === selected}
                  tabIndex={it.id === (focusId ?? items[0]?.id) ? 0 : -1} className="piq-list-detail__option"
                  onClick={() => open(it.id)} onFocus={() => setFocusId(it.id)}>
                  {renderItem(it)}
                </li>
              ))}
            </ul>
          </div>
        }
        secondary={
          <div ref={detailRef} tabIndex={-1} className="piq-list-detail__detail" onFocus={track("detail")}>
            <Button variant="text" className="piq-list-detail__back" onClick={back}><Icon name="arrow-left" />{backLabel}</Button>
            {detail}
          </div>
        } />
    </div>
  );
}
