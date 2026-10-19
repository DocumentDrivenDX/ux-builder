/* A print layout printed by Chromium (US-040-AC5): table headers repeat,
   each section starts a new page, and the shell's navigation and actions
   are left out.

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
import { Button } from "../dist/index.js";
import { AppShell, PageHeader, PrintLayout } from "../dist/patterns.js";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const SHEETS = [join(PKG, "../tokens/dist/themes.css"), join(PKG, "dist/ui.css"), join(PKG, "dist/patterns.css")];
const tmp = mkdtempSync(join(tmpdir(), "print-"));
let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); rmSync(tmp, { recursive: true, force: true }); });

const table = h("table", { className: "piq-table" }, h("thead", null, h("tr", null, h("th", null, "Client"), h("th", null, "Over 90 days"))),
  h("tbody", null, ...Array.from({ length: 120 }, (_, i) => h("tr", { key: i }, h("td", null, `Client ${i + 1}`), h("td", null, `£${(i + 1) * 100}`)))));

// @covers US-040-AC5
test("US-040-AC5: printed, table headers repeat, each section starts a page, and navigation and actions are left out", async () => {
  const body = renderToStaticMarkup(h(AppShell, { nav: [{ id: "r", label: "Reports", href: "#r", icon: "download" }], current: "r", brand: h("strong", null, "Acme") },
    h(PageHeader, { title: "Reports", actions: h(Button, null, "Export") }),
    h(PrintLayout, { title: "Aged debt", runDate: "2026-10-19T09:00:00", sections: [{ id: "a", title: "By client", content: table }, { id: "b", title: "By partner", content: h("p", null, "Partners") }] })));
  const html = join(tmp, "p.html");
  writeFileSync(html, `<!doctype html><html data-theme="praxis-carbon" data-appearance="light"><head>${SHEETS.map((s) => `<link rel="stylesheet" href="${pathToFileURL(s)}">`).join("")}</head><body style="margin:0">${body}</body></html>`);
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(pathToFileURL(html).href);
  await page.emulateMedia({ media: "print" });
  const r = await page.evaluate(() => ({
    thead: getComputedStyle(document.querySelector(".piq-print thead")).display,
    first: getComputedStyle(document.querySelectorAll(".piq-print__section")[0]).breakBefore,
    second: getComputedStyle(document.querySelectorAll(".piq-print__section")[1]).breakBefore,
    hidden: [".piq-shell__top", ".piq-shell__side", ".piq-shell__bar", ".piq-page-header__actions"].map((s) => document.querySelector(s).checkVisibility()),
    header: document.querySelector(".piq-print__header").checkVisibility(),
  }));
  assert.deepEqual(r, { thead: "table-header-group", first: "auto", second: "page", hidden: [false, false, false, false], header: true });
  const pdf = await page.pdf({ format: "A4" });
  const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  assert.ok(pages >= 3, `${pages} pages: a long table over several, and the second section on its own`);
  await page.close();
});
