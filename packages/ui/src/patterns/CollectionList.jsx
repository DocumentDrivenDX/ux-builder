import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { MenuButton } from "../widgets/MenuButton.jsx";
import { Pagination } from "../widgets/Pagination.jsx";
import { Skeleton } from "../widgets/Loading.jsx";
import { Icon } from "../icons/Icon.jsx";
import { BulkActionBar, FilterBar, FilterPanel, PageHeader, StatePanel, sizeAtLeast, useSizeClass } from "./Regions.jsx";

const READY = new Set(["ready", "partial"]);

/* A list's query (page, page size, search, filters, sort) kept in the page's
   URL under a key, so it survives opening a record and coming back, can be
   shared, and follows Back and Forward. Returns [query, update]; update
   merges, and a change to search or filters returns to page 1. filters are
   ids; sort is { key, dir } with dir ascending or descending. */
export function useListQuery({ key = "list", defaults = {} } = {}) {
  const defaultsRef = useRef(null);
  defaultsRef.current = { page: 1, pageSize: 20, q: "", filters: [], sort: null, ...defaults };
  const read = useCallback(() => {
    const base = defaultsRef.current;
    if (typeof window === "undefined") return base;
    const p = new URLSearchParams(window.location.search);
    const get = (k) => p.get(`${key}.${k}`);
    const [sk, sd] = (get("sort") ?? "").split(":");
    return {
      page: Number(get("page")) || base.page,
      pageSize: Number(get("size")) || base.pageSize,
      q: get("q") ?? base.q,
      filters: get("f") ? get("f").split(",").filter(Boolean) : base.filters,
      sort: sk ? { key: sk, dir: sd === "descending" ? "descending" : "ascending" } : base.sort,
    };
  }, [key]);
  const [query, setQuery] = useState(read);

  useEffect(() => {
    const onPop = () => setQuery(read());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [read]);

  const update = useCallback((change) => {
    setQuery((q) => {
      const base = defaultsRef.current;
      const next = { ...q, ...change };
      if (("q" in change || "filters" in change) && !("page" in change)) next.page = 1;
      const p = new URLSearchParams(window.location.search);
      const put = (k, v, d) => (v === d || v === "" || v == null ? p.delete(`${key}.${k}`) : p.set(`${key}.${k}`, v));
      put("page", next.page, base.page);
      put("size", next.pageSize, base.pageSize);
      put("q", next.q, "");
      put("f", next.filters.join(","), "");
      put("sort", next.sort ? `${next.sort.key}:${next.sort.dir}` : null, null);
      const s = p.toString();
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${s ? `?${s}` : ""}${window.location.hash}`);
      return next;
    });
  }, [key]);
  return [query, update];
}

function priorityKeys(columns) {
  const marked = columns.filter((c) => c.priority).map((c) => c.key);
  return new Set(marked.length ? marked : columns.slice(0, 2).map((c) => c.key));
}
const cell = (c, row) => (c.render ? c.render(row) : row[c.key]);

function SelectAll({ rows, keyOf, selected, onChange, label }) {
  const ref = useRef(null);
  const on = rows.filter((r) => selected.includes(keyOf(r))).length;
  useEffect(() => { if (ref.current) ref.current.indeterminate = on > 0 && on < rows.length; }, [on, rows.length]);
  return (
    <label className="piq-collection__hit"><input ref={ref} type="checkbox" className="piq-check__box" aria-label={label} checked={rows.length > 0 && on === rows.length}
      onChange={(e) => onChange(e.target.checked ? [...new Set([...selected, ...rows.map(keyOf)])] : selected.filter((k) => !rows.some((r) => keyOf(r) === k)))} /></label>
  );
}

/* A screen for finding and acting on records: the page header, search and
   filters, the records as a table (from the medium size class; only the
   priority columns until expanded) or as stacked items (compact), selection
   with bulk actions, row action menus, sorting, pagination, and a state
   panel for empty, no results, no permission, a failed or partial load, with
   skeletons while loading. The app supplies the rows of the current page and
   owns the query (useListQuery keeps it in the URL); the list fetches
   nothing. columns: [{ key, label, priority?, numeric?, sortable?, render? }]. */
export function CollectionList({
  title, breadcrumbs, statusPill, actions, secondaryActions, overflow,
  columns = [], rows = [], rowKey = "id", rowLabel, caption,
  status = "ready", onRetry,
  search, onSearchChange, searchLabel = "Search", filters = [], onRemoveFilter, onClearFilters, filterPanel, filtersLabel = "Filters",
  selectable = false, selected = [], onSelectedChange, bulkActions,
  rowActions, rowActionsLabel = (name) => `Actions for ${name}`, selectRowLabel = (name) => `Select ${name}`, selectAllLabel = "Select all on this page",
  sort, onSortChange,
  page = 1, pageSize = 20, total, onPageChange, pageSizes, onPageSizeChange,
  empty, showResultsLabel = "Show results", className,
}) {
  const root = useRef(null);
  const size = useSizeClass(root);
  const [panelOpen, setPanelOpen] = useState(false);
  const base = useId();
  const keyOf = (r) => r[rowKey];
  const nameOf = (r) => String(rowLabel ? rowLabel(r) : r[columns[0]?.key] ?? keyOf(r));
  const prio = priorityKeys(columns);
  const filtering = filters.length > 0 || Boolean(search);
  const state = status === "empty" && filtering ? "no-results" : status;
  const select = (r, on) => onSelectedChange?.(on ? [...selected, keyOf(r)] : selected.filter((k) => k !== keyOf(r)));
  const panelMode = sizeAtLeast(size, "expanded") ? "inline" : "sheet";

  const toggleSort = (c) => onSortChange?.(sort?.key === c.key && sort.dir === "ascending" ? { key: c.key, dir: "descending" } : { key: c.key, dir: "ascending" });
  const menu = (r) => {
    const items = rowActions?.(r);
    return items?.length ? <MenuButton icon="more" variant="text" size="sm" align="end" buttonLabel={rowActionsLabel(nameOf(r))} items={items} /> : null;
  };
  const check = (r, where) => (
    <label className="piq-collection__hit">
      <input type="checkbox" className="piq-check__box" id={`${base}-${where}-${keyOf(r)}`} aria-label={selectRowLabel(nameOf(r))}
        checked={selected.includes(keyOf(r))} onChange={(e) => select(r, e.target.checked)} />
    </label>
  );

  const loadingRows = Math.min(pageSize, 50);
  let results;
  if (state === "loading") {
    results = (
      <div className="piq-collection__results" aria-busy="true">
        <ul className="piq-collection__items" aria-hidden="true">
          {Array.from({ length: loadingRows }, (_, i) => <li key={i} className="piq-collection__item"><Skeleton lines={2} /></li>)}
        </ul>
        <div className="piq-collection__table-wrap" aria-hidden="true">
          {/* The loaded table's own header and cells, so rows arrive where the skeletons were. */}
          <table className="piq-table piq-collection__table">
            <thead><tr>
              {selectable && <th className="piq-collection__select"><span className="piq-collection__hit"><input type="checkbox" className="piq-check__box" disabled tabIndex={-1} /></span></th>}
              {columns.map((c) => <th key={c.key} data-priority={prio.has(c.key)} className={c.numeric ? "piq-num" : undefined}>{c.label}</th>)}
              {rowActions && <th className="piq-collection__actions" />}
            </tr></thead>
            <tbody>
              {Array.from({ length: loadingRows }, (_, i) => (
                <tr key={i}>
                  {selectable && <td className="piq-collection__select"><span className="piq-collection__hit"><input type="checkbox" className="piq-check__box" disabled tabIndex={-1} /></span></td>}
                  {columns.map((c) => <td key={c.key} data-priority={prio.has(c.key)}><Skeleton /></td>)}
                  {rowActions && <td className="piq-collection__actions"><Button variant="text" size="sm" disabled tabIndex={-1}><Icon name="more" /></Button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  } else if (!READY.has(state)) {
    results = (
      <div className="piq-collection__results">
        {state === "empty" && empty ? empty : <StatePanel kind={state} filters={filters} onClearFilters={onClearFilters} onRetry={onRetry} />}
      </div>
    );
  } else {
    results = (
      <div className="piq-collection__results">
        {state === "partial" && <StatePanel kind="partial" onRetry={onRetry} />}
        <ul className="piq-collection__items" aria-label={caption ?? title}>
          {rows.map((r) => {
            const shown = columns.filter((c) => prio.has(c.key));
            return (
              <li key={keyOf(r)} className="piq-collection__item" data-selected={selectable && selected.includes(keyOf(r)) ? "" : undefined}>
                {selectable && check(r, "item")}
                <div className="piq-collection__fields">
                  {shown.map((c, i) => (i === 0
                    ? <p key={c.key} className="piq-collection__primary">{cell(c, r)}</p>
                    : <p key={c.key} className="piq-collection__field"><span className="piq-visually-hidden">{c.label}: </span>{cell(c, r)}</p>))}
                </div>
                {menu(r)}
              </li>
            );
          })}
        </ul>
        <div className="piq-collection__table-wrap">
          <table className="piq-table piq-collection__table">
            {(caption ?? title) && <caption className="piq-visually-hidden">{caption ?? title}</caption>}
            <thead>
              <tr>
                {selectable && <th scope="col" className="piq-collection__select"><SelectAll rows={rows} keyOf={keyOf} selected={selected} onChange={(next) => onSelectedChange?.(next)} label={selectAllLabel} /></th>}
                {columns.map((c) => {
                  const dir = sort?.key === c.key ? sort.dir : undefined;
                  return (
                    <th key={c.key} scope="col" data-priority={prio.has(c.key)} className={c.numeric ? "piq-num" : undefined} aria-sort={c.sortable ? dir ?? "none" : undefined}>
                      {c.sortable && onSortChange
                        ? <button type="button" className="piq-table__sort" onClick={() => toggleSort(c)}>{c.label}<span className="piq-table__arrow" aria-hidden="true">{dir === "descending" ? "↓" : dir === "ascending" ? "↑" : "↕"}</span></button>
                        : c.label}
                    </th>
                  );
                })}
                {rowActions && <th scope="col" className="piq-collection__actions"><span className="piq-visually-hidden">Actions</span></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={keyOf(r)} data-selected={selectable && selected.includes(keyOf(r)) ? "" : undefined}>
                  {selectable && <td className="piq-collection__select">{check(r, "row")}</td>}
                  {columns.map((c) => <td key={c.key} data-priority={prio.has(c.key)} className={c.numeric ? "piq-num" : undefined}>{cell(c, r)}</td>)}
                  {rowActions && <td className="piq-collection__actions">{menu(r)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 0 && onPageChange && <Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} pageSizes={pageSizes} onPageSizeChange={onPageSizeChange} />}
      </div>
    );
  }

  return (
    <div ref={root} className={`piq-collection${className ? ` ${className}` : ""}`} data-size={size}>
      <PageHeader title={title} breadcrumbs={breadcrumbs} status={statusPill} actions={actions} secondaryActions={secondaryActions} overflow={overflow} />
      <FilterBar search={search} onSearchChange={onSearchChange} searchLabel={searchLabel} filters={filters} onRemoveFilter={onRemoveFilter} onClearAll={onClearFilters}
        onOpenFilters={filterPanel ? () => setPanelOpen((o) => !o) : undefined} filtersOpen={filterPanel ? panelOpen : undefined} filtersLabel={filtersLabel} />
      <div className="piq-collection__body" data-panel={panelOpen && panelMode === "inline" ? "open" : undefined}>
        {filterPanel && (
          <FilterPanel open={panelOpen} mode={panelMode} title={filtersLabel} onClose={() => setPanelOpen(false)}
            footer={panelMode === "sheet" ? <Button onClick={() => setPanelOpen(false)}>{showResultsLabel}</Button> : null}>
            {filterPanel}
          </FilterPanel>
        )}
        {results}
      </div>
      {/* After the list in reading order, so it can stick to the bottom of the screen. */}
      {selectable && (
        <BulkActionBar count={selected.length} onClearSelection={() => onSelectedChange?.([])}>{bulkActions}</BulkActionBar>
      )}
    </div>
  );
}
