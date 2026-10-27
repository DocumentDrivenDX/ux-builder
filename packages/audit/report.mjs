/* The audit's reports: report.json, a self-contained index.html beside the
   screenshots, and a short summary for the terminal.

   index.html follows the user's journeys (FEAT-015 RPT-03, RPT-04; ADR-033):
   1. the theme and modality-fit verdicts;
   2. the rules broken: each rule's ID, statement and count, linking to its
      findings;
   3. with the blueprint's journeys, each journey and step: the step's
      screen, its screenshot with the findings' numbered boxes, and each
      finding there with its severity, rule ID, the rule's full statement,
      sources, evidence and fix; then "Other screens", which no journey
      visits; without journeys, each screen (or page) in turn;
   4. every check, as an index. */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { refreshLandingPage } from "./reports.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const SEV = { error: 0, warning: 1, info: 2 };
const STATUS = { pass: "Pass", warn: "Warn", fail: "Fail", "not-checked": "Not checked" };

export function writeReports(report, out) {
  writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2) + "\n");
  writeFileSync(join(out, "index.html"), html(report));
  refreshLandingPage(out);
}

const pathOf = (u) => { try { const x = new URL(u); return x.pathname + x.search; } catch { return u; } };
const checkOf = (f) => f.check ?? f.rule;
const ruleIdOf = (f) => f.ruleId ?? f.rule?.id ?? null;

/* The rules broken, in severity order: { ruleId, statement, title, findings }.
   A finding shown under several steps is counted once. */
export function rulesBroken(r) {
  const by = new Map();
  for (const f of r.findings) {
    if (f.severity === "info") continue;
    const id = ruleIdOf(f) ?? checkOf(f);
    if (!by.has(id)) by.set(id, { ruleId: id, title: f.rule?.title ?? null, statement: f.rule?.statement ?? r.rules?.[checkOf(f)] ?? "", sources: f.rule?.sources ?? f.sources ?? [], severity: f.severity, findings: [] });
    const g = by.get(id);
    if (SEV[f.severity] < SEV[g.severity]) g.severity = f.severity;
    g.findings.push(f.id);
  }
  return [...by.values()].sort((a, b) => SEV[a.severity] - SEV[b.severity] || b.findings.length - a.findings.length || a.ruleId.localeCompare(b.ruleId));
}

/* The sections the findings are shown in: { journeys: [{ id, story, steps:
   [{ n, alternate, screen, title, pages, findings }] }], screens: [{ key,
   screen, title, pages, findings }], other: bool }. With journeys, screens
   are those no journey visits ("Other screens"); without, every screen. */
export function sections(r) {
  const pages = r.pages?.length ? r.pages : [...new Set(r.findings.map((f) => f.url))].map((url) => ({ url, screen: null }));
  const keyOf = (p) => p.screen ?? p.url;
  const screens = new Map();
  for (const p of pages) {
    const k = keyOf(p);
    if (!screens.has(k)) screens.set(k, { key: k, screen: p.screen ?? null, title: p.screenTitle ?? null, pages: [], findings: [] });
    screens.get(k).pages.push(p.url);
  }
  for (const f of r.findings) {
    const p = pages.find((x) => x.url === f.url);
    const k = p ? keyOf(p) : f.url;
    if (!screens.has(k)) screens.set(k, { key: k, screen: null, title: null, pages: [f.url], findings: [] });
    screens.get(k).findings.push(f);
  }
  const journeys = (r.journeys ?? []).map((j) => ({ ...j, steps: j.steps.map((s) => ({ ...s, pages: screens.get(s.screen)?.pages ?? [], findings: screens.get(s.screen)?.findings ?? [] })) }));
  const visited = new Set(journeys.flatMap((j) => j.steps.map((s) => s.screen)).filter(Boolean));
  return { journeys, screens: [...screens.values()].filter((s) => !journeys.length || !s.screen || !visited.has(s.screen)), other: journeys.length > 0 };
}

/* The screenshot that stands for a page: its declared theme in light at the
   widest width audited, else the first. */
