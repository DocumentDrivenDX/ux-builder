/* @ux-builder/audit: audit a running app's use of the AI-UI SDK theme
   (US-022, FEAT-004 SDK-18).

     import { audit } from "@ux-builder/audit";
     const report = await audit({ urls: ["http://localhost:5173/"] });

   Opens each page in Chromium and switches the app through every theme and
   appearance it ships, as a user would (the top-level ThemeProvider answers
   a "piq:set-theme" event; an app without one is switched by its
   data-theme attributes). In each it runs the checks in collect.js and axe's
   colour-contrast rule, and takes a screenshot with the findings marked.
   Findings that recur across themes are merged: a colour that is the same
   in every theme and a token in none is hard-coded.

   The SDK's own CSS (to tell its rules from the app's) and the theme list
   come from the app's installed @ux-builder/ui and @ux-builder/tokens when the
   audit runs in the app's directory, so the two always agree. */

import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative } from "node:path";
import { chromium } from "playwright";
import { collect, installAppOwned } from "./collect.js";

const own = createRequire(import.meta.url);
export const VERSION = JSON.parse(readFileSync(own.resolve("./package.json"), "utf8")).version;
export const RULES = {
  "theme-applied": "The theme's CSS is on the page and applies.",
  "token-colors": "Every colour the app draws is one of the theme's colour tokens (or a mix of two).",
  "token-fonts": "Text is set in the theme's fonts.",
  "token-radii": "Corners use the theme's radii.",
  "token-overrides": "The app does not set --piq-* tokens; the theme does.",
  "widget-overrides": "The app does not restyle SDK widgets.",
  "sdk-widgets": "Icons, the logo, loaders and controls come from the SDK, not drawn by the app.",
  "foreign-components": "No other UI library's components.",
  "outside-theme": "Everything visible is inside the themed element.",
  brand: "The page's favicon and logo follow the theme.",
  fonts: "The theme's fonts are loaded, from the SDK.",
  contrast: "Text meets WCAG AA contrast (axe color-contrast).",
  reflow: "The page does not scroll sideways at the audited width (WCAG 1.4.10 at 320px).",
  "target-size": "Pointer targets are at least the theme's minimum target size (WCAG 2.5.8).",
  "focus-obscured": "A focused control is never hidden behind sticky or fixed content (WCAG 2.4.11).",
  "one-modal": "At most one modal dialog is open at a time (rule modal.one-at-a-time).",
  "modal-contract": "An open modal has a name, a way out, and closes on Escape (rules modal.titled, modal.dismiss).",
  "one-primary-action": "Each page region or dialog has at most one primary button (rule emphasis.one-primary).",
  "nav-per-breakpoint": "Navigation suits the width: few destinations when narrow, standing when wide (rules nav.compact-destinations, nav.standing-at-expanded).",
  "line-length": "Lines of prose stay readable (rule text.line-length).",
};
// Checks added in 0.2: warnings for one minor release before they can fail a build (CONTRACT-004).
// The interaction checks (0.2 of the audit, FEAT-008 AUD-01) are warnings too.
const NEW_CHECKS = new Set(["reflow", "target-size", "focus-obscured", "one-modal", "modal-contract", "one-primary-action", "nav-per-breakpoint", "line-length"]);
const INTERACTION = ["one-modal", "modal-contract", "one-primary-action", "nav-per-breakpoint", "line-length"];
const SEVERITY = ["error", "warning", "info"];

