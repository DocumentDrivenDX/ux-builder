/* ux-builder-audit assess video: replay each walked journey for the camera
   and write its annotation timeline (FEAT-013 REP-01 to REP-06, ANN-01,
   ANN-02, ANN-04, OUT-01, PRV-01 to PRV-03; ADR-031; CONTRACT-006
   "Walkthrough videos").

   Per journey with done steps, and per viewport (default 1440 × 900):
   - one recording, in a browser of our own, signed in from the role's
     storage state before it starts, with the request guard of
     `inspect --replay` (origins, excluded integrations) and its refusals
     (denied and unallowed actions, never an approve control);
   - a title card, then the main path and each walked alternate as
     chapters, each after its fixture's reset and with cookies and storage
     put back to the role's signed-in state, behind a card;
   - each step at a human pace (holds(): about 2 s a step, and at each
     finding as long as its caption takes to read at 200 words a minute,
     never under 5 s; --pace slow or fast scales both), with a cursor and
     click marks, and a chapter per step titled "<journey> · step <n>:
     <screen>" (FEAT-015 RPT-06, RPT-07);
   - at each checkpoint, the state it recorded checked again; a different
     state stops the chapter with a card, and shows none of its findings;
   - at a checkpoint with findings, the page held still while each is read,
     and the finding's time range, its elements' boxes and its rule (ID and
     full statement, or heuristic and source) written to the timeline;
   - an end card.
   The manifest's evidence.redact (and every password field) is masked from
   the first frame; if the mask is not on a page, the journey's video is
   discarded and listed as not recorded.

   Writes, under <run>/video/: <J>[@WxH].clean.webm, .annotations.json,
   .vtt, .chapters.vtt, video.json, and the player, index.html
   (video-player.mjs). The MP4 is made from these (video-render.mjs).
   Writes nothing else. */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { chromium } from "playwright";
import { wouldApprove } from "./ai.mjs";
import { guardContext, recordStage, refusal } from "./checkpoint.mjs";
import { runDir } from "./plan.mjs";
import { catalogueRules, ruleOf } from "./rules.mjs";
import { layer } from "./video-layer.mjs";
import { writePlayer } from "./video-player.mjs";
import { findFfmpeg, renderMp4 } from "./video-render.mjs";

export const DEFAULT_VIEWPORT = { width: 1440, height: 900 };
/* A finding's caption holds at least min seconds, and perWord seconds a word
   (200 words a minute); the manifest's video.holdSeconds can change both. */
export const HOLD = { min: 5, perWord: 60 / 200 };
/* The pace's scale and its floors (FEAT-015 RPT-06; CONTRACT-006). */
export const PACES = { slow: 1.5, normal: 1, fast: 0.6 };
export const STEP_SECONDS = 2;
export const FLOOR = { step: 1, finding: 3 };
const PACE = { beforeStep: 450, move: 650, afterClick: 500, typeDelay: 55, card: 2600, title: 3200, end: 4500 };
const PRIORITY = ["P0", "P1", "P2", "P3"];

const json = (f) => JSON.parse(readFileSync(f, "utf8"));
const maybe = (f) => { try { return json(f); } catch { return null; } };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const words = (t) => String(t ?? "").trim().split(/\s+/).filter(Boolean).length;
/* The words a finding's caption shows: the problem, the rule (ID and
   statement, or heuristic and source) and the fix. */
export const captionWords = (caption, rule = null) => words(caption.problem) + words(caption.recommendation) + (rule ? words(rule.id ?? "") + words(rule.statement ?? "") + words(rule.heuristic ?? "") + words(rule.source ?? "") : 0);

/* How long the video holds, in seconds, at a pace (FEAT-015 RPT-06;
   US-103-AC1, AC2): a step 2 s, a finding max(5 s, its words ÷ 200 × 60 s);
   slow × 1.5, fast × 0.6; never under 1 s a step or 3 s a finding. Pure. */
