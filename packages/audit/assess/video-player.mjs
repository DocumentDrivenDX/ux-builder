/* The walkthrough videos' interactive player, video/index.html (FEAT-013
   OUT-04, ANN-01, ANN-02; ADR-031 decisions 3 and 7; US-095).

   One static page: no server, no network, no library. It is the SDK's own
   page, in the ux-builder-databricks theme with its fonts, logo and
   favicon inlined, and SDK widget classes for its controls. It plays each
   journey's clean recording and draws the annotation timeline over it:
   outlines scaled with the video, and the finding as a pop-up beside them
   that pauses playback (by default), expands for its evidence and links to
   the report.

   The caption's markup (captionMarkup), its styles (CAPTION_CSS) and where
   it goes (place) are shared with the MP4 renderer, which draws the same
   pop-up into the picture (video-render.mjs), so the two cannot disagree. */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
export const THEME = "ux-builder-databricks";
const read = (f) => JSON.parse(readFileSync(f, "utf8"));
const maybe = (f) => { try { return read(f); } catch { return null; } };

/* A stylesheet with every url(...) it names inlined as a data: URI, so the page needs no other file. */
export function inlineUrls(css, base) {
  return css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/g, (whole, _q, ref) => {
    if (/^(data:|https?:|#)/.test(ref)) return whole;
    const file = join(base, ref);
    if (!existsSync(file)) return whole;
    const type = ref.endsWith(".svg") ? "image/svg+xml" : ref.endsWith(".woff2") ? "font/woff2" : ref.endsWith(".png") ? "image/png" : "application/octet-stream";
    return `url("data:${type};base64,${readFileSync(file).toString("base64")}")`;
  });
}

/* The theme, its fonts and the SDK's widget styles, inlined. */
export function sdkStyles(theme = THEME) {
  const themeFile = require.resolve(`@ux-builder/tokens/themes/${theme}.css`);
  const fontsFile = require.resolve(`@ux-builder/tokens/fonts/${theme}.css`);
  const uiFile = require.resolve("@ux-builder/ui/ui.css");
  const themeCss = inlineUrls(readFileSync(themeFile, "utf8"), dirname(themeFile));
  const favicon = /--piq-brand-favicon:\s*url\("([^"]+)"\)/.exec(themeCss)?.[1] ?? null;
  return { css: [inlineUrls(readFileSync(fontsFile, "utf8"), dirname(fontsFile)), themeCss, readFileSync(uiFile, "utf8")].join("\n"), favicon };
}

/* The caption, as the player's pop-up and the MP4's picture show it: the
   problem in plain English, the rule it breaks (ID and full statement, or
   heuristic and source) and the fix (FEAT-015 RPT-07). Runs in Node and, by
   its source, in the page. */
export function captionMarkup(a) {
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const kind = a.kind === "judgment" ? "Judgment" : "Checked";
  const low = a.confidence === "low" ? '<span class="cap__low">worth checking with users</span>' : "";
  const r = a.rule;
  const rule = !r ? "" : r.id ? `<p class="cap__rule"><code class="cap__rid">${esc(r.id)}</code> ${esc(r.statement)}</p>` : `<p class="cap__rule"><strong>Heuristic:</strong> ${esc(r.heuristic)}${r.source ? ` (${esc(r.source)})` : ""}</p>`;
  return `<div class="piq-card cap cap--${a.kind === "judgment" ? "judgment" : "checked"}"><p class="cap__tag"><span class="cap__kind">${kind}</span><span class="cap__priority">${esc(a.priority)}</span>${low}<span class="cap__id">${esc(a.finding)}</span></p><p class="cap__problem">${esc(a.caption.problem)}</p>${rule}<p class="cap__rec"><strong>Fix:</strong> ${esc(a.caption.recommendation)}</p></div>`;
}

/* Where a caption of size (w, h) goes in a frame of size (fw, fh), beside
   the boxes (already scaled): below them if it fits, else above, else at
   the frame's foot; kept inside the frame. Runs in Node and in the page. */
