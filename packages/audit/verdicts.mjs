/* The audit's two verdicts, and how its pages map to the blueprint's
   screens and journeys (FEAT-014 MOD-09, MOD-10; FEAT-015 RPT-03, RPT-04;
   CONTRACT-004 "Modalities, verdicts and the journey report").

   Pure functions of what the audit saw, so each can be tested on its own:
   - pageScreen: the screen a page is, by its data-piq-screen, else by the
     blueprint screen whose path it is served at;
   - journeyIndex: the blueprint's journeys as steps, each with its screen;
   - themeVerdict: the declared theme, whether it is applied, its design
     system, whether every component is the SDK's, and contrast per
     appearance, each failure with its theme.* rule;
   - modalityVerdicts: per modality, the SDK components it needs (present or
     not) and the rule families it needs (checked or not), with the fixes;
     responsive-web judged by outcome (US-157): each page framed by AppShell
     or by a main landmark that fits every audited width, and navigation,
     where there is any, adapting at the size classes the app chose. */

import { MODALITIES, expandModalities } from "@ux-builder/ui/blueprint/modalities";

const ORDER = ["pass", "not-checked", "warn", "fail"];
const worst = (list) => list.reduce((a, b) => (ORDER.indexOf(b) > ORDER.indexOf(a) ? b : a), "pass");
const pathOf = (u) => { try { return new URL(u).pathname; } catch { return u; } };
const samePath = (a, b) => (a.replace(/\/+$/, "") || "/") === (b.replace(/\/+$/, "") || "/");

/* The screen a page is (CONTRACT-005 screens[].path): data-piq-screen
   first, then the screen's path. Returns { screen, screenVia, screenTitle }. */
export function pageScreen(page, blueprint = null) {
  const screens = blueprint?.screens ?? [];
  if (page.screen) return { screen: page.screen, screenVia: "data-piq-screen", screenTitle: screens.find((s) => s?.id === page.screen)?.title ?? null };
  const byPath = screens.find((s) => typeof s?.path === "string" && samePath(s.path, pathOf(page.url)));
  if (byPath) return { screen: byPath.id, screenVia: "path", screenTitle: byPath.title ?? null };
  return { screen: null, screenVia: null, screenTitle: null };
}

/* The blueprint's journeys, each step with its screen: the main path
   numbered from 1, then each alternate's steps numbered from 1 with
   `alternate` (CONTRACT-005 journeys). */
export function journeyIndex(blueprint = null) {
  const title = new Map((blueprint?.screens ?? []).filter((s) => s?.id).map((s) => [s.id, s.title ?? s.id]));
  const step = (s, i, alternate) => ({ n: i + 1, screen: s?.screen ?? null, title: title.get(s?.screen) ?? s?.screen ?? null, ...(s?.action ? { action: s.action } : {}), ...(alternate ? { alternate } : {}) });
  return (blueprint?.journeys ?? []).filter((j) => j?.id).map((j) => ({
    id: j.id, ...(j.story ? { story: j.story } : {}),
    steps: [...(j.steps ?? []).map((s, i) => step(s, i)), ...(j.alternates ?? []).flatMap((a, k) => (a.steps ?? []).map((s, i) => step(s, i, k + 1)))],
    ...((j.alternates ?? []).length ? { alternates: j.alternates.map((a, k) => ({ n: k + 1, from: a.from, ...(a.reason ? { reason: a.reason } : {}) })) } : {}),
  }));
}

/* The theme verdict's items: what each says, and the checks that decide it. */
export const THEME_ITEMS = [
  { item: "applied", label: "The declared theme is applied", checks: ["theme-applied"] },
  { item: "designSystem", label: "The theme's design system is the one in use: its tokens, fonts and brand, nothing restyled", checks: ["token-colors", "token-fonts", "token-radii", "token-overrides", "widget-overrides", "fonts", "brand"] },
  { item: "sdkOnly", label: "Every component is the SDK's", checks: ["sdk-widgets", "foreign-components", "outside-theme"] },
  { item: "contrast", label: "The palette passes contrast in every appearance", checks: ["contrast"] },
  { item: "layout", label: "Pages reflow, pointer targets are large enough and focus is never hidden", checks: ["reflow", "target-size", "focus-obscured"] },
];

