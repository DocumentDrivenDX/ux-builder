/* The starter's acceptance test (US-012-AC1 to AC3, AC5, AC6; US-022-AC10;
   US-097-AC2 to AC5; bead acceptance: "a CI job scaffolds a fresh app, runs
   npm install, npm run build and the lint rule with 0 findings; the
   generated app renders").

   Packs this repository's @ux-builder/tokens, @ux-builder/ui,
   @ux-builder/audit and @ux-builder/trace, scaffolds an app for each modality (FEAT-014:
   responsive-web, chat, hybrid-chat, and responsive-web with hybrid-chat on
   the latest HELIX), installs, builds, lints and audits each, runs each
   one's own e2e test, and drives the combined one in Chromium. Needs the
   network for react, vite and HELIX; a few minutes.

     npm run build && npm run test:e2e --workspace @ux-builder/create-app */

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "starter-e2e-"));
const sh = (cmd, args, cwd) => {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", env: { ...process.env, npm_config_loglevel: "error" } });
  assert.equal(r.status, 0, `${cmd} ${args.join(" ")}\n${r.stdout}\n${r.stderr}`);
  return r.stdout;
};
/* Each app: its modalities, and whether it starts on the latest HELIX. */
const APPS = {
  both: { modalities: "responsive-web,hybrid-chat", helix: true },
  web: { modalities: "responsive-web" },
  chat: { modalities: "chat" },
  hybrid: { modalities: "hybrid-chat" },
};
const dir = (name) => join(tmp, name);
const app = dir("both");
let server, browser, created;

before(async () => {
  mkdirSync(join(tmp, "sdk"));
  for (const p of ["tokens", "ui", "audit", "trace", "design"]) sh("npm", ["pack", "--silent", "--pack-destination", join(tmp, "sdk")], join(ROOT, "packages", p));
  for (const [name, a] of Object.entries(APPS)) {
    const r = spawnSync(process.execPath, [join(ROOT, "packages/create-app/index.mjs"), dir(name), "--modality", a.modalities, "--theme", "databricks", "--sdk-from", join(tmp, "sdk"), ...(a.helix ? [] : ["--no-helix"])], { cwd: tmp, encoding: "utf8" });
    assert.equal(r.status, 0, `create-app ${name}\n${r.stdout}\n${r.stderr}`);
    if (a.helix) created = r;
    sh("npm", ["install", "--no-audit", "--no-fund"], dir(name));
  }
});
after(async () => { server?.kill(); await browser?.close(); rmSync(tmp, { recursive: true, force: true }); });

// @covers US-012-AC1
test("AC1: the fresh app of every modality builds", () => {
  for (const name of Object.keys(APPS)) sh("npm", ["run", "build"], dir(name));
});

test("npm install puts the SDK's Claude Code skill in place", () => {
  sh("test", ["-f", join(app, ".claude/skills/ux-builder-ui/SKILL.md")], app);
});

// @covers US-051-AC1
test("US-051-AC1: the fresh app's blueprint passes ux-builder-blueprint check, as its CI runs it, for every modality", () => {
  for (const name of Object.keys(APPS)) assert.match(sh("npm", ["run", "check:blueprint"], dir(name)), /app\.blueprint\.json: no findings/, name);
});

// @covers US-012-AC3
// @covers US-022-AC10
test("AC3: the fresh app of every modality passes the lint rule with zero findings", () => {
  for (const name of Object.keys(APPS)) assert.doesNotMatch(sh("npm", ["run", "lint"], dir(name)), /ux-builder\/(no-hard-coded-values|no-foreign-ui|no-inline-svg|ai-neutral-voice)/, name);
});

