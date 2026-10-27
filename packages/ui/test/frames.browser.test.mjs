/* The app frames a person chooses from (US-162-AC1): AppShell's frame in a
   real browser at compact, medium and expanded widths, with the built theme
   CSS, ui.css and patterns.css in Chromium.

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
import { AppShell } from "../dist/patterns.js";
import { FRAMES, frameFor } from "../blueprint/modalities.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const SHEETS = [join(PKG, "../tokens/dist/themes.css"), join(PKG, "dist/ui.css"), join(PKG, "dist/patterns.css")];
const tmp = mkdtempSync(join(tmpdir(), "frames-"));
let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); rmSync(tmp, { recursive: true, force: true }); });

const NAV = ["Map", "Saved", "Trips"].map((label) => ({ id: label.toLowerCase(), label, href: `/${label.toLowerCase()}`, icon: "home" }));
async function at(frame, width) {
  const body = renderToStaticMarkup(h(AppShell, { nav: NAV, current: "map", frame, brand: h("strong", null, "Rivers") }, h("p", null, "Content")));
  const html = join(tmp, `${frame}-${width}.html`);
  writeFileSync(html, `<!doctype html><html data-theme="praxis-carbon" data-appearance="light"><head><meta name="viewport" content="width=device-width, initial-scale=1">${SHEETS.map((s) => `<link rel="stylesheet" href="${pathToFileURL(s)}">`).join("")}<style>body{margin:0}</style></head><body>${body}</body></html>`);
  const page = await browser.newPage({ viewport: { width, height: 700 } });
  await page.goto(pathToFileURL(html).href);
  const seen = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== "none" && e.getBoundingClientRect().width > 0; }, sel);
  const r = { top: await seen(".piq-shell__top"), side: await seen(".piq-shell__side"), bar: await seen(".piq-shell__bar"), topnav: await seen(".piq-shell__topnav"), mainLeft: await page.evaluate(() => document.querySelector(".piq-shell__main").getBoundingClientRect().left) };
  await page.close();
  return r;
}

describe("US-162: the app frame is the person's choice", () => {
  // @covers US-162-AC1
  test("AC1: each frame draws only its own chrome, at every width", async () => {
    assert.deepEqual(Object.keys(FRAMES), ["screen", "top-bar", "top-nav", "side-nav"]);
    assert.deepEqual([0, 1, 2, 5, 6].map(frameFor), ["screen", "screen", "top-nav", "top-nav", "side-nav"]);
    for (const w of [390, 768, 1280]) {
      // Just the screen: no top bar and no navigation; the content starts at the left edge.
      assert.deepEqual(await at("screen", w), { top: false, side: false, bar: false, topnav: false, mainLeft: 0 }, `screen at ${w}`);
      // Top bar, no menu.
      assert.deepEqual(await at("top-bar", w), { top: true, side: false, bar: false, topnav: false, mainLeft: 0 }, `top-bar at ${w}`);
    }
    // Top navigation: the bottom bar on a phone, the destinations across the top from medium up.
    assert.deepEqual(await at("top-nav", 390), { top: true, side: false, bar: true, topnav: false, mainLeft: 0 });
    for (const w of [768, 1280]) assert.deepEqual(await at("top-nav", w), { top: true, side: false, bar: false, topnav: true, mainLeft: 0 }, `top-nav at ${w}`);
    // Side navigation, the default: unchanged.
    assert.deepEqual(await at("side-nav", 390), { top: true, side: false, bar: true, topnav: false, mainLeft: 0 });
    const wide = await at("side-nav", 1280);
    assert.deepEqual([wide.side, wide.bar], [true, false]);
    assert.ok(wide.mainLeft > 0, "the side column takes the left");
    assert.deepEqual(await at(undefined, 1280), wide, "side-nav is the default");
  });
});
