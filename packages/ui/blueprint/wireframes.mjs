/* ux-builder-blueprint wireframes: each screen drawn by its catalogue
   pattern, with placeholder content, in the neutral `plain` theme, at each
   supported size class and in each state it declares, as static HTML and PNG
   (FEAT-012 DRW-02; FEAT-015 RPT-09; ADR-030 decision 6). Node only.

     import { wireframes, writeWireframes } from "./wireframes.mjs";
     const pages = await wireframes(blueprint);            // [{ screen, state, sizeClass, file, html, width }]
     await writeWireframes(pages, "blueprint-wireframes");  // HTML, PNG (Playwright's Chromium)

   The ideal state is <screen>.<size>.html; each other state the screen has
   (states.mjs: the declared ones, and any an action or journey step names)
   is <screen>.<state>.<size>.html. A pattern that draws the state itself
   (its `status`, or no items) is given it; for one that does not, the
   wireframe is the page with the pattern's heading and the SDK's StatePanel
   (or Skeleton, while loading) in place of its content, and the page says
   so (data-drawn-by="StatePanel").

   The SDK's own React components draw each screen (server-rendered, as the
   gallery is), inside AppShell with the app's destinations for an app, on
   its own for a view, so a wireframe is the layout the app gets. A pattern
   the installed catalogue does not have is a labelled box (pattern.exists
   reports it). The HTML links the theme, ui.css and patterns.css, copied
   once into assets/. PNGs need playwright (or @playwright/test) and its
   Chromium; without them the HTML is still written and the caller is told. */

import { copyFileSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import catalogue from "../catalogue.json" with { type: "json" };
import { sizesOf } from "./project.mjs";
import { stateModels } from "./states.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const require = createRequire(import.meta.url);
const PATTERNS = new Set(catalogue.patterns.filter((p) => p.type === "component").map((p) => p.name));
// The width each size class is drawn at: inside its range, at a common device width.
export const WIDTHS = { compact: 390, medium: 720, expanded: 1024, large: 1366, "extra-large": 1920 };
const THEME = "plain";
const noop = () => {};
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* The SDK's CSS a wireframe links, by its name under assets/. */
export function assets() {
  return {
    "plain.css": require.resolve(`@ux-builder/tokens/themes/${THEME}.css`),
    "ui.css": join(HERE, "../dist/ui.css"),
    "patterns.css": join(HERE, "../dist/patterns.css"),
  };
}

/* Placeholder content for a pattern: the props that draw it with sample
   records, its primary action's label where the blueprint gives one. */
function placeholder(name, s, { h, ui, P }) {
  const title = s.title ?? s.id;
  const primary = (Array.isArray(s.actions) ? s.actions.find((a) => a?.primary)?.label : null) ?? s.primaryAction?.label ?? null;
  const act = primary ? h(ui.Button, null, primary) : null;
  const rows = Array.from({ length: 5 }, (_, i) => ({ id: `r${i + 1}`, name: `Item ${i + 1}`, owner: ["A. Person", "B. Person"][i % 2], status: ["Open", "Closed"][i % 2], updated: `${i + 1} days ago` }));
  const text = (t) => h("p", null, t);
  const fields = (n = 3) => Array.from({ length: n }, (_, i) => h(ui.TextField, { key: i, label: `Field ${i + 1}`, name: `field${i + 1}` }));
  const tiles = [1, 2, 3].map((i) => h(P.StatTile, { key: i, label: `Figure ${i}`, value: `${i * 12}` }));
  const props = {
    CollectionList: { title, actions: act, columns: [{ key: "name", label: "Name", priority: true }, { key: "owner", label: "Owner", priority: true }, { key: "status", label: "Status" }, { key: "updated", label: "Updated" }], rows, caption: title, search: "", onSearchChange: noop },
    RecordDetail: { title, actions: act, fields: [{ label: "Owner", value: "A. Person" }, { label: "Status", value: "Open" }, { label: "Updated", value: "2 days ago" }], children: text("Placeholder detail.") },
    WorkQueue: { title, items: [1, 2, 3].map((i) => ({ id: `i${i}`, title: `Item ${i}`, content: text("Placeholder content to review.") })), index: 0, onIndexChange: noop, onApprove: noop, onReject: noop },
    Dashboard: { title, actions: act, tiles },
    HomeScreen: { title, tiles, assigned: { title: "Assigned to you", items: rows.slice(0, 3).map((r) => ({ id: r.id, label: r.name, href: `#${r.id}` })) }, recent: { title: "Recent", items: rows.slice(3).map((r) => ({ id: r.id, label: r.name, href: `#${r.id}` })) } },
    ListDetail: { items: rows.map((r) => ({ id: r.id, label: r.name })), selected: "r1", onSelect: noop, listLabel: title, detail: h(P.RecordDetail, { title: "Item 1", fields: [{ label: "Owner", value: "A. Person" }] }) },
    SettingsPage: { title, sections: ["General", "Notifications", "Security"].map((l, i) => ({ id: `s${i}`, label: l, content: h(P.FormSection, { title: l }, fields(2)) })), current: "s0", onChange: noop },
    Wizard: { title, steps: ["Details", "Options", "Review"].map((t) => ({ id: t.toLowerCase(), title: t, content: h(ui.TextField, { label: `${t} name`, name: t.toLowerCase() }) })) },
    ErrorScreen: { title, children: text("Placeholder explanation of what happened.") },
    UsersAndRoles: { title, members: rows.slice(0, 3).map((r, i) => ({ id: r.id, name: r.owner, email: `person${i + 1}@example.com`, role: "member" })), roles: [{ value: "member", label: "Member" }, { value: "admin", label: "Admin" }], onInvite: noop, onRoleChange: noop },
    AuditLog: { title, entries: [] },
    ReportViewer: { title, parameters: fields(2), onRun: noop, results: text("Placeholder results."), onExport: noop, onPrint: noop },
    ImportFlow: { title, onFile: noop },
    TaskList: { title, sections: ["Details", "Options", "Review"].map((l, i) => ({ id: `t${i}`, label: l, href: `#t${i}`, status: i ? "not-started" : "completed" })) },
    DescriptionList: { items: [{ label: "Owner", value: "A. Person" }, { label: "Status", value: "Open" }] },
    Timeline: { events: [{ id: 1, title: "Created", time: "2026-10-01T09:00:00" }] },
  }[name];
  return props ?? { title, label: title, children: text("Placeholder content.") };
}

const STATUSES = new Map(catalogue.patterns.map((p) => [p.name, p.statuses ?? []]));
// Patterns whose `status` prop draws their states.
const STATUS_PROP = new Set(["CollectionList", "RecordDetail", "ReportViewer", "ChartFrame"]);

/* A screen's pattern in a state other than ideal: { el, by } where by is
   "pattern" when the pattern draws the state, "StatePanel" when the page
   does around it. */
function stateElement(s, state, lib) {
  const { h, ui, P } = lib;
  const own = STATUSES.get(s.pattern) ?? [];
  const props = placeholder(s.pattern, s, lib);
  // In error and partial, Try again is the region's primary action (states.mjs: error offers the retry
  // and back); the screen's own primary action is left out in error and drawn secondary in partial.
  if (props.actions && (state === "error" || state === "partial")) {
    const label = (Array.isArray(s.actions) ? s.actions.find((a) => a?.primary)?.label : null) ?? s.primaryAction?.label;
    props.actions = state === "partial" && label ? h(ui.Button, { variant: "secondary" }, label) : null;
  }
  if (STATUS_PROP.has(s.pattern) && (own.includes(state) || (state === "no-results" && own.includes("empty")))) {
    const rows = state === "partial" ? props.rows?.slice(0, 2) : state === "ready" ? props.rows : [];
    const extra = s.pattern === "CollectionList" ? { rows: rows ?? [], ...(state === "no-results" ? { search: "zzz" } : {}) } : {};
    return { el: h(P[s.pattern], { ...props, ...extra, status: state === "no-results" ? "empty" : state, onRetry: noop }), by: "pattern" };
  }
  if (state === "empty" && s.pattern === "WorkQueue") return { el: h(P.WorkQueue, { ...props, items: [] }), by: "pattern" };
  if (state === "empty" && s.pattern === "HomeScreen") return { el: h(P.HomeScreen, { ...props, tiles: [], assigned: { ...props.assigned, items: [] }, recent: { ...props.recent, items: [] } }), by: "pattern" };
  if (s.pattern === "ErrorScreen" && own.includes(state)) return { el: h(P.ErrorScreen, { ...props, kind: state, children: undefined }), by: "pattern" };
  const primary = (Array.isArray(s.actions) ? s.actions.find((a) => a?.primary)?.label : null);
  const body = state === "loading"
    ? h("div", { "aria-busy": "true" }, h(ui.Skeleton, { variant: "rect", height: 40 }), h(ui.Skeleton, { lines: 6 }))
    : h(P.StatePanel, { kind: ["empty", "no-results", "forbidden", "error", "partial"].includes(state) ? state : "empty", onRetry: noop, action: state === "empty" && primary ? h(ui.Button, null, primary) : undefined, ...(["empty", "no-results", "forbidden", "error", "partial"].includes(state) ? {} : { title: `${s.title ?? s.id}: ${state}` }) });
  return { el: h("div", null, h(P.PageHeader, { title: s.title ?? s.id }), body), by: "StatePanel" };
}

/* A screen's pattern as a React element, or null for a pattern the catalogue lacks. */
function screenElement(s, lib) {
  const { h, P } = lib;
  if (!PATTERNS.has(s.pattern) || typeof P[s.pattern] !== "function") return null;
  if (s.pattern === "FormPage" || s.pattern === "QuickEdit") {
    // form comes from useFormState, so the page is drawn inside a component that calls it.
    const Form = () => {
      const form = P.useFormState({ initial: {} });
      return h(P[s.pattern], { title: s.title ?? s.id, form, onCancel: noop, open: true, onClose: noop }, h(P.FormSection, { title: "Details" }, [1, 2, 3].map((i) => h(lib.ui.TextField, { key: i, label: `Field ${i}`, ...form.field(`field${i}`) }))));
    };
    return h(Form);
  }
  return h(P[s.pattern], placeholder(s.pattern, s, lib));
}

const box = (s, state = "ideal") => `<div class="wf-unknown" role="img" aria-label="${esc(`${s.title ?? s.id}${state === "ideal" ? "" : ` (${state})`}: ${s.pattern ?? "no pattern"}`)}" style="display:grid;place-items:center;min-block-size:240px;margin:var(--piq-space-4);border:2px dashed var(--piq-color-border);border-radius:var(--piq-radius-md, 8px);color:var(--piq-color-text);font:var(--piq-font-body, inherit)"><p><strong>${esc(s.title ?? s.id)}</strong><br>${esc(s.pattern ?? "no pattern")}: not a pattern in @ux-builder/ui ${esc(catalogue.packages["@ux-builder/ui"])}</p></div>`;

/* The page around a screen: the theme and the SDK's CSS, nothing else. */
const page = (title, sizeClass, body) => `<!doctype html>
<html lang="en" data-theme="${THEME}" data-appearance="light" data-size-class="${sizeClass}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — ${sizeClass} wireframe</title>
<link rel="stylesheet" href="assets/plain.css">
<link rel="stylesheet" href="assets/ui.css">
<link rel="stylesheet" href="assets/patterns.css">
<style>body { margin: 0; background: var(--piq-color-ground); color: var(--piq-color-text); font-family: var(--piq-font-body); }</style>
</head>
<body>
${body}
</body>
</html>
`;

async function library() {
  const [{ createElement: h }, { renderToStaticMarkup }, ui, P] = await Promise.all([
    import(pathToFileURL(require.resolve("react")).href),
    import(pathToFileURL(require.resolve("react-dom/server")).href),
    import(pathToFileURL(join(HERE, "../dist/index.js")).href),
    import(pathToFileURL(join(HERE, "../dist/patterns.js")).href),
  ]);
  return { h, render: renderToStaticMarkup, ui, P };
}

/* The wireframes of a blueprint: one page per screen, state and supported
   size class, in blueprint order (the ideal state first). */
export async function wireframes(bp) {
  const lib = await library();
  const { h, render, P } = lib;
  const sizes = sizesOf(bp);
  const dests = (Array.isArray(bp.destinations) ? bp.destinations : []).filter((d) => d && typeof d === "object");
  const nav = dests.map((d) => ({ id: d.id, label: d.label ?? d.id, href: `#${d.id}`, icon: "home" }));
  const models = new Map(stateModels(bp).map((m) => [m.screen, m]));
  const seen = new Set();
  const out = [];
  for (const s of (Array.isArray(bp.screens) ? bp.screens : []).filter((x) => x && typeof x.id === "string")) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    for (const state of models.get(s.id)?.states ?? ["ideal"]) {
      let markup, known = true, by = "pattern";
      try {
        let el = null;
        if (PATTERNS.has(s.pattern) && typeof P[s.pattern] === "function") {
          if (state === "ideal") el = screenElement(s, lib);
          else ({ el, by } = stateElement(s, state, lib));
        }
        known = !!el;
        // In a Page, as an app builds each screen (the starter's guide).
        const content = el ? render(h(P.Page, null, el)) : box(s, state);
        const marked = state === "ideal" ? content : `<div data-state="${esc(state)}" data-drawn-by="${known ? by : "box"}">${content}</div>`;
        // A view is drawn without a shell; the host provides it.
        markup = bp.kind === "view" || !nav.length ? `<main>${marked}</main>` : render(h(P.AppShell, { nav, current: dests.find((d) => d.screen === s.id)?.id ?? null, brand: h("strong", null, bp.name ?? "App") }, h("div", { dangerouslySetInnerHTML: { __html: marked } })));
      } catch (e) {
        known = false;
        markup = `<main>${box({ ...s, pattern: `${s.pattern} (could not be drawn: ${e.message})` }, state)}</main>`;
      }
      const name = state === "ideal" ? s.id : `${s.id}.${state}`;
      for (const size of sizes) out.push({ screen: s.id, state, drawnBy: known ? by : null, pattern: s.pattern ?? null, known, sizeClass: size, width: WIDTHS[size] ?? 1024, file: `${name}.${size}.html`, html: page(state === "ideal" ? s.title ?? s.id : `${s.title ?? s.id} (${state})`, size, markup) });
    }
  }
  return out;
}

