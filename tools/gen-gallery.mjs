#!/usr/bin/env node
/* Build the design system gallery from what @ux-builder/tokens and @ux-builder/ui
   ship.

     npm run gallery                      # -> build/gallery.html
     npm run gallery -- --brand <file|name>
                                          # -> build/gallery-<brand>.html

   With --brand, the page previews one brand file (a generated one from
   npm run brand, or any in tokens/brands/) on every shared design system,
   light and dark, so a design system can be chosen before a theme file
   pairs them (ADR-018). The brand is composed in memory, exactly as the
   build would compose it.

   Reads packages/tokens/dist/ and packages/ui/dist/, so run the build first
   (npm run check does).

   A gallery written by hand drifts from the tokens it claims to show, which is
   the problem ADR-011 exists to solve. So nothing here restates a value: every
   theme and appearance is drawn from its resolved JSON, the groups come from
   the token files, and the contrast verdicts come from the same rule and
   baseline the gate uses (contrast.mjs, contrast-baseline.json).

   The widgets are the shipped ones: each panel renders @ux-builder/ui's React
   components to static HTML and styles them with its ui.css, inside that
   panel's theme. So a field on this page is exactly what an app gets. The
   page has no script, but the native controls still work: type in the
   fields, open the dropdown, tick, toggle and pick. The React-driven ones
   show a state instead: one segment selected, the table sorted and paged.
   The open list is drawn beside the dropdown, since a picture cannot open
   it.

   The page is one self-contained file: brand artwork and the fonts
   @ux-builder/tokens bundles (dist/fonts.css, latin subset) are inlined as
   data URIs, so it fetches nothing. Segoe UI, for praxis-fluentui, ships
   with Windows and is not served; elsewhere it falls back to the system
   face its stack names.
   The release workflow attaches it to each GitHub release. */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { composeOn, cssName, load, resolveAll } from "../packages/tokens/compose.mjs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FLOOR, PAIRS, hex, measure, pairId, ratio, solid } from "./contrast.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "packages/tokens/dist");
const { values: argv } = parseArgs({ options: { brand: { type: "string" } } });
const UI = join(ROOT, "packages/ui/dist");
const ui = await import(join(UI, "index.js"));
const uiCss = readFileSync(join(UI, "ui.css"), "utf8");

