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
import { enrich, inspect, modalEscape, prepare, sdkRulesIn, settle } from "./inspect.mjs";
export { inspect, STATE_AFFECTING } from "./inspect.mjs";

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
const SEVERITY = ["error", "warning", "info"];

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
   under out when given. Each page is switched through every width, theme
   and appearance, and inspect() checks each state. */
export async function audit({ urls, themes, appearances = ["light", "dark"], widths, ignore = [], rules = {}, contrast = true, out = null, wait = null, cwd = process.cwd(), viewport = { width: 1280, height: 900 }, baseline = null, log = () => {} }) {
  if (!urls?.length) throw new Error("audit: give at least one URL");
  const sdk = prepare(cwd, { contrast });
  const { manifest, interaction } = sdk;
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
    const sdkRules = await sdkRulesIn(blank, sdk.uiCss);
    await blank.close();

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
          // focus-obscured runs per state; modal-escape closes dialogs, so it runs once, after every state.
          const result = await inspect(page, { sdk, sdkRules, theme, appearance, ignore, contrast, layout: !!widths?.length, stateAffecting: ["focus-obscured"], rules: mode === "attributes" ? { ...rules, brand: false } : rules });
          const numbers = result.findings.map((f) => add({ url, ...f }, run));
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
        for (const f of (await modalEscape(page, { ignore })).findings) add({ url, ...f }, null);
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
  enrich(findings, interaction);
  for (const f of findings) {
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
