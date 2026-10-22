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
   expected state is there.

   With the manifest, both enforce its restrictions (FEAT-009 ENV-01,
   ENV-02; CONTRACT-006 `restrictions`): only the allowed origins resolve in
   the browser, excluded integrations are refused, and a replay takes no
   step until every step is checked against the denied and allowed actions.
   `inspect` also enforces `limits` (runMinutes, steps, journeyMinutes) and
   writes the evidence `evidence.capture` names. A step refused is recorded
   `blocked: restricted` or `blocked: limit`, never inspected. */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join, relative, resolve } from "node:path";
import { chromium } from "playwright";
import { enrich, inspect, prepare } from "../inspect.mjs";
import { VERSION } from "../audit.mjs";
import { APPROVE_SELECTOR, approvalProbe, errorFindings, errorProbe, NEVER_APPROVE, SCENARIOS, wouldApprove } from "./ai.mjs";
import { DENY, excluded } from "./manifest.mjs";

export const runId = (d = new Date()) => `R-${d.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z")}`;
const ID = /^C-[a-z0-9][a-z0-9-]*$/;

/* A free local port, for the CDP endpoint. */
const freePort = () => new Promise((res, rej) => { const s = createServer(); s.on("error", rej); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => res(port)); }); });

/* The browser's host-resolver rules: with origins, every host but theirs
   fails to resolve, and an origin's host that an excluded integration names
   is not kept; without origins, the excluded hosts alone fail (ENV-02).
   Chromium checks EXCLUDE before MAP, so an excluded host is never EXCLUDEd. */
export function resolverRules(origins = [], exclude = []) {
  const ex = excluded(exclude);
  const hosts = [...new Set(origins.map((o) => { try { return new URL(o).hostname; } catch { return null; } }).filter(Boolean))].filter((h) => !ex.host(h));
  if (origins.length) return ["MAP * ~NOTFOUND", ...hosts.map((h) => `EXCLUDE ${h}`)].join(", ");
  const named = ex.entries.filter((x) => x.host?.includes(".") || x.host === "localhost").flatMap((x) => [`MAP ${x.host} ~NOTFOUND`, `MAP *.${x.host} ~NOTFOUND`]);
  return named.length ? named.join(", ") : null;
}

/* Start Chromium with a CDP endpoint. Resolves with { cdp, browser }. With
   origins, every other host name fails to resolve in this browser, so a step
   that would leave the allowed origins cannot load; nor can one to an
   excluded integration (FEAT-009 ENV-02). */
export async function startBrowser({ port, headed = false, origins = [], exclude = [] } = {}) {
  port ??= await freePort();
  const args = [`--remote-debugging-port=${port}`, "--remote-debugging-address=127.0.0.1"];
  const rules = resolverRules(origins, exclude);
  if (rules) args.push(`--host-resolver-rules=${rules}`);
  const browser = await chromium.launch({ headless: !headed, args });
  const cdp = `http://127.0.0.1:${port}`;
  // Ready when the endpoint answers.
  for (let i = 0; i < 100; i++) { try { if ((await fetch(`${cdp}/json/version`)).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 100)); }
  return { cdp, browser };
}

/* Attach to a browser over CDP and find the one page whose URL contains
   `page`. detach() disconnects; the agent's pages and contexts stay open. */