// @covers US-022-AC10
test("US-022-AC10: the fresh app of every modality passes the theme audit in every theme, as its CI runs it", () => {
  for (const name of Object.keys(APPS)) {
    const out = sh("npm", ["run", "audit"], dir(name));
    assert.match(out, /Theme audit: 0 errors/, name);
    const report = JSON.parse(readFileSync(join(dir(name), "audit-report/report.json"), "utf8"));
    assert.ok(report.runs.length >= 10, `${name}: ${report.runs.length} runs`);
    assert.ok(report.runs.every((r) => r.mode === "event"), "switched by the starter's ThemeProvider");
    assert.equal(report.summary.error, 0, JSON.stringify(report.findings.filter((f) => f.severity === "error"), null, 1));
    assert.deepEqual(report.findings.filter((f) => f.severity !== "info" && f.owner !== "sdk").map((f) => `${f.check}: ${f.message}`), [], `${name}: nothing the app itself should fix`);
    // The SDK's own widgets clear contrast in every theme the starter shows.
    assert.deepEqual(report.findings.filter((f) => f.check === "contrast").map((f) => `${f.runs.join(" ")}: ${f.selector}: ${f.message}`), [], `${name}: SDK widgets clear contrast`);
    // Audited as the modalities its blueprint declares, and its shell fits them (US-099).
    const { supports } = JSON.parse(readFileSync(join(dir(name), "docs/ux-builder/blueprint/app.blueprint.json"), "utf8"));
    assert.deepEqual(report.verdicts.modality.map((v) => v.modality), supports.modalities, `${name}: the blueprint's modalities`);
    // Every required component is there. An empty hybrid-chat shell shows its first card only after a
    // message, so the audit of the first screen may warn that it saw no Adaptive Card part, and nothing else.
    for (const v of report.verdicts.modality) {
      const missing = v.components.filter((c) => !c.present).map((c) => c.name);
      const allowed = v.modality === "hybrid-chat" ? ["Adaptive Card part"] : [];
      assert.notEqual(v.status, "fail", `${name} ${v.modality}: ${JSON.stringify(v.fixes)}`);
      assert.deepEqual(missing.filter((m) => !allowed.includes(m)), [], `${name} ${v.modality}: missing ${missing}`);
      assert.ok(v.components.every((c) => c.adapts !== false), `${name} ${v.modality}: the navigation adapts by size class`);
    }
    assert.notEqual(report.verdicts.theme.status, "fail", `${name}: ${JSON.stringify(report.verdicts.theme.items?.filter((i) => i.status === "fail"))}`);
  }
});

