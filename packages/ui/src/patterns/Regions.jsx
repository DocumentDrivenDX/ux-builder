import { useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { MenuButton } from "../widgets/MenuButton.jsx";
import { Sheet } from "../widgets/Sheet.jsx";
import { Icon } from "../icons/Icon.jsx";

/* The lower bound of each size class in CSS px (ADR-021): the same numbers as
   --piq-size-breakpoint-* and patterns.css's queries. */
export const SIZE_CLASSES = { compact: 0, medium: 600, expanded: 840, large: 1200, "extra-large": 1600 };

/* The size class a width falls in: compact, medium, expanded, large or
   extra-large. */
export function sizeClassOf(width) {
  return Object.entries(SIZE_CLASSES).filter(([, min]) => width >= min).at(-1)[0];
}

/* The size class of an element's own width, kept up to date as it resizes.
   For behaviour that must change with width (a panel inline or in a sheet);
   layout itself changes in CSS. compact until measured. */
export function useSizeClass(ref) {
  const [size, setSize] = useState("compact");
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver !== "function") return undefined;
    setSize(sizeClassOf(el.getBoundingClientRect().width));
    const ro = new ResizeObserver(([entry]) => setSize(sizeClassOf(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}
/* Whether a size class is at least another: sizeAtLeast(size, "expanded"). */
export function sizeAtLeast(size, min) {
  return SIZE_CLASSES[size] >= SIZE_CLASSES[min];
}

/* Keeps a sticky bar's own height clear at the bottom of the area that
   scrolls it, while active, so focus scrolled into view never lands under the
   bar (WCAG 2.4.11), even when the bar wraps onto two lines. */
export function useStickyClearance(ref, active = true) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!active || !el) return undefined;
    let scroller = el.parentElement;
    while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
    scroller ??= document.scrollingElement ?? document.documentElement;
    const before = scroller.style.scrollPaddingBlockEnd;
    const apply = () => { scroller.style.scrollPaddingBlockEnd = `${el.getBoundingClientRect().height + 8}px`; };
    apply();
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(apply) : null;
    ro?.observe(el);
    return () => { ro?.disconnect(); scroller.style.scrollPaddingBlockEnd = before; };
  }, [ref, active]);
}

/* The top of a screen: one level-1 heading, optional breadcrumbs and status,
   the primary action, secondary actions beside it, and any further actions
   in a More menu (overflow: MenuButton items). Its size follows the design
   system's page-header variant. */
export function PageHeader({ title, breadcrumbs, status, description, actions, secondaryActions, overflow, overflowLabel = "More actions", className }) {
  return (
    <header className={`piq-page-header${className ? ` ${className}` : ""}`}>
      {breadcrumbs}
      <div className="piq-page-header__row">
        <div className="piq-page-header__heading">
          <h1 className="piq-page-header__title">{title}</h1>
          {status}
        </div>
        {(actions || secondaryActions || overflow?.length) && (
          <div className="piq-page-header__actions">
            {secondaryActions}
            {actions}
            {overflow?.length ? <MenuButton icon="more" buttonLabel={overflowLabel} variant="text" align="end" items={overflow} /> : null}
          </div>
        )}
      </div>
      {description && <p className="piq-page-header__description">{description}</p>}
    </header>
  );
}

/* Search and filtering above a list: a search field, the applied filters as
   removable chips with Clear all, and a Filters button that opens the filter
   panel and shows how many are applied. Where it has little width (compact)
   only the search and the Filters button show. filters: [{ id, label }]. */
export function FilterBar({ search, onSearchChange, searchLabel = "Search", filters = [], onRemoveFilter, onClearAll, clearLabel = "Clear all", onOpenFilters, filtersOpen, filtersLabel = "Filters", appliedLabel = "Applied filters", removeLabel = (f) => `Remove filter: ${f.label}`, children, className }) {
  const id = useId();
  return (
    <div className={`piq-filter-bar${className ? ` ${className}` : ""}`}>
      <div className="piq-filter-bar__row">
        {onSearchChange && (
          <div role="search" className="piq-filter-bar__search">
            <label className="piq-visually-hidden" htmlFor={id}>{searchLabel}</label>
            <Icon name="search" className="piq-filter-bar__search-icon" />
            <input id={id} type="search" className="piq-field__input" placeholder={searchLabel} value={search ?? ""} onChange={(e) => onSearchChange(e.target.value)} />
          </div>
        )}
        {children}
        {onOpenFilters && (
          <Button variant="secondary" className="piq-filter-bar__open" aria-expanded={filtersOpen} onClick={onOpenFilters}>
            <Icon name="filter" />
            {filters.length ? `${filtersLabel} (${filters.length})` : filtersLabel}
          </Button>
        )}
      </div>
      {filters.length > 0 && (
        <ul className="piq-filter-bar__chips" aria-label={appliedLabel}>
          {filters.map((f) => (
            <li key={f.id} className="piq-chip">
              <span>{f.label}</span>
              {onRemoveFilter && <button type="button" className="piq-chip__remove" aria-label={removeLabel(f)} onClick={() => onRemoveFilter(f)}><Icon name="close" /></button>}
            </li>
          ))}
          {onClearAll && <li><Button variant="text" size="sm" onClick={onClearAll}>{clearLabel}</Button></li>}
        </ul>
      )}
    </div>
  );
}

