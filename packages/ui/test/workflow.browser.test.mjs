/* The wizard's size classes in Chromium (US-035-AC1): a step list from the
   medium size class, a progress bar below it.

     npm run build && npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TextField } from "../dist/index.js";
import { Wizard } from "../dist/patterns.js";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const SHEETS = [join(PKG, "../tokens/dist/themes.css"), join(PKG, "dist/ui.css"), join(PKG, "dist/patterns.css")];
const tmp = mkdtempSync(join(tmpdir(), "wizard-"));
let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); rmSync(tmp, { recursive: true, force: true }); });

// @covers US-035-AC1
test("US-035-AC1: the step list shows from the medium size class; below it a progress bar takes its place", async () => {
  const markup = renderToStaticMarkup(h(Wizard, { steps: ["Client", "Matter", "Billing", "Team", "Review"].map((t) => ({ id: t, title: t, content: h(TextField, { label: t, name: t }) })) }));
  for (const [w, list, bar] of [[390, false, true], [720, true, false]]) {
    const html = join(tmp, `w${w}.html`);
    writeFileSync(html, `<!doctype html><html data-theme="praxis-carbon"><head>${SHEETS.map((s) => `<link rel="stylesheet" href="${pathToFileURL(s)}">`).join("")}</head><body><div style="inline-size:${w}px">${markup}</div></body></html>`);
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(pathToFileURL(html).href);
    const r = await page.evaluate(() => ({ list: document.querySelector(".piq-wizard__steps").checkVisibility(), bar: document.querySelector('.piq-wizard__progress [role="progressbar"]').checkVisibility() }));
    assert.deepEqual(r, { list, bar }, `${w}px`);
    await page.close();
  }
});
