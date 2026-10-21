/* The SDK's own assistant in Storybook (US-046 to US-048, FEAT-007): every
   Patterns/Assistant story, including the conversation on each adapter,
   renders in every theme and appearance with no error and no request
   outside the page, and the audit reports no errors on them. Runs against
   the built Storybook:

     npm run build-storybook --workspace @ux-builder/ui && npm run test:storybook --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { audit } from "../../../audit/audit.mjs";

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

const stories = () => Object.values(JSON.parse(readFileSync(join(STATIC, "index.json"), "utf8")).entries).filter((e) => e.type === "story" && e.title === "Patterns/Assistant");
const story = (id, theme, ap) => `${base}/iframe.html?id=${id}&globals=theme:${theme}-${ap}&viewMode=story`;

// @covers US-046-AC9
test("every assistant story, on either adapter too, renders in its theme with no error and no request outside the page", async () => {
  const all = stories();
  for (const id of ["patterns-assistant--full-conversation", "patterns-assistant--on-the-ai-sdk", "patterns-assistant--on-assistant-ui", "patterns-assistant--generated-components", "patterns-assistant--in-a-panel"]) assert.ok(all.some((s) => s.id === id), id);
  const page = await browser.newPage();
  const outside = [], errors = [];
  page.on("request", (r) => { const u = new URL(r.url()); if (!["127.0.0.1", "localhost"].includes(u.hostname) && u.protocol !== "data:" && u.protocol !== "blob:") outside.push(r.url()); });
  page.on("pageerror", (e) => errors.push(e.message));
  for (const s of all) {
    for (const ap of ["light", "dark"]) {
      await page.goto(story(s.id, "praxis-carbon", ap), { waitUntil: "networkidle" });
      await page.waitForSelector(".ds-frame > *", { state: "attached" });
      assert.equal(await page.evaluate(() => document.body.classList.contains("sb-show-errordisplay")), false, `${s.id} ${ap}`);
    }
  }
  // A conversation on each adapter: send, and the reply streams in with nothing fetched.
  for (const id of ["patterns-assistant--on-the-ai-sdk", "patterns-assistant--on-assistant-ui"]) {
    await page.goto(story(id, "praxis-carbon", "light"), { waitUntil: "networkidle" });
    await page.getByRole("textbox", { name: "Ask the assistant" }).fill("And the bundle?");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => [...document.querySelectorAll('.piq-message[data-role="assistant"]')].at(-1)?.dataset.status === "done" && document.querySelectorAll(".piq-message").length >= 4, null, { timeout: 10000 });
  }
  await page.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(outside, [], "no vendor service, no telemetry");
});

test("the audit reports no errors on the assistant's stories, in every theme and appearance", async () => {
  const ids = ["patterns-assistant--full-conversation", "patterns-assistant--generated-components", "patterns-assistant--failed", "patterns-assistant--on-the-ai-sdk"];
  const runs = manifest.themes.flatMap((t) => t.appearances.map((ap) => [t.name, ap]));
  const found = [];
  for (let i = 0; i < runs.length; i += 4) {
    await Promise.all(runs.slice(i, i + 4).map(async ([theme, ap]) => {
      const r = await audit({ urls: ids.map((id) => story(id, theme, ap)), themes: [theme], appearances: [ap], wait: ".piq-conversation", rules: { brand: false }, cwd: PKG });
      found.push(...r.findings.filter((f) => f.severity === "error").map((f) => `${theme}/${ap} ${f.rule} ${f.url.replace(/.*id=([^&]+).*/, "$1")}: ${f.message}`));
    }));
  }
  assert.deepEqual(found, []);
});