const { version } = JSON.parse(readFileSync(join(ROOT, "packages/tokens/package.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(DIST, "manifest.json"), "utf8"));
const nameMap = JSON.parse(readFileSync(join(ROOT, "tokens/names.json"), "utf8")).tokens;
const known = new Set(JSON.parse(readFileSync(join(ROOT, "tools/contrast-baseline.json"), "utf8")).known.map((k) => k.id));

// Every theme (ADR-018), the 0.x ones first in their 0.x order, each with its
// appearances, default first.
const ORDER = ["plain", "praxis", "praxis-material", "praxis-fluentui", "praxis-carbon"];
const rank = (n) => (ORDER.includes(n) ? ORDER.indexOf(n) : ORDER.length);
const themeList = [...manifest.themes].sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
const themes = Object.fromEntries(themeList.map((t) => [t.name, [t.default, ...t.appearances.filter((x) => x !== t.default)]]));
let combos = Object.entries(themes).flatMap(([theme, appearances]) =>
  appearances.map((appearance) => {
    const { tokens } = JSON.parse(readFileSync(join(DIST, "resolved", `${theme}.${appearance}.json`), "utf8"));
    return { theme, appearance, id: `${theme}-${appearance}`, tokens };
  }));

// --brand: one brand on every shared design system instead of the shipped themes.
let preview = null;
if (argv.brand) {
  const file = existsSync(argv.brand) ? resolve(argv.brand) : join(ROOT, "tokens/brands", `${argv.brand}.brand.json`);
  if (!existsSync(file)) { console.error(`gallery: no brand file ${argv.brand} (a path, or a name in tokens/brands/)`); process.exit(2); }
  const brand = JSON.parse(readFileSync(file, "utf8"));
  const src = load(join(ROOT, "tokens"), join(ROOT, "brand"));
  const v = (await import("ajv/dist/2020.js")).default;
  const ajv = new v({ strict: true, allowUnionTypes: true, allErrors: true });
  for (const f of ["font", "brand"]) ajv.addSchema(JSON.parse(readFileSync(join(ROOT, "tokens/schema", `${f}.schema.json`), "utf8")), `${f}.schema.json`);
  const validate = ajv.getSchema("brand.schema.json");
  if (!validate(brand)) { console.error(`gallery: ${relative(ROOT, file)} is not a valid brand file: ${validate.errors.map((e) => `${e.instancePath || "/"} ${e.message}`).join("; ")}`); process.exit(2); }
  // Artwork paths are relative to the brand file; the preview draws the wordmark instead.
  for (const a of Object.values(brand.appearances)) for (const [k, t] of Object.entries(a.brand)) if (!/^#/.test(t.$value)) delete a.brand[k];
  const appearances = ["light", "dark"].filter((ap) => brand.appearances[ap]);
  combos = [...src.designSystems.values()].sort((a, b) => a.name.localeCompare(b.name)).flatMap((ds) => appearances.map((appearance) => {
    const resolved = resolveAll(composeOn(brand, ds, appearance), `${brand.name} × ${ds.name} (${appearance})`);
    const tokens = Object.fromEntries([...resolved].map(([path, value]) => [cssName(src.names, path), value]));
    return { theme: `${brand.name}-${ds.name}`, designSystem: ds.name, appearance, id: `${brand.name}-${ds.name}-${appearance}`, tokens };
  }));
  preview = { brand, file, sections: [...new Set(combos.map((c) => c.theme))] };
}
const OUT = join(ROOT, preview ? `build/gallery-${preview.brand.name}.html` : "build/gallery.html");

// Role name -> group (the first segment of its CONTRACT-001 path: color,
// button, field …) and -> the 0.x name it keeps as an alias through 1.x.
const group = {}, alias = {};
for (const [path, n] of Object.entries(nameMap)) {
  const name = `piq-${path.replace(/\./g, "-")}`;
  group[name] = path.split(".")[0];
  if (n.css0) alias[name] = n.css0;
}
// The table lists role names only; each row also names its 0.x alias.
const names = [...new Set(combos.flatMap((c) => Object.keys(c.tokens)))].filter((n) => n in group);
const groups = [...new Set(names.map((n) => group[n] ?? "other"))];

const commit = process.env.GITHUB_SHA?.slice(0, 7) || (() => {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "uncommitted";
  }
})();
const generated = new Date().toISOString().slice(0, 10);

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const title = (s) => s[0].toUpperCase() + s.slice(1);
// The theme's own name, as in data-theme: two themes can share a logo
// (every praxis-* theme does), so the artwork alone does not say which.
const label = (c) => `${c.theme} · ${c.appearance}`;

// A theme's heading on the page: its name, and what it is built on.
const dsTitle = Object.fromEntries(manifest.designSystems.map((d) => [d.name, d.title]));
const brandTitle = Object.fromEntries(manifest.brands.map((b) => [b.name, b.title]));
const THEME_NAMES = preview
  ? Object.fromEntries(combos.map((c) => [c.theme, [`${preview.brand.title} on ${dsTitle[c.designSystem]}`, `preview: data-brand="${preview.brand.name}" data-design-system="${c.designSystem}"`]]))
  : Object.fromEntries(themeList.map((t) => [t.name, [t.title,
    t.designSystem ? `${brandTitle[t.brand]} on ${dsTitle[t.designSystem]}` : `${brandTitle[t.brand]}, own anatomy`]]));

// One section per theme, its appearances side by side (dark, then light),
// 0.x themes first.
function themeSection(theme) {
  const own = combos.filter((c) => c.theme === theme);
  const [name, note] = THEME_NAMES[theme] ?? [title(theme)];
  return `
<section class="g-theme" aria-labelledby="theme-${theme}">
  <h3 id="theme-${theme}" class="g-theme__title">${esc(name)}${preview ? "" : ` <code>data-theme="${esc(theme)}"</code>`}</h3>
  <p class="g-theme__note">${[note, own.map((c) => c.appearance).join(" and ")].filter(Boolean).map(esc).join(" · ")}</p>
  <div class="g-panels">${own.map(panel).join("")}</div>
</section>`;
}
const isImage = (v) => /^url\(/.test(v ?? "");

// url("../brand/…") is relative to dist/themes/, where the CSS lives.
const MIME = { ".png": "image/png", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".webp": "image/webp" };
function inline(value) {
  return value.replace(/url\("([^"]+)"\)/g, (_, path) => {
    const file = resolve(DIST, "themes", path);
    if (relative(DIST, file).startsWith("..")) throw new Error(`${path} points outside dist/`);
    return `url("data:${MIME[extname(file)]};base64,${readFileSync(file).toString("base64")}")`;
  });
}

// Only the logo is drawn; the mark and favicon would add the same artwork again.
const drawn = ([k, v]) => !isImage(v) || k === "piq-brand-logo-image";
// Role names only: the page reads no 0.x alias, so it shows what a 1.x app gets.
const themeCss = combos.map((c) =>
  `.t-${c.id}{${Object.entries(c.tokens).filter(([k]) => k.startsWith("piq-")).filter(drawn).map(([k, v]) => `--${k}:${inline(v)};`).join("")}color-scheme:${c.appearance}}`).join("\n");

const PALETTE = ["text-strong", "text", "structure", "accent", "on-accent", "border", "ground", "surface", "surface-sunken", "ground-recessed", "text-muted", "text-subtle"].map((r) => `piq-color-${r}`);

// The same scene in every panel, so the themes differ only in what they set.
const ROWS = [
  { id: 1, matter: "Halvorsen v. Atlas", hours: 12.4, state: "live" },
  { id: 2, matter: "Brightwater merger", hours: 3.1, state: "live" },
  { id: 3, matter: "Okafor estate", hours: 7.75, state: "limited" },
  { id: 4, matter: "Northgate lease", hours: 0.8, state: "closed" },
];
const COLUMNS = [
  { key: "matter", label: "Matter", sortable: true },
  { key: "hours", label: "Hours", numeric: true, sortable: true },
  { key: "state", label: "Status", render: (r) => h(ui.StatusPill, { state: r.state }) },
];
const MATTERS = [
  { value: "2026-0412", label: "2026-0412 · Halvorsen v. Atlas" },
  { value: "2026-0388", label: "2026-0388 · Brightwater merger" },
  { value: "2026-0391", label: "2026-0391 · Okafor estate" },
  { value: "2025-1170", label: "2025-1170 · Northgate lease", disabled: true },
];
function widgets(c) {
  const id = (s) => `${c.id}-${s}`;
  const group = (name, ...children) => h("div", { className: "s-group" }, h("h5", { className: "s-sub" }, name), ...children);
  // The open list a dropdown shows, drawn in place: a static picture cannot
  // open the live one. Same .piq-menu rules as the live list.
  const openList = h("ul", { className: "piq-menu s-openlist", "aria-hidden": "true" },
    MATTERS.slice(0, 3).map((m, i) => h("li", { key: m.value, className: `piq-menu__item${i === 1 ? " is-hover" : ""}`, "aria-selected": i === 0 ? "true" : undefined }, m.label)));
  return renderToStaticMarkup(h("div", { className: "s-widgets" },
    group("Actions",
      h(ui.Card, {
        title: "Five entries need a look",
        actions: [
          h(ui.Button, { key: "a" }, "Confirm"),
          h(ui.Button, { key: "b", variant: "secondary" }, "Expand"),
          h(ui.Button, { key: "c", variant: "text", badge: 5 }, "Pinned"),
          h(ui.Button, { key: "d", disabled: true }, "Disabled"),
        ],
      },
        h("p", { className: "piq-card__body" }, "Two of them are block-billed. Nothing changes until you act on an entry."),
        h("p", { className: "s-subtle" }, "Updated 2 minutes ago"))),
    group("Inputs",
      h(ui.TextField, { id: id("client"), label: "Client", placeholder: "Search clients" }),
      h(ui.TextField, { id: id("hours"), label: "Hours", defaultValue: "0.08", error: "Bill in tenths of an hour." }),
      h(ui.Select, { id: id("matter"), label: "Matter", defaultValue: "2026-0412", options: MATTERS, hint: "Closed matters cannot be chosen." }),
      h("div", { className: "s-open" }, h("span", { className: "s-note" }, "Open list"), openList),
      h(ui.TextArea, { id: id("narrative"), label: "Narrative", rows: 3, defaultValue: "Reviewed and revised draft purchase agreement; call with opposing counsel." }),
      h(ui.TextField, { id: id("tk"), label: "Timekeeper", defaultValue: "R. Okafor", disabled: true })),
    group("Choices",
      h("div", { className: "s-row" },
        h(ui.Checkbox, { label: "Block-billed", defaultChecked: true }),
        h(ui.Checkbox, { label: "No-charge" })),
      h(ui.RadioGroup, { label: "Bill as", name: id("bill"), defaultValue: "hourly", options: [{ value: "hourly", label: "Hourly" }, { value: "fixed", label: "Fixed fee" }, { value: "pro", label: "Pro bono", disabled: true }] }),
      h("div", { className: "s-row" },
        h(ui.Switch, { label: "Notify partner", defaultChecked: true }),
        h(ui.Switch, { label: "Hold" })),
      h(ui.ChoicePicker, { label: "Review as", value: "partner", options: [{ value: "associate", label: "Associate" }, { value: "partner", label: "Partner" }, { value: "billing", label: "Billing" }] })),
    group("Feedback",
      h(ui.Notice, { tone: "info", title: "Prebill closes Friday" }, "Entries left open will roll to next month."),
      h(ui.Notice, { tone: "warning", title: "Two entries over the cap" }),
      h(ui.Notice, { tone: "error", title: "Rate missing for one timekeeper" }),
      h(ui.Toast, { message: "Entry moved to review.", actionLabel: "Undo" })),
    group("Data",
      h(ui.DataTable, { columns: COLUMNS, rows: ROWS, pageSize: 3, caption: "Matters", initialSort: { key: "hours", dir: "descending" } }),
      h("div", { className: "s-row s-sunken" }, Object.keys(ui.STATES).map((s) => h(ui.StatusPill, { key: s, state: s }))))));
}

function panel(c) {
  const t = c.tokens;
  const mast = isImage(t["piq-brand-logo-image"])
    ? `<span class="s-logo" role="img" aria-label="${esc(title(c.theme))}"></span>`
    : `<span class="s-wordmark">${esc(title(c.theme))}</span>`;
  const swatches = PALETTE.filter((k) => hex(t[k])).map((k) =>
    `<li><span class="s-chip" style="background:var(--${k})"></span><code>--${k}</code><code class="s-hex">${esc(t[k])}</code></li>`).join("");
  const spaces = Array.from({ length: 8 }, (_, i) => `piq-space-${i + 1}`).filter((k) => t[k]).map((k) =>
    `<li><span class="s-bar" style="width:var(--${k})"></span><code>--${k}</code><code class="s-hex">${esc(t[k])}</code></li>`).join("");
  return `
<article class="s-panel t-${c.id}" aria-label="${esc(label(c))}">
  <header class="s-mast">${mast}<span class="s-id"><code class="s-name">${esc(c.theme)}</code><span class="s-ap">${esc(c.appearance)}</span></span></header>
  <section><h4 class="s-kicker">Widgets</h4>${widgets(c)}</section>
  <section><h4 class="s-kicker">Type</h4>
    <p class="s-display">Good morning</p>
    <p class="s-title">Review my time entries</p>
    <p class="s-heading">Before the prebill is released</p>
    <p class="s-body">Body text at the body size and leading, in the theme's UI face.</p>
    <p class="s-label">Label · tracked</p>
    <p class="s-mono"><code>font-mono · 0.8 h</code></p>
  </section>
  <section><h4 class="s-kicker">Palette</h4><ul class="s-swatches">${swatches}</ul></section>
  <section><h4 class="s-kicker">Shape and space</h4>
    <div class="s-row"><span class="s-shape s-shape--radius">radius</span><span class="s-shape s-shape--card">card</span><span class="s-shape s-shape--raised">raised</span></div>
    <ul class="s-spaces">${spaces}</ul>
  </section>
</article>`;
}

function contrastTable() {
  const head = combos.map((c) => `<th>${esc(label(c))}</th>`).join("");
  const rows = PAIRS.map(([fg, bg, what]) => {
    const cells = combos.map((c) => {
      const m = measure(c.tokens, fg, bg);
      if (!m) return `<td class="g-na">—</td>`;
      const { fg: a, bg: b, ratio: r } = m;
      const verdict = r >= FLOOR ? ["g-pass", "Pass"] : known.has(pairId(c.theme, c.appearance, fg, bg)) ? ["g-known", "Known"] : ["g-fail", "New"];
      return `<td class="g-num"><span class="g-pair"><span class="g-dot" style="background:${esc(b)};color:${esc(a)}">Aa</span>${r.toFixed(2)}</span> <span class="${verdict[0]}">${verdict[1]}</span></td>`;
    }).join("");
    return `<tr><th scope="row">${esc(title(what))}<br><code>--${fg} on --${bg}</code></th>${cells}</tr>`;
  }).join("\n");
  return `<table class="g-table"><thead><tr><th>Pairing</th>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

function tokenTable() {
  const head = combos.map((c) => `<th>${esc(label(c))}</th>`).join("");
  const body = groups.map((g) => {
    const rows = names.filter((n) => (group[n] ?? "other") === g).map((n) => {
      const values = combos.map((c) => c.tokens[n]);
      const varies = new Set(values).size > 1;
      const cells = values.map((v) => {
        if (v === undefined) return `<td class="g-na">—</td>`;
        if (isImage(v)) return `<td><code>${esc(v.match(/url\("(?:\.\.\/)?([^"]+)"\)/)?.[1] ?? v)}</code></td>`;
        const sw = hex(v) ? `<span class="g-sw" style="background:${esc(v)}"></span>` : "";
        return `<td><span class="g-val">${sw}<code>${esc(v)}</code></span></td>`;
      }).join("");
      const was = alias[n] ? `<br><code class="g-alias">was --${esc(alias[n])}</code>` : "";
      return `<tr${varies ? "" : ' class="g-same"'}><th scope="row"><code>--${esc(n)}</code>${was}</th>${cells}</tr>`;
    }).join("\n");
    return `<tbody><tr class="g-group"><th colspan="${combos.length + 1}">${esc(g)}</th></tr>${rows}</tbody>`;
  }).join("\n");
  return `<table class="g-table g-tokens"><thead><tr><th>Token</th>${head}</tr></thead>${body}</table>`;
}

