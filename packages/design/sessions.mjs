/* Human usability testing (CONTRACT-008 Commands, FEAT-018 GDL-55 to
   GDL-58; ADR-039): observations from a test kit's sessions imported as
   findings with source: human, consented transcripts kept as masked, cited
   excerpts, and the measures across sessions the rubric's observed column
   reads. Participants appear only by pseudonym; a real name given in a
   sheet is kept in .ux-builder/participants.local.json, out of git. */

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, isAbsolute, join, relative, sep } from "node:path";
import { mask } from "@ux-builder/trace";
import { DesignError, writeInApp } from "./app.mjs";
import { PERSONAL_PATTERNS } from "./documents.mjs";
import { writeEvidence } from "./research.mjs";
import { readState, writeState } from "./state.mjs";
import { kits } from "./testkit.mjs";

const PARTICIPANTS = ".ux-builder/participants.local.json";
const PSEUDONYM = /^P[1-9][0-9]*$/;
const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
const today = () => new Date().toISOString().slice(0, 10);
const abs = (app, f) => (isAbsolute(f) ? f : existsSync(join(app, f)) ? join(app, f) : f);

/* A CSV text as rows of cells (quotes and doubled quotes understood). */
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

/* The pseudonyms in use, and a way to name a participant by one. */
function pseudonyms(app, { reserved = [] } = {}) {
  const known = readJson(join(app, PARTICIPANTS)) ?? {};
  // Pseudonyms the input already uses for other people are never handed out again.
  const taken = new Set(reserved.filter((x) => PSEUDONYM.test(x)));
  let changed = false;
  const of = (who) => {
    const w = String(who ?? "").trim();
    if (!w) return null;
    if (PSEUDONYM.test(w)) return w;
    const hit = Object.entries(known).find(([, name]) => String(name).trim().toLowerCase() === w.toLowerCase());
    if (hit) return hit[0];
    let n = 1;
    while (known[`P${n}`] !== undefined || taken.has(`P${n}`)) n++;
    const p = `P${n}`;
    known[p] = w; changed = true;
    return p;
  };
  const save = () => { if (changed) writeInApp(app, PARTICIPANTS, JSON.stringify(known, null, 2) + "\n"); };
  return { of, save, names: () => known };
}

/* Masked text: the trace's masking (secrets and the app's redact patterns),
   email addresses and phone numbers, and every participant's real name
   replaced by their pseudonym. */
