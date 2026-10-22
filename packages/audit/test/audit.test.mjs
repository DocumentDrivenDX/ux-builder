/* @ux-builder/audit against pages built for it (US-022-AC1 to AC7): a clean
   page made only of SDK widgets and role tokens, a page with one of each
   mistake, and an app that does not answer the theme switch. The pages
   load the built @ux-builder/tokens and @ux-builder/ui CSS over HTTP, as an app
   would.

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, Card, Icon, Logo, Notice, StatusPill, TextField } from "@ux-builder/ui";
import { audit } from "../audit.mjs";
import { html as renderHtml } from "../report.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const FILES = { "/themes.css": join(PKG, "../tokens/dist/themes.css"), "/fonts.css": join(PKG, "../tokens/dist/fonts.css"), "/ui.css": join(PKG, "../ui/dist/ui.css") };
const THEMES = ["praxis-carbon", "databricks"];
const tmp = mkdtempSync(join(tmpdir(), "audit-"));
let server, base;

// What the top-level ThemeProvider does on "piq:set-theme": switch, and keep the favicon on the theme's.
const PROVIDER = `<script>
addEventListener("piq:set-theme", (e) => {
  const app = document.getElementById("app");
  app.dataset.theme = e.detail.theme; app.dataset.appearance = e.detail.appearance;
  const m = /url\\(\\s*(?:"((?:[^"\\\\]|\\\\.)*)"|'((?:[^'\\\\]|\\\\.)*)'|([^\\s"'()]+))\\s*\\)/.exec(getComputedStyle(app).getPropertyValue("--piq-brand-favicon"));
  const href = m && (m[1] ?? m[2] ?? m[3]).replace(/\\\\(.)/g, "$1");
  let link = document.querySelector("link[data-piq-favicon]");
  if (!href) { link?.remove(); return; }
  if (!link) { link = document.createElement("link"); link.rel = "icon"; link.setAttribute("data-piq-favicon", ""); document.head.append(link); }
  link.href = href;
});
</script>`;
const page = (body, { head = "", provider = true } = {}) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title>
<link rel="stylesheet" href="/themes.css"><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/ui.css">
<style>.shell { min-height: 100vh; padding: var(--piq-space-5); display: grid; gap: var(--piq-space-4); background: var(--piq-color-ground); color: var(--piq-color-text); font-family: var(--piq-font-body); }</style>
${head}${provider ? PROVIDER : ""}</head><body style="margin:0"><div id="app" class="shell" data-theme="praxis-carbon" data-appearance="light">${body}</div></body></html>`;

const sdk = renderToStaticMarkup(h("div", { className: "shell-inner" },
  h(Logo), h(Notice, { tone: "info", title: "Prebill closes Friday" }),
  h(Card, { title: "Matters", actions: h(Button, null, h(Icon, { name: "add" }), " Add matter") }, h(TextField, { label: "Search", defaultValue: "" })),
  h(StatusPill, { state: "live" })));

const PAGES = {
  "/clean.html": page(`${sdk}<p>Plain text in the theme's own colour and font.</p><div style="padding:var(--piq-space-3);border-radius:var(--piq-radius-card);background:var(--piq-color-surface);border:var(--piq-border-default)">A panel in role tokens</div>`),
  "/dirty.html": page(`${sdk}
    <p id="pink" style="color:#ff00aa">Hard-coded pink</p>
    <div id="comic" style="font-family:'Comic Sans MS', cursive">Wrong font</div>
    <div id="corner" style="border-radius:3px;background:var(--piq-color-surface);padding:8px">Odd corner</div>
    <div class="accent-local">tokens set locally</div>
    <svg id="hand" width="16" height="16" viewBox="0 0 16 16"><path d="M2 2h12v12H2z" fill="currentColor"/></svg>
    <img id="logo" alt="Acme logo" width="120" height="30" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='30'/%3E">
    <button id="native">Plain button</button>
    <div class="MuiButton-root" style="color:var(--piq-color-text)">From MUI</div>
    <div id="loader" style="width:16px;height:16px;animation:spin 1s linear infinite;background:var(--piq-color-structure)"></div>
    <p id="faint" style="color:var(--piq-color-border)">Too faint to read</p>
    <div data-audit-ignore><p style="color:#00ff00">Ignored on purpose</p></div>`,
  { provider: false, head: "<style>.accent-local { --piq-color-accent: red; } .piq-btn { border-radius: 3px; } @keyframes spin { to { transform: rotate(1turn); } }</style>" })
    .replace("</body>", `<p id="outside" style="color:#333">Outside the theme</p>${PROVIDER.replace(/link\.href = href;/, "/* never sets the favicon */")}</body>`),
  "/no-provider.html": page(sdk, { provider: false }),
  // The starter's index.html: a theme on <html> to start with, and a mark the bundler inlined, quotes and brackets in it.
  "/inlined.html": page(sdk, { head: `<style>#app[data-theme="praxis-carbon"] { --piq-brand-favicon: url("data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20fill='url(%23g)'%20d='M0%200h1v1z'/%3e%3c/svg%3e"); }</style>` })
    .replace('<html lang="en">', `<html lang="en" data-theme="databricks" style="--piq-brand-favicon: url('/brand/elsewhere.svg')">`),
};

