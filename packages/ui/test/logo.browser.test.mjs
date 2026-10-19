/* Logo and favicon in a real browser (US-010-AC8, AC9, AC11): the built theme CSS and ui.css
   in Chromium, with <Logo />'s markup as it renders before detection
   (artwork) and after (text), so the cascade itself decides what is drawn.

     npm run build && npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const THEMES = join(PKG, "../tokens/dist/themes.css");
const UI = join(PKG, "dist/ui.css");
const tmp = mkdtempSync(join(tmpdir(), "logo-"));
let browser, page;

const cell = (id, theme, appearance, cls = "") =>
  `<div data-theme="${theme}"${appearance ? ` data-appearance="${appearance}"` : ""}><span id="${id}" role="img" class="piq-logo piq-logo--logo ${cls}"></span></div>`;

before(async () => {
  const body = [
    cell("praxis-light", "praxis", "light"),
    cell("praxis-dark", "praxis", "dark"),
    cell("carbon-dark", "praxis-carbon", "dark"),
    cell("plain", "plain", "light"),
    cell("plain-text", "plain", "light", "piq-logo--text"),
  ].join("");
  const html = join(tmp, "page.html");
  writeFileSync(html, `<!doctype html><link rel="stylesheet" href="${pathToFileURL(THEMES)}"><link rel="stylesheet" href="${pathToFileURL(UI)}"><body>${body}</body>`);
  browser = await chromium.launch();
  page = await browser.newPage();
  await page.goto(pathToFileURL(html).href);
});
after(async () => { await browser?.close(); rmSync(tmp, { recursive: true, force: true }); });

const style = (id) => page.locator(`#${id}`).evaluate((el) => {
  const c = getComputedStyle(el);
  return { image: c.backgroundImage, height: c.height, width: parseFloat(c.width), color: c.color, token: c.getPropertyValue("--piq-brand-logo-image").trim() };
});

/* Whether a computed background-image's URL loads as an image. */
const loads = (image) => page.evaluate((src) => new Promise((ok) => {
  const img = new Image();
  img.onload = () => ok(img.naturalWidth > 0);
  img.onerror = () => ok(false);
  img.src = src;
}), /url\("?([^")]+)"?\)/.exec(image)?.[1] ?? "");

// @covers US-010-AC8
test("AC8: the theme's artwork is drawn at the brand's height, the dark artwork in dark", async () => {
  const light = await style("praxis-light"), dark = await style("praxis-dark"), carbon = await style("carbon-dark");
  assert.match(light.image, /praxis\/logo-v2-on-light\.svg/);
  assert.match(dark.image, /praxis\/logo-v2-on-dark\.svg/);
  assert.match(carbon.image, /praxis\/logo-v2-on-dark\.svg/, "Praxis on Carbon is still Praxis");
  for (const s of [light, dark]) assert.ok(await loads(s.image), `${s.image} loads`);
  assert.equal(light.height, "37px");
  assert.ok(Math.abs(light.width - 37 * 3.029) < 1, `aspect from the brand: ${light.width}`);
});

// @covers US-010-AC9
test("AC9: a brand without artwork has no image token; its wordmark takes the logo colour", async () => {
  const bare = await style("plain"), text = await style("plain-text");
  assert.equal(bare.token, "none", "no artwork (the registered initial value), so Logo falls back to text");
  assert.equal(text.image, "none");
  assert.equal(text.color, "rgb(31, 41, 55)", "#1F2937, the brand's logo paint");
});

// @covers US-010-AC11
test("AC11: a theme's favicon token computes to an absolute URL that loads; a theme without one has none", async () => {
  const favicon = (id) => page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).getPropertyValue("--piq-brand-favicon").trim());
  for (const id of ["praxis-light", "praxis-dark", "carbon-dark"]) {
    const value = await favicon(id);
    assert.match(value, /^url\("file:\/\/\/.+\/brand\/praxis\/mark-v2\.svg"\)$/, id);
    assert.ok(await loads(value), `${id}: ${value} loads`);
  }
  assert.equal(await favicon("plain"), "none");
});