const failing = combos.flatMap((c) => PAIRS.filter(([fg, bg]) => (measure(c.tokens, fg, bg)?.ratio ?? Infinity) < FLOOR)).length;

// The SDK's own fonts, latin subset, inlined (latin-ext would double the page for names this page does not use).
const fontCss = (readFileSync(join(DIST, "fonts.css"), "utf8").match(/@font-face \{[\s\S]*?\}/g) ?? [])
  .filter((f) => !/-latin-ext-/.test(f))
  .map((f) => f.replace(/url\("\.\/(fonts\/[^"]+)"\)/, (_, p) => `url("data:font/woff2;base64,${readFileSync(join(DIST, p)).toString("base64")}")`))
  .join("\n");

const PAGE_CSS = `
:root{--g-ground:#F7F6F3;--g-surface:#FFFFFF;--g-ink:#1C1B19;--g-body:#3A3936;--g-muted:#6A675F;--g-rule:#E2DFD8;--g-pass:#2E6B45;--g-known:#8A5A00;--g-fail:#B3261E;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--g-ground:#161615;--g-surface:#1F1E1D;--g-ink:#F2F1EC;--g-body:#D3D0C8;--g-muted:#A29E95;--g-rule:#34332F;--g-pass:#7FC496;--g-known:#E0B45C;--g-fail:#F08A80;color-scheme:dark}}
:root[data-theme="dark"]{--g-ground:#161615;--g-surface:#1F1E1D;--g-ink:#F2F1EC;--g-body:#D3D0C8;--g-muted:#A29E95;--g-rule:#34332F;--g-pass:#7FC496;--g-known:#E0B45C;--g-fail:#F08A80;color-scheme:dark}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--g-ground);color:var(--g-body);font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;padding:32px max(16px,4vw) 64px}
code{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:.88em}
.g-wrap{max-width:1360px;margin-inline:auto;display:grid;gap:56px}
.g-wrap>*{min-width:0}
.g-mast{display:grid;gap:6px;padding-bottom:24px;border-bottom:1px solid var(--g-rule)}
.g-mast h1{margin:0;font:400 2rem/1.15 Georgia,"Iowan Old Style",serif;color:var(--g-ink);text-wrap:balance}
.g-mast p{margin:0;color:var(--g-muted);max-width:75ch}
.g-meta{display:flex;flex-wrap:wrap;gap:6px 20px;font-size:13px;color:var(--g-muted)}
.g-meta b{color:var(--g-ink);font-weight:600}
h2{margin:0 0 6px;font:400 1.5rem/1.2 Georgia,"Iowan Old Style",serif;color:var(--g-ink)}
.g-intro{margin:0 0 20px;color:var(--g-muted);max-width:75ch}
.g-themes{display:grid;gap:48px}
.g-theme{display:grid;gap:4px;min-width:0}
.g-theme__title{margin:0;font:400 1.25rem/1.3 Georgia,"Iowan Old Style",serif;color:var(--g-ink)}
.g-theme__title code{margin-left:8px;font-size:.6em;color:var(--g-muted);font-family:ui-monospace,"SF Mono",Menlo,monospace}
.g-theme__note{margin:0 0 12px;color:var(--g-muted);font-size:13px}
/* Dark and light side by side; a theme with one appearance takes one column,
   so every panel is the same width. One column on a narrow screen. */
.g-panels{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
@media (max-width:720px){.g-panels{grid-template-columns:minmax(0,1fr)}}
.g-scroll{overflow-x:auto;border:1px solid var(--g-rule);border-radius:12px;background:var(--g-surface)}
.g-table{border-collapse:collapse;width:100%;font-size:13px}
.g-table th,.g-table td{padding:8px 12px;border-bottom:1px solid var(--g-rule);text-align:left;vertical-align:top}
.g-table thead th{position:sticky;top:0;background:var(--g-surface);color:var(--g-ink);font-weight:600;white-space:nowrap}
.g-table tbody th{font-weight:500;color:var(--g-ink)}
.g-table tbody th code{color:var(--g-muted);font-weight:400}
.g-tokens td,.g-tokens th{white-space:nowrap}
.g-group th{background:var(--g-ground);color:var(--g-muted);font-size:11px;letter-spacing:.08em;text-transform:uppercase}
.g-same td{color:var(--g-muted)}
.g-alias{font-size:.9em;color:var(--g-muted)}
.g-val,.g-pair{display:inline-flex;align-items:center;gap:8px}
.g-sw{width:14px;height:14px;border-radius:4px;border:1px solid var(--g-rule);flex:none}
.g-dot{display:inline-grid;place-items:center;width:28px;height:22px;border-radius:5px;border:1px solid var(--g-rule);font-weight:600;font-size:12px}
.g-num{font-variant-numeric:tabular-nums;white-space:nowrap}
.g-na{color:var(--g-muted)}
.g-pass{color:var(--g-pass);font-weight:600}
.g-known{color:var(--g-known);font-weight:600}
.g-fail{color:var(--g-fail);font-weight:700}
.g-legend{display:flex;flex-wrap:wrap;gap:6px 20px;margin:0 0 12px;font-size:13px;color:var(--g-muted)}

.s-panel{min-width:0;display:grid;gap:24px;align-content:start;padding:24px;background:var(--piq-color-ground);color:var(--piq-color-text);border:var(--piq-border-default);border-radius:var(--piq-radius-card);font:var(--piq-font-weight-regular) var(--piq-font-size-body)/var(--piq-line-height-body) var(--piq-font-body)}
.s-panel section{display:grid;gap:10px;min-width:0}
.s-mast{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:40px}
.s-logo{height:var(--piq-brand-logo-height);aspect-ratio:var(--piq-brand-logo-aspect);background:var(--piq-brand-logo-image) left center/contain no-repeat}
.s-wordmark{font:var(--piq-font-weight-strong) var(--piq-font-size-title)/1 var(--piq-font-heading);color:var(--piq-brand-logo-paint)}
.s-id{display:grid;justify-items:end;gap:2px;text-align:right}
.s-name{font:var(--piq-font-weight-strong) var(--piq-font-size-small)/1.2 var(--piq-font-mono);color:var(--piq-color-text-strong)}
.s-ap{font-size:var(--piq-font-size-label);letter-spacing:var(--piq-letter-spacing-eyebrow);text-transform:uppercase;color:var(--piq-color-text-muted)}
.s-kicker{margin:0;font-size:var(--piq-font-size-label);font-weight:var(--piq-font-weight-strong);letter-spacing:var(--piq-letter-spacing-eyebrow);text-transform:uppercase;color:var(--piq-color-accent)}
.s-row{display:flex;flex-wrap:wrap;gap:var(--piq-space-2);align-items:center}
.s-widgets{display:grid;gap:var(--piq-space-4);margin-top:var(--piq-space-2);min-width:0}
.s-widgets .piq-toast{width:100%}
.s-group{display:grid;gap:var(--piq-space-3);min-width:0}
.s-sub{margin:0;padding-top:var(--piq-space-2);border-top:var(--piq-border-default);font:var(--piq-font-weight-strong) var(--piq-font-size-label)/1.4 var(--piq-font-body);letter-spacing:var(--piq-letter-spacing-eyebrow);text-transform:uppercase;color:var(--piq-color-text-muted)}
.s-open{display:grid;gap:var(--piq-space-1)}
.s-note{font-size:var(--piq-font-size-label);color:var(--piq-color-text-muted)}
.s-openlist{margin:0}
.s-sunken{padding:var(--piq-space-3);background:var(--piq-color-surface-sunken);border-radius:var(--piq-radius-control)}
.s-display{margin:0;font:var(--piq-font-weight-regular) var(--piq-font-size-display)/var(--piq-line-height-tight) var(--piq-font-heading);color:var(--piq-color-text-strong);overflow-wrap:anywhere}
.s-title{margin:0;font:var(--piq-font-weight-regular) var(--piq-font-size-title)/var(--piq-line-height-tight) var(--piq-font-heading);color:var(--piq-color-text-strong)}
.s-heading{margin:0;font:var(--piq-font-weight-strong) var(--piq-font-size-heading)/var(--piq-line-height-tight) var(--piq-font-body);color:var(--piq-color-text-strong)}
.s-body{margin:0;max-width:var(--piq-size-measure)}
.s-subtle{margin:0;font-size:var(--piq-font-size-small);color:var(--piq-color-text-subtle)}
.s-label{margin:0;font-size:var(--piq-font-size-label);letter-spacing:var(--piq-letter-spacing-label);text-transform:uppercase;color:var(--piq-color-text-muted)}
.s-mono{margin:0;color:var(--piq-color-text-muted)}
.s-mono code{font-family:var(--piq-font-mono)}
.s-swatches,.s-spaces{list-style:none;margin:0;padding:0;display:grid;gap:6px;font-size:var(--piq-font-size-small)}
.s-swatches li,.s-spaces li{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;min-width:0}
.s-swatches code,.s-spaces code{font-family:var(--piq-font-mono);color:var(--piq-color-text);overflow:hidden;text-overflow:ellipsis}
.s-hex{color:var(--piq-color-text-muted)!important}
.s-chip{width:28px;height:20px;border-radius:var(--piq-radius-control);border:var(--piq-border-default)}
.s-bar{height:10px;background:var(--piq-color-accent);border-radius:2px}
.s-shape{display:grid;place-items:center;width:72px;height:52px;background:var(--piq-color-surface);border:var(--piq-border-default);font-size:var(--piq-font-size-label);color:var(--piq-color-text-muted)}
.s-shape--radius{border-radius:var(--piq-radius-control)}
.s-shape--card{border-radius:var(--piq-radius-card);box-shadow:var(--piq-shadow-card)}
.s-shape--raised{border-radius:var(--piq-radius-card);box-shadow:var(--piq-shadow-overlay)}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
`;

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${preview ? `${esc(preview.brand.title)} Preview` : "Design System Gallery"}</title>
<style>
${fontCss}
${themeCss}
${uiCss}
${PAGE_CSS}
</style>
</head>
<body>
<div class="g-wrap">
  <header class="g-mast">
    <h1>${preview ? `${esc(preview.brand.title)} on every design system` : "Design system gallery"}</h1>
    ${preview
      ? `<p>The brand file <code>${esc(relative(ROOT, preview.file).startsWith("..") ? preview.file : relative(ROOT, preview.file))}</code> composed with each shared design system, light and dark, with <code>@ux-builder/ui</code>'s widgets. Choose one, then make it a theme: <code>npm run brand -- &lt;logo&gt; --out … --design-system &lt;name&gt;</code>, or write <code>tokens/themes/${esc(preview.brand.name)}.theme.json</code>. Regenerate this page with <code>npm run gallery -- --brand ${esc(argv.brand)}</code>.</p>`
      : `<p>Every theme and appearance that <code>@ux-builder/tokens</code> ships, with <code>@ux-builder/ui</code>'s widgets in each, drawn from their built output. Nothing on this page is typed by hand: regenerate it with <code>npm run gallery</code>.</p>`}
    <p class="g-meta"><span><b>Version</b> ${esc(version)}</span><span><b>Commit</b> <code>${esc(commit)}</code></span><span><b>Generated</b> ${generated}</span><span><b>Themes</b> ${combos.length} combinations, ${names.length} tokens</span></p>
  </header>

  <section>
    <h2>Themes</h2>
    <p class="g-intro">Each panel sets one theme's resolved tokens and nothing else. The widgets are <code>@ux-builder/ui</code>'s own components and CSS, rendered inside each theme: everything that differs between panels comes from the tokens.</p>
    <div class="g-themes">${(preview ? preview.sections : Object.keys(themes)).map(themeSection).join("")}</div>
  </section>

  <section>
    <h2>Contrast</h2>
    <p class="g-intro">Every text role against the ground it sits on, with the ${FLOOR}:1 floor and the baseline CI enforces. ${failing} pairing${failing === 1 ? "" : "s"} below the floor; <span class="g-known">Known</span> ones are carried over from the platform and listed in <code>tools/contrast-baseline.json</code> to be fixed in step 4.</p>
    <p class="g-legend"><span class="g-pass">Pass</span><span class="g-known">Known failure</span><span class="g-fail">New failure</span></p>
    <div class="g-scroll">${contrastTable()}</div>
  </section>

  <section>
    <h2>Tokens</h2>
    <p class="g-intro">Every token's final value in each combination, by its role name (CONTRACT-001) with the 0.x name it replaces, which still works as an alias through 1.x. Grouped by the first part of the name; rows that are the same everywhere are dimmed, so what makes each theme itself stands out.</p>
    <div class="g-scroll">${tokenTable()}</div>
  </section>
</div>
</body>
</html>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, page);
console.log(`${relative(ROOT, OUT)} (${Math.round(page.length / 1024)} KB, ${combos.length} combinations, ${names.length} tokens, version ${version})`);
