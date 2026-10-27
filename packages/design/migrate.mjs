/* ux-builder-design migrate (CONTRACT-008 Layout, FEAT-018 GDL-80): move an
   app made before the docs/ux-builder/ layout onto it. The design documents
   (docs/ux/), the blueprint and its alternatives (app.blueprint*.json),
   prototypes (prototype/), HELIX proposals (helix-proposals/), comparisons,
   drawings and wireframes move under docs/ux-builder/, with git mv in a git
   repository so their history follows; the app's own references to them
   (its package.json scripts, ux-assessment.yml, CI workflows, CLAUDE.md,
   AGENTS.md and the design state) are rewritten. --dry-run lists it all
   and changes nothing. .ux-builder/ stays where it is. */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { CURRENT, LEGACY } from "@ux-builder/ui/blueprint/paths";
import { DesignError } from "./app.mjs";

const FOLDERS = [["docs", "docs"], ["prototypes", "prototypes"], ["proposals", "proposals"], ["compare", "compare"], ["drawings", "drawings"], ["wireframes", "wireframes"],
  // The assessment's manifest and runs and the UI audit's report (GDL-82); an app on the new layout may still keep these at its top.
  ["assessmentManifest", "assessmentManifest"], ["assessments", "assessments"], ["auditReport", "auditReport"]];
/* The app's own files that name the old places. */
const REFERRERS = ["package.json", "ux-assessment.yml", "CLAUDE.md", "AGENTS.md", "README.md", ".gitignore", ".ux-builder/design-state.json", ".github/workflows"];

const git = (app, args) => execFileSync("git", args, { cwd: app, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
const inGit = (app) => { try { return git(app, ["rev-parse", "--is-inside-work-tree"]).trim() === "true"; } catch { return false; } };
const tracked = (app, p) => { try { return git(app, ["ls-files", "--error-unmatch", p]).length > 0; } catch { return false; } };

/* What would move: [{ from, to }], app-relative. */
export function migrationPlan(app) {
  const moves = [];
  for (const [l, c] of FOLDERS) if (existsSync(join(app, LEGACY[l]))) moves.push({ from: LEGACY[l], to: CURRENT[c] });
  for (const f of readdirSync(app).filter((n) => /^app\.blueprint(\.[a-z0-9-]+)?\.json$/.test(n)).sort()) moves.push({ from: f, to: `${CURRENT.blueprintDir}/${f}` });
  return moves;
}

/* The old paths named in a text, rewritten to the new ones. */
export function rewritePaths(text) {
  return text
    .replace(/(?<![\w./-])app\.blueprint(\.[a-z0-9-]+)?\.json/g, (m) => `${CURRENT.blueprintDir}/${m}`)
    .replace(/(?<![\w/-])docs\/ux\//g, `${CURRENT.docs}/`)
    .replace(/(?<![\w/-])prototype\//g, `${CURRENT.prototypes}/`)
    .replace(/(?<![\w/-])helix-proposals\//g, `${CURRENT.proposals}/`)
    .replace(/(?<![\w/-])blueprint-(compare|drawings|wireframes)\//g, (m, k) => `${CURRENT[k]}/`)
    .replace(/(?<![\w./-])ux-assessment\.yml/g, CURRENT.assessmentManifest)
    .replace(/(?<![\w./-])ux-assessment\//g, `${CURRENT.assessments}/`)
    // Not an artifact's name in a workflow (name: audit-report), which may not contain a slash.
    .replace(/(?<![\w./-]|name:\s*)audit-report(?![\w-])/g, CURRENT.auditReport);
}

function referrers(app) {
  const out = [];
  for (const r of REFERRERS) {
    const p = join(app, r);
    if (!existsSync(p)) continue;
    if (r === ".github/workflows") { for (const f of readdirSync(p).filter((n) => /\.ya?ml$/.test(n))) out.push(`${r}/${f}`); } else out.push(r);
  }
  return out;
}

/* ux-builder-design migrate [--dry-run]. */
export function migrate(app, { dryRun = false } = {}) {
  const moves = migrationPlan(app);
  if (!moves.length) return { migrated: false, moves: [], updated: [], git: false, message: "Nothing to migrate: the app is on the docs/ux-builder/ layout." };
  const clash = moves.filter((m) => existsSync(join(app, m.to)) && !(m.from === LEGACY.docs));
  if (clash.length) throw new DesignError(`cannot migrate: ${clash.map((m) => m.to).join(", ")} already exist${clash.length === 1 ? "s" : ""}; move or remove ${clash.length === 1 ? "it" : "them"} first. Nothing was changed.`);
  const updated = referrers(app).filter((f) => rewritePaths(readFileSync(join(app, f), "utf8")) !== readFileSync(join(app, f), "utf8"));
  const useGit = inGit(app);
  if (dryRun) return { migrated: false, dryRun: true, moves, updated, git: useGit };
  for (const m of moves) {
    // docs/ux/ into an existing docs/ux-builder/ (an app that already has the blueprint folder): move its entries one by one.
    if (m.from === LEGACY.docs && existsSync(join(app, m.to))) {
      for (const n of readdirSync(join(app, m.from))) move(app, `${m.from}/${n}`, `${m.to}/${n}`, useGit);
      continue;
    }
    move(app, m.from, m.to, useGit);
  }
  // A referrer that moved (the manifest) is rewritten where it now is.
  const now = (f) => moves.find((m) => m.from === f)?.to ?? f;
  for (const f of updated) writeFileSync(join(app, now(f)), rewritePaths(readFileSync(join(app, now(f)), "utf8")));
  return { migrated: true, moves, updated, git: useGit, message: `Moved ${moves.length} item${moves.length === 1 ? "" : "s"} under ${CURRENT.docs}/${updated.length ? ` and updated ${updated.join(", ")}` : ""}.` };
}

function move(app, from, to, useGit) {
  if (existsSync(join(app, to))) throw new DesignError(`cannot move ${from}: ${to} exists`);
  mkdirSync(dirname(join(app, to)), { recursive: true });
  if (useGit && tracked(app, from)) git(app, ["mv", from, to]);
  else renameSync(join(app, from), join(app, to));
}
