/* The collection list and its regions (US-025; FEAT-006 SCR-03, REG-01 to
   REG-03, REG-10, REG-11, NAV-05, NAV-07), against the built package.
   collection.browser.test.mjs checks the size classes, the sticky bulk bar
   and layout shift in Chromium.

     npm run build && npm test --workspace @ux-builder/ui */

import "./dom.mjs";
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { act, createElement as h, useState } from "react";
import { createRoot } from "react-dom/client";
import { Button, Checkbox, Pagination } from "../dist/index.js";
import { BulkActionBar, CollectionList, FilterBar, FilterSection, PageHeader, StatePanel, sizeClassOf, useListQuery } from "../dist/patterns.js";

let root, host;
function render(el) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(el));
  return host;
}
afterEach(() => { act(() => root?.unmount()); host?.remove(); root = null; });
const key = (el, k) => act(() => { el.dispatchEvent(new window.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true })); });
const click = (el) => act(() => { el.click(); });
const text = (el) => el?.textContent.trim();

// A ResizeObserver that reports the width a test sets, so the list's own size class is known.
let width = 1024;
const observers = new Set();
beforeEach(() => {
  observers.clear();
  window.ResizeObserver = globalThis.ResizeObserver = class { constructor(cb) { this.cb = cb; observers.add(this); } observe(el) { this.el = el; } disconnect() { observers.delete(this); } };
  window.HTMLElement.prototype.getBoundingClientRect = function () { return { width, height: 0, top: 0, left: 0, right: width, bottom: 0 }; };
});
const resize = (w) => { width = w; act(() => { for (const o of observers) o.cb([{ contentRect: { width: w } }]); }); };

const COLUMNS = [
  { key: "name", label: "Matter", priority: true, sortable: true },
  { key: "client", label: "Client", priority: true },
  { key: "owner", label: "Owner" },
  { key: "value", label: "Value", numeric: true, sortable: true },
];
const ROWS = Array.from({ length: 20 }, (_, i) => ({ id: `m${i + 21}`, name: `Matter ${i + 21}`, client: i % 2 ? "Acme" : "Globex", owner: "R. Lee", value: 1000 + i }));

function List(props) {
  const [selected, setSelected] = useState([]);
  return h(CollectionList, {
    title: "Matters", actions: h(Button, null, "New matter"), overflow: [{ label: "Export" }],
    columns: COLUMNS, rows: ROWS, selectable: true, selected, onSelectedChange: setSelected,
    bulkActions: [h(Button, { key: "a", variant: "secondary" }, "Assign"), h(Button, { key: "b", variant: "secondary" }, "Archive")],
    rowActions: () => [{ label: "Open" }, { label: "Duplicate" }, { label: "Archive" }],
    search: "", onSearchChange: () => {}, filters: [{ id: "open", label: "Status: Open" }], onRemoveFilter: () => {}, onClearFilters: () => {},
    filterPanel: h(FilterSection, { title: "Status", count: 3 }, h(Checkbox, { label: "Open" })),
    page: 2, pageSize: 20, total: 312, onPageChange: () => {}, onPageSizeChange: () => {},
    ...props,
  });
}

