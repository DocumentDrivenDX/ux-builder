/* The person's review of each item the guide produces (CONTRACT-008
   Commands, FEAT-018 GDL-79). Every target user, job, story, task, rule,
   journey, alternative, decision, screen, kit, report, insight and
   experiment awaits review until the person approves it in its current
   form. The agent shows each inline, one at a time, records the person's
   feedback and how it was addressed, and their approval; an item that
   changes after approval is listed again. Checkpoints do not pass while
   items of the steps they close await review. */

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { DesignError, bpFile, ux } from "./app.mjs";
import { businessRules, helixRoot, jobsTable, parseDocument, ruleCitations, usersTable } from "./documents.mjs";
import { readState, writeState } from "./state.mjs";

const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
const list = (x) => (Array.isArray(x) ? x : []);
const hashOf = (text) => createHash("sha256").update(text).digest("hex").slice(0, 16);
const read = (app, p) => (existsSync(join(app, p)) ? readFileSync(join(app, p), "utf8") : null);
const files = (app, dir, re) => (existsSync(join(app, dir)) ? readdirSync(join(app, dir)).filter((f) => re.test(f)).sort((a, b) => a.localeCompare(b, "en", { numeric: true })) : []);
const today = () => new Date().toISOString();

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
  const add = (id, step, title, file, content) => { if (content != null) items.push({ id, step, title, file, content, hash: hashOf(content) }); };
  // 1 Define intent
  add("brief", 1, "The experience brief", ux(app, "brief.md"), read(app, ux(app, "brief.md")));
  // 2 Understand users
  for (const [id, u] of Object.entries(usersTable(app) ?? {})) add(`user:${id}`, 2, u.user, ux(app, "users.md"), readable({ id, user: u.user, context: u.context, needs: u.needs, jobs: u.jobs.map((j) => `${j.job} ${j.importance}`), evidence: u.evidence, confidence: u.confidence, status: u.status }));
  for (const [id, j] of Object.entries(jobsTable(app) ?? {})) add(`job:${id}`, 2, j.job, ux(app, "jobs.md"), readable({ id, job: j.job, importance: j.importance, evidence: j.evidence, confidence: j.confidence, status: j.status }));
  for (const f of files(app, ux(app, "evidence"), /^EV-\d+\.md$/)) add(`evidence:${f.replace(/\.md$/, "")}`, 2, `Research evidence ${f.replace(/\.md$/, "")}`, `${ux(app)}/evidence/${f}`, read(app, `${ux(app)}/evidence/${f}`));
  // 3 Model tasks: the stories the journeys cite, the tasks, and the business rules they cite
  const us = stories(app);
  for (const id of [...new Set(list(bp.journeys).map((j) => j?.story).filter(Boolean))]) if (us[id]) add(`story:${id}`, 3, parseDocument(us[id].text).body.match(/^# (.+)$/m)?.[1] ?? id, us[id].file, us[id].text);
  for (const t of list(bp.tasks).filter((x) => x?.id)) add(`task:${t.id}`, 3, t.goal ?? t.id, bpFile(app), readable(t));
  const rules = businessRules(app).rules;
  for (const id of [...new Set(ruleCitations(bp).map((c) => c.rule))]) add(`rule:${id}`, 3, rules[id]?.text ?? id, rules[id]?.file ?? bpFile(app), readable({ rule: rules[id]?.text ?? "not defined in HELIX", ...(list(bp.businessRules).find((r) => r?.id === id) ?? {}) }));
  // 4 Explore alternatives
  for (const j of list(bp.journeys).filter((x) => x?.id)) add(`journey:${j.id}`, 4, j.id, bpFile(app), readable(j));
  for (const a of list(state?.alternatives)) { const text = read(app, a.file ?? bpFile(app, a.name)); if (text) add(`alternative:${a.name}`, 4, `Alternative ${a.name}`, a.file ?? bpFile(app, a.name), text); }
  for (const f of files(app, ux(app, "decisions"), /^UXD-\d+\.md$/)) add(`decision:${f.replace(/\.md$/, "")}`, 4, parseDocument(read(app, `${ux(app)}/decisions/${f}`)).body.match(/^# (.+)$/m)?.[1] ?? f, `${ux(app)}/decisions/${f}`, read(app, `${ux(app)}/decisions/${f}`));
  // 5 Design the structure
  for (const s of list(bp.screens).filter((x) => x?.id)) add(`screen:${s.id}`, 5, s.title ?? s.id, bpFile(app), readable(s));
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

/* The items not approved in their current form, with their open feedback. */
export function pendingReviews(app, { steps } = {}) {
  let state;
  try { state = readState(app); } catch { return []; }
  const approved = new Map(list(state.reviews).map((r) => [r.item, r.hash]));
  return reviewItems(app).filter((i) => (!steps || steps.includes(i.step)) && approved.get(i.id) !== i.hash)
    .map(({ content, ...i }) => ({ ...i, changed: approved.has(i.id), feedback: list(state.feedback).filter((f) => f.item === i.id && f.status === "open").map((f) => f.id) }));
}

/* ux-builder-design review [list]. */
export function reviewList(app) {
  const pending = pendingReviews(app);
  return { pending, count: pending.length, next: pending[0] ? `Show ${pending[0].id} inline (ux-builder-design review show ${pending[0].id}), ask for feedback, and record the approval before the next.` : "Nothing awaits review." };
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
  const was = list(state.reviews).find((r) => r.item === i.id);
  return { ...i, status: was?.hash === i.hash ? "approved" : was ? "changed since approved" : "awaiting review", feedback: list(state.feedback).filter((f) => f.item === i.id) };
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

/* ux-builder-design review approve <item> --answer <their words>. */
export function reviewApprove(app, { item, answer } = {}) {
  const i = find(app, item);
  if (!answer?.trim()) throw new DesignError(`review approve needs --answer: the person's approval of ${i.id}, in their words`);
  const state = readState(app);
  const open = list(state.feedback).filter((f) => f.item === i.id && f.status === "open");
  if (open.length) throw new DesignError(`${i.id} has feedback not yet addressed: ${open.map((f) => `${f.id} ("${f.text}")`).join(", ")}. Address it, record how (review respond <FB-n> --text "…"), show the item again, then ask for approval.`);
  state.reviews = [...list(state.reviews).filter((r) => r.item !== i.id), { item: i.id, hash: i.hash, answer: answer.trim(), at: today() }];
  writeState(app, state);
  const left = pendingReviews(app);
  return { item: i.id, approved: true, remaining: left.length, next: left[0]?.id ?? null };
}
