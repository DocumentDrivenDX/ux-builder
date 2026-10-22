/* @ux-builder/trace: the episode trace (FEAT-016, ADR-035, CONTRACT-007).

   What ux-builder's tools write to an app while it is built or changed, and
   the export bundle its owner shares by choice. Every function takes the
   app's directory first. Nothing here makes a network request.

     openEpisode(appDir, { trigger, goal, agent, transcripts })   → id
     currentEpisode(appDir)                                        → id | null
     appendEvent(appDir, kind, fields, { by })                     → event | null, never throws
     attemptOf(appDir, check)                                      → n
     closeEpisode(appDir, { status })                              → { episode, status, change, outcome, warnings }
     mask(text, { appDir })                                        → { text, count, kinds }
     attachTranscript(appDir, { file | hookJson })                 → { attached, … }
     exportBundle(appDir, { episodes, since, out, yes, includeOpen }) → { written, … }
     validateTrace(appDir)                                         → [{ file, line, message }] */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { findSecrets, mask as maskText, maskValue, maskedCount, rulesFor } from "./mask.mjs";
import { tarGz, untarGz } from "./tar.mjs";

export { SECRET_PATTERNS, envValues, findSecrets, maskedCount, redactPatterns } from "./mask.mjs";
export { AGENT_GUIDE } from "./guide.mjs";

const OWN = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
export const VERSION = OWN.version;
/* The `by` of the events this package writes itself. */
export const BY = `${OWN.name}@${VERSION}`;
export const KINDS = ["start", "created", "guidance", "check", "decision", "transcript", "change", "outcome", "end"];
export const CHECKS = ["lint", "blueprint", "card", "audit"];
export const TRAILER = "UX-Episode";
/* The only trace file that is not committed: create-app adds these to the app's .gitignore. */
export const GITIGNORE_LINES = [".ux-builder/trace/current"];
export const SCHEMA_DIR = new URL("./schema/", import.meta.url);

const COMMON = ["v", "episode", "seq", "at", "kind", "by"];
const ID = /^E-\d{8}-[a-z0-9]+(-[a-z0-9]+)*$/;

/* ---- Paths, git and small readers ---- */

export function paths(appDir) {
  const root = join(appDir, ".ux-builder");
  return { root, trace: join(root, "trace"), current: join(root, "trace", "current"), transcripts: join(root, "transcripts"), config: join(root, "config.json") };
}
const episodeFile = (appDir, id) => join(paths(appDir).trace, `${id}.jsonl`);

function git(appDir, args) {
  try { return execFileSync("git", args, { cwd: appDir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 }).replace(/\s+$/, ""); } catch { return null; }
}
const isGit = (appDir) => git(appDir, ["rev-parse", "--is-inside-work-tree"]) === "true";

export const slugify = (s, max = 40) => {
  let t = String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (t.length > max) t = t.slice(0, max).replace(/-[^-]*$/, "") || t.slice(0, max);
  return t.replace(/-+$/, "");
};

/* The branch an unscoped episode is keyed by, as an ID-safe slug. */
export function branchOf(appDir) {
  if (!isGit(appDir)) return "no-git";
  const b = git(appDir, ["symbolic-ref", "--short", "-q", "HEAD"]);
  return slugify(b ?? "detached", 60) || "detached";
}

const today = (d = new Date()) => d.toISOString().slice(0, 10).replace(/-/g, "");

export function readConfig(appDir) {
  try { const c = JSON.parse(readFileSync(paths(appDir).config, "utf8")); return c && typeof c === "object" && !Array.isArray(c) ? c : {}; } catch { return {}; }
}

/* The ux-builder package versions the app has installed (or declares, when not installed). */
export function sdkVersions(appDir) {
  const out = {};
  let pkg = {};
  try { pkg = JSON.parse(readFileSync(join(appDir, "package.json"), "utf8")); } catch { /* no package.json */ }
  const names = Object.keys({ ...pkg.devDependencies, ...pkg.dependencies }).filter((n) => n.startsWith("@ux-builder/")).sort();
  for (const n of names) {
    let v = { ...pkg.devDependencies, ...pkg.dependencies }[n];
    try { v = JSON.parse(readFileSync(join(appDir, "node_modules", n, "package.json"), "utf8")).version ?? v; } catch { /* declared range */ }
    out[n] = String(v);
  }
  out[OWN.name] ??= VERSION;
  return out;
}

