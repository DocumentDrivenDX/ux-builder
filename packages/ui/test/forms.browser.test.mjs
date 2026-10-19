/* Forms in a real browser (US-027-AC1, AC5, AC6): built CSS in Chromium; the
   sticky actions and the modal against a bundled fixture app, so the
   behaviour runs as in an app.

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
import { TextField } from "../dist/index.js";
import { FormPage } from "../dist/patterns.js";
import { bundleFixture } from "./bundle.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const SHEETS = [join(PKG, "../tokens/dist/themes.css"), join(PKG, "dist/ui.css"), join(PKG, "dist/patterns.css")];
const tmp = mkdtempSync(join(tmpdir(), "forms-"));
let browser, appJs;

async function open(body, { width = 1280, height = 800, touch = false } = {}) {
  const html = join(tmp, `p-${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(html, `<!doctype html><html data-theme="praxis-carbon" data-appearance="light"><head><meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content">${SHEETS.map((s) => `<link rel="stylesheet" href="${pathToFileURL(s)}">`).join("")}<style>body{margin:0}</style></head><body>${body}</body></html>`);
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
  await page.goto(pathToFileURL(html).href);
  return page;
}
const app = () => `<div id="root"></div><script src="${pathToFileURL(appJs)}"></script>`;

before(async () => { browser = await chromium.launch(); appJs = await bundleFixture("form-app", tmp); });
after(async () => { await browser?.close(); rmSync(tmp, { recursive: true, force: true }); });

describe("US-027 in Chromium", () => {
  // @covers US-027-AC1
  test("AC1: at every size the fields are one column, labels above, and the form is no wider than the form width", async () => {
    const markup = renderToStaticMarkup(h(FormPage, { title: "New matter" }, ...["Client", "Matter", "Owner"].map((l) => h(TextField, { key: l, label: l }))));
    for (const width of [390, 720, 1024, 1920]) {
      const page = await open(markup, { width });
      const r = await page.evaluate(() => {
        const px = (v) => { const d = document.createElement("div"); d.style.inlineSize = v; document.body.append(d); const w = d.getBoundingClientRect().width; d.remove(); return w; };
        const fields = [...document.querySelectorAll(".piq-form-page__fields .piq-field")].map((f) => ({ left: f.getBoundingClientRect().left, top: f.getBoundingClientRect().top, labelAbove: f.querySelector("label").getBoundingClientRect().bottom <= f.querySelector("input").getBoundingClientRect().top + 0.5 }));
        return { fields, form: document.querySelector("form").getBoundingClientRect().width, max: px("var(--piq-size-content-form)") };
      });
      assert.ok(r.fields.every((f) => f.left === r.fields[0].left), `${width}: one column`);
      assert.ok(r.fields.every((f, i) => i === 0 || f.top > r.fields[i - 1].top), `${width}: stacked`);
      assert.ok(r.fields.every((f) => f.labelAbove), `${width}: labels above`);
      assert.ok(r.form <= r.max + 0.5, `${width}: form ${r.form}px <= ${r.max}px`);
      await page.close();
    }
  });

  // @covers US-027-AC5
  test("AC5: on a phone, with the keyboard open, Save and Cancel stay in view and never cover the focused field", async () => {
    const page = await open(app(), { width: 390, height: 760, touch: true });
    await page.locator(".piq-form-page__actions").waitFor();
    // The keyboard opens: with interactive-widget=resizes-content the layout viewport shrinks.
    await page.setViewportSize({ width: 390, height: 420 });
    await page.locator(".piq-form-page input").first().focus();
    const seen = [];
    for (let i = 0; i < 12; i++) {
      const r = await page.evaluate(() => {
        const f = document.activeElement, bar = document.querySelector(".piq-form-page__actions").getBoundingClientRect(), fr = f.getBoundingClientRect();
        return { name: f.labels?.[0]?.textContent, covered: fr.bottom > bar.top + 0.5, barInView: bar.bottom <= innerHeight + 0.5 && bar.top >= 0, fieldInView: fr.top >= 0 && fr.bottom <= innerHeight };
      });
      seen.push(r);
      await page.keyboard.press("Tab");
    }
    assert.equal(seen.length, 12);
    for (const r of seen) {
      assert.equal(r.barInView, true, `${r.name}: Save and Cancel in view`);
      assert.equal(r.covered, false, `${r.name}: not under the actions`);
      assert.equal(r.fieldInView, true, `${r.name}: scrolled into view`);
    }
    await page.close();
  });

  // @covers US-027-AC6
  test("AC6: quick add opens as a modal that keeps focus inside, a dialog at 1024px and a full-screen sheet at 390px", async () => {
    for (const [width, cls] of [[1024, "piq-dialog"], [390, "piq-sheet"]]) {
      const page = await open(app(), { width });
      await page.locator("#quick").click();
      const d = page.locator(`dialog.${cls}[open]`);
      await d.waitFor();
      assert.equal(await d.evaluate((x) => x.open && x.matches(":modal")), true, `${width}: modal`);
      if (cls === "piq-sheet") assert.deepEqual(await d.evaluate((x) => { const r = x.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }), [390, 800]);
      const outside = [];
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press("Tab");
        const where = await page.evaluate(() => { const e = document.activeElement; return e === document.body ? "body" : e.closest("dialog[open]") ? "inside" : e.outerHTML.slice(0, 50); });
        if (where !== "inside" && where !== "body") outside.push(where);
      }
      assert.deepEqual(outside, [], `${width}: focus never leaves the modal for the page`);
      await page.keyboard.press("Escape");
      assert.equal(await page.evaluate(() => document.activeElement?.id), "quick", `${width}: focus back on Quick add`);
      await page.close();
    }
  });
});