export async function attach({ cdp, page: match }) {
  let browser;
  try { browser = await chromium.connectOverCDP(cdp); } catch (e) {
    const err = new Error(`no browser at ${cdp}: ${e.message.split("\n")[0]}`);
    err.code = "no-browser";
    throw err;
  }
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

const restricted = (message) => { const e = new Error(message); e.code = "restricted"; return e; };

/* Why a replay may not run, or null: every step is checked before any is
   taken. A step's optional `action` is its action class; a denied one is
   never taken, and any other must be in restrictions.allow (ENV-01). A goto
   must stay within the origins and off the excluded integrations (ENV-02). */
export function refusal(plan, { origins = null, exclude = [], allow = [], deny = DENY } = {}) {
  const ex = excluded(exclude);
  for (const [i, s] of (plan.steps ?? []).entries()) {
    const n = i + 1;
    // An approve control is never activated, as a denied action is never taken (ADR-028 decision 8).
    if ((s.click && APPROVE_SELECTOR.test(s.click)) || s.action === "approve") return `step ${n} would activate an approve control (data-piq-ai-control="approve"); ${NEVER_APPROVE}`;
    if (s.action && deny.includes(s.action)) return `step ${n} takes the denied action "${s.action}"; a denied action is never taken`;
    if (s.action && !allow.includes(s.action)) return `step ${n} takes the action "${s.action}", which restrictions.allow does not permit`;
    if (s.goto) {
      let url;
      try { url = new URL(s.goto, plan.baseUrl); } catch { return `step ${n} goes to ${s.goto}, which is not a URL`; }
      if (origins?.length && !origins.includes(url.origin)) return `step ${n} goes to ${url.origin}, outside run.origins (${origins.join(", ")})`;
      const x = ex.by(url.href);
      if (x) return `step ${n} goes to ${url.href}, an excluded integration (${x.entry})`;
    }
  }
  return null;
}

/* Abort, in a browser context, every request off the origins or to an
   excluded integration (ENV-02). A walkthrough video's replay uses it too. */
export async function guardContext(context, { origins = null, exclude = [] } = {}) {
  const ex = excluded(exclude);
  await context.route("**/*", (route) => {
    const u = route.request().url();
    if (!/^https?:/.test(u)) return route.continue();
    const off = origins?.length && !origins.includes(new URL(u).origin);
    return off || ex.by(u) ? route.abort("blockedbyclient") : route.continue();
  });
}

/* Replay recorded steps in a browser of our own; true when the expected
   state is there. Steps: { goto } | { click } | { fill, value } | { press } | { waitFor },
   each with an optional action class. Nothing runs if a step is refused;
   while it runs, requests off the origins or to an excluded integration are aborted. */
async function replay(plan, guard, { scenario = null, highImpactStep = null, dir = null, capture = "both", redact = [] } = {}) {
  const why = refusal(plan, guard);
  if (why) throw restricted(why);
  const risky = scenario === "risky";
  if (risky && !Number.isInteger(highImpactStep)) throw restricted("the risky scenario names no high-impact step (a replay step with highImpact: true, --high-impact-step, or the manifest's scenarios.risky.step as a number), so it cannot stop before it");
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: plan.viewport ?? { width: 1280, height: 900 } });
    await guardContext(context, guard);
    const page = await context.newPage();
    // The risky scenario (US-082-AC3, AC4): at an approval, record it, choose Deny and stop;
    // with none before the high-impact step, stop before it.
    const approvalNow = async () => {
      try { await page.waitForSelector('[data-piq-ai="approval"]', { state: "visible", timeout: 300 }); } catch { /* none shown */ }
      return page.evaluate(approvalProbe);
    };
    const denyAt = async (approval, n) => {
      let shot = null;
      if (dir && capture !== "tree") { await page.screenshot({ path: join(dir, "approval.png"), mask: redact.map((x) => page.locator(x)), animations: "disabled" }); shot = "approval.png"; }
      const deny = page.locator('[data-piq-ai="approval"] [data-piq-ai-control="deny"]').first();
      const can = approval.deny && (await deny.count()) > 0 && (await deny.isVisible());
      if (can) { await deny.click(); await page.waitForLoadState("networkidle").catch(() => {}); }
      return { highImpactStep, stoppedAt: n, approval: { ...approval, screenshot: shot }, denied: !!can, approved: false };
    };
    let stop = null;
    const steps = plan.steps ?? [];
    for (const [i, s] of steps.entries()) {
      const n = i + 1;
      if (risky) {
        const a = await approvalNow();
        if (a) { stop = await denyAt(a, n); break; }
        if (n === highImpactStep) { stop = { highImpactStep, stoppedAt: n, approval: null, denied: false, approved: false }; break; }
      }
      // Checked as the page is now: a step that would activate an approve control is not taken (ENV-01).
      if ((s.click && await page.evaluate(wouldApprove, { selector: s.click })) || (s.press && await page.evaluate(wouldApprove, { key: s.press }))) {
        throw Object.assign(restricted(`step ${n} would activate an approve control (data-piq-ai-control="approve"); ${NEVER_APPROVE}`), { taken: n - 1 });
      }
      if (s.goto) await page.goto(new URL(s.goto, plan.baseUrl).href, { waitUntil: "networkidle" });
      else if (s.click) await page.click(s.click);
      else if (s.fill) await page.fill(s.fill, s.value ?? "");
      else if (s.press) await page.keyboard.press(s.press);
      else if (s.waitFor) await page.waitForSelector(s.waitFor);
    }
    if (risky && !stop) {
      const a = await approvalNow();
      const n = steps.length + 1;
      stop = a ? await denyAt(a, n) : { highImpactStep, stoppedAt: n, approval: null, denied: false, approved: false, ...(highImpactStep > n ? { reached: false } : {}) };
    }
    const e = plan.expect ?? null;
    let passed = false;
    if (!e && risky) passed = true;
    else try {
      const l = page.locator(e.selector);
      passed = (await l.count()) > 0 && (await l.first().isVisible()) && (!e.text || (await l.first().innerText()).includes(e.text));
    } catch { passed = false; }
    return { page, passed, assertion: e ?? { scenario: "risky", stoppedAt: stop.stoppedAt }, risky: stop, detach: () => browser.close() };
  } catch (err) {
    await browser.close();
    throw err;
  }
}