/* The HELIX the app is on: .claude/skills/helix/HELIX-VERSION.json, else the .helix.yml marker. */
export function helixVersion(appDir) {
  try { const v = JSON.parse(readFileSync(join(appDir, ".claude/skills/helix/HELIX-VERSION.json"), "utf8")).version; if (v) return String(v); } catch { /* none */ }
  try { const m = /^\s*version:\s*"?([^"\s]+)"?/m.exec(readFileSync(join(appDir, ".helix.yml"), "utf8")); if (m) return m[1]; } catch { /* none */ }
  return null;
}

/* ---- Reading episodes ---- */

export function readEpisode(appDir, id) {
  let text;
  try { text = readFileSync(episodeFile(appDir, id), "utf8"); } catch { return []; }
  const out = [];
  for (const l of text.split("\n")) { if (!l.trim()) continue; try { out.push(JSON.parse(l)); } catch { /* validateTrace reports it */ } }
  return out;
}

export function episodeIds(appDir) {
  try { return readdirSync(paths(appDir).trace).filter((n) => n.endsWith(".jsonl")).map((n) => n.slice(0, -6)).filter((id) => ID.test(id)).sort(); } catch { return []; }
}

const isOpen = (events) => events.length > 0 && !events.some((e) => e.kind === "end");

/* Every episode in the app: { id, open, unscoped, start, events }. */
export function listEpisodes(appDir) {
  return episodeIds(appDir).map((id) => {
    const ev = readEpisode(appDir, id);
    const start = ev.find((e) => e.kind === "start") ?? null;
    return { id, open: isOpen(ev), unscoped: !!start?.unscoped || /-unscoped-/.test(id), start, events: ev.length, status: ev.findLast((e) => e.kind === "end")?.status ?? null };
  });
}

/* The open episode named by .ux-builder/trace/current, or null. */
export function currentEpisode(appDir) {
  let id;
  try { id = readFileSync(paths(appDir).current, "utf8").trim(); } catch { return null; }
  if (!ID.test(id) || !existsSync(episodeFile(appDir, id))) return null;
  return isOpen(readEpisode(appDir, id)) ? id : null;
}

const unscopedBase = (appDir, d = new Date()) => `E-${today(d)}-unscoped-${branchOf(appDir)}`;

/* This branch's open unscoped episodes, oldest first. */
function openUnscoped(appDir) {
  const suffix = `-unscoped-${branchOf(appDir)}`;
  return listEpisodes(appDir).filter((e) => e.open && e.unscoped && new RegExp(`^E-\\d{8}${suffix}(-\\d+)?$`).test(e.id)).map((e) => e.id);
}

/* ---- Writing ---- */

/* A lock outside the app (so nothing but `current` needs ignoring) serialises appends. */
function withLock(dir, fn) {
  const lock = join(tmpdir(), `ux-builder-trace-${createHash("sha1").update(resolve(dir)).digest("hex").slice(0, 16)}.lock`);
  let fd = null;
  const sleeper = new Int32Array(new SharedArrayBuffer(4));
  for (let i = 0; i < 400 && fd === null; i++) {
    try { fd = openSync(lock, "wx"); } catch (e) {
      if (e.code !== "EEXIST") break;
      try { if (Date.now() - statSync(lock).mtimeMs > 10_000) unlinkSync(lock); } catch { /* gone already */ }
      Atomics.wait(sleeper, 0, 0, 5);
    }
  }
  try { return fn(); } finally { if (fd !== null) { try { closeSync(fd); unlinkSync(lock); } catch { /* best effort */ } } }
}

function writeEvent(appDir, id, kind, fields = {}, by = BY, rules = rulesFor(appDir)) {
  const file = episodeFile(appDir, id);
  mkdirSync(dirname(file), { recursive: true });
  return withLock(dirname(file), () => {
    let n = 0;
    try { n = readFileSync(file, "utf8").split("\n").filter((l) => l.trim()).length; } catch { /* a new episode */ }
    const own = Object.fromEntries(Object.entries(fields ?? {}).filter(([k, v]) => !COMMON.includes(k) && v !== undefined));
    const event = { v: 1, episode: id, seq: n + 1, at: new Date().toISOString(), kind, by: String(by || BY), ...maskValue(own, rules).value };
    appendFileSync(file, JSON.stringify(event) + "\n");
    return event;
  });
}

