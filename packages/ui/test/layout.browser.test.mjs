/* The layout primitives in a real browser (US-023-AC2 to AC6): the built
   theme CSS, ui.css and patterns.css in Chromium, with the primitives' own
   markup, so container queries, gaps, reflow and right-to-left are what a
   user would get.

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
import { Cluster, Grid, Page, SplitView, Stack } from "../dist/patterns.js";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const SHEETS = [join(PKG, "../tokens/dist/themes.css"), join(PKG, "dist/ui.css"), join(PKG, "dist/patterns.css")];
const tmp = mkdtempSync(join(tmpdir(), "layout-"));
let browser;

const card = (i) => h("div", { className: "card", style: { blockSize: "40px", background: "currentColor" } }, String(i));
const kitchenSink = () => h(Page, { as: "main" },
  h(Stack, { gap: 5 },
    h("h1", null, "Matters"),
    h(Cluster, { gap: 2 }, ...["New matter", "Import", "Export", "Archive", "Assign"].map((t) => h("button", { key: t }, t))),
    h(Grid, { gap: 4 }, ...[1, 2, 3, 4, 5, 6].map(card)),
    h(SplitView, { primary: h("ul", null, h("li", null, "Acme v. Doe")), secondary: h("article", null, "Detail"), primaryLabel: "List", secondaryLabel: "Detail" })));

async function open(body, { width = 1280, dir = "ltr", theme = "praxis-carbon" } = {}) {
  const html = join(tmp, `page-${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(html, `<!doctype html><html dir="${dir}" data-theme="${theme}" data-appearance="light"><head>${SHEETS.map((s) => `<link rel="stylesheet" href="${pathToFileURL(s)}">`).join("")}<style>body{margin:0}</style></head><body>${body}</body></html>`);
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(pathToFileURL(html).href);
  return page;
}
const boxed = (px, el) => `<div id="box" style="inline-size:${px}px">${renderToStaticMarkup(el)}</div>`;
const tracks = (page, sel) => page.locator(sel).evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(" ").length);

before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); rmSync(tmp, { recursive: true, force: true }); });

describe("US-023 in Chromium", () => {
  // @covers US-023-AC2
  test("AC2: every gap between children equals one of the active theme's space tokens", async () => {
    for (const theme of ["praxis-carbon", "praxis-material", "databricks"]) {
      const page = await open(boxed(900, h("div", null,
        h(Stack, { gap: 3, id: "s" }, card(1), card(2)),
        h(Cluster, { gap: 5, id: "c" }, card(1), card(2)),
        h(Grid, { gap: 6, id: "g", columns: 3 }, card(1), card(2), card(3)))), { theme });
      const got = await page.evaluate(() => {
        const px = (v) => { const d = document.createElement("div"); d.style.inlineSize = v; document.body.append(d); const w = d.getBoundingClientRect().width; d.remove(); return w; };
        const token = (n) => px(`var(--piq-space-${n})`);
        const gap = (sel) => parseFloat(getComputedStyle(document.querySelector(sel)).rowGap);
        const colGap = (sel) => parseFloat(getComputedStyle(document.querySelector(sel)).columnGap);
        return { stack: [gap("#s"), token(3)], cluster: [colGap("#c"), token(5)], grid: [colGap("#g"), token(6)] };
      });
      for (const [k, [actual, expected]] of Object.entries(got)) {
        assert.ok(expected > 0, `${theme}: --piq-space token for ${k} is set`);
        assert.equal(actual, expected, `${theme}: ${k} gap`);
      }
      await page.close();
    }
  });

  // @covers US-023-AC3
  test("AC3: a grid in a 480px container in a 1920px window lays out in the compact class", async () => {
    const page = await open(boxed(480, h(Grid, null, card(1), card(2), card(3), card(4))), { width: 1920 });
    assert.equal(await tracks(page, ".piq-grid__items"), 1);
    await page.locator("#box").evaluate((b) => { b.style.inlineSize = "1366px"; });
    assert.equal(await tracks(page, ".piq-grid__items"), 4, "the large class at 1366px");
    await page.locator("#box").evaluate((b) => { b.style.inlineSize = "700px"; });
    assert.equal(await tracks(page, ".piq-grid__items"), 2, "the medium class at 700px");
    await page.close();
  });

  // @covers US-023-AC4
  test("AC4: a split view shows one pane below 840px and both side by side from 840px", async () => {
    const page = await open(boxed(839, h(SplitView, { primary: "List", secondary: "Detail", show: "secondary" })));
    const panes = () => page.locator(".piq-split__pane").evaluateAll((ps) => ps.map((p) => ({ shown: getComputedStyle(p).display !== "none", top: p.getBoundingClientRect().top, left: p.getBoundingClientRect().left })));
    let [p, s] = await panes();
    assert.deepEqual([p.shown, s.shown], [false, true], "839px: only the pane show names");
    await page.locator("#box").evaluate((b) => { b.style.inlineSize = "840px"; });
    [p, s] = await panes();
    assert.deepEqual([p.shown, s.shown], [true, true], "840px: both");
    assert.equal(p.top, s.top, "side by side");
    assert.ok(p.left < s.left, "primary first");
    await page.close();
  });

  // @covers US-023-AC5
  test("AC5: a page of every primitive at 320 CSS px has no horizontal scroll and clips nothing", async () => {
    const page = await open(renderToStaticMarkup(kitchenSink()), { width: 320 });
    const m = await page.evaluate(() => ({
      scroll: document.scrollingElement.scrollWidth,
      view: document.documentElement.clientWidth,
      overflow: [...document.querySelectorAll("main *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > document.documentElement.clientWidth + 0.5 || r.left < -0.5); }).map((e) => e.outerHTML.slice(0, 60)),
    }));
    assert.ok(m.scroll <= m.view, `scrollWidth ${m.scroll} <= ${m.view}`);
    assert.deepEqual(m.overflow, []);
    await page.close();
  });

  // @covers US-023-AC6
  test("AC6: in a right-to-left document the panes and the cluster mirror", async () => {
    const markup = boxed(1000, h("div", null,
      h(SplitView, { primary: "List", secondary: "Detail" }),
      h(Cluster, { id: "c" }, h("button", { id: "first" }, "First"), h("button", null, "Second"))));
    const place = async (dir) => {
      const page = await open(markup, { dir });
      const r = await page.evaluate(() => {
        const [p, s] = [...document.querySelectorAll(".piq-split__pane")].map((e) => e.getBoundingClientRect());
        const box = document.querySelector("#box").getBoundingClientRect(), first = document.querySelector("#first").getBoundingClientRect();
        return { primaryLeft: p.left, secondaryLeft: s.left, firstFromStart: first.left - box.left, firstFromEnd: box.right - first.right, width: box.width };
      });
      await page.close();
      return r;
    };
    const ltr = await place("ltr"), rtl = await place("rtl");
    assert.ok(ltr.primaryLeft < ltr.secondaryLeft && rtl.primaryLeft > rtl.secondaryLeft, "panes swap sides");
    assert.ok(Math.abs(ltr.firstFromStart - rtl.firstFromEnd) < 1, "the first button sits at the start edge in both");
  });
});
