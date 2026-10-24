/* ux-builder-design baseline (CONTRACT-008 Commands, FEAT-018 GDL-74,
   SD-006 Baseline): what an existing app is today, drafted for its first
   guided session from the blueprint, the HELIX stories and the latest
   assessment run. Every drafted brief point, job and task is an assumption
   with status current-state ("current state, assumed") until the person
   confirms it. */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DesignError, writeInApp } from "./app.mjs";
import { helixRoot, parseDocument } from "./documents.mjs";
import { readState, writeState } from "./state.mjs";

const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };

/* HELIX stories under the marker's root: [{ id, title }], by ID. */
function stories(app) {
  const root = helixRoot(app);
  if (!root || !existsSync(join(app, root))) return [];
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(join(app, dir), { withFileTypes: true })) {
      const rel = `${dir.replace(/\/$/, "")}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/^US-\d+.*\.md$/.test(e.name)) {
        const doc = parseDocument(readFileSync(join(app, rel), "utf8"));
        const id = String(doc.front?.ddx?.id ?? e.name.match(/^US-\d+/)[0]);
        out.push({ id, title: doc.body.match(/^# US-\d+: (.+)$/m)?.[1]?.trim() ?? id });
      }
    }
  };
  walk(root);
  return out.sort((a, b) => Number(a.id.slice(3)) - Number(b.id.slice(3)));
}

/* The latest assessment run (ux-assessment/R-…/), its open findings. */
function latestFindings(app) {
  const root = join(app, "ux-assessment");
  if (!existsSync(root)) return { run: null, findings: [] };
  const run = readdirSync(root).filter((n) => /^R-/.test(n)).sort().at(-1) ?? null;
  if (!run) return { run: null, findings: [] };
  const backlog = readJson(join(root, run, "backlog.json"));
  const findings = (backlog?.findings ?? []).filter((f) => !["rejected", "resolved"].includes(f.status ?? "open"));
  return { run, findings };
}

const cell = (s) => String(s ?? "").replace(/\|/g, "\\|");

export function baseline(app) {
  const bp = readJson(join(app, "app.blueprint.json"));
  if (!bp) throw new DesignError("no app.blueprint.json: run ux-builder-design init (it writes a starting one), then describe the app's screens");
  const state = structuredClone(readState(app));
  const us = stories(app);
  const { run, findings } = latestFindings(app);
  const screens = (bp.screens ?? []).filter((s) => s?.id);
  const journeys = (bp.journeys ?? []).filter((j) => j?.id);

  // Drafts, each an assumption with status current-state; one already drafted is not added again.
  const have = new Set(state.assumptions.map((a) => a.text));
  const next = () => `A-${Math.max(0, ...state.assumptions.map((a) => Number(a.id.slice(2)))) + 1}`;
  const draft = (text, section) => {
    let a = state.assumptions.find((x) => x.text === text);
    if (!a && !have.has(text)) { a = { id: next(), text, status: "current-state", evidence: [], ...(section ? { section } : {}) }; state.assumptions.push(a); have.add(text); }
    return a;
  };
  const brief = [draft(`${bp.name ?? "The app"} offers ${(bp.destinations ?? []).map((d) => d.label).filter(Boolean).join(", ") || "its screens"}`, "product")];
  const jobs = us.map((s, i) => ({ a: draft(`J-${i + 1}: ${s.title}`, "jobs"), id: `J-${i + 1}`, story: s.id }));
  const tasks = journeys.map((j, i) => ({ a: draft(`T-${i + 1}: complete ${j.id}${us.find((s) => s.id === j.story) ? ` (${us.find((s) => s.id === j.story).title})` : ""}`), id: `T-${i + 1}`, journey: j.id }));
  state.activity = "baseline";
  if (!state.next) state.next = "Ask the person what they want to improve, then route: a change to impact and Explore, too complicated to the assessment and simplify, complaints to evidence, a new feature to Define.";
  writeState(app, state);

  const lines = ["---", "ux:", "  id: baseline", "  type: baseline", "---", "", `# Baseline: ${bp.name ?? "the app"}`, "", "## Screens", "", "| Screen | Pattern | Path |", "|---|---|---|"];
  for (const s of screens) lines.push(`| ${cell(s.id)} | ${cell(s.pattern)} | ${cell(s.path ?? "")} |`);
  lines.push("", "## Journeys", "", "| Journey | Story | Steps |", "|---|---|---|");
  for (const j of journeys) lines.push(`| ${cell(j.id)} | ${cell(j.story)} | ${cell((j.steps ?? []).map((s) => s.screen).join(" → "))} |`);
  lines.push("", "## Stories", "");
  for (const s of us) lines.push(`- ${s.id}: ${s.title}`);
  if (!us.length) lines.push("- None found in HELIX.");
  lines.push("", "## Open findings", "");
  for (const f of findings) lines.push(`- ${f.id ?? "F-?"}: ${f.title ?? f.rule ?? "finding"}${f.priority ? `, ${f.priority}` : ""}${f.journey_id ? `, ${f.journey_id}` : ""}`);
  if (!findings.length) lines.push(run ? `- None open in ${run}.` : "- No assessment run yet (ux-builder-audit assess).");
  const current = (a, text) => `- ${a.id}: ${text ?? a.text} (current state, assumed)`;
  lines.push("", "## Draft brief", "", ...brief.filter(Boolean).map((a) => current(a)));
  lines.push("", "## Draft jobs", "", ...(jobs.length ? jobs.map((j) => current(j.a)) : ["- None drafted: no stories found."]));
  lines.push("", "## Draft tasks", "", ...(tasks.length ? tasks.map((t) => current(t.a)) : ["- None drafted: the blueprint has no journeys."]), "");
  const written = [writeInApp(app, "docs/ux/baseline.md", lines.join("\n"))];
  return { written, run, screens: screens.length, journeys: journeys.length, stories: us.length, findings: findings.length, drafted: [...brief, ...jobs.map((j) => j.a), ...tasks.map((t) => t.a)].filter(Boolean).map((a) => a.id) };
}