/* The findings of a risky stop (US-082-AC4): no approval before the
   high-impact step, or an approval with no Deny. */
function riskyFindings(stop) {
  if (!stop) return [];
  const f = (message) => ({ rule: "agent.approve-high-impact", severity: "warning", priority: "P1", finding_type: "observed", scenario: "risky", message });
  if (!stop.approval && stop.reached !== false) return [f(`no approval appeared before step ${stop.highImpactStep}, the high-impact step; the walkthrough stopped before it and took nothing`)];
  if (stop.approval && !stop.denied) return [f("the approval offers no visible Deny control; nothing was chosen and the walkthrough stopped")];
  return [];
}

/* Record a stage in the run's run.json (written by every command). */
export function recordStage(runRoot, stage) {
  const file = join(runRoot, "run.json");
  const now = new Date().toISOString();
  let rec;
  try { rec = JSON.parse(readFileSync(file, "utf8")); } catch { rec = { schema: "run", version: 1, id: runRoot.split(/[\\/]/).pop(), startedAt: now, stages: [] }; }
  rec.stages = [...(rec.stages ?? []).filter((s) => s.stage !== stage.stage), { ...stage, finishedAt: now }];
  mkdirSync(runRoot, { recursive: true });
  writeFileSync(file, JSON.stringify(rec, null, 2) + "\n");
}

/* The limit a step would pass, or null (CONTRACT-006 `limits`): the run's
   minutes from run.json's startedAt, its steps (each inspection's `steps`),
   and the journey's minutes from its first checkpoint. */
