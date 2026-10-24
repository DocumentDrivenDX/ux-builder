/* Production insights (CONTRACT-008 Commands, FEAT-018 GDL-63 to GDL-65;
   ADR-038 rule 4): what people did in production, per journey, from the
   journey events the app exported (JSON Lines), and the support tickets and
   feedback the owner exported. It reads only the files it is given and the
   app's own; it fetches nothing. The result is docs/ux/insights/INS-<date>.md,
   evidence records for the sources, and the jobs and the rubric citing them. */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { DesignError, writeInApp } from "./app.mjs";
import { jobsTable, parseDocument } from "./documents.mjs";
import { writeEvidence } from "./research.mjs";
import { maskPersonal } from "./sessions.mjs";

const DIR = "docs/ux/insights";
const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
const list = (x) => (Array.isArray(x) ? x : []);
const today = () => new Date().toISOString().slice(0, 10);
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : "–");
const abs = (app, f) => (isAbsolute(f) ? f : existsSync(join(app, f)) ? join(app, f) : f);

/* JSON Lines: one object a line; blank lines skipped, a bad line named. */
function jsonLines(path) {
  return readFileSync(path, "utf8").split("\n").map((l, i) => [l.trim(), i + 1]).filter(([l]) => l).map(([l, n]) => {
    try { return JSON.parse(l); } catch { throw new DesignError(`${path} line ${n} is not JSON`); }
  });
}

/* Entries of a support or feedback export: JSON Lines with text (or body,
   message, comment), a JSON array of the same, or one entry a line. */
function entriesOf(path) {
  const text = readFileSync(path, "utf8");
  const pick = (o) => (typeof o === "string" ? o : o?.text ?? o?.body ?? o?.message ?? o?.comment ?? "");
  if (/\.jsonl?$/i.test(path)) {
    const t = text.trim();
    const xs = t.startsWith("[") ? JSON.parse(t) : t.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
    return xs.map(pick).filter(Boolean);
  }
  return text.split("\n").map((l) => l.trim()).filter(Boolean);
}

/* Per journey: { journey, started, completed, abandoned: { step: n }, failedSearches, errors, empty, features: { screen: n }, secondsPerStep: { "1→2": s } }. */
export function journeyStats(events, journeyIds) {
  const by = new Map(journeyIds.map((id) => [id, { journey: id, started: 0, completed: 0, abandoned: {}, failedSearches: 0, errors: 0, empty: 0, features: {}, gaps: {} }]));
  const unmatched = new Map();
  const last = new Map();
  for (const e of events) {
    if (!e?.journey || !e?.type) continue;
    const s = by.get(e.journey);
    if (!s) { unmatched.set(e.journey, (unmatched.get(e.journey) ?? 0) + 1); continue; }
    const run = `${e.journey}\u0000${e.session ?? ""}`;
    if (e.type === "journey-start") { s.started++; last.delete(run); }
    else if (e.type === "complete") s.completed++;
    else if (e.type === "abandon") s.abandoned[e.step ?? "?"] = (s.abandoned[e.step ?? "?"] ?? 0) + 1;
    else if (e.type === "no-results-search") s.failedSearches++;
    else if (e.type === "error-shown") s.errors++;
    else if (e.type === "empty-result") s.empty++;
    else if (e.type === "step") {
      if (e.screen) s.features[e.screen] = (s.features[e.screen] ?? 0) + 1;
      const prev = last.get(run);
      if (prev && prev.step !== e.step) { const k = `${prev.step}→${e.step}`; const t = (Date.parse(e.at) - Date.parse(prev.at)) / 1000; if (Number.isFinite(t) && t >= 0) (s.gaps[k] ??= []).push(t); }
      last.set(run, { step: e.step, at: e.at });
    }
  }
  const journeys = [...by.values()].map(({ gaps, ...s }) => ({ ...s, secondsPerStep: Object.fromEntries(Object.entries(gaps).map(([k, ts]) => [k, median(ts)])) }));
  return { journeys, unmatched: [...unmatched].map(([journey, events]) => ({ journey, events })).sort((a, b) => a.journey.localeCompare(b.journey)) };
}

