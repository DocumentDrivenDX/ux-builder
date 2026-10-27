/* The audit at every size class (FEAT-004 SDK-20) and the screen patterns
   audited with it (US-023-AC7, US-025-AC8, US-030-AC7, US-032-AC6): pages
   built from @ux-builder/ui/patterns, in every theme and appearance, at one
   width per size class, must report no errors and none of the new checks.

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { tmpdir } from "node:os";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppearanceSwitch, Button, Card, Checkbox, DataTable, MenuButton, StatusPill, Tabs, TextField } from "@ux-builder/ui";
import { AppShell, Board, Calendar, CollectionList, Cluster, Dashboard, EditableGrid, FilterSection, Grid, Page, PeriodComparison, PermissionsMatrix, PivotTable, RecordDetail, SplitView, Stack, StatTile, TaskList, Wizard, WorkQueue } from "@ux-builder/ui/patterns";
import { audit } from "../audit.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const FILES = { "/themes.css": join(PKG, "../tokens/dist/themes.css"), "/fonts.css": join(PKG, "../tokens/dist/fonts.css"), "/ui.css": join(PKG, "../ui/dist/ui.css"), "/patterns.css": join(PKG, "../ui/dist/patterns.css") };
const WIDTHS = [360, 720, 1024, 1366, 1920];
let server, base;

const page = (body, { theme = "praxis-carbon" } = {}) => `<!doctype html><html lang="en" data-theme="${theme}" data-appearance="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>t</title>
<link rel="stylesheet" href="/themes.css"><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/ui.css"><link rel="stylesheet" href="/patterns.css">
<style>body { margin: 0; background: var(--piq-color-ground); color: var(--piq-color-text); font-family: var(--piq-font-body); }</style></head><body>${body}</body></html>`;

const NAV = ["Home", "Matters", "Clients", "Reports"].map((label, i) => ({ id: label.toLowerCase(), label, href: `#${label.toLowerCase()}`, icon: ["home", "view", "user", "download"][i] }));
const ROWS = Array.from({ length: 6 }, (_, i) => ({ id: `m${i}`, name: `Matter ${i + 1}`, client: ["Acme", "Globex"][i % 2], owner: "R. Lee", value: `£${(i + 1) * 1000}` }));
const shell = (content) => renderToStaticMarkup(h(AppShell, { nav: NAV, current: "matters", brand: h("strong", null, "Acme") }, content));

// The app's own markup inside the SDK's frame, as an agent-built app has it: a hand-made filter bar
// in a Page and Stack, and a bare icon and button, beside SDK widgets with parts of their own.
const COLS = [{ key: "name", label: "Matter", sortable: true }, { key: "client", label: "Client" }, { key: "state", label: "Status", render: (r) => h(StatusPill, { state: r.state }) }];
const inShell = shell(h(Page, null, h(Stack, null,
  h(Dashboard, { title: "Billing", tiles: [h(StatTile, { key: "b", label: "Billed", value: "£381k" })] },
    h("div", { id: "bar", style: { display: "flex", gap: 8, padding: 12, background: "#f3f4f6", borderRadius: 12, fontFamily: "Inter, sans-serif" } },
      h("svg", { id: "bar-icon", width: 16, height: 16, viewBox: "0 0 16 16" }, h("circle", { cx: 7, cy: 7, r: 5, stroke: "#6366f1", fill: "none" })),
      h("input", { id: "bar-input", placeholder: "Filter", style: { border: "1px solid #d1d5db", borderRadius: 6 } }),
      h("button", { id: "bar-button", style: { background: "#6366f1", color: "white", borderRadius: 9999, fontFamily: "Inter" } }, "Apply")),
    h(Card, { title: "Matters", actions: h(MenuButton, { label: "More", items: [{ label: "Export" }] }) },
      h(DataTable, { columns: COLS, rows: ROWS.map((r, i) => ({ ...r, state: ["live", "closed"][i % 2] })), caption: "Matters" }))),
  h("svg", { id: "bare-icon", width: 16, height: 16, viewBox: "0 0 16 16" }, h("path", { d: "M2 2h12v12H2z", fill: "currentColor" })),
  h("button", { id: "bare-button" }, "Plain"),
  h(AppearanceSwitch, { value: "light" }))));

const PAGES = {
  "/app-in-shell.html": page(inShell),
  // How Lightning CSS (Vite) bundles patterns.css: the selector list merged into one :is().
  "/merged.html": page(shell(h(Page, null, h("p", null, "Text")))).replace("</body>", `<style>:is(.piq-shell__main:has(.piq-bulk-bar),:root:has(.piq-bulk-bar):not(:has(.piq-shell__main .piq-bulk-bar))){scroll-padding-block-end:calc((var(--piq-size-target-touch) + var(--piq-space-2) * 2) * 2 + var(--piq-space-2) * 2)}</style></body>`),
  // US-023: every layout primitive.
  "/layout.html": page(renderToStaticMarkup(h(Page, { as: "main" }, h(Stack, { gap: 5 },
    h("h1", null, "Matters"),
    h(Cluster, { gap: 2 }, h(Button, null, "New matter"), h(Button, { variant: "secondary" }, "Import")),
    h(Grid, null, ...[1, 2, 3, 4].map((i) => h(StatTile, { key: i, label: `Figure ${i}`, value: `${i}0` }))),
    h(SplitView, { primaryLabel: "List", secondaryLabel: "Detail", primary: h("p", null, "List"), secondary: h("p", null, "Detail") }))))),
  // US-025: the collection list in the app shell, with selection and filters.
  "/list.html": page(shell(h("div", { style: { padding: "var(--piq-space-4)" } }, h(CollectionList, {
    title: "Matters", actions: h(Button, null, "New matter"),
    columns: [{ key: "name", label: "Matter", priority: true }, { key: "client", label: "Client", priority: true }, { key: "owner", label: "Owner" }, { key: "value", label: "Value", numeric: true }],
    rows: ROWS, selectable: true, selected: ["m1"], onSelectedChange: () => {}, bulkActions: h(Button, { variant: "secondary" }, "Assign"),
    rowActions: () => [{ label: "Open" }], search: "", onSearchChange: () => {}, filters: [{ id: "o", label: "Status: Open" }], onRemoveFilter: () => {}, onClearFilters: () => {},
    filterPanel: h(FilterSection, { title: "Status" }, h(Checkbox, { label: "Open" })), page: 1, pageSize: 6, total: 60, onPageChange: () => {},
  })))),
  // US-030: every variant point on one screen (navigation in the shell, page header, tabs, table rows).
  "/variants.html": page(shell(h("div", { style: { padding: "var(--piq-space-4)" } },
    h(RecordDetail, { title: "Acme v. Beta", actions: h(Button, null, "Edit"), fields: [{ label: "Client", value: "Acme" }, { label: "Owner", value: "R. Lee" }],
      tabs: [{ id: "a", label: "Overview", panel: h(TextField, { label: "Note" }) }, { id: "b", label: "Documents", count: 3, panel: null }] }),
    h(CollectionList, { title: "Related matters", columns: [{ key: "name", label: "Matter", priority: true }, { key: "client", label: "Client", priority: true }], rows: ROWS.slice(0, 4) })))),
  // The extended screens (FEAT-006): the same bar, every theme, appearance and width.
  "/extended.html": page(shell(h("div", { style: { padding: "var(--piq-space-4)", display: "grid", gap: "var(--piq-space-6)" } },
    h(Wizard, { steps: ["Client", "Matter", "Review"].map((t) => ({ id: t, title: t, content: h(TextField, { label: `${t} name`, name: t }) })) }),
    h(TaskList, { title: "Open a matter", sections: [{ id: "a", label: "Client", href: "#a", status: "completed" }, { id: "b", label: "Billing", href: "#b", status: "not-started" }] }),
    h(EditableGrid, { label: "Time entries", columns: [{ key: "task", label: "Task" }, { key: "hours", label: "Hours", numeric: true }], rows: [{ id: 1, task: "Draft", hours: 2 }], onChange: () => {} }),
    h(WorkQueue, { items: [{ id: "i", title: "Invoice 1", content: h("p", null, "Details") }], index: 0, onIndexChange: () => {} }),
    h(Board, { label: "Tasks", columns: [{ id: "a", title: "To do" }, { id: "b", title: "Done" }], cards: [{ id: "c", title: "Draft claim", status: "a" }] }),
    h(Calendar, { events: [{ id: 1, title: "Hearing", start: "2026-10-14T09:30:00" }], date: "2026-10-14T00:00:00", locale: "en-GB" }),
    h(PeriodComparison, { label: "Billed", current: 368, previous: 400, comparison: "on last quarter" }),
    h(PivotTable, { label: "Fees", groups: [{ id: "g", label: "Corporate", rows: [{ id: "r", label: "M&A" }] }], columns: [{ key: "q1", label: "Q1" }], value: () => 10 }),
    h(PermissionsMatrix, { roles: [{ value: "o", label: "Owner" }], permissions: [{ value: "v", label: "View" }], has: () => true })))),
  // US-032: a preview whose screen has a contrast failure.
  "/preview.html": page(`<div data-preview="Bold:carbon:light:collection" style="padding:var(--piq-space-4)"><p id="faint" style="color:var(--piq-color-border)">Too faint to read</p></div>
    <div data-preview="Bold:material:light:collection"><p>Readable</p></div>`),
  // US-034-AC7: only the new checks' mistakes, nothing else wrong.
  "/only-layout.html": page(`<div style="padding:var(--piq-space-4)"><p>Text</p>
    <div style="inline-size:900px;block-size:4px;background:var(--piq-color-border)"></div>
    ${Array.from({ length: 30 }, (_, i) => `<p>Line ${i}</p>`).join("")}
    ${renderToStaticMarkup(h(Button, { id: "under" }, "Behind the bar"))}
    <div style="position:fixed;inset:auto 0 0 0;block-size:120px;background:var(--piq-color-surface)">A fixed bar</div></div>`),
  // SDK-20: one of each new mistake.
  "/layout-mistakes.html": page(`<div style="padding:var(--piq-space-4)"><p>Text</p>
    <div id="wide" style="inline-size:900px;block-size:4px;background:var(--piq-color-border)"></div>
    <div id="scroller" style="overflow-x:auto"><div style="inline-size:1400px;block-size:4px;background:var(--piq-color-border)"></div></div>
    <button id="tiny" style="all:unset;inline-size:12px;block-size:12px;background:var(--piq-color-structure)" aria-label="Tiny"></button>
    <p>A sentence with <a href="#x">an inline link</a> in it.</p>
    ${Array.from({ length: 30 }, (_, i) => `<p>Line ${i}</p>`).join("")}
    <button id="hidden-by-bar">Behind the bar</button>
    <div style="position:fixed;inset:auto 0 0 0;block-size:120px;background:var(--piq-color-surface)">A fixed bar</div></div>`),
};

before(async () => {
  server = createServer((req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    if (PAGES[path]) { res.writeHead(200, { "content-type": "text/html" }); res.end(PAGES[path]); return; }
    const file = FILES[path] ?? (path.startsWith("/fonts/") || path.startsWith("/brand/") ? join(PKG, "../tokens/dist", path) : null);
    if (!file || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": { ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png" }[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server?.close());

const problems = (r) => r.findings.filter((f) => f.severity === "error" || ["reflow", "target-size", "focus-obscured"].includes(f.check));
const show = (fs) => JSON.stringify(fs.map((f) => `${f.check} ${f.selector ?? ""} ${f.message} [${f.runs.join(" ")}]`), null, 1);

describe("SDK-20 audit at every size class", () => {
  let mistakes;
  before(async () => { mistakes = await audit({ urls: [`${base}/layout-mistakes.html`], themes: ["praxis-carbon"], appearances: ["light"], widths: [320, 1280] }); });

  // @covers US-034-AC1
  test("AC1: every theme and appearance runs at each width: themes × appearances × widths runs", async () => {
    assert.deepEqual(mistakes.runs.map((r) => `${r.theme}/${r.appearance}@${r.width}`), ["praxis-carbon/light@320", "praxis-carbon/light@1280"]);
    const r = await audit({ urls: [`${base}/layout.html`], themes: ["praxis-carbon", "databricks"], widths: [360, 1366] });
    assert.equal(r.runs.length, 2 * 2 * 2);
  });

  // @covers US-034-AC2
  test("AC2: each run records its width, in the JSON and the HTML report, and each finding names the widths it was seen at", async () => {
    assert.ok(mistakes.runs.every((r) => typeof r.width === "number"));
    const reflow = mistakes.findings.find((f) => f.check === "reflow");
    assert.ok(reflow.runs.every((x) => /@\d+$/.test(x)));
    const { html } = await import("../report.mjs");
    const withShots = await audit({ urls: [`${base}/layout.html`], themes: ["praxis-carbon"], appearances: ["light"], widths: [360, 1366], out: join(tmpdir(), `widths-${process.pid}`) });
    const page = html(withShots);
    assert.match(page, /360px/);
    assert.match(page, /1366px/);
    assert.match(page, /theme × appearance × width runs/);
  });

  // @covers US-034-AC3
  test("AC3: a page that scrolls sideways at 320px is reported with its widest element; a region that scrolls by itself is not", () => {
    const f = mistakes.findings.filter((x) => x.check === "reflow");
    assert.equal(f.length, 1);
    assert.equal(f[0].severity, "warning");
    assert.match(f[0].message, /scrolls sideways at 320px/);
    assert.match(f[0].selector, /#wide/, "the widest element, not the 1400px child of the scrolling region");
    assert.deepEqual(f[0].runs, ["praxis-carbon/light@320"], "not at 1280px, where it fits");
  });

  // @covers US-034-AC4
  test("AC4: a control under the minimum target size is reported with its size; an inline link in a sentence is not", () => {
    const f = mistakes.findings.filter((x) => x.check === "target-size");
    assert.ok(f.some((x) => x.selector.includes("#tiny") && /12×12px target, under the 24px minimum/.test(x.message)));
    assert.ok(!f.some((x) => /(^|> )a(\[|\.|:|$)/.test(x.selector)), "inline links are exempt");
  });

  // @covers US-034-AC5
  test("AC5: a control hidden behind fixed content when focused is reported, naming what covers it", () => {
    const f = mistakes.findings.filter((x) => x.check === "focus-obscured");
    assert.ok(f.some((x) => x.selector.includes("#hidden-by-bar") && /hidden behind/.test(x.message)), show(f));
  });

  test("without --width the audit reports as before: none of the new checks", async () => {
    const r = await audit({ urls: [`${base}/layout-mistakes.html`], themes: ["praxis-carbon"], appearances: ["light"] });
    assert.deepEqual(r.findings.filter((f) => ["reflow", "target-size", "focus-obscured"].includes(f.check)), []);
    assert.equal(r.runs[0].width, undefined);
  });

  // Run the CLI without blocking this process, which serves the pages it audits; its report goes in a folder of its own.
  const cwd = mkdtempSync(join(tmpdir(), "audit-patterns-"));
  after(() => rmSync(cwd, { recursive: true, force: true }));
  const run = (args) => new Promise((done) => {
    const p = spawn(process.execPath, [join(PKG, "cli.mjs"), ...args], { cwd });
    let stdout = "", stderr = "";
    p.stdout.on("data", (d) => { stdout += d; });
    p.stderr.on("data", (d) => { stderr += d; });
    p.on("close", (status) => done({ status, stdout, stderr }));
  });
  test("the CLI takes --width and rejects one that is not a width", async () => {
    const bad = await run(["--width", "wide", `${base}/layout.html`]);
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /--width is a whole number of CSS pixels/);
    const ok = await run(["--json", "--off", "brand", "--width", "360", "--width", "1366", "--theme", "praxis-carbon", "--appearance", "light", `${base}/layout.html`]);
    assert.equal(ok.status, 0, ok.stderr + JSON.stringify(JSON.parse(ok.stdout || "{}").findings?.filter((f) => f.severity === "error")));
    assert.deepEqual(JSON.parse(ok.stdout).runs.map((r) => r.width), [360, 1366]);
  });

  // @covers US-034-AC7
  test("AC7: a page whose only findings are the new checks exits 0 at the default failure level, as warnings", async () => {
    const r = await run(["--json", "--off", "brand", "--width", "320", "--theme", "praxis-carbon", "--appearance", "light", `${base}/only-layout.html`]);
    const report = JSON.parse(r.stdout);
    assert.ok(report.findings.length > 0);
    assert.deepEqual([...new Set(report.findings.map((f) => f.check))].filter((x) => !["reflow", "target-size", "focus-obscured", "theme-applied"].includes(x)), []);
    assert.ok(report.findings.filter((f) => f.check !== "theme-applied").every((f) => f.severity === "warning"));
    assert.equal(r.status, 0, r.stderr);
  });

  // @covers US-032-AC6 @covers US-034-AC6
  test("US-032-AC6, US-034-AC6: a contrast failure inside a builder preview is reported against that preview's option and design system", async () => {
    const r = await audit({ urls: [`${base}/preview.html`], themes: ["praxis-carbon"], appearances: ["light"], widths: [1280] });
    const c = r.findings.filter((f) => f.check === "contrast");
    assert.equal(c.length, 1, show(c));
    assert.equal(c[0].preview, "Bold:carbon:light:collection");
    assert.match(c[0].message, /in the preview Bold:carbon:light:collection/);
  });
});

describe("the screen patterns audited at every size class", () => {
  // The three pages audit in parallel: every theme × appearance × width each.
  let results;
  before(async () => { const urls = ["/layout.html", "/list.html", "/variants.html", "/extended.html"]; const all = await Promise.all(urls.map((u) => audit({ urls: [`${base}${u}`], widths: WIDTHS }))); results = Object.fromEntries(urls.map((u, i) => [u, all[i]])); });
  const all = async (url) => results[url];

  // @covers US-023-AC7
  test("US-023-AC7: the layout primitives report no errors at one width per size class in every theme and appearance", async () => {
    const r = await all("/layout.html");
    assert.ok(r.runs.length >= WIDTHS.length * 7, `${r.runs.length} runs`);
    assert.deepEqual(problems(r), [], show(problems(r)));
  });

  // @covers US-025-AC8
  test("US-025-AC8: the collection list in the shell reports no errors at every width, theme and appearance, and the page never scrolls sideways", async () => {
    const r = await all("/list.html");
    assert.deepEqual(problems(r), [], show(problems(r)));
  });

  // @covers US-030-AC7
  test("US-030-AC7: every variant point reports no errors, contrast or target-size findings at every width, theme and appearance", async () => {
    const r = await all("/variants.html");
    assert.deepEqual(problems(r), [], show(problems(r)));
    assert.deepEqual(r.findings.filter((f) => f.check === "contrast"), [], "contrast, including the SDK's own");
  });

  test("the extended screens report no errors and none of the size-class checks at every width, theme and appearance", async () => {
    const r = await all("/extended.html");
    assert.deepEqual(problems(r), [], show(problems(r)));
  });

  test("patterns.css is the SDK's own CSS, not the app restyling widgets", async () => {
    const r = await audit({ urls: [`${base}/list.html`], themes: ["praxis-carbon"], appearances: ["light"] });
    assert.deepEqual(r.findings.filter((f) => f.check === "widget-overrides"), []);
  });
});

describe("the app's own markup inside the SDK's frame and patterns", () => {
  let r;
  before(async () => { r = await audit({ urls: [`${base}/app-in-shell.html`], themes: ["praxis-carbon"], appearances: ["light"] }); });
  const at = (id) => r.findings.filter((f) => (f.selector ?? "").includes(`#${id}`));

  test("is held to the theme: colours, fonts, radii, icons and controls it draws itself", () => {
    assert.ok(at("bar").some((f) => f.check === "token-colors" && f.severity === "error"), "the bar's hard-coded grey");
    assert.ok(at("bar").some((f) => f.check === "token-fonts"), "Inter");
    assert.ok(at("bar").some((f) => f.check === "token-radii"), "a 12px corner");
    assert.ok(at("bar-button").some((f) => f.check === "token-colors" && f.severity === "error"), "the button's purple");
    assert.ok(at("bar-button").some((f) => f.check === "contrast" && f.severity === "error"), "the app's contrast failure is an error, not the SDK's warning");
    assert.ok(at("bar-icon").some((f) => f.check === "sdk-widgets" && f.severity === "error"), "an icon drawn inside the app's styled markup");
    assert.ok(at("bare-icon").some((f) => f.check === "sdk-widgets" && f.severity === "error"), "an unstyled icon placed straight into a Stack");
    assert.ok(at("bare-button").some((f) => f.check === "sdk-widgets"), "a native button placed straight into a Stack");
    assert.ok(at("bar-input").some((f) => f.check === "sdk-widgets"), "a native text input");
  });

  test("while the SDK's widgets and their parts stay trusted: table cells, the menu button, the appearance switch", () => {
    const ours = new Set(["bar", "bar-icon", "bar-input", "bar-button", "bare-icon", "bare-button"]);
    const others = r.findings.filter((f) => f.selector && ![...ours].some((id) => f.selector.includes(`#${id}`)));
    assert.deepEqual(others.map((f) => `${f.check}: ${f.selector}`), []);
  });

  test("a bundler's :is() of patterns.css is still the SDK's own CSS", async () => {
    const m = await audit({ urls: [`${base}/merged.html`], themes: ["praxis-carbon"], appearances: ["light"] });
    assert.deepEqual(m.findings.filter((f) => f.check === "widget-overrides"), []);
  });
});