const statusOf = (fs) => (fs.some((f) => f.severity === "error") ? "fail" : fs.some((f) => f.severity === "warning") ? "warn" : "pass");
const appearanceOf = (run) => run.split("@")[0].split("/")[1];

/* The theme verdict (FEAT-014 MOD-10; CONTRACT-004 verdicts.theme). */
export function themeVerdict({ findings = [], pages = [], runs = [], rules = {}, contrast = true, manifest = null }) {
  const themes = [...new Set(pages.map((p) => p.theme).filter(Boolean))];
  const designSystems = [...new Set(themes.map((t) => manifest?.themes?.find((x) => x.name === t)?.designSystem ?? null))];
  const live = (f) => f.severity !== "info";
  const items = THEME_ITEMS.map(({ item, label, checks }) => {
    const on = checks.filter((c) => rules[c] !== false && (c !== "contrast" || contrast !== false));
    const fs = findings.filter((f) => checks.includes(f.check) && live(f));
    const layout = item === "layout" && !runs.some((r) => r.width != null);
    const status = !on.length || layout ? "not-checked" : statusOf(fs);
    return { item, label, status, ...(status === "not-checked" ? { note: layout ? "audited at one width; give --width, --modality or --blueprint to check each size class" : `turned off (${checks.join(", ")})` } : {}), rules: [...new Set(fs.map((f) => f.ruleId).filter(Boolean))], findings: fs.map((f) => f.id), ...(fs[0]?.fix ? { fix: fs[0].fix } : {}) };
  });
  const contrastOn = contrast !== false && rules.contrast !== false;
  const per = {};
  for (const a of ["light", "dark"]) {
    const audited = runs.some((r) => r.appearance === a);
    const fs = findings.filter((f) => f.check === "contrast" && live(f) && (f.runs ?? []).some((r) => appearanceOf(r) === a));
    per[a] = !contrastOn || !audited ? "not-checked" : statusOf(fs);
  }
  const by = Object.fromEntries(items.map((i) => [i.item, i]));
  const ids = [...new Set(items.flatMap((i) => i.findings))];
  const status = worst(items.map((i) => (i.status === "not-checked" ? (i.item === "applied" ? "warn" : "pass") : i.status)));
  return {
    status, theme: themes.length === 1 ? themes[0] : themes.length ? themes : null, designSystem: designSystems.length === 1 ? designSystems[0] : designSystems.length ? designSystems : null,
    applied: by.applied.status === "pass", sdkOnly: by.sdkOnly.status === "pass", contrast: per, items, findings: ids,
  };
}

/* The components each modality needs (FEAT-014 MOD-09). */
const NEEDS = {
  "responsive-web": [{ name: "AppShell", required: true, fix: "Build the app in the SDK's AppShell (@ux-builder/ui/patterns), whose navigation adapts by size class: a bottom bar when compact, a rail at medium, a side navigation from expanded." }],
  chat: [{ name: "Conversation", required: true, fix: "Render the SDK's Conversation (@ux-builder/ui/assistant) as the screen: its log, disclosure and composer." }],
  "hybrid-chat": [
    { name: "Conversation", required: true, fix: "Render the SDK's Conversation (@ux-builder/ui/assistant) as the screen: its log, disclosure and composer." },
    { name: "Adaptive Card part", required: false, fix: "Let the Conversation render Adaptive Card parts (a message part of type \"adaptive-card\", drawn by @ux-builder/ui/adaptive-cards), and audit a page that shows one." },
  ],
};

