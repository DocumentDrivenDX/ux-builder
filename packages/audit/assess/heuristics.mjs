/* The heuristic inspection pass (FEAT-018 GDL-50, GDL-51; US-138;
   CONTRACT-008 "Amendment to CONTRACT-006"): every walked screen is checked
   against every heuristic of the pass, and heuristics.json holds one entry
   for each pair, a finding or `checked: no finding`. A screen not walked is
   listed as not inspected, never as clean.

   informationHierarchy() is the deterministic part of the "information
   hierarchy" heuristic: the content a screen shows, in page order, against
   the blueprint's screens[].content (highest priority first). */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const NN = "Nielsen Norman Group: 10 Usability Heuristics for User Interface Design";
export const HEURISTICS = [
  { id: "visibility", name: "Visibility of system status", source: NN },
  { id: "match", name: "Match between the system and the real world", source: NN },
  { id: "control", name: "User control and freedom", source: NN },
  { id: "consistency", name: "Consistency and standards", source: NN },
  { id: "error-prevention", name: "Error prevention", source: NN },
  { id: "recognition", name: "Recognition rather than recall", source: NN },
  { id: "flexibility", name: "Flexibility and efficiency of use", source: NN },
  { id: "minimalist", name: "Aesthetic and minimalist design", source: NN },
  { id: "error-recovery", name: "Help users recognize, diagnose, and recover from errors", source: NN },
  { id: "help", name: "Help and documentation", source: NN },
  { id: "error-handling", name: "Error prevention and recovery in the journey", source: "FEAT-018 GDL-50: errors prevented where a step can fail, and recovered from in place" },
  { id: "information-hierarchy", name: "Information hierarchy", source: "FEAT-018 GDL-50: the screen shows its content in the blueprint's priority order (screens[].content)" },
  { id: "navigation-complexity", name: "Navigation complexity", source: "FEAT-018 GDL-50: the journey takes no more moves than its shortest path" },
];
const IDS = HEURISTICS.map((h) => h.id);

const read = (dir, f) => (existsSync(join(dir, f)) ? JSON.parse(readFileSync(join(dir, f), "utf8")) : null);

/* The screen a walked step was on: its own, else the plan's step's. */
export function stepScreen(step, planJ) {
  if (step.screen) return step.screen;
  return step.alternate == null ? planJ?.steps?.find((x) => x.n === step.n)?.screen ?? null : null;
}

/* The screens the walkthrough reached, in the order first walked. */
export function walkedScreens(dir) {
  const walk = read(dir, "walkthrough.json"), plan = read(dir, "plan.json");
  const out = [];
  for (const j of walk?.journeys ?? []) {
    const planJ = (plan?.journeys ?? []).find((p) => p.id === j.id);
    for (const s of j.steps ?? []) {
      if (s.status !== "done") continue;
      const screen = stepScreen(s, planJ);
      if (screen && !out.includes(screen)) out.push(screen);
    }
  }
  return out;
}

/* The app's blueprint for a run: --blueprint, else app.blueprint.json in the app the run is of. */
export function runBlueprint(dir, file) {
  const run = read(dir, "run.json");
  const p = file ? resolve(file) : resolve(dir, run?.config?.appDir ?? "../..", "app.blueprint.json");
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

/* Start, or extend, the pass: heuristics.json with an entry for every walked
   screen × heuristic, keeping what the agent already recorded. Returns the record. */
export function startPass(dir, { blueprint = null } = {}) {
  const was = read(dir, "heuristics.json");
  const walked = walkedScreens(dir);
  const known = new Map((was?.entries ?? []).map((e) => [`${e.screen}\u0000${e.heuristic}`, e]));
  const entries = walked.flatMap((screen) => IDS.map((heuristic) => known.get(`${screen}\u0000${heuristic}`) ?? { screen, heuristic }));
  const all = (blueprint?.screens ?? []).map((s) => s?.id).filter(Boolean);
  const record = { schema: "heuristics", version: 1, heuristics: HEURISTICS, screens: walked, notInspected: all.filter((s) => !walked.includes(s)), entries };
  writeFileSync(join(dir, "heuristics.json"), JSON.stringify(record, null, 2) + "\n");
  return record;
}

/* Record one result: a finding's ID, or no finding. */
export function recordResult(dir, { screen, heuristic, finding = null }) {
  const rec = read(dir, "heuristics.json");
  if (!rec) throw Object.assign(new Error("no heuristics.json: run assess heuristics --run <id> first"), { code: "usage" });
  if (!IDS.includes(heuristic)) throw Object.assign(new Error(`${heuristic} is not a heuristic of the pass; one of ${IDS.join(", ")}`), { code: "usage" });
  const e = rec.entries.find((x) => x.screen === screen && x.heuristic === heuristic);
  if (!e) throw Object.assign(new Error(`${screen} is not a walked screen; walked: ${rec.screens.join(", ") || "none"}`), { code: "usage" });
  delete e.finding; delete e.checked;
  if (finding) e.finding = finding; else e.checked = "no finding";
  writeFileSync(join(dir, "heuristics.json"), JSON.stringify(rec, null, 2) + "\n");
  return e;
}

/* What is missing from a pass: [{ screen, heuristic }] with no result. */
export function missing(rec, walked) {
  const out = [];
  for (const screen of walked) for (const heuristic of IDS) {
    const e = (rec?.entries ?? []).find((x) => x.screen === screen && x.heuristic === heuristic);
    if (!e || (!e.finding && e.checked !== "no finding")) out.push({ screen, heuristic });
  }
  return out;
}

const norm = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

/* The text of a page in order: an HTML file's text runs, or an accessibility
   tree's (tree.yml) names, one per line. data-piq-content="<label>" marks
   content explicitly and counts where it stands. */
export function pageText(text) {
  if (/^\s*-\s/.test(text) && !/<[a-z]/i.test(text)) return text.split("\n").map((l) => (/"([^"]*)"/.exec(l)?.[1] ?? l.replace(/^\s*-\s*/, "")).trim()).filter(Boolean);
  const body = text.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "").replace(/<header class="proto-bar"[\s\S]*?<\/header>/i, "");
  const out = [];
  for (const m of body.matchAll(/data-piq-content="([^"]*)"|>([^<]+)</g)) {
    const t = (m[1] ?? m[2]).replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
    if (t) out.push(t);
  }
  return out;
}

/* The screen a page is, by its data-piq-screen. */
export const pageScreenOf = (html) => /data-piq-screen="([^"]+)"/.exec(html)?.[1] ?? null;

/* Is the declared content shown in its priority order? { ok, found, missing,
   finding? }: the first content shown out of order, and what it comes before. */
export function informationHierarchy(declared, text) {
  const labels = (declared ?? []).map((c) => (typeof c === "string" ? c : c?.label)).filter(Boolean);
  const pos = (label) => text.findIndex((t) => norm(t).includes(norm(label)));
  const found = labels.map((label) => ({ label, at: pos(label) })).filter((x) => x.at >= 0);
  const shown = [...found].sort((a, b) => a.at - b.at);
  const out = { ok: true, declared: labels, shown: shown.map((x) => x.label), missing: labels.filter((l) => pos(l) < 0) };
  const i = shown.findIndex((x, k) => x.label !== found[k].label);
  if (i >= 0) {
    out.ok = false;
    out.finding = { heuristic: "information-hierarchy", content: shown[i].label, before: found[i].label, message: `"${shown[i].label}" is shown before "${found[i].label}", which the blueprint ranks higher (screens[].content)` };
  }
  return out;
}
