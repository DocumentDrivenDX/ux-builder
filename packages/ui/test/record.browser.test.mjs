/* Record detail and list with detail in a real browser (US-026-AC1, AC4,
   AC5): built CSS in Chromium; AC4 against a bundled fixture app, so focus
   behaves as it would when a layout narrows under a user.

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
import { Button } from "../dist/index.js";
import { DescriptionList, ListDetail, RecordDetail } from "../dist/patterns.js";
import { bundleFixture } from "./bundle.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const SHEETS = [join(PKG, "../tokens/dist/themes.css"), join(PKG, "dist/ui.css"), join(PKG, "dist/patterns.css")];
const tmp = mkdtempSync(join(tmpdir(), "record-"));
let browser, appJs;

async function open(body, { width = 1280 } = {}) {
  const html = join(tmp, `p-${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(html, `<!doctype html><html data-theme="praxis-carbon" data-appearance="light"><head><meta name="viewport" content="width=device-width, initial-scale=1">${SHEETS.map((s) => `<link rel="stylesheet" href="${pathToFileURL(s)}">`).join("")}<style>body{margin:0}</style></head><body>${body}</body></html>`);
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  await page.goto(pathToFileURL(html).href);
  return page;
}
const boxed = (px, el) => `<div id="box" style="inline-size:${px}px">${renderToStaticMarkup(el)}</div>`;
const ITEMS = ["Acme v. Beta", "Globex v. Initech"].map((label, i) => ({ id: `r${i}`, label }));

before(async () => { browser = await chromium.launch(); appJs = await bundleFixture("list-detail-app", tmp); });
after(async () => { await browser?.close(); rmSync(tmp, { recursive: true, force: true }); });

describe("US-026 in Chromium", () => {
  // @covers US-026-AC1
  test("AC1: from expanded size the list stays beside the selected record's detail", async () => {
    const markup = (px) => boxed(px, h(ListDetail, { items: ITEMS, selected: "r0", listLabel: "Matters", detail: h(RecordDetail, { title: "Acme v. Beta", actions: h(Button, null, "Edit") }) }));
    const page = await open(markup(1024));
    const r = await page.evaluate(() => { const [l, d] = [...document.querySelectorAll(".piq-split__pane")].map((p) => ({ shown: getComputedStyle(p).display !== "none", top: p.getBoundingClientRect().top, left: p.getBoundingClientRect().left })); return { l, d, back: getComputedStyle(document.querySelector(".piq-list-detail__back")).display }; });
    assert.equal(r.l.shown && r.d.shown, true);
    assert.equal(r.l.top, r.d.top);
    assert.ok(r.l.left < r.d.left);
    assert.equal(r.back, "none", "no Back beside the list");
    await page.close();
  });

  // @covers US-026-AC4
  test("AC4: when two panes become one, focus stays on the element the user was working with in the detail", async () => {
    const page = await open(`<div id="box" style="inline-size:1000px"><div id="root"></div></div><script src="${pathToFileURL(appJs)}"></script>`);
    await page.locator("#edit").waitFor();
    await page.locator("#edit").focus();
    await page.locator("#box").evaluate((b) => { b.style.inlineSize = "800px"; });
    // Wait for the layout to become one pane, not a fixed time (slow CI runners).
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-pane="primary"]')).display === "none" && document.querySelector(".piq-list-detail").dataset.size !== "expanded");
    const after = await page.evaluate(() => ({ id: document.activeElement?.id, visible: !!document.activeElement?.offsetParent, list: getComputedStyle(document.querySelector('[data-pane="primary"]')).display, back: getComputedStyle(document.querySelector(".piq-list-detail__back")).display !== "none" }));
    assert.deepEqual(after, { id: "edit", visible: true, list: "none", back: true });

    // Back to two panes, focus in the list this time: narrowing keeps the list.
    await page.locator("#box").evaluate((b) => { b.style.inlineSize = "1000px"; });
    // The list shows again before it can take focus.
    await page.locator('[role="option"]').first().waitFor({ state: "visible" });
    await page.locator('[role="option"]').first().focus();
    await page.waitForFunction(() => document.activeElement?.getAttribute("role") === "option");
    await page.locator("#box").evaluate((b) => { b.style.inlineSize = "800px"; });
    await page.waitForFunction(() => document.querySelector(".piq-list-detail").dataset.size !== "expanded");
    await page.waitForTimeout(50);
    const list = await page.evaluate(() => ({ role: document.activeElement?.getAttribute("role"), visible: !!document.activeElement?.offsetParent }));
    assert.deepEqual(list, { role: "option", visible: true });
    await page.close();
  });

  // @covers US-026-AC5
  test("AC5: the description list has two columns from medium size and one at compact size", async () => {
    const fields = h(DescriptionList, { items: [{ label: "Client", value: "Acme" }, { label: "Owner", value: "R. Lee" }, { label: "Summary", value: "A long summary", wide: true }] });
    const cols = async (px) => {
      const page = await open(boxed(px, fields));
      const r = await page.locator(".piq-description-list__item").evaluateAll((items) => items.map((i) => ({ top: Math.round(i.getBoundingClientRect().top), w: Math.round(i.getBoundingClientRect().width) })));
      await page.close();
      return r;
    };
    const wide = await cols(700), narrow = await cols(390);
    assert.equal(wide[0].top, wide[1].top, "two columns at 700px");
    assert.ok(wide[2].top > wide[0].top && wide[2].w > wide[0].w * 1.8, "a wide item spans both");
    assert.ok(narrow[1].top > narrow[0].top && narrow[0].w === narrow[1].w, "one column at 390px");
  });
});
