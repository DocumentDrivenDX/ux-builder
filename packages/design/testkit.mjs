/* ux-builder-design test-kit (CONTRACT-008 Commands, FEAT-018 GDL-54,
   ADR-039, ADR-042): everything needed to test the journeys with real
   people. The scenarios (each a user's goal, with no screen, pattern or
   control names), success criteria from the acceptance criteria and the
   screener go in the study's HELIX research plan; the facilitator script,
   consent note and observation sheet are run output. */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DesignError, bpFile, runsDir, ux, writeInApp } from "./app.mjs";
import { advance } from "./checkpoints.mjs";
import { businessRules, helixRoot, parseDocument, usersTable } from "./documents.mjs";
import { readState, writeState } from "./state.mjs";
import { cell, sectionOf, setSection } from "./helix.mjs";
import { proposeStudy, studyName, studyRunDir } from "./studies.mjs";

const list = (x) => (Array.isArray(x) ? x : []);
const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
/* problem: a short name for a problem seen, in the same words across sessions, so recurring problems are counted;
   user: the target user (by name) the participant matched in the screener. */
export const OBSERVATION_COLUMNS = ["participant", "task", "completed", "seconds", "errors", "assists", "remark", "problem", "user"];
const MISSING = "missing: the journey names no acceptance criteria";

