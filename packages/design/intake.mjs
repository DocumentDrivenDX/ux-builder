/* The start of a design, in few turns (CONTRACT-008 Commands, FEAT-018
   GDL-83): the independent intake questions asked together, answerable in
   one narrative, with what the app's own sources already answer read first;
   and the budget of decisions left before the first prototype. */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ux } from "./app.mjs";
import { helixRoot, jobsTable, parseDocument, usersTable } from "./documents.mjs";
import { metrics } from "./metrics.mjs";
import { modalityStatus } from "./modality.mjs";
import { progress } from "./process.mjs";
import { pendingReviews, reviewItems, TIERS } from "./review.mjs";
import { readState } from "./state.mjs";

export const MINUTES_PER_DECISION = 3;
/* The agent's drafting, drawing and checking per step, until this app has recorded its own. */
export const AGENT_MINUTES_PER_STEP = 10;
/* The step each foundation kind is first reviewed at. */
const STEP_OF = { brief: 1, user: 2, job: 2, story: 3, rule: 3, decision: 4 };
const TABLE = { brief: "the brief", user: "the target users table", job: "the jobs table", story: "the stories table", rule: "the business rules table", decision: "the decisions table" };
const list = (x) => (Array.isArray(x) ? x : []);

/* The questions of steps 1 and 2 that do not depend on each other. */
export const INTAKE = [
  { id: "product", ask: "What is the product, in a sentence or two?", section: "Product" },
  { id: "users", ask: "Who will use it, and where and when do they use it?", section: "Target users" },
  { id: "outcome", ask: "What should people accomplish with it, and how will you know it worked?", section: "Primary outcome" },
  { id: "jobs", ask: "What are the main things they come to it to do?", section: "Primary jobs" },
  { id: "constraints", ask: "What must it do or avoid: platforms, rules it must follow, deadlines?", section: "Constraints" },
  // Facts only the person knows (VIP List session 2: no agent designing alone guessed one of them).
  { id: "use", ask: "How often does each kind of person come back to it, and on what device (a phone, a laptop, both)?", section: null },
  { id: "gives", ask: "What must each person give for it to work, and what should they never have to give (an account, a friend's details, a document)?", section: null },
  // What each person sees of the others (VIP List sessions 3 and 4: the door showed a guest's name nobody asked for).
  { id: "sees", ask: "What does each person need to see about the others (staff seeing a customer's name, an organizer seeing who came), and where does each of those come from?", section: null },
  { id: "rules", ask: "What are its rules: who may do what, what happens to other people when something changes (a list closes, a booking is cancelled), what is kept and for how long, and what happens when there is no signal or a check fails?", section: null },
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
  // The rules are known once HELIX defines them (**BR-<n>**).
  if (q.id === "rules" && prd && /^\*\*BR-\d+\*\*/m.test(readFileSync(join(app, prd), "utf8"))) return prd;
  if (q.id === "sources") {
    const ev = existsSync(join(app, ux(app, "evidence"))) && readdirSync(join(app, ux(app, "evidence"))).some((f) => /^EV-\d+\.md$/.test(f));
    if (ev) return ux(app, "evidence/");
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

/* The decisions left before the next step prototype (ADR-042: every step
   ends with one): a table per foundation kind of this step still to
   approve (the brief at step 1, users and jobs at 2, stories at 3 always
   come), the coverage map when built items of this step wait, the modality
   at step 5, and the decision on the prototype itself. The minutes count
   the person's decisions and the agent's own work, from this app's
   recorded sessions once there are enough (VIP List session 1: "roughly
   24 minutes" took about 148, the agent's work never counted). */
export function budget(app) {
  let state = null;
  try { state = readState(app); } catch { /* no design state */ }
  const n = state ? Math.max(1, progress(state).step) : 1;
  const pending = pendingReviews(app, { steps: [n] });
  const present = new Set(reviewItems(app).map((i) => i.id.split(":")[0]));
  const decisions = [];
  for (const k of TIERS.foundation) {
    if (STEP_OF[k] !== n) continue;
    const waiting = pending.some((p) => p.id.split(":")[0] === k);
    if (waiting || (!present.has(k) && ["brief", "user", "job", "story"].includes(k))) decisions.push(TABLE[k]);
  }
  if (pending.some((p) => p.tier === "derived")) decisions.push("the coverage map");
  if (n === 5 && !modalityStatus(app).confirmed) decisions.push("the modality, screen sizes and app frame");
  const closes = { 3: "core-1", 4: "core-2", 7: "core-3" }[n];
  decisions.push(`your decision on the step ${n} prototype${closes && !list(state?.checkpoints).some((c) => c.id === closes && ["passed", "skipped"].includes(c.status)) ? `, which also answers ${closes}` : ""}`);
  // Calibrated from this app's own sessions: the median minutes between decisions once there are five,
  // and the median minutes a step took once two steps are recorded.
  const m = state ? metrics(app) : null;
  const recordedDecisions = m ? m.byKind.decision + m.personApprovals + m.checkpoints.length : 0;
  const perDecision = recordedDecisions >= 5 && m.minutesBetweenDecisions ? Math.max(1, m.minutesBetweenDecisions) : MINUTES_PER_DECISION;
  const steps = (m?.byStep ?? []).map((s) => s.minutes).filter((x) => x > 0).sort((a, b) => a - b);
  const agentMinutes = steps.length >= 2 ? steps[Math.floor(steps.length / 2)] : AGENT_MINUTES_PER_STEP;
  const basis = recordedDecisions >= 5 || steps.length >= 2 ? "recorded" : "default";
  return { step: n, decisions, count: decisions.length, perDecision, agentMinutes, minutes: decisions.length * perDecision + agentMinutes, basis };
}

export const budgetText = (b) => `About ${b.count} decision${b.count === 1 ? "" : "s"} before the step ${b.step} prototype, roughly ${b.minutes} minutes: ${b.count * b.perDecision} of your time and ${b.agentMinutes} of the agent's drafting and checking${b.basis === "recorded" ? ", from this design's own pace so far" : ""}. Decisions: ${b.decisions.join(", ")}.`;
