/* ux-builder-design test-kit (CONTRACT-008 Commands, FEAT-018 GDL-54,
   ADR-039): everything needed to test the journeys with real people, in
   docs/ux/tests/TK-<n>/: the scenarios (each a user's goal, with no screen,
   pattern or control names), success criteria from the acceptance
   criteria, a facilitator script, a consent note, a screener and an
   observation sheet. */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DesignError, writeInApp } from "./app.mjs";
import { helixRoot, parseDocument } from "./documents.mjs";

const list = (x) => (Array.isArray(x) ? x : []);
const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
/* problem: a short name for a problem seen, in the same words across sessions, so recurring problems are counted. */
export const OBSERVATION_COLUMNS = ["participant", "task", "completed", "seconds", "errors", "assists", "remark", "problem"];
const MISSING = "missing: the journey names no acceptance criteria";

function kitNumbers(app) {
  const dir = join(app, "docs/ux/tests");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).map((n) => n.match(/^TK-([1-9][0-9]*)$/)?.[1]).filter(Boolean).map(Number);
}

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

/* Words from the blueprint a participant must not be given: screen IDs and
   titles, pattern names, action labels and IDs. */
function interfaceWords(bp) {
  const words = new Set();
  for (const s of list(bp.screens)) {
    for (const w of [s?.id, s?.title, s?.pattern, ...list(s?.actions).flatMap((a) => [a?.label, a?.id])]) if (typeof w === "string" && w.trim().length > 2) words.add(w.trim());
  }
  return [...words].sort((a, b) => b.length - a.length);
}

