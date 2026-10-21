/* The audit's interaction and IA checks and its baseline (FEAT-008 AUD-01 to
   AUD-03; US-054, US-052-AC3, AC4): pages built with one of each mistake,
   loading the built @ux-builder/tokens and @ux-builder/ui CSS over HTTP.

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { audit, toBaseline } from "../audit.mjs";
import { html as renderHtml } from "../report.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const FILES = { "/themes.css": join(PKG, "../tokens/dist/themes.css"), "/fonts.css": join(PKG, "../tokens/dist/fonts.css"), "/ui.css": join(PKG, "../ui/dist/ui.css") };
const tmp = mkdtempSync(join(tmpdir(), "audit-ia-"));
let server, base;

const page = (body, script = "") => `<!doctype html><html lang="en" data-theme="praxis-carbon" data-appearance="light"><head><meta charset="utf-8"><title>t</title>
<link rel="stylesheet" href="/themes.css"><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/ui.css">
<style>body { margin: 0; font-family: var(--piq-font-body); color: var(--piq-color-text); background: var(--piq-color-ground); } p { margin: 0 0 1em; }</style>
</head><body>${body}<script>${script}</script></body></html>`;
const LONG = "Entries flagged by the time rules wait here for a partner to review them before prebill closes on Friday afternoon, ".repeat(4);
const links = (n) => `<ul>${Array.from({ length: n }, (_, i) => `<li><a href="#d${i}">Destination ${i + 1}</a></li>`).join("")}</ul>`;

const PAGES = {
  "/two-modals.html": page(`<main><p>Behind</p></main>
    <dialog id="first" aria-label="Edit matter"><button>Cancel</button></dialog>
    <dialog id="second" aria-label="Pick a client"><button>Close</button></dialog>`,
  `document.getElementById("first").showModal(); document.getElementById("second").showModal();`),
  "/bad-modal.html": page(`<main><p>Behind</p></main><div id="trap" role="dialog" aria-modal="true"><p>No name and no way out.</p><button>Save</button></div>`),
  "/good-modal.html": page(`<main><p>Behind</p></main><dialog id="ok"><h2>Rename</h2><form method="dialog"><button class="piq-btn">Rename</button><button class="piq-btn piq-btn--secondary">Cancel</button></form></dialog>`,
    `document.getElementById("ok").showModal();`),
  "/primary.html": page(`<main><h1>Matters</h1><button id="save" class="piq-btn">Save</button><button id="send" class="piq-btn">Send</button><button class="piq-btn piq-btn--secondary">Discard</button>
    <div data-audit-ignore><button class="piq-btn">Ignored</button></div><p style="max-inline-size: none">${LONG}</p></main>`),
  "/primary-per-dialog.html": page(`<main><button class="piq-btn">Behind</button></main>
    <div role="dialog" aria-modal="true" aria-label="A"><button class="piq-btn">OK</button><button class="piq-btn piq-btn--text">Cancel</button></div>
    <div role="dialog" aria-modal="true" aria-label="B"><button class="piq-btn">OK</button><button class="piq-btn piq-btn--text">Cancel</button></div>`),
  "/many-destinations.html": page(`<nav id="top" aria-label="Primary">${links(7)}</nav><nav aria-label="Breadcrumb" class="piq-breadcrumbs">${links(7)}</nav><main><p>Home</p></main>`),
  "/menu-nav.html": page(`<header><button id="menu" aria-haspopup="dialog" aria-label="Menu" aria-controls="drawer">☰</button></header>
    <div id="drawer" hidden><nav aria-label="Primary">${links(4)}</nav></div><main><p>Home</p></main>`),
  "/lines.html": page(`<main><p id="wide">${LONG}</p><p id="narrow" style="max-inline-size: 60ch">${LONG}</p></main>`),
};

before(async () => {
  server = createServer((req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    if (PAGES[path]) { res.writeHead(200, { "content-type": "text/html" }); res.end(PAGES[path]); return; }
    const file = FILES[path] ?? (path.startsWith("/fonts/") || path.startsWith("/brand/") ? join(PKG, "../tokens/dist", path) : null);
    if (!file || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": { ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2" }[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server?.close(); rmSync(tmp, { recursive: true, force: true }); });

// Async, so this process's page server keeps answering while the command runs.
const cliRun = (args) => new Promise((resolve) => {
  const c = spawn(process.execPath, [join(PKG, "cli.mjs"), ...args], { cwd: PKG });
  let stdout = "", stderr = "";
  c.stdout.on("data", (d) => { stdout += d; }); c.stderr.on("data", (d) => { stderr += d; });
  c.on("close", (status) => resolve({ status, stdout, stderr }));
});
const OPTS = { themes: ["praxis-carbon"], appearances: ["light"], contrast: false, rules: { brand: false } };
const run = (paths, more = {}) => audit({ urls: paths.map((p) => `${base}${p}`), ...OPTS, ...more });
const of = (r, rule, path) => r.findings.filter((f) => f.rule === rule && (!path || f.url.endsWith(path)));

describe("US-054: the audit checks structure and interaction", () => {
  // @covers US-054-AC1
  test("AC1: two modals open at once are reported, naming both", async () => {
    const f = of(await run(["/two-modals.html"]), "one-modal");
    assert.equal(f.length, 1);
    assert.match(f[0].message, /2 modal dialogs.*"Edit matter".*"Pick a client"/);
  });

  // @covers US-054-AC2
  test("AC2: a modal with no name, no dismiss control, that Escape does not close", async () => {
    const r = await run(["/bad-modal.html", "/good-modal.html"]);
    const bad = of(r, "modal-contract", "/bad-modal.html");
    assert.deepEqual(bad.map((f) => f.property).sort(), ["dismiss", "escape", "name"], JSON.stringify(bad, null, 1));
    assert.ok(bad.every((f) => f.selector === "#trap"));
    assert.deepEqual(of(r, "modal-contract", "/good-modal.html"), [], "a named dialog with a form[method=dialog] that Escape closes passes");
  });

  // @covers US-054-AC3
  test("AC3: two primary buttons in a region are reported; one per dialog is not", async () => {
    const r = await run(["/primary.html", "/primary-per-dialog.html"]);
    const f = of(r, "one-primary-action", "/primary.html");
    assert.equal(f.length, 1);
    assert.match(f[0].message, /2 primary buttons in one page region: "Save", "Send"/);
    assert.deepEqual(of(r, "one-primary-action", "/primary-per-dialog.html"), []);
  });

  // @covers US-054-AC4
  test("AC4: too many destinations when compact; navigation behind a menu when expanded", async () => {
    const r = await run(["/many-destinations.html", "/menu-nav.html"], { widths: [390, 1280] });
    const many = of(r, "nav-per-breakpoint", "/many-destinations.html");
    assert.equal(many.length, 1, JSON.stringify(many, null, 1));
    assert.equal(many[0].selector, "#top", "the breadcrumb is not navigation between destinations");
    assert.deepEqual(many[0].runs, ["praxis-carbon/light@390"]);
    assert.equal(many[0].ruleId, "nav.compact-destinations");
    const menu = of(r, "nav-per-breakpoint", "/menu-nav.html");
    assert.equal(menu.length, 1, JSON.stringify(menu, null, 1));
    assert.deepEqual(menu[0].runs, ["praxis-carbon/light@1280"]);
    assert.equal(menu[0].ruleId, "nav.standing-at-expanded");
    assert.equal(of(await run(["/many-destinations.html"]), "nav-per-breakpoint").length, 0, "only with --width");
  });

  // @covers US-054-AC5
  test("AC5: lines past the limit are reported with their characters per line", async () => {
    const f = of(await run(["/lines.html"]), "line-length");
    assert.equal(f.length, 1);
    assert.equal(f[0].selector, "#wide");
    assert.ok(Number(f[0].value) > 80, f[0].value);
    assert.match(f[0].message, new RegExp(`about ${f[0].value} characters`));
  });

  // @covers US-054-AC6
  test("AC6: findings carry their rule and sources, the HTML links them, and they are warnings that exit 0", async () => {
    const r = await run(["/two-modals.html", "/primary.html"]);
    const ours = r.findings.filter((f) => ["one-modal", "modal-contract", "one-primary-action", "nav-per-breakpoint", "line-length"].includes(f.rule));
    assert.ok(ours.length >= 3);
    for (const f of ours) {
      assert.equal(f.severity, "warning");
      assert.match(f.ruleId, /^[a-z]+\./);
      assert.ok(f.sources.length && f.sources.every((s) => s.title && /^https:/.test(s.url)));
    }
    const page = renderHtml(r);
    for (const s of ours[0].sources) assert.ok(page.includes(`<a href="${s.url}">`), s.url);
    const out = join(tmp, "cli");
    const cli = await cliRun(["--theme", "praxis-carbon", "--appearance", "light", "--no-contrast", "--off", "brand", "--out", out, `${base}/primary.html`]);
    assert.equal(cli.status, 0, cli.stderr + cli.stdout);
    const json = JSON.parse(readFileSync(join(out, "report.json"), "utf8"));
    assert.ok(json.findings.some((f) => f.rule === "one-primary-action" && f.ruleId === "emphasis.one-primary" && f.sources.length));
  });
});

describe("US-052: adopting the audit in an existing app", () => {
  // @covers US-052-AC3
  test("AC3: --write-baseline writes every finding in a stable order", async () => {
    const file = join(tmp, "baseline.json");
    const cli = await cliRun([...["--theme", "praxis-carbon", "--appearance", "light", "--no-contrast", "--off", "brand", "--out", join(tmp, "wb")], "--write-baseline", file, `${base}/primary.html`, `${base}/lines.html`]);
    assert.equal(cli.status, 0, cli.stderr);
    const b = JSON.parse(readFileSync(file, "utf8"));
    assert.equal(b.tool, "ux-builder-audit");
    const report = JSON.parse(readFileSync(join(tmp, "wb/report.json"), "utf8"));
    assert.equal(b.findings.length, report.findings.filter((f) => f.severity !== "info").length);
    const sorted = [...b.findings].sort((x, y) => x.rule.localeCompare(y.rule) || x.url.localeCompare(y.url) || (x.selector ?? "").localeCompare(y.selector ?? ""));
    assert.deepEqual(b.findings, sorted);
    assert.deepEqual(toBaseline(report), b, "the same findings give the same file");
  });

  // @covers US-052-AC4
  test("AC4: baselined findings are not new and do not fail; new ones are; fixed ones are resolved", async () => {
    const first = await run(["/primary.html", "/lines.html"]);
    const baseline = toBaseline(first);
    const lines = baseline.findings.filter((f) => f.rule === "line-length");
    assert.ok(lines.length && baseline.findings.some((f) => f.rule === "one-primary-action"));
    baseline.findings = baseline.findings.filter((f) => f.rule !== "line-length");
    baseline.findings.push({ rule: "one-modal", url: `${base}/primary.html`, selector: "#gone", runs: [] });
    baseline.findings.push({ rule: "retired-check", url: `${base}/primary.html`, selector: "#x", runs: [] });
    const second = await run(["/primary.html", "/lines.html"], { baseline });
    assert.equal(of(second, "one-primary-action").length, 0, "known: not reported as new");
    assert.equal(of(second, "line-length").length, lines.length, "not in the baseline: reported");
    assert.deepEqual(second.resolved.map((b) => b.selector), ["#gone"]);
    assert.equal(second.summary.resolved, 1);
    assert.equal(second.summary.baselined, baseline.findings.length - 2);
    assert.match(second.baselineIgnored[0], /retired-check/);
    // The exit code: with every finding baselined, even --fail-on warning passes.
    const file = join(tmp, "all.json");
    writeFileSync(file, JSON.stringify(toBaseline(await run(["/primary.html"]))));
    const args = ["--theme", "praxis-carbon", "--appearance", "light", "--no-contrast", "--off", "brand", "--fail-on", "warning", "--out", join(tmp, "bl"), `${base}/primary.html`];
    assert.equal((await cliRun(args)).status, 1);
    assert.equal((await cliRun([...args, "--baseline", file])).status, 0);
  });
});