const ALL_SIZES = ["compact", "medium", "expanded", "large"];
const hasNav = (w) => !!w.appShell && w.appShell.nav !== 0;

/* Does AppShell's navigation adapt on the audited pages, at the size classes
   chosen: the bottom bar when compact, the side navigation from expanded?
   true, false, or null when the audit saw none of the widths it needs. */
function adapts(pages, classes = ALL_SIZES) {
  const narrowWanted = classes.includes("compact"), wideWanted = classes.some((c) => c === "expanded" || c === "large");
  let seen = false;
  for (const ws of pages.map((p) => p.widths.filter(hasNav)).filter((ws) => ws.length)) {
    const narrow = narrowWanted ? ws.filter((w) => w.width < 600) : [], wide = wideWanted ? ws.filter((w) => w.width >= 840) : [];
    if ((narrowWanted && !narrow.length) || (wideWanted && !wide.length) || (!narrow.length && !wide.length)) continue;
    seen = true;
    if (!narrow.every((w) => w.appShell.bar && !w.appShell.side) || !wide.every((w) => w.appShell.side && !w.appShell.bar)) return false;
  }
  return seen ? true : null;
}

/* Each page's frame (US-157-AC1): AppShell, or a main landmark whose content
   fits (no sideways scroll, no reflow finding) at every audited width. */
function frameOf(p, findings) {
  if (p.widths.some((w) => w.appShell)) return { url: p.url, frame: "AppShell" };
  if (!p.widths.length || !p.widths.every((w) => w.main)) return { url: p.url, frame: null, main: false };
  const reflowAt = (width) => findings.some((f) => f.check === "reflow" && f.url === p.url && f.severity !== "info" && (f.runs ?? []).some((r) => r.endsWith(`@${width}`)));
  const over = p.widths.filter((w) => w.fits === false || reflowAt(w.width)).map((w) => w.width);
  return over.length ? { url: p.url, frame: null, main: true, overflows: over } : { url: p.url, frame: "main" };
}