/* The filters themselves, in collapsible sections (FilterSection): a side
   panel beside the list (mode inline), or a full-screen sheet where there is
   little width (mode sheet). CollectionList chooses the mode by its width. */
export function FilterPanel({ open = false, onClose, mode = "inline", title = "Filters", closeLabel = "Close filters", footer, children, className }) {
  if (mode === "sheet") {
    return <Sheet open={open} onClose={onClose} title={title} side="full" closeLabel={closeLabel} className={className}>{children}{footer}</Sheet>;
  }
  if (!open) return null;
  return (
    <aside className={`piq-filter-panel${className ? ` ${className}` : ""}`} aria-label={title}>
      <div className="piq-filter-panel__head">
        <h2 className="piq-filter-panel__title">{title}</h2>
        <Button variant="text" aria-label={closeLabel} onClick={() => onClose?.()}><Icon name="close" /></Button>
      </div>
      {children}
      {footer}
    </aside>
  );
}

/* One group of filters that opens and closes, with an optional count of
   matching records. */
export function FilterSection({ title, count, defaultOpen = true, children, className }) {
  return (
    <details className={`piq-filter-section${className ? ` ${className}` : ""}`} open={defaultOpen}>
      <summary className="piq-filter-section__title">
        {title}
        {count != null && <span className="piq-filter-section__count">{count}</span>}
      </summary>
      <div className="piq-filter-section__body">{children}</div>
    </details>
  );
}

const STATES = {
  empty: { icon: "add", title: "Nothing here yet", text: "When there is something to show, it will be listed here." },
  "no-results": { icon: "search", title: "No results match", text: "Try different words, or remove a filter." },
  forbidden: { icon: "lock", title: "You don't have access to this", text: "Ask the person who manages this workspace to give you access." },
  error: { icon: "error", title: "This didn't load", text: "Something went wrong on our side. Try again." },
  partial: { icon: "warning", title: "Some of this didn't load", text: "What loaded is shown below. Try again for the rest." },
};

/* What a list or region shows when it has no content to show: first use
   (empty), nothing matching (no-results, with the active filters and a way
   to clear them), no permission (forbidden), a failed load (error, with
   retry) or a partial load (partial). Each says what happened and offers the
   next action, and is announced to screen readers. */
export function StatePanel({ kind = "empty", title, children, action, filters = [], onClearFilters, clearLabel = "Clear filters", onRetry, retryLabel = "Try again", activeLabel = "Active filters:", className }) {
  const s = STATES[kind] ?? STATES.empty;
  return (
    <div className={`piq-state-panel${className ? ` ${className}` : ""}`} data-kind={kind} role={kind === "error" ? "alert" : "status"}>
      <Icon name={s.icon} className="piq-state-panel__mark" />
      <p className="piq-state-panel__title">{title ?? s.title}</p>
      <div className="piq-state-panel__text">{children ?? <p>{s.text}</p>}</div>
      {kind === "no-results" && filters.length > 0 && <p className="piq-state-panel__filters">{activeLabel} {filters.map((f) => f.label).join(", ")}</p>}
      <div className="piq-state-panel__actions">
        {kind === "no-results" && onClearFilters && <Button variant="secondary" onClick={onClearFilters}>{clearLabel}</Button>}
        {(kind === "error" || kind === "partial") && onRetry && <Button onClick={onRetry}>{retryLabel}</Button>}
        {action}
      </div>
    </div>
  );
}

/* The actions for the selected rows, shown while any are selected, with how
   many are selected; the count is announced as it changes. A toolbar: arrow
   keys move between its controls. Place it after the list: it sticks to the
   bottom of the screen. */
export function BulkActionBar({ count = 0, children, onClearSelection, clearLabel = "Clear selection", label = "Bulk actions", selectedText = (n) => `${n} selected`, className }) {
  const bar = useRef(null);
  useStickyClearance(bar, count > 0);
  function onKey(e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const items = [...e.currentTarget.querySelectorAll("button:not([disabled]), a[href], input:not([disabled])")];
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const step = (e.key === "ArrowRight") !== rtl ? 1 : -1;
    e.preventDefault();
    items[(i + step + items.length) % items.length].focus();
  }
  return (
    <>
      <span className="piq-visually-hidden" role="status" aria-live="polite">{count ? selectedText(count) : ""}</span>
      {count > 0 && (
        <div ref={bar} role="toolbar" aria-label={label} className={`piq-bulk-bar${className ? ` ${className}` : ""}`} onKeyDown={onKey}>
          <span className="piq-bulk-bar__count">{selectedText(count)}</span>
          <div className="piq-bulk-bar__actions">{children}</div>
          {onClearSelection && <Button variant="text" onClick={onClearSelection}>{clearLabel}</Button>}
        </div>
      )}
    </>
  );
}
