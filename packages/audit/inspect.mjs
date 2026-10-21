/* inspect(): the audit's checks on a Playwright page as it is (FEAT-009
   INS-01, INS-02, INS-05; CONTRACT-006).

     import { inspect } from "@ux-builder/audit";
     const { findings } = await inspect(page);

   It never navigates, reloads, resets a form, switches theme or ends the
   session: it checks the state the page is in, for the theme and appearance
   showing. audit() (the URL audit) opens pages, switches them through each
   theme, appearance and width, and calls this for each, so a check behaves
   the same in both.

   Two checks change the page and are skipped unless asked for
   (stateAffecting): focus-obscured (moves focus, may scroll; both are put
   back) and modal-escape (presses Escape in each open modal; a dialog it
   closes cannot be reopened from outside, so it is reported). The in-page
   checks add and remove probe elements within one evaluation, and contrast
   adds axe's script once. */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { collect, installAppOwned } from "./collect.js";

const own = createRequire(import.meta.url);
export const STATE_AFFECTING = ["focus-obscured", "modal-escape"];
// Checks added in 0.2: warnings for one minor release before they can fail a build (CONTRACT-004).
export const NEW_CHECKS = new Set(["reflow", "target-size", "focus-obscured", "one-modal", "modal-contract", "one-primary-action", "nav-per-breakpoint", "line-length"]);
// The AI checks (FEAT-011), added in 0.2: warnings for their first minor release too.
export const AI_CHECKS = ["ai-disclose", "ai-stop", "ai-correct", "ai-starters", "ai-declared", "agent-approval", "agent-plan", "agent-interrupt", "agent-who-acts", "agent-recover", "agent-summary", "genui-review-prefill", "card-input-label", "card-narrow-first"];
for (const c of AI_CHECKS) NEW_CHECKS.add(c);

/* Each finding with the rule it enforces and that rule's sources (FEAT-008
   AUD-02), and a new check's severity held at warning. */
export function enrich(findings, interaction) {
  const byCheck = new Map();
  for (const r of interaction?.rules ?? []) for (const c of r.checks) if (c.kind === "audit") (byCheck.get(c.id) ?? byCheck.set(c.id, []).get(c.id)).push(r);
  for (const f of findings) {
    const rule = (byCheck.get(f.rule) ?? []).find((r) => r.id === f.ruleId) ?? (byCheck.get(f.rule) ?? [])[0];
    if (rule) { f.ruleId = rule.id; f.sources = rule.sources.map(({ title, url }) => ({ title, url })); }
    if (NEW_CHECKS.has(f.rule)) f.severity = "warning";
  }
  return findings;
}