/* Write the pages and assets, and a PNG of each at its size class's width.
   Returns { files, pages, png: true } or { files, pages, png: false, reason }. */
export async function writeWireframes(pages, dir) {
  mkdirSync(join(dir, "assets"), { recursive: true });
  for (const f of readdirSync(dir)) if (/\.(html|png)$/.test(f)) rmSync(join(dir, f));
  for (const [name, from] of Object.entries(assets())) copyFileSync(from, join(dir, "assets", name));
  const files = [];
  for (const p of pages) { writeFileSync(join(dir, p.file), p.html); files.push(p.file); }
  let chromium;
  try {
    const pw = await import(pathToFileURL(resolveFrom(["playwright", "@playwright/test"])).href);
    chromium = pw.chromium ?? pw.default?.chromium;
    if (!chromium) throw new Error("no chromium export");
  } catch { return { files, pages, png: false, reason: "PNGs need Playwright: npm install --save-dev playwright && npx playwright install chromium" }; }
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) { return { files, pages, png: false, reason: `Chromium did not start (${e.message.split("\n")[0]}); run: npx playwright install chromium` }; }
  try {
    for (const p of pages) {
      const tab = await browser.newPage({ viewport: { width: p.width, height: 800 }, deviceScaleFactor: 1 });
      await tab.goto(pathToFileURL(join(dir, p.file)).href);
      await tab.screenshot({ path: join(dir, p.file.replace(/\.html$/, ".png")), fullPage: true, animations: "disabled" });
      await tab.close();
      files.push(p.file.replace(/\.html$/, ".png"));
    }
  } finally { await browser.close(); }
  return { files, pages, png: true };
}

/* The first of these packages the app (or this package) has installed. */
function resolveFrom(names) {
  const app = createRequire(join(process.cwd(), "package.json"));
  for (const n of names) for (const r of [app, require]) { try { return r.resolve(n); } catch { /* next */ } }
  throw new Error(`none of ${names.join(", ")} is installed`);
}
