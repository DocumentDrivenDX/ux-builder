/* The audit at every size class (FEAT-004 SDK-20) and the screen patterns
   audited with it (US-023-AC7, US-025-AC8, US-030-AC7, US-032-AC6): pages
   built from @ux-builder/ui/patterns, in every theme and appearance, at one
   width per size class, must report no errors and none of the new checks.

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { tmpdir } from "node:os";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, Checkbox, Tabs, TextField } from "@ux-builder/ui";
import { AppShell, Board, Calendar, CollectionList, Cluster, EditableGrid, FilterSection, Grid, Page, PeriodComparison, PermissionsMatrix, PivotTable, RecordDetail, SplitView, Stack, StatTile, TaskList, Wizard, WorkQueue } from "@ux-builder/ui/patterns";
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

const PAGES = {
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

const problems = (r) => r.findings.filter((f) => f.severity === "error" || ["reflow", "target-size", "focus-obscured"].includes(f.rule));
const show = (fs) => JSON.stringify(fs.map((f) => `${f.rule} ${f.selector ?? ""} ${f.message} [${f.runs.join(" ")}]`), null, 1);

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
    const reflow = mistakes.findings.find((f) => f.rule === "reflow");
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
    const f = mistakes.findings.filter((x) => x.rule === "reflow");
    assert.equal(f.length, 1);
    assert.equal(f[0].severity, "warning");
    assert.match(f[0].message, /scrolls sideways at 320px/);
    assert.match(f[0].selector, /#wide/, "the widest element, not the 1400px child of the scrolling region");
    assert.deepEqual(f[0].runs, ["praxis-carbon/light@320"], "not at 1280px, where it fits");
  });

  // @covers US-034-AC4
  test("AC4: a control under the minimum target size is reported with its size; an inline link in a sentence is not", () => {
    const f = mistakes.findings.filter((x) => x.rule === "target-size");
    assert.ok(f.some((x) => x.selector.includes("#tiny") && /12×12px target, under the 24px minimum/.test(x.message)));
    assert.ok(!f.some((x) => /(^|> )a(\[|\.|:|$)/.test(x.selector)), "inline links are exempt");
  });

  // @covers US-034-AC5
  test("AC5: a control hidden behind fixed content when focused is reported, naming what covers it", () => {
    const f = mistakes.findings.filter((x) => x.rule === "focus-obscured");
    assert.ok(f.some((x) => x.selector.includes("#hidden-by-bar") && /hidden behind/.test(x.message)), show(f));
  });

  test("without --width the audit reports as before: none of the new checks", async () => {
    const r = await audit({ urls: [`${base}/layout-mistakes.html`], themes: ["praxis-carbon"], appearances: ["light"] });
    assert.deepEqual(r.findings.filter((f) => ["reflow", "target-size", "focus-obscured"].includes(f.rule)), []);
    assert.equal(r.runs[0].width, undefined);
  });

  // Run the CLI without blocking this process, which serves the pages it audits.
  const run = (args) => new Promise((done) => {
    const p = spawn(process.execPath, [join(PKG, "cli.mjs"), ...args]);
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
    assert.deepEqual([...new Set(report.findings.map((f) => f.rule))].filter((x) => !["reflow", "target-size", "focus-obscured", "theme-applied"].includes(x)), []);
    assert.ok(report.findings.filter((f) => f.rule !== "theme-applied").every((f) => f.severity === "warning"));
    assert.equal(r.status, 0, r.stderr);
  });

  // @covers US-032-AC6 @covers US-034-AC6
  test("US-032-AC6, US-034-AC6: a contrast failure inside a builder preview is reported against that preview's option and design system", async () => {
    const r = await audit({ urls: [`${base}/preview.html`], themes: ["praxis-carbon"], appearances: ["light"], widths: [1280] });
    const c = r.findings.filter((f) => f.rule === "contrast");
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
    assert.deepEqual(r.findings.filter((f) => f.rule === "contrast"), [], "contrast, including the SDK's own");
  });

  test("the extended screens report no errors and none of the size-class checks at every width, theme and appearance", async () => {
    const r = await all("/extended.html");
    assert.deepEqual(problems(r), [], show(problems(r)));
  });

  test("patterns.css is the SDK's own CSS, not the app restyling widgets", async () => {
    const r = await audit({ urls: [`${base}/list.html`], themes: ["praxis-carbon"], appearances: ["light"] });
    assert.deepEqual(r.findings.filter((f) => f.rule === "widget-overrides"), []);
  });
});
