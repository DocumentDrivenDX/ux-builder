/* The starter's acceptance test (US-012-AC1 to AC3, AC5, AC6; US-022-AC10; bead acceptance: "a CI
   job scaffolds a fresh app, runs npm install, npm run build and the lint
   rule with 0 findings; the generated app renders").

   Packs this repository's @ux-builder/tokens and @ux-builder/ui, scaffolds an app
   that installs them, builds and lints it, serves the build and drives it in
   Chromium. Needs the network for react and vite; about a minute.

     npm run build && npm run test:e2e --workspace @ux-builder/create-app */

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "starter-e2e-"));
const app = join(tmp, "matters");
const sh = (cmd, args, cwd) => {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", env: { ...process.env, npm_config_loglevel: "error" } });
  assert.equal(r.status, 0, `${cmd} ${args.join(" ")}\n${r.stdout}\n${r.stderr}`);
  return r.stdout;
};
let server, browser;

before(async () => {
  mkdirSync(join(tmp, "sdk"));
  for (const p of ["tokens", "ui", "audit"]) sh("npm", ["pack", "--silent", "--pack-destination", join(tmp, "sdk")], join(ROOT, "packages", p));
  sh(process.execPath, [join(ROOT, "packages/create-app/index.mjs"), app, "--theme", "databricks", "--sdk-from", join(tmp, "sdk")], tmp);
  sh("npm", ["install", "--no-audit", "--no-fund"], app);
});
after(async () => { server?.kill(); await browser?.close(); rmSync(tmp, { recursive: true, force: true }); });

// @covers US-012-AC1
test("AC1: the fresh app builds", () => {
  sh("npm", ["run", "build"], app);
});

test("npm install puts the SDK's Claude Code skill in place", () => {
  sh("test", ["-f", join(app, ".claude/skills/ux-builder-ui/SKILL.md")], app);
});

// @covers US-051-AC1
test("US-051-AC1: the fresh app's blueprint passes ux-builder-blueprint check, as its CI runs it", () => {
  const out = sh("npm", ["run", "check:blueprint"], app);
  assert.match(out, /app\.blueprint\.json: no findings/);
});

// @covers US-012-AC3
// @covers US-022-AC10
test("AC3: the fresh app passes the lint rule with zero findings", () => {
  const out = sh("npm", ["run", "lint"], app);
  assert.doesNotMatch(out, /ux-builder\/no-(hard-coded-values|foreign-ui|inline-svg)/);
});

// @covers US-022-AC10
test("US-022-AC10: the fresh app passes the theme audit in every theme, as its CI runs it", () => {
  const out = sh("npm", ["run", "audit"], app);
  assert.match(out, /Theme audit: 0 errors/);
  const report = JSON.parse(readFileSync(join(app, "audit-report/report.json"), "utf8"));
  assert.ok(report.runs.length >= 10, `${report.runs.length} runs`);
  assert.ok(report.runs.every((r) => r.mode === "event"), "switched by the starter's ThemeProvider");
  assert.equal(report.summary.error, 0, JSON.stringify(report.findings.filter((f) => f.severity === "error"), null, 1));
  assert.deepEqual(report.findings.filter((f) => f.severity !== "info" && f.owner !== "sdk").map((f) => f.message), [], "nothing the app itself should fix");
  // The SDK's own widgets clear contrast in every theme the starter shows
  // (plain's Limited pill measured 4.2:1 until 2026-10-08).
  assert.deepEqual(report.findings.filter((f) => f.rule === "contrast").map((f) => `${f.runs.join(" ")}: ${f.selector}: ${f.message}`), [], "SDK widgets clear contrast");
});

// @covers US-012-AC2
test("AC2: the app renders on the SDK and switches theme and appearance", async () => {
  server = spawn("npx", ["vite", "preview", "--port", "5193", "--strictPort", "--host", "127.0.0.1"], { cwd: app, stdio: "ignore" });
  for (let i = 0; i < 60; i++) { try { if ((await fetch("http://127.0.0.1:5193/")).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 250)); }
  browser = await chromium.launch();
  const page = await browser.newPage({ colorScheme: "light" });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("http://127.0.0.1:5193/");
  const provider = page.locator(".app");
  await assertAttr(provider, "data-theme", "databricks");
  await assertAttr(provider, "data-appearance", "light");
  await page.getByRole("heading", { name: "matters", exact: true }).waitFor();
  const btn = () => page.locator(".piq-btn").first().evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
  assert.equal(await btn(), "8px", "Databricks buttons");
  assert.equal(await page.locator("table tbody tr").count(), 3);

  await page.getByLabel("Theme").selectOption("praxis-carbon");
  await assertAttr(provider, "data-theme", "praxis-carbon");
  assert.equal(await btn(), "0px", "Carbon buttons are square");
  assert.equal(await page.locator("svg.piq-icon").first().getAttribute("data-icon-set"), "carbon");

  await page.getByRole("radio", { name: "Dark" }).click();
  await assertAttr(provider, "data-appearance", "dark");

  const add = page.getByRole("button", { name: /Add matter/ });
  await add.click();
  assert.equal(await add.getAttribute("aria-busy"), "true", "busy while the request runs (US-021-AC5)");
  await page.locator(".piq-toast").waitFor();
  assert.equal(await add.getAttribute("aria-busy"), null);
  await page.getByLabel("Search").fill("estate");
  assert.equal(await page.locator("table tbody tr").count(), 1);
  assert.deepEqual(errors, []);
});