describe("US-025 collection list", () => {
  // @covers US-025-AC1
  test("AC1: a page header with one h1 and a primary action, search, removable chips and Clear all, a table, and pagination with position and page size", () => {
    const el = render(h(List));
    assert.equal(el.querySelectorAll("h1").length, 1);
    assert.equal(text(el.querySelector("h1")), "Matters");
    assert.ok([...el.querySelectorAll(".piq-page-header__actions button")].some((b) => text(b) === "New matter"));
    assert.equal(el.querySelector('[role="search"] input[type="search"]').labels[0].textContent, "Search");
    const chips = el.querySelector('.piq-filter-bar__chips[aria-label="Applied filters"]');
    assert.equal(text(chips.querySelector(".piq-chip span")), "Status: Open");
    assert.equal(chips.querySelector(".piq-chip__remove").getAttribute("aria-label"), "Remove filter: Status: Open");
    assert.ok([...chips.querySelectorAll("button")].some((b) => text(b) === "Clear all"));
    const table = el.querySelector("table.piq-collection__table");
    assert.deepEqual([...table.querySelectorAll("thead th")].map((th) => text(th)).filter(Boolean), ["Matter", "Client", "Owner", "Value", "Actions"]);
    assert.equal(table.querySelectorAll("tbody tr").length, 20);
    const pager = el.querySelector('nav.piq-pagination[aria-label="Pagination"]');
    assert.equal(text(pager.querySelector(".piq-pagination__position")), "21–40 of 312");
    assert.equal(pager.querySelector("select").value, "20");
    assert.equal(pager.querySelector("label").textContent, "Rows per page");
  });

  // @covers US-025-AC2
  test("AC2: compact items show only priority columns; the Filters button carries the count and opens the filters as a full-screen sheet", () => {
    width = 390;
    const el = render(h(List));
    const item = el.querySelector(".piq-collection__item");
    assert.deepEqual([...item.querySelectorAll(".piq-collection__fields > p")].map((p) => p.textContent), ["Matter 21", "Client: Globex"]);
    const open = el.querySelector(".piq-filter-bar__open");
    assert.equal(text(open), "Filters (1)");
    assert.equal(open.getAttribute("aria-expanded"), "false");
    click(open);
    const sheet = el.querySelector("dialog.piq-sheet");
    assert.equal(sheet.open, true);
    assert.equal(sheet.dataset.side, "full");
    assert.ok(sheet.querySelector("details.piq-filter-section"));
    assert.equal(el.querySelector("aside.piq-filter-panel"), null);
  });

  test("from expanded up the filters open as a side panel beside the list, and follow the list's width", () => {
    width = 1024;
    const el = render(h(List));
    click(el.querySelector(".piq-filter-bar__open"));
    assert.ok(el.querySelector('aside.piq-filter-panel[aria-label="Filters"]'));
    assert.equal(el.querySelector(".piq-collection__body").dataset.panel, "open");
    resize(500);
    assert.equal(el.querySelector("aside.piq-filter-panel"), null, "narrowed: no inline panel");
    assert.equal(el.querySelector("dialog.piq-sheet").open, true, "the sheet instead");
  });

  // @covers US-025-AC3
  test("AC3: selecting rows shows a bulk action toolbar with the count, announced politely; arrows move within it", () => {
    const el = render(h(List));
    const live = el.querySelector('[role="status"][aria-live="polite"]');
    assert.equal(live.textContent, "");
    assert.equal(el.querySelector('[role="toolbar"]'), null);
    const boxes = el.querySelectorAll("tbody input[type=checkbox]");
    for (const b of [...boxes].slice(0, 3)) click(b);
    const bar = el.querySelector('[role="toolbar"][aria-label="Bulk actions"]');
    assert.equal(text(bar.querySelector(".piq-bulk-bar__count")), "3 selected");
    assert.equal(live.textContent, "3 selected");
    assert.equal(boxes[0].getAttribute("aria-label"), "Select Matter 21");
    const [assign, archive] = bar.querySelectorAll(".piq-bulk-bar__actions button");
    assign.focus();
    key(assign, "ArrowRight");
    assert.equal(document.activeElement, archive);
    // Select all on the page, then clear.
    const all = el.querySelector("thead input[type=checkbox]");
    assert.equal(all.indeterminate, true);
    click(all);
    assert.equal(text(el.querySelector(".piq-bulk-bar__count")), "20 selected");
    click([...el.querySelectorAll(".piq-bulk-bar button")].find((b) => text(b) === "Clear selection"));
    assert.equal(el.querySelector('[role="toolbar"]'), null);
    assert.equal(live.textContent, "");
  });

  // @covers US-025-AC4
  test("AC4: a row's action menu follows the Menu Button pattern", () => {
    const el = render(h(List));
    const btn = el.querySelector("tbody .piq-menubutton button");
    assert.equal(btn.getAttribute("aria-label"), "Actions for Matter 21");
    btn.focus();
    key(btn, "Enter");
    assert.equal(text(document.activeElement), "Open");
    key(document.activeElement, "ArrowDown");
    assert.equal(text(document.activeElement), "Duplicate");
    key(document.activeElement, "Escape");
    assert.equal(el.querySelector('[role="menu"]'), null);
    assert.equal(document.activeElement, btn);
  });

  // @covers US-025-AC5
  test("AC5: each state says what happened and offers the next action, while the header and filters stay usable", () => {
    const cases = [
      [{ status: "empty", filters: [], search: "" }, "Nothing here yet", null],
      [{ status: "empty" }, "No results match", "Clear filters"],
      [{ status: "forbidden" }, "You don't have access to this", null],
      [{ status: "error", onRetry: () => {} }, "This didn't load", "Try again"],
    ];
    for (const [props, title, action] of cases) {
      const el = render(h(List, props));
      const panel = el.querySelector(".piq-state-panel");
      assert.equal(text(panel.querySelector(".piq-state-panel__title")), title);
      assert.equal(panel.getAttribute("role"), props.status === "error" ? "alert" : "status");
      if (action) assert.ok([...panel.querySelectorAll("button")].some((b) => text(b) === action), `${title}: ${action}`);
      if (title === "No results match") assert.match(text(panel.querySelector(".piq-state-panel__filters")), /Status: Open/);
      assert.equal(el.querySelector("table"), null);
      assert.ok(el.querySelector("h1") && el.querySelector('[role="search"] input'), "header and search stay");
      act(() => root.unmount()); host.remove(); root = null;
    }
    const partial = render(h(List, { status: "partial", onRetry: () => {} }));
    assert.equal(text(partial.querySelector(".piq-state-panel__title")), "Some of this didn't load");
    assert.equal(partial.querySelectorAll("tbody tr").length, 20, "what loaded is shown");
  });

  test("while loading, skeleton rows stand in for the page's rows in a busy region", () => {
    const el = render(h(List, { status: "loading", rows: [] }));
    const region = el.querySelector('[aria-busy="true"]');
    assert.ok(region);
    assert.equal(region.querySelectorAll(".piq-collection__table-wrap tbody tr").length, 20);
    assert.equal(region.querySelectorAll(".piq-collection__item").length, 20);
  });

  test("sortable headers report aria-sort and ask the app to sort", () => {
    const sorts = [];
    const el = render(h(List, { sort: { key: "value", dir: "ascending" }, onSortChange: (s) => sorts.push(s) }));
    const ths = [...el.querySelectorAll("thead th")];
    assert.equal(ths.find((t) => t.textContent.startsWith("Value")).getAttribute("aria-sort"), "ascending");
    assert.equal(ths.find((t) => t.textContent.startsWith("Matter")).getAttribute("aria-sort"), "none");
    assert.equal(ths.find((t) => t.textContent === "Client").getAttribute("aria-sort"), null);
    click(ths.find((t) => t.textContent.startsWith("Value")).querySelector("button"));
    assert.deepEqual(sorts, [{ key: "value", dir: "descending" }]);
  });
});

