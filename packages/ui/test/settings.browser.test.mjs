/* The settings screen in a real browser (US-029-AC1, AC6): built CSS in
   Chromium; AC6 against a bundled fixture app in a box the test narrows.

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
import { SettingsPage } from "../dist/patterns.js";
import { bundleFixture } from "./bundle.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const SHEETS = [join(PKG, "../tokens/dist/themes.css"), join(PKG, "dist/ui.css"), join(PKG, "dist/patterns.css")];
const tmp = mkdtempSync(join(tmpdir(), "settings-"));
let browser, appJs;

async function open(body) {
  const html = join(tmp, `p-${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(html, `<!doctype html><html data-theme="praxis-carbon" data-appearance="light"><head><meta name="viewport" content="width=device-width, initial-scale=1">${SHEETS.map((s) => `<link rel="stylesheet" href="${pathToFileURL(s)}">`).join("")}<style>body{margin:0}</style></head><body>${body}</body></html>`);
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(pathToFileURL(html).href);
  return page;
}

before(async () => { browser = await chromium.launch(); appJs = await bundleFixture("settings-app", tmp); });
after(async () => { await browser?.close(); rmSync(tmp, { recursive: true, force: true }); });

describe("US-029 in Chromium", () => {
  // @covers US-029-AC1
  test("AC1: from expanded size the section navigation sits beside the current section", async () => {
    const page = await open(`<div style="inline-size:1200px">${renderToStaticMarkup(h(SettingsPage, { sections: [{ id: "p", label: "Profile", content: h("p", null, "Profile") }, { id: "n", label: "Notifications", content: h("p", null, "N") }] }))}</div>`);
    const r = await page.evaluate(() => { const nav = document.querySelector(".piq-settings__nav").getBoundingClientRect(), sec = document.querySelector(".piq-settings__section:not([hidden])").getBoundingClientRect(); return { side: nav.right <= sec.left && Math.abs(nav.top - sec.top) < 60, back: getComputedStyle(document.querySelector(".piq-settings__back")).display }; });
    assert.deepEqual(r, { side: true, back: "none" });
    await page.close();
  });

  // @covers US-029-AC6
  test("AC6: when the container narrows below 840px the open section stays open with its Back link, and typed input is kept", async () => {
    const page = await open(`<div id="box" style="inline-size:1200px"><div id="root"></div></div><script src="${pathToFileURL(appJs)}"></script>`);
    await page.locator("#name").fill("R. Lee");
    await page.locator("#box").evaluate((b) => { b.style.inlineSize = "700px"; });
    await page.waitForTimeout(100);
    const r = await page.evaluate(() => ({
      section: document.querySelector(".piq-settings__section:not([hidden]) h2")?.checkVisibility() && document.querySelector(".piq-settings__section:not([hidden]) h2").textContent,
      list: document.querySelector(".piq-settings__nav").checkVisibility(),
      back: document.querySelector(".piq-settings__back").checkVisibility(),
      value: document.querySelector("#name").value,
    }));
    assert.deepEqual(r, { section: "Profile", list: false, back: true, value: "R. Lee" });
    await page.close();
  });
});