/* The journeys an entry mentions: by ID, or by the title of a screen its steps pass through. */
function mentions(text, bp) {
  const t = text.toLowerCase();
  const titles = new Map(list(bp.screens).map((s) => [s.id, String(s.title ?? s.id).toLowerCase()]));
  return list(bp.journeys).filter((j) => t.includes(j.id.toLowerCase()) || list(j.steps).some((s) => titles.get(s.screen) && new RegExp(`\\b${titles.get(s.screen).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t))).map((j) => j.id);
}

/* The jobs a journey serves: its task's jobs. */
const jobsOf = (bp, journey) => list(list(bp.tasks).find((t) => t.id === list(bp.journeys).find((j) => j.id === journey)?.task)?.jobs);

/* Add an evidence source to job rows of docs/ux/jobs.md: { J-n: EV-m }.
   A hypothesis with evidence becomes confirmed, and low confidence medium. */
function citeInJobs(app, cites) {
  const path = "docs/ux/jobs.md";
  if (!existsSync(join(app, path)) || !Object.keys(cites).length) return [];
  const changed = [];
  const text = readFileSync(join(app, path), "utf8").split("\n").map((line) => {
    const cells = line.split("|");
    const id = cells[1]?.trim();
    if (!cites[id] || cells.length < 8) return line;
    const [, , job, importance, evidence, confidence, status] = cells.map((c) => c.trim());
    const sources = [...new Set([...(evidence.match(/EV-[1-9][0-9]*/g) ?? []), ...cites[id]])];
    const next = { evidence: sources.join(", "), confidence: confidence === "low" ? "medium" : confidence, status: status === "hypothesis" ? "confirmed" : status };
    changed.push({ job: id, evidence: sources, confidence: next.confidence, status: next.status });
    return `| ${id} | ${job} | ${importance} | ${next.evidence} | ${next.confidence} | ${next.status} |`;
  });
  writeInApp(app, path, text.join("\n"));
  return changed;
}

/* ux-builder-design insights <events.jsonl> [--support <file>] [--feedback <file>] [--date YYYY-MM-DD]. */
export function insights(app, { events: file, support, feedback, date = today() } = {}) {
  if (!file) throw new DesignError("insights needs the exported journey events: insights <events.jsonl>");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new DesignError(`--date is YYYY-MM-DD, not "${date}"`);
  for (const f of [file, support, feedback].filter(Boolean)) if (!existsSync(abs(app, f))) throw new DesignError(`no such file: ${f}`);
  const bp = readJson(join(app, "app.blueprint.json"));
  if (!bp) throw new DesignError("no app.blueprint.json: insights are read per blueprint journey");
  const id = `INS-${date}`;
  const events = jsonLines(abs(app, file));
  const { journeys, unmatched } = journeyStats(events, list(bp.journeys).map((j) => j.id).filter(Boolean));
  const names = readJson(join(app, ".ux-builder/participants.local.json")) ?? {};

  // The sources as evidence records: the events' summary, and the masked entries that mention a journey.
  const summary = journeys.filter((j) => j.started).map((j) => `${j.journey}: ${j.completed} of ${j.started} completed (${pct(j.completed, j.started)}); ${j.failedSearches} failed searches`);
  const ev = writeEvidence(app, { file, kind: "analytics", date, source: file, title: `journey events for ${id}`, excerpts: summary });
  const sources = [{ id: ev.id, kind: "analytics", file }];
  const linked = [];
  for (const [kind, f] of [["support", support], ["feedback", feedback]]) {
    if (!f) continue;
    const entries = entriesOf(abs(app, f)).map((text) => ({ text: maskPersonal(text, { app, names }), journeys: mentions(text, bp) }));
    const cited = entries.filter((e) => e.journeys.length);
    const rec = writeEvidence(app, { file: f, kind, date, source: f, title: `${kind} for ${id}`, excerpts: cited.map((e) => `[${e.journeys.join(", ")}] "${e.text.replace(/"/g, "'")}"`) });
    sources.push({ id: rec.id, kind, file: f, entries: entries.length, linked: cited.length });
    for (const e of cited) linked.push({ evidence: rec.id, kind, journeys: e.journeys, text: e.text });
  }

  // The jobs the observed journeys serve cite the evidence.
  const cites = {};
  for (const j of journeys.filter((x) => x.started)) for (const job of jobsOf(bp, j.journey)) (cites[job] ??= []).push(ev.id);
  for (const l of linked) for (const j of l.journeys) for (const job of jobsOf(bp, j)) (cites[job] ??= []).push(l.evidence);
  const jobs = jobsTable(app) ? citeInJobs(app, Object.fromEntries(Object.entries(cites).filter(([k]) => jobsTable(app)[k]).map(([k, v]) => [k, [...new Set(v)]]))) : [];

  const mostAbandoned = (j) => { const e = Object.entries(j.abandoned).sort((a, b) => b[1] - a[1])[0]; return e ? `step ${e[0]} (${e[1]})` : "none"; };
  const L = ["---", "ux:", `  id: ${id}`, "  type: insights", "  links:", ...sources.flatMap((s) => ["    - kind: informed_by", `      to: ${s.id}`]), "---", "", `# ${id}: production insights to ${date}`, ""];
  L.push("## Sources", "", ...sources.map((s) => `- ${s.id} (${s.kind}): \`${s.file}\`${s.entries != null ? `, ${s.entries} entries, ${s.linked} linked to a journey` : `, ${events.length} events`}; read from the owner's export, nothing fetched`), "");
  L.push("## Journeys", "", "| Journey | Started | Completed | Completion | Most abandoned step | Failed searches | Errors shown | Feature use | Seconds per step |", "|---|---|---|---|---|---|---|---|---|");
  for (const j of journeys) L.push(`| ${j.journey} | ${j.started} | ${j.completed} | ${pct(j.completed, j.started)} | ${mostAbandoned(j)} | ${j.failedSearches} | ${j.errors} | ${Object.entries(j.features).map(([s, n]) => `${s} ${n}`).join(", ") || "–"} | ${Object.entries(j.secondsPerStep).map(([k, s]) => `${k}: ${s}`).join(", ") || "–"} |`);
  L.push("", "## Unmatched events", "", ...(unmatched.length ? unmatched.map((u) => `- ${u.journey}: ${u.events} events name a journey the blueprint does not have`) : ["- None."]), "");
  if (linked.length) L.push("## Support and feedback", "", ...linked.map((l) => `- ${l.evidence} (${l.kind}) [${l.journeys.join(", ")}]: "${l.text}"`), "");
  L.push("## Diagnosis", "", "- None yet. Record one with `ux-builder-design diagnose --insight " + id + "`: the observation, at least two explanations, the hypothesis and the alternative that tests it.", "");
  const path = writeInApp(app, `${DIR}/${id}.md`, L.join("\n"));
  const data = { id, date, events: events.length, journeys, unmatched, sources, linked, jobs };
  writeInApp(app, `${DIR}/${id}.json`, JSON.stringify(data, null, 2) + "\n");
  return { ...data, path };
}

/* The latest insights' data, or null. */
export function latestInsights(app) {
  const dir = join(app, DIR);
  if (!existsSync(dir)) return null;
  const f = readdirSync(dir).filter((n) => /^INS-\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort().at(-1);
  return f ? readJson(join(dir, f)) : null;
}

/* Append a diagnosis to an insights document's Diagnosis section. */
export function addDiagnosisText(app, insight, lines) {
  const path = `${DIR}/${insight}.md`;
  if (!existsSync(join(app, path))) throw new DesignError(`no insights ${insight} (${path})`);
  const text = readFileSync(join(app, path), "utf8");
  const doc = parseDocument(text);
  if (!doc.front) throw new DesignError(`${path} has no frontmatter`);
  const out = text.replace(/## Diagnosis\n\n- None yet\.[^\n]*\n/, "## Diagnosis\n").replace(/\n*$/, "\n\n") + lines.join("\n").replace(/\n*$/, "\n");
  writeInApp(app, path, out);
  return path;
}