/* @ux-builder/ui and @ux-builder/tokens as the app has them, else this package's. */
function sdkFiles(cwd) {
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

const settle = (page) => page.evaluate(async () => {
  await document.fonts.ready;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
});

/* Switch the app to a theme and appearance. "event" when the app's
   ThemeProvider took the request; "attributes" when the audit set
   data-theme itself. */
async function switchTo(page, theme, appearance) {
  await page.evaluate(([theme, appearance]) => window.dispatchEvent(new CustomEvent("piq:set-theme", { detail: { theme, appearance } })), [theme, appearance]);
  try {
    await page.waitForFunction(([t, a]) => [...document.querySelectorAll("[data-theme]")].some((e) => e.dataset.theme === t && e.dataset.appearance === a), [theme, appearance], { timeout: 1500 });
    await settle(page);
    return "event";
  } catch {
    await page.evaluate(([theme, appearance]) => {
      const roots = [...document.querySelectorAll("[data-theme]")].filter((e) => !e.parentElement?.closest("[data-theme]"));
      for (const e of roots.length ? roots : [document.documentElement]) { e.dataset.theme = theme; e.dataset.appearance = appearance; }
    }, [theme, appearance]);
    await settle(page);
    return "attributes";
  }
}

const loadedThemes = (page) => page.evaluate(() => {
  const names = new Set();
  const walk = (rules) => { for (const r of rules ?? []) { for (const [, n] of (r.selectorText ?? "").matchAll(/\[data-theme="([^"]+)"\]/g)) names.add(n); walk(r.cssRules); } };
  for (const s of document.styleSheets) { try { walk(s.cssRules); } catch { /* cross-origin */ } }
  return [...names];
});

async function overlayShot(page, marked, path) {
  await page.evaluate((boxes) => {
    const layer = document.createElement("div");
    layer.id = "__piq_audit_overlay";
    layer.style.cssText = "position:absolute;inset:0 auto auto 0;width:0;height:0;z-index:2147483647;pointer-events:none";
    for (const b of boxes.slice(0, 80)) {
      const d = document.createElement("div");
      d.style.cssText = `position:absolute;left:${b.x - 2}px;top:${b.y - 2}px;width:${b.w + 4}px;height:${b.h + 4}px;outline:2px solid #e0007a;outline-offset:0;background:rgba(224,0,122,.08)`;
      const tag = document.createElement("span");
      tag.textContent = b.ids.join(",");
      tag.style.cssText = "position:absolute;left:-2px;top:-16px;padding:0 4px;background:#e0007a;color:#fff;font:600 11px/16px system-ui,sans-serif;white-space:nowrap";
      d.appendChild(tag);
      layer.appendChild(d);
    }
    document.body.appendChild(layer);
  }, marked);
  await page.screenshot({ path, fullPage: true });
  await page.evaluate(() => document.getElementById("__piq_audit_overlay")?.remove());
}

/* Audit pages of a running app. Returns the report; writes screenshots
   under out when given. */
/* The size-class checks, run in the page at the current width (SDK-20):
   sideways scroll, small pointer targets, and focused controls hidden by
   sticky or fixed content. Each finding gets the preview it is in, if any. */
function layoutChecks({ ignore, rules, limit = 150 }) {
  const skip = (e) => e.closest(["[data-audit-ignore]", "#__piq_audit_overlay", ...ignore].join(", "));
  const path = (e) => { const out = []; for (let n = e; n && n.nodeType === 1 && out.length < 4; n = n.parentElement) { out.unshift(n.id ? `#${CSS.escape(n.id)}` : n.tagName.toLowerCase() + (n.classList.length ? `.${[...n.classList].map((c) => CSS.escape(c)).join(".")}` : "")); if (n.id) break; } return out.join(" > "); };
  const preview = (e) => e.closest("[data-preview]")?.dataset.preview ?? null;
  const findings = [];
  const width = innerWidth;
  if (rules.reflow !== false) {
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
  if (rules["target-size"] !== false) {
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
  if (rules["focus-obscured"] !== false) {
    const before = document.activeElement;
    for (const e of controls.slice(0, limit)) {
      e.focus({ preventScroll: false });
      if (document.activeElement !== e) continue;
      const r = e.getBoundingClientRect();
      const points = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 2, r.top + 2], [r.right - 2, r.top + 2], [r.left + 2, r.bottom - 2], [r.right - 2, r.bottom - 2]].filter(([x, y]) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight);
      const covers = points.map(([x, y]) => document.elementFromPoint(x, y)).filter((t) => t && t !== e && !e.contains(t) && !t.contains(e));
      const sticky = covers.filter((t) => { for (let n = t; n; n = n.parentElement) { const p = getComputedStyle(n).position; if (p === "sticky" || p === "fixed") return true; } return false; });
      if (points.length && sticky.length === points.length) findings.push({ rule: "focus-obscured", severity: "warning", selector: path(e), message: `focused, it is hidden behind ${path(sticky[0])}`, preview: preview(e), box: { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height } });
    }
    before?.focus?.();
    scrollTo(0, 0);
  }
  return findings;
}

/* The interaction and IA checks, run in the page (FEAT-008 AUD-01; rules in
   @ux-builder/ui's catalogue). Each finding names the rule it enforces. */
function interactionChecks({ ignore, rules, limits, widths }) {
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

export async function audit({ urls, themes, appearances = ["light", "dark"], widths, ignore = [], rules = {}, contrast = true, out = null, wait = null, cwd = process.cwd(), viewport = { width: 1280, height: 900 }, baseline = null, log = () => {} }) {
  if (!urls?.length) throw new Error("audit: give at least one URL");
  const { uiCss, manifest, bundledFamilies, interaction } = sdkFiles(cwd);
  const limits = interaction?.limits ?? { compactDestinations: 5, lineLength: 80 };
  const known = new Map(manifest.themes.map((t) => [t.name, t]));
  if (out) mkdirSync(join(out, "screens"), { recursive: true });

  const browser = await chromium.launch().catch((e) => {
    throw new Error(`${e.message.split("\n")[0]}\nInstall the browser once with: npx playwright install chromium`);
  });
  const runs = [];
  // Findings merged as they come: one per page, rule and element (or
  // stylesheet rule, or value), listing the runs it was seen in. Its number
  // is fixed when first seen, so screenshots and the report agree.
  const groups = new Map();
  const add = (f, run) => {
    const key = [f.url, f.rule, f.selector, f.rule_selector, f.property, f.value, f.library, f.widget, f.preview, f.selector || f.rule_selector || f.value ? "" : f.message].join("|");
    if (!groups.has(key)) groups.set(key, { id: groups.size + 1, ...f, runs: [] });
    const g = groups.get(key);
    if (run && !g.runs.includes(run)) g.runs.push(run);
    return g.id;
  };
  try {
    const context = await browser.newContext({ viewport, reducedMotion: "no-preference" });
    // The SDK's own selectors, normalised by the browser as the page's are.
    const blank = await context.newPage();
    const sdkRules = await blank.evaluate((css) => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      const out = [];
      const walk = (rules) => { for (const r of rules) { if (r.selectorText) out.push([r.selectorText.replace(/\s+/g, " ").trim(), [...r.style].map((p) => [p, r.style.getPropertyValue(p)])]); if (r.cssRules) walk(r.cssRules); } };
      walk(sheet.cssRules);
      return out;
    }, uiCss);
    await blank.close();
    const axeSource = contrast !== false ? readFileSync(own.resolve("axe-core/axe.min.js"), "utf8") : null;

    for (const [u, url] of urls.entries()) {
      const page = await context.newPage();
      const google = new Set();
      const errors = [];
      page.on("request", (r) => { if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) google.add(new URL(r.url()).hostname); });
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(url, { waitUntil: "networkidle" });
      if (wait) await page.waitForSelector(wait);
      // Colours mid-transition are neither theme's: switch instantly.
      await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; }" });
      const shipped = await loadedThemes(page);
      const wanted = themes?.length ? themes : [...known.keys()];
      const note = (rule, severity, message, extra = {}) => add({ url, rule, severity, selector: null, message, ...extra });
      for (const t of wanted) {
        if (!known.has(t) && !shipped.includes(t)) note("theme-applied", "error", `unknown theme "${t}"`);
        else if (!shipped.includes(t)) note("theme-applied", themes?.length ? "error" : "info", `theme "${t}" is not on this page (its CSS is not loaded), so it was not audited`, { theme: t });
      }
      let modeNoted = false;
      const sizes = widths?.length ? widths : [viewport.width];
      for (const width of sizes) {
      if (widths?.length) { await page.setViewportSize({ width, height: viewport.height }); await settle(page); }
      for (const theme of wanted.filter((t) => shipped.includes(t))) {
        const aps = (known.get(theme)?.appearances ?? ["light", "dark"]).filter((a) => appearances.includes(a)).sort();
        for (const appearance of aps) {
          const run = widths?.length ? `${theme}/${appearance}@${width}` : `${theme}/${appearance}`;
          log(`  ${url} ${run}`);
          const mode = await switchTo(page, theme, appearance);
          if (mode === "attributes" && !modeNoted) {
            modeNoted = true;
            note("theme-applied", "warning", "the app did not answer the theme switch (no top-level ThemeProvider from @ux-builder/ui 0.6 or later?), so the audit set data-theme itself; the favicon and icon checks were skipped");
          }
          const applied = await page.evaluate(([t]) => { const r = document.querySelector(`[data-theme="${t}"]`); return !!r && getComputedStyle(r).getPropertyValue("--piq-color-text").trim() !== ""; }, [theme]);
          if (!applied) { add({ url, rule: "theme-applied", severity: "error", selector: null, message: `theme "${theme}" did not apply (no --piq-color-text under it)` }, run); continue; }
          await page.evaluate(installAppOwned);
          const result = await page.evaluate(collect, { sdkRules, bundledFamilies, ignore, theme, appearance, rules: mode === "attributes" ? { ...rules, brand: false } : rules });
          // Inside a builder preview, a finding names the preview's option and design system (SDK-20).
          const previews = await page.evaluate((sels) => sels.map((s) => { try { return s ? document.querySelector(s)?.closest("[data-preview]")?.dataset.preview ?? null : null; } catch { return null; } }), result.findings.map((f) => f.selector));
          const numbers = result.findings.map((f, i) => add({ url, ...f, ...(previews[i] ? { preview: previews[i] } : {}) }, run));
          // Opt-in with widths, so an audit without them reports as before.
          const layout = widths?.length ? await page.evaluate(layoutChecks, { ignore: ["[data-audit-ignore]", ...ignore], rules }) : [];
          layout.push(...await page.evaluate(interactionChecks, { ignore, rules, limits, widths: !!widths?.length }));
          for (const f of layout) {
            const { box, ...rest } = f;
            const id = add({ url, ...rest }, run);
            if (box) result.marked.push({ ...box, ids: [numbers.length] }), numbers.push(id);
          }
          if (axeSource) {
            if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: axeSource });
            // A logo's text is exempt (WCAG 1.4.3, logotypes).
            const v = await page.evaluate(async (exclude) => {
              const { violations } = await window.axe.run({ exclude: [["#__piq_audit_overlay"], [".piq-logo"], ...exclude.map((s) => [s])] }, { runOnly: ["color-contrast"], resultTypes: ["violations"] });
              return violations.flatMap((x) => x.nodes).map((n) => { const el = document.querySelector(n.target.join(" ")); return { target: n.target, data: n.any?.[0]?.data ?? {}, sdk: !!el && !globalThis.__piqAppOwned(el), preview: el?.closest("[data-preview]")?.dataset.preview ?? null }; });
            }, ["[data-audit-ignore]", ...ignore]);
            for (const n of v) {
              const d = n.data;
              // Inside an SDK widget it is the SDK's to fix: reported, not failed.
              add({ url, rule: "contrast", severity: n.sdk ? "warning" : "error", selector: n.target.join(" "), ...(n.preview ? { preview: n.preview } : {}), message: `contrast ${d.contrastRatio ?? "?"}:1 (needs ${d.expectedContrastRatio ?? "4.5:1"}): ${d.fgColor ?? ""} on ${d.bgColor ?? ""}${n.sdk ? " — in an SDK widget: the SDK's to fix, report it to the design-system team" : ""}`, property: "contrast", value: `${d.fgColor} on ${d.bgColor}`, owner: n.sdk ? "sdk" : "app" }, run);
            }
          }
          let screenshot = null;
          if (out) {
            screenshot = join(out, "screens", `${u + 1}-${theme}-${appearance}${widths?.length ? `-${width}` : ""}.png`);
            await overlayShot(page, result.marked.map((m) => ({ ...m, ids: [...new Set(m.ids.map((i) => numbers[i]))] })), screenshot);
            screenshot = relative(out, screenshot);
          }
          runs.push({ url, theme, appearance, mode, screenshot, ...(widths?.length ? { width } : {}) });
        }
      }
      }
      // Escape closes each open modal (FEAT-008, modal.dismiss). Last, as it changes the page.
      if (rules["modal-contract"] !== false && runs.some((r) => r.url === url)) {
        const open = await page.evaluate((ignore) => {
          const sel = ["[data-audit-ignore]", ...ignore].join(", ");
          const found = [...document.querySelectorAll("dialog[open], [role=dialog][aria-modal=true], [role=alertdialog]")].filter((e) => !e.closest(sel) && e.getClientRects().length && (e.tagName !== "DIALOG" || e.matches(":modal") || e.getAttribute("aria-modal") === "true"));
          found.forEach((e, i) => e.setAttribute("data-piq-audit-modal", String(i)));
          return found.length;
        }, ignore);
        for (let i = open - 1; i >= 0; i--) {
          const m = page.locator(`[data-piq-audit-modal="${i}"]`);
          if (!(await m.isVisible())) continue;
          await m.evaluate((e) => { const f = e.querySelector("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"); (f ?? e).focus(); });
          await page.keyboard.press("Escape");
          await settle(page);
          if (await m.isVisible()) {
            const { selector, name } = await m.evaluate((e) => { const out = []; for (let n = e; n && n.nodeType === 1 && out.length < 4; n = n.parentElement) { out.unshift(n.id ? `#${CSS.escape(n.id)}` : n.tagName.toLowerCase() + (n.classList.length ? `.${[...n.classList].map((c) => CSS.escape(c)).join(".")}` : "")); if (n.id) break; } return { selector: out.join(" > "), name: e.getAttribute("aria-label") || e.querySelector("h1, h2, h3")?.textContent?.trim() || "" }; });
            add({ url, rule: "modal-contract", severity: "warning", selector, message: `Escape does not close the modal${name ? ` "${name}"` : ""}`, ruleId: "modal.dismiss", property: "escape" }, null);
          }
        }
      }
      if (google.size && rules.fonts !== false) note("fonts", "info", `fonts are fetched from ${[...google].join(" and ")}; the SDK ships the theme's fonts (@ux-builder/tokens/fonts.css)`);
      for (const e of [...new Set(errors)].slice(0, 5)) note("theme-applied", "warning", `the page threw while being audited: ${e}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
  return report({ urls, runs, findings: [...groups.values()], interaction, baseline });
}

/* A finding's identity across audits, for the baseline (FEAT-008 AUD-03). */
const baselineKey = (f) => [f.rule, f.url, f.selector ?? "", f.selector ? "" : f.message ?? ""].join("|");

/* The findings as a baseline file, in a stable order (CONTRACT-004). */
export function toBaseline(report) {
  const findings = report.findings.filter((f) => f.severity !== "info").map((f) => ({ rule: f.rule, url: f.url, selector: f.selector ?? null, ...(f.selector ? {} : { message: f.message }), runs: [...f.runs].sort() }));
  findings.sort((a, b) => a.rule.localeCompare(b.rule) || a.url.localeCompare(b.url) || (a.selector ?? "").localeCompare(b.selector ?? "") || (a.message ?? "").localeCompare(b.message ?? ""));
  return { tool: "ux-builder-audit", version: VERSION, findings };
}

/* Order and count the findings; mark a colour that is the same in every
   theme as hard-coded. */
function report({ urls, runs, findings, interaction = null, baseline = null }) {
  const byCheck = new Map();
  for (const r of interaction?.rules ?? []) for (const c of r.checks) if (c.kind === "audit") (byCheck.get(c.id) ?? byCheck.set(c.id, []).get(c.id)).push(r);
  for (const f of findings) {
    // The rule a finding enforces and its sources (FEAT-008 AUD-02).
    const rule = (byCheck.get(f.rule) ?? []).find((r) => r.id === f.ruleId) ?? (byCheck.get(f.rule) ?? [])[0];
    if (rule) { f.ruleId = rule.id; f.sources = rule.sources.map(({ title, url }) => ({ title, url })); }
    if (NEW_CHECKS.has(f.rule)) f.severity = "warning";
    if (f.preview) f.message += ` — in the preview ${f.preview}`;
    const pageRuns = runs.filter((r) => r.url === f.url).length;
    if (f.rule === "token-colors" && pageRuns > 1 && f.runs.length === pageRuns) { f.everyTheme = true; f.message += " — the same in every theme: hard-coded"; }
  }
  // Findings in the baseline are known: not reported as new, not counted (FEAT-008 AUD-03).
  let baselined = 0, resolved = [], ignored = [];
  if (baseline) {
    const known = new Map();
    for (const b of baseline.findings ?? []) {
      if (!RULES[b.rule]) { ignored.push(b); continue; }
      known.set(baselineKey(b), b);
    }
    const seen = new Set();
    findings = findings.filter((f) => { const k = baselineKey(f); if (f.severity !== "info" && known.has(k)) { seen.add(k); baselined++; return false; } return true; });
    // Only pages audited this time can tell whether a finding is fixed.
    resolved = [...known.entries()].filter(([k, b]) => !seen.has(k) && urls.includes(b.url)).map(([, b]) => b);
  }
  findings.sort((a, b) => SEVERITY.indexOf(a.severity) - SEVERITY.indexOf(b.severity) || a.rule.localeCompare(b.rule) || a.id - b.id);
  const summary = { error: 0, warning: 0, info: 0, byRule: {}, ...(baseline ? { baselined, resolved: resolved.length } : {}) };
  for (const f of findings) { summary[f.severity]++; summary.byRule[f.rule] = (summary.byRule[f.rule] ?? 0) + 1; }
  return { tool: "@ux-builder/audit", version: VERSION, generatedAt: new Date().toISOString(), urls, rules: RULES, runs, findings, summary, ...(baseline ? { resolved, ...(ignored.length ? { baselineIgnored: ignored.map((b) => `${b.rule}: no such check in this version; ignored`) } : {}) } : {}) };
}
