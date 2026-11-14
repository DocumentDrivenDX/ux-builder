/* The presentation (visuals PRD §5.8, CONTRACT-009): one offline page that walks a visual's steps
   one at a time, gliding the view to each step's focus. The player is inlined, so the page needs
   nothing else at build time or when it is opened. */

import { createPlayer } from "./player/player.js";
import { escape, focusBoxes, legend, page } from "./html.mjs";

const CSS = `
body{height:100vh;display:grid;grid-template-rows:auto 1fr auto;overflow:hidden}
.uxb-top{padding:20px 32px 0}
.uxb-top h1{font-size:1.4rem;margin:0}
.uxb-top p{margin:.2rem 0 0;color:var(--uxb-muted)}
.uxb-stage{min-height:0;display:grid;place-items:center;padding:16px 32px}
.uxb-stage svg{width:100%;height:100%;max-height:100%}
.uxb-stage svg.uxb-is-stepping > g:not(.uxb-is-focus):not(.uxb-group){opacity:.28;transition:opacity .3s}
.uxb-stage svg > g{transition:opacity .3s}
@media (prefers-reduced-motion: reduce){.uxb-stage svg > g{transition:none}}
.uxb-bar{display:grid;grid-template-columns:auto 1fr auto;gap:24px;align-items:center;padding:16px 32px 24px;border-top:1px solid var(--uxb-rule);background:var(--uxb-surface)}
.uxb-bar h2{font-size:1.15rem;margin:0}
.uxb-bar p{margin:.2rem 0 0;max-width:80ch}
.uxb-count{font-weight:600;color:var(--uxb-muted);min-width:4.5rem}
.uxb-nav{display:flex;gap:8px}
.uxb-nav button{min-width:44px;min-height:44px;padding:0 16px;border-radius:8px;border:1px solid var(--uxb-rule);background:var(--uxb-ground);cursor:pointer;font-weight:600}
.uxb-nav button:disabled{opacity:.45;cursor:default}
.uxb-legend{display:none}
`;

/* JSON inside an inline script: no "<" survives, so document text can never close the script element. */
const scriptJson = (value) => JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

export function writePresentation(d, svg) {
  const v = d.visual;
  const steps = focusBoxes(v, d.layout);
  const overview = v.takeaway ?? v.question;
  const body = `<header class="uxb-top"><h1>${escape(v.title ?? v.question)}</h1><p>${escape(v.question)}</p></header>
<main class="uxb-stage">
${svg.trim()}
</main>
<footer class="uxb-bar" aria-label="Walkthrough">
<span class="uxb-count" id="uxb-count"></span>
<div aria-live="polite"><h2 id="uxb-title" data-overview="${escape("Overview")}"></h2><p id="uxb-caption" data-overview="${escape(overview)}"></p></div>
<div class="uxb-nav"><button type="button" id="uxb-prev" aria-label="Previous step">←</button><button type="button" id="uxb-next" aria-label="Next step">→</button></div>
</footer>
${legend(v, d.theme)}`;
  const script = `const createPlayer = ${createPlayer.toString()};
const $ = (id) => document.getElementById(id);
createPlayer({ svg: document.querySelector(".uxb-stage svg"), steps: ${scriptJson(steps)},
  title: $("uxb-title"), caption: $("uxb-caption"), counter: $("uxb-count"), prev: $("uxb-prev"), next: $("uxb-next") });`;
  return page({ title: v.title ?? v.question, theme: d.theme, css: CSS, body, script });
}
