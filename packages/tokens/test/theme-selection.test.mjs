/* Selecting a theme in a real browser (US-005-AC1, US-005-AC2; CONTRACT-003,
   ADR-018). The built themes.css and ui.css are loaded in Chromium, and for
   every theme the custom properties the browser computes are compared with
   that theme's resolved values: so the cascade itself, not just the
   composer, is what is tested.

     npm run build && npm test --workspace @ux-builder/tokens */

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(PKG, "dist");
const UI = join(PKG, "../ui/dist/ui.css");
const manifest = JSON.parse(readFileSync(join(DIST, "manifest.json"), "utf8"));
const resolved = (t, ap) => JSON.parse(readFileSync(join(DIST, "resolved", `${t}.${ap}.json`), "utf8")).tokens;
const norm = (v) => String(v).replace(/\s+/g, " ").replace(/\s*,\s*/g, ",").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").trim().toLowerCase();
let browser, page;
const tmp = mkdtempSync(join(tmpdir(), "theme-selection-"));

before(async () => {
  // One element per theme and appearance, and one per theme with no data-appearance.
  const cells = manifest.themes.flatMap((t) => [
    ...t.appearances.map((ap) => `<div data-theme="${t.name}" data-appearance="${ap}" id="${t.name}--${ap}"><button class="piq-btn">Go</button></div>`),
    `<div data-theme="${t.name}" id="${t.name}--default"><button class="piq-btn">Go</button></div>`,
  ]).join("\n");
  const html = join(tmp, "page.html");
  writeFileSync(html, `<!doctype html><link rel="stylesheet" href="${pathToFileURL(join(DIST, "themes.css"))}"><link rel="stylesheet" href="${pathToFileURL(UI)}"><body>${cells}</body>`);
  browser = await chromium.launch();
  page = await browser.newPage();
  await page.goto(pathToFileURL(html).href);
});
after(async () => { await browser?.close(); rmSync(tmp, { recursive: true, force: true }); });

/* Every --piq-* value the element computes, against the resolved JSON. */
async function compare(id, expected) {
  const keys = Object.keys(expected).filter((k) => k.startsWith("piq-") && !String(expected[k]).startsWith("url("));
  const got = await page.locator(`#${id}`).evaluate((el, ks) => Object.fromEntries(ks.map((k) => [k, getComputedStyle(el).getPropertyValue(`--${k}`)])), keys);
  const wrong = keys.filter((k) => norm(got[k]) !== norm(expected[k])).map((k) => `--${k}: ${got[k].trim()} (expected ${expected[k]})`);
  return { count: keys.length, wrong };
}

// @covers US-005-AC1
test("US-005-AC1: data-theme with an appearance shows that theme's brand in its anatomy, for every theme and appearance", async () => {
  let checked = 0;
  for (const t of manifest.themes) for (const ap of t.appearances) {
    const { count, wrong } = await compare(`${t.name}--${ap}`, resolved(t.name, ap));
    assert.deepEqual(wrong, [], `${t.name} ${ap}`);
    checked += count;
  }
  assert.ok(checked > manifest.themes.length * 150, `${checked} values checked`);
  // The widgets draw from them: a button's fill is the theme's structure colour.
  const t = manifest.themes.find((x) => x.name === "praxis-carbon");
  for (const ap of t.appearances) {
    const hex = resolved("praxis-carbon", ap)["piq-color-structure"];
    const bg = await page.locator(`#praxis-carbon--${ap} .piq-btn`).evaluate((el) => getComputedStyle(el).backgroundColor);
    assert.equal(bg, `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`, ap);
  }
});

// @covers US-005-AC2
test("US-005-AC2: data-theme alone applies the theme's default appearance in full", async () => {
  for (const t of manifest.themes) {
    const { wrong } = await compare(`${t.name}--default`, resolved(t.name, t.default));
    assert.deepEqual(wrong, [], `${t.name} (default ${t.default})`);
  }
});

test("every theme's resolved files are covered", () => {
  const files = readdirSync(join(DIST, "resolved")).filter((f) => f.split(".").length === 3);
  assert.equal(files.length, manifest.themes.reduce((n, t) => n + t.appearances.length, 0));
});