export function limitReached({ runRoot, id, journey, steps, limits, now = Date.now() }) {
  if (!limits) return null;
  const others = [];
  const cps = join(runRoot, "checkpoints");
  if (existsSync(cps)) for (const c of readdirSync(cps)) {
    if (c === id) continue;
    try { others.push(JSON.parse(readFileSync(join(cps, c, "inspection.json"), "utf8"))); } catch { /* not a checkpoint */ }
  }
  const taken = others.filter((r) => !r.error);
  const at = (r) => Date.parse(r.inspectedAt ?? "") || null;
  let started = null;
  try { started = Date.parse(JSON.parse(readFileSync(join(runRoot, "run.json"), "utf8")).startedAt) || null; } catch { /* no run record */ }
  started ??= Math.min(...taken.map(at).filter(Boolean), now);
  if (limits.runMinutes != null && now - started > limits.runMinutes * 60_000) return `the run's ${limits.runMinutes} minutes (limits.runMinutes) are spent`;
  const used = taken.reduce((n, r) => n + (r.steps ?? 1), 0);
  if (limits.steps != null && used + steps > limits.steps) return `${used} of the run's ${limits.steps} steps (limits.steps) are taken; this one needs ${steps}`;
  const first = journey ? Math.min(...taken.filter((r) => r.checkpoint?.journey === journey).map(at).filter(Boolean)) : Infinity;
  if (limits.journeyMinutes != null && Number.isFinite(first) && now - first > limits.journeyMinutes * 60_000) return `${journey}'s ${limits.journeyMinutes} minutes (limits.journeyMinutes) are spent`;
  return null;
}

/* Inspect one checkpoint and write its record. Returns { record, code }:
   code 0 inspected, 1 lost, ambiguous, unverified, no browser, restricted or a limit. */
