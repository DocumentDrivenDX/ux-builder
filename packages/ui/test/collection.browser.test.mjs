/* The collection list in a real browser (US-025-AC2, AC3, AC7): the built
   theme CSS, ui.css and patterns.css in Chromium, so container size classes,
   the sticky bulk bar, focus scrolling and row heights are what a user gets.

     npm run build && npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { bundleFixture } from "./bundle.mjs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, Checkbox } from "../dist/index.js";
import { CollectionList, FilterSection } from "../dist/patterns.js";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const SHEETS = [join(PKG, "../tokens/dist/themes.css"), join(PKG, "dist/ui.css"), join(PKG, "dist/patterns.css")];
const tmp = mkdtempSync(join(tmpdir(), "collection-"));
let browser;

const COLUMNS = [
  { key: "name", label: "Matter", priority: true },
  { key: "client", label: "Client", priority: true },
  { key: "owner", label: "Owner" },
  { key: "value", label: "Value", numeric: true },
];
const ROWS = Array.from({ length: 20 }, (_, i) => ({ id: `m${i}`, name: `Matter ${i + 21}`, client: i % 2 ? "Acme" : "Globex", owner: "R. Lee", value: 1000 + i }));
const list = (props = {}) => h(CollectionList, {
  title: "Matters", actions: h(Button, null, "New matter"), columns: COLUMNS, rows: ROWS,
  selectable: true, selected: [], onSelectedChange: () => {},
  bulkActions: [h(Button, { key: "a", variant: "secondary" }, "Assign"), h(Button, { key: "b", variant: "secondary" }, "Archive")],
  rowActions: () => [{ label: "Open" }],
  search: "", onSearchChange: () => {}, filters: [{ id: "open", label: "Status: Open" }], onRemoveFilter: () => {}, onClearFilters: () => {},
  filterPanel: h(FilterSection, { title: "Status" }, h(Checkbox, { label: "Open" })),
  page: 2, pageSize: 20, total: 312, onPageChange: () => {}, ...props,
});

async function open(body, { width = 1280, theme = "praxis-carbon", touch = false } = {}) {
  const html = join(tmp, `p-${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(html, `<!doctype html><html data-theme="${theme}" data-appearance="light"><head><meta name="viewport" content="width=device-width, initial-scale=1">${SHEETS.map((s) => `<link rel="stylesheet" href="${pathToFileURL(s)}">`).join("")}<style>body{margin:0}</style></head><body>${body}</body></html>`);
  const page = await browser.newPage({ viewport: { width, height: 800 }, hasTouch: touch, isMobile: touch });
  await page.goto(pathToFileURL(html).href);
  return page;
}
const boxed = (px, el) => `<div id="box" style="inline-size:${px}px">${renderToStaticMarkup(el)}</div>`;
const shown = (page, sel) => page.locator(sel).first().evaluate((e) => getComputedStyle(e).display !== "none" && e.getBoundingClientRect().width > 0);

let appJs;

before(async () => { browser = await chromium.launch(); appJs = await bundleFixture("collection-app", tmp); });
after(async () => { await browser?.close(); rmSync(tmp, { recursive: true, force: true }); });

describe("US-025 in Chromium", () => {
  // @covers US-025-AC2
  test("AC2: in a 390px container rows are stacked items with the priority columns, the bar is search plus Filters (1), and the filters open full screen", async () => {
    const page = await open(boxed(390, list()), { width: 1280 });
    assert.equal(await shown(page, ".piq-collection__items"), true);
    assert.equal(await shown(page, ".piq-collection__table-wrap"), false);
    assert.equal(await shown(page, ".piq-filter-bar__chips"), false, "no chips at compact");
    assert.equal(await page.locator(".piq-filter-bar__open").evaluate((b) => b.textContent.trim()), "Filters (1)");
    assert.deepEqual(await page.locator(".piq-collection__item").first().locator(".piq-collection__fields > p").evaluateAll((ps) => ps.map((p) => p.textContent)), ["Matter 21", "Client: Globex"]);
    // The list measures compact before it is measured, so its filters are a sheet: open it as the button would.
    const box = await page.locator("dialog.piq-sheet").evaluate((d) => { d.showModal(); const r = d.getBoundingClientRect(); return { w: r.width, h: r.height, vw: innerWidth, vh: innerHeight, side: d.dataset.side }; });
    assert.equal(box.side, "full");
    assert.ok(Math.abs(box.w - box.vw) < 1 && Math.abs(box.h - box.vh) < 1, `the sheet fills the screen: ${box.w}x${box.h}`);
    await page.close();

    for (const [w, ownerShown] of [[700, false], [1024, true]]) {
      const p = await open(boxed(w, list()), { width: 1280 });
      assert.equal(await shown(p, ".piq-collection__table-wrap"), true, `${w}: a table`);
      assert.equal(await shown(p, ".piq-collection__items"), false);
      assert.equal(await shown(p, ".piq-filter-bar__chips"), true);
      const headers = await p.locator("thead th").evaluateAll((ths) => ths.filter((t) => getComputedStyle(t).display !== "none").map((t) => t.textContent.trim()).filter(Boolean));
      assert.equal(headers.includes("Owner"), ownerShown, `${w}: Owner column ${ownerShown ? "shown" : "hidden until expanded"}`);
      assert.ok(headers.includes("Matter") && headers.includes("Client"));
      await p.close();
    }
  });

  // @covers US-025-AC3
  test("AC3: at compact size in the app shell the bulk bar sits at the bottom and never covers the control that has focus", async () => {
    const page = await open(`<div id="root"></div><script src="${pathToFileURL(appJs)}"></script>`, { width: 390, touch: true });
    await page.locator(".piq-bulk-bar").waitFor();
    const bar = await page.locator(".piq-bulk-bar").evaluate((b) => ({ text: b.querySelector(".piq-bulk-bar__count").textContent, pos: getComputedStyle(b).position }));
    assert.deepEqual(bar, { text: "3 selected", pos: "sticky" });
    // Tab from the first row's checkbox through the rest of the list.
    await page.locator(".piq-collection__item input[type=checkbox]").first().focus();
    const covered = [];
    let steps = 0;
    for (; steps < 60; steps++) {
      const r = await page.evaluate(() => {
        const e = document.activeElement, b = document.querySelector(".piq-bulk-bar");
        if (!e || !e.closest(".piq-collection") || e.closest(".piq-bulk-bar")) return { done: !e?.closest(".piq-collection") };
        const er = e.getBoundingClientRect(), br = b.getBoundingClientRect(), main = document.querySelector(".piq-shell__main").getBoundingClientRect();
        return { name: e.getAttribute("aria-label") || e.textContent.trim(), overlap: er.bottom > br.top + 0.5 && er.top < br.bottom, inView: er.top >= main.top - 0.5 && er.bottom <= main.bottom + 0.5 };
      });
      if (r.done) break;
      if (r.name && (r.overlap || !r.inView)) covered.push(r.name);
      await page.keyboard.press("Tab");
    }
    assert.ok(steps > 20, `tabbed through ${steps} controls`);
    assert.deepEqual(covered, [], "no focused control under the bar or out of view");
    const atBottom = await page.evaluate(() => { const b = document.querySelector(".piq-bulk-bar").getBoundingClientRect(), m = document.querySelector(".piq-shell__main").getBoundingClientRect(); return Math.abs(b.bottom - m.bottom) < 1; });
    assert.equal(atBottom, true, "stuck to the bottom of the screen's content area");
    await page.close();
  });

  // @covers US-025-AC7
  test("AC7: while loading, skeleton rows take the loaded rows' space, so the rows arrive without shifting the page", async () => {
    for (const theme of ["praxis-carbon", "praxis", "praxis-material"]) {
      const measure = async (props) => {
        const page = await open(boxed(1024, list(props)), { theme });
        const m = await page.evaluate(() => {
          const t = document.querySelector(".piq-collection__table");
          return { header: t.querySelector("thead").getBoundingClientRect().height, rows: [...t.querySelectorAll("tbody tr")].map((r) => r.getBoundingClientRect().height), top: t.getBoundingClientRect().top };
        });
        await page.close();
        return m;
      };
      const loading = await measure({ status: "loading", rows: [] }), ready = await measure({});
      assert.equal(loading.rows.length, ready.rows.length, theme);
      assert.equal(Math.round(loading.top), Math.round(ready.top), `${theme}: the table starts at the same place`);
      assert.ok(Math.abs(loading.header - ready.header) < 1, `${theme}: header ${loading.header} vs ${ready.header}`);
      const total = (a) => a.reduce((x, y) => x + y, 0);
      const shift = Math.abs(total(loading.rows) - total(ready.rows)) / total(ready.rows);
      assert.ok(shift <= 0.05, `${theme}: skeleton rows ${total(loading.rows)}px vs rows ${total(ready.rows)}px (${(shift * 100).toFixed(1)}%)`);
    }
  });
});
