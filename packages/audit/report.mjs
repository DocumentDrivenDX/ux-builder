/* The audit's reports: report.json, a self-contained index.html beside the
   screenshots, and a short summary for the terminal. */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function writeReports(report, out) {
  writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2) + "\n");
  writeFileSync(join(out, "index.html"), html(report));
}

export function html(r) {
  const s = r.summary;
  const byRule = Object.keys(r.rules).map((rule) => ({ rule, about: r.rules[rule], items: r.findings.filter((f) => f.rule === rule) }));
  const verdict = s.error ? `${s.error} error${s.error === 1 ? "" : "s"}` : s.warning ? "No errors" : "Clean";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Theme audit</title>
<style>
:root { --bg: #f6f5f2; --panel: #fff; --fg: #1d1c1a; --muted: #67645d; --line: #e2dfd7; --err: #b3261e; --warn: #8a5a00; --info: #3b5b8a; --mark: #e0007a; color-scheme: light; }
@media (prefers-color-scheme: dark) { :root { --bg: #161615; --panel: #1f1f1d; --fg: #ecebe7; --muted: #a29f97; --line: #34332f; --err: #ff8a80; --warn: #f0b84a; --info: #9cc0f5; color-scheme: dark; } }
* { box-sizing: border-box; }
body { margin: 0; padding: 32px 16px 64px; background: var(--bg); color: var(--fg); font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 1100px; margin: 0 auto; display: grid; gap: 28px; }
h1 { margin: 0; font-size: 1.6rem; text-wrap: balance; } h2 { margin: 0 0 8px; font-size: 1.1rem; }
.meta { color: var(--muted); } code { font: 12px/1.4 ui-monospace, Menlo, monospace; overflow-wrap: anywhere; }
.counts { display: flex; flex-wrap: wrap; gap: 12px; }
.count { padding: 10px 16px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); min-width: 120px; }
.count b { display: block; font-size: 1.5rem; font-variant-numeric: tabular-nums; }
.error { color: var(--err); } .warning { color: var(--warn); } .info { color: var(--info); }
table { width: 100%; border-collapse: collapse; background: var(--panel); border: 1px solid var(--line); }
th, td { padding: 8px 10px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
th { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
td.n { font-variant-numeric: tabular-nums; text-align: right; }
.shots { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.shots a { display: grid; gap: 4px; color: inherit; text-decoration: none; }
.shots img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; object-position: top; border: 1px solid var(--line); border-radius: 6px; background: var(--panel); }
.rule { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 16px; display: grid; gap: 10px; min-width: 0; }
.rule p { margin: 0; color: var(--muted); }
.f { display: grid; grid-template-columns: 3rem 1fr; gap: 4px 12px; padding-top: 10px; border-top: 1px solid var(--line); min-width: 0; }
.f .id { font-weight: 700; color: var(--mark); font-variant-numeric: tabular-nums; }
.f > div { min-width: 0; display: grid; gap: 4px; }
.chips { display: flex; flex-wrap: wrap; gap: 4px; } .chip { padding: 0 6px; border: 1px solid var(--line); border-radius: 999px; font-size: 12px; color: var(--muted); }
.sev { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
</style></head><body><main>
<header><h1>Theme audit: <span class="${s.error ? "error" : ""}">${esc(verdict)}</span></h1>
<p class="meta">${r.urls.map((u) => `<code>${esc(u)}</code>`).join(", ")} · ${esc(new Date(r.generatedAt).toLocaleString())} · ${esc(r.tool)} ${esc(r.version)} · ${r.runs.length} theme × appearance${r.runs.some((x) => x.width) ? " × width" : ""} runs</p></header>
<section class="counts"><div class="count"><b class="error">${s.error}</b>errors</div><div class="count"><b class="warning">${s.warning}</b>warnings</div><div class="count"><b class="info">${s.info}</b>notes</div>${s.baselined != null ? `<div class="count"><b>${s.baselined}</b>in the baseline</div><div class="count"><b>${s.resolved}</b>resolved</div>` : ""}</section>
${r.resolved?.length ? `<section><h2>Resolved since the baseline</h2><p class="meta">Remove these from the baseline file.</p><ul>${r.resolved.map((b) => `<li><code>${esc(b.rule)}</code> ${esc(b.selector ?? b.message ?? "")} <span class="meta">${esc(b.url)}</span></li>`).join("")}</ul></section>` : ""}
<section><h2>Checks</h2><div style="overflow-x:auto"><table><thead><tr><th>Check</th><th>What it holds the app to</th><th class="n">Findings</th></tr></thead><tbody>
${byRule.map((g) => `<tr><td><a href="#${g.rule}"><code>${g.rule}</code></a></td><td>${esc(g.about)}</td><td class="n">${g.items.length || "—"}</td></tr>`).join("\n")}
</tbody></table></div></section>
${r.runs.some((x) => x.screenshot) ? `<section><h2>Screens</h2><p class="meta">Each theme and appearance as audited; numbered boxes mark the findings below.</p><div class="shots">
${r.runs.filter((x) => x.screenshot).map((x) => `<a href="${esc(x.screenshot)}"><img src="${esc(x.screenshot)}" alt="${esc(`${x.theme} ${x.appearance}`)}" loading="lazy"><span><b>${esc(x.theme)}</b> · ${esc(x.appearance)}${x.width ? ` · ${x.width}px` : ""}${r.urls.length > 1 ? ` · <code>${esc(new URL(x.url).pathname)}</code>` : ""}</span></a>`).join("\n")}
</div></section>` : ""}
${byRule.filter((g) => g.items.length).map((g) => `<section class="rule" id="${g.rule}"><h2><code>${g.rule}</code></h2><p>${esc(g.about)}</p>
${g.items.map((f) => `<div class="f"><span class="id">#${f.id}</span><div><span class="sev ${f.severity}">${f.severity}</span><span>${esc(f.message)}</span>${f.selector ? `<code>${esc(f.selector)}</code>` : ""}${f.rule_selector ? `<code>${esc(f.rule_selector)}</code>` : ""}${f.ruleId ? `<span>Rule <code>${esc(f.ruleId)}</code>${f.sources?.length ? `: ${f.sources.map((x) => `<a href="${esc(x.url)}">${esc(x.title)}</a>`).join(", ")}` : ""}</span>` : ""}${f.runs.length ? `<span class="chips">${f.runs.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</span>` : ""}</div></div>`).join("\n")}
</section>`).join("\n")}
</main></body></html>
`;
}

/* A few lines for the terminal. */
export function summaryText(r, { limit = 25 } = {}) {
  const s = r.summary;
  const lines = [`Theme audit: ${s.error} errors, ${s.warning} warnings, ${s.info} notes across ${r.runs.length} theme × appearance runs.${s.baselined != null ? ` ${s.baselined} in the baseline; ${s.resolved} resolved.` : ""}`];
  for (const f of r.findings.filter((x) => x.severity !== "info").slice(0, limit)) {
    lines.push(`  #${f.id} ${f.severity.padEnd(7)} ${f.rule.padEnd(17)} ${f.selector ?? f.rule_selector ?? ""}`.trimEnd());
    lines.push(`      ${f.message}${f.ruleId ? ` (rule ${f.ruleId})` : ""}${f.runs.length ? ` [${f.runs.length === r.runs.length ? "every theme" : f.runs.join(", ")}]` : ""}`);
  }
  const rest = r.findings.filter((x) => x.severity !== "info").length - limit;
  if (rest > 0) lines.push(`  … ${rest} more in the report`);
  for (const b of r.resolved ?? []) lines.push(`  resolved: ${b.rule} ${b.selector ?? b.message ?? ""} (${b.url}); remove it from the baseline`);
  for (const n of r.baselineIgnored ?? []) lines.push(`  baseline: ${n}`);
  return lines.join("\n");
}
