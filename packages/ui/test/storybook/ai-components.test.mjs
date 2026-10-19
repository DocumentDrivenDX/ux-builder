/* The AI Components in Storybook (US-045-AC4): AI Elements and assistant-ui's
   real components, each wearing the theme through the shadcn bridge, render
   in every theme and appearance, make no request outside the page, and the
   audit reports no errors. Runs against the built Storybook:

     npm run build-storybook --workspace @ux-builder/ui && npm run test:storybook --workspace @ux-builder/ui

   The audit's app rules about using SDK widgets (sdk-widgets,
   foreign-components, widget-overrides) are off: these are another
   library's components by design (ADR-023). Syntax-highlighted code keeps
   shiki's colours, a known difference. */

import assert from "node:assert/strict";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { audit } from "../../../audit/audit.mjs";
import { ASSISTANT_UI, ELEMENTS } from "../../../../tools/vendor-ai-elements.mjs";

const PKG = fileURLToPath(new URL("../..", import.meta.url));
const STATIC = join(PKG, "storybook-static");
const manifest = JSON.parse(readFileSync(join(PKG, "../tokens/dist/manifest.json"), "utf8"));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png", ".wasm": "application/wasm" };
let server, base, browser;

before(async () => {
  assert.ok(existsSync(join(STATIC, "index.json")), "build Storybook first: npm run build-storybook --workspace @ux-builder/ui");
  server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
    let file = join(STATIC, path);
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.close(); });

const index = () => JSON.parse(readFileSync(join(STATIC, "index.json"), "utf8")).entries;
const pascal = (n) => n.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("");
const story = (id, theme, ap) => `${base}/iframe.html?id=${id}&globals=theme:${theme}-${ap}&viewMode=story`;

// @covers US-045-AC4
test("US-045-AC4: every AI component has a story in the AI Components group, apart from the SDK's own", () => {
  const titles = new Set(Object.values(index()).filter((e) => e.type === "story").map((e) => e.title));
  for (const n of ELEMENTS) assert.ok(titles.has(`AI Components/AI Elements/${pascal(n)}`), `AI Elements ${n}`);
  for (const n of ASSISTANT_UI) assert.ok(titles.has(`AI Components/assistant-ui/${pascal(n)}`), `assistant-ui ${n}`);
  assert.ok([...titles].some((t) => t.startsWith("UI Components/")), "the SDK's widgets are UI Components");
  assert.ok(![...titles].some((t) => t.startsWith("UI Components/") && /AI Elements|assistant-ui/.test(t)));
});

// @covers US-045-AC4
test("US-045-AC4: each AI story renders in its theme with no error and no request outside the page", async () => {
  const ai = Object.values(index()).filter((e) => e.type === "story" && e.title.startsWith("AI Components/") && e.title !== "AI Components/All");
  assert.ok(ai.length >= ELEMENTS.length + ASSISTANT_UI.length);
  const page = await browser.newPage();
  const outside = [], errors = [];
  page.on("request", (r) => { const u = new URL(r.url()); if (!["127.0.0.1", "localhost"].includes(u.hostname) && u.protocol !== "data:" && u.protocol !== "blob:") outside.push(r.url()); });
  page.on("pageerror", (e) => errors.push(e.message));
  for (const s of ai) {
    for (const ap of ["light", "dark"]) {
      await page.goto(story(s.id, "praxis-carbon", ap), { waitUntil: "networkidle" });
      await page.waitForSelector(".ai-frame", { state: "attached" });
      const r = await page.evaluate(() => ({ failed: document.body.classList.contains("sb-show-errordisplay"), height: document.querySelector(".ai-frame").getBoundingClientRect().height, bg: getComputedStyle(document.querySelector(".ds-frame")).getPropertyValue("--background").trim() }));
      assert.equal(r.failed, false, `${s.id} ${ap} rendered`);
      assert.ok(r.height > 20, `${s.id} ${ap} drew something (${r.height}px)`);
      assert.match(r.bg, /^#/, `${s.id} ${ap}: the bridge is on`);
    }
  }
  await page.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(outside, [], "nothing leaves the page: no telemetry, no fonts or code themes from a CDN");
});

// @covers US-045-AC4
test("US-045-AC4: the audit reports no errors on every AI component, in every theme and appearance", async () => {
  const runs = manifest.themes.flatMap((t) => t.appearances.map((ap) => [t.name, ap]));
  const found = [];
  for (let i = 0; i < runs.length; i += 4) {
    await Promise.all(runs.slice(i, i + 4).map(async ([theme, ap]) => {
      const r = await audit({
        urls: [story("ai-components-all--every-component", theme, ap)], themes: [theme], appearances: [ap], wait: ".ai-frame",
        rules: { brand: false, "sdk-widgets": false, "foreign-components": false, "widget-overrides": false }, ignore: [".shiki"], cwd: PKG,
      });
      found.push(...r.findings.filter((f) => f.severity === "error").map((f) => `${theme}/${ap} ${f.rule}: ${f.message}`));
    }));
  }
  assert.deepEqual(found, []);
});