const warned = new Set();
function warnOnce(appDir, err) {
  const key = resolve(appDir);
  if (warned.has(key)) return;
  warned.add(key);
  process.stderr.write(`ux-builder-trace: could not write the episode trace in ${join(key, ".ux-builder")} (${err?.message ?? err}); carrying on without it\n`);
}

function startFields(appDir, { trigger = "change", goal = {}, agent = {}, transcripts, sdk, helix } = {}) {
  const list = (x) => (Array.isArray(x) ? x : x == null ? [] : [x]).map(String);
  const inGit = isGit(appDir);
  const commit = inGit ? git(appDir, ["rev-parse", "-q", "--verify", "HEAD"]) || null : null;
  return {
    trigger: trigger === "create" ? "create" : "change",
    goal: { stories: list(goal.stories), screens: list(goal.screens), journeys: list(goal.journeys), text: String(goal.text ?? "") },
    agent: { name: agent?.name ?? null, model: agent?.model ?? null },
    sdk: sdk ?? sdkVersions(appDir),
    helix: helix !== undefined ? helix : helixVersion(appDir),
    ...(transcripts === false ? { transcripts: false } : {}),
    commit,
    ...(inGit ? { branch: branchOf(appDir) } : {}),
  };
}

/* The open episode, else this branch's unscoped one (opened when needed). */
function targetEpisode(appDir) {
  const cur = currentEpisode(appDir);
  if (cur) return cur;
  const open = openUnscoped(appDir);
  const base = unscopedBase(appDir);
  const mine = open.filter((x) => x === base || x.startsWith(`${base}-`));
  if (mine.length) return mine.at(-1);
  let id = base;
  for (let i = 2; existsSync(episodeFile(appDir, id)); i++) id = `${base}-${i}`;
  const branch = branchOf(appDir);
  writeEvent(appDir, id, "start", { ...startFields(appDir, { goal: { text: `Events written on branch ${branch} with no episode open` } }), unscoped: true });
  return id;
}

export class TraceError extends Error {
  constructor(message, code, extra = {}) { super(message); this.code = code; Object.assign(this, extra); }
}

/* Open an episode (US-105-AC2). Refuses while one is open (US-105-AC3). */
export function openEpisode(appDir, { trigger = "change", goal = {}, agent = {}, transcripts = true, slug, sdk, helix, by = BY } = {}) {
  const cur = currentEpisode(appDir);
  if (cur) throw new TraceError(`Episode ${cur} is open; end it first (ux-builder-trace end)`, "EPISODE_OPEN", { episode: cur });
  // Events written with no episode open end here, as unscoped.
  for (const u of openUnscoped(appDir)) closeEpisode(appDir, { episode: u, status: "unscoped", by });
  const base = `E-${today()}-${slugify(slug ?? (goal.text || [...(goal.stories ?? []), ...(goal.screens ?? [])].join(" "))) || "episode"}`;
  let id = base;
  for (let i = 2; existsSync(episodeFile(appDir, id)); i++) id = `${base}-${i}`;
  writeEvent(appDir, id, "start", startFields(appDir, { trigger, goal, agent, transcripts, sdk, helix }), by);
  writeFileSync(paths(appDir).current, id + "\n");
  return id;
}

/* Append an event to the open episode, else to the branch's unscoped one
   (US-105-AC5). Never throws: on failure it warns once on stderr and returns
   null (US-105-AC6). Strings are masked before they are written. */
export function appendEvent(appDir, kind, fields = {}, { by = BY } = {}) {
  try {
    if (!KINDS.includes(kind)) throw new Error(`unknown event kind "${kind}"`);
    if (kind === "start") throw new Error("a start event is written by openEpisode");
    return writeEvent(appDir, targetEpisode(appDir), kind, fields, by);
  } catch (e) {
    warnOnce(appDir, e);
    return null;
  }
}

/* The attempt number for a new `check` event: earlier runs of that check in the episode, plus 1. */
export function attemptOf(appDir, check) {
  try {
    const id = currentEpisode(appDir) ?? openUnscoped(appDir).at(-1);
    if (!id) return 1;
    return readEpisode(appDir, id).filter((e) => e.kind === "check" && e.check === check).length + 1;
  } catch { return 1; }
}

/* ---- What the other tools call ---- */

/* The app a tool works in, for its trace: the nearest folder at or above
   `start` that has .ux-builder/ (create-app makes it; so does the first
   `ux-builder-trace start`), or null. A tool writes no event where there is
   none, so running a check outside an app leaves nothing behind. */