export function place(boxes, fw, fh, w, h, gap = 12) {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  if (!boxes.length) return { left: clamp((fw - w) / 2, gap, Math.max(gap, fw - w - gap)), top: Math.max(gap, fh - h - gap) };
  const top = Math.min(...boxes.map((b) => b.y)), bottom = Math.max(...boxes.map((b) => b.y + b.height));
  const left = Math.min(...boxes.map((b) => b.x));
  const x = clamp(left, gap, Math.max(gap, fw - w - gap));
  if (bottom + gap + h <= fh - gap) return { left: x, top: bottom + gap };
  if (top - gap - h >= gap) return { left: x, top: top - gap - h };
  return { left: x, top: Math.max(gap, fh - h - gap) };
}

/* The caption's and outlines' styles: theme tokens only. */
export const CAPTION_CSS = `
.cap { margin: 0; max-width: 420px; padding: var(--piq-space-4, 16px); box-shadow: var(--piq-shadow-overlay, var(--piq-shadow-2, none)); }
.cap p { margin: 0; }
.cap__tag { display: flex; flex-wrap: wrap; gap: var(--piq-space-2, 8px); align-items: center; font: 500 var(--piq-font-size-caption, .8125rem)/1.3 var(--piq-font-body); color: var(--piq-color-text-muted); margin-bottom: var(--piq-space-2, 8px) !important; }
.cap__kind { font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--piq-color-text-strong); }
.cap--checked .cap__kind { color: var(--piq-color-accent); }
.cap__priority { font-weight: 600; color: var(--piq-color-text-strong); }
.cap__id { margin-left: auto; font-family: var(--piq-font-mono); }
.cap__problem { font: 500 var(--piq-font-size-body, 1rem)/1.45 var(--piq-font-body); color: var(--piq-color-text-strong); }
.cap__rule { margin-top: var(--piq-space-2, 8px) !important; padding-left: var(--piq-space-2, 8px); border-left: 3px solid var(--piq-color-border); font: 400 var(--piq-font-size-caption, .8125rem)/1.45 var(--piq-font-body); color: var(--piq-color-text-muted); }
.cap__rid { font-family: var(--piq-font-mono); color: var(--piq-color-text-strong); }
.cap__rec { margin-top: var(--piq-space-2, 8px) !important; font: 400 var(--piq-font-size-body, 1rem)/1.45 var(--piq-font-body); color: var(--piq-color-text); }
.outline { position: absolute; border: 3px solid var(--piq-color-accent); border-radius: var(--piq-radius-sm, 4px); box-sizing: border-box; }
.outline--judgment { border-style: dashed; }
`;

/* What the page needs, from the run package. */
export function playerData(dir) {
  const vdir = join(dir, "video");
  const record = maybe(join(vdir, "video.json")) ?? { videos: [], notRecorded: [] };
  const backlog = maybe(join(dir, "backlog.json"));
  const run = maybe(join(dir, "run.json"));
  const plan = maybe(join(dir, "plan.json"));
  const findings = backlog?.findings ?? [];
  const byId = new Map(findings.map((f) => [f.id, f]));
  const same = (f) => findings.filter((g) => g.id !== f.id && g.journey_id !== f.journey_id && (g.key ?? g.title) === (f.key ?? f.title)).map((g) => g.journey_id);
  const videos = record.videos.map((v) => {
    const tl = maybe(join(vdir, v.files.annotations)) ?? { annotations: [], chapters: v.chapters };
    const shown = new Set(tl.annotations.map((a) => a.finding));
    const stopped = tl.chapters.filter((c) => c.status === "stopped");
    const planJ = plan?.journeys?.find((j) => j.id === v.journey);
    return {
      name: v.files.clean.replace(/\.clean\.webm$/, ""), journey: v.journey, goal: planJ?.goal ?? null, viewport: v.viewport, src: v.files.clean, mp4: v.files.mp4 ?? null,
      chapters: tl.chapters, steps: tl.steps ?? [], annotations: tl.annotations,
      notShown: findings.filter((f) => f.journey_id === v.journey && !shown.has(f.id)).map((f) => ({ id: f.id, title: f.plain?.problem ?? f.title, priority: f.priority, reason: stopped.length ? `not reached: ${stopped.map((c) => `${c.title} stopped`).join("; ")}` : "its checkpoint was not on this replay's path" })),
    };
  });
  const detail = {};
  for (const v of videos) for (const a of v.annotations) {
    const f = byId.get(a.finding);
    if (!f || detail[f.id]) continue;
    detail[f.id] = { title: f.title, confidence: f.confidence ?? null, screenshot: `../checkpoints/${a.checkpoint}/screenshot.png`, hasScreenshot: existsSync(join(dir, "checkpoints", a.checkpoint, "screenshot.png")), alsoIn: [...new Set(same(f))] };
  }
  return { run: run?.id ?? dir.split(/[\\/]/).pop(), videos, detail, notRecorded: record.notRecorded ?? [] };
}

