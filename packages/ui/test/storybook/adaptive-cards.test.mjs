/* Adaptive Cards in Storybook (US-083, ADR-029): every Patterns/Adaptive
   Cards story renders in every theme and appearance with no error and no
   request outside the page, and the audit reports no errors on them. Runs
   against the built Storybook:

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

const stories = () => Object.values(JSON.parse(readFileSync(join(STATIC, "index.json"), "utf8")).entries).filter((e) => e.type === "story" && e.title === "Patterns/Adaptive Cards");
const story = (id, theme, ap) => `${base}/iframe.html?id=${id}&globals=theme:${theme}-${ap}&viewMode=story`;

// @covers US-083-AC2
test("every Adaptive Cards story renders in its theme and appearance with no error and no request outside the page", async () => {
  const all = stories();
  for (const id of ["patterns-adaptive-cards--pay-invoice", "patterns-adaptive-cards--every-element", "patterns-adaptive-cards--official-samples", "patterns-adaptive-cards--in-a-conversation"]) assert.ok(all.some((s) => s.id === id), id);
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
  // The walkthrough: pay, approve, and the card is no longer current.
  await page.goto(story("patterns-adaptive-cards--pay-invoice", "praxis-carbon", "light"), { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Pay invoice" }).click();
  await page.getByRole("button", { name: "Approve" }).click();
  await page.getByText(/onAction: .*"verb":"pay"/).waitFor();
  assert.equal(await page.getByRole("button", { name: "Pay invoice" }).getAttribute("aria-disabled"), "true");
  await page.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(outside, [], "no request outside the page");
});

// @covers US-083-AC6
test("the audit reports no errors on the Adaptive Cards stories, in every theme and appearance", async () => {
  const ids = ["patterns-adaptive-cards--pay-invoice", "patterns-adaptive-cards--every-element", "patterns-adaptive-cards--official-samples", "patterns-adaptive-cards--destructive-action", "patterns-adaptive-cards--in-a-conversation"];
  const runs = manifest.themes.flatMap((t) => t.appearances.map((ap) => [t.name, ap]));
  const found = [];
  for (let i = 0; i < runs.length; i += 4) {
    await Promise.all(runs.slice(i, i + 4).map(async ([theme, ap]) => {
      const r = await audit({ urls: ids.map((id) => story(id, theme, ap)), themes: [theme], appearances: [ap], wait: ".piq-adaptive-card", rules: { brand: false }, cwd: PKG });
      found.push(...r.findings.filter((f) => f.severity === "error").map((f) => `${theme}/${ap} ${f.rule} ${f.url.replace(/.*id=([^&]+).*/, "$1")} ${f.selector ?? ""}: ${f.message}`));
    }));
  }
  assert.deepEqual(found, []);
});