function shotOf(r, url) {
  const page = r.pages?.find((p) => p.url === url);
  const runs = r.runs.filter((x) => x.url === url && x.screenshot);
  if (!runs.length) return { main: null, others: [] };
  const score = (x) => (x.theme === page?.theme ? 4 : 0) + (x.appearance === "light" ? 2 : 0) + (x.width ?? 0) / 10000;
  const main = [...runs].sort((a, b) => score(b) - score(a))[0];
  return { main, others: runs.filter((x) => x !== main) };
}
const runLabel = (x) => `${x.theme} · ${x.appearance}${x.width ? ` · ${x.width}px` : ""}`;

export function html(r) {
  const s = r.summary;
  const verdict = s.error ? `${s.error} error${s.error === 1 ? "" : "s"}` : s.warning ? "No errors" : "Clean";
  const anchored = new Set();
  const anchorOf = (f) => (anchored.has(f.id) ? "" : (anchored.add(f.id), ` id="f-${f.id}"`));
  const link = (id) => `<a href="#f-${id}">#${id}</a>`;
  const sources = (list) => (list ?? []).map((x) => `<a href="${esc(x.url)}">${esc(x.title)}</a>`).join(", ");
  const finding = (f) => `<div class="f"${anchorOf(f)}><span class="id">#${f.id}</span><div>
<p class="head"><span class="sev ${f.severity}">${f.severity}</span>${ruleIdOf(f) ? ` <code class="rid">${esc(ruleIdOf(f))}</code>` : ""}${f.rule?.title ? ` <b>${esc(f.rule.title)}</b>` : ""} <span class="meta">check <code>${esc(checkOf(f))}</code></span></p>
${f.rule?.statement ? `<p class="statement">${esc(f.rule.statement)}</p>` : ""}
<p><b>Found:</b> ${esc(f.message)}</p>
<p><b>Evidence:</b> ${f.selector ? `<code>${esc(f.selector)}</code>` : f.rule_selector ? `<code>${esc(f.rule_selector)}</code>` : "the page"}${f.selector || f.box ? ` · box <b>${f.id}</b> in the screenshot` : ""}${f.runs?.length ? ` <span class="chips">${f.runs.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</span>` : ""}</p>
${f.fix ? `<p><b>Fix:</b> ${esc(f.fix)}</p>` : ""}
${(f.rule?.sources ?? f.sources)?.length ? `<p class="meta">Sources: ${sources(f.rule?.sources ?? f.sources)}</p>` : ""}
</div></div>`;
  const shots = (urls) => urls.map((u) => {
    const { main, others } = shotOf(r, u);
    if (!main) return `<p class="meta"><code>${esc(pathOf(u))}</code>: no screenshot (no run, or --out not given).</p>`;
    return `<figure><a href="${esc(main.screenshot)}"><img src="${esc(main.screenshot)}" alt="${esc(`${pathOf(u)}, ${runLabel(main)}, with the findings' numbered boxes`)}" loading="lazy"></a><figcaption><code>${esc(pathOf(u))}</code> · ${esc(runLabel(main))}${others.length ? ` · also: ${others.map((x) => `<a href="${esc(x.screenshot)}">${esc(runLabel(x))}</a>`).join(", ")}` : ""}</figcaption></figure>`;
  }).join("\n");
  const list = (fs) => (fs.length ? [...fs].sort((a, b) => SEV[a.severity] - SEV[b.severity] || a.id - b.id).map(finding).join("\n") : `<p class="meta">No findings on this screen.</p>`);
  const { journeys, screens, other } = sections(r);
  const broken = rulesBroken(r);
  const v = r.verdicts;
  const badge = (st) => `<span class="badge ${esc(st)}">${esc(STATUS[st] ?? st)}</span>`;
  const themeV = v?.theme ? `<section class="verdict" id="verdict-theme"><h2>Theme ${badge(v.theme.status)}</h2>
<p>Declared theme <code>${esc([v.theme.theme].flat().filter(Boolean).join(", ") || "none")}</code> · design system <code>${esc([v.theme.designSystem].flat().filter(Boolean).join(", ") || "none")}</code> · applied: <b>${v.theme.applied ? "yes" : "no"}</b> · SDK components only: <b>${v.theme.sdkOnly ? "yes" : "no"}</b> · contrast: light ${badge(v.theme.contrast.light)} dark ${badge(v.theme.contrast.dark)}</p>
<ul>${v.theme.items.map((i) => `<li>${badge(i.status)} ${esc(i.label)}${i.note ? ` <span class="meta">(${esc(i.note)})</span>` : ""}${i.rules.length ? ` · ${i.rules.map((x) => `<code>${esc(x)}</code>`).join(", ")}` : ""}${i.findings.length ? ` · ${i.findings.map(link).join(" ")}` : ""}${i.fix && i.status !== "pass" ? `<br><span class="meta">Fix: ${esc(i.fix)}</span>` : ""}</li>`).join("")}</ul></section>` : "";
  const modV = v?.modality?.length ? `<section class="verdict" id="verdict-modality"><h2>Modality fit ${badge(v.modality.map((m) => m.status).includes("fail") ? "fail" : v.modality.some((m) => m.status === "warn") ? "warn" : "pass")}</h2>
${v.modality.map((m) => `<div class="modality"><h3><code>${esc(m.modality)}</code> ${badge(m.status)}</h3>${m.assumed ? `<p class="meta">${esc(m.note)}</p>` : ""}
<p>Components: ${m.components.map((c) => `${esc(c.name)} <b>${c.alternative ? "not used" : c.present ? "present" : "missing"}</b>${c.alternative ? " (a main landmark frames each page, and the content fits)" : c.framed === false && c.present ? " (<b>a page has no frame that fits</b>)" : ""}${c.navigation === false ? " (no navigation to adapt)" : ""}${c.adapts === true ? " (adapts by size class)" : c.adapts === false ? " (<b>does not adapt</b> by size class)" : c.adapts === null ? " (adaptation not checked)" : ""}`).join("; ")}</p>
<p>Rule families: ${m.ruleFamilies.map((f) => `<code>${esc(f.family)}</code> ${f.checked === true ? "checked" : f.checked === false ? "<b>not checked</b>" : `<span class="meta">(${esc(f.by)})</span>`}`).join(", ")}</p>
${m.fixes.length ? `<ul>${m.fixes.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
<details><summary>Evidence</summary><ul>${m.evidence.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>${m.findings.length ? `<p class="meta">Findings of its rule families: ${m.findings.map(link).join(" ")}</p>` : ""}</div>`).join("\n")}</section>` : "";
  const stepTitle = (st) => `${st.alternate ? `Alternate ${st.alternate}, step ${st.n}` : `Step ${st.n}`}: ${esc(st.title ?? st.screen ?? "?")}${st.screen ? ` <code>${esc(st.screen)}</code>` : ""}`;
  const journeyHtml = journeys.map((j) => `<section class="journey" id="j-${esc(j.id)}"><h2>Journey ${esc(j.id)}${j.story ? ` <span class="meta">${esc(j.story)}</span>` : ""}</h2>
${j.steps.map((st) => `<article class="step"><h3>${stepTitle(st)}</h3>${st.pages.length ? `${shots(st.pages)}\n${list(st.findings)}` : `<p class="meta">No audited page is this screen: mark the page with data-piq-screen="${esc(st.screen)}" or give the screen its path in the blueprint, and audit it.</p>`}</article>`).join("\n")}
</section>`).join("\n");
  const screenHtml = screens.length ? `<section class="screens"><h2>${other ? "Other screens" : "Screens"}</h2>${other ? `<p class="meta">Screens no journey visits, and pages that map to no screen.</p>` : ""}
${screens.map((sc) => `<article class="step"><h3>${sc.screen ? `${esc(sc.title ?? sc.screen)} <code>${esc(sc.screen)}</code>` : `<code>${esc(pathOf(sc.key))}</code>`}</h3>${shots(sc.pages)}\n${list(sc.findings)}</article>`).join("\n")}</section>` : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Theme audit</title>
<style>
:root { --bg: #f6f5f2; --panel: #fff; --fg: #1d1c1a; --muted: #67645d; --line: #e2dfd7; --err: #b3261e; --warn: #8a5a00; --info: #3b5b8a; --ok: #2e6b45; --mark: #e0007a; color-scheme: light; }
@media (prefers-color-scheme: dark) { :root { --bg: #161615; --panel: #1f1f1d; --fg: #ecebe7; --muted: #a29f97; --line: #34332f; --err: #ff8a80; --warn: #f0b84a; --info: #9cc0f5; --ok: #7fc496; color-scheme: dark; } }
* { box-sizing: border-box; }
body { margin: 0; padding: 32px 16px 64px; background: var(--bg); color: var(--fg); font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 1100px; margin: 0 auto; display: grid; gap: 28px; }
h1 { margin: 0; font-size: 1.6rem; text-wrap: balance; } h2 { margin: 0 0 8px; font-size: 1.2rem; } h3 { margin: 0 0 8px; font-size: 1rem; }
p { margin: 0; } .meta { color: var(--muted); } code { font: 12px/1.4 ui-monospace, Menlo, monospace; overflow-wrap: anywhere; }
.counts { display: flex; flex-wrap: wrap; gap: 12px; }
.count { padding: 10px 16px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); min-width: 120px; }
.count b { display: block; font-size: 1.5rem; font-variant-numeric: tabular-nums; }
.error { color: var(--err); } .warning { color: var(--warn); } .info { color: var(--info); }
.badge { display: inline-block; padding: 0 8px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1px solid currentColor; vertical-align: middle; }
.badge.pass { color: var(--ok); } .badge.warn { color: var(--warn); } .badge.fail { color: var(--err); } .badge.not-checked { color: var(--muted); }
table { width: 100%; border-collapse: collapse; background: var(--panel); border: 1px solid var(--line); }
th, td { padding: 8px 10px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
th { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
td.n { font-variant-numeric: tabular-nums; text-align: right; }
.verdict, .journey, .screens, .step, .modality { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 16px; display: grid; gap: 10px; min-width: 0; }
.journey .step, .screens .step, .verdict .modality { background: transparent; }
.verdict ul { margin: 0; padding-left: 20px; display: grid; gap: 4px; }
figure { margin: 0; display: grid; gap: 4px; } figure img { width: 100%; max-height: 520px; object-fit: cover; object-position: top; border: 1px solid var(--line); border-radius: 6px; }
.f { display: grid; grid-template-columns: 3rem 1fr; gap: 4px 12px; padding-top: 10px; border-top: 1px solid var(--line); min-width: 0; }
.f .id { font-weight: 700; color: var(--mark); font-variant-numeric: tabular-nums; }
.f > div { min-width: 0; display: grid; gap: 4px; } .f .statement { font-style: italic; }
.chips { display: inline-flex; flex-wrap: wrap; gap: 4px; } .chip { padding: 0 6px; border: 1px solid var(--line); border-radius: 999px; font-size: 12px; color: var(--muted); }
.sev { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
</style></head><body><main>
<header><h1>Theme audit: <span class="${s.error ? "error" : ""}">${esc(verdict)}</span></h1>
<p class="meta">${r.urls.map((u) => `<code>${esc(u)}</code>`).join(", ")} · ${esc(new Date(r.generatedAt).toLocaleString())} · ${esc(r.tool)} ${esc(r.version)} · ${r.runs.length} theme × appearance${r.runs.some((x) => x.width) ? " × width" : ""} runs${r.modalities ? ` · modalities ${r.modalities.names.map((m) => `<code>${esc(m)}</code>`).join(", ")}${r.modalities.assumed ? " (assumed)" : ` (from the ${r.modalities.source === "blueprint" ? "blueprint" : "--modality option"})`}` : ""}</p></header>
${themeV}
${modV}
<section class="counts"><div class="count"><b class="error">${s.error}</b>errors</div><div class="count"><b class="warning">${s.warning}</b>warnings</div><div class="count"><b class="info">${s.info}</b>notes</div>${s.baselined != null ? `<div class="count"><b>${s.baselined}</b>in the baseline</div><div class="count"><b>${s.resolved}</b>resolved</div>` : ""}</section>
<section id="rules-broken"><h2>Rules broken</h2>${broken.length ? `<div style="overflow-x:auto"><table aria-label="Rules broken"><thead><tr><th>Rule</th><th>Statement</th><th class="n">Findings</th><th>Where</th></tr></thead><tbody>
${broken.map((b) => `<tr><td><code>${esc(b.ruleId)}</code>${b.title ? `<br>${esc(b.title)}` : ""}</td><td>${esc(b.statement)}${b.sources.length ? `<br><span class="meta">${sources(b.sources)}</span>` : ""}</td><td class="n">${b.findings.length}</td><td>${b.findings.map(link).join(" ")}</td></tr>`).join("\n")}
</tbody></table></div>` : `<p class="meta">None: no rule is broken.</p>`}</section>
${r.resolved?.length ? `<section><h2>Resolved since the baseline</h2><p class="meta">Remove these from the baseline file.</p><ul>${r.resolved.map((b) => `<li><code>${esc(b.rule)}</code> ${esc(b.selector ?? b.message ?? "")} <span class="meta">${esc(b.url)}</span></li>`).join("")}</ul></section>` : ""}
${journeyHtml}
${screenHtml}
<section id="checks"><h2>Checks</h2><div style="overflow-x:auto"><table><thead><tr><th>Check</th><th>What it holds the app to</th><th class="n">Findings</th></tr></thead><tbody>
${Object.keys(r.rules).map((c) => `<tr><td><code>${c}</code></td><td>${esc(r.rules[c])}</td><td class="n">${s.byRule[c] || "—"}</td></tr>`).join("\n")}
</tbody></table></div></section>
</main></body></html>
`;
}

