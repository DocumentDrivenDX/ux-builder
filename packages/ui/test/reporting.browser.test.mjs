/* Dashboards and reports in a real browser (US-028-AC1, AC6, AC7): built CSS
   in Chromium, so the grids follow their container and print is what the
   browser would print.

     npm run build && npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppShell, ChartFrame, Dashboard, ReportViewer, StatTile } from "../dist/patterns.js";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const SHEETS = [join(PKG, "../tokens/dist/themes.css"), join(PKG, "dist/ui.css"), join(PKG, "dist/patterns.css")];
const tmp = mkdtempSync(join(tmpdir(), "reporting-"));
let browser;

async function open(body, { width = 1366 } = {}) {
  const html = join(tmp, `p-${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(html, `<!doctype html><html data-theme="praxis-carbon" data-appearance="light"><head><meta name="viewport" content="width=device-width, initial-scale=1">${SHEETS.map((s) => `<link rel="stylesheet" href="${pathToFileURL(s)}">`).join("")}<style>body{margin:0}</style></head><body>${body}</body></html>`);
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(pathToFileURL(html).href);
  return page;
}
const boxed = (px, el) => `<div id="box" style="inline-size:${px}px">${renderToStaticMarkup(el)}</div>`;
const cols = (page, sel) => page.locator(sel).evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(" ").length);
const TABLE = { columns: [{ key: "m", label: "Month" }, { key: "v", label: "Value", numeric: true }], rows: [{ m: "Sep", v: 412 }] };
const dash = h(Dashboard, { title: "Billing overview",
  tiles: ["Unbilled", "Billed", "Collected", "Debt"].map((l) => h(StatTile, { key: l, label: l, value: "£1k" })),
  charts: ["By month", "By office"].map((t) => h(ChartFrame, { key: t, title: t, table: TABLE }, h("div", { style: { blockSize: "120px" } }))) });
const report = h(ReportViewer, { title: "Aged debt", parameters: h("p", null, "params"), applied: [{ label: "Office", value: "London" }],
  results: h("table", { className: "piq-table" }, h("thead", null, h("tr", null, h("th", null, "Client"))), h("tbody", null, ...Array.from({ length: 120 }, (_, i) => h("tr", { key: i }, h("td", null, `Client ${i}`))))), onExport: () => {} });

before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); rmSync(tmp, { recursive: true, force: true }); });

describe("US-028 in Chromium", () => {
  // @covers US-028-AC1
  test("AC1: in 390, 720 and 1366px containers the grid is one, two and four columns, with tiles two-up at compact", async () => {
    const expected = { 390: { tiles: 2, charts: 1 }, 720: { tiles: 2, charts: 2 }, 1366: { tiles: 4, charts: 2 } };
    for (const [w, e] of Object.entries(expected)) {
      const page = await open(boxed(Number(w), dash), { width: 1440 });
      assert.deepEqual({ tiles: await cols(page, ".piq-dashboard__tiles"), charts: await cols(page, ".piq-dashboard__charts") }, e, `${w}px`);
      await page.close();
    }
  });

  // @covers US-028-AC6
  test("AC6: the applied parameters are visible above the results at every size", async () => {
    for (const w of [390, 720, 1366]) {
      const page = await open(boxed(w, report), { width: 1440 });
      const r = await page.evaluate(() => { const a = document.querySelector(".piq-report__applied").getBoundingClientRect(), t = document.querySelector(".piq-report__results table").getBoundingClientRect(); return { shown: a.width > 0 && a.height > 0, above: a.bottom <= t.top + 0.5 }; });
      assert.deepEqual(r, { shown: true, above: true }, `${w}px`);
      await page.close();
    }
  });

  // @covers US-028-AC7
  test("AC7: printed, the page has no navigation or actions and the table header repeats", async () => {
    const page = await open(renderToStaticMarkup(h(AppShell, { nav: [{ id: "r", label: "Reports", href: "#r", icon: "download" }], current: "r", brand: h("strong", null, "Acme") }, report)), { width: 1366 });
    const visible = async () => page.evaluate(() => Object.fromEntries([".piq-shell__top", ".piq-shell__side", ".piq-shell__bar", ".piq-page-header__actions", ".piq-report__actions"].map((s) => [s, document.querySelector(s).checkVisibility()])));
    const screen = await visible();
    assert.equal(screen[".piq-shell__top"] && screen[".piq-page-header__actions"], true, "on screen they show");
    await page.emulateMedia({ media: "print" });
    assert.deepEqual(Object.values(await visible()), [false, false, false, false, false], "printed, they do not");
    assert.equal(await page.locator(".piq-report__results thead").evaluate((t) => getComputedStyle(t).display), "table-header-group");
    const pdf = await page.pdf({ format: "A4" });
    assert.ok(pdf.length > 1000, "it prints");
    await page.close();
  });
});
