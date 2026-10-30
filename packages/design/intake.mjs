/* The start of a design, in few turns (CONTRACT-008 Commands, FEAT-018
   GDL-83): the independent intake questions asked together, answerable in
   one narrative, with what the app's own sources already answer read first;
   and the budget of decisions left before the first prototype. */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ux } from "./app.mjs";
import { helixRoot, jobsTable, parseDocument, usersTable } from "./documents.mjs";
import { modalityStatus } from "./modality.mjs";
import { pendingReviews, reviewItems, TIERS } from "./review.mjs";
import { studies } from "./studies.mjs";
import { readState } from "./state.mjs";

export const MINUTES_PER_DECISION = 3;
const TABLE = { brief: "the brief", user: "the target users table", job: "the jobs table", story: "the stories table", rule: "the business rules table", decision: "the decisions table" };
const list = (x) => (Array.isArray(x) ? x : []);

/* The questions of steps 1 and 2 that do not depend on each other. */
export const INTAKE = [
  { id: "product", ask: "What is the product, in a sentence or two?", section: "Product" },
  { id: "users", ask: "Who will use it, and where and when do they use it?", section: "Target users" },
  { id: "outcome", ask: "What should people accomplish with it, and how will you know it worked?", section: "Primary outcome" },
  { id: "jobs", ask: "What are the main things they come to it to do?", section: "Primary jobs" },
  { id: "constraints", ask: "What must it do or avoid: platforms, rules it must follow, deadlines?", section: "Constraints" },
  { id: "sources", ask: "What exists already that we should read first: research, analytics, support tickets, an existing app or its code, a competitor?", section: null },
];

/* A brief section that holds something other than "None yet." */
function briefHas(app, section) {
  const p = join(app, ux(app, "brief.md"));
  if (!section || !existsSync(p)) return false;
  const body = parseDocument(readFileSync(p, "utf8")).body;
  const m = body.match(new RegExp(`^## ${section}\\s*\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, "m"));
  return !!m && m[1].trim() !== "" && !/^-\s*None yet\.?$/m.test(m[1].trim());
}

/* What already answers a question, or null: the brief, HELIX's PRD, the
   users and jobs tables, evidence records, an app's code. */
function knownFrom(app, q) {
  if (briefHas(app, q.section)) return ux(app, "brief.md");
  const root = helixRoot(app);
  const prd = root && ["01-frame/prd.md", "prd.md"].map((f) => `${root.replace(/\/$/, "")}/${f}`).find((f) => existsSync(join(app, f)));
  if (prd && ["product", "outcome", "constraints"].includes(q.id)) return prd;
  if (q.id === "users" && Object.keys(usersTable(app) ?? {}).length) return ux(app, "users.md");
  if (q.id === "jobs" && Object.keys(jobsTable(app) ?? {}).length) return ux(app, "jobs.md");
  if (q.id === "sources") {
    const st = studies(app);
    if (st.length) return st[0].path.replace(/[^/]+$/, "");
    if (existsSync(join(app, "src"))) return "src/";
  }
  return null;
}

/* ux-builder-design intake: one prompt for what is still unknown, and what to confirm from the sources. */
export function intake(app) {
  const questions = INTAKE.map((q) => ({ id: q.id, ask: q.ask, known: knownFrom(app, q) }));
  const ask = questions.filter((q) => !q.known), confirm = questions.filter((q) => q.known);
  const text = [
    ...(confirm.length ? ["Read first, then confirm in one line each:", ...confirm.map((q) => `  ${q.id}: from ${q.known}`), ""] : []),
    ...(ask.length ? ["Ask together, in one message; a narrative answer is fine, and a part they skip becomes an assumption:", ...ask.map((q, k) => `  ${k + 1}. ${q.ask}`)] : ["Nothing to ask: every intake question is answered by the sources above."]),
    "", budgetText(budget(app)),
  ].join("\n");
  return { questions, ask: ask.map((q) => q.id), confirm: confirm.map((q) => ({ id: q.id, from: q.known })), budget: budget(app), text };
}

/* The decisions left before the first prototype: a table per foundation
   kind still to approve (the brief, users, jobs and stories always come),
   core-1, the choice at core-2, the coverage map and the modality. */
export function budget(app) {
  let state = null;
  try { state = readState(app); } catch { /* no design state */ }
  const passed = (id) => list(state?.checkpoints).some((c) => c.id === id && ["passed", "skipped"].includes(c.status));
  const pending = pendingReviews(app);
  const present = new Set(reviewItems(app).map((i) => i.id.split(":")[0]));
  const decisions = [];
  for (const k of TIERS.foundation) {
    const waiting = pending.some((p) => p.id.split(":")[0] === k);
    if (waiting || (!present.has(k) && ["brief", "user", "job", "story"].includes(k) && !passed("core-1"))) decisions.push(TABLE[k]);
  }
  if (!passed("core-1")) decisions.push("checkpoint core-1");
  if (!passed("core-2")) decisions.push("the choice of approach (core-2)");
  if (pending.some((p) => p.tier === "derived") || !passed("core-2")) decisions.push("the coverage map");
  if (!modalityStatus(app).confirmed) decisions.push("the modality, screen sizes and app frame");
  return { decisions, count: decisions.length, minutes: decisions.length * MINUTES_PER_DECISION };
}

export const budgetText = (b) => (b.count ? `About ${b.count} decision${b.count === 1 ? "" : "s"} left before the first prototype, roughly ${b.minutes} minutes of your time: ${b.decisions.join(", ")}.` : "No decisions left before the first prototype.");