/* A goal in the user's words: the interface words taken out. */
export function goalText(goal, bp) {
  let text = String(goal);
  // The word goes with the preposition and article that lead to it: "on the River map".
  for (const w of interfaceWords(bp)) text = text.replace(new RegExp(`(?:\\b(?:on|in|from|at|with|using|via|through)\\s+)?(?:\\b(?:the|a|an)\\s+)?\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "");
  text = text.replace(/\s{2,}/g, " ").replace(/\s+([,.;:])/g, "$1").trim();
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/* Target users from the brief, else the PRD's personas. */
function targetUsers(app) {
  const brief = join(app, "docs/ux/brief.md");
  if (existsSync(brief)) {
    const body = parseDocument(readFileSync(brief, "utf8")).body;
    const m = body.match(/^## Target users\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m);
    const users = (m?.[1] ?? "").split("\n").map((l) => l.match(/^- (.+?)(?: \[[^\]]+\])?$/)?.[1]).filter((u) => u && u !== "Not yet known.");
    if (users.length) return users;
  }
  return [];
}

const cell = (s) => String(s ?? "").replace(/\|/g, "\\|");
const csv = (s) => (/[",\n]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : String(s ?? ""));

/* The kit's tasks: [{ n, journey, goal, criteria: [{ id, text }] }]. */
export function kitTasks(app, bp, { journeys = [] } = {}) {
  const all = list(bp.journeys).filter((j) => j?.id);
  const unknown = journeys.filter((id) => !all.some((j) => j.id === id));
  if (unknown.length) throw new DesignError(`no journey ${unknown.join(", ")} in app.blueprint.json; it has ${all.map((j) => j.id).join(", ") || "none"}`);
  const chosen = journeys.length ? all.filter((j) => journeys.includes(j.id)) : all;
  const us = stories(app);
  const tasks = new Map(list(bp.tasks).map((t) => [t.id, t]));
  return chosen.map((j, i) => {
    const goal = tasks.get(j.task)?.goal ?? us[j.story]?.title ?? j.id.replace(/^J-/, "").replace(/-/g, " ");
    const criteria = list(j.criteria).length ? list(j.criteria) : Object.keys(us[j.story]?.criteria ?? {});
    return { n: i + 1, journey: j.id, goal: goalText(goal, bp), criteria: criteria.map((id) => ({ id, text: us[j.story]?.criteria?.[id] ?? null })) };
  });
}

/* Write a kit: TK-<n> after the last, or rewrite `id`, keeping an observation sheet already filled in. */
export function testKit(app, { journeys = [], id } = {}) {
  const bp = readJson(join(app, "app.blueprint.json"));
  if (!bp) throw new DesignError("no app.blueprint.json: the kit is written from its journeys");
  const tasks = kitTasks(app, bp, { journeys });
  if (!tasks.length) throw new DesignError("the blueprint has no journeys to test");
  const kit = id ?? `TK-${Math.max(0, ...kitNumbers(app)) + 1}`;
  const dir = `docs/ux/tests/${kit}`;
  const users = targetUsers(app);
  const scenarios = ["# Scenarios", "", "Read each goal to the participant as written. Never name a screen, a button or a menu.", "", "| Task | Journey | Goal given to the participant | Success criteria |", "|---|---|---|---|",
    ...tasks.map((t) => `| ${t.n} | ${t.journey} | You want to ${cell(t.goal)}. Show me how you would do that. | ${t.criteria.map((c) => c.id).join(", ") || MISSING} |`), ""].join("\n");
  const script = ["# Facilitator script", "", "1. Thank the participant. Say we are testing the design, not them, and ask them to think aloud.", "2. Confirm consent (consent.md) before starting.", ...tasks.map((t, i) => `${i + 3}. Read task ${t.n}: "You want to ${t.goal}." Do not point at the screen or name anything on it.`), `${tasks.length + 3}. If the participant is stuck for two minutes, give one hint and mark an assist.`, `${tasks.length + 4}. After each task, ask: "How sure are you that it worked?"`, `${tasks.length + 5}. Thank them; note anything they said after the tasks.`, ""].join("\n");
  const consent = ["# Consent", "", "We are testing a design, not you. We take notes during the session; we do not record audio or video unless you agree separately.", "Notes use a pseudonym (P1, P2) and never your name. You can stop at any time, and ask us to delete your notes.", "", "Confirm consent for each session before importing its notes (`ux-builder-design transcript add --consent-confirmed`).", ""].join("\n");
  const screener = ["# Screener", "", ...(users.length ? ["Recruit people who match one of these target users (from the experience brief):", "", ...users.map((u) => `- Are you ${u.charAt(0).toLowerCase() + u.slice(1)}?`)] : ["The experience brief names no target users yet: write the screener questions from the PRD's personas."]), "", "Leave out anyone who works on this product.", ""].join("\n");
  const sheet = [OBSERVATION_COLUMNS.join(","), ...tasks.map((t) => ["", t.n, ...OBSERVATION_COLUMNS.slice(2).map(() => "")].map(csv).join(","))].join("\n") + "\n";
  const kitMd = ["---", "ux:", `  id: ${kit}`, "  type: test-kit", "---", "", `# ${kit}: ${tasks.map((t) => t.journey).join(", ")}`, "", "## Scenarios", "", "See `scenarios.md`.", "", ...tasks.map((t) => `- Task ${t.n} (${t.journey}): you want to ${t.goal}.`), "", "## Success criteria", "", ...tasks.map((t) => `- Task ${t.n}: ${t.criteria.map((c) => c.id).join(", ") || MISSING}`), "", "## Facilitator script", "", "See `script.md`.", "", "## Consent", "", "See `consent.md`.", "", "## Screener", "", "See `screener.md`.", "", "## Observation sheet", "", `\`observations.csv\`: ${OBSERVATION_COLUMNS.join(", ")}; one row per task and participant.`, ""].join("\n");
  const written = [
    writeInApp(app, `${dir}/kit.md`, kitMd), writeInApp(app, `${dir}/scenarios.md`, scenarios), writeInApp(app, `${dir}/script.md`, script),
    writeInApp(app, `${dir}/consent.md`, consent), writeInApp(app, `${dir}/screener.md`, screener),
  ];
  const sheetPath = join(app, dir, "observations.csv");
  const filled = existsSync(sheetPath) && readFileSync(sheetPath, "utf8").split("\n").slice(1).some((l) => /^[^,]+,/.test(l) && !l.startsWith(","));
  if (!filled) written.push(writeInApp(app, `${dir}/observations.csv`, sheet));
  const warnings = tasks.filter((t) => !t.criteria.length).map((t) => `${t.journey} names no acceptance criteria: task ${t.n} has no success criteria`);
  return { id: kit, dir, tasks, written, users, warnings };
}

/* The kits in the app. */
export function kits(app) { return kitNumbers(app).sort((a, b) => a - b).map((n) => `TK-${n}`); }
