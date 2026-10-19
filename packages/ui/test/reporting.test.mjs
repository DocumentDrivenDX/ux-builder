/* Dashboards and reports (US-028; FEAT-006 SCR-08, SCR-09, REG-06, REG-07;
   FEAT-004 SDK-19 date pickers), against the built package.
   reporting.browser.test.mjs checks the grids, the parameters summary and
   printing in Chromium.

     npm run build && npm test --workspace @ux-builder/ui */

import "./dom.mjs";
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { DateRangePicker, Select } from "../dist/index.js";
import { ChartFrame, Dashboard, ReportViewer, StatTile } from "../dist/patterns.js";

let root, host;
function render(el) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(el));
  return host;
}
afterEach(() => { act(() => root?.unmount()); host?.remove(); root = null; });
const click = (el) => act(() => { el.click(); });
const text = (el) => el?.textContent.trim();

let width = 1366;
beforeEach(() => {
  window.ResizeObserver = globalThis.ResizeObserver = class { constructor(cb) { this.cb = cb; } observe() {} disconnect() {} };
  window.HTMLElement.prototype.getBoundingClientRect = function () { return { width, height: 0, top: 0, left: 0, right: width, bottom: 0 }; };
});

const TABLE = { columns: [{ key: "month", label: "Month" }, { key: "billed", label: "Billed (£k)", numeric: true }], rows: [{ month: "Jul", billed: 380 }, { month: "Aug", billed: 381 }, { month: "Sep", billed: 412 }] };

describe("US-028 dashboard", () => {
  // @covers US-028-AC2
  test("AC2: filters, the date range and the last-refreshed time sit above the tiles and charts", () => {
    const el = render(h(Dashboard, {
      title: "Billing overview", locale: "en-GB", refreshedAt: "2026-10-18T09:42:00",
      filters: h(Select, { label: "Office", options: [{ value: "ldn", label: "London" }] }),
      dateRange: h(DateRangePicker, { label: "Period", from: "2026-09-01", to: "2026-09-30" }),
      tiles: [h(StatTile, { key: "t", label: "Unbilled time", value: "£412k" })],
      charts: [h(ChartFrame, { key: "c", title: "Billed by month", table: TABLE }, h("svg", { role: "img", "aria-label": "chart" }))],
    }));
    const toolbar = el.querySelector(".piq-dashboard__toolbar");
    assert.ok(toolbar.compareDocumentPosition(el.querySelector(".piq-dashboard__tiles")) & window.Node.DOCUMENT_POSITION_FOLLOWING, "toolbar before the grid");
    assert.ok(toolbar.querySelector("select"));
    const range = toolbar.querySelector("fieldset.piq-date-range");
    assert.equal(text(range.querySelector("legend")), "Period");
    const [from, to] = range.querySelectorAll("input[type=date]");
    assert.deepEqual([from.value, to.value, to.min, from.max], ["2026-09-01", "2026-09-30", "2026-09-01", "2026-09-30"]);
    assert.equal(text(toolbar.querySelector(".piq-dashboard__refreshed")), "Last refreshed 09:42");
    assert.ok(toolbar.querySelector("time").getAttribute("datetime"));
  });

  // @covers US-028-AC3
  test("AC3: a tile states its value, label and the change's direction in words", () => {
    const el = render(h("div", null,
      h(StatTile, { label: "Unbilled time", value: "£412k", change: { direction: "up", amount: "8%", comparison: "on August" } }),
      h(StatTile, { label: "Write-offs", value: "£12k", change: { direction: "down", amount: "3%", comparison: "on August" } }),
      h(StatTile, { label: "Matters", value: "128", change: { direction: "flat", comparison: "on August" } })));
    const tiles = [...el.querySelectorAll(".piq-stat-tile")];
    assert.equal(tiles[0].getAttribute("aria-label"), "Unbilled time");
    assert.equal(text(tiles[0].querySelector(".piq-stat-tile__value")), "£412k");
    assert.deepEqual(tiles.map((t) => text(t.querySelector(".piq-stat-tile__change span"))), ["up 8% on August", "down 3% on August", "no change on August"]);
    assert.ok(tiles.every((t) => t.querySelector(".piq-stat-tile__arrow")?.getAttribute("aria-hidden") === "true"), "the arrow is decoration");
  });

  // @covers US-028-AC4
  test("AC4: a chart has a title and a text legend, and a button that shows a table of the same values", () => {
    const el = render(h(ChartFrame, { title: "Billed by month", legend: [{ label: "Billed" }, { label: "Target" }], table: TABLE }, h("svg", { role: "img", "aria-label": "Billed by month, July to September" })));
    const fig = el.querySelector("figure");
    assert.equal(text(document.getElementById(fig.getAttribute("aria-labelledby"))), "Billed by month");
    assert.deepEqual([...fig.querySelectorAll(".piq-chart-frame__legend li")].map(text), ["Billed", "Target"]);
    const btn = fig.querySelector(".piq-chart-frame__data button");
    const panel = document.getElementById(btn.getAttribute("aria-controls"));
    assert.equal(btn.getAttribute("aria-expanded"), "false");
    assert.equal(panel.hidden, true);
    click(btn);
    assert.equal(btn.getAttribute("aria-expanded"), "true");
    assert.equal(text(btn), "Hide data table");
    assert.equal(panel.hidden, false);
    assert.equal(text(panel.querySelector("caption")), "Billed by month");
    assert.deepEqual([...panel.querySelectorAll("tbody tr")].map((r) => [...r.cells].map(text)), [["Jul", "380"], ["Aug", "381"], ["Sep", "412"]]);
  });

  // @covers US-028-AC5
  test("AC5: no data, loading and a failed load show in the chart's space; error offers retry; the rest stays", () => {
    let retried = 0;
    const el = render(h(Dashboard, { title: "Billing", tiles: [h(StatTile, { key: "t", label: "Unbilled", value: "£1" })], charts: [
      h(ChartFrame, { key: "a", title: "Empty", status: "empty", table: TABLE }),
      h(ChartFrame, { key: "b", title: "Loading", status: "loading" }),
      h(ChartFrame, { key: "c", title: "Failed", status: "error", onRetry: () => retried++ }),
    ] }));
    const [empty, loading, failed] = el.querySelectorAll("figure");
    assert.equal(text(empty.querySelector(".piq-state-panel__title")), "No data for this period");
    assert.equal(empty.querySelector(".piq-chart-frame__data"), null, "no table to show for nothing");
    assert.ok(loading.querySelector('.piq-chart-frame__state[aria-busy="true"]'));
    assert.equal(failed.querySelector(".piq-state-panel").getAttribute("role"), "alert");
    click([...failed.querySelectorAll("button")].find((b) => text(b) === "Try again"));
    assert.equal(retried, 1);
    assert.ok(el.querySelector(".piq-chart-frame__chart > .piq-chart-frame__state"), "in the chart's own space");
    assert.equal(text(el.querySelector(".piq-stat-tile__value")), "£1", "the tiles are unaffected");
  });
});

