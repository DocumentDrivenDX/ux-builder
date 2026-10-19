/* The app shell and breadcrumbs in a real browser (US-024-AC3, AC4, AC8):
   built theme CSS, ui.css and patterns.css in Chromium, so window size,
   container width, touch input and focus behave as they would for a user.

     npm run build && npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Breadcrumbs, Button, MenuButton } from "../dist/index.js";
import { AppShell } from "../dist/patterns.js";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const SHEETS = [join(PKG, "../tokens/dist/themes.css"), join(PKG, "dist/ui.css"), join(PKG, "dist/patterns.css")];
const tmp = mkdtempSync(join(tmpdir(), "nav-"));
let browser;

const NAV = ["Home", "Matters", "Billing", "Clients", "Reports", "Settings"].map((label, i) => ({ id: label.toLowerCase(), label, href: `/${label.toLowerCase()}`, icon: ["home", "view", "copy", "user", "download", "settings"][i] }));
const CRUMBS = [{ label: "Clients", href: "/clients" }, { label: "Acme", href: "/clients/acme" }, { label: "Matters" }];
const shell = (content) => renderToStaticMarkup(h(AppShell, {
  nav: NAV, current: "matters", brand: h("strong", null, "Acme Legal"),
  actions: h(MenuButton, { label: "Account", variant: "text", items: [{ label: "Sign out" }] }),
  breadcrumbs: h(Breadcrumbs, { items: CRUMBS }),
}, content ?? h("p", null, "Content")));

async function open(body, { width, theme = "praxis-carbon", touch = false }) {
  const html = join(tmp, `p-${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(html, `<!doctype html><html data-theme="${theme}" data-appearance="light"><head><meta name="viewport" content="width=device-width, initial-scale=1">${SHEETS.map((s) => `<link rel="stylesheet" href="${pathToFileURL(s)}">`).join("")}<style>body{margin:0}</style></head><body>${body}</body></html>`);
  const page = await browser.newPage({ viewport: { width, height: 800 }, hasTouch: touch, isMobile: touch });
  await page.goto(pathToFileURL(html).href);
  return page;
}
const shown = (page, sel) => page.locator(sel).first().evaluate((e) => getComputedStyle(e).display !== "none" && e.getBoundingClientRect().width > 0);

before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); rmSync(tmp, { recursive: true, force: true }); });

describe("US-024 in Chromium", () => {
  // @covers US-024-AC3
  test("AC3: a bottom bar and drawer at 390px, a rail at 720px, the side navigation at 1366px, with the same destinations in order", async () => {
    const labels = (page, sel) => page.locator(sel).evaluateAll((xs) => xs.map((x) => x.textContent));
    const p390 = await open(shell(), { width: 390 });
    assert.equal(await shown(p390, ".piq-shell__bar"), true);
    assert.equal(await shown(p390, ".piq-shell__side"), false);
    assert.deepEqual(await labels(p390, ".piq-shell__bar .piq-shell__bar-label"), ["Home", "Matters", "Billing", "Clients", "More"]);
    assert.deepEqual(await labels(p390, "dialog .piq-primary-nav__label"), NAV.map((n) => n.label), "the drawer holds them all");
    await p390.close();

    for (const [width, direction] of [[720, "column"], [1366, "row"]]) {
      const page = await open(shell(), { width });
      assert.equal(await shown(page, ".piq-shell__bar"), false, `${width}: no bottom bar`);
      assert.equal(await shown(page, ".piq-shell__side"), true, `${width}: side navigation`);
      assert.deepEqual(await labels(page, ".piq-shell__side .piq-primary-nav__label"), NAV.map((n) => n.label));
      assert.equal(await page.locator(".piq-shell__side .piq-primary-nav__link").first().evaluate((a) => getComputedStyle(a).flexDirection), direction, `${width}: ${direction === "column" ? "a rail" : "a labelled side menu"}`);
      if (width === 1366) assert.equal(Math.round(await page.locator(".piq-shell__side").evaluate((s) => s.getBoundingClientRect().width)), 256, "Carbon's side menu is 16rem");
      await page.close();
    }
    // Material chooses the rail at expanded size too (ADR-022).
    const material = await open(shell(), { width: 1366, theme: "praxis-material" });
    assert.equal(await material.locator(".piq-shell__side .piq-primary-nav__link").first().evaluate((a) => getComputedStyle(a).flexDirection), "column");
    assert.equal(Math.round(await material.locator(".piq-shell__side").evaluate((s) => s.getBoundingClientRect().width)), 80);
    await material.close();
  });

  // @covers US-024-AC4
  test("AC4: breadcrumbs show the trail at expanded size and only the link to the parent at compact size", async () => {
    const wide = await open(shell(), { width: 1024 });
    assert.equal(await shown(wide, ".piq-breadcrumbs__list"), true);
    assert.equal(await shown(wide, ".piq-breadcrumbs__back"), false);
    await wide.close();
    const narrow = await open(shell(), { width: 390 });
    assert.equal(await shown(narrow, ".piq-breadcrumbs__list"), false);
    assert.equal(await shown(narrow, ".piq-breadcrumbs__back"), true);
    assert.equal(await narrow.locator(".piq-breadcrumbs__back").evaluate((a) => [a.textContent, a.getAttribute("href")].join(" ")), "Acme /clients/acme");
    await narrow.close();
  });

  // @covers US-024-AC8
  test("AC8: on touch, every control in the shell is at least the touch-target size, none is hover-only, and no bar covers the focused control", async () => {
    const content = h("div", null, ...Array.from({ length: 30 }, (_, i) => h("p", { key: `p${i}` }, `Paragraph ${i + 1} of the matter's notes.`)), h(Button, { id: "last" }, "Save"));
    const page = await open(shell(content), { width: 390, touch: true });
    assert.equal(await page.evaluate(() => matchMedia("(pointer: coarse)").matches), true);
    const target = await page.evaluate(() => { const d = document.createElement("div"); d.style.blockSize = "var(--piq-size-target-touch)"; document.body.append(d); const v = d.getBoundingClientRect().height; d.remove(); return v; });
    assert.ok(target >= 44, `touch target token ${target}px`);

    const seen = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const f = await page.evaluate(() => {
        const e = document.activeElement;
        if (!e || e === document.body) return null;
        const r = e.getBoundingClientRect();
        const top = document.querySelector(".piq-shell__top").getBoundingClientRect(), bar = document.querySelector(".piq-shell__bar").getBoundingClientRect();
        const inMain = !!e.closest(".piq-shell__main");
        return { name: e.textContent.trim() || e.getAttribute("aria-label"), h: r.height, w: r.width, covered: inMain && (r.top < top.bottom - 0.5 || r.bottom > bar.top + 0.5), id: e.id };
      });
      if (!f || seen.some((s) => s.name === f.name && s.id === f.id)) break;
      seen.push(f);
    }
    assert.ok(seen.length >= 8, `tabbed through ${seen.length} controls`);
    assert.ok(seen.some((f) => f.id === "last"), "reached the last control in the content");
    for (const f of seen) {
      assert.ok(f.h >= target - 0.5 && f.w >= target - 0.5, `${f.name}: ${f.w}x${f.h} >= ${target}`);
      assert.equal(f.covered, false, `${f.name} is not covered by a bar`);
    }

    // Nothing appears only on hover: no :hover rule shows or reveals anything.
    for (const css of [join(PKG, "dist/ui.css"), join(PKG, "dist/patterns.css")].map((f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, ""))) {
      for (const [, sel, body] of css.matchAll(/([^{}]*:hover[^{}]*)\{([^}]*)\}/g)) assert.doesNotMatch(body, /\b(display|visibility|opacity)\s*:/, `hover-only content: ${sel.trim()}`);
    }
    await page.close();
  });

  test("adapt=\"container\": the shell follows its frame, not the window, for previews and embeds", async () => {
    const framed = (px) => `<div id="f" style="inline-size:${px}px;block-size:600px">${renderToStaticMarkup(h(AppShell, { nav: NAV, current: "matters", adapt: "container", brand: h("strong", null, "Acme") }, h("p", null, "Content")))}</div>`;
    for (const [px, bar, side, direction] of [[390, true, false, null], [720, false, true, "column"], [1024, false, true, "row"]]) {
      const page = await open(framed(px), { width: 1440 });
      assert.equal(await shown(page, ".piq-shell__bar"), bar, `${px}px frame in a 1440px window: bottom bar`);
      assert.equal(await shown(page, ".piq-shell__side"), side, `${px}px: side navigation`);
      if (direction) assert.equal(await page.locator(".piq-shell__side .piq-primary-nav__link").first().evaluate((a) => getComputedStyle(a).flexDirection), direction);
      assert.equal(Math.round(await page.locator(".piq-shell").evaluate((s) => s.getBoundingClientRect().height)), 600, "fills its frame's height");
      await page.close();
    }
    // The default still follows the window: a 390px box in a 1440px window shows the desktop navigation.
    const page = await open(`<div style="inline-size:390px">${shell()}</div>`, { width: 1440 });
    assert.equal(await shown(page, ".piq-shell__side"), true);
    await page.close();
  });
});