/* The page's own styles: layout, with theme tokens only. */
const PLAYER_CSS = `
body { margin: 0; background: var(--piq-color-ground); color: var(--piq-color-text); font: 400 var(--piq-font-size-body, 1rem)/1.5 var(--piq-font-body); }
.bar { display: flex; align-items: center; gap: var(--piq-space-4, 16px); padding: var(--piq-space-3, 12px) var(--piq-space-5, 24px); border-bottom: 1px solid var(--piq-color-border); background: var(--piq-color-surface); }
.bar h1 { margin: 0; font: 600 var(--piq-font-size-heading, 1.125rem)/1.3 var(--piq-font-heading); color: var(--piq-color-text-strong); }
.bar p { margin: 0; color: var(--piq-color-text-muted); font-size: var(--piq-font-size-caption, .8125rem); }
.layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: var(--piq-space-5, 24px); padding: var(--piq-space-5, 24px); max-width: 1680px; margin: 0 auto; }
@media (max-width: 960px) { .layout { grid-template-columns: minmax(0, 1fr); padding: var(--piq-space-4, 16px); } }
.pick { display: flex; flex-wrap: wrap; gap: var(--piq-space-4, 16px); align-items: end; margin-bottom: var(--piq-space-3, 12px); }
.pick__field { min-width: 240px; }
.frame { position: relative; width: 100%; background: var(--piq-color-surface-sunken); border: 1px solid var(--piq-color-border); border-radius: var(--piq-radius-md, 8px); overflow: hidden; }
.frame video { display: block; width: 100%; height: auto; }
.overlay { position: absolute; inset: 0; pointer-events: none; }
.stagebox { position: relative; }
.popup { position: absolute; z-index: 2; width: min(420px, calc(100% - 24px)); }
.popup--below { position: static; width: auto; margin-top: var(--piq-space-3, 12px); }
.popup[hidden] { display: none; }
.popup .cap { max-width: none; }
.popup__actions { display: flex; flex-wrap: wrap; gap: var(--piq-space-2, 8px); margin-top: var(--piq-space-3, 12px); }
.more { margin-top: var(--piq-space-3, 12px); padding-top: var(--piq-space-3, 12px); border-top: 1px solid var(--piq-color-border); font-size: var(--piq-font-size-caption, .8125rem); color: var(--piq-color-text-muted); }
.more img { display: block; max-width: 100%; border: 1px solid var(--piq-color-border); border-radius: var(--piq-radius-sm, 4px); margin-bottom: var(--piq-space-2, 8px); }
.more p { margin: 0 0 var(--piq-space-1, 4px); }
.controls { display: flex; flex-wrap: wrap; gap: var(--piq-space-2, 8px); align-items: center; margin-top: var(--piq-space-3, 12px); }
.controls .time { margin-left: auto; font-family: var(--piq-font-mono); color: var(--piq-color-text-muted); font-size: var(--piq-font-size-caption, .8125rem); }
.side h2 { margin: var(--piq-space-5, 24px) 0 var(--piq-space-2, 8px); font: 600 var(--piq-font-size-body, 1rem)/1.3 var(--piq-font-heading); color: var(--piq-color-text-strong); }
.side h2:first-child { margin-top: 0; }
.side ul { list-style: none; margin: 0; padding: 0; }
.side li { margin: 0 0 var(--piq-space-1, 4px); }
.seek { display: block; padding: var(--piq-space-2, 8px) var(--piq-space-3, 12px); min-height: var(--piq-size-target, 40px); box-sizing: border-box; border-radius: var(--piq-radius-sm, 4px); color: var(--piq-color-text); text-decoration: none; }
.seek:hover { background: var(--piq-color-surface-sunken); }
.seek:focus-visible { outline: var(--piq-focus-ring, 2px solid var(--piq-color-accent)); outline-offset: 2px; }
.seek--step { padding-left: var(--piq-space-6, 32px); font-size: var(--piq-font-size-caption, .8125rem); }
.seek[aria-current="true"] { box-shadow: inset 3px 0 0 var(--piq-color-accent); color: var(--piq-color-text-strong); }
.side .note { margin: 0 0 var(--piq-space-2, 8px); color: var(--piq-color-text-muted); font-size: var(--piq-font-size-caption, .8125rem); }
.side .filters { display: flex; gap: var(--piq-space-2, 8px); margin-bottom: var(--piq-space-2, 8px); }
.side .filters > div { flex: 1; min-width: 0; }
.empty { color: var(--piq-color-text-muted); }
${CAPTION_CSS}`;