describe("US-028 report viewer", () => {
  const report = (props = {}) => h(ReportViewer, {
    title: "Aged debt", parameters: h(Select, { label: "Office", options: [{ value: "ldn", label: "London" }] }),
    applied: [{ label: "Office", value: "London" }, { label: "As at", value: "30 Sep 2026" }],
    results: h("table", { className: "piq-table" }, h("thead", null, h("tr", null, h("th", null, "Client"))), h("tbody", null, h("tr", null, h("td", null, "Acme")))),
    onExport: () => {}, ...props,
  });

  // @covers US-028-AC6
  test("AC6: the applied parameters are summarised above the results; the panel is a side panel, then collapsible, then a sheet", () => {
    const modes = {};
    for (const w of [1366, 720, 390]) {
      width = w;
      const el = render(report());
      const r = el.querySelector(".piq-report");
      modes[w] = r.dataset.mode;
      const applied = el.querySelector(".piq-report__applied");
      assert.equal(applied.getAttribute("aria-label"), "Run with");
      assert.deepEqual([...applied.querySelectorAll(".piq-chip")].map(text), ["Office:London", "As at:30 Sep 2026"]);
      assert.ok(applied.compareDocumentPosition(el.querySelector(".piq-report__results table")) & window.Node.DOCUMENT_POSITION_FOLLOWING, "summary above results");
      if (w === 1366) assert.ok(el.querySelector('aside.piq-report__params[aria-label="Parameters"]'));
      if (w === 720) {
        const btn = [...el.querySelectorAll("button")].find((b) => text(b) === "Parameters");
        const panel = document.getElementById(btn.getAttribute("aria-controls"));
        assert.equal(panel.hidden, true);
        click(btn);
        assert.equal(panel.hidden, false);
        assert.equal(btn.getAttribute("aria-expanded"), "true");
      }
      if (w === 390) {
        click([...el.querySelectorAll("button")].find((b) => text(b) === "Parameters"));
        assert.equal(el.querySelector("dialog.piq-sheet").open, true);
      }
      act(() => root.unmount()); host.remove(); root = null;
    }
    assert.deepEqual(modes, { 1366: "side", 720: "collapsible", 390: "sheet" });
  });

  // @covers US-028-AC7
  test("AC7: Export and Print are offered; Print prints the page", () => {
    let exported = 0, printed = 0;
    width = 1366;
    const original = window.print;
    window.print = () => printed++;
    try {
      const el = render(report({ onExport: () => exported++ }));
      const btn = (name) => [...el.querySelectorAll(".piq-report__actions button")].find((b) => text(b) === name);
      click(btn("Export"));
      click(btn("Print"));
      assert.deepEqual([exported, printed], [1, 1]);
    } finally { window.print = original; }
  });
});