before(async () => {
  server = createServer((req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    if (PAGES[path]) { res.writeHead(200, { "content-type": "text/html" }); res.end(PAGES[path]); return; }
    const file = FILES[path] ?? (path.startsWith("/fonts/") || path.startsWith("/brand/") ? join(PKG, "../tokens/dist", path) : null);
    if (!file || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": { ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png" }[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server?.close(); rmSync(tmp, { recursive: true, force: true }); });

const of = (r, rule, where) => r.findings.filter((f) => f.check === rule && (!where || (f.selector ?? f.rule_selector ?? "").includes(where) || f.message.includes(where)));

describe("US-022 @ux-builder/audit", () => {
  let dirty;
  before(async () => { dirty = await audit({ urls: [`${base}/dirty.html`], themes: THEMES, out: join(tmp, "dirty") }); });

  // @covers US-022-AC1
  test("AC1: a page of SDK widgets and role tokens passes in every theme and appearance, switched as a user would", async () => {
    const r = await audit({ urls: [`${base}/clean.html`], themes: THEMES });
    assert.deepEqual(r.runs.map((x) => `${x.theme}/${x.appearance}`), ["praxis-carbon/dark", "praxis-carbon/light", "databricks/dark", "databricks/light"]);
    assert.ok(r.runs.every((x) => x.mode === "event"), "switched through the provider's event");
    assert.deepEqual(r.findings.filter((f) => f.severity === "error"), [], JSON.stringify(r.findings, null, 1));
    assert.deepEqual(r.findings.filter((f) => f.severity === "warning"), [], JSON.stringify(r.findings, null, 1));
  });

  // @covers US-022-AC2
  test("AC2: colours, fonts and radii that are not the theme's; a colour the same in every theme is called hard-coded", () => {
    const pink = of(dirty, "token-colors", "#pink");
    assert.equal(pink.length, 1);
    assert.equal(pink[0].severity, "error");
    assert.match(pink[0].message, /#FF00AA is not a colour of this theme/);
    assert.equal(pink[0].runs.length, 4);
    assert.ok(pink[0].everyTheme && /hard-coded/.test(pink[0].message));
    assert.match(of(dirty, "token-fonts", "#comic")[0].message, /Comic Sans MS/);
    assert.equal(of(dirty, "token-radii", "#corner")[0].value, "3px");
    assert.equal(of(dirty, "token-colors", "MuiButton").length, 0, "a token colour passes even on a foreign element");
  });

  // @covers US-022-AC3
  test("AC3: stylesheets that set --piq-* tokens or restyle SDK widgets", () => {
    const t = of(dirty, "token-overrides", ".accent-local");
    assert.equal(t[0].severity, "error");
    assert.match(t[0].message, /--piq-color-accent/);
    const w = of(dirty, "widget-overrides", ".piq-btn");
    assert.equal(w.length, 1);
    assert.equal(w[0].rule_selector, ".piq-btn");
    assert.equal(of(dirty, "widget-overrides", "picker").length, 0, "the SDK's own rules are not the app's");
  });

  // @covers US-022-AC4
  test("AC4: icons, a logo, a loader and controls the app draws itself, and another library's components", () => {
    assert.equal(of(dirty, "sdk-widgets", "#hand")[0].widget, "Icon");
    assert.equal(of(dirty, "sdk-widgets", "#hand")[0].severity, "error");
    assert.equal(of(dirty, "sdk-widgets", "#logo")[0].widget, "Logo");
    assert.equal(of(dirty, "sdk-widgets", "#native")[0].widget, "Button");
    assert.equal(of(dirty, "sdk-widgets", "#loader")[0].widget, "Spinner");
    assert.equal(of(dirty, "foreign-components", "MuiButton")[0].library, "Material UI");
    assert.equal(of(dirty, "outside-theme", "#outside").length, 1);
    assert.equal(dirty.findings.filter((f) => /Ignored|#00FF00/.test(f.message) || (f.selector ?? "").includes("data-audit-ignore")).length, 0, "data-audit-ignore is honoured");
    assert.equal(of(dirty, "sdk-widgets", "piq-").length, 0, "SDK widgets are trusted");
  });

  // @covers US-022-AC5
  test("AC5: a favicon that does not follow the theme; contrast, the app's an error and the SDK's a warning", () => {
    const fav = of(dirty, "brand", "favicon");
    assert.equal(fav[0].severity, "error");
    assert.deepEqual(fav[0].runs.sort(), ["praxis-carbon/dark", "praxis-carbon/light"], "only themes with a favicon");
    const faint = of(dirty, "contrast", "#faint");
    assert.equal(faint[0].severity, "error");
    assert.equal(faint[0].owner, "app");
  });

  // @covers US-022-AC6
  test("AC6: the report: JSON, HTML and a screenshot per run with the findings marked", () => {
    const out = join(tmp, "dirty");
    assert.equal(dirty.runs.length, 4);
    for (const run of dirty.runs) assert.ok(existsSync(join(out, run.screenshot)), run.screenshot);
    assert.ok(dirty.summary.error >= 6 && dirty.summary.warning >= 4, JSON.stringify(dirty.summary));
    const html = renderHtml(dirty);
    assert.match(html, /<title>Theme audit<\/title>/);
    for (const f of dirty.findings) assert.ok(html.includes(`#${f.id}<`), `finding ${f.id} in the HTML`);
    assert.equal(new Set(dirty.findings.map((f) => f.id)).size, dirty.findings.length, "numbers are unique");
  });

  // @covers US-022-AC7
  test("AC7: the CLI exits 1 on errors, 0 with --fail-on never, and writes the reports", async () => {
    // Asynchronous: this process serves the pages the CLI opens.
    const run = (...args) => new Promise((done) => {
      const p = spawn(process.execPath, [join(PKG, "cli.mjs"), ...args], { cwd: tmp });
      let stdout = "", stderr = "";
      p.stdout.on("data", (d) => { stdout += d; });
      p.stderr.on("data", (d) => { stderr += d; });
      p.on("close", (status) => done({ status, stdout, stderr }));
    });
    const bad = await run("--theme", "databricks", "--appearance", "light", "--out", join(tmp, "cli"), `${base}/dirty.html`);
    assert.equal(bad.status, 1, bad.stderr);
    assert.match(bad.stdout, /Theme audit: \d+ errors/);
    assert.ok(existsSync(join(tmp, "cli/index.html")) && existsSync(join(tmp, "cli/report.json")));
    assert.equal((await run("--theme", "databricks", "--appearance", "light", "--no-contrast", "--fail-on", "never", "--out", join(tmp, "cli2"), `${base}/dirty.html`)).status, 0);
    const clean = await run("--theme", "databricks", "--appearance", "light", "--out", join(tmp, "cli3"), `${base}/clean.html`);
    assert.equal(clean.status, 0, clean.stdout + clean.stderr);
    assert.equal((await run("--off", "nonsense", base)).status, 2);
  });

  test("the favicon is checked on the provider's element, not a data-theme on <html>, and an inlined data: URI is read whole", async () => {
    const r = await audit({ urls: [`${base}/inlined.html`], themes: THEMES });
    assert.equal(r.runs.length, 4);
    assert.deepEqual(r.findings.filter((f) => f.check === "brand" && /favicon/.test(f.message)), []);
  });

  test("an app that does not answer the switch is switched by attribute, and says so", async () => {
    const r = await audit({ urls: [`${base}/no-provider.html`], themes: ["databricks"], appearances: ["light"] });
    assert.equal(r.runs[0].mode, "attributes");
    assert.match(of(r, "theme-applied")[0].message, /did not answer the theme switch/);
    assert.equal(of(r, "brand").length, 0, "favicon checks skipped");
  });
});