describe("US-097: each modality's app runs as its shell, and its own e2e test passes", () => {
  // @covers US-097-AC2
  test("AC2: responsive-web is an AppShell with one Home screen whose empty state says where to start, from compact to large", () => {
    assert.match(sh("npm", ["run", "test:e2e"], dir("web")), /2 passed/);
    assert.match(readFileSync(join(dir("web"), "e2e/starter.spec.js"), "utf8"), /setViewportSize\(\{ width: 390[\s\S]*Frame the first feature in HELIX[\s\S]*setViewportSize\(\{ width: 1280/);
  });

  // @covers US-097-AC3
  test("AC3: chat is a full-screen, empty SDK Conversation with its composer and AI disclosure; hybrid-chat's draws Adaptive Card parts", () => {
    assert.match(sh("npm", ["run", "test:e2e"], dir("chat")), /2 passed/);
    assert.match(readFileSync(join(dir("chat"), "e2e/starter.spec.js"), "utf8"), /full-screen, empty Conversation/);
    assert.match(sh("npm", ["run", "test:e2e"], dir("hybrid")), /2 passed/);
    assert.match(readFileSync(join(dir("hybrid"), "e2e/starter.spec.js"), "utf8"), /piq-adaptive-card__heading/);
  });
});

// @covers US-012-AC2
// @covers US-097-AC4
test("AC2: the app renders on the SDK, switches theme and appearance; with responsive-web and hybrid-chat its AppShell has Home and Assistant", async () => {
  server = spawn("npx", ["vite", "preview", "--port", "5193", "--strictPort", "--host", "127.0.0.1"], { cwd: app, stdio: "ignore" });
  for (let i = 0; i < 60; i++) { try { if ((await fetch("http://127.0.0.1:5193/")).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 250)); }
  browser = await chromium.launch();
  const page = await browser.newPage({ colorScheme: "light", viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("http://127.0.0.1:5193/");
  const provider = page.locator(".app");
  await assertAttr(provider, "data-theme", "databricks");
  await assertAttr(provider, "data-appearance", "light");
  await page.getByRole("heading", { name: "Home", exact: true }).waitFor();
  const side = page.locator(".piq-shell__side");
  assert.deepEqual(await side.getByRole("link").allInnerTexts(), ["Home", "Assistant"], "the destinations");
  assert.match(await page.locator("[data-piq-screen=home] .piq-state-panel").innerText(), /Frame the first feature in HELIX/);

  await side.getByRole("link", { name: "Assistant" }).click();
  await page.waitForURL(/\/assistant$/);
  assert.equal(await page.locator(".piq-conversation .piq-message").count(), 0, "the conversation starts empty");
  const btn = () => page.locator(".piq-composer .piq-btn").first().evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
  assert.equal(await btn(), "8px", "Databricks buttons");

  await page.getByLabel("Theme").selectOption("praxis-carbon");
  await assertAttr(provider, "data-theme", "praxis-carbon");
  assert.equal(await btn(), "0px", "Carbon buttons are square");
  assert.equal(await page.locator("svg.piq-icon").first().getAttribute("data-icon-set"), "carbon");

  await page.getByRole("radio", { name: "Dark" }).click();
  await assertAttr(provider, "data-appearance", "dark");

  await page.getByRole("textbox", { name: "Ask the assistant" }).fill("Hello");
  await page.getByRole("button", { name: "Send" }).click();
  await page.locator('.piq-message[data-role="assistant"] .piq-adaptive-card__heading').waitFor();
  await page.goBack();
  await page.waitForURL(/\/$/);
  await page.locator("[data-piq-screen=home]").waitFor();
  assert.deepEqual(errors, []);
  await page.close();
});

// @covers US-012-AC5
test("AC5: the header's logo follows the theme and appearance", async () => {
  const page = await browser.newPage({ colorScheme: "light" });
  await page.goto("http://127.0.0.1:5193/");
  const provider = page.locator(".app");
  const logo = page.locator(".brand .piq-logo");
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
// @covers US-070-AC1
// @covers US-070-AC2
// @covers US-070-AC3
// @covers US-097-AC5
test("FEAT-010: the fresh app is on the latest HELIX, its manifest validates, collect records no warning, and its e2e test cites US-001's criteria and passes", () => {
  // This test fetches the real latest release from GitHub. Without the network the starter
  // falls back (to the bundled copy, or, in a checkout with no bundle, to no HELIX); say so plainly.
  const said = `${created.stdout}${created.stderr}`;
  const file = join(app, ".claude/skills/helix/HELIX-VERSION.json");
  assert.ok(existsSync(file), `no HELIX was installed, so the latest release was not fetched (is GitHub reachable?):\n${said}`);
  const v = JSON.parse(readFileSync(file, "utf8"));
  assert.equal(v.bundled, false, `the starter used the bundled HELIX, not the latest release (${v.reason}); is GitHub reachable?`);
  assert.match(v.tag, /^v\d+\.\d+\.\d+$/);
  assert.ok(existsSync(join(app, ".claude/skills/helix/SKILL.md")) && existsSync(join(app, ".claude/skills/helix/references/graph.yml")));
  const story = readFileSync(join(app, "docs/helix/01-frame/user-stories/US-001-open-the-app-and-see-where-to-start.md"), "utf8");
  assert.match(readFileSync(join(app, "docs/helix/01-frame/features/FEAT-001-app-shell.md"), "utf8"), /The app's shell for its modalities/);
  const acs = [...story.matchAll(/\*\*(US-001-AC\d+)\*\* — /g)].map((m) => m[1]);
  assert.deepEqual(acs, ["US-001-AC1", "US-001-AC2", "US-001-AC3"], "Home, the card-drawing conversation, the theme");
  const spec = readFileSync(join(app, "e2e/starter.spec.js"), "utf8");
  for (const id of acs) assert.match(spec, new RegExp(`// @covers ${id}\\n`), id);
  const out = sh("npm", ["run", "assess:validate"], app);
  assert.match(out, /ux-assessment\.yml: valid/);
  const runs = join(tmp, "assess-runs");
  const collected = sh("npx", ["ux-builder-audit", "assess", "collect", "--run", "R-20261021T000000Z", "--out", runs], app);
  assert.match(collected, /journeys' criteria 3 explicit, 0 uncovered/);
  const at = /Wrote (.+)\/requirements\.json/.exec(collected)[1];
  const req = JSON.parse(readFileSync(join(at, "requirements.json"), "utf8"));
  assert.deepEqual(req.problems.filter((p) => p.severity === "warning"), [], "collect records no warning");
  assert.equal(req.documents.length, 8);
  assert.match(sh("npm", ["run", "test:e2e"], app), /3 passed/);
});

/* FEAT-016's success metric: the starter's episode has start, created, at
   least one guidance and check, change, outcome and end, and validates. The
   create episode is written by create-app itself (its guidance is what it
   wrote to AGENTS.md; its check, the starter blueprint's). An agent's first
   episode cannot happen here without an agent, so one is simulated: the
   repository's MCP server, started in the created app as a host starts it,
   answers start_episode, get_guidance, check_blueprint and record_decision;
   a commit carries the trailer; end_episode closes it. */
// @covers US-105-AC1
// @covers US-106-AC2
// @covers US-106-AC4
// @covers US-106-AC5
// @covers US-108-AC1
test("FEAT-016: every created app's trace validates; its create episode is complete; an agent's episode over MCP records guidance, checks, a decision and the trailer commit", async () => {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const kinds = (d, id) => readFileSync(join(d, `.ux-builder/trace/${id}.jsonl`), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  for (const name of Object.keys(APPS)) {
    const d = dir(name);
    const create = kinds(d, `E-${today}-create`);
    assert.deepEqual(create.map((e) => e.kind), ["start", "created", "guidance", "check", "change", "outcome", "end"], name);
    assert.equal(create[0].trigger, "create");
    assert.ok(create[0].sdk["@ux-builder/trace"], name);
    assert.deepEqual(JSON.parse(readFileSync(join(d, ".claude/settings.json"), "utf8")).hooks.SessionEnd[0].hooks[0], { type: "command", command: "npx ux-builder-trace attach-transcript" }, name);
    assert.match(readFileSync(join(d, ".gitignore"), "utf8"), /^\.ux-builder\/trace\/current$/m, name);
    // npm run lint, check:blueprint and audit ran above with no episode open: their checks are in the unscoped episode.
    const unscoped = readdirSync(join(d, ".ux-builder/trace")).find((f) => /-unscoped-/.test(f));
    assert.ok(unscoped, `${name}: the checks run above are in the unscoped episode`);
    const checks = kinds(d, unscoped.replace(/\.jsonl$/, "")).filter((e) => e.kind === "check").map((e) => e.check);
    for (const c of ["lint", "blueprint", "audit"]) assert.ok(checks.includes(c), `${name}: ${c} wrote a check (${checks})`);
    assert.match(sh("npx", ["ux-builder-trace", "validate"], d), /The trace is valid/, name);
  }

  // The agent's episode, simulated over MCP in the web app.
  const d = dir("web");
  const git = (...args) => sh("git", ["-c", "user.name=Starter E2E", "-c", "user.email=e2e@example.com", "-c", "commit.gpgsign=false", ...args], d);
  git("init", "-q", "-b", "main");
  git("add", "-A");
  git("commit", "-q", "-m", "Create the app");
  const c = new Client({ name: "starter-e2e", version: "1" });
  await c.connect(new StdioClientTransport({ command: process.execPath, args: [join(ROOT, "packages/mcp/server.mjs")], cwd: d }));
  let episode;
  try {
    const call = async (n, a = {}) => { const r = await c.callTool({ name: n, arguments: a }); assert.ok(!r.isError, `${n}: ${r.content[0].text}`); return r.content[0].text; };
    ({ episode } = JSON.parse(await call("start_episode", { goal: "Review screen", stories: ["US-003"], screens: ["home"], agent: "e2e", model: "none" })));
    await call("get_guidance", { modalities: ["responsive-web"] });
    await call("check_blueprint", { blueprint: JSON.parse(readFileSync(join(d, "docs/ux-builder/blueprint/app.blueprint.json"), "utf8")) });
    await call("record_decision", { chose: "CollectionList", considered: ["DataTable"], why: "the home screen lists records to open", relied: ["US-003"], screen: "home" });
    writeFileSync(join(d, "src/Home.jsx"), readFileSync(join(d, "src/Home.jsx"), "utf8") + "\n");
    git("commit", "-q", "-am", `Home: the review list\n\nUX-Episode: ${episode}`);
    const end = JSON.parse(await call("end_episode", {}));
    assert.deepEqual(end.warnings, []);
    assert.equal(end.change.commits.length, 1);
  } finally { await c.close(); }
  const ev = kinds(d, episode);
  const has = new Set(ev.map((e) => e.kind));
  for (const k of ["start", "guidance", "check", "decision", "change", "outcome", "end"]) assert.ok(has.has(k), k);
  assert.ok(ev.find((e) => e.kind === "guidance" && e.tool === "get_guidance").answer.components.length > 0);
  assert.match(git("log", "-1", "--format=%B"), new RegExp(`UX-Episode: ${episode}`));
  assert.match(sh("npx", ["ux-builder-trace", "validate"], d), /The trace is valid/);
});
