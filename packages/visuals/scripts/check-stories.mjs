#!/usr/bin/env node
/* On demand (US-166-AC2): open each visuals story in the built Storybook in two themes and check
   that the drawing changes with the toolbar: another font stack, other colours, no error.

     npm run build-storybook   (repository root)
     node packages/visuals/scripts/check-stories.mjs */

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../../ui/storybook-static/", import.meta.url));
if (!existsSync(join(root, "iframe.html"))) { console.error("Build Storybook first: npm run build-storybook"); process.exit(2); }
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const server = createServer((req, res) => {
  const path = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!path.startsWith(root) || !existsSync(path) || statSync(path).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
  createReadStream(path).pipe(res);
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const index = await (await fetch(`${base}/index.json`)).json();
const stories = Object.values(index.entries).filter((e) => e.type === "story" && e.title === "Visuals/Every kind");
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
let failed = 0;
for (const s of stories) {
  const drawn = [];
  for (const theme of ["synaptiq-light", "databricks-dark"]) {
    await page.goto(`${base}/iframe.html?id=${s.id}&globals=theme:${theme}&viewMode=story`);
    const svg = page.locator(".chart svg");
    await svg.waitFor({ state: "attached", timeout: 20000 });
    drawn.push(await svg.evaluate((el) => ({ font: el.getAttribute("style"), ground: el.querySelector("rect").getAttribute("style"), size: el.getAttribute("viewBox") })));
  }
  const ok = drawn[0].font !== drawn[1].font && drawn[0].ground !== drawn[1].ground;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${s.name}: ${drawn.map((d) => `${d.font.slice(12, 30)}… ${d.ground}`).join("  →  ")}`);
}
await browser.close();
server.close();
if (errors.length) console.error("page errors:", errors);
console.log(`${stories.length} stories, ${failed} failed`);
process.exitCode = failed || errors.length || stories.length < 10 ? 1 : 0;
