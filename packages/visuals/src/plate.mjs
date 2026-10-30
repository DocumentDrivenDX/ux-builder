/* The plate (visuals PRD §5.8, CONTRACT-009): a developer's first map on one offline page, composed
   as HELIX documentor's field guide page (field_page.py): an eyebrow and the title as headline, the
   takeaway beneath, a stamp; the drawing on a card; a legend of what the drawing uses; the walkthrough
   ("Follow a request"), each step led by why its line goes that way; the sources and limits; the text
   equivalent. */

import { TOKENS, stepMarks } from "./grammar.mjs";
import { escape, page } from "./html.mjs";

/* How the legend says a step outside the sequence happens. */
const PHRASE = {
  throughout: "runs throughout", before: "comes first", after: "follows", background: "runs in the background",
  scheduled: "runs on a schedule", "on-failure": "runs when a step fails", optional: "runs only when needed",
};

const ORIENTATION = { developer: "Developer orientation", operator: "Operator orientation", user: "User orientation", data: "Data orientation", executive: "Executive overview" };

const sentence = (text) => { const t = String(text ?? "").trim().replace(/\.$/, ""); return t ? `${t[0].toUpperCase()}${t.slice(1)}.` : ""; };
/* Escaped, with `code` spans kept as code. */
const rich = (text) => escape(text).replace(/`([^`]+)`/g, "<code>$1</code>");
/* A font token as written in the page, or the fallback when the theme has none. */
const fontOr = (theme, name, fallback) => { try { return theme.fontOf(name); } catch { return fallback; } };

function css(theme) {
  return `
:root{--uxb-tint:${theme.color({ mix: [TOKENS.accent, 10, TOKENS.surface] })};--uxb-tint-line:${theme.color({ mix: [TOKENS.accent, 50, TOKENS.surface] })};
  --uxb-display:${fontOr(theme, "piq-font-heading", "inherit")};--uxb-mono:${fontOr(theme, "piq-font-mono", "ui-monospace,monospace")}}
body{font-size:16px;line-height:1.6}
.uxb-plate{max-width:1440px;margin:auto;padding:54px 48px}.uxb-plate p{margin:0 0 14px}.uxb-plate strong{color:var(--uxb-strong)}
.uxb-head{display:flex;justify-content:space-between;align-items:start;gap:40px;margin-bottom:30px}
.uxb-head p{max-width:760px;font-size:19px;color:var(--uxb-muted);margin:0}
.uxb-eyebrow{font:600 12px/1.5 var(--uxb-mono);letter-spacing:2px;text-transform:uppercase;color:var(--uxb-accent)}
.uxb-plate h1{font-family:var(--uxb-display);font-weight:600;font-size:46px;line-height:1.12;letter-spacing:-1px;margin:14px 0 18px}
.uxb-plate h2{font-family:var(--uxb-display);font-size:22px;margin:6px 0 16px}
.uxb-stamp{border-left:2px solid var(--uxb-rule);padding-left:20px;min-width:200px;font-size:13px;color:var(--uxb-muted)}
.uxb-card{background:var(--uxb-surface);border:1px solid var(--uxb-rule);border-radius:16px;overflow:auto;padding:16px}
.uxb-card .uxb-visual{width:100%;min-width:940px;max-width:none;height:auto}
.uxb-legend{display:flex;gap:28px;flex-wrap:wrap;margin:16px 6px 30px;color:var(--uxb-muted);font-size:13px}
.uxb-legend span:before{content:"";display:inline-block;width:27px;border-top:2.5px solid var(--uxb-strong);vertical-align:middle;margin-right:9px}
.uxb-legend .quiet:before{border-top:1.5px solid var(--uxb-rule)}
.uxb-legend .own:before{height:13px;border:2px solid var(--uxb-accent);background:var(--uxb-surface)}
.uxb-legend .region:before{height:13px;border:1px dashed var(--uxb-tint-line);background:var(--uxb-tint)}
.uxb-notes{display:grid;grid-template-columns:1.6fr 1fr;gap:44px}.uxb-notes ol{padding-left:23px;margin:0}
.uxb-notes li{padding:0 0 12px 9px;color:var(--uxb-muted)}.uxb-aside{margin-top:14px}
.uxb-notes aside{border-left:1px solid var(--uxb-rule);padding-left:30px}.uxb-notes aside p{color:var(--uxb-muted);font-size:14px}
.uxb-plate code{font:13px var(--uxb-mono)}
.uxb-plate details{margin-top:24px;font-size:14px;color:var(--uxb-muted)}
.uxb-plate details pre{white-space:pre-wrap;font:inherit;background:var(--uxb-surface);padding:12px;border-radius:8px}
.uxb-plate footer{border-top:1px solid var(--uxb-rule);margin-top:30px;padding-top:16px;font-size:12px;color:var(--uxb-muted)}
@media(max-width:800px){.uxb-plate{padding:28px 16px}.uxb-head{display:block}.uxb-plate h1{font-size:34px}.uxb-stamp{margin-top:24px}
  .uxb-notes{grid-template-columns:1fr;gap:22px}.uxb-notes aside{padding-left:0;border:0}}