export function findApp(start = process.cwd()) {
  let d = resolve(start);
  for (;;) {
    try { if (statSync(join(d, ".ux-builder")).isDirectory()) return d; } catch { /* not here */ }
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
}

/* A check's findings as the trace keeps them: [{ ruleId, severity, count }],
   one per rule and severity, sorted. `items` are the check's own findings;
   `ruleId` and `severity` read each one (defaults: .ruleId ?? .rule, .severity). */
export function countFindings(items = [], { ruleId = (f) => f.ruleId ?? f.rule, severity = (f) => f.severity } = {}) {
  const by = new Map();
  for (const f of items ?? []) {
    const r = String(ruleId(f) ?? "unknown"), s = severity(f) ?? "error";
    const key = `${r}\u0000${s}`;
    const e = by.get(key) ?? { ruleId: r, severity: typeof s === "number" ? s : String(s), count: 0 };
    e.count++;
    by.set(key, e);
  }
  return [...by.values()].sort((a, b) => a.ruleId.localeCompare(b.ruleId) || String(a.severity).localeCompare(String(b.severity)));
}

/* The status of a check from its findings: fail on an error, warn on a warning, else pass. */
export const statusOf = (findings = []) => (findings.some((f) => f.severity === "error" || f.severity === 2) ? "fail" : findings.some((f) => f.severity === "warning" || f.severity === 1) ? "warn" : "pass");

/* Write a `check` event (US-106-AC2): its attempt is counted here. `fields`:
   { status?, findings (as countFindings returns), report?, verdicts?, assessment? };
   with no status, it follows the findings. Never throws; returns the event or null. */
export function recordCheck(appDir, check, fields = {}, { by = BY } = {}) {
  try {
    if (!CHECKS.includes(check)) throw new Error(`unknown check "${check}"; the checks are ${CHECKS.join(", ")}`);
    const findings = fields.findings ?? [];
    return appendEvent(appDir, "check", { ...fields, check, attempt: attemptOf(appDir, check), status: fields.status ?? statusOf(findings), findings }, { by });
  } catch (e) {
    warnOnce(appDir, e);
    return null;
  }
}

/* Write a `decision` event (US-107-AC1, AC2): `chose` and `why` are required.
   Throws TraceError MISSING naming the field, writing nothing, when one is
   absent; `why` and every other string are masked when written. */
export function recordDecision(appDir, { chose, considered, why, relied, departs, workaround, screen } = {}, { by = "agent" } = {}) {
  for (const [name, v] of [["chose", chose], ["why", why]]) {
    if (typeof v !== "string" || !v.trim()) throw new TraceError(`record_decision needs "${name}": ${name === "chose" ? "what you chose" : "why, in a sentence"}. Nothing was written.`, "MISSING", { field: name });
  }
  const list = (x) => (Array.isArray(x) ? x : x == null ? [] : [x]).map(String);
  const event = appendEvent(appDir, "decision", {
    chose: chose.trim(), considered: list(considered), why: why.trim(), relied: list(relied), departs: !!departs, workaround: !!workaround,
    ...(screen ? { screen: String(screen) } : {}),
  }, { by });
  return event;
}

/* An assessment run's comparison (ux-builder-audit assess compare), as
   outcome.assessment: { run, compare: [{ rule, finding, status }] }, or null. */
export function assessmentRef(runDir) {
  let cmp, backlog = {};
  try { cmp = JSON.parse(readFileSync(join(runDir, "comparison.json"), "utf8")); } catch { return null; }
  try { backlog = JSON.parse(readFileSync(join(runDir, "backlog.json"), "utf8")); } catch { /* no backlog */ }
  const rules = new Map((backlog.findings ?? []).map((f) => [f.id, f.rule ?? f.rule_id ?? f.ruleId ?? null]));
  const run = cmp.to ?? null;
  if (!run || !/^R-/.test(run)) return null;
  return { run, compare: (cmp.findings ?? []).filter((f) => /^F-/.test(f.id)).map((f) => ({ rule: rules.get(f.id) ?? null, finding: f.id, status: f.status })) };
}

/* ---- Closing ---- */

function changeOf(appDir, id, events) {
  const warnings = [];
  const start = events.find((e) => e.kind === "start") ?? {};
  const screens = [...new Set([...(start.goal?.screens ?? []), ...events.filter((e) => e.kind === "decision" && e.screen).map((e) => e.screen)])];
  const none = { commits: [], files: 0, screens, ...(start.commit ? {} : { parent: null }) };
  if (!isGit(appDir)) return { change: none, warnings: ["not a git repository, so no commits are recorded"] };
  if (!git(appDir, ["rev-parse", "-q", "--verify", "HEAD"])) return { change: none, warnings };
  // From the commit the episode opened on; with none (before the first commit), every commit on HEAD.
  const range = start.commit ? [`${start.commit}..HEAD`] : start.commit === null ? ["HEAD"] : ["HEAD", `--since=${start.at}`];
  const log = git(appDir, ["log", "--format=%H%x1f%s%x1f%B%x1e", ...range]) ?? "";
  const commits = [], untrailered = [];
  const re = new RegExp(`^${TRAILER}:\\s*(\\S+)\\s*$`, "gmi");
  for (const rec of log.split("\x1e")) {
    const [sha, subject, body] = rec.replace(/^\s+/, "").split("\x1f");
    if (!sha) continue;
    const ids = [...(body ?? "").matchAll(re)].map((m) => m[1]);
    if (ids.includes(id)) commits.push(sha);
    else if (!ids.length) { untrailered.push(sha); warnings.push(`commit ${sha.slice(0, 7)} ("${subject}") has no "${TRAILER}: ${id}" trailer`); }
  }
  commits.reverse(); untrailered.reverse();
  // With no commit at the start, the change is measured from the parent of the episode's first trailer commit.
  const parent = start.commit ? undefined : commits.length ? git(appDir, ["rev-parse", "-q", "--verify", `${commits[0]}^`]) || null : null;
  const base = start.commit || parent;
  // With no base, every file HEAD holds is new (git does not always know the empty tree object).
  const files = (git(appDir, base ? ["diff", "--name-only", base, "HEAD"] : ["ls-tree", "-r", "--name-only", "HEAD"]) ?? "").split("\n").filter((f) => f && !f.startsWith(".ux-builder/")).length;
  return { change: { commits, ...(untrailered.length ? { untrailered } : {}), files, screens, ...(parent !== undefined ? { parent } : {}) }, warnings };
}

const GREEN = new Set(["pass", "warn"]);
function outcomeOf(events, assessment) {
  const checks = events.filter((e) => e.kind === "check");
  const checksToGreen = {};
  for (const c of CHECKS) {
    const runs = checks.filter((e) => e.check === c);
    if (!runs.length) continue;
    const i = runs.findIndex((e) => GREEN.has(e.status));
    // The attempt on which the check first passed (1 when it passed first time), as tools/learn.mjs reads it.
    checksToGreen[c] = i < 0 ? null : (runs[i].attempt ?? i + 1);
  }
  const a = checks.filter((e) => e.check === "audit").at(-1);
  // The last audit's verdicts ({ theme, modality: [{ modality, status }] }) and its findings per rule; {} with no audit.
  const audit = { verdicts: a?.verdicts ?? null, findings: Object.fromEntries((a?.findings ?? []).reduce((m, f) => m.set(f.ruleId, (m.get(f.ruleId) ?? 0) + (f.count ?? 1)), new Map())) };
  const ref = assessment ?? checks.filter((e) => e.assessment).at(-1)?.assessment ?? null;
  return { audit, assessment: ref, checksToGreen };
}

/* Close the open episode (else this branch's unscoped one, as `unscoped`):
   writes change, outcome and end (US-105-AC4, AC5). */
export function closeEpisode(appDir, { status = "done", by = BY, assessment, episode, files } = {}) {
  let id = episode ?? currentEpisode(appDir);
  let unscoped = false;
  if (!id) { id = openUnscoped(appDir).at(-1); unscoped = true; }
  if (!id) throw new TraceError("No episode is open", "NO_EPISODE");
  const events = readEpisode(appDir, id);
  if (!isOpen(events)) throw new TraceError(`Episode ${id} has already ended`, "ENDED", { episode: id });
  if (events.find((e) => e.kind === "start")?.unscoped) unscoped = true;
  const final = unscoped ? "unscoped" : status === "abandoned" ? "abandoned" : "done";
  const rules = rulesFor(appDir);
  const { change, warnings } = changeOf(appDir, id, events);
  // With no commit to count from, the tool that closes the episode may know how many files it wrote (create-app does).
  if (Number.isInteger(files) && files >= 0 && !change.commits.length) change.files = files;
  // Screens changed with no decision recorded (US-107-AC4).
  if (!unscoped && change.screens.length && !events.some((e) => e.kind === "decision")) {
    warnings.push(`no decisions were recorded, though the episode changed screen${change.screens.length === 1 ? "" : "s"} ${change.screens.join(", ")}: record each pattern choice, departure and workaround with record_decision (or ux-builder-trace decide)`);
  }
  const outcome = outcomeOf(events, assessment);
  writeEvent(appDir, id, "change", change, by, rules);
  writeEvent(appDir, id, "outcome", outcome, by, rules);
  writeEvent(appDir, id, "end", { status: final }, by, rules);
  try { if (readFileSync(paths(appDir).current, "utf8").trim() === id) unlinkSync(paths(appDir).current); } catch { /* not current */ }
  return { episode: id, status: final, change, outcome, warnings };
}

/* ---- Masking and transcripts ---- */

/* mask(text, { appDir }) → { text, count, kinds } (CONTRACT-007 Masking). */
export function mask(text, { appDir } = {}) { return maskText(text, { appDir }); }

/* Copy a transcript into .ux-builder/transcripts/<episode>/<n>.<ext>, masked,
   and write a `transcript` event (US-108-AC2 to AC5). */
export function attachTranscript(appDir, { file, hookJson, agent, by = BY } = {}) {
  let session = null;
  if (hookJson != null) {
    const hook = typeof hookJson === "string" ? JSON.parse(hookJson) : hookJson;
    file ??= hook?.transcript_path;
    session = hook?.session_id ?? null;
    agent ??= "claude-code";
    if (file && hook?.cwd) file = resolve(hook.cwd, file);
  }
  if (!file) throw new TraceError("No transcript to attach: pass --file, or a hook's JSON with transcript_path on stdin", "USAGE");
  if (readConfig(appDir).transcripts === false) return { attached: false, reason: 'transcripts are off: .ux-builder/config.json sets "transcripts": false, so nothing was copied' };
  const cur = currentEpisode(appDir);
  const start = cur ? readEpisode(appDir, cur).find((e) => e.kind === "start") : null;
  if (start?.transcripts === false) return { attached: false, episode: cur, reason: `episode ${cur} was started with --no-transcripts, so nothing was copied` };
  const src = resolve(file);
  const raw = readFileSync(src, "utf8");
  const id = targetEpisode(appDir);
  const rules = rulesFor(appDir);
  const m = maskText(raw, { rules });
  const dir = join(paths(appDir).transcripts, id);
  mkdirSync(dir, { recursive: true });
  const n = readdirSync(dir).filter((x) => /^\d+\./.test(x)).length + 1;
  const ext = extname(src).slice(1).replace(/[^A-Za-z0-9]/g, "") || "txt";
  const rel = `transcripts/${id}/${n}.${ext}`;
  const buf = Buffer.from(m.text, "utf8");
  writeFileSync(join(paths(appDir).root, rel), buf);
  const sha256 = createHash("sha256").update(buf).digest("hex");
  const name = agent ?? (start ?? readEpisode(appDir, id).find((e) => e.kind === "start"))?.agent?.name ?? "unknown";
  const event = writeEvent(appDir, id, "transcript", { file: rel, agent: String(name), bytes: buf.length, sha256, masked: m.count, ...(session ? { session: String(session) } : {}) }, by, rules);
  return { attached: true, episode: id, file: rel, bytes: buf.length, sha256, masked: m.count, kinds: m.kinds, event };
}

/* ---- Validation ---- */

let validators = null;
function compiled() {
  if (validators) return validators;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const load = (n) => JSON.parse(readFileSync(new URL(n, SCHEMA_DIR), "utf8"));
  validators = { event: ajv.compile(load("event.schema.json")), bundle: ajv.compile(load("bundle.schema.json")), config: ajv.compile(load("config.schema.json")) };
  return validators;
}
const explain = (errors) => (errors ?? []).filter((e) => e.keyword !== "if").map((e) => {
  const extra = e.params?.unevaluatedProperty ?? e.params?.additionalProperty;
  return `${e.instancePath || "/"} ${extra ? `has unknown field "${extra}"` : e.message}`;
});

/* Schema problems of one event, of a bundle.json, of a config.json: string[]. */
export const validateEvent = (e) => (compiled().event(e) ? [] : explain(compiled().event.errors));
export const validateBundle = (b) => (compiled().bundle(b) ? [] : explain(compiled().bundle.errors));
export const validateConfig = (c) => (compiled().config(c) ? [] : explain(compiled().config.errors));

/* Every problem in the app's trace: [{ file, line, message }] (CONTRACT-007
   Error Semantics: a malformed line, a seq gap, an unknown kind, a schema failure). */
export function validateTrace(appDir, { episodes } = {}) {
  const problems = [];
  const p = paths(appDir);
  if (existsSync(p.config)) {
    let c;
    try { c = JSON.parse(readFileSync(p.config, "utf8")); } catch (e) { problems.push({ file: ".ux-builder/config.json", line: null, message: `not JSON: ${e.message}` }); }
    if (c !== undefined) for (const m of validateConfig(c)) problems.push({ file: ".ux-builder/config.json", line: null, message: m });
  }
  for (const id of episodes ?? episodeIds(appDir)) {
    const file = `.ux-builder/trace/${id}.jsonl`;
    let text;
    try { text = readFileSync(episodeFile(appDir, id), "utf8"); } catch { problems.push({ file, line: null, message: "no such episode" }); continue; }
    const lines = text.split("\n");
    if (lines.at(-1) === "") lines.pop();
    let expect = 1, ended = false;
    lines.forEach((l, i) => {
      const line = i + 1;
      const add = (message) => problems.push({ file, line, message });
      let e;
      try { e = JSON.parse(l); } catch { add("malformed line: not JSON"); expect++; return; }
      if (!e || typeof e !== "object" || Array.isArray(e)) { add("malformed line: not a JSON object"); expect++; return; }
      if (!KINDS.includes(e.kind)) add(`unknown kind "${e.kind}"`);
      else for (const m of validateEvent(e)) add(m);
      if (e.episode !== id) add(`episode is "${e.episode}", not ${id}`);
      if (Number.isInteger(e.seq)) { if (e.seq !== expect) add(`seq gap: expected ${expect}, found ${e.seq}`); expect = e.seq + 1; } else expect++;
      if (line === 1 && e.kind !== "start") add("the first event is not start");
      if (ended) add(`${e.kind} after end`);
      if (e.kind === "end") ended = true;
      if (e.kind === "transcript" && typeof e.file === "string" && !existsSync(join(p.root, e.file))) add(`transcript ${e.file} is missing`);
    });
  }
  return problems;
}

/* ---- Export ---- */

function repoName(appDir) {
  const url = git(appDir, ["remote", "get-url", "origin"]);
  if (url) { const m = /([^/:]+\/[^/:]+?)(?:\.git)?\/?$/.exec(url); if (m) return m[1]; }
  const top = git(appDir, ["rev-parse", "--show-toplevel"]);
  return basename(top || resolve(appDir));
}

/* Export chosen episodes as a .tgz (US-109): lists every file with its masked
   count, asks for confirmation unless `yes`, masks again and fails on any
   secret pattern left in the stored trace, checks the schemas, then writes.
   No network request. Returns { written, out, bundle, files, preview }. */
export async function exportBundle(appDir, { episodes, since, out, yes = false, includeOpen = false, confirm, log = (s) => process.stderr.write(s + "\n") } = {}) {
  if (!out) throw new TraceError("export needs --out <file>.tgz", "USAGE");
  const all = listEpisodes(appDir);
  const byId = new Map(all.map((e) => [e.id, e]));
  let chosen;
  if (episodes?.length) {
    chosen = [];
    for (const id of episodes) {
      const e = byId.get(id);
      if (!e) throw new TraceError(`No episode ${id} in ${paths(appDir).trace}`, "USAGE");
      if (e.open && !includeOpen) throw new TraceError(`Episode ${id} is still open; end it first, or pass --include-open`, "USAGE");
      chosen.push(e);
    }
  } else {
    const from = since ? new Date(since) : null;
    if (from && Number.isNaN(from.getTime())) throw new TraceError(`--since ${since} is not a date`, "USAGE");
    chosen = all.filter((e) => !from || new Date(e.start?.at ?? `${e.id.slice(2, 6)}-${e.id.slice(6, 8)}-${e.id.slice(8, 10)}`) >= from);
    for (const e of chosen.filter((x) => x.open && !includeOpen)) log(`skipping ${e.id}: still open (--include-open includes it)`);
    if (!includeOpen) chosen = chosen.filter((e) => !e.open);
  }
  if (!chosen.length) throw new TraceError("No episodes to export", "EMPTY");
  const ids = chosen.map((e) => e.id);

  const invalid = validateTrace(appDir, { episodes: ids }).filter((x) => x.file !== ".ux-builder/config.json");
  if (invalid.length) throw new TraceError(`The trace does not validate, so nothing was written:\n${invalid.map((x) => `  ${x.file}${x.line ? `:${x.line}` : ""}: ${x.message}`).join("\n")}`, "INVALID", { problems: invalid });

  const p = paths(appDir);
  const files = [];
  for (const id of ids) {
    files.push({ path: `trace/${id}.jsonl`, abs: episodeFile(appDir, id) });
    const dir = join(p.transcripts, id);
    let names = [];
    try { names = readdirSync(dir).filter((n) => /^\d+\.[A-Za-z0-9]+$/.test(n)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10)); } catch { /* none */ }
    for (const n of names) files.push({ path: `transcripts/${id}/${n}`, abs: join(dir, n) });
  }
  const rules = rulesFor(appDir);
  const left = [];
  for (const f of files) {
    const text = readFileSync(f.abs, "utf8");
    for (const h of findSecrets(text, { rules })) left.push({ file: `.ux-builder/${f.path}`, line: h.line, kind: h.kind });
    f.data = Buffer.from(maskText(text, { rules }).text, "utf8");
    f.masked = maskedCount(f.data.toString("utf8"));
  }
  let pkgName = null;
  try { pkgName = JSON.parse(readFileSync(join(appDir, "package.json"), "utf8")).name ?? null; } catch { /* none */ }
  const bundle = {
    v: 1,
    app: { name: pkgName, repoHash: `sha256:${createHash("sha256").update(repoName(appDir)).digest("hex")}` },
    sdk: sdkVersions(appDir),
    episodes: ids,
    exportedAt: new Date().toISOString(),
    masked: files.reduce((n, f) => n + f.masked, 0),
    files: files.map((f) => ({ path: f.path, bytes: f.data.length, masked: f.masked })),
  };
  const bundleText = JSON.stringify(bundle, null, 2) + "\n";
  for (const h of findSecrets(bundleText, { rules })) left.push({ file: "bundle.json", line: h.line, kind: h.kind });
  if (left.length) throw new TraceError(`An unmasked secret pattern is in the trace, so nothing was written:\n${left.map((x) => `  ${x.file}:${x.line} (${x.kind})`).join("\n")}\nRemove it from the file (and from the repository's history if it was committed), then export again.`, "SECRET", { problems: left });
  const bad = validateBundle(bundle);
  if (bad.length) throw new TraceError(`bundle.json does not validate: ${bad.join("; ")}`, "INVALID", { problems: bad });

  const preview = [{ path: "bundle.json", bytes: Buffer.byteLength(bundleText), masked: 0 }, ...bundle.files];
  log(`The bundle ${out} will hold ${ids.length} episode${ids.length === 1 ? "" : "s"} (${ids.join(", ")}) for app ${pkgName ?? "(unnamed)"}, repository hashed, no remote URL:`);
  for (const f of preview) log(`  ${f.path}  ${f.bytes} bytes  masked ${f.masked}`);
  if (!yes) {
    const ok = confirm ? await confirm(preview) : false;
    if (!ok) return { written: false, out, bundle, files: bundle.files, preview, reason: confirm ? "not confirmed" : "needs confirmation (yes: true, or --yes)" };
  }
  const gz = tarGz([{ name: "bundle.json", data: bundleText }, ...files.map((f) => ({ name: f.path, data: f.data }))]);
  const target = resolve(out);
  mkdirSync(dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.tmp`;
  writeFileSync(tmp, gz);
  renameSync(tmp, target);
  return { written: true, out: target, bundle, files: bundle.files, preview };
}

/* Read a bundle written by exportBundle: { bundle, files: Map(path → text) }. */
export function readBundle(file) {
  const entries = untarGz(readFileSync(file));
  const bundle = JSON.parse(entries.get("bundle.json")?.toString("utf8") ?? "null");
  const files = new Map([...entries].filter(([k]) => k !== "bundle.json").map(([k, v]) => [k, v.toString("utf8")]));
  return { bundle, files };
}
