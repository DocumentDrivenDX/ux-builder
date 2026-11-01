/* <Visual> in an app (FEAT-019 M4, US-168): three documents of different kinds drawn by the React
   widget on a page that loads the built theme CSS, as an app would; the theme switched as the
   SDK's ThemeProvider switches it; then the audit run over every theme the package ships.

     npm run build && npm test --workspace @ux-builder/visuals */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";
import { audit } from "../../audit/audit.mjs";
import { fixture } from "./helpers.mjs";

const HERE = fileURLToPath(new URL("..", import.meta.url));
const TOKENS = join(HERE, "../tokens/dist");
const manifest = JSON.parse(readFileSync(join(TOKENS, "manifest.json"), "utf8"));
const DOCS = ["helix-context", "umf-ac-trend", "helix-adr-options"].map(fixture);

// The page's script: the three documents, each in a <Visual>, counting how often each is drawn.
const ENTRY = `
import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { Visual } from "${join(HERE, "react/index.mjs")}";
const docs = ${JSON.stringify(DOCS)};
window.__renders = 0;
createRoot(document.getElementById("visuals")).render(h("div", { className: "visuals" },
  ...docs.map((doc) => h(Visual, { key: doc.extensions["umf.visual"].id, doc, onRender: () => { window.__renders += 1; } }))));
`;
// What the SDK's ThemeProvider does on "piq:set-theme" (as in the audit's own tests).
const PROVIDER = `<script>addEventListener("piq:set-theme", (e) => { const app = document.getElementById("app"); app.dataset.theme = e.detail.theme; app.dataset.appearance = e.detail.appearance; });</script>`;
const page = (body, script = "") => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Visuals in an app</title>
<link rel="stylesheet" href="/themes.css"><link rel="stylesheet" href="/fonts.css">
<style>.shell { min-height: 100vh; padding: var(--piq-space-5); display: grid; gap: var(--piq-space-4); background: var(--piq-color-ground); color: var(--piq-color-text); font-family: var(--piq-font-body); } .visuals { display: grid; gap: var(--piq-space-5); }</style>
${PROVIDER}</head><body style="margin:0"><div id="app" class="shell" data-theme="praxis-carbon" data-appearance="light">${body}</div>${script}</body></html>`;

let server, base, bundle, browser;
before(async () => {
  bundle = (await build({ stdin: { contents: ENTRY, resolveDir: HERE, loader: "js" }, bundle: true, write: false, format: "esm", platform: "browser", define: { "process.env.NODE_ENV": '"production"' }, logLevel: "silent" })).outputFiles[0].text;
  const PAGES = {
    "/visuals.html": page('<div id="visuals"></div>', '<script type="module" src="/visuals.js"></script>'),
    // A diagram the app drew itself: what <Visual> is for.
    "/hand-drawn.html": page('<svg id="hand" width="420" height="200" viewBox="0 0 420 200"><rect x="10" y="10" width="140" height="50" fill="var(--piq-color-surface)" stroke="var(--piq-color-diagram-edge)"/><path d="M150 35 L280 35" stroke="var(--piq-color-diagram-edge)"/><rect x="280" y="10" width="130" height="50" fill="var(--piq-color-surface)" stroke="var(--piq-color-diagram-edge)"/></svg>'),
  };
  server = createServer((req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    if (PAGES[path]) { res.writeHead(200, { "content-type": "text/html" }); res.end(PAGES[path]); return; }
    if (path === "/visuals.js") { res.writeHead(200, { "content-type": "text/javascript" }); res.end(bundle); return; }
    const file = { "/themes.css": join(TOKENS, "themes.css"), "/fonts.css": join(TOKENS, "fonts.css") }[path] ?? (path.startsWith("/fonts/") || path.startsWith("/brand/") ? join(TOKENS, path) : null);
    if (!file || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": { ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png" }[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.close(); });

const open = async () => {
  const p = await browser.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(`${base}/visuals.html`);
  await p.waitForFunction(() => window.__renders === 3, null, { timeout: 30000 });
  return { p, errors };
};
const resolved = (theme, ap) => JSON.parse(readFileSync(join(TOKENS, `resolved/${theme}.${ap}.json`), "utf8")).tokens;
const hex = (rgb) => "#" + rgb.match(/\d+/g).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("").toUpperCase();

test("@covers US-168-AC1 a switch of theme or appearance restyles every <Visual> through its tokens, without drawing it again", async () => {
  const { p, errors } = await open();
  const nodeFill = () => p.evaluate(() => getComputedStyle(document.querySelector('[data-visual="helix-context"] .uxb-node rect')).fill);
  assert.equal(hex(await nodeFill()), resolved("praxis-carbon", "light")["piq-color-surface"].toUpperCase());
  for (const [theme, ap] of [["praxis-carbon", "dark"], ["databricks", "light"], ["databricks", "dark"]]) {
    await p.evaluate(([t, a]) => dispatchEvent(new CustomEvent("piq:set-theme", { detail: { theme: t, appearance: a } })), [theme, ap]);
    assert.equal(hex(await nodeFill()), resolved(theme, ap)["piq-color-surface"].toUpperCase(), `${theme} ${ap}`);
  }
  assert.equal(await p.evaluate(() => window.__renders), 3, "each document was drawn once");
  assert.deepEqual(errors, []);
  await p.close();
});

test("@covers US-168-AC2 each <Visual> is one image named by its title and described by its takeaway, with its text equivalent in reach", async () => {
  const { p } = await open();
  for (const doc of DOCS) {
    const v = doc.extensions["umf.visual"];
    const img = p.getByRole("img", { name: v.title, exact: true });
    assert.equal(await img.count(), 1, v.id);
    assert.equal(await img.evaluate((el) => el.ownerDocument.getElementById(el.getAttribute("aria-describedby")).textContent), v.takeaway ?? v.question);
    const figure = p.locator(`figure[data-visual="${v.id}"]`);
    await figure.getByText("Text version").click();
    assert.match(await figure.locator("pre").textContent(), new RegExp(v.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  await p.close();
});

test("@covers US-168-AC4 the audit reports nothing for <Visual> drawings in any theme and appearance, and still reports a diagram the app draws itself", async () => {
  const themes = manifest.themes.map((t) => t.name);
  const clean = await audit({ urls: [`${base}/visuals.html`], themes });
  assert.equal(clean.runs.length, manifest.themes.reduce((s, t) => s + t.appearances.length, 0));
  // The favicon and logo checks are about the app's chrome, which this page has none of.
  const findings = clean.findings.filter((f) => f.check !== "brand");
  assert.deepEqual(findings.filter((f) => f.severity === "error" || f.severity === "warning"), [], JSON.stringify(findings, null, 1));
  const hand = await audit({ urls: [`${base}/hand-drawn.html`], themes: ["praxis-carbon"] });
  const flagged = hand.findings.filter((f) => f.check === "sdk-widgets" && /<Visual>/.test(f.message));
  assert.equal(flagged.length, 1, JSON.stringify(hand.findings, null, 1));
  assert.equal(flagged[0].severity, "warning");
});
