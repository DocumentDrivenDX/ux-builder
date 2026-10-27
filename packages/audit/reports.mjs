/* One page for every report (US-158): docs/ux-builder/reports.html (or
   reports.html at the top of an app on the old layout), rewritten whenever
   the UI audit or a usability assessment writes its report.

   It says what each report is, then the latest UI audit (its date, themes,
   and checks passed, warned and failed, linking to its index.html), every
   assessment run newest first (its journeys and steps, findings, linking
   to its report.html), the latest run's journeys step by step with their
   screenshots, and the @ux-builder versions that wrote each.

     landingPage(app)       { path, html, reports }: reads, writes nothing
     writeLandingPage(app)  writes it; returns the same
     appOfReport(dir)       the app a report directory belongs to, or null */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { reportsOf } from "@ux-builder/ui/blueprint/paths";

export const WHAT = {
  audit: "UI audit: the running app in every theme, against the rules.",
  assessment: "Usability assessment: each journey from your user stories, walked step by step.",
};
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const read = (f) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };
const href = (from, to) => relative(from, to).split(sep).join("/");

/* Where the landing page goes: beside the design, or at an old app's top. */
export const landingPath = (app) => join(app, reportsOf(app).layout === "legacy" ? "reports.html" : "docs/ux-builder/reports.html");

/* The app a report directory belongs to: the UI audit's report directory or
   an assessment run's, where reportsOf puts them. An app on the old layout
   needs its package.json, so a report written anywhere else is left alone. */
export function appOfReport(dir) {
  const abs = resolve(dir);
  for (let app = dirname(abs), i = 0; i < 4; app = dirname(app), i++) {
    const w = reportsOf(app);
    if (abs !== resolve(app, w.auditReport) && dirname(abs) !== resolve(app, w.assessments)) continue;
    if (w.layout === "current" || existsSync(join(app, "package.json"))) return app;
  }
  return null;
}

/* The versions a report records, as "@ux-builder/name version" pairs. */
function versionsOf(v, fallback = {}) {
  const out = {};
  for (const [k, x] of Object.entries(v ?? {})) if (x && (k.startsWith("@ux-builder/") || ["audit", "ui", "tokens"].includes(k))) out[k.startsWith("@") ? k : `@ux-builder/${k}`] = x;
  return Object.keys(out).length ? out : fallback;
}

function auditOf(app, page) {
  const dir = resolve(app, reportsOf(app).auditReport);
  const r = read(join(dir, "report.json"));
  if (!r) return null;
  const off = new Set(r.modalities?.off ?? []);
  const checks = Object.keys(r.rules ?? {}).filter((c) => !off.has(c));
  // Each check run: fail with an error finding, warn with a warning, else pass.
  const worst = (c) => (r.findings ?? []).filter((f) => (f.check ?? f.rule) === c).reduce((w, f) => (f.severity === "error" ? "fail" : f.severity === "warning" && w !== "fail" ? "warn" : w), "pass");
  const checksBy = { pass: 0, warn: 0, fail: 0 };
  for (const c of checks) checksBy[worst(c)]++;
  return {
    kind: "audit", what: WHAT.audit, date: r.generatedAt ?? null,
    themes: new Set((r.runs ?? []).map((x) => x.theme)).size,
    checks: checksBy,
    findings: { error: r.summary?.error ?? 0, warning: r.summary?.warning ?? 0, info: r.summary?.info ?? 0 },
    link: existsSync(join(dir, "index.html")) ? href(dirname(page), join(dir, "index.html")) : null,
    versions: versionsOf(r.versions, r.version ? { "@ux-builder/audit": r.version } : {}),
  };
}

function runOf(app, dir, page) {
  const run = read(join(dir, "run.json"));
  if (!run) return null;
  const walk = read(join(dir, "walkthrough.json"));
  const backlog = read(join(dir, "backlog.json"));
  const report = ["report.html", "video/index.html"].find((f) => existsSync(join(dir, f)));
  const journeys = (walk?.journeys ?? []).map((j) => ({
    id: j.id, ...(j.status ? { status: j.status } : {}),
    steps: (j.steps ?? []).map((s) => {
      const shot = s.checkpoint ? ["screenshot.png", "approval.png"].map((f) => join(dir, "checkpoints", s.checkpoint, f)).find(existsSync) : null;
      return { n: s.n, action: s.action, status: s.status, ...(s.screen ? { screen: s.screen } : {}), ...(shot ? { screenshot: href(dirname(page), shot) } : {}) };
    }),
  }));
  return {
    kind: "assessment", what: WHAT.assessment, id: run.id, date: run.startedAt ?? null,
    journeys: journeys.length ? journeys : (run.config?.journeys ?? []).map((id) => ({ id, steps: [] })),
    findings: backlog?.findings?.length ?? 0,
    link: report ? href(dirname(page), join(dir, report)) : null,
    versions: versionsOf(run.versions),
  };
}

/* The landing page: { path, html, reports: { audit, assessments } }. */
export function landingPage(app = process.cwd()) {
  app = resolve(app);
  const path = landingPath(app);
  const runsDir = resolve(app, reportsOf(app).assessments);
  let names = [];
  try { names = readdirSync(runsDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); } catch { /* no runs yet */ }
  const assessments = names.map((n) => runOf(app, join(runsDir, n), path)).filter(Boolean)
    .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")) || String(b.id).localeCompare(String(a.id)));
  const reports = { audit: auditOf(app, path), assessments };
  return { path, html: html(app, reports), reports };
}

export function writeLandingPage(app = process.cwd()) {
  const page = landingPage(app);
  writeFileSync(page.path, page.html);
  return page;
}