export async function checkpoint({ cdp, page: match, replay: steps, checkpoint: id, journey, step, role, state, scenario = null, highImpactStep = null, stateAffecting = false, redact = [], redactText = [], origins = null, exclude = [], allow = [], deny = DENY, capture = "both", limits = null, out = "ux-assessment", run = runId(), cwd = process.cwd(), ignore = [], rules = {} }) {
  if (!ID.test(id ?? "")) throw new Error(`--checkpoint must look like C-<journey>-<n>, got "${id}"`);
  const runRoot = resolve(out, run);
  const dir = join(runRoot, "checkpoints", id);
  mkdirSync(dir, { recursive: true });
  const plan = steps ? JSON.parse(readFileSync(steps, "utf8")) : null;
  const mode = steps ? "replay" : "in-place";
  const taken = plan ? (plan.steps ?? []).length + 1 : 1;
  if (scenario != null && !SCENARIOS.includes(scenario)) throw new Error(`--scenario must be one of ${SCENARIOS.join(", ")}, got "${scenario}"`);
  // The risky scenario's high-impact step: given, else a replay step marked highImpact (1-based).
  const marked = (plan?.steps ?? []).findIndex((s) => s.highImpact === true);
  const impact = highImpactStep != null ? Number(highImpactStep) : marked >= 0 ? marked + 1 : null;
  const base = { schema: "inspection", version: 1, auditor: VERSION, checkpoint: { id, journey: journey ?? null, step: step == null ? null : Number(step), role: role ?? null, state: state ?? null, ...(scenario ? { scenario } : {}) }, inspectedAt: new Date().toISOString(), ...(scenario ? { scenario } : {}) };
  const write = (record) => { writeFileSync(join(dir, "inspection.json"), JSON.stringify(record, null, 2) + "\n"); return record; };
  // Limits first: a step past one is not taken (AGW-02).
  const limit = limitReached({ runRoot, id, journey, steps: taken, limits });
  if (limit) {
    recordStage(runRoot, { stage: "walkthrough", status: "partial", reason: `limit reached: ${limit}` });
    return { code: 1, record: write({ ...base, mode, steps: 0, error: "limit", message: `blocked: limit — ${limit}; not taken`, findings: [] }) };
  }
  let session;
  try {
    session = plan ? await replay(plan, { origins, exclude, allow, deny }, { scenario, highImpactStep: impact, dir, capture, redact }) : await attach({ cdp, page: match });
  } catch (e) {
    if (e.code === "no-browser") recordStage(runRoot, { stage: "walkthrough", status: "blocked", reason: e.message });
    return { code: 1, record: write({ ...base, mode, steps: e.taken ?? 0, error: e.code ?? "error", message: e.code === "restricted" ? `blocked: restricted — ${e.message}; ${e.taken != null ? `step ${e.taken + 1} and those after it were not taken` : "nothing was taken"}` : e.message, findings: [] }) };
  }
  try {
    if (plan && !session.passed) return { code: 1, record: write({ ...base, mode, steps: taken, url: session.page.url(), verified: { assertion: session.assertion, passed: false }, findings: [], message: "the replayed state does not match the expected state; nothing was inspected" }) };
    const { page } = session;
    // A page outside the allowed origins, or on an excluded integration, is not evidence this assessment may collect (ENV-02).
    if (origins?.length && !origins.includes(new URL(page.url()).origin)) return { code: 1, record: write({ ...base, mode, steps: 0, url: page.url(), error: "restricted", message: `blocked: restricted — ${new URL(page.url()).origin} is outside run.origins (${origins.join(", ")}); not inspected`, findings: [] }) };
    const x = excluded(exclude).by(page.url());
    if (x) return { code: 1, record: write({ ...base, mode, steps: 0, url: page.url(), error: "restricted", message: `blocked: restricted — ${page.url()} is an excluded integration (${x.entry}); not inspected`, findings: [] }) };
    const sdk = prepare(cwd);
    const result = await inspect(page, { sdk, ignore, rules, stateAffecting });
    const shown = await page.evaluate(() => { const r = [...document.querySelectorAll("[data-theme]")].find((e) => !e.parentElement?.closest("[data-theme]")); return { theme: r?.dataset.theme ?? null, appearance: r?.dataset.appearance ?? null, viewport: { width: innerWidth, height: innerHeight } }; });
    // Evidence of the state inspected, as evidence.capture says, masked where the manifest says (FEAT-009 ENV-03).
    let screenshot = null, tree = null;
    if (capture !== "tree") {
      const shot = join(dir, "screenshot.png");
      await page.screenshot({ path: shot, mask: redact.map((s) => page.locator(s)), animations: "disabled" });
      screenshot = relative(dir, shot);
    }
    if (capture !== "screenshot") {
      let text = await page.locator("body").ariaSnapshot();
      for (const re of redactText) text = text.replace(new RegExp(re, "g"), "***");
      writeFileSync(join(dir, "tree.yml"), text + "\n");
      tree = "tree.yml";
    }
    const findings = enrich(result.findings, sdk.interaction).map((f) => ({ ...f, finding_type: "deterministic", checkpoint: base.checkpoint, viewport: shown.viewport, theme: shown.theme }));
    // An AI scenario (US-082): the risky stop, or what an error-prone state shows; their findings name the AI rule.
    const ai = {};
    const mask = (t) => redactText.reduce((x, re) => x.replace(new RegExp(re, "g"), "***"), t ?? "");
    if (scenario === "risky") {
      // In place, the agent chooses Deny itself; the approval on screen is recorded.
      const stop = session.risky ?? { approval: await page.evaluate(approvalProbe), approved: false };
      if (stop.approval) stop.approval = { ...stop.approval, text: mask(stop.approval.text) };
      ai.risky = stop;
      if (session.risky) findings.push(...riskyFindings(stop).map((f) => ({ ...f, checkpoint: base.checkpoint })));
    }
    if (scenario === "errorProne") {
      const probe = await page.evaluate(errorProbe);
      ai.errorProne = { ...probe, error: probe.error && mask(probe.error), rules: ["agent.recover", "ai.improve-request"] };
      findings.push(...errorFindings(probe).map((f) => ({ ...f, checkpoint: base.checkpoint })));
    }
    // A risky replay takes its steps up to where it stopped, plus the inspection.
    const used = session.risky ? Math.min(taken, session.risky.stoppedAt) : taken;
    return { code: 0, record: write({ ...base, mode, steps: used, url: page.url(), viewport: shown.viewport, theme: shown.theme, appearance: shown.appearance, ...(plan ? { verified: { assertion: session.assertion, passed: true } } : {}), skipped: result.skipped, stateAffecting: result.stateAffecting, ...ai, findings, screenshot, tree }) };
  } finally {
    await session.detach();
  }
}
