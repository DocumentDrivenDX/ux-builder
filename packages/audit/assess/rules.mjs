/* What an assessment finding breaks, spelled out (FEAT-015 RPT-01, RPT-05,
   RPT-07; ADR-033; CONTRACT-006 "Journey-first report, HELIX artifact and
   pace"): the catalogue rule it names, with its full statement and sources,
   or the usability heuristic, with its source; and its severity on
   Nielsen's 0 to 4 scale. The report, the video and validate-report share
   these. */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const own = createRequire(import.meta.url);

/* The interaction rules of the app's installed @ux-builder/ui (its
   run.config.appDir), else this package's: a Map of ID to rule. */
export function catalogueRules(dir = null, run = null) {
  const app = dir && run?.config?.appDir != null ? resolve(dir, run.config.appDir) : null;
  for (const r of [app && createRequire(join(app, "package.json")), own].filter(Boolean)) {
    try { return new Map((JSON.parse(readFileSync(r.resolve("@ux-builder/ui/catalogue.json"), "utf8")).interaction?.rules ?? []).map((x) => [x.id, x])); } catch { /* next */ }
  }
  return new Map();
}

/* What a finding names: { kind: "rule", id, title, statement, sources },
   { kind: "heuristic", name, source }, or null when it names neither. A
   rule ID that is not in the catalogue is read as a heuristic's name. */
export function ruleOf(f, rules = new Map()) {
  const r = f?.rule ? rules.get(f.rule) : null;
  if (r) return { kind: "rule", id: r.id, title: r.title ?? null, statement: r.statement, sources: (r.sources ?? []).map(({ title, url }) => ({ title, url })) };
  if (f?.heuristic?.name) return { kind: "heuristic", name: f.heuristic.name, source: f.heuristic.source ?? null };
  if (f?.rule) return { kind: "heuristic", name: f.rule, source: null };
  return null;
}

/* The words a caption or a report line uses for it. */
export const ruleLine = (x) => (!x ? "names no rule or heuristic" : x.kind === "rule" ? `${x.id}: ${x.statement}` : `heuristic: ${x.name}${x.source ? ` (${x.source})` : ""}`);

/* Severity on Nielsen's scale (NN/g: 0 not a usability problem, 1 cosmetic,
   2 minor, 3 major, 4 catastrophe): the finding's own, else from its
   priority, P0 4, P1 3, P2 2, P3 1. */
export const SEVERITY_OF_PRIORITY = { P0: 4, P1: 3, P2: 2, P3: 1 };
export const SEVERITY_WORDS = ["not a usability problem", "cosmetic", "minor", "major", "catastrophe"];
export const severityOf = (f) => (Number.isInteger(f?.severity) && f.severity >= 0 && f.severity <= 4 ? f.severity : SEVERITY_OF_PRIORITY[f?.priority] ?? 2);