describe("US-025 list query", () => {
  // @covers US-025-AC6
  test("AC6: page, page size, search and filters live in the URL, so returning to the list shows the same page", () => {
    window.history.replaceState(null, "", "/matters");
    let api;
    function Probe() { const [q, set] = useListQuery({ key: "matters" }); api = { q, set }; return h("p", null, `${q.page}|${q.pageSize}|${q.q}|${q.filters.join(",")}`); }
    let el = render(h(Probe));
    assert.equal(el.textContent, "1|20||");
    act(() => api.set({ q: "Acme", filters: ["open"] }));
    act(() => api.set({ page: 2, pageSize: 50 }));
    assert.equal(el.textContent, "2|50|Acme|open");
    assert.match(window.location.search, /matters\.page=2/);
    assert.match(window.location.search, /matters\.q=Acme/);
    // Open a record (the list unmounts), then come back to the same URL.
    act(() => root.unmount()); host.remove(); root = null;
    el = render(h(Probe));
    assert.equal(el.textContent, "2|50|Acme|open");
    act(() => api.set({ q: "Globex" }));
    assert.equal(el.textContent, "1|50|Globex|open", "a new search starts at page 1");
  });
});

describe("regions on their own", () => {
  test("PageHeader: one h1, status, actions and a More menu", () => {
    const el = render(h(PageHeader, { title: "Acme v. Doe", status: h("span", null, "Open"), actions: h(Button, null, "Edit"), overflow: [{ label: "Archive" }] }));
    assert.equal(el.querySelectorAll("h1").length, 1);
    assert.equal(el.querySelector(".piq-menubutton button").getAttribute("aria-label"), "More actions");
  });

  test("FilterBar without filters shows no chips and a plain Filters button", () => {
    const el = render(h(FilterBar, { onSearchChange: () => {}, onOpenFilters: () => {} }));
    assert.equal(el.querySelector(".piq-filter-bar__chips"), null);
    assert.equal(text(el.querySelector(".piq-filter-bar__open")), "Filters");
  });

  test("StatePanel: an app's own action and text replace the defaults", () => {
    const el = render(h(StatePanel, { kind: "empty", title: "No matters yet", action: h(Button, null, "New matter") }, h("p", null, "Create one to start.")));
    assert.equal(text(el.querySelector(".piq-state-panel__title")), "No matters yet");
    assert.equal(text(el.querySelector(".piq-state-panel__actions button")), "New matter");
  });

  test("BulkActionBar renders nothing visible with no selection but keeps its live region", () => {
    const el = render(h(BulkActionBar, { count: 0 }));
    assert.equal(el.querySelector('[role="toolbar"]'), null);
    assert.ok(el.querySelector('[role="status"]'));
  });

  test("Pagination clamps the page and disables previous and next at the ends", () => {
    const pages = [];
    const el = render(h(Pagination, { page: 99, pageSize: 20, total: 45, onPageChange: (p) => pages.push(p) }));
    assert.equal(text(el.querySelector(".piq-pagination__position")), "41–45 of 45");
    const [prev, next] = el.querySelectorAll(".piq-pagination__steps button");
    assert.equal(next.disabled, true);
    click(prev);
    assert.deepEqual(pages, [2]);
    assert.equal(prev.getAttribute("aria-label"), "Previous page");
  });

  test("sizeClassOf follows the size-class boundaries", () => {
    assert.deepEqual([0, 599, 600, 839, 840, 1199, 1200, 1599, 1600].map(sizeClassOf), ["compact", "compact", "medium", "medium", "expanded", "expanded", "large", "large", "extra-large"]);
  });
});
