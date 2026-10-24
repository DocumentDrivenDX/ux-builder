/* ux-builder-design ready (CONTRACT-008 Commands, FEAT-018 GDL-45, GDL-46;
   ADR-037 rule 4): is the validated prototype ready? --for testing: its
   lint, blueprint check and audit pass, so test users can see it. --for
   production (the default): also every acceptance criterion its journeys
   cover is cited by a test, and nothing it faked is left; then the guide
   asks checkpoint core-3. It runs the app's own scripts and reads its audit
   report; it changes nothing. */

import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { DesignError } from "./app.mjs";
import { readState } from "./state.mjs";

const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
const list = (x) => (Array.isArray(x) ? x : []);

/* Run one of the app's npm scripts: { name, ok, detail }. */
function script(app, name, scripts) {
  if (!scripts[name]) return { name, ok: false, detail: `the app has no "${name}" script` };
  const r = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "-s", name], { cwd: app, encoding: "utf8" });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim().split("\n").slice(-3).join(" ");
  return { name, ok: r.status === 0, detail: r.status === 0 ? "passes" : `exits ${r.status}${out ? `: ${out}` : ""}` };
}

/* Every @covers citation in the app's own source and tests. */
function citations(app) {
  const found = new Set();
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (["node_modules", ".git", "dist", "prototype", "ux-assessment", "audit-report", "test-results", "playwright-report"].includes(name) || name.startsWith(".")) continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(m?[jt]sx?|cjs)$/.test(name)) for (const [, id] of readFileSync(p, "utf8").matchAll(/@covers\s+(US-\d+-AC\d+)/g)) found.add(id);
    }
  };
  walk(app);
  return found;
}

export function ready(app, { for: purpose = "production" } = {}) {
  if (!["testing", "production"].includes(purpose)) throw new DesignError(`--for is testing or production, not "${purpose}"`);
  const pkg = readJson(join(app, "package.json")) ?? {};
  const scripts = pkg.scripts ?? {};
  const checks = [script(app, "lint", scripts), script(app, "check:blueprint", scripts)];
  const audit = readJson(join(app, "audit-report/report.json"));
  checks.push(!audit?.summary ? { name: "audit", ok: false, detail: "no audit report: run npm run audit" }
    : { name: "audit", ok: audit.summary.error === 0, detail: audit.summary.error === 0 ? "no errors" : `${audit.summary.error} error${audit.summary.error === 1 ? "" : "s"}` });
  const result = { for: purpose, checks };
  if (purpose === "production") {
    const bp = readJson(join(app, "app.blueprint.json")) ?? {};
    const covered = [...new Set(list(bp.journeys).flatMap((j) => list(j.criteria)))].sort();
    const cited = citations(app);
    result.uncited = covered.filter((id) => !cited.has(id));
    let faked = [];
    try { faked = readState(app).faked; } catch { /* no design state */ }
    result.faked = faked;
  }
  result.ready = checks.every((c) => c.ok) && !(result.uncited?.length) && !(result.faked?.length);
  result.next = !result.ready ? "Fix what is listed, then run ready again."
    : purpose === "testing" ? "Show it to test users: ux-builder-design test-kit."
    : 'Ask checkpoint core-3: "Is this validated enough to build?" Then: ux-builder-design state checkpoint core-3 --answer "<their words>".';
  return result;
}

export function readyText(r) {
  const lines = r.checks.map((c) => `${c.ok ? "ok  " : "FAIL"} ${c.name}: ${c.detail}`);
  if (r.uncited) lines.push(...(r.uncited.length ? r.uncited.map((id) => `FAIL ${id}: covered by a journey, cited by no test (@covers ${id})`) : ["ok   every covered criterion is cited by a test"]));
  if (r.faked) lines.push(...(r.faked.length ? r.faked.map((f) => `FAIL faked: ${f.what} (${f.where})`) : ["ok   nothing faked"]));
  lines.push(r.ready ? `Ready for ${r.for}. ${r.next}` : `Not ready for ${r.for}. ${r.next}`);
  return lines.join("\n");
}