/* The modality-fit verdicts (FEAT-014 MOD-09; CONTRACT-004 verdicts.modality). */
export function modalityVerdicts({ modalities = null, pages = [], rules = {}, findings = [], families = {}, layout = null, blueprint = null }) {
  if (!modalities) return [];
  const sized = layout ?? (modalities.widths ?? []).length > 1;
  const LAYOUT = new Set(["reflow", "target-size", "focus-obscured", "nav-per-breakpoint", "card-narrow-first"]);
  const ran = (c) => rules[c] !== false && (!LAYOUT.has(c) || sized);
  return modalities.names.filter((m) => MODALITIES[m]).map((modality) => {
    const fixes = [], evidence = [];
    const sizes = modalities.sizeClasses?.length ? modalities.sizeClasses : ALL_SIZES;
    // responsive-web by outcome: a frame on every page; navigation, where there is any, adapts (US-157).
    const frame = (n) => {
      const frames = pages.map((p) => frameOf(p, findings));
      const present = frames.some((f) => f.frame === "AppShell");
      const c = { name: n.name, present, required: true };
      for (const f of frames) {
        if (f.frame === "AppShell") evidence.push(`${n.name} on ${f.url}`);
        else if (f.frame === "main") evidence.push(`${f.url}: no ${n.name}; its main landmark frames the page and the content fits at ${pages.find((p) => p.url === f.url).widths.map((w) => `${w.width}px`).join(", ")}`);
        else if (f.main) fixes.push(`${f.url}: content overflows at ${f.overflows.map((w) => `${w}px`).join(", ")}: let it wrap at narrow widths (no fixed width wider than the window; wide tables or code scroll in a region of their own), or build the page in the SDK's AppShell.`);
        else fixes.push(`${n.name} is missing on ${f.url}, and no main landmark frames the page instead: ${n.fix} Or give the page a main landmark whose content fits every audited width.`);
      }
      if (!pages.length) { evidence.push(`${n.name} on none of the 0 audited pages`); fixes.push(`${n.name} is missing: ${n.fix}`); }
      if (!present && frames.length && frames.every((f) => f.frame === "main")) { c.required = false; c.alternative = "main"; }
      c.framed = frames.length > 0 && frames.every((f) => f.frame);
      const single = Array.isArray(blueprint?.destinations) && blueprint.destinations.length <= 1;
      c.navigation = !single && pages.some((p) => p.widths.some(hasNav));
      if (c.navigation) {
        c.adapts = adapts(pages, sizes);
        const want = [sizes.includes("compact") && "compact (390 px)", sizes.some((x) => x === "expanded" || x === "large") && "expanded (1280 px)"].filter(Boolean);
        if (c.adapts === false) fixes.push("Navigation exists, and AppShell's navigation does not adapt by size class: the bottom bar shows when compact (under 600 px) and the side navigation from expanded (840 px); do not hold it in a fixed-width frame or restyle it.");
        if (c.adapts === null && want.length) fixes.push(`Navigation exists but was not checked at ${want.join(" and ")}; audit with --modality or --blueprint.`);
        if (c.adapts === null && !want.length) delete c.adapts;
      } else if (present) evidence.push(single ? "One top-level destination: no navigation to adapt" : "AppShell shows no navigation items: no navigation to adapt");
      for (const p of pages) for (const w of p.widths) if (w.appShell && c.navigation) evidence.push(`${p.url} at ${w.width}px: ${w.appShell.bar ? "bottom bar" : ""}${w.appShell.bar && w.appShell.side ? " and " : ""}${w.appShell.side ? "side navigation" : ""}${!w.appShell.bar && !w.appShell.side ? "no navigation shown" : ""}`);
      return c;
    };
    const components = NEEDS[modality].map((n) => {
      if (n.name === "AppShell") return frame(n);
      const where = pages.filter((p) => p.widths.some((w) => (n.name === "Conversation" ? w.conversation : w.adaptiveCard))).map((p) => p.url);
      const present = where.length > 0;
      const c = { name: n.name, present, required: n.required };
      evidence.push(present ? `${n.name} on ${where.join(", ")}` : `${n.name} on none of the ${pages.length} audited page${pages.length === 1 ? "" : "s"}`);
      if (!present) fixes.push(`${n.name} is missing: ${n.fix}`);
      return c;
    });
    const ruleFamilies = expandModalities([modality]).ruleFamilies.map((family) => {
      const checks = Object.keys(families).filter((c) => families[c].includes(family));
      if (!checks.length) return { family, checked: null, by: "blueprint check or review" };
      const on = checks.filter(ran);
      if (!on.length) fixes.push(`The ${family}.* rules were not checked (${checks.join(", ")} ${checks.length === 1 ? "is" : "are"} off${checks.some((c) => LAYOUT.has(c)) && !sized ? " or need several widths" : ""}); audit without --off for ${checks.length === 1 ? "it" : "them"}${checks.some((c) => LAYOUT.has(c)) && !sized ? ", with --modality or --blueprint" : ""}.`);
      return { family, checked: on.length > 0, checks: on };
    });
    const required = components.filter((c) => (c.framed ?? c.present) === false && c.required !== false);
    const soft = components.some((c) => (!c.required && !c.present && !c.alternative) || c.adapts === false || c.adapts === null) || ruleFamilies.some((f) => f.checked === false);
    const fams = new Set(expandModalities([modality]).ruleFamilies);
    const related = findings.filter((f) => f.severity !== "info" && (families[f.check] ?? []).some((x) => fams.has(x) && x !== "theme")).map((f) => f.id);
    return { modality, status: required.length ? "fail" : soft ? "warn" : "pass", ...(modalities.assumed ? { assumed: true, note: "No blueprint modalities and no --modality: responsive-web was assumed." } : {}), components, ruleFamilies, fixes, evidence, findings: related };
  });
}