export function holds(pace = "normal", hold = HOLD) {
  if (!(pace in PACES)) throw new Error(`pace is slow, normal or fast, not "${pace}"`);
  const k = PACES[pace];
  return {
    pace, scale: k,
    step: +Math.max(FLOOR.step, STEP_SECONDS * k).toFixed(3),
    finding: (n) => +Math.max(FLOOR.finding, Math.max(hold.min ?? HOLD.min, (hold.perWord ?? HOLD.perWord) * n) * k).toFixed(3),
  };
}
export const holdFor = (caption, hold = HOLD, pace = "normal", rule = null) => holds(pace, hold).finding(captionWords(caption, rule));
export const videoName = (journey, viewport) => (viewport.width === DEFAULT_VIEWPORT.width && viewport.height === DEFAULT_VIEWPORT.height ? journey : `${journey}@${viewport.width}x${viewport.height}`);
export const kindOf = (f) => (f.finding_type === "heuristic" ? "judgment" : "checked");

/* The findings a checkpoint shows: those whose evidence cites it, by priority then ID. */
export function findingsAt(findings, checkpoint) {
  const cites = (r) => r === checkpoint || r === `checkpoints/${checkpoint}` || r.startsWith(`checkpoints/${checkpoint}/`);
  return findings.filter((f) => (f.evidence_refs ?? []).some(cites)).sort((a, b) => PRIORITY.indexOf(a.priority) - PRIORITY.indexOf(b.priority) || (a.id < b.id ? -1 : 1));
}

/* A journey's chapters from its walkthrough steps: the main path, then
   each alternate (steps with `alternate: n`), in order. */
export function chaptersOf(journey, plan) {
  const steps = (journey.steps ?? []).filter((s) => s.status === "done");
  const main = steps.filter((s) => s.alternate == null);
  const alts = [...new Set(steps.filter((s) => s.alternate != null).map((s) => s.alternate))].sort((a, b) => a - b);
  const planned = new Map((plan?.alternates ?? []).map((a) => [a.n, a]));
  return [
    ...(main.length ? [{ id: "main", kind: "main", title: "Main path", steps: main }] : []),
    ...alts.map((n) => ({ id: `alternate-${n}`, kind: "alternate", alternate: n, title: `Alternate ${n}${planned.get(n)?.reason ? `: ${planned.get(n).reason}` : ""}`, steps: steps.filter((s) => s.alternate === n) })),
  ];
}

/* The role's signed-in state (REP-03): a storage state from the manifest,
   or from the variable auth.env names (a path to one, or its JSON). Guest
   access (auth: none) starts signed out. Returns { state } or { reason }. */
export function signIn(role, { dir, env = process.env }) {
  const auth = role?.auth;
  if (!auth || auth === "none") return { state: null };
  const read = (p) => { const f = isAbsolute(p) ? p : resolve(dir, p); return existsSync(f) ? { state: json(f) } : null; };
  if (auth.storageState) return read(auth.storageState) ?? { reason: `role ${role.id}'s storage state ${auth.storageState} does not exist; sign in once to create it` };
  const v = env[auth.env];
  if (!v) return { reason: `role ${role.id}'s credential variable ${auth.env} is not set` };
  try { return read(v) ?? { state: JSON.parse(v) }; } catch { return { reason: `${auth.env} holds neither a storage state file nor its JSON; a video signs in from a Playwright storage state, before recording starts` }; }
}

/* A fixture's reset, without blocking the replay's event loop. */
const reset = (command, cwd) => new Promise((done) => {
  const child = spawn(command, { shell: true, cwd, stdio: "ignore" });
  const timer = setTimeout(() => child.kill(), 60_000);
  child.on("exit", () => { clearTimeout(timer); done(); });
  child.on("error", () => { clearTimeout(timer); done(); });
});

