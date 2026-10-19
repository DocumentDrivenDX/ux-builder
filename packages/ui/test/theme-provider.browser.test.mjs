/* An embedded view inside a themed page, in Chromium (US-011-AC6): a light
   view in a dark page shows light surfaces with dark text. The page's theme
   sets component tokens (a card's background, say) that resolve to its own
   dark colours; the view resets every token it is not given, so they never
   reach it.

     npm run build && npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Card, Notice, Select, ThemeProvider } from "../dist/index.js";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const SHEETS = [join(PKG, "../tokens/dist/themes.css"), join(PKG, "dist/ui.css")];
const tmp = mkdtempSync(join(tmpdir(), "embedded-"));
let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); rmSync(tmp, { recursive: true, force: true }); });

// The role tokens of a light theme only, as a preview composed on a neutral design system has.
const light = JSON.parse(readFileSync(join(PKG, "../tokens/dist/resolved/plain.light.json"), "utf8")).tokens;

// @covers US-011-AC6
test("US-011-AC6: a light embedded view in a dark themed page keeps its own light surfaces and dark text", async () => {
  const view = renderToStaticMarkup(h(ThemeProvider, { tokens: light, appearance: "light", id: "view" },
    h(Card, { title: "Five entries need a look" }),
    h(Select, { label: "Matter", options: [{ value: "a", label: "Halvorsen v. Atlas" }] }),
    h(Notice, { tone: "warning", title: "Two entries over the cap" })));
  const html = join(tmp, "p.html");
  writeFileSync(html, `<!doctype html><html data-theme="synaptiq" data-appearance="dark"><head>${SHEETS.map((s) => `<link rel="stylesheet" href="${pathToFileURL(s)}">`).join("")}</head><body>${view}</body></html>`);
  const page = await browser.newPage();
  await page.goto(pathToFileURL(html).href);
  const r = await page.evaluate(() => {
    const lum = (c) => { const [r, g, b] = c.match(/[\d.]+/g).map(Number); const m = c.startsWith("color(") ? 255 : 1; return (0.2126 * r + 0.7152 * g + 0.0722 * b) * m / 255; };
    const v = document.getElementById("view");
    return [".piq-card", ".piq-card__title", "select", ".piq-notice"].map((s) => { const e = v.querySelector(s), cs = getComputedStyle(e); return { s, bg: lum(cs.backgroundColor === "rgba(0, 0, 0, 0)" ? getComputedStyle(e.closest(".piq-card") ?? v).backgroundColor : cs.backgroundColor), fg: lum(cs.color) }; });
  });
  for (const { s, bg, fg } of r) assert.ok(bg > 0.8 && fg < 0.3, `${s}: light background (${bg.toFixed(2)}) and dark text (${fg.toFixed(2)})`);
  await page.close();
});