/* HELIX stories: { US-n: { title, criteria: { US-n-ACm: text } } }. */
function stories(app) {
  const root = helixRoot(app);
  const out = {};
  if (!root || !existsSync(join(app, root))) return out;
  const walk = (dir) => {
    for (const e of readdirSync(join(app, dir), { withFileTypes: true })) {
      const rel = `${dir.replace(/\/$/, "")}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/^US-\d+.*\.md$/.test(e.name)) {
        const doc = parseDocument(readFileSync(join(app, rel), "utf8"));
        const id = String(doc.front?.ddx?.id ?? e.name.match(/^US-\d+/)[0]);
        out[id] = { title: doc.body.match(/^# US-\d+: (.+)$/m)?.[1]?.trim() ?? id, criteria: Object.fromEntries([...doc.body.matchAll(/\*\*(US-\d+-AC\d+)\*\* — (.+)/g)].map((m) => [m[1], m[2].trim()])) };
      }
    }
  };
  walk(root);
  return out;
}

/* Words from the blueprint a participant must not be given: pattern names,
   and screen titles and action labels of two words or more ("River map",
   "Save river"). A one-word title or label ("River", "Back", "Saved") is
   also the user's own language, so the goal keeps it. */
function interfaceWords(bp) {
  const words = new Set();
  for (const s of list(bp.screens)) {
    for (const w of [s?.pattern, s?.title, ...list(s?.actions).map((a) => a?.label)]) {
      if (typeof w !== "string" || !w.trim()) continue;
      if (w === s?.pattern || /\s/.test(w.trim()) || /[a-z][A-Z]/.test(w)) words.add(w.trim());
    }
  }
  return [...words].sort((a, b) => b.length - a.length);
}

/* The goal said to the participant: first person becomes second. */
const PERSON = [[/\bI am\b/g, "you are"], [/\bI'm\b/g, "you're"], [/\bI\b/g, "you"], [/\bme\b/gi, "you"], [/\bmy\b/gi, "your"], [/\bmine\b/gi, "yours"], [/\bmyself\b/gi, "yourself"]];
const secondPerson = (text) => PERSON.reduce((t, [re, to]) => t.replace(re, to), text);

/* A goal in the user's words: the interface words taken out. */
export function goalText(goal, bp) {
  let text = String(goal);
  // The word goes with the preposition and article that lead to it: "on the River map".
  for (const w of interfaceWords(bp)) text = text.replace(new RegExp(`(?:\\b(?:on|in|from|at|with|using|via|through)\\s+)?(?:\\b(?:the|a|an)\\s+)?\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "");
  text = secondPerson(text).replace(/\s{2,}/g, " ").replace(/\s+([,.;:])/g, "$1").trim();
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/* Target users: the PRD's User Segments ({ id: key, user, context }), else the brief's lines. */
function targetUsers(app) {
  const table = usersTable(app);
  if (table) return Object.entries(table).map(([id, u]) => ({ id, user: u.user, context: u.context }));
  const brief = join(app, ux(app, "brief.md"));
  if (existsSync(brief)) {
    const body = parseDocument(readFileSync(brief, "utf8")).body;
    const m = body.match(/^## Target users\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m);
    const users = (m?.[1] ?? "").split("\n").map((l) => l.match(/^- (.+?)(?: \[[^\]]+\])?$/)?.[1]).filter((u) => u && u !== "Not yet known.").map((user) => ({ id: null, user, context: null }));
    if (users.length) return users;
  }
  return [];
}

const csv = (s) => (/[",\n]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : String(s ?? ""));

/* The kit's tasks: [{ n, journey, goal, criteria: [{ id, text }] }]. */
export function kitTasks(app, bp, { journeys = [] } = {}) {
  const all = list(bp.journeys).filter((j) => j?.id);
  const unknown = journeys.filter((id) => !all.some((j) => j.id === id));
  if (unknown.length) throw new DesignError(`no journey ${unknown.join(", ")} in ${bpFile(app)}; it has ${all.map((j) => j.id).join(", ") || "none"}`);
  const chosen = journeys.length ? all.filter((j) => journeys.includes(j.id)) : all;
  const us = stories(app);
  const tasks = new Map(list(bp.tasks).map((t) => [t.id, t]));
  const goalOf = (j) => tasks.get(j.task)?.goal ?? us[j.story]?.title ?? j.id.replace(/^J-/, "").replace(/-/g, " ");
  const out = chosen.map((j, i) => {
    const criteria = list(j.criteria).length ? list(j.criteria) : Object.keys(us[j.story]?.criteria ?? {});
    return { n: i + 1, journey: j.id, goal: goalText(goalOf(j), bp), criteria: criteria.map((id) => ({ id, text: us[j.story]?.criteria?.[id] ?? null })), users: list(tasks.get(j.task)?.users) };
  });
  // A task per business rule the chosen journeys depend on (GDL-78), set in the rule's trigger situation.
  const defined = businessRules(app).rules;
  const designed = new Map(list(bp.businessRules).filter((r) => r?.id).map((r) => [r.id, r]));
  const done = new Set();
  for (const j of chosen) {
    const ids = [...list(tasks.get(j.task)?.rules), ...list(j.steps).flatMap((st) => list(st?.rules))];
    for (const id of ids) {
      if (done.has(id) || !designed.get(id)?.trigger) continue;
      done.add(id);
      const trigger = goalText(designed.get(id).trigger, bp).replace(/[.]$/, "");
      out.push({ n: out.length + 1, journey: j.id, rule: id, goal: `${goalText(goalOf(j), bp).replace(/[.]$/, "")}, and ${trigger}`, criteria: [{ id, text: defined[id]?.text ?? null }], users: list(tasks.get(j.task)?.users) });
    }
  }
  return out;
}

/* ux-builder-design test-kit --study <name> [--journey <id>]...: the study's
   scenarios, success criteria and screener proposed into its research plan's
   Research Methods; the facilitator script, the consent note, the
   observation sheet and the task list written to its run folder (run
   output, gitignored), keeping an observation sheet already filled in. */
export function testKit(app, { study, journeys = [] } = {}) {
  const name = studyName(study);
  const bp = readJson(join(app, bpFile(app)));
  if (!bp) throw new DesignError(`no ${bpFile(app)}: the kit is written from its journeys`);
  const tasks = kitTasks(app, bp, { journeys });
  if (!tasks.length) throw new DesignError("the blueprint has no journeys to test");
  const run = studyRunDir(app, name);
  const users = targetUsers(app);
  const scenario = (t) => `${t.journey}${t.rule ? ` (${t.rule})` : ""}`;
  const lower = (x) => x.charAt(0).toLowerCase() + x.slice(1);
  const goal = (t) => t.goal.charAt(0).toUpperCase() + t.goal.slice(1).replace(/[.]?$/, ".");
  // Into the plan: what the study asks of people, in their words (no screen, pattern or control names).
  const plan = proposeStudy(app, name, (text) => {
    let t = sectionOf(text, "Research Methods") == null ? setSection(text, "Research Methods", "", { after: "Research Objectives" }) : text;
    t = setSection(t, "Scenarios", ["| Scenario | Goal |", "|---|---|", ...tasks.map((x) => `| ${cell(scenario(x))} | ${cell(goal(x))} |`)].join("\n"), { level: 3, inside: "Research Methods" });
    t = setSection(t, "Success Criteria", ["| Scenario | Succeeds When | Acceptance Criteria |", "|---|---|---|", ...tasks.map((x) => `| ${cell(scenario(x))} | ${cell(`The participant can ${lower(x.goal).replace(/[.]$/, "")}, unaided.`)} | ${x.criteria.map((c) => c.id).join(", ") || MISSING} |`)].join("\n"), { level: 3, inside: "Research Methods" });
    t = setSection(t, "Screener", [
      `- **Include**: ${users.length ? users.map((u) => lower(u.user)).join("; ") : "people who match the PRD's personas (the brief names no target users yet)"}`,
      "- **Exclude**: anyone who works on this product",
      `- **Mix**: ${users.length > 1 ? `at least one of each: ${users.map((u) => u.user).join(", ")}` : "five or more people"}`,
      ...(users.length ? ["", `Ask each candidate${users[0].id ? "; note the user they match in the observation sheet's user column" : ""}:`, "", ...users.flatMap((u) => [`- Does this describe you: ${lower(u.user)}? (yes / no)`, ...(u.context ? [`- Is this how you would use it: ${lower(u.context)}? (yes / no)`] : [])])] : []),
    ].join("\n"), { level: 3, inside: "Research Methods" });
    return t;
  });
  // Run output: what the sessions use and leave.
  const script = ["# Facilitator script", "", "1. Thank the participant. Say we are testing the design, not them, and ask them to think aloud.", "2. Confirm consent (consent.md) before starting.", ...tasks.map((t, i) => `${i + 3}. Read task ${t.n}: "You want to ${t.goal}." Do not point at the screen or name anything on it.`), `${tasks.length + 3}. If the participant is stuck for two minutes, give one hint and mark an assist.`, `${tasks.length + 4}. After each task, ask: "How sure are you that it worked?"`, `${tasks.length + 5}. Thank them; note anything they said after the tasks.`, ""].join("\n");
  const consent = ["# Consent", "", "We are testing a design, not you. We take notes during the session; we do not record audio or video unless you agree separately.", "Notes use a pseudonym (P1, P2) and never your name. You can stop at any time, and ask us to delete your notes.", "", `Confirm consent for each session before importing its notes (\`ux-builder-design transcript add --study ${name} --consent-confirmed\`).`, ""].join("\n");
  const sheet = [OBSERVATION_COLUMNS.join(","), ...tasks.map((t) => ["", t.n, ...OBSERVATION_COLUMNS.slice(2).map(() => "")].map(csv).join(","))].join("\n") + "\n";
  const written = [
    writeInApp(app, `${run}/tasks.json`, JSON.stringify({ study: name, tasks: tasks.map((t) => ({ n: t.n, scenario: scenario(t), journey: t.journey, ...(t.rule ? { rule: t.rule } : {}), goal: t.goal, criteria: t.criteria.map((c) => c.id), users: t.users })) }, null, 2) + "\n"),
    writeInApp(app, `${run}/script.md`, script), writeInApp(app, `${run}/consent.md`, consent),
  ];
  const sheetPath = join(app, run, "observations.csv");
  const filled = existsSync(sheetPath) && readFileSync(sheetPath, "utf8").split("\n").slice(1).some((l) => /^[^,]+,/.test(l) && !l.startsWith(","));
  if (!filled) written.push(writeInApp(app, `${run}/observations.csv`, sheet));
  // A test kit means the loop is validating.
  try { const state = readState(app); if (advance(state, "validate")) writeState(app, state); } catch { /* no design state */ }
  const warnings = tasks.filter((t) => !t.criteria.length).map((t) => `${t.journey} names no acceptance criteria: task ${t.n} has no success criteria`);
  return { study: name, path: plan.path, proposal: plan.id ?? null, run, tasks, written, users, warnings };
}

/* The studies with a test kit (a task list in their run folder). */
export function kits(app) {
  const dir = join(app, runsDir(app, "studies"));
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => existsSync(join(dir, n, "tasks.json"))).sort();
}

/* A study's kit tasks: [{ n, scenario, journey, goal, criteria }]. */
export function studyTasks(app, study) {
  const t = readJson(join(app, studyRunDir(app, study), "tasks.json"));
  if (!t) throw new DesignError(`the study ${studyName(study)} has no test kit: write one with ux-builder-design test-kit --study ${studyName(study)}`);
  return t.tasks ?? [];
}