const vtt = (cues) => "WEBVTT\n\n" + cues.map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join("\n");
const stamp = (t) => { const ms = Math.round(t * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`; };
/* The rule line of a caption: "<id>: <statement>", or "Heuristic: <name> (<source>)". */
export const ruleText = (r) => (!r ? "" : r.id ? `${r.id}: ${r.statement}` : `Heuristic: ${r.heuristic}${r.source ? ` (${r.source})` : ""}`);
export const captionText = (a) => `[${a.kind === "judgment" ? "Judgment" : "Checked"} · ${a.priority}${a.confidence === "low" ? " · worth checking with users" : ""}] ${a.caption.problem}${a.rule ? ` Rule ${ruleText(a.rule)}` : ""} Fix: ${a.caption.recommendation} (${a.finding})`;

/* A step's screen, for its chapter title: the step's own, the blueprint
   journey's step's, else its URL's path, else its action. */
export function screenOf(step, planJ) {
  if (step.screen) return step.screen;
  const planned = step.alternate == null ? planJ?.steps?.find((x) => x.n === step.n)?.screen : null;
  if (planned) return planned;
  if (step.url) { try { return new URL(step.url, "http://x").pathname; } catch { return step.url; } }
  return step.action;
}
export const stepTitle = (journey, step, planJ) => `${journey} · step ${step.n}: ${screenOf(step, planJ)}`;

/* A finding's rule, as the timeline carries it. */
const ruleOfFinding = (f, rules) => { const x = ruleOf(f, rules); return !x ? null : x.kind === "rule" ? { id: x.id, statement: x.statement } : { heuristic: x.name, ...(x.source ? { source: x.source } : {}) }; };

/* Replay one journey at one viewport, recording. */
async function recordJourney(browser, ctx) {
  const { journey, planJ, chapters, viewport, role, signedIn, resolved, findings, inspections, outDir, name, appName, runId, startedAt, hold, deadline, pace, timeScale, rules } = ctx;
  // Real time is scaled by timeScale (1; tests run faster); the timeline records what was shown.
  const wait = (ms) => sleep(ms * timeScale);
  const held = holds(pace, hold);
  const guard = { origins: resolved.run.origins, exclude: resolved.restrictions.excludeIntegrations, allow: resolved.restrictions.allow, deny: resolved.restrictions.deny };
  const tmp = join(outDir, `.recording-${name}`);
  rmSync(tmp, { recursive: true, force: true });
  const context = await browser.newContext({ viewport, recordVideo: { dir: tmp, size: viewport }, ...(signedIn ? { storageState: signedIn } : {}) });
  await guardContext(context, guard);
  const redact = resolved.evidence?.redact ?? {};
  await context.addInitScript(layer, { selectors: redact.selectors ?? [], text: redact.text ?? [] });
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  const t0 = Date.now();
  const now = () => (Date.now() - t0) / 1000;
  const out = { chapters: [], steps: [], annotations: [], discarded: null };
  const layerOn = async () => { try { return await page.evaluate(() => window.__piqVideo?.ok === true); } catch { return false; } };
  const card = async (html) => { await page.evaluate((h) => window.__piqVideo?.card(h), html).catch(() => {}); };
  let last = null;
  const pointAt = async (locator) => {
    await locator.waitFor({ state: "visible" });
    await locator.scrollIntoViewIfNeeded();
    const b = await locator.boundingBox();
    if (!b) return null;
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    await page.evaluate(([x, y, ms]) => window.__piqVideo?.move(x, y, ms), [x, y, PACE.move * timeScale]);
    await wait(PACE.move + 100);
    last = { x, y };
    return { x, y };
  };
  const settle = async () => { await page.waitForLoadState("networkidle", { timeout: 1000 }).catch(() => {}); };
  const titleCard = (kicker, title, lines = []) => `<p class="kicker">${esc(kicker)}</p><h1>${esc(title)}</h1>${lines.map((l) => `<p>${esc(l)}</p>`).join("")}`;

  // Title card (ANN-04), on a page of its own before the app's.
  const guest = !role?.auth || role.auth === "none";
  const title = { id: "title", kind: "title", title: [appName, planJ?.goal ?? journey.id, journey.id, planJ?.story, `role ${role?.id ?? planJ?.role ?? "?"}${guest ? " (guest)" : ""}`, `${viewport.width}×${viewport.height}`, `run ${runId}`].filter(Boolean).join(" · "), start: 0, status: "recorded" };
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#12161c;color:#f2f4f7;font:400 20px/1.45 system-ui,-apple-system,'Segoe UI',sans-serif;display:grid;place-content:center;gap:12px;height:100vh;text-align:center"><p style="margin:0;font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:#f5a524">${esc(appName)} · walkthrough</p><h1 style="margin:0;font-size:40px;font-weight:650">${esc(planJ?.goal ?? journey.id)}</h1><p style="margin:0;color:#c3cad5">${esc(journey.id)}${planJ?.blueprint ? ` (blueprint ${esc(planJ.blueprint)})` : ""} · ${esc(planJ?.story ?? "")} · role ${esc(role?.id ?? planJ?.role ?? "")}${guest ? " (guest)" : ""}</p><p style="margin:0;color:#c3cad5">${viewport.width} × ${viewport.height} · run ${esc(runId)}${startedAt ? ` · ${esc(startedAt.slice(0, 10))}` : ""}</p></body></html>`);
  await wait(PACE.title);
  title.end = now();
  out.chapters.push(title);

  const shownAt = new Set();
  for (const [ci, ch] of chapters.entries()) {
    const chapter = { id: ch.id, kind: ch.kind, ...(ch.alternate ? { alternate: ch.alternate } : {}), title: ch.title, start: now(), status: "recorded" };
    out.chapters.push(chapter);
    const stop = async (reason) => {
      chapter.status = "stopped"; chapter.reason = reason;
      await card(titleCard("Chapter stopped", ch.title, [reason, "Findings after this point are not shown."]));
      await wait(PACE.card);
      chapter.end = now();
    };
    // Refused before any step is taken (ENV-01, ENV-02).
    const why = refusal({ baseUrl: resolved.run.baseUrl, steps: ch.steps.map((s) => s.do ?? {}) }, guard);
    if (why) { await stop(`not replayed: ${why}`); continue; }
    // Between chapters: the fixture's reset and the signed-in state, behind a card.
    if (ci > 0) {
      await card(titleCard(journey.id, ch.title));
      const fx = (resolved.fixtures ?? []).find((f) => f.id === planJ?.fixture);
      if (fx?.reset) await reset(fx.reset, resolved.run.cwd);
      await context.clearCookies();
      await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* no storage */ } }).catch(() => {});
      if (signedIn?.cookies?.length) await context.addCookies(signedIn.cookies);
      const here = (() => { try { return new URL(page.url()).origin; } catch { return null; } })();
      const ls = signedIn?.origins?.find((o) => o.origin === here)?.localStorage ?? [];
      if (ls.length) await page.evaluate((items) => { for (const { name, value } of items) localStorage.setItem(name, value); }, ls).catch(() => {});
    }
    if (!ch.steps[0]?.do?.goto) await page.goto(resolved.run.baseUrl, { waitUntil: "load" });
    let covered = ci > 0;
    for (const s of ch.steps) {
      // Each step is a chapter of its own in the chapter track (RPT-07).
      const stepMark = { n: s.n, chapter: ch.id, title: stepTitle(journey.id, s, planJ), screen: screenOf(s, planJ), start: +now().toFixed(3) };
      out.steps.push(stepMark);
      const closeStep = () => { stepMark.end = +now().toFixed(3); };
      if (deadline && Date.now() > deadline) { await stop(`limit reached: the journey's ${resolved.limits.journeyMinutes} minutes (limits.journeyMinutes) are spent`); break; }
      const d = s.do;
      if (!d) { await stop(`step ${s.n} records no replay step ("do")`); break; }
      try {
        await wait(PACE.beforeStep);
        if (d.goto) {
          await page.goto(new URL(d.goto, resolved.run.baseUrl).href, { waitUntil: "load" });
          await settle();
        } else if (d.click) {
          if (await page.evaluate(wouldApprove, { selector: d.click })) { await stop(`step ${s.n} would activate an approve control; the assessment never approves`); break; }
          const l = page.locator(d.click).first();
          const at = await pointAt(l);
          if (at) await page.evaluate(([x, y]) => window.__piqVideo?.mark(x, y), [at.x, at.y]);
          await l.click();
          await wait(PACE.afterClick);
          await settle();
        } else if (d.fill) {
          const l = page.locator(d.fill).first();
          const secret = typeof d.value === "object" && d.value?.secret;
          const value = secret ? process.env[d.value.secret] : d.value ?? "";
          if (secret && value == null) { await stop(`step ${s.n} types the secret ${d.value.secret}, which is not set`); break; }
          if (secret) await page.evaluate((sel) => window.__piqVideo?.addMask(sel), d.fill);
          const at = await pointAt(l);
          if (at) await page.evaluate(([x, y]) => window.__piqVideo?.mark(x, y), [at.x, at.y]);
          await l.fill("");
          await l.pressSequentially(String(value), { delay: PACE.typeDelay * timeScale });
        } else if (d.press) {
          if (await page.evaluate(wouldApprove, { key: d.press })) { await stop(`step ${s.n} would activate an approve control; the assessment never approves`); break; }
          await page.keyboard.press(d.press);
          await settle();
        } else if (d.waitFor) {
          await page.waitForSelector(d.waitFor);
        }
      } catch (e) {
        await stop(`step ${s.n} (${s.action}) no longer replays: ${e.message.split("\n")[0]}`);
        break;
      }
      if (!(await layerOn())) { out.discarded = `the mask layer is not on ${page.url()}; nothing is recorded without it (PRV-01)`; break; }
      if (last) await page.evaluate(([x, y]) => window.__piqVideo?.move(x, y, 0), [last.x, last.y]).catch(() => {});
      if (covered) { await card(null); covered = false; }
      // The step holds (RPT-06): 2 s at the normal pace.
      await wait(held.step * 1000);
      if (!s.checkpoint) { closeStep(); continue; }
      // The state the checkpoint recorded (REP-05).
      const insp = inspections.get(s.checkpoint);
      const want = s.url ?? insp?.url;
      const path = (u) => { try { const x = new URL(u, resolved.run.baseUrl); return x.pathname + x.search; } catch { return u; } };
      if (want && path(page.url()) !== path(want)) { await stop(`at ${s.checkpoint}, the page is ${path(page.url())}, not ${path(want)} as when it was inspected`); break; }
      const assertion = insp?.verified?.assertion;
      if (assertion?.selector) {
        const l = page.locator(assertion.selector).first();
        const ok = (await l.count()) > 0 && (await l.isVisible()) && (!assertion.text || (await l.innerText()).includes(assertion.text));
        if (!ok) { await stop(`at ${s.checkpoint}, ${assertion.selector}${assertion.text ? ` with "${assertion.text}"` : ""} is not shown as when it was inspected`); break; }
      }
      // Hold for each finding, writing its range and boxes (ANN-01, ANN-02).
      for (const f of findingsAt(findings, s.checkpoint)) {
        if (shownAt.has(`${f.id} ${s.checkpoint}`)) continue;
        shownAt.add(`${f.id} ${s.checkpoint}`);
        const sels = f.elements?.length ? f.elements : [...new Set((insp?.findings ?? []).filter((x) => x.selector && (x.rule === f.rule || x.ruleId === f.rule)).map((x) => x.selector))];
        const boxes = [];
        for (const [k, sel] of sels.entries()) {
          try {
            const l = page.locator(sel).first();
            if (!(await l.count()) || !(await l.isVisible())) continue;
            if (k === 0) await l.scrollIntoViewIfNeeded();
            const b = await l.boundingBox();
            if (b) boxes.push({ x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) });
          } catch { /* not on this page: a caption only */ }
        }
        const caption = f.plain ?? { problem: f.title, recommendation: f.recommendation };
        const rule = ruleOfFinding(f, rules);
        const secs = held.finding(captionWords(caption, rule));
        const start = now();
        await wait(secs * 1000);
        out.annotations.push({ finding: f.id, checkpoint: s.checkpoint, chapter: ch.id, start: +start.toFixed(3), end: +now().toFixed(3), hold: +secs.toFixed(3), kind: kindOf(f), priority: f.priority, ...(f.confidence?.level ? { confidence: f.confidence.level } : {}), boxes, ...(rule ? { rule } : {}), caption });
      }
      closeStep();
    }
    if (out.discarded) break;
    if (chapter.end == null) chapter.end = now();
  }

  if (!out.discarded) {
    const shown = out.annotations.map((a) => a.finding);
    const byP = PRIORITY.map((p) => [p, findings.filter((f) => shown.includes(f.id) && f.priority === p).length]).filter(([, n]) => n);
    const stopped = out.chapters.filter((c) => c.status === "stopped");
    const lines = [byP.length ? `Findings shown: ${byP.map(([p, n]) => `${n} ${p}`).join(", ")}` : "No findings were shown on this journey.",
      ...stopped.map((c) => `${c.title} stopped: ${c.reason}`), `Details: report.html in run ${runId}`];
    const end = { id: "end", kind: "end", title: "End", start: now(), status: "recorded" };
    await card(`<p class="kicker">${esc(journey.id)} · end</p><h2>${esc(planJ?.goal ?? journey.id)}</h2><ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`);
    await wait(PACE.end);
    end.end = now();
    out.chapters.push(end);
  }
  out.duration = +now().toFixed(3);
  const video = page.video();
  await context.close();
  const file = join(outDir, `${name}.clean.webm`);
  if (out.discarded) rmSync(tmp, { recursive: true, force: true });
  else { await video.saveAs(file); rmSync(tmp, { recursive: true, force: true }); }
  for (const c of out.chapters) { c.start = +c.start.toFixed(3); c.end = +(c.end ?? out.duration).toFixed(3); }
  // A step a stop cut short ends where its chapter does.
  for (const st of out.steps) st.end ??= out.chapters.find((c) => c.id === st.chapter)?.end ?? out.duration;
  return out;
}

