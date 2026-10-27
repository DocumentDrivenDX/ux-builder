/* The person's review of each item the guide produces (CONTRACT-008
   Commands, FEAT-018 GDL-79, GDL-83). Items fall in three tiers:
   foundations (the brief, target users, jobs, stories, business rules and
   decisions) are reviewed deliberately, a table per kind; what is built
   from them (tasks, journeys, alternatives, screens, kits) is reviewed as
   one coverage map, its exceptions one by one; records (evidence, reports,
   insights, experiments) need no approval: the decisions they lead to are
   asked at the checkpoints. An approval keeps what was approved as its
   meaning (no frontmatter, no formatting), so a change to metadata or
   layout keeps it, and a change to the meaning shows as a diff.
   Checkpoints do not pass while items of the steps they close await review. */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DesignError, bpFile, ux } from "./app.mjs";
import { businessRules, helixRoot, jobsTable, parseDocument, ruleCitations, usersTable } from "./documents.mjs";
import { logEvent } from "./metrics.mjs";
import { readState, writeState } from "./state.mjs";

const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
const list = (x) => (Array.isArray(x) ? x : []);
const hashOf = (text) => createHash("sha256").update(text).digest("hex").slice(0, 16);
const read = (app, p) => (existsSync(join(app, p)) ? readFileSync(join(app, p), "utf8") : null);
const files = (app, dir, re) => (existsSync(join(app, dir)) ? readdirSync(join(app, dir)).filter((f) => re.test(f)).sort((a, b) => a.localeCompare(b, "en", { numeric: true })) : []);
const today = () => new Date().toISOString();

/* The tier of each kind of item (GDL-83). */
export const TIERS = {
  foundation: ["brief", "user", "job", "story", "rule", "decision"],
  derived: ["task", "journey", "alternative", "screen", "kit"],
  record: ["evidence", "report", "insight", "experiment"],
};
const kindOf = (id) => id.split(":")[0];
export const tierOf = (id) => Object.keys(TIERS).find((t) => TIERS[t].includes(kindOf(id)));

/* What an item means, for its approval: a document without its
   frontmatter, each line without trailing space, list markers and blank
   runs made one form, a paragraph's wrapped lines joined into one, and
   bold or underline markers dropped (US-161-AC1). Formatting and metadata
   do not change it; code blocks are kept as they are. Blueprint items,
   shown as one "key: value" line each, keep their lines (join: false). */
const BLOCK = /^(\s*(-|1\.)\s|#{1,6}\s|\||>|```|~~~|\s{4})/;
export function meaningOf(content, { join = true } = {}) {
  const text = /^---\n/.test(content) ? parseDocument(content).body : content;
  const out = [];
  let code = false;
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (/^\s*(```|~~~)/.test(raw)) { code = !code; out.push(raw.replace(/\s+$/, "")); continue; }
    if (code) { out.push(raw.replace(/\s+$/, "")); continue; }
    const l = raw.replace(/\s+$/, "").replace(/^(\s*)[*+](\s)/, "$1-$2").replace(/^(\s*)\d+[.)](\s)/, "$11.$2").replace(/\*\*|__/g, "").replace(/[ \t]+/g, " ");
    const prev = out.at(-1);
    // A line that carries on the paragraph or list item above it is the same line, wrapped.
    if (join && l.trim() && prev?.trim() && !BLOCK.test(l) && !/^(#{1,6}\s|\||```|~~~)/.test(prev.trimStart())) out[out.length - 1] = `${prev} ${l.trim()}`;
    else out.push(l);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* A line diff, a before b: [{ op: " "|"-"|"+", line }], unchanged lines kept for context. */
export function lineDiff(a, b) {
  const x = a.split("\n"), y = b.split("\n");
  const L = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i--) for (let j = y.length - 1; j >= 0; j--) L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) { out.push({ op: " ", line: x[i] }); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) out.push({ op: "-", line: x[i++] });
    else out.push({ op: "+", line: y[j++] });
  }
  while (i < x.length) out.push({ op: "-", line: x[i++] });
  while (j < y.length) out.push({ op: "+", line: y[j++] });
  return out;
}
/* Only the changed lines, with a line of context each side. */
export function diffText(d) {
  const changed = (e) => !!e && e.op !== " ";
  const keep = d.map((e, k) => changed(e) || changed(d[k - 1]) || changed(d[k + 1]));
  const out = [];
  d.forEach((e, k) => { if (keep[k]) out.push(`${e.op} ${e.line}`); else if (k && keep[k - 1]) out.push("  …"); });
  while (out[0] === "  " || out[0] === "  …") out.shift();
  while (out.at(-1) === "  " || out.at(-1) === "  …") out.pop();
  return out.join("\n");
}