/* After a report is written: refresh the app's landing page, if the report is the app's. */
export function refreshLandingPage(dir) {
  const app = appOfReport(dir);
  if (!app) return null;
  try { return writeLandingPage(app); } catch { return null; }
}

const when = (d) => (d ? esc(new Date(d).toISOString().replace("T", " ").replace(/:\d\d\.\d+Z$/, " UTC")) : "date not recorded");
const by = (v) => (Object.keys(v).length ? `Written by ${Object.entries(v).map(([k, x]) => `<code>${esc(k)} ${esc(x)}</code>`).join(", ")}` : "Versions not recorded");
const stepCount = (r) => r.journeys.reduce((n, j) => n + j.steps.length, 0);

function html(app, { audit, assessments }) {
  const latest = assessments[0];
  const auditHtml = audit
    ? `<p><b>Latest:</b> ${when(audit.date)} · ${audit.themes} theme${audit.themes === 1 ? "" : "s"} · checks <span class="pass">${audit.checks.pass} pass</span>, <span class="warn">${audit.checks.warn} warn</span>, <span class="fail">${audit.checks.fail} fail</span> (${audit.findings.error} errors, ${audit.findings.warning} warnings) · ${audit.link ? `<a href="${esc(audit.link)}">open the UI audit</a>` : "no index.html"}</p><p class="meta">${by(audit.versions)}</p>`
    : `<p class="meta">No UI audit yet: run <code>npx ux-builder-audit --blueprint ${esc(reportsOf(app).layout === "legacy" ? "app.blueprint.json" : "docs/ux-builder/blueprint/app.blueprint.json")} &lt;url&gt;</code>.</p>`;
  const runsHtml = assessments.length
    ? `<table><thead><tr><th>Run</th><th>Journeys</th><th class="n">Steps</th><th class="n">Findings</th><th>Report</th></tr></thead><tbody>${assessments.map((r) => `<tr><td><code>${esc(r.id)}</code><br><span class="meta">${when(r.date)}</span></td><td>${r.journeys.map((j) => `<code>${esc(j.id)}</code> (${j.steps.length} step${j.steps.length === 1 ? "" : "s"})`).join(", ") || "none walked"}</td><td class="n">${stepCount(r)}</td><td class="n">${r.findings}</td><td>${r.link ? `<a href="${esc(r.link)}">open</a>` : "not written yet"}<br><span class="meta">${by(r.versions)}</span></td></tr>`).join("")}</tbody></table>`
    : `<p class="meta">No usability assessment yet: run <code>npx ux-builder-audit assess init</code>, then follow the ux-builder-assess skill.</p>`;
  const walkHtml = latest?.journeys.some((j) => j.steps.length)
    ? `<section><h2>The latest run's journeys, step by step <span class="meta">${esc(latest.id)}</span></h2>${latest.journeys.map((j) => `<article><h3><code>${esc(j.id)}</code>${j.status ? ` <span class="meta">${esc(j.status)}</span>` : ""}</h3><ol>${j.steps.map((s) => `<li value="${esc(s.n)}">${s.screenshot ? `<a href="${esc(s.screenshot)}"><img src="${esc(s.screenshot)}" alt="${esc(`Step ${s.n}: ${s.action}`)}" loading="lazy"></a>` : ""}<span>${esc(s.action)}${s.screen ? ` <code>${esc(s.screen)}</code>` : ""} <span class="meta">${esc(s.status)}</span></span></li>`).join("")}</ol></article>`).join("")}</section>`
    : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reports</title>
<style>
:root { --bg: #f6f5f2; --panel: #fff; --fg: #1d1c1a; --muted: #67645d; --line: #e2dfd7; --err: #b3261e; --warn: #8a5a00; --ok: #2e6b45; color-scheme: light; }
@media (prefers-color-scheme: dark) { :root { --bg: #161615; --panel: #1f1f1d; --fg: #ecebe7; --muted: #a29f97; --line: #34332f; --err: #ff8a80; --warn: #f0b84a; --ok: #7fc496; color-scheme: dark; } }
* { box-sizing: border-box; }
body { margin: 0; padding: 32px 16px 64px; background: var(--bg); color: var(--fg); font: 15px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 980px; margin: 0 auto; display: grid; gap: 24px; }
h1 { margin: 0; font-size: 1.6rem; } h2 { margin: 0 0 8px; font-size: 1.2rem; } h3 { margin: 0 0 6px; font-size: 1rem; } p { margin: 0; max-width: 75ch; }
section { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 16px; display: grid; gap: 10px; min-width: 0; }
.meta { color: var(--muted); } code { font: 13px ui-monospace, Menlo, monospace; overflow-wrap: anywhere; }
.pass { color: var(--ok); } .warn { color: var(--warn); } .fail { color: var(--err); }
table { width: 100%; border-collapse: collapse; display: block; overflow-x: auto; } th, td { padding: 6px 8px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; } td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; }
ol { margin: 0; padding-left: 24px; display: grid; gap: 8px; } li { display: grid; grid-template-columns: auto 1fr; gap: 10px; align-items: start; }
img { width: 160px; max-width: 40vw; border: 1px solid var(--line); border-radius: 4px; display: block; }
</style></head><body><main>
<header><h1>Reports</h1><p class="meta">Every report on this app, in one place. Refreshed whenever a report is written, or by <code>npx ux-builder-audit reports</code>.</p></header>
<section id="audit"><h2>UI audit</h2><p>${esc(WHAT.audit)}</p>${auditHtml}</section>
<section id="assessments"><h2>Usability assessments</h2><p>${esc(WHAT.assessment)}</p>${runsHtml}</section>
${walkHtml}
</main></body></html>
`;
}