@media print{@page{size:A3 landscape;margin:12mm}.uxb-plate{padding:0;max-width:none}.uxb-card{break-inside:avoid;padding:4px}.uxb-card .uxb-visual{min-width:0}}`;
}

export function writePlate(d, svg, text) {
  const v = d.visual;
  const nodes = v.nodes ?? [];
  const own = nodes.filter((n) => n.role === "own");
  const system = own.length === 1 ? own[0].label : null;
  const edges = new Map((v.edges ?? []).map((e) => [e.id, e]));
  // Each step is led by why its line goes that way, when it walks one line that says; a step outside
  // the sequence follows the numbered list, led by when it happens.
  const marks = stepMarks(v.steps);
  const why = (s) => { const line = s.focus.length === 1 ? edges.get(s.focus[0]) : null; return line?.why ?? s.title; };
  const numbered = (v.steps ?? []).filter((s) => !s.when), aside = (v.steps ?? []).filter((s) => s.when);
  const steps = numbered.map((s) => `<li><strong>${escape(sentence(why(s)))}</strong> ${s.caption ? rich(s.caption) : ""}</li>`).join("\n");
  const asides = aside.map((s) => `<p class="uxb-aside"><strong>${escape(sentence(`${marks.get(s.id).lead}: ${why(s)}`))}</strong> ${s.caption ? rich(s.caption) : ""}</p>`).join("\n");
  const calls = [...new Set(aside.map((s) => (s.tag ? `is marked ${s.tag}` : PHRASE[s.when])))];
  const pathKey = numbered.length ? `The request's path: numbered steps in order${calls.length ? `, and the call that ${calls.join(" or ")}` : ""}`
    : calls.length ? `The call that ${calls.join(" or ")}` : "";
  const ownedLane = (v.groups ?? []).some((g) => {
    const inside = nodes.filter((n) => n.group === g.id);
    return g.role === "lane" && inside.length && inside.every((n) => n.role === "own");
  });
  const legend = [
    pathKey ? `<span>${escape(pathKey)}</span>` : "",
    (v.edges ?? []).length ? '<span class="quiet">Other calls</span>' : "",
    own.length ? `<span class="own">${escape(system ?? "The project")}'s own code</span>` : "",
    ownedLane ? `<span class="region">Shaded lane: what ${escape(system ?? "the project")} owns and deploys</span>` : "",
  ].filter(Boolean).join("\n");
  const source = v.source ? `<p>Authority: <code>${escape(v.source.path)}</code>${v.source.view ? `, view <code>${escape(v.source.view)}</code>` : ""}.</p>` : "";
  const omissions = (v.omissions ?? []).map((o) => `<p>${rich(o)}</p>`).join("\n");
  const stamp = [
    escape(ORIENTATION[v.audience] ?? "Orientation"),
    v.source ? `Generated from ${escape(v.source.path.split(/[/:]/).at(-1))}` : "",
    `${nodes.length} parts`,
  ].filter(Boolean).join("<br>");
  const title = v.title ?? v.question;
  const body = `<main class="uxb-plate">
<header class="uxb-head">
<div>
<div class="uxb-eyebrow">${escape(system ? `${system} / architecture field guide` : "architecture field guide")}</div>
<h1>${escape(title)}</h1>
<p>${escape(v.takeaway ?? v.question)}</p>
</div>
<div class="uxb-stamp">${stamp}</div>
</header>
<section class="uxb-card" aria-label="${escape(title)}">
${svg.trim()}
</section>
<div class="uxb-legend">
${legend}
</div>
<section class="uxb-notes">
<div>
${steps || asides ? "<h2>Follow a request</h2>" : ""}
${steps ? `<ol>\n${steps}\n</ol>` : ""}
${asides}
</div>
<aside>
<h2>Sources and limits</h2>
${omissions}
${source}
<p>Visual approach: the architecture field guide (responsibility lanes, numbered reading order, notes beside the plate), in the project's theme.</p>
</aside>
</section>
<details><summary>Text version</summary><pre>${escape(text)}</pre></details>
<footer>Self-contained HTML: no remote fonts, libraries or scripts. Every box, line, number and note comes from the visual's data.</footer>
</main>`;
  return page({ title: system ? `${system}: ${title}` : title, theme: d.theme, css: css(d.theme), body });
}