/* Run `assess video`: returns { code, dir, record, stage }. */
/* pace: slow, normal or fast (FEAT-015 RPT-06). timeScale scales real time
   only, for tests (a number for pace is read as one, as before). */
export async function video({ manifest, resolved, out, run, journeys: only = [], viewports = [], env = process.env, now = Date.now, pace = "normal", timeScale = 1, ffmpeg = "ffmpeg" }) {
  if (typeof pace === "number") { timeScale = pace; pace = "normal"; }
  if (!(pace in PACES)) return { code: 2, error: `--pace is slow, normal or fast, not "${pace}"` };
  const dir = runDir(manifest, resolved, out, run);
  const vdir = join(dir, "video");
  const walk = maybe(join(dir, "walkthrough.json"));
  if (!walk) { recordStage(dir, { stage: "video", status: "blocked", reason: "no walkthrough.json: walk the journeys first", startedAt: new Date(now()).toISOString() }); return { code: 1, dir, error: "no walkthrough.json in the run; walk the journeys first" }; }
  const plan = maybe(join(dir, "plan.json"));
  const backlog = maybe(join(dir, "backlog.json"));
  const runRec = maybe(join(dir, "run.json"));
  const findings = backlog?.findings ?? [];
  const inspections = new Map();
  if (existsSync(join(dir, "checkpoints"))) for (const c of readdirSync(join(dir, "checkpoints"))) { const r = maybe(join(dir, "checkpoints", c, "inspection.json")); if (r) inspections.set(c, r); }
  const vps = viewports.length ? viewports : resolved.video?.viewports?.length ? resolved.video.viewports : [DEFAULT_VIEWPORT];
  const hold = { ...HOLD, ...resolved.video?.holdSeconds };
  mkdirSync(vdir, { recursive: true });
  const startedAt = new Date(now()).toISOString();
  const record = { schema: "video", version: 1, pace, videos: [], notRecorded: [] };
  const rules = catalogueRules(dir, runRec);
  const browser = await chromium.launch();
  try {
    for (const j of walk.journeys ?? []) {
      if (only.length && !only.includes(j.id)) continue;
      const planJ = plan?.journeys?.find((x) => x.id === j.id);
      const chapters = chaptersOf(j, planJ);
      if (!chapters.length) { record.notRecorded.push({ journey: j.id, reason: "no done steps in walkthrough.json" }); continue; }
      const roleId = planJ?.role ?? resolved.journeys?.find((x) => x.id === j.id)?.role;
      const role = (resolved.roles ?? []).find((r) => r.id === roleId);
      const auth = signIn(role, { dir: manifest.dir, env });
      if (auth.reason) { for (const viewport of vps) record.notRecorded.push({ journey: j.id, viewport, reason: auth.reason }); continue; }
      for (const viewport of vps) {
        const name = videoName(j.id, viewport);
        const deadline = resolved.limits?.journeyMinutes ? Date.now() + resolved.limits.journeyMinutes * 60_000 : null;
        const r = await recordJourney(browser, { journey: j, planJ, chapters, viewport, role, signedIn: auth.state, resolved, findings, inspections, outDir: vdir, name, appName: resolved.app?.name ?? "", runId: run, startedAt: runRec?.startedAt ?? null, hold, deadline, pace, timeScale, rules });
        if (r.discarded) { record.notRecorded.push({ journey: j.id, viewport, reason: r.discarded }); continue; }
        const timeline = { schema: "annotations", version: 1, journey: j.id, viewport, pace, duration: r.duration, chapters: r.chapters, steps: r.steps, annotations: r.annotations };
        writeFileSync(join(vdir, `${name}.annotations.json`), JSON.stringify(timeline, null, 2) + "\n");
        writeFileSync(join(vdir, `${name}.vtt`), vtt(r.annotations.map((a) => ({ start: a.start, end: a.end, text: captionText(a) }))));
        // The chapter track: the title card, each step ("J-review · step 2: entry"), the end (RPT-07).
        const track = [...r.chapters.filter((c) => c.kind === "title"), ...r.steps, ...r.chapters.filter((c) => c.kind === "end")].map((c) => ({ start: c.start, end: c.end, text: c.kind === "title" ? `${j.id} · ${c.title}` : c.kind === "end" ? `${j.id} · end` : c.title }));
        writeFileSync(join(vdir, `${name}.chapters.vtt`), vtt(track));
        const ranges = new Map();
        for (const a of r.annotations) ranges.set(a.finding, [...(ranges.get(a.finding) ?? []), { start: a.start, end: a.end }]);
        record.videos.push({ journey: j.id, viewport, steps: r.steps.map(({ n, chapter, title, start, end }) => ({ n, chapter, title, start, end })), files: { clean: `${name}.clean.webm`, annotations: `${name}.annotations.json`, captions: `${name}.vtt`, chapters: `${name}.chapters.vtt` }, chapters: r.chapters, findings: [...ranges].map(([id, rs]) => ({ id, ranges: rs })) });
      }
    }
  } finally { await browser.close(); }
  // The MP4s (OUT-03): with ffmpeg on the PATH; without it, the player still works.
  const problems = [];
  const encoder = record.videos.length ? findFfmpeg(ffmpeg) : null;
  if (record.videos.length && !encoder) problems.push("ffmpeg is not on the PATH, so no MP4 was written; the player (video/index.html) still plays every journey");
  if (encoder) for (const v of record.videos) {
    const name = v.files.clean.replace(/\.clean\.webm$/, "");
    try {
      await renderMp4({ clean: join(vdir, v.files.clean), timeline: json(join(vdir, v.files.annotations)), out: join(vdir, `${name}.mp4`), ffmpeg: encoder, work: join(vdir, `.render-${name}`) });
      v.files.mp4 = `${name}.mp4`;
    } catch (e) { problems.push(e.message); }
  }
  writeFileSync(join(vdir, "video.json"), JSON.stringify(record, null, 2) + "\n");
  writePlayer(dir, { autoPause: resolved.video?.autoPause ?? true, appName: resolved.app?.name ?? null });
  const stopped = record.videos.flatMap((v) => v.chapters.filter((c) => c.status === "stopped").map((c) => `${v.journey} ${c.title}: ${c.reason}`));
  const reasons = [...record.notRecorded.map((n) => `${n.journey} not recorded: ${n.reason}`), ...stopped, ...problems];
  const partial = reasons.length > 0;
  const stage = { stage: "video", status: partial ? "partial" : "completed", ...(partial ? { reason: reasons.join("; ") } : {}), startedAt };
  recordStage(dir, stage);
  return { code: partial ? 1 : 0, dir, record, stage };
}