export function maskPersonal(text, { app, names = {} } = {}) {
  let t = mask(String(text ?? ""), { appDir: app }).text;
  for (const [what, re] of PERSONAL_PATTERNS) t = t.replace(new RegExp(re.source, "g"), `[masked:${what.split(" ")[0]}]`);
  for (const [p, name] of Object.entries(names)) {
    for (const part of [String(name).trim(), ...String(name).trim().split(/\s+/).filter((w) => w.length > 2)]) {
      if (part) t = t.replace(new RegExp(`\\b${part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), p);
    }
  }
  return t;
}

/* The kit's tasks from its scenarios table: [{ n, journey }]. */
function kitTaskList(app, kit) {
  const file = join(app, "docs/ux/tests", kit, "scenarios.md");
  if (!existsSync(file)) throw new DesignError(`no kit ${kit} (docs/ux/tests/${kit}/scenarios.md); write one with ux-builder-design test-kit`);
  return readFileSync(file, "utf8").split("\n").map((l) => /^\|\s*(\d+)\s*\|\s*(J-[^|\s]+)\s*\|/.exec(l)).filter(Boolean).map((m) => ({ n: Number(m[1]), journey: m[2] }));
}

const yes = (v) => /^(y|yes|true|1|done|completed)$/i.test(String(v ?? "").trim());
const num = (v) => { const n = Number(String(v ?? "").trim()); return String(v ?? "").trim() !== "" && Number.isFinite(n) ? n : null; };
export const findingIdFor = (kit, participant, task) => `F-${createHash("sha256").update(`${kit}|${participant}|${task}`).digest("hex").slice(0, 8)}`;

/* Severity on Nielsen's 0 to 4 scale, from what was observed. */
const severityOf = (o) => (!o.completed ? 3 : o.assists || o.errors ? 2 : o.problem ? 1 : 0);

/* ux-builder-design observe import <file> --kit <TK-n>. */
export function observeImport(app, { file, kit } = {}) {
  if (!file) throw new DesignError("observe import needs the sheet: observe import <file> --kit TK-<n>");
  if (!/^TK-[1-9][0-9]*$/.test(kit ?? "")) throw new DesignError(`--kit names the test kit, such as TK-1, not "${kit ?? ""}"`);
  const path = abs(app, file);
  if (!existsSync(path)) throw new DesignError(`no such file: ${file}`);
  const tasks = kitTaskList(app, kit);
  const text = readFileSync(path, "utf8");
  let rows;
  if (/\.json$/i.test(path)) {
    const data = JSON.parse(text);
    rows = Array.isArray(data) ? data : data.observations ?? data.rows ?? [];
  } else {
    const [head, ...body] = parseCsv(text);
    const cols = head.map((h) => h.trim().toLowerCase());
    rows = body.map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i] ?? ""])));
  }
  const people = pseudonyms(app, { reserved: rows.map((r) => String(r.participant ?? "").trim()) });
  // Real names in the sheet are masked out of every remark, before anything is written.
  const sheetNames = rows.map((r) => String(r.participant ?? "").trim()).filter((w) => w && !PSEUDONYM.test(w));
  const findings = [], skipped = [];
  for (const [i, r] of rows.entries()) {
    const task = num(r.task);
    const t = tasks.find((x) => x.n === task);
    if (!t) { skipped.push({ row: i + 1, task: r.task ?? null, reason: `task ${r.task ?? "(none)"} is not in ${kit} (tasks ${tasks.map((x) => x.n).join(", ")})` }); continue; }
    const participant = people.of(r.participant);
    if (!participant) { skipped.push({ row: i + 1, task, reason: "no participant" }); continue; }
    const names = { ...people.names(), ...Object.fromEntries(sheetNames.map((n) => [people.of(n), n])) };
    const o = {
      id: findingIdFor(kit, participant, task), source: "human", kit, participant, task, journey: t.journey,
      completed: yes(r.completed), seconds: num(r.seconds ?? r.time), errors: num(r.errors) ?? 0, assists: num(r.assists) ?? 0,
      remark: maskPersonal(r.remark ?? "", { app, names }),
      ...(String(r.problem ?? "").trim() ? { problem: maskPersonal(r.problem, { app, names }).trim() } : {}),
    };
    o.severity = severityOf(o);
    o.title = o.problem ?? (o.completed ? `${participant} completed task ${task}` : `${participant} did not complete task ${task}`);
    findings.push(o);
  }
  people.save();
  // A sheet kept in the app (and so in git) keeps only pseudonyms and masked remarks.
  const rel = relative(app, path).split(sep).join("/");
  let rewritten = null;
  if (!rel.startsWith("..") && rel.startsWith("docs/ux/") && /\.csv$/i.test(rel) && sheetNames.length) {
    const names = people.names();
    const [head, ...body] = parseCsv(text);
    const cols = head.map((h) => h.trim().toLowerCase());
    const at = (c) => cols.indexOf(c);
    const cellOut = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ""));
    const lines = [head.join(","), ...body.map((r) => r.map((v, i) => (i === at("participant") ? people.of(v) ?? v : ["remark", "problem"].includes(cols[i]) ? maskPersonal(v, { app, names }) : v)).map(cellOut).join(","))];
    rewritten = writeInApp(app, rel, lines.join("\n") + "\n");
  }
  const out = `docs/ux/tests/${kit}/findings.json`;
  const was = readJson(join(app, out)) ?? {};
  const fresh = new Set(findings.map((f) => f.id));
  const all = [...(was.findings ?? []).filter((f) => !fresh.has(f.id)), ...findings].sort((a, b) => (a.task ?? 0) - (b.task ?? 0) || String(a.participant ?? "").localeCompare(String(b.participant ?? ""), "en", { numeric: true }) || (a.id < b.id ? -1 : 1));
  const sessions = [...new Set(all.filter((f) => f.source === "human").map((f) => f.participant))].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  writeInApp(app, out, JSON.stringify({ kit, sessions, findings: all }, null, 2) + "\n");
  return { kit, path: out, imported: findings.length, findings, skipped, sessions, ...(rewritten ? { rewritten } : {}) };
}

const MEDIA = new Set([".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg", ".oga", ".opus", ".mp4", ".mov", ".m4v", ".webm", ".mkv", ".avi", ".wmv"]);

/* The lines of a transcript: [{ at, speaker, text }] for lines such as
   "[00:01:23] P1: text" or "00:01:23 Facilitator: text". */
export function transcriptLines(text) {
  return String(text).split("\n").map((l) => /^\s*\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s+([^:]{1,40}):\s*(.*)$/.exec(l)).filter(Boolean).map((m) => ({ at: m[1], speaker: m[2].trim(), text: m[3].trim() }));
}

/* ux-builder-design transcript add <file> --session <id> --consent-confirmed [--by <name>] [--cite <time>]... */
export function transcriptAdd(app, { file, session, consentConfirmed = false, by, cite = [], date = today(), source } = {}) {
  if (!session?.trim()) throw new DesignError("transcript add needs --session: the session the transcript is of");
  if (!consentConfirmed) throw new DesignError(`consent must be confirmed for session ${session} before its transcript is analysed: ask the owner, then add --consent-confirmed (ADR-039). Nothing was written.`);
  if (!file) throw new DesignError("transcript add needs the transcript file");
  if (MEDIA.has(extname(file).toLowerCase())) throw new DesignError(`${file} is a recording; recordings stay with their owner (ADR-039, D-5). Transcribe it locally and add the transcript.`);
  const path = abs(app, file);
  if (!existsSync(path)) throw new DesignError(`no such file: ${file}`);
  const lines = transcriptLines(readFileSync(path, "utf8"));
  const missing = cite.filter((t) => !lines.some((l) => l.at === t));
  if (missing.length) throw new DesignError(`no line at ${missing.join(", ")} in ${file}; cite a line by its timestamp`);
  const people = pseudonyms(app);
  const cited = lines.filter((l) => cite.includes(l.at));
  const staff = (s) => /^(facilitator|moderator|observer|interviewer)$/i.test(s);
  const speakers = Object.fromEntries(cited.filter((l) => !staff(l.speaker)).map((l) => [l.speaker, people.of(l.speaker)]));
  const names = { ...people.names() };
  const excerpts = cited.map((l) => `${staff(l.speaker) ? l.speaker : speakers[l.speaker]}: [${l.at}] "${maskPersonal(l.text, { app, names }).replace(/"/g, "'")}"`);
  people.save();
  const participants = Object.fromEntries(Object.values(speakers).map((p) => [p, "participant"]));
  const ev = writeEvidence(app, { file, kind: "transcript", date, source: source ?? file, title: `transcript of session ${session}`, excerpts, participants,
    extra: [`  session: ${JSON.stringify(session)}`, "  consent:", "    confirmed: true", ...(by ? [`    by: ${JSON.stringify(by)}`] : []), `    date: ${date}`] });
  const state = readState(app);
  state.consents = [...(state.consents ?? []).filter((c) => c.session !== session), { session, confirmed: true, ...(by ? { by } : {}), date, evidence: ev.id }];
  writeState(app, state);
  return { ...ev, session, excerpts: excerpts.length, consent: { confirmed: true, ...(by ? { by } : {}), date } };
}

/* Every human finding across the kits: [{ ...finding }]. */
export function humanFindings(app) {
  return kits(app).flatMap((k) => (readJson(join(app, "docs/ux/tests", k, "findings.json"))?.findings ?? []).map((f) => ({ kit: k, ...f })).filter((f) => f.source === "human"));
}

const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const rate = (n, d) => (d ? Math.round((n / d) * 100) / 100 : null);

/* Measures per kit task, and the problems seen in two or more sessions. */
export function observedMeasures(app) {
  const fs = humanFindings(app);
  const keys = [...new Set(fs.map((f) => `${f.kit}#${f.task}`))];
  const tasks = keys.map((k) => {
    const xs = fs.filter((f) => `${f.kit}#${f.task}` === k);
    const times = xs.map((f) => f.seconds).filter((s) => s != null);
    return { kit: xs[0].kit, task: xs[0].task, journey: xs[0].journey, sessions: xs.length, completionRate: rate(xs.filter((f) => f.completed).length, xs.length), medianSeconds: median(times), errorRate: rate(xs.filter((f) => f.errors > 0).length, xs.length), assists: xs.reduce((a, f) => a + (f.assists ?? 0), 0) };
  });
  const byProblem = new Map();
  for (const f of fs.filter((x) => x.problem)) {
    const k = f.problem.toLowerCase();
    const e = byProblem.get(k) ?? { problem: f.problem, sessions: new Set(), tasks: new Set(), findings: [] };
    e.sessions.add(`${f.kit}/${f.participant}`); e.tasks.add(`${f.kit}#${f.task}`); e.findings.push(f.id);
    byProblem.set(k, e);
  }
  const recurring = [...byProblem.values()].filter((e) => e.sessions.size >= 2).map((e) => ({ problem: e.problem, sessions: e.sessions.size, tasks: [...e.tasks].sort(), findings: e.findings.sort() })).sort((a, b) => b.sessions - a.sessions || a.problem.localeCompare(b.problem));
  const sessions = new Set(fs.map((f) => `${f.kit}/${f.participant}`)).size;
  return { sessions, attempts: fs.length, tasks, recurring, kits: [...new Set(fs.map((f) => f.kit))].sort() };
}

/* The rubric's observed side, from human findings (FEAT-018 GDL-59):
   { [dimension]: { value, evidence, verdict } }. A verdict compares the
   observation with what was predicted: supports or contradicts. The
   thresholds are the guide's, stated with each value: under 80% of
   attempts completed contradicts "every journey walkable"; half or more
   of attempts needing help contradicts discoverability; half or more
   of attempts with an error not completed contradicts error recovery. */
export function observedDimensions(app, predicted = {}) {
  const fs = humanFindings(app);
  if (!fs.length) return {};
  const m = observedMeasures(app);
  const evidence = m.kits;
  const n = fs.length, done = fs.filter((f) => f.completed).length;
  const out = {};
  const completion = done / n;
  out["task-effectiveness"] = { value: `${Math.round(completion * 100)}% of ${n} attempts completed (${m.sessions} sessions)`, evidence, verdict: predicted["task-effectiveness"]?.fails ? (completion >= 0.8 ? "contradicts" : "supports") : completion < 0.8 ? "contradicts" : "supports" };
  const times = fs.map((f) => f.seconds).filter((s) => s != null);
  if (times.length) out["task-efficiency"] = { value: `median ${median(times)} s a task`, evidence, verdict: null };
  const helped = fs.filter((f) => f.assists > 0).length;
  out.discoverability = { value: `${helped} of ${n} attempts needed help`, evidence, verdict: helped / n >= 0.5 ? "contradicts" : "supports" };
  const erred = fs.filter((f) => f.errors > 0);
  if (erred.length) {
    const recovered = erred.filter((f) => f.completed).length;
    out["error-recovery"] = { value: `${recovered} of ${erred.length} attempts with an error still completed`, evidence, verdict: recovered / erred.length < 0.5 ? "contradicts" : "supports" };
  }
  return out;
}

/* Kits whose findings.json exists. */
export const kitsWithFindings = (app) => kits(app).filter((k) => existsSync(join(app, "docs/ux/tests", k, "findings.json")));
export const evidenceFiles = (app) => (existsSync(join(app, "docs/ux/evidence")) ? readdirSync(join(app, "docs/ux/evidence")).filter((f) => /^EV-\d+\.md$/.test(f)) : []);
