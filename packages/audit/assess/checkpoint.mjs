/* Checkpoint inspection for an assessment (FEAT-009 INS-03, INS-04;
   CONTRACT-006 "inspection.json"; ADR-026 decision 4).

     ux-builder-audit assess browser [--port n] [--headed]
     ux-builder-audit assess inspect --cdp <url> --page <url-match> --checkpoint <id> [...]
     ux-builder-audit assess inspect --replay <steps.json> --checkpoint <id> [...]

   `browser` starts a Chromium the agent's driver connects to over the Chrome
   DevTools Protocol (Playwright MCP: --cdp-endpoint). `inspect --cdp`
   attaches to that browser, finds the one page whose URL contains --page,
   and inspects it in place; it never closes the agent's pages. Where a
   driver cannot share its browser, `inspect --replay` reproduces the state
   in a browser of its own from recorded steps, and inspects it only if the
   expected state is there. */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join, relative, resolve } from "node:path";
import { chromium } from "playwright";
import { enrich, inspect, prepare } from "../inspect.mjs";
import { VERSION } from "../audit.mjs";

export const runId = (d = new Date()) => `R-${d.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z")}`;
const ID = /^C-[a-z0-9][a-z0-9-]*$/;

/* A free local port, for the CDP endpoint. */
const freePort = () => new Promise((res, rej) => { const s = createServer(); s.on("error", rej); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => res(port)); }); });

/* Start Chromium with a CDP endpoint. Resolves with { cdp, browser }. */
export async function startBrowser({ port, headed = false } = {}) {
  port ??= await freePort();
  const browser = await chromium.launch({ headless: !headed, args: [`--remote-debugging-port=${port}`, "--remote-debugging-address=127.0.0.1"] });
  const cdp = `http://127.0.0.1:${port}`;
  // Ready when the endpoint answers.
  for (let i = 0; i < 100; i++) { try { if ((await fetch(`${cdp}/json/version`)).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 100)); }
  return { cdp, browser };
}

/* Attach to a browser over CDP and find the one page whose URL contains
   `page`. detach() disconnects; the agent's pages and contexts stay open. */
export async function attach({ cdp, page: match }) {
  const browser = await chromium.connectOverCDP(cdp);
  const pages = browser.contexts().flatMap((c) => c.pages()).filter((p) => !p.isClosed() && (!match || p.url().includes(match)));
  const detach = () => browser.close();
  if (pages.length !== 1) {
    const all = browser.contexts().flatMap((c) => c.pages()).map((p) => p.url());
    await detach();
    const e = new Error(pages.length ? `${pages.length} pages match "${match}": ${pages.map((p) => p.url()).join(", ")}` : `checkpoint lost: no page matches "${match}" (open: ${all.join(", ") || "none"})`);
    e.code = pages.length ? "ambiguous" : "lost";
    throw e;
  }
  return { page: pages[0], detach };
}

/* Replay recorded steps in a browser of our own; true when the expected
   state is there. Steps: { goto } | { click } | { fill, value } | { press } | { waitFor }. */
async function replay(file) {
  const plan = JSON.parse(readFileSync(file, "utf8"));
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: plan.viewport ?? { width: 1280, height: 900 } });
  const page = await context.newPage();
  for (const s of plan.steps ?? []) {
    if (s.goto) await page.goto(new URL(s.goto, plan.baseUrl).href, { waitUntil: "networkidle" });
    else if (s.click) await page.click(s.click);
    else if (s.fill) await page.fill(s.fill, s.value ?? "");
    else if (s.press) await page.keyboard.press(s.press);
    else if (s.waitFor) await page.waitForSelector(s.waitFor);
  }
  const e = plan.expect ?? {};
  let passed = false;
  try {
    const l = page.locator(e.selector);
    passed = (await l.count()) > 0 && (await l.first().isVisible()) && (!e.text || (await l.first().innerText()).includes(e.text));
  } catch { passed = false; }
  return { page, passed, assertion: e, detach: () => browser.close() };
}

/* Inspect one checkpoint and write its record. Returns { record, code }:
   code 0 inspected, 1 lost, ambiguous or unverified. */
export async function checkpoint({ cdp, page: match, replay: steps, checkpoint: id, journey, step, role, state, stateAffecting = false, redact = [], out = "ux-assessment", run = runId(), cwd = process.cwd(), ignore = [], rules = {} }) {
  if (!ID.test(id ?? "")) throw new Error(`--checkpoint must look like C-<journey>-<n>, got "${id}"`);
  const dir = resolve(out, run, "checkpoints", id);
  mkdirSync(dir, { recursive: true });
  const base = { schema: "inspection", version: 1, auditor: VERSION, checkpoint: { id, journey: journey ?? null, step: step == null ? null : Number(step), role: role ?? null, state: state ?? null } };
  const write = (record) => { writeFileSync(join(dir, "inspection.json"), JSON.stringify(record, null, 2) + "\n"); return record; };
  let session;
  try {
    session = steps ? await replay(steps) : await attach({ cdp, page: match });
  } catch (e) {
    return { code: 1, record: write({ ...base, mode: steps ? "replay" : "in-place", error: e.code ?? "error", message: e.message, findings: [] }) };
  }
  try {
    const mode = steps ? "replay" : "in-place";
    if (steps && !session.passed) return { code: 1, record: write({ ...base, mode, url: session.page.url(), verified: { assertion: session.assertion, passed: false }, findings: [], message: "the replayed state does not match the expected state; nothing was inspected" }) };
    const { page } = session;
    const sdk = prepare(cwd);
    const result = await inspect(page, { sdk, ignore, rules, stateAffecting });
    const shown = await page.evaluate(() => { const r = [...document.querySelectorAll("[data-theme]")].find((e) => !e.parentElement?.closest("[data-theme]")); return { theme: r?.dataset.theme ?? null, appearance: r?.dataset.appearance ?? null, viewport: { width: innerWidth, height: innerHeight } }; });
    // Evidence of the state inspected, masked where the manifest says (FEAT-009 ENV-03).
    const shot = join(dir, "screenshot.png");
    await page.screenshot({ path: shot, mask: redact.map((s) => page.locator(s)), animations: "disabled" });
    const tree = await page.locator("body").ariaSnapshot();
    writeFileSync(join(dir, "tree.yml"), tree + "\n");
    const findings = enrich(result.findings, sdk.interaction).map((f) => ({ ...f, finding_type: "deterministic", checkpoint: base.checkpoint, viewport: shown.viewport, theme: shown.theme }));
    return { code: 0, record: write({ ...base, mode, url: page.url(), viewport: shown.viewport, theme: shown.theme, appearance: shown.appearance, ...(steps ? { verified: { assertion: session.assertion, passed: true } } : {}), skipped: result.skipped, stateAffecting: result.stateAffecting, findings, screenshot: relative(dir, shot), tree: "tree.yml" }) };
  } finally {
    await session.detach();
  }
}