/* A few lines for the terminal. */
export function summaryText(r, { limit = 25 } = {}) {
  const s = r.summary;
  const lines = [`Theme audit: ${s.error} errors, ${s.warning} warnings, ${s.info} notes across ${r.runs.length} theme × appearance runs.${s.baselined != null ? ` ${s.baselined} in the baseline; ${s.resolved} resolved.` : ""}`];
  const v = r.verdicts;
  if (v?.theme) lines.push(`Theme verdict: ${v.theme.status} (theme ${[v.theme.theme].flat().filter(Boolean).join(", ") || "none"}, design system ${[v.theme.designSystem].flat().filter(Boolean).join(", ") || "none"}; contrast light ${v.theme.contrast.light}, dark ${v.theme.contrast.dark})`);
  for (const m of v?.modality ?? []) {
    lines.push(`Modality ${m.modality}${m.assumed ? " (assumed)" : ""}: ${m.status}`);
    for (const x of m.fixes) lines.push(`  - ${x}`);
  }
  for (const f of r.findings.filter((x) => x.severity !== "info").slice(0, limit)) {
    lines.push(`  #${f.id} ${f.severity.padEnd(7)} ${(ruleIdOf(f) ?? checkOf(f)).padEnd(26)} ${f.selector ?? f.rule_selector ?? ""}`.trimEnd());
    lines.push(`      ${f.message}${f.runs.length ? ` [${f.runs.length === r.runs.length ? "every theme" : f.runs.join(", ")}]` : ""}`);
    if (f.fix) lines.push(`      Fix: ${f.fix}`);
  }
  const rest = r.findings.filter((x) => x.severity !== "info").length - limit;
  if (rest > 0) lines.push(`  … ${rest} more in the report`);
  for (const b of r.resolved ?? []) lines.push(`  resolved: ${b.rule} ${b.selector ?? b.message ?? ""} (${b.url}); remove it from the baseline`);
  for (const n of r.baselineIgnored ?? []) lines.push(`  baseline: ${n}`);
  return lines.join("\n");
}