/* The page's behaviour; data from the JSON block above it. */
function app() {
  const data = JSON.parse(document.getElementById("player-data").textContent);
  const $ = (s) => document.querySelector(s);
  const v = $("#video"), overlay = $("#overlay"), popup = $("#popup"), frame = $("#frame");
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  let cur = null, shown = null, pausedAt = null, more = false, autoPause = data.autoPause;
  const dismissed = new Set();
  const key = (a) => `${a.finding}@${a.start}`;
  const visible = () => cur.annotations.filter((a) => ($("#f-priority").value === "all" || a.priority === $("#f-priority").value) && ($("#f-kind").value === "all" || a.kind === $("#f-kind").value));

  function select(name, at) {
    cur = data.videos.find((x) => x.name === name) ?? data.videos[0];
    if (!cur) return;
    $("#journey").value = cur.name;
    dismissed.clear(); hide();
    v.src = cur.src;
    v.style.aspectRatio = `${cur.viewport.width} / ${cur.viewport.height}`;
    $("#goal").textContent = cur.goal ? `${cur.goal} · ${cur.journey} · ${cur.viewport.width}×${cur.viewport.height}` : `${cur.journey} · ${cur.viewport.width}×${cur.viewport.height}`;
    $("#mp4").hidden = !cur.mp4;
    if (cur.mp4) $("#mp4").setAttribute("href", cur.mp4);
    renderSide();
    if (at != null) v.addEventListener("loadedmetadata", () => { v.currentTime = at; }, { once: true });
  }
  function renderSide() {
    // A chapter per step ("J-review · step 2: entry"), under the path it is on (RPT-07).
    $("#chapters").innerHTML = cur.chapters.map((c) => {
      const steps = (cur.steps ?? []).filter((s) => s.chapter === c.id);
      const head = `<li><a class="seek" href="#${esc(cur.name)}@${c.start}" data-seek="${c.start}">${mmss(c.start)} · ${c.kind === "title" ? "Title card" : esc(c.title)}${c.status === "stopped" ? " (stopped)" : ""}</a>${c.status === "stopped" ? `<p class="note">${esc(c.reason)}</p>` : ""}</li>`;
      return head + steps.map((s) => `<li class="step"><a class="seek seek--step" href="#${esc(cur.name)}@${s.start}" data-seek="${s.start}">${mmss(s.start)} · ${esc(s.title)}</a></li>`).join("");
    }).join("");
    const list = visible();
    $("#findings").innerHTML = list.length ? list.map((a) => `<li><a class="seek" href="#${esc(cur.name)}@${a.start}" data-finding="${esc(key(a))}" aria-current="${Boolean(shown && key(shown) === key(a))}">${mmss(a.start)} · ${esc(a.priority)} · ${a.kind === "judgment" ? "Judgment" : "Checked"} · ${esc(a.caption.problem)}</a></li>`).join("") : `<li class="empty">No findings match.</li>`;
    $("#not-shown").innerHTML = cur.notShown.length ? cur.notShown.map((n) => `<li class="note">${esc(n.priority)} · ${esc(n.title)} (${esc(n.id)}): ${esc(n.reason)}</li>`).join("") : `<li class="empty">None.</li>`;
  }
  function scale() { return v.clientWidth / cur.viewport.width; }
  function show(a) {
    shown = a;
    const s = scale();
    const boxes = a.boxes.map((b) => ({ x: b.x * s, y: b.y * s, width: b.width * s, height: b.height * s }));
    overlay.innerHTML = boxes.map((b) => `<div class="outline outline--${a.kind}" style="left:${b.x - 4}px;top:${b.y - 4}px;width:${b.width + 8}px;height:${b.height + 8}px"></div>`).join("");
    const d = data.detail[a.finding] ?? {};
    popup.innerHTML = `${captionMarkup(a)}<div class="popup__actions"><button type="button" class="piq-btn piq-btn--secondary piq-btn--sm" id="more" aria-expanded="${more}" aria-controls="more-panel">More</button><a class="piq-btn piq-btn--text piq-btn--sm" href="../report.html#${esc(a.finding)}">Open in report</a><button type="button" class="piq-btn piq-btn--sm" id="dismiss">${v.paused && pausedAt === a ? "Continue" : "Dismiss"}</button></div><div class="more" id="more-panel" ${more ? "" : "hidden"}>${d.hasScreenshot ? `<img src="${esc(d.screenshot)}" alt="The screen at checkpoint ${esc(a.checkpoint)}, as inspected">` : ""}<p>Finding: ${esc(d.title ?? a.finding)}</p><p>Confidence: ${esc(d.confidence?.level ?? a.confidence ?? "not stated")}${d.confidence?.reason ? `: ${esc(d.confidence.reason)}` : ""}</p><p>${d.alsoIn?.length ? `Also in: ${d.alsoIn.map(esc).join(", ")}` : "Seen in this journey only."}</p></div>`;
    popup.hidden = false;
    position(boxes);
    const rule = !a.rule ? "" : a.rule.id ? ` Rule ${a.rule.id}: ${a.rule.statement}` : ` Heuristic: ${a.rule.heuristic}.`;
    $("#announce").textContent = `${a.kind === "judgment" ? "Judgment" : "Checked"}, ${a.priority}: ${a.caption.problem}${rule} Fix: ${a.caption.recommendation}`;
    renderSide();
  }
  // Over the video beside its outlines; under the video when the frame is too narrow for both.
  let lastBoxes = [];
  function position(boxes = lastBoxes) {
    lastBoxes = boxes;
    const below = frame.clientWidth < 640;
    popup.classList.toggle("popup--below", below);
    if (below) { popup.style.left = popup.style.top = ""; return; }
    const box = popup.getBoundingClientRect();
    const at = place(boxes, frame.clientWidth, frame.clientHeight, box.width, box.height);
    popup.style.left = `${at.left + frame.clientLeft}px`; popup.style.top = `${at.top + frame.clientTop}px`;
  }
  function hide() { if (!shown) return; shown = null; pausedAt = null; more = false; overlay.innerHTML = ""; popup.hidden = true; popup.innerHTML = ""; renderSide(); }
  function dismiss() { if (!shown) return; dismissed.add(key(shown)); const was = pausedAt; hide(); if (was) v.play(); }
  function seekTo(a) { dismissed.delete(key(a)); v.pause(); v.currentTime = a.start + 0.01; pausedAt = a; show(a); popup.querySelector("#dismiss")?.focus(); }
  function step(dir) {
    const list = visible(); if (!list.length) return;
    const t = v.currentTime;
    const next = dir > 0 ? list.find((a) => a.start > t + 0.05) ?? list[0] : [...list].reverse().find((a) => a.start < t - 0.3) ?? list[list.length - 1];
    seekTo(next);
  }
  function tick() {
    if (cur) {
      const t = v.currentTime;
      const a = visible().find((x) => x.start <= t + 0.04 && t < x.end);
      if (a && a !== shown) { if (!dismissed.has(key(a))) show(a); }
      if (a && autoPause && !v.paused && !dismissed.has(key(a)) && pausedAt !== a) { v.pause(); pausedAt = a; show(a); }
      if (!a && shown && !(v.paused && pausedAt === shown)) hide();
      $("#time").textContent = `${mmss(t)} / ${mmss(v.duration || 0)}`;
      $("#play").textContent = v.paused ? "Play" : "Pause";
    }
    requestAnimationFrame(tick);
  }
  $("#journey").innerHTML = data.videos.map((x) => `<option value="${esc(x.name)}">${esc(x.journey)} · ${x.viewport.width}×${x.viewport.height}</option>`).join("");
  $("#journey").addEventListener("change", (e) => select(e.target.value));
  for (const id of ["#f-priority", "#f-kind"]) $(id).addEventListener("change", () => { if (shown && !visible().includes(shown)) hide(); renderSide(); });
  $("#auto").setAttribute("aria-pressed", String(autoPause));
  $("#auto").addEventListener("click", () => { autoPause = !autoPause; $("#auto").setAttribute("aria-pressed", String(autoPause)); $("#auto").textContent = autoPause ? "Pause at findings: on" : "Pause at findings: off"; });
  $("#auto").textContent = autoPause ? "Pause at findings: on" : "Pause at findings: off";
  $("#play").addEventListener("click", () => { if (v.paused) { if (pausedAt) { dismissed.add(key(pausedAt)); hide(); } v.play(); } else v.pause(); });
  $("#prev").addEventListener("click", () => step(-1));
  $("#next").addEventListener("click", () => step(1));
  document.addEventListener("click", (e) => {
    const s = e.target.closest("[data-seek]"); if (s) { e.preventDefault(); history.replaceState(null, "", s.getAttribute("href")); hide(); v.currentTime = Number(s.dataset.seek) + 0.01; return; }
    const f = e.target.closest("[data-finding]"); if (f) { e.preventDefault(); history.replaceState(null, "", f.getAttribute("href")); const a = cur.annotations.find((x) => key(x) === f.dataset.finding); if (a) seekTo(a); return; }
    if (e.target.closest("#dismiss")) { dismiss(); return; }
    if (e.target.closest("#more")) { more = !more; const p = $("#more-panel"); p.hidden = !more; e.target.closest("#more").setAttribute("aria-expanded", String(more)); position(); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.target.closest("select, input, textarea")) return;
    const onButton = e.target.closest("button, a");
    if (e.key === "n") step(1);
    else if (e.key === "p") step(-1);
    else if (e.key === "Escape") dismiss();
    else if (e.key === "m" && shown) $("#more")?.click();
    else if ((e.key === "k" || (e.key === " " && !onButton))) { e.preventDefault(); $("#play").click(); }
  });
  window.addEventListener("resize", () => { if (shown) show(shown); });
  if (!data.videos.length) { $("#stage").innerHTML = `<div class="piq-notice piq-notice--warning"><p class="piq-notice__body">No journey was recorded.</p></div>`; return; }
  const m = /^#(.+?)(?:@(\d+(?:\.\d+)?))?$/.exec(decodeURIComponent(location.hash));
  select(m && data.videos.some((x) => x.name === m[1]) ? m[1] : data.videos[0].name, m?.[2] != null ? Number(m[2]) : null);
  window.__player = { data, get shown() { return shown; }, get current() { return cur; }, video: v, select, seekTo };
  requestAnimationFrame(tick);
}