// @covers US-012-AC5
test("AC5: the header's logo follows the theme and appearance", async () => {
  const page = await browser.newPage({ colorScheme: "light" });
  await page.goto("http://127.0.0.1:5193/");
  const provider = page.locator(".app");
  const logo = page.locator(".masthead .piq-logo");
  await assertAttr(provider, "data-theme", "databricks");
  // Databricks ships no artwork: its title, as a wordmark.
  await assertAttr(logo, "data-logo", "text");
  assert.equal(await logo.getAttribute("aria-label"), "Databricks");
  assert.equal(await logo.textContent(), "Databricks");

  await page.getByLabel("Theme").selectOption("praxis-carbon");
  await assertAttr(logo, "data-logo", "artwork");
  assert.equal(await logo.getAttribute("aria-label"), "Praxis");
  const image = () => logo.evaluate((el) => getComputedStyle(el).backgroundImage);
  // Vite names a bundled file after the first source with those bytes, and
  // brands may share artwork, so the name is not checked: that it is
  // bundled and loads is.
  const light = await image();
  assert.match(light, /\/assets\/[^/]+\.svg"?\)$/, "Vite bundles the theme's artwork");
  // Drawn, not just named: the URL serves the image (a wrong path gets the app's HTML).
  const loads = () => image().then((bg) => page.evaluate((src) => new Promise((ok) => {
    const img = new Image();
    img.onload = () => ok(img.naturalWidth > 0);
    img.onerror = () => ok(false);
    img.src = src;
  }), /url\("?([^")]+)"?\)/.exec(bg)[1]));
  assert.ok(await loads(), "the light artwork loads");

  await page.getByRole("radio", { name: "Dark" }).click();
  await assertAttr(provider, "data-appearance", "dark");
  assert.match(await image(), /\/assets\/[^/]+\.svg"?\)$/);
  assert.notEqual(await image(), light, "dark has its own artwork");
  assert.ok(await loads(), "the dark artwork loads");
  await page.close();
});

// @covers US-012-AC6
test("AC6: the page's icon is the theme's favicon, and the app's own where the theme has none", async () => {
  const page = await browser.newPage({ colorScheme: "light" });
  await page.goto("http://127.0.0.1:5193/");
  const icon = () => page.evaluate(() => document.querySelector("link[data-piq-favicon]")?.href ?? null);
  await assertAttr(page.locator(".app"), "data-theme", "databricks");
  assert.equal(await icon(), null, "Databricks has no favicon: the app's own");

  await page.getByLabel("Theme").selectOption("praxis-material");
  for (let i = 0; i < 40 && !(await icon()); i++) await new Promise((r) => setTimeout(r, 100));
  const href = await icon();
  assert.match(href ?? "", /\/assets\/[^/]+\.svg$/, "Vite bundles the theme's favicon");
  const res = await page.request.get(href);
  assert.equal(res.headers()["content-type"], "image/svg+xml", "it loads as an image, not the app's HTML");

  await page.getByLabel("Theme").selectOption("databricks");
  for (let i = 0; i < 40 && (await icon()); i++) await new Promise((r) => setTimeout(r, 100));
  assert.equal(await icon(), null);
  await page.close();
});

async function assertAttr(locator, name, value) {
  for (let i = 0; i < 40; i++) { if ((await locator.getAttribute(name)) === value) return; await new Promise((r) => setTimeout(r, 100)); }
  assert.equal(await locator.getAttribute(name), value);
}

// @covers US-067-AC1
// @covers US-070-AC2
// @covers US-070-AC3
test("FEAT-010: the fresh app is on the latest HELIX, its manifest validates and its e2e test passes", () => {
  const v = JSON.parse(readFileSync(join(app, ".claude/skills/helix/HELIX-VERSION.json"), "utf8"));
  assert.match(v.tag, /^v\d+\.\d+\.\d+$/);
  assert.ok(existsSync(join(app, ".claude/skills/helix/SKILL.md")) && existsSync(join(app, ".claude/skills/helix/references/graph.yml")));
  assert.ok(existsSync(join(app, "docs/helix/01-frame/user-stories/US-001-see-search-and-add-matters.md")));
  const out = sh("npm", ["run", "assess:validate"], app);
  assert.match(out, /ux-assessment\.yml: valid/);
  sh("npm", ["run", "test:e2e"], app);
});
