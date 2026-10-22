/* A diagram drawn only from the FEAT-017 tokens passes the audit in every
   theme and appearance (US-112-AC7): status chips, a series legend, nested
   regions holding a node, an edge in each weight and the three lifecycle
   tints. The page loads the built @ux-builder/tokens CSS over HTTP, as an
   app would, and is switched through every theme the package ships.

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { audit } from "../audit.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(PKG, "../tokens/dist");
const manifest = JSON.parse(readFileSync(join(DIST, "manifest.json"), "utf8"));
const THEMES = manifest.themes.map((t) => t.name);
let server, base;

const PROVIDER = `<script>
addEventListener("piq:set-theme", (e) => { const app = document.getElementById("app"); app.dataset.theme = e.detail.theme; app.dataset.appearance = e.detail.appearance; });
</script>`;
const v = (n) => `var(--piq-${n})`;
const chip = (s) => `<span class="chip" style="background:${v(`color-status-${s}-subtle`)}"><span class="dot" style="background:${v(`color-status-${s}`)}"></span>${s}</span>`;
const series = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<li><span class="swatch" style="background:${v(`color-series-${i}`)}"></span>Series ${i}</li>`).join("");
const node = `<div class="node">praxis<br><small>Databricks App</small></div>`;
const region = (i, inner) => `<div class="region" style="background:${v(`color-diagram-region-${i}`)}"><b>Region ${i}</b>${inner}</div>`;
const edge = (kind, width, style) => `<div class="edge"><span style="border-top:${v(width)} ${style} ${v(`color-diagram-${kind}`)}"></span>${kind}</div>`;
const part = (s) => `<div class="node" style="background:${v(`color-lifecycle-${s}`)};border-style:dashed">${s}</div>`;

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Diagram tokens</title>
<link rel="stylesheet" href="/themes.css"><link rel="stylesheet" href="/fonts.css">
<style>
.shell { min-height: 100vh; padding: var(--piq-space-5); display: grid; gap: var(--piq-space-4); background: var(--piq-color-ground); color: var(--piq-color-text); font-family: var(--piq-font-body); }
.row { display: flex; flex-wrap: wrap; gap: var(--piq-space-3); align-items: center; }
.chip { display: inline-flex; align-items: center; gap: var(--piq-space-2); padding: var(--piq-space-1) var(--piq-space-3); border-radius: var(--piq-radius-diagram-node); }
.dot { width: 8px; height: 8px; border-radius: 50%; }
ul { list-style: none; margin: 0; padding: 0; }
.swatch { display: inline-block; width: 12px; height: 12px; margin-inline-end: var(--piq-space-2); border-radius: var(--piq-radius-diagram-node); }
.region { padding: var(--piq-space-3); border-radius: var(--piq-radius-diagram-node); display: grid; gap: var(--piq-space-2); }
.node { padding: var(--piq-space-2) var(--piq-space-3); background: var(--piq-color-surface); border: var(--piq-size-diagram-stroke) solid var(--piq-color-diagram-edge-strong); border-radius: var(--piq-radius-diagram-node); }
.edge { display: flex; align-items: center; gap: var(--piq-space-2); }
.edge span { width: 64px; }
</style>${PROVIDER}</head><body style="margin:0"><div id="app" class="shell" data-theme="${THEMES[0]}">
<div class="row">${["positive", "caution", "negative", "info"].map(chip).join("")}</div>
<ul class="row">${series}</ul>
${region(1, region(2, region(3, node)))}
<div class="row">${edge("edge-strong", "size-diagram-stroke-strong", "solid")}${edge("edge", "size-diagram-stroke", "solid")}${edge("edge-muted", "size-diagram-stroke", "dashed")}</div>
<div class="row">${["placeholder", "decided", "unknown"].map(part).join("")}</div>
</div></body></html>`;

before(async () => {
  server = createServer((req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    if (path === "/diagram.html") { res.writeHead(200, { "content-type": "text/html" }); res.end(PAGE); return; }
    const file = { "/themes.css": join(DIST, "themes.css"), "/fonts.css": join(DIST, "fonts.css") }[path] ?? (path.startsWith("/fonts/") || path.startsWith("/brand/") ? join(DIST, path) : null);
    if (!file || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": { ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png" }[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server?.close());

// @covers US-112-AC7
test("US-112-AC7: a diagram drawn only from the diagram tokens passes the audit in every theme and appearance", async () => {
  const r = await audit({ urls: [`${base}/diagram.html`], themes: THEMES });
  const expected = manifest.themes.flatMap((t) => t.appearances.map((ap) => `${t.name}/${ap}`)).sort();
  assert.deepEqual(r.runs.map((x) => `${x.theme}/${x.appearance}`).sort(), expected);
  // The favicon and logo checks are about the app's chrome, which this page has none of.
  const findings = r.findings.filter((f) => f.check !== "brand");
  assert.deepEqual(findings.filter((f) => f.severity === "error"), [], JSON.stringify(findings, null, 1));
  assert.deepEqual(findings.filter((f) => f.severity === "warning"), [], JSON.stringify(findings, null, 1));
});