/* Write video/index.html for the run. Returns its path. */
export function writePlayer(dir, { autoPause = true, appName = null } = {}) {
  const data = { ...playerData(dir), autoPause, app: appName };
  const { css, favicon } = sdkStyles();
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  const notRecorded = data.notRecorded.length ? `<div class="piq-notice piq-notice--warning" style="margin-top:var(--piq-space-4, 16px)"><p class="piq-notice__title">Not recorded</p><ul class="piq-notice__body">${data.notRecorded.map((n) => `<li>${esc(n.journey)}${n.viewport ? ` (${n.viewport.width}×${n.viewport.height})` : ""}: ${esc(n.reason)}</li>`).join("")}</ul></div>` : "";
  const html = `<!doctype html>
<html lang="en" data-theme="${THEME}" data-appearance="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Walkthrough videos${data.app ? ` · ${esc(data.app)}` : ""} · ${esc(data.run)}</title>
${favicon ? `<link rel="icon" data-piq-favicon href="${favicon}">` : ""}
<script>try { if (matchMedia("(prefers-color-scheme: dark)").matches) document.documentElement.dataset.appearance = "dark"; } catch {}
// Answers the SDK's theme switch, as an app's ThemeProvider does (CONTRACT-003), so the audit can switch it.
addEventListener("piq:set-theme", (e) => { const d = e.detail || {}; if (d.theme) document.documentElement.dataset.theme = d.theme; if (d.appearance) document.documentElement.dataset.appearance = d.appearance; });</script>
<!-- ux-builder-audit assess video: FEAT-013. Fonts: DM Sans and DM Mono, SIL Open Font License 1.1 (@ux-builder/tokens). -->
<style>${css}\n${PLAYER_CSS}</style>
</head>
<body>
<header class="bar"><span class="piq-logo piq-logo--logo" role="img" aria-label="ux-builder" data-logo="artwork"></span><div><h1>Walkthrough videos${data.app ? ` · ${esc(data.app)}` : ""}</h1><p>Run ${esc(data.run)}. Each finding pauses the video; its details are in the report.</p></div></header>
<main class="layout">
<section id="stage" aria-label="Video">
<div class="pick"><div class="pick__field"><div class="piq-field"><label class="piq-field__label" for="journey">Journey</label><span class="piq-select"><select class="piq-field__input piq-select__input" id="journey"></select></span></div></div><p id="goal" class="note"></p></div>
<div class="stagebox"><div class="frame" id="frame"><video id="video" preload="metadata" playsinline aria-describedby="goal"></video><div class="overlay" id="overlay" aria-hidden="true"></div></div><div class="popup" id="popup" role="group" aria-label="Finding" hidden></div></div>
<div class="controls"><button type="button" class="piq-btn piq-btn--secondary" id="prev" aria-keyshortcuts="p">Previous finding</button><button type="button" class="piq-btn" id="play" aria-keyshortcuts="k">Play</button><button type="button" class="piq-btn piq-btn--secondary" id="next" aria-keyshortcuts="n">Next finding</button><button type="button" class="piq-btn piq-btn--text" id="auto" aria-pressed="true">Pause at findings: on</button><a class="piq-btn piq-btn--text" id="mp4" href="#" download hidden>Download MP4</a><span class="time" id="time">0:00</span></div>
<p class="piq-visually-hidden" id="announce" aria-live="polite"></p>
${notRecorded}
</section>
<aside class="side" aria-label="Chapters and findings">
<h2>Chapters</h2><ul id="chapters"></ul>
<h2>Findings</h2>
<div class="filters"><div><div class="piq-field"><label class="piq-field__label" for="f-priority">Priority</label><span class="piq-select"><select class="piq-field__input piq-select__input" id="f-priority"><option value="all">All</option><option>P0</option><option>P1</option><option>P2</option><option>P3</option></select></span></div></div><div><div class="piq-field"><label class="piq-field__label" for="f-kind">Kind</label><span class="piq-select"><select class="piq-field__input piq-select__input" id="f-kind"><option value="all">All</option><option value="checked">Checked</option><option value="judgment">Judgment</option></select></span></div></div></div>
<ul id="findings"></ul>
<h2>Not shown</h2><ul id="not-shown"></ul>
</aside>
</main>
<script type="application/json" id="player-data">${json}</script>
<script>
${captionMarkup.toString()}
${place.toString()}
(${app.toString()})();
</script>
</body>
</html>
`;
  const file = join(dir, "video", "index.html");
  writeFileSync(file, html);
  return file;
}