/* @ux-builder/ui and @ux-builder/tokens as the app has them, else this package's. */
export function sdkFiles(cwd) {
  const from = [createRequire(join(cwd, "package.json")), own];
  const find = (spec) => { for (const r of from) { try { return r.resolve(spec); } catch { /* next */ } } throw new Error(`cannot find ${spec}`); };
  const fontsCss = readFileSync(find("@ux-builder/tokens/fonts.css"), "utf8");
  const bundledFamilies = [...new Set([...fontsCss.matchAll(/@font-face\s*{[^}]*font-family:\s*["']?([^"';]+)/g)].map((m) => m[1].trim()))];
  // The patterns' CSS is the SDK's too; an older @ux-builder/ui has none.
  let patternsCss = "";
  try { patternsCss = readFileSync(find("@ux-builder/ui/patterns.css"), "utf8"); } catch { /* before patterns */ }
  // The interaction rules the checks enforce (FEAT-008); this package's copy for an older @ux-builder/ui.
  let interaction = null;
  for (const r of from) { try { interaction = JSON.parse(readFileSync(r.resolve("@ux-builder/ui/catalogue.json"), "utf8")).interaction ?? null; } catch { /* next */ } if (interaction) break; }
  return { uiCss: readFileSync(find("@ux-builder/ui/ui.css"), "utf8") + "\n" + patternsCss, manifest: JSON.parse(readFileSync(find("@ux-builder/tokens/manifest.json"), "utf8")), bundledFamilies, interaction };
}

export const settle = (page) => page.evaluate(async () => {
  await document.fonts.ready;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
});

/* The SDK's own selectors, normalised by the browser as the page's are, so
   collect can tell the SDK's rules from the app's. A constructed sheet, never
   adopted: the page's styles are untouched. */
export const sdkRulesIn = (page, uiCss) => page.evaluate((css) => {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  const out = [];
  const walk = (rules) => { for (const r of rules) { if (r.selectorText) out.push([r.selectorText.replace(/\s+/g, " ").trim(), [...r.style].map((p) => [p, r.style.getPropertyValue(p)])]); if (r.cssRules) walk(r.cssRules); } };
  walk(sheet.cssRules);
  return out;
}, uiCss);

/* Everything inspect() needs from the SDK, read once: the app's installed
   @ux-builder/ui and @ux-builder/tokens (else this package's), the
   interaction limits, and axe. */
export function prepare(cwd = process.cwd(), { contrast = true } = {}) {
  const files = sdkFiles(cwd);
  return { ...files, limits: files.interaction?.limits ?? { compactDestinations: 5, lineLength: 80 }, axeSource: contrast !== false ? readFileSync(own.resolve("axe-core/axe.min.js"), "utf8") : null };
}

/* The size-class checks, run in the page at the current width (SDK-20):
   sideways scroll, small pointer targets, and focused controls hidden by
   sticky or fixed content. Each finding gets the preview it is in, if any. */
export function layoutChecks({ ignore, rules, limit = 150, sizes = true, focus = false }) {
  const skip = (e) => e.closest(["[data-audit-ignore]", "#__piq_audit_overlay", ...ignore].join(", "));
  const path = (e) => { const out = []; for (let n = e; n && n.nodeType === 1 && out.length < 4; n = n.parentElement) { out.unshift(n.id ? `#${CSS.escape(n.id)}` : n.tagName.toLowerCase() + (n.classList.length ? `.${[...n.classList].map((c) => CSS.escape(c)).join(".")}` : "")); if (n.id) break; } return out.join(" > "); };
  const preview = (e) => e.closest("[data-preview]")?.dataset.preview ?? null;
  const findings = [];
  const width = innerWidth;
  if (sizes && rules.reflow !== false) {
    const sw = document.scrollingElement.scrollWidth, cw = document.documentElement.clientWidth;
    if (sw > cw + 1) {
      // The element reaching furthest past the edge, outside any region that scrolls by itself.
      const inScroller = (e) => { for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(n).overflowX)) return true; return false; };
      let widest = null, right = cw;
      for (const e of document.body.querySelectorAll("*")) { if (skip(e) || inScroller(e)) continue; const r = e.getBoundingClientRect().right + scrollX; if (r > right + 0.5) { right = r; widest = e; } }
      findings.push({ rule: "reflow", severity: "warning", selector: widest ? path(widest) : null, message: `the page scrolls sideways at ${width}px (content ${sw}px wide${widest ? `; widest: ${path(widest)}` : ""})`, property: "width", value: `${sw}px` });
    }
  }
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;visibility:hidden;inline-size:var(--piq-size-target-minimum, 24px)";
  (document.querySelector("[data-theme]") ?? document.body).append(probe);
  const minimum = Math.max(24, Math.round(probe.getBoundingClientRect().width) || 24);
  probe.remove();
  const controls = [...document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"], [role="option"], [role="menuitem"], [tabindex]:not([tabindex="-1"])')]
    .filter((e) => !skip(e) && !e.disabled && e.getClientRects().length && getComputedStyle(e).visibility !== "hidden" && !e.closest("[inert], dialog:not([open]), [hidden]"));
  if (sizes && rules["target-size"] !== false) {
    for (const e of controls) {
      // A checkbox or radio inside its label is as big as the label (the label activates it).
      const t = (e.matches('input[type="checkbox"], input[type="radio"]') && e.closest("label")) || e;
      const r = t.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue; // visually hidden
      // Inline links in a sentence are exempt (WCAG 2.5.8, inline).
      if (t.tagName === "A" && [...t.parentElement.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      if (r.width + 0.5 < minimum || r.height + 0.5 < minimum) findings.push({ rule: "target-size", severity: "warning", selector: path(e), message: `a ${Math.round(r.width)}×${Math.round(r.height)}px target, under the ${minimum}px minimum`, property: "size", value: `${Math.round(r.width)}x${Math.round(r.height)}`, preview: preview(e), box: { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height } });
    }
  }
  if (focus && rules["focus-obscured"] !== false) {
    // Moves focus and may scroll: a state-affecting check (FEAT-009 INS-05), so both are put back.
    const before = document.activeElement, sx = scrollX, sy = scrollY;
    for (const e of controls.slice(0, limit)) {
      e.focus({ preventScroll: false });
      if (document.activeElement !== e) continue;
      const r = e.getBoundingClientRect();
      const points = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 2, r.top + 2], [r.right - 2, r.top + 2], [r.left + 2, r.bottom - 2], [r.right - 2, r.bottom - 2]].filter(([x, y]) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight);
      const covers = points.map(([x, y]) => document.elementFromPoint(x, y)).filter((t) => t && t !== e && !e.contains(t) && !t.contains(e));
      const sticky = covers.filter((t) => { for (let n = t; n; n = n.parentElement) { const p = getComputedStyle(n).position; if (p === "sticky" || p === "fixed") return true; } return false; });
      if (points.length && sticky.length === points.length) findings.push({ rule: "focus-obscured", severity: "warning", selector: path(e), message: `focused, it is hidden behind ${path(sticky[0])}`, preview: preview(e), box: { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height } });
    }
    before?.focus?.({ preventScroll: true });
    scrollTo(sx, sy);
  }
  return findings;
}

/* The interaction and IA checks, run in the page (FEAT-008 AUD-01; rules in
   @ux-builder/ui's catalogue). Each finding names the rule it enforces. */
export function interactionChecks({ ignore, rules, limits, widths }) {
  const skip = (e) => e.closest(["[data-audit-ignore]", "#__piq_audit_overlay", ...ignore].join(", "));
  const path = (e) => { const out = []; for (let n = e; n && n.nodeType === 1 && out.length < 4; n = n.parentElement) { out.unshift(n.id ? `#${CSS.escape(n.id)}` : n.tagName.toLowerCase() + (n.classList.length ? `.${[...n.classList].map((c) => CSS.escape(c)).join(".")}` : "")); if (n.id) break; } return out.join(" > "); };
  const visible = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden" && !e.closest("[hidden], [inert]");
  const box = (e) => { const r = e.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }; };
  const text = (e) => (e?.textContent ?? "").replace(/\s+/g, " ").trim();
  const findings = [];
  const add = (rule, e, message, extra = {}) => findings.push({ rule, severity: "warning", selector: e ? path(e) : null, message, box: e ? box(e) : undefined, ...extra });

  const modals = [...document.querySelectorAll("dialog[open], [role=dialog][aria-modal=true], [role=alertdialog]")]
    .filter((e) => !skip(e) && visible(e) && (e.tagName !== "DIALOG" || e.matches(":modal") || e.getAttribute("aria-modal") === "true"));
  const nameOf = (m) => m.getAttribute("aria-label")?.trim() || (m.getAttribute("aria-labelledby") ?? "").split(/\s+/).map((id) => text(document.getElementById(id))).join(" ").trim() || text(m.querySelector("h1, h2, h3, h4, h5, h6, [role=heading]"));
  if (rules["one-modal"] !== false && modals.length > 1) {
    add("one-modal", modals[1], `${modals.length} modal dialogs are open at once: ${modals.map((m) => `"${nameOf(m) || path(m)}"`).join(", ")}`, { ruleId: "modal.one-at-a-time" });
  }
  if (rules["modal-contract"] !== false) for (const m of modals) {
    const name = nameOf(m);
    if (!name) add("modal-contract", m, "an open modal has no accessible name (aria-label, aria-labelledby or a heading)", { ruleId: "modal.titled", property: "name" });
    const controls = [...m.querySelectorAll("button, [role=button], a[href], input[type=button], input[type=submit]")].filter(visible);
    const label = (c) => `${c.getAttribute("aria-label") ?? ""} ${c.getAttribute("title") ?? ""} ${c.value ?? ""} ${text(c)}`.toLowerCase();
    const dismiss = m.querySelector("form[method=dialog]") || controls.some((c) => /\b(close|cancel|done|dismiss)\b/.test(label(c)));
    if (!dismiss) add("modal-contract", m, `the modal${name ? ` "${name}"` : ""} has no dismiss control (a Close, Cancel or Done button)`, { ruleId: "modal.dismiss", property: "dismiss" });
  }
  if (rules["one-primary-action"] !== false) {
    const isPrimary = (b) => b.classList.contains("piq-btn") && ![...b.classList].some((c) => /^piq-btn--(secondary|text|ghost|tertiary|link|danger)$/.test(c));
    const regions = modals.length ? modals : [document.querySelector("main") ?? document.body];
    for (const region of regions) {
      const primary = [...region.querySelectorAll(".piq-btn")].filter((b) => isPrimary(b) && visible(b) && !skip(b) && (region === modals.find((m) => m.contains(b)) || !modals.some((m) => m.contains(b))));
      if (primary.length > 1) add("one-primary-action", primary[1], `${primary.length} primary buttons in one ${modals.includes(region) ? "dialog" : "page region"}: ${primary.map((b) => `"${text(b)}"`).join(", ")}`, { ruleId: "emphasis.one-primary", value: String(primary.length) });
    }
  }
  if (rules["nav-per-breakpoint"] !== false && widths) {
    const width = innerWidth;
    const breadcrumb = (n) => /breadcrumb/i.test(`${n.className} ${n.getAttribute("aria-label") ?? ""}`) || n.querySelector("[class*=breadcrumb]");
    const navs = [...document.querySelectorAll("nav, [role=navigation]")].filter((n) => !skip(n) && !n.closest("main") && !breadcrumb(n) && !n.closest("dialog:not([open])"));
    const items = (n) => { const list = n.querySelector("ul, ol"); return list ? [...list.children].filter((li) => li.tagName === "LI" && visible(li)) : [...n.querySelectorAll("a[href], button")].filter(visible); };
    if (width < 600) for (const n of navs.filter(visible)) {
      const k = items(n).length;
      if (k > limits.compactDestinations) add("nav-per-breakpoint", n, `${k} top-level destinations shown at ${width}px; at the compact size class show ${limits.compactDestinations} or fewer (AppShell puts the rest behind "More")`, { ruleId: "nav.compact-destinations", value: String(k) });
    }
    if (width >= 840 && !navs.some((n) => visible(n) && items(n).length >= 2)) {
      const hidden = navs.filter((n) => !visible(n) || n.closest("dialog:not([open])"));
      const opener = [...document.querySelectorAll("[aria-haspopup]")].find((b) => visible(b) && !skip(b) && (hidden.some((n) => b.getAttribute("aria-controls") && n.closest(`#${CSS.escape(b.getAttribute("aria-controls"))}`)) || /\b(menu|navigation|nav)\b/i.test(`${b.getAttribute("aria-label") ?? ""} ${text(b)}`)));
      if (opener && (hidden.length || opener.getAttribute("aria-controls"))) add("nav-per-breakpoint", opener, `at ${width}px the navigation is behind a menu button; from the expanded size class show it as a rail or side navigation`, { ruleId: "nav.standing-at-expanded" });
    }
  }
  if (rules["line-length"] !== false) {
    for (const e of document.querySelectorAll("p, li")) {
      if (skip(e) || !visible(e) || e.closest("nav, pre, code, table, [role=navigation]")) continue;
      const t = text(e);
      if (t.length < limits.lineLength * 2) continue;
      const cs = getComputedStyle(e);
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
      const inner = e.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const lines = Math.round(inner / lh);
      if (lines < 2) continue;
      const cpl = Math.round(t.length / lines);
      if (cpl > limits.lineLength) add("line-length", e, `lines run to about ${cpl} characters; keep prose to ${limits.lineLength} or fewer (limit the measure, for example with max-inline-size: 70ch)`, { ruleId: "text.line-length", property: "characters-per-line", value: String(cpl) });
    }
  }
  return findings;
}

/* The AI checks (FEAT-011 AIA-01, AIA-02; US-078 to US-080; SD-005),
   run in the page. They look only at elements CONTRACT-005 *AI markup*
   marks (data-piq-ai and its companions): a page with no markers gets no
   AI finding. `screens` is the blueprint's screens by id, { id: ai | null },
   or null without --blueprint; a marked element belongs to the screen its
   nearest data-piq-screen names. Every finding names its SD-005 rule. */
export function aiChecks({ ignore, rules, screens = null, sizes = false }) {
  const findings = [];
  if (!document.querySelector("[data-piq-ai], [data-piq-ai-actor], [data-piq-ai-takeover]")) return findings;
  const skip = (e) => e.closest(["[data-audit-ignore]", "#__piq_audit_overlay", ...ignore].join(", "));
  const path = (e) => { const out = []; for (let n = e; n && n.nodeType === 1 && out.length < 4; n = n.parentElement) { out.unshift(n.id ? `#${CSS.escape(n.id)}` : n.tagName.toLowerCase() + (n.classList.length ? `.${[...n.classList].map((c) => CSS.escape(c)).join(".")}` : "")); if (n.id) break; } return out.join(" > "); };
  const visible = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden" && !e.closest("[hidden], [inert], dialog:not([open])");
  const box = (e) => { const r = e.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }; };
  const text = (e) => (e?.textContent ?? "").replace(/\s+/g, " ").trim();
  const on = (check) => rules[check] !== false;
  const add = (rule, ruleId, e, message, extra = {}) => findings.push({ rule, ruleId, severity: "warning", selector: e ? path(e) : null, message, box: e ? box(e) : undefined, ...extra });
  const marked = (kind) => [...document.querySelectorAll(`[data-piq-ai="${kind}"]`)].filter((e) => !skip(e));
  const byIds = (e, attr) => (e.getAttribute(attr) ?? "").split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)).filter(Boolean);
  const CONTROL = 'button, a[href], input[type=button], input[type=submit], input[type=reset], [role=button], [role=menuitem], [data-piq-ai-control]';
  const nameOf = (c) => (c.getAttribute("aria-label")?.trim() || byIds(c, "aria-labelledby").map(text).join(" ").trim() || text(c) || c.value || c.getAttribute("title") || "").trim();
  const enabled = (c) => !c.disabled && c.getAttribute("aria-disabled") !== "true";
  const reachable = (c) => visible(c) && enabled(c) && c.getAttribute("tabindex") !== "-1";
  const controlsIn = (scope) => [...scope.querySelectorAll(CONTROL)].filter((c) => !skip(c));
  // "In or beside": inside the element, or inside its parent (its siblings and theirs).
  const near = (e) => [...new Set([...controlsIn(e), ...(e.parentElement && e.parentElement !== document.body ? controlsIn(e.parentElement) : [])])];
  const kind = (c, kinds, names) => kinds.includes(c.getAttribute("data-piq-ai-control")) || (names && names.test(nameOf(c)));
  const outermost = (e) => !e.parentElement?.closest('[data-piq-ai="generated"]');

  // ai-disclose and ai-correct: on the outermost generated content (inner content shares its label and controls).
  const generated = marked("generated");
  for (const g of generated.filter(outermost)) {
    if (on("ai-disclose")) {
      const label = (l) => visible(l) && (text(l) || l.getAttribute("data-piq-ai-label")?.trim() || l.getAttribute("aria-label")?.trim());
      const own = g.closest("[data-piq-ai-label]") ?? [...g.querySelectorAll("[data-piq-ai-label]")].find(label);
      const described = byIds(g, "aria-describedby").some((d) => visible(d) && text(d));
      if (!(own && label(own)) && !described) add("ai-disclose", "ai.disclose", g, "AI-generated content with no visible disclosure: label it, or an ancestor (data-piq-ai-label), or point aria-describedby at a visible label");
    }
    if (on("ai-correct")) {
      const ref = g.id ? [...document.querySelectorAll(`[aria-controls~="${CSS.escape(g.id)}"]`)] : [];
      const ok = [...near(g), ...ref].some((c) => enabled(c) && kind(c, ["retry", "regenerate", "edit", "undo"], /\b(retry|try again|regenerate|edit|undo)\b/i));
      if (!ok) add("ai-correct", "ai.correct", g, "AI-generated content with no way to correct it: add a retry, regenerate, edit or undo control (data-piq-ai-control) in or beside it");
    }
  }

  // ai-stop and agent-interrupt: a busy status region.
  const STOP = /\b(stop|pause)\b/i;
  const statuses = marked("status");
  const busy = statuses.filter((s) => s.getAttribute("aria-busy") === "true");
  if (on("ai-stop")) for (const s of busy) {
    if (!near(s).some((c) => reachable(c) && STOP.test(nameOf(c)))) add("ai-stop", "ai.stop", s, "the AI is working (aria-busy) and no reachable control named Stop or Pause is in or beside its status region");
  }
  const screenOf = (e) => e.closest("[data-piq-screen]")?.getAttribute("data-piq-screen") ?? null;
  const aiOf = (e) => (screens && screenOf(e) ? screens[screenOf(e)] ?? null : null);
  const agentPage = !!document.querySelector('[data-piq-ai="plan"], [data-piq-ai="step"], [data-piq-ai="approval"], [data-piq-ai-actor], [data-piq-ai-takeover]');
  if (on("agent-interrupt")) for (const s of busy) {
    if (!agentPage && !aiOf(s)?.roles?.includes("agent")) continue;
    if (!controlsIn(document.body).some((c) => reachable(c) && STOP.test(nameOf(c)))) add("agent-interrupt", "agent.interrupt", s, "the agent is running and the page has no reachable Pause or Stop control");
  }

  // agent-approval: approve and deny, neither chosen for the user.
  if (on("agent-approval")) for (const a of marked("approval")) {
    const cs = controlsIn(a).concat([...a.querySelectorAll("input[data-piq-ai-control], option[data-piq-ai-control]")]);
    const approve = cs.filter((c) => c.getAttribute("data-piq-ai-control") === "approve"), deny = cs.filter((c) => c.getAttribute("data-piq-ai-control") === "deny");
    const missing = [!approve.some((c) => visible(c) && enabled(c)) && "approve", !deny.some((c) => visible(c) && enabled(c)) && "deny"].filter(Boolean);
    if (missing.length) add("agent-approval", "agent.approve-high-impact", a, `the approval has no ${missing.join(" or ")} control (data-piq-ai-control="${missing.join('", "')}")`, { property: "controls" });
    const chosen = [...approve, ...deny].filter((c) => c.checked || c.selected && c.hasAttribute("selected") || ["aria-pressed", "aria-checked", "aria-selected"].some((x) => c.getAttribute(x) === "true") || c.hasAttribute("autofocus"));
    if (chosen.length) add("agent-approval", "agent.approve-high-impact", chosen[0], `the approval's ${chosen[0].getAttribute("data-piq-ai-control")} control is chosen for the user (pre-selected, or focused on load with autofocus); leave the choice to them`, { property: "default" });
  }

  // agent-plan and agent-recover: each step states its status in text; a failed step says why and offers a way back.
  const WORDS = { pending: /\b(pending|waiting|queued|to do|not started|next|up next)\b/i, running: /\b(running|in progress|working|underway|doing)\b/i, done: /\b(done|complete|completed|finished|succeeded)\b/i, failed: /\b(failed|error|could not|couldn't|did not|unable)\b/i, skipped: /\b(skipped)\b/i };
  const ANY = /\b(pending|waiting|queued|to do|not started|up next|next|running|in progress|working|underway|doing|done|complete|completed|finished|succeeded|failed|error|skipped)\b/gi;
  const stepText = (s) => `${s.getAttribute("aria-label") ?? ""} ${text(s)} ${[...s.querySelectorAll("[aria-label]")].map((x) => x.getAttribute("aria-label")).join(" ")}`;
  const plans = marked("plan");
  if (on("agent-plan")) for (const p of plans) {
    const steps = [...p.querySelectorAll('[data-piq-ai="step"]')].filter((s) => s.closest('[data-piq-ai="plan"]') === p && !skip(s));
    if (!steps.length) { add("agent-plan", "agent.plan-visible", p, 'the plan has no steps (data-piq-ai="step")', { property: "steps" }); continue; }
    for (const s of steps) {
      const st = s.getAttribute("data-piq-ai-status");
      if (!WORDS[st]) add("agent-plan", "agent.plan-visible", s, `a step has ${st ? `an unknown status "${st}"` : "no data-piq-ai-status"}; use pending, running, done, failed or skipped`, { property: "status" });
      else if (!WORDS[st].test(stepText(s))) add("agent-plan", "agent.plan-visible", s, `a step's status (${st}) is not stated in text; colour or an icon alone does not say it`, { property: "status-text", value: st });
    }
  }
  if (on("agent-recover")) for (const s of marked("step").filter((s) => s.getAttribute("data-piq-ai-status") === "failed")) {
    // The failure's description: text at the step beyond its title (its first heading or text block) and its status.
    const ownText = (e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" ").trim();
    const blocks = [s, ...s.querySelectorAll("*")].filter((e) => !e.closest(CONTROL) && ownText(e) && (e === s || visible(e)));
    const heading = s.querySelector("h1, h2, h3, h4, h5, h6, [role=heading]");
    const strip = (t) => t.replace(ANY, "").replace(/[\s\p{P}]+/gu, " ").trim();
    // The title: the step's heading, else its first text that is not only its status.
    const title = heading ?? blocks.find((b) => strip(ownText(b)));
    const why = [...blocks.filter((b) => b !== title && !title?.contains(b)).map(ownText), ...byIds(s, "aria-describedby").map(text)].map(strip).join(" ").trim();
    if (!why) add("agent-recover", "agent.recover", s, "a failed step does not say in text what went wrong", { property: "description" });
    const plan = s.closest('[data-piq-ai="plan"]');
    const back = [...controlsIn(s), ...(plan ? controlsIn(plan) : near(s))].some((c) => enabled(c) && kind(c, ["retry", "previous"], /\b(retry|try again|previous|go back|back to|return to)\b/i));
    if (!back) add("agent-recover", "agent.recover", s, 'a failed step has no control to retry it or return to the previous step (data-piq-ai-control="retry" or "previous")', { property: "control" });
  }

  // agent-summary: a finished run shows what was done.
  if (on("agent-summary")) for (const s of statuses.filter((s) => s.getAttribute("data-piq-ai-status") === "done")) {
    if (!marked("summary").some((m) => visible(m) && text(m))) add("agent-summary", "agent.summary", s, 'the run is done and no summary of what it did is shown (data-piq-ai="summary")');
  }

  // agent-who-acts: a screen with takeover states the actor in a live region.
  const takeover = [...document.querySelectorAll("[data-piq-ai-takeover]")].filter((e) => !skip(e) && e.getAttribute("data-piq-ai-takeover") !== "false");
  const marks = [...document.querySelectorAll("[data-piq-ai], [data-piq-ai-actor], [data-piq-ai-takeover]")].filter((e) => !skip(e));
  const declared = marks.find((e) => aiOf(e)?.takeover === true);
  if (on("agent-who-acts") && (takeover.length || declared)) {
    const live = (e) => !!e.closest("[aria-live]:not([aria-live=off]), [role=status], [role=log], [role=alert]");
    const actors = [...document.querySelectorAll("[data-piq-ai-actor]")].filter((e) => !skip(e) && /^(agent|user)$/.test(e.getAttribute("data-piq-ai-actor")));
    if (!actors.some((e) => live(e) && visible(e) && text(e))) add("agent-who-acts", "agent.who-acts", takeover[0] ?? declared, 'the user can take over from the agent, and no live region states who is acting now (data-piq-ai-actor="agent" or "user", with aria-live)');
  }

  // ai-starters: an empty conversation offers starting points, and the prompt stays open.
  if (on("ai-starters")) for (const p of marked("prompt")) {
    const field = p.matches("input, textarea, [contenteditable]") ? p : p.querySelector("textarea, input:not([type=hidden]):not([type=button]):not([type=submit]), [contenteditable=true]");
    const starters = [...document.querySelectorAll('[data-piq-ai-control="starter"]')].filter((c) => !skip(c) && visible(c));
    if (!generated.length && !starters.length) add("ai-starters", "ai.starters", p, 'an empty conversation offers no suggested starting points (data-piq-ai-control="starter")', { property: "starters" });
    if (starters.length && (!field || field.disabled || field.readOnly || field.getAttribute("contenteditable") === "false" || field.getAttribute("aria-disabled") === "true")) add("ai-starters", "ai.starters", p, "the suggested starting points are the only way to start: the prompt cannot be typed in", { property: "prompt" });
  }

  // genui-review-prefill, card-input-label: the inputs of generated UI.
  const FIELD = 'input:not([type=hidden]):not([type=button]):not([type=submit]):not([type=reset]):not([type=image]), select, textarea';
  const inGenerated = (e) => e.closest('[data-piq-ai="generated"]');
  const fields = [...document.querySelectorAll(FIELD)].filter((f) => inGenerated(f) && !skip(f) && !f.closest('[data-piq-ai="prompt"]'));
  const prefilled = (f) => f.matches("[type=checkbox], [type=radio]") ? f.checked : f.tagName === "SELECT" ? !!f.value && [...f.options].some((o) => o.selected && o.hasAttribute("selected")) : !!f.value;
  if (on("genui-review-prefill")) for (const g of new Set(fields.filter(prefilled).map(inGenerated))) {
    const filled = fields.filter((f) => inGenerated(f) === g && prefilled(f));
    const locked = filled.filter((f) => f.disabled || f.readOnly || f.getAttribute("aria-readonly") === "true" || f.getAttribute("aria-disabled") === "true");
    if (locked.length) add("genui-review-prefill", "genui.review-prefill", locked[0], `${locked.length} value${locked.length > 1 ? "s" : ""} the AI pre-filled cannot be edited; let the user change them before submitting`, { property: "editable" });
    const submits = [...g.querySelectorAll("button[type=submit], input[type=submit], form button:not([type]), [data-piq-ai-control=submit]")].filter((b) => !skip(b) && visible(b) && !b.closest('[data-piq-ai="prompt"]'));
    const shared = filled.some((f) => f.form?.querySelector('[data-piq-ai="prompt"]'));
    if (!submits.length || shared) add("genui-review-prefill", "genui.review-prefill", g, shared ? "the pre-filled inline form is submitted with the conversation's message; give it a submit control of its own" : "the pre-filled inline component has no submit control of its own, so the user cannot review it before it is submitted", { property: "submit" });
  }
  if (on("card-input-label")) for (const f of fields.filter(visible)) {
    const named = f.getAttribute("aria-label")?.trim() || byIds(f, "aria-labelledby").map(text).join("").trim() || [...(f.labels ?? [])].map(text).join("").trim() || f.getAttribute("title")?.trim();
    if (!named) add("card-input-label", "card.input-label", f, `an input in generated UI has no label of its own${f.placeholder ? ` (the placeholder "${f.placeholder}" is not a label)` : ""}`);
  }
  if (on("card-narrow-first") && sizes && innerWidth < 600) for (const g of generated.filter(outermost).filter(visible)) {
    const r = g.getBoundingClientRect(), cw = document.documentElement.clientWidth;
    if (g.scrollWidth > g.clientWidth + 1 || r.right > cw + 1) add("card-narrow-first", "card.narrow-first", g, `generated UI scrolls sideways at ${innerWidth}px (${Math.max(g.scrollWidth, Math.round(r.right))}px wide); lay it out for the narrowest width first`, { property: "width", value: `${Math.max(g.scrollWidth, Math.round(r.width))}px` });
  }

  // ai-declared: with --blueprint, AI content on a screen whose blueprint declares no AI role.
  if (on("ai-declared") && screens) {
    const seen = new Set();
    for (const e of marks) {
      const id = screenOf(e);
      const key = id ?? "";
      if (seen.has(key)) continue;
      seen.add(key);
      if (!id) add("ai-declared", "ai.declared", e, "AI-marked content on a page that names no blueprint screen; add data-piq-screen=\"<screen id>\" to the page's root", { property: "screen" });
      else if (!(id in screens)) add("ai-declared", "ai.declared", e, `AI-marked content on screen "${id}", which the blueprint does not have`, { property: "screen", value: id });
      else if (!screens[id]?.roles?.length) add("ai-declared", "ai.declared", e, `screen "${id}" shows AI content and its blueprint declares no AI role; add "ai": { "roles": [...] } to it`, { property: "screen", value: id });
    }
  }
  return findings;
}

/* The blueprint's screens as aiChecks takes them: { id: ai | null }. */
export const blueprintScreens = (blueprint) => (blueprint ? Object.fromEntries((blueprint.screens ?? []).filter((s) => s?.id).map((s) => [s.id, s.ai ?? null])) : null);

/* modal-escape: press Escape in each open modal, topmost first, and report
   one that stays open (FEAT-008 modal.dismiss). State-affecting. Returns the
   findings and the names of the dialogs it closed. */
export async function modalEscape(page, { ignore = [] } = {}) {
  const findings = [], closed = [];
  const open = await page.evaluate((ignore) => {
    const sel = ["[data-audit-ignore]", ...ignore].join(", ");
    const found = [...document.querySelectorAll("dialog[open], [role=dialog][aria-modal=true], [role=alertdialog]")].filter((e) => !e.closest(sel) && e.getClientRects().length && (e.tagName !== "DIALOG" || e.matches(":modal") || e.getAttribute("aria-modal") === "true"));
    found.forEach((e, i) => e.setAttribute("data-piq-audit-modal", String(i)));
    return found.length;
  }, ignore);
  for (let i = open - 1; i >= 0; i--) {
    const m = page.locator(`[data-piq-audit-modal="${i}"]`);
    if (!(await m.isVisible())) continue;
    const { selector, name } = await m.evaluate((e) => { const out = []; for (let n = e; n && n.nodeType === 1 && out.length < 4; n = n.parentElement) { out.unshift(n.id ? `#${CSS.escape(n.id)}` : n.tagName.toLowerCase() + (n.classList.length ? `.${[...n.classList].map((c) => CSS.escape(c)).join(".")}` : "")); if (n.id) break; } return { selector: out.join(" > "), name: e.getAttribute("aria-label") || e.querySelector("h1, h2, h3")?.textContent?.trim() || "" }; });
    await m.evaluate((e) => { const f = e.querySelector("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"); (f ?? e).focus(); });
    await page.keyboard.press("Escape");
    await settle(page);
    if (await m.isVisible()) findings.push({ rule: "modal-contract", severity: "warning", selector, message: `Escape does not close the modal${name ? ` "${name}"` : ""}`, ruleId: "modal.dismiss", property: "escape" });
    else closed.push(name || selector);
  }
  await page.evaluate(() => { for (const e of document.querySelectorAll("[data-piq-audit-modal]")) e.removeAttribute("data-piq-audit-modal"); });
  return { findings, closed };
}

/* What a user would notice if it changed: focus, scroll and the theme. */
const snapshot = (page) => page.evaluate(() => {
  globalThis.__piqInspectFocus = document.activeElement;
  const r = [...document.querySelectorAll("[data-theme]")].find((e) => !e.parentElement?.closest("[data-theme]"));
  return { scroll: [scrollX, scrollY], theme: r?.dataset.theme ?? null, appearance: r?.dataset.appearance ?? null };
});
const restore = (page, s) => page.evaluate((s) => {
  const f = globalThis.__piqInspectFocus;
  if (f && f.isConnected && document.activeElement !== f) f.focus({ preventScroll: true });
  const focus = !f || f === document.body || document.activeElement === f;
  delete globalThis.__piqInspectFocus;
  scrollTo(s.scroll[0], s.scroll[1]);
  const r = [...document.querySelectorAll("[data-theme]")].find((e) => !e.parentElement?.closest("[data-theme]"));
  return { focus, scroll: [scrollX, scrollY], theme: r?.dataset.theme ?? null, appearance: r?.dataset.appearance ?? null };
}, s);

/* Inspect the page as it is. Options:
     sdk             prepare(cwd)'s result, to reuse across pages
     cwd             where to find the app's @ux-builder/ui (default: here)
     theme, appearance   default: the outermost [data-theme] element's
     ignore, rules   as audit(); rules[check] = false turns a check off
     contrast        axe's colour-contrast (default true)
     layout          the size-class checks: reflow, target-size, nav-per-breakpoint, focus-obscured (default true)
     stateAffecting  true, or a list of STATE_AFFECTING checks to run (default none)
     blueprint       the app's blueprint (parsed), for ai-declared and the screens' declared AI
   Returns { findings, marked, skipped, stateAffecting: { ran, restored, notes } }:
   findings in audit()'s shape, marked boxes whose ids index findings. */
export async function inspect(page, { sdk = null, cwd = process.cwd(), theme, appearance, ignore = [], rules = {}, contrast = true, layout = true, stateAffecting = false, sdkRules = null, blueprint = null } = {}) {
  sdk ??= prepare(cwd, { contrast });
  const asked = stateAffecting === true ? STATE_AFFECTING : Array.isArray(stateAffecting) ? stateAffecting : [];
  const applies = { "focus-obscured": layout && rules["focus-obscured"] !== false, "modal-escape": rules["modal-contract"] !== false };
  const run = STATE_AFFECTING.filter((c) => applies[c] && asked.includes(c));
  const skipped = STATE_AFFECTING.filter((c) => applies[c] && !asked.includes(c));
  const before = await snapshot(page);
  theme ??= before.theme; appearance ??= before.appearance;
  sdkRules ??= await sdkRulesIn(page, sdk.uiCss);
  const all = ["[data-audit-ignore]", ...ignore];

  await page.evaluate(installAppOwned);
  const result = await page.evaluate(collect, { sdkRules, bundledFamilies: sdk.bundledFamilies, ignore, theme, appearance, rules });
  // Inside a builder preview, a finding names the preview's option and design system (SDK-20).
  const previews = await page.evaluate((sels) => sels.map((s) => { try { return s ? document.querySelector(s)?.closest("[data-preview]")?.dataset.preview ?? null : null; } catch { return null; } }), result.findings.map((f) => f.selector));
  const findings = result.findings.map((f, i) => ({ ...f, ...(previews[i] ? { preview: previews[i] } : {}) }));
  const marked = [...result.marked];
  const more = layout || run.includes("focus-obscured") ? await page.evaluate(layoutChecks, { ignore: all, rules, sizes: layout, focus: run.includes("focus-obscured") }) : [];
  more.push(...await page.evaluate(interactionChecks, { ignore, rules, limits: sdk.limits, widths: layout }));
  more.push(...await page.evaluate(aiChecks, { ignore, rules, screens: blueprintScreens(blueprint), sizes: layout }));
  for (const f of more) {
    const { box, ...rest } = f;
    if (box) marked.push({ ...box, ids: [findings.length] });
    findings.push(rest);
  }
  if (contrast !== false && sdk.axeSource) {
    if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: sdk.axeSource });
    // A logo's text is exempt (WCAG 1.4.3, logotypes).
    const v = await page.evaluate(async (exclude) => {
      const { violations } = await window.axe.run({ exclude: [["#__piq_audit_overlay"], [".piq-logo"], ...exclude.map((s) => [s])] }, { runOnly: ["color-contrast"], resultTypes: ["violations"] });
      return violations.flatMap((x) => x.nodes).map((n) => { const el = document.querySelector(n.target.join(" ")); return { target: n.target, data: n.any?.[0]?.data ?? {}, sdk: !!el && !globalThis.__piqAppOwned(el), preview: el?.closest("[data-preview]")?.dataset.preview ?? null }; });
    }, all);
    for (const n of v) {
      const d = n.data;
      // Inside an SDK widget it is the SDK's to fix: reported, not failed.
      findings.push({ rule: "contrast", severity: n.sdk ? "warning" : "error", selector: n.target.join(" "), ...(n.preview ? { preview: n.preview } : {}), message: `contrast ${d.contrastRatio ?? "?"}:1 (needs ${d.expectedContrastRatio ?? "4.5:1"}): ${d.fgColor ?? ""} on ${d.bgColor ?? ""}${n.sdk ? " — in an SDK widget: the SDK's to fix, report it to the design-system team" : ""}`, property: "contrast", value: `${d.fgColor} on ${d.bgColor}`, owner: n.sdk ? "sdk" : "app" });
    }
  }
  const notes = [];
  let restored = true;
  if (run.includes("modal-escape")) {
    const esc = await modalEscape(page, { ignore });
    findings.push(...esc.findings);
    if (esc.closed.length) { restored = false; notes.push(`Escape closed ${esc.closed.map((n) => `"${n}"`).join(", ")}; reopen ${esc.closed.length === 1 ? "it" : "them"} to continue from this state`); }
  }
  if (run.length) {
    const after = await restore(page, before);
    const lost = [!after.focus && "focus", after.scroll.join() !== before.scroll.join() && "the scroll position", (after.theme !== before.theme || after.appearance !== before.appearance) && "the theme"].filter(Boolean);
    if (lost.length) { restored = false; notes.push(`${lost.join(", ")} could not be put back`); }
  }
  return { findings, marked, skipped, stateAffecting: { ran: run, restored, notes } };
}