/* A blueprint object as lines a person can read: "key: value", lists joined. */
function readable(obj) {
  return Object.entries(obj ?? {}).map(([k, v]) => {
    const val = Array.isArray(v) ? v.map((x) => (x && typeof x === "object" ? Object.entries(x).map(([a, b]) => `${a} ${typeof b === "object" ? JSON.stringify(b) : b}`).join(", ") : x)).join("; ") : v && typeof v === "object" ? JSON.stringify(v) : v;
    return `${k}: ${val}`;
  }).join("\n");
}

/* The HELIX user stories by ID: { US-n: { file, text } }. */
function stories(app) {
  const root = helixRoot(app);
  const out = {};
  const walk = (dir) => {
    for (const e of existsSync(join(app, dir)) ? readdirSync(join(app, dir), { withFileTypes: true }) : []) {
      const rel = `${dir.replace(/\/$/, "")}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/^US-\d+.*\.md$/.test(e.name)) { const text = readFileSync(join(app, rel), "utf8"); const id = String(parseDocument(text).front?.ddx?.id ?? e.name.match(/^US-\d+/)[0]); out[id] = { file: rel, text }; }
    }
  };
  if (root) walk(root);
  return out;
}

/* Every reviewable item, in step order: [{ id, step, title, file, content, hash }]. */
export function reviewItems(app) {
  const bp = readJson(join(app, bpFile(app))) ?? {};
  let state = null;
  try { state = readState(app); } catch { /* no design state */ }
  const items = [];
  const add = (id, step, title, file, content, { join = true } = {}) => {
    if (content == null) return;
    const meaning = meaningOf(content, { join });
    items.push({ id, step, tier: tierOf(id), title, file, content, meaning, join, hash: hashOf(meaning), raw: hashOf(content) });
  };
  const fields = { join: false };
  // 1 Define intent
  add("brief", 1, "The experience brief", ux(app, "brief.md"), read(app, ux(app, "brief.md")));
  // 2 Understand users
  for (const [id, u] of Object.entries(usersTable(app) ?? {})) add(`user:${id}`, 2, u.user, ux(app, "users.md"), readable({ id, user: u.user, context: u.context, needs: u.needs, jobs: u.jobs.map((j) => `${j.job} ${j.importance}`), evidence: u.evidence, confidence: u.confidence, status: u.status }), fields);
  for (const [id, j] of Object.entries(jobsTable(app) ?? {})) add(`job:${id}`, 2, j.job, ux(app, "jobs.md"), readable({ id, job: j.job, importance: j.importance, evidence: j.evidence, confidence: j.confidence, status: j.status }), fields);
  for (const f of files(app, ux(app, "evidence"), /^EV-\d+\.md$/)) add(`evidence:${f.replace(/\.md$/, "")}`, 2, `Research evidence ${f.replace(/\.md$/, "")}`, `${ux(app)}/evidence/${f}`, read(app, `${ux(app)}/evidence/${f}`));
  // 3 Model tasks: the stories the journeys cite, the tasks, and the business rules they cite
  const us = stories(app);
  for (const id of [...new Set(list(bp.journeys).map((j) => j?.story).filter(Boolean))]) if (us[id]) add(`story:${id}`, 3, parseDocument(us[id].text).body.match(/^# (.+)$/m)?.[1] ?? id, us[id].file, us[id].text);
  for (const t of list(bp.tasks).filter((x) => x?.id)) add(`task:${t.id}`, 3, t.goal ?? t.id, bpFile(app), readable(t), fields);
  const rules = businessRules(app).rules;
  for (const id of [...new Set(ruleCitations(bp).map((c) => c.rule))]) add(`rule:${id}`, 3, rules[id]?.text ?? id, rules[id]?.file ?? bpFile(app), readable({ rule: rules[id]?.text ?? "not defined in HELIX", ...(list(bp.businessRules).find((r) => r?.id === id) ?? {}) }), fields);
  // 4 Explore alternatives
  for (const j of list(bp.journeys).filter((x) => x?.id)) add(`journey:${j.id}`, 4, j.id, bpFile(app), readable(j), fields);
  for (const a of list(state?.alternatives)) { const text = read(app, a.file ?? bpFile(app, a.name)); if (text) add(`alternative:${a.name}`, 4, `Alternative ${a.name}`, a.file ?? bpFile(app, a.name), text); }
  for (const f of files(app, ux(app, "decisions"), /^UXD-\d+\.md$/)) add(`decision:${f.replace(/\.md$/, "")}`, 4, parseDocument(read(app, `${ux(app)}/decisions/${f}`)).body.match(/^# (.+)$/m)?.[1] ?? f, `${ux(app)}/decisions/${f}`, read(app, `${ux(app)}/decisions/${f}`));
  // 5 Design the structure
  for (const s of list(bp.screens).filter((x) => x?.id)) add(`screen:${s.id}`, 5, s.title ?? s.id, bpFile(app), readable(s), fields);
  // 7 Test with people
  for (const d of files(app, ux(app, "tests"), /^TK-\d+$/)) {
    const dir = `${ux(app)}/tests/${d}`;
    if (!statSync(join(app, dir)).isDirectory()) continue;
    add(`kit:${d}`, 7, `Test kit ${d}`, `${dir}/kit.md`, ["kit.md", "scenarios.md", "script.md", "screener.md", "consent.md"].map((f) => read(app, `${dir}/${f}`)).filter(Boolean).join("\n\n"));
  }
  for (const f of files(app, ux(app, "evaluations"), /^UER-\d+\.md$/)) add(`report:${f.replace(/\.md$/, "")}`, 7, `UX evaluation report ${f.replace(/\.md$/, "")}`, `${ux(app)}/evaluations/${f}`, read(app, `${ux(app)}/evaluations/${f}`));
  // 8 Refine and improve
  for (const f of files(app, ux(app, "insights"), /^INS-[\d-]+\.md$/)) add(`insight:${f.replace(/\.md$/, "")}`, 8, `Production insights ${f.replace(/\.md$/, "")}`, `${ux(app)}/insights/${f}`, read(app, `${ux(app)}/insights/${f}`));
  for (const f of files(app, ux(app, "experiments"), /^EXP-\d+\.md$/)) add(`experiment:${f.replace(/\.md$/, "")}`, 8, `Experiment ${f.replace(/\.md$/, "")}`, `${ux(app)}/experiments/${f}`, read(app, `${ux(app)}/experiments/${f}`));
  return items;
}

/* What was last shown to the person (US-161-AC3): { item | "map": hash },
   on this machine only. Approving again something that changed after its
   approval, or the coverage map again, needs it shown as it is now. */
const SHOWN = ".ux-builder/shown.local.json";
const shownOf = (app) => readJson(join(app, SHOWN)) ?? {};
function markShown(app, entries) {
  try {
    const p = join(app, SHOWN);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify({ ...shownOf(app), ...entries }, null, 2) + "\n");
  } catch { /* showing never fails for want of the record */ }
}
const mapHash = (m) => hashOf(JSON.stringify({ rows: m.rows, exceptions: m.exceptions.map((e) => e.id), pending: m.pending, changed: m.changed.map((c) => c.id) }));
/* The words of a text, without punctuation or case: equal words, only formatting changed. */
const wordsOf = (t) => String(t ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/* The latest approval of each item: { item: review }. */
const approvals = (state) => new Map(list(state?.reviews).filter((r) => r.item !== "map").map((r) => [r.item, r]));
/* An approval still holds when the meaning is the one approved; an
   approval recorded before meanings were kept compares the whole content,
   and one kept under an earlier form of meaningOf compares its snapshot
   in the current form. */
const holds = (r, i) => !!r && (r.hash === i.hash || r.hash === i.raw || (r.snapshot != null && meaningOf(r.snapshot, i) === i.meaning));


/* The items not approved in their current form, with their open feedback
   and, when they changed after approval, the diff. Records need no
   approval and are left out unless asked for. */
export function pendingReviews(app, { steps, records = false } = {}) {
  let state;
  try { state = readState(app); } catch { return []; }
  const approved = approvals(state);
  return reviewItems(app).filter((i) => (!steps || steps.includes(i.step)) && (records || i.tier !== "record") && !holds(approved.get(i.id), i))
    .map(({ content, meaning, ...i }) => {
      const was = approved.get(i.id);
      return { ...i, changed: !!was, ...(was?.snapshot != null ? { diff: diffText(lineDiff(meaningOf(was.snapshot, i), meaning)) } : {}), feedback: list(state.feedback).filter((f) => f.item === i.id && f.status === "open").map((f) => f.id) };
    });
}

/* Approvals that held through a change of formatting or metadata. */
export function carried(app) {
  let state;
  try { state = readState(app); } catch { return []; }
  const approved = approvals(state);
  return reviewItems(app).filter((i) => { const r = approved.get(i.id); return r?.raw && r.hash === i.hash && r.raw !== i.raw; }).map((i) => i.id);
}

/* The coverage map (GDL-83): each job, the tasks that serve it, their
   journeys and the screens those walk; and the exceptions a person must see
   one by one: a job nothing serves, a task that serves no job, a journey
   with no story or task, a screen on no journey, a rule no HELIX document
   defines, and an assumption not seen at the last map approval. */
export function coverageMap(app) {
  const bp = readJson(join(app, bpFile(app))) ?? {};
  let state = null;
  try { state = readState(app); } catch { /* no design state */ }
  const jobs = jobsTable(app) ?? {};
  const tasks = list(bp.tasks).filter((t) => t?.id), journeys = list(bp.journeys).filter((j) => j?.id), screens = list(bp.screens).filter((s) => s?.id);
  const walks = (j) => [...new Set([j.entry, ...list(j.steps).map((s) => s?.screen)].filter(Boolean))];
  const journeysOf = (t) => journeys.filter((j) => j.task === t.id);
  const rows = Object.entries(jobs).map(([id, j]) => {
    const ts = tasks.filter((t) => list(t.jobs).includes(id));
    const js = ts.flatMap(journeysOf);
    return { job: id, title: j.job, tasks: ts.map((t) => t.id), journeys: [...new Set(js.map((x) => x.id))], screens: [...new Set(js.flatMap(walks))] };
  });
  const exceptions = [];
  const ex = (id, item, text) => exceptions.push({ id, item, text });
  for (const r of rows) if (!r.tasks.length) ex(`gap:${r.job}`, `job:${r.job}`, `${r.job} ("${r.title}") has no task serving it`);
  for (const t of tasks) if (!list(t.jobs).length) ex(`untraced:task:${t.id}`, `task:${t.id}`, `task ${t.id} ("${t.goal ?? t.id}") serves no job`);
  for (const j of journeys) if (!j.story && !j.task) ex(`untraced:journey:${j.id}`, `journey:${j.id}`, `journey ${j.id} follows no story or task`);
  const walked = new Set(journeys.flatMap(walks));
  for (const s of screens) if (!walked.has(s.id)) ex(`untraced:screen:${s.id}`, `screen:${s.id}`, `screen ${s.id} ("${s.title ?? s.id}") is on no journey`);
  const rules = businessRules(app).rules;
  for (const id of [...new Set(ruleCitations(bp).map((c) => c.rule))]) if (!rules[id]) ex(`undefined:${id}`, `rule:${id}`, `${id} is cited, but no HELIX document defines it`);
  const seen = new Set(list(state?.reviews).filter((r) => r.item === "map").flatMap((r) => list(r.assumptions)));
  for (const a of list(state?.assumptions)) if (["assumed", "hypothesis"].includes(a.status) && !seen.has(a.id)) ex(`assumption:${a.id}`, null, `new assumption ${a.id}: ${a.text}`);
  const derived = pendingReviews(app).filter((i) => i.tier === "derived");
  return { rows, exceptions, pending: derived.map((i) => i.id), changed: derived.filter((i) => i.changed).map(({ id, diff }) => ({ id, ...(diff ? { diff } : {}) })) };
}

export function mapText(m) {
  const L = ["Coverage map: each job, the tasks that serve it, their journeys and screens.", ""];
  for (const r of m.rows) L.push(`  ${r.job} ${r.title}`, `    tasks ${r.tasks.join(", ") || "none"}; journeys ${r.journeys.join(", ") || "none"}; screens ${r.screens.join(", ") || "none"}`);
  if (!m.rows.length) L.push("  No jobs yet.");
  L.push("", m.exceptions.length ? `Exceptions to look at one by one (${m.exceptions.length}):` : "No exceptions.", ...m.exceptions.map((e) => `  ${e.id}: ${e.text}`));
  if (m.changed.length) L.push("", "Changed since approved:", ...m.changed.flatMap((c) => [`  ${c.id}`, ...(c.diff ? c.diff.split("\n").map((l) => `    ${l}`) : [])]));
  L.push("", m.pending.length ? `Approving the map approves ${m.pending.length} built item${m.pending.length === 1 ? "" : "s"}: ${m.pending.join(", ")}.` : "Every built item is approved.");
  return L.join("\n");
}

/* ux-builder-design review [list]: what awaits review, by tier. */
export function reviewList(app) {
  const pending = pendingReviews(app);
  const foundations = pending.filter((p) => p.tier === "foundation"), derived = pending.filter((p) => p.tier === "derived");
  const kinds = [...new Set(foundations.map((p) => kindOf(p.id)))];
  const next = foundations.length ? `Show the ${kinds[0]} table (ux-builder-design review table ${kinds[0]}), every row in full, ask for feedback, and record the approval (review approve --kind ${kinds[0]} --answer "<their words>") before the next kind.`
    : derived.length ? "Show the coverage map (ux-builder-design review map), look at each exception with the person, and record their approval of the map (review approve map --answer \"<their words>\")."
    : "Nothing awaits review.";
  return { pending, count: pending.length, foundations: foundations.map((p) => p.id), derived: derived.map((p) => p.id), records: pendingReviews(app, { records: true }).filter((p) => p.tier === "record").map((p) => p.id), next };
}

/* ux-builder-design review table <kind>: every item of a foundation kind, to
   show as one table; recorded as shown unless only read (shown: false). */
export function reviewTable(app, { kind, shown = true } = {}) {
  if (!TIERS.foundation.includes(kind)) throw new DesignError(`review table takes a foundation kind: ${TIERS.foundation.join(", ")}; not "${kind ?? ""}". Built items are reviewed with review map.`);
  let state = null;
  try { state = readState(app); } catch { /* no design state */ }
  const approved = approvals(state);
  const items = reviewItems(app).filter((i) => kindOf(i.id) === kind).map((i) => {
    const was = approved.get(i.id);
    return { id: i.id, title: i.title, file: i.file, content: i.content, status: holds(was, i) ? "approved" : was ? "changed since approved" : "awaiting review", ...(was && !holds(was, i) && was.snapshot != null ? { diff: diffText(lineDiff(meaningOf(was.snapshot, i), i.meaning)) } : {}) };
  });
  if (shown) markShown(app, Object.fromEntries(reviewItems(app).filter((i) => kindOf(i.id) === kind).map((i) => [i.id, i.hash])));
  return { kind, items, pending: items.filter((i) => i.status !== "approved").map((i) => i.id) };
}

/* ux-builder-design review map: the map, recorded as shown. */
export function reviewMap(app) {
  const m = coverageMap(app);
  markShown(app, { map: mapHash(m) });
  return m;
}

function find(app, id) {
  const item = reviewItems(app).find((i) => i.id === id);
  if (!item) throw new DesignError(`no item ${id} to review; ux-builder-design review lists them`);
  return item;
}

/* ux-builder-design review show <item>: its content, to present inline. */
export function reviewShow(app, { item } = {}) {
  const i = find(app, item);
  const state = readState(app);
  const was = approvals(state).get(i.id);
  const { meaning, ...rest } = i;
  markShown(app, { [i.id]: i.hash });
  return { ...rest, status: holds(was, i) ? "approved" : was ? "changed since approved" : "awaiting review", ...(was && !holds(was, i) && was.snapshot != null ? { diff: diffText(lineDiff(meaningOf(was.snapshot, i), meaning)) } : {}), feedback: list(state.feedback).filter((f) => f.item === i.id) };
}

/* ux-builder-design review feedback <item> --text <their words>. */
export function reviewFeedback(app, { item, text } = {}) {
  const i = find(app, item);
  if (!text?.trim()) throw new DesignError("review feedback needs --text: the person's feedback, in their words");
  const state = readState(app);
  state.feedback ??= [];
  const id = `FB-${Math.max(0, ...state.feedback.map((f) => Number(f.id.slice(3)))) + 1}`;
  const entry = { id, item: i.id, text: text.trim(), status: "open", at: today() };
  state.feedback.push(entry);
  writeState(app, state);
  logEvent(app, "feedback", { item: i.id, id });
  return entry;
}

/* ux-builder-design review respond <FB-n> --text <what changed>. */
export function reviewRespond(app, { id, text } = {}) {
  if (!text?.trim()) throw new DesignError("review respond needs --text: how the feedback was addressed");
  const state = readState(app);
  const f = list(state.feedback).find((x) => x.id === id);
  if (!f) throw new DesignError(`no feedback ${id ?? ""}`);
  f.status = "addressed";
  f.response = text.trim();
  writeState(app, state);
  return f;
}

const record = (i, answer, now, via) => ({ item: i.id, hash: i.hash, raw: i.raw, snapshot: i.meaning, answer, at: now, ...(via ? { via } : {}) });

/* ux-builder-design review approve <item>... | --kind <foundation kind> | map, --answer <their words>. */
export function reviewApprove(app, { item, items, kind, answer, accept = [], now = today() } = {}) {
  const ids = [...list(items), ...(item ? [item] : [])];
  if (ids.includes("map")) return approveMap(app, { answer, accept, now });
  if (!answer?.trim()) throw new DesignError(`review approve needs --answer: the person's approval${ids.length ? ` of ${ids.join(", ")}` : kind ? ` of the ${kind} table` : ""}, in their words`);
  let targets;
  if (kind) {
    if (!TIERS.foundation.includes(kind)) throw new DesignError(`--kind takes a foundation kind: ${TIERS.foundation.join(", ")}; built items are approved with the coverage map (review approve map)`);
    targets = reviewTable(app, { kind, shown: false }).pending.map((id) => find(app, id));
    if (!targets.length) throw new DesignError(`no ${kind} awaits review`);
  } else {
    if (!ids.length) throw new DesignError("review approve needs an item, --kind <kind>, or map");
    targets = ids.map((id) => find(app, id));
  }
  const state = readState(app);
  const open = list(state.feedback).filter((f) => targets.some((i) => i.id === f.item) && f.status === "open");
  if (open.length) throw new DesignError(`${[...new Set(open.map((f) => f.item))].join(", ")} ${open.length === 1 ? "has" : "have"} feedback not yet addressed: ${open.map((f) => `${f.id} ("${f.text}")`).join(", ")}. Address it, record how (review respond <FB-n> --text "…"), show the item again, then ask for approval.`);
  const before = approvals(state);
  // Approving again what changed after its approval needs the change shown to the person first (US-161-AC3).
  const shown = shownOf(app);
  const unseen = targets.filter((i) => before.has(i.id) && shown[i.id] !== i.hash);
  if (unseen.length) throw new DesignError(`${unseen.map((i) => i.id).join(", ")} changed after ${unseen.length === 1 ? "it was" : "they were"} approved, and the person has not seen ${unseen.length === 1 ? "the change" : "the changes"}: show ${unseen.length === 1 ? "it" : "each"} (ux-builder-design review show ${unseen[0].id}${kind ? `, or review table ${kind}` : ""}), with the diff, and record the approval only when they give it, in their words. Nothing was recorded.`);
  const ids2 = new Set(targets.map((i) => i.id));
  state.reviews = [...list(state.reviews).filter((r) => !ids2.has(r.item)), ...targets.map((i) => record(i, answer.trim(), now, kind ? "table" : null))];
  writeState(app, state);
  const reopened = targets.filter((i) => before.has(i.id));
  // A reopening whose words did not change was caused by formatting alone (GDL-83 target).
  const formatOnly = reopened.filter((i) => before.get(i.id).snapshot != null && wordsOf(before.get(i.id).snapshot) === wordsOf(i.meaning)).map((i) => i.id);
  logEvent(app, "approval", { items: [...ids2], via: kind ? "table" : "item", answer: answer.trim(), reopened: reopened.map((i) => i.id), ...(formatOnly.length ? { formatOnly } : {}) }, now);
  const left = pendingReviews(app);
  return { item: targets[0].id, items: [...ids2], approved: true, remaining: left.length, next: left[0]?.id ?? null };
}

/* Approving the coverage map approves every built item awaiting review;
   it is refused while an exception is neither resolved nor accepted by
   the person (--accept <exception>). */
function approveMap(app, { answer, accept, now }) {
  if (!answer?.trim()) throw new DesignError("review approve map needs --answer: the person's approval of the coverage map, in their words");
  const m = coverageMap(app);
  // The map approved again needs the map as it is now shown to the person first (US-161-AC3).
  const state0 = readState(app);
  if (list(state0.reviews).some((r) => r.item === "map") && shownOf(app).map !== mapHash(m)) throw new DesignError("the coverage map changed since it was approved, and the person has not seen it as it is now: show it (ux-builder-design review map), go through what changed and each exception, and record the approval only when they give it, in their words. Nothing was recorded.");
  const unknown = accept.filter((a) => !m.exceptions.some((e) => e.id === a));
  if (unknown.length) throw new DesignError(`not an exception on the map: ${unknown.join(", ")}; the map has ${m.exceptions.map((e) => e.id).join(", ") || "none"}`);
  const open = m.exceptions.filter((e) => !accept.includes(e.id));
  if (open.length) throw new DesignError(`the coverage map has exceptions the person has not seen through: ${open.map((e) => `${e.id} (${e.text})`).join("; ")}. Show each, then fix it or record that they accept it: review approve map --answer "<their words>" --accept <exception>.`);
  const state = readState(app);
  const open2 = list(state.feedback).filter((f) => m.pending.includes(f.item) && f.status === "open");
  if (open2.length) throw new DesignError(`built items have feedback not yet addressed: ${open2.map((f) => `${f.id} on ${f.item}`).join(", ")}`);
  const targets = m.pending.map((id) => find(app, id));
  const ids = new Set(targets.map((i) => i.id));
  state.reviews = [...list(state.reviews).filter((r) => !ids.has(r.item) && r.item !== "map"), ...targets.map((i) => record(i, answer.trim(), now, "map")),
    { item: "map", hash: hashOf(JSON.stringify(m.rows)), answer: answer.trim(), at: now, accepted: accept, assumptions: list(state.assumptions).map((a) => a.id) }];
  writeState(app, state);
  logEvent(app, "approval", { items: ["map"], via: "map", answer: answer.trim(), covers: [...ids], accepted: accept }, now);
  const left = pendingReviews(app);
  return { item: "map", items: [...ids], accepted: accept, approved: true, remaining: left.length, next: left[0]?.id ?? null };
}
