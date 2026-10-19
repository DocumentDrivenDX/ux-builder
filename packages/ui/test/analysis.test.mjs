/* Boards, calendars, attachments, drill-downs, comparisons, print layouts,
   pivots, report builders and subscriptions (US-039 to US-041; FEAT-006
   BOARD-01, CAL-01, ATT-01, DRILL-01, CMP-01, PRINT-01, PIVOT-01, RB-01,
   SUB-01), against the built package. analysis.browser.test.mjs checks
   printing in Chromium.

     npm run build && npm test --workspace @ux-builder/ui */

import "./dom.mjs";
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { act, createElement as h, useState } from "react";
import { createRoot } from "react-dom/client";
import { Attachments, Board, Calendar, DrillDown, PeriodComparison, PivotTable, PrintLayout, ReportBuilder, Subscriptions, useDrillPath } from "../dist/patterns.js";

let root, host;
function render(el) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(el));
  return host;
}
const unmount = () => { act(() => root?.unmount()); host?.remove(); root = null; };
afterEach(unmount);
const key = (el, k) => act(() => { el.dispatchEvent(new window.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true })); });
const click = (el) => act(() => { el.click(); });
const frame = () => act(() => new Promise((r) => requestAnimationFrame(() => r())));
const type = (el, value) => act(() => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, value); el.dispatchEvent(new window.Event("input", { bubbles: true })); });
const text = (el) => el?.textContent.trim();
const button = (el, name) => [...el.querySelectorAll("button")].find((b) => text(b) === name || b.getAttribute("aria-label") === name);
const byLabel = (el, label) => { const l = [...el.querySelectorAll("label")].find((x) => x.textContent.trim() === label); return l && (l.control ?? document.getElementById(l.htmlFor)); };

let width = 1024;
beforeEach(() => {
  window.ResizeObserver = globalThis.ResizeObserver = class { constructor(cb) { this.cb = cb; } observe() {} disconnect() {} };
  window.HTMLElement.prototype.getBoundingClientRect = function () { return { width, height: 0, top: 0, left: 0, right: width, bottom: 0 }; };
});

const COLUMNS = [{ id: "todo", title: "To do" }, { id: "doing", title: "Doing" }, { id: "review", title: "Review" }, { id: "done", title: "Done" }];
function BoardApp({ log = [] }) {
  const [cards, setCards] = useState([{ id: "a", title: "Draft claim", status: "todo" }, { id: "b", title: "File defence", status: "todo" }, { id: "c", title: "Disclosure", status: "doing" }]);
  return h(Board, { label: "Matter tasks", columns: COLUMNS, cards, onMove: (card, status) => { log.push([card.id, status]); setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, status } : c))); } });
}

describe("US-039 board, calendar and attachments", () => {
  const headings = (el) => [...el.querySelectorAll(".piq-board__heading")].map(text);

  // @covers US-039-AC1
  test("AC1: at medium size and above each status is a column with its heading and count", () => {
    const el = render(h(BoardApp));
    assert.deepEqual(headings(el), ["To do (2)", "Doing (1)", "Review (0)", "Done (0)"]);
    assert.equal(el.querySelectorAll(".piq-board__column").length, 4);
  });

  // @covers US-039-AC2
  test("AC2: a card moves by its Move to menu or by drag; the app gets it and both counts change", () => {
    const log = [];
    const el = render(h(BoardApp, { log }));
    const menu = el.querySelector('.piq-board__card .piq-menubutton button');
    assert.equal(menu.getAttribute("aria-label"), "Move to: Draft claim");
    assert.equal(menu.getAttribute("aria-haspopup"), "menu");
    menu.focus();
    key(menu, "Enter");
    assert.deepEqual([...el.querySelectorAll('[role="menuitem"]')].map(text), ["Doing", "Review", "Done"]);
    click([...el.querySelectorAll('[role="menuitem"]')].find((m) => text(m) === "Review"));
    assert.deepEqual(headings(el), ["To do (1)", "Doing (1)", "Review (1)", "Done (0)"]);
    const card = [...el.querySelectorAll(".piq-board__card")].find((c) => text(c.querySelector(".piq-board__card-title")) === "Disclosure");
    const dt = { data: {}, setData(k, v) { this.data[k] = v; }, getData(k) { return this.data[k]; } };
    const ev = (name, target) => { const e = new window.Event(name, { bubbles: true, cancelable: true }); e.dataTransfer = dt; act(() => { target.dispatchEvent(e); }); };
    assert.equal(card.getAttribute("draggable"), "true");
    ev("dragstart", card);
    ev("drop", el.querySelectorAll(".piq-board__column")[3]);
    assert.deepEqual(log, [["a", "review"], ["c", "done"]]);
    assert.deepEqual(headings(el), ["To do (1)", "Doing (0)", "Review (1)", "Done (1)"]);
  });

  // @covers US-039-AC3
  test("AC3: in a 390px container one column shows at a time with tabs to switch", () => {
    width = 390;
    const el = render(h(BoardApp));
    const tabs = [...el.querySelectorAll('[role="tab"]')];
    assert.deepEqual(tabs.map((t) => t.textContent), ["To do2", "Doing1", "Review0", "Done0"]);
    assert.equal(el.querySelectorAll('[role="tabpanel"]:not([hidden]) .piq-board__column').length, 1);
    click(tabs[1]);
    assert.deepEqual([...el.querySelectorAll('[role="tabpanel"]:not([hidden]) .piq-board__card-title')].map(text), ["Disclosure"]);
    width = 1024;
  });

  const EVENTS = [{ id: 1, title: "Hearing", start: "2026-10-14T09:30:00" }, { id: 2, title: "Client call", start: "2026-10-14T14:00:00" }, { id: 3, title: "Filing deadline", start: "2026-10-20T17:00:00" }];

  // @covers US-039-AC4
  test("AC4: month, week and day views; the month is a grid the arrow keys move through; events named with their time", async () => {
    const el = render(h(Calendar, { events: EVENTS, date: "2026-10-14T00:00:00", locale: "en-GB" }));
    const radios = [...el.querySelectorAll('[role="radiogroup"] [role="radio"]')];
    assert.deepEqual(radios.map(text), ["Month", "Week", "Day"]);
    const grid = el.querySelector('[role="grid"]');
    assert.equal(grid.getAttribute("aria-label"), "October 2026");
    const focusDay = grid.querySelector('[tabindex="0"]');
    assert.equal(focusDay.dataset.date, "2026-10-14");
    assert.deepEqual([...focusDay.querySelectorAll(".piq-calendar__event")].map(text), ["09:30 Hearing", "14:00 Client call"]);
    focusDay.focus();
    key(focusDay, "ArrowRight"); await frame();
    assert.equal(document.activeElement.dataset.date, "2026-10-15");
    key(document.activeElement, "ArrowDown"); await frame();
    assert.equal(document.activeElement.dataset.date, "2026-10-22");
    assert.equal(grid.querySelectorAll('[tabindex="0"]').length, 1);
    click(radios[1]);
    assert.ok(el.querySelector(".piq-calendar__week"));
    assert.equal(el.querySelectorAll(".piq-calendar__week-day").length, 7);
    click(radios[2]);
    assert.match(text(el.querySelector(".piq-calendar__single h3")), /Wednesday 14 October/);
  });

  // @covers US-039-AC5
  test("AC5: in a 390px container it is an agenda list grouped by date", () => {
    width = 390;
    const el = render(h(Calendar, { events: EVENTS, date: "2026-10-14T00:00:00", locale: "en-GB" }));
    assert.equal(el.querySelector('[role="grid"]'), null);
    const days = [...el.querySelectorAll(".piq-calendar__agenda-day")];
    assert.deepEqual(days.map((d) => text(d.querySelector("h3"))), ["Wednesday 14 October", "Tuesday 20 October"]);
    assert.deepEqual([...days[0].querySelectorAll("li")].map(text), ["09:30 Hearing", "14:00 Client call"]);
    width = 1024;
  });

  const FILES = [{ id: "f1", name: "claim.pdf", href: "/files/claim.pdf", type: "PDF", size: 248000, version: "v2" }];

  // @covers US-039-AC6
  test("AC6: upload by the button or a drop reaches the app; each file has its name as a link, type, size and version", () => {
    const got = [];
    const el = render(h(Attachments, { files: FILES, onUpload: (f) => got.push(f.name) }));
    assert.ok(button(el, "Upload a file"));
    const input = el.querySelector('input[type="file"]');
    Object.defineProperty(input, "files", { value: [new window.File(["x"], "letter.docx")], configurable: true });
    act(() => { input.dispatchEvent(new window.Event("change", { bubbles: true })); });
    const drop = new window.Event("drop", { bubbles: true, cancelable: true });
    drop.dataTransfer = { files: [new window.File(["y"], "dropped.pdf")] };
    act(() => { el.querySelector(".piq-attachments").dispatchEvent(drop); });
    assert.deepEqual(got, ["letter.docx", "dropped.pdf"]);
    const row = el.querySelector("tbody tr");
    assert.deepEqual([...row.cells].slice(0, 4).map(text), ["claim.pdf", "PDF", "242 KB", "v2"]);
    assert.equal(row.querySelector("a").getAttribute("href"), "/files/claim.pdf");
  });

  // @covers US-039-AC7
  test("AC7: removing a file asks first, naming it; confirm removes, cancel keeps", () => {
    const removed = [];
    const el = render(h(Attachments, { files: FILES, onRemove: (f) => removed.push(f.id) }));
    click(button(el, "Remove claim.pdf"));
    let d = el.querySelector("dialog[open]");
    assert.equal(text(document.getElementById(d.getAttribute("aria-labelledby"))), "Remove claim.pdf?");
    click(button(d, "Cancel"));
    assert.deepEqual(removed, []);
    click(button(el, "Remove claim.pdf"));
    d = el.querySelector("dialog[open]");
    click(button(d, "Remove"));
    assert.deepEqual(removed, ["f1"]);
  });
});

describe("US-040 drill-down, comparison and print", () => {
  function Drill() {
    const { path, drill, goTo } = useDrillPath({ param: "drill" });
    const trail = [{ label: "All practices" }, ...path.map((p) => ({ label: p }))];
    return h(DrillDown, { trail, onSelect: goTo }, h("button", { onClick: () => drill(path.length ? "Partner R. Lee" : "Litigation") }, "Drill"));
  }

  // @covers US-040-AC1 @covers US-040-AC2
  test("AC1, AC2: the trail lists each level with the current marked; levels are in the URL; Back and links return", async () => {
    window.history.replaceState(null, "", "/reports");
    let el = render(h(Drill));
    click(button(el, "Drill"));
    click(button(el, "Drill"));
    const items = () => [...el.querySelectorAll(".piq-drill__trail li")];
    assert.deepEqual(items().map(text), ["All practices", "Litigation", "Partner R. Lee"]);
    assert.equal(items()[2].querySelector('[aria-current="location"]').textContent, "Partner R. Lee");
    assert.equal(el.querySelector('nav').getAttribute("aria-label"), "Levels");
    assert.equal(new URLSearchParams(window.location.search).get("drill"), "Litigation/Partner R. Lee");
    unmount();
    el = render(h(Drill));
    assert.deepEqual([...el.querySelectorAll(".piq-drill__trail li")].map(text), ["All practices", "Litigation", "Partner R. Lee"], "the URL restores the level");
    window.history.replaceState(null, "", "/reports?drill=Litigation");
    act(() => { window.dispatchEvent(new window.PopStateEvent("popstate")); });
    assert.deepEqual([...el.querySelectorAll(".piq-drill__trail li")].map(text), ["All practices", "Litigation"], "Back returns to the level before");
    click(el.querySelector(".piq-drill__trail a"));
    assert.deepEqual([...el.querySelectorAll(".piq-drill__trail li")].map(text), ["All practices"]);
  });

  // @covers US-040-AC3
  test("AC3: both values, the signed difference, and the direction in words", () => {
    const el = render(h(PeriodComparison, { label: "Billed", current: 368, previous: 400, comparison: "on last quarter", format: (n) => `£${n}k` }));
    assert.equal(text(el.querySelector(".piq-comparison__current")), "£368k");
    assert.equal(text(el.querySelector(".piq-comparison__diff")), "−£32k");
    assert.equal(text(el.querySelector(".piq-comparison__words")), "down 8% on last quarter");
    unmount();
    const up = render(h(PeriodComparison, { label: "Hours", current: 110, previous: 100, comparison: "on target" }));
    assert.equal(text(up.querySelector(".piq-comparison__words")), "up 10% on target");
    assert.equal(text(up.querySelector(".piq-comparison__diff")), "+10");
  });

  // @covers US-040-AC4
  test("AC4: printing switches a dark theme to light and back, with a header of title, logo and run date", () => {
    const wrap = document.createElement("div");
    wrap.setAttribute("data-theme", "praxis"); wrap.setAttribute("data-appearance", "dark");
    document.body.append(wrap);
    host = document.createElement("div"); wrap.append(host);
    root = createRoot(host);
    act(() => root.render(h(PrintLayout, { title: "Aged debt", logo: h("img", { alt: "Acme", src: "data:," }), runDate: "2026-10-19T09:00:00", locale: "en-GB", sections: [{ id: "a", title: "Summary", content: h("p", null, "x") }] })));
    const header = host.querySelector(".piq-print__header");
    assert.equal(text(header.querySelector("h1")), "Aged debt");
    assert.ok(header.querySelector("img[alt='Acme']"));
    assert.match(text(header.querySelector(".piq-print__date")), /Run 19 October 2026/);
    act(() => { window.dispatchEvent(new window.Event("beforeprint")); });
    assert.equal(wrap.getAttribute("data-appearance"), "light");
    act(() => { window.dispatchEvent(new window.Event("afterprint")); });
    assert.equal(wrap.getAttribute("data-appearance"), "dark");
    unmount(); wrap.remove();
  });
});

describe("US-041 pivot, builder and subscriptions", () => {
  const GROUPS = [{ id: "corp", label: "Corporate", rows: [{ id: "ma", label: "M&A" }, { id: "eq", label: "Equity" }] }, { id: "lit", label: "Litigation", rows: [{ id: "com", label: "Commercial" }] }];
  const COLS = [{ key: "q1", label: "Q1" }, { key: "q2", label: "Q2" }];
  const VALUES = { ma: { q1: 10, q2: 20 }, eq: { q1: 5, q2: 5 }, com: { q1: 7, q2: 3 } };
  const pivot = () => render(h(PivotTable, { label: "Fees by practice", groups: GROUPS, columns: COLS, value: (r, k) => VALUES[r]?.[k] ?? 0 }));

  // @covers US-041-AC1
  test("AC1: row and column headers, a subtotal per group and a grand total", () => {
    const el = pivot();
    assert.equal(el.querySelector("table").getAttribute("role"), "treegrid");
    assert.deepEqual([...el.querySelectorAll("thead th")].map(text), ["Row", "Q1", "Q2", "Total"]);
    const groups = [...el.querySelectorAll(".piq-pivot__group")];
    assert.deepEqual(groups.map((g) => [...g.cells].map(text)), [["Corporate subtotal", "15", "25", "40"], ["Litigation subtotal", "7", "3", "10"]]);
    assert.deepEqual([...el.querySelectorAll("tfoot td")].map(text), ["22", "28", "50"]);
    assert.ok(groups.every((g) => g.querySelector('th[scope="row"]')));
  });

  // @covers US-041-AC2
  test("AC2: Right expands a group, Left collapses it, Up and Down move between visible rows", async () => {
    const el = pivot();
    const corp = el.querySelector('[data-row="corp"]');
    assert.equal(corp.getAttribute("aria-expanded"), "false");
    assert.equal(corp.getAttribute("aria-level"), "1");
    corp.focus();
    key(corp, "ArrowRight");
    assert.equal(el.querySelector('[data-row="corp"]').getAttribute("aria-expanded"), "true");
    assert.ok(el.querySelector('[data-row="ma"][aria-level="2"]'));
    key(el.querySelector('[data-row="corp"]'), "ArrowDown"); await frame();
    assert.equal(document.activeElement.dataset.row, "ma");
    key(document.activeElement, "ArrowDown"); await frame();
    key(document.activeElement, "ArrowDown"); await frame();
    assert.equal(document.activeElement.dataset.row, "lit");
    key(document.activeElement, "ArrowUp"); await frame();
    key(document.activeElement, "ArrowLeft"); await frame();
    assert.equal(document.activeElement.dataset.row, "corp", "Left on a child goes to its group");
    key(document.activeElement, "ArrowLeft");
    assert.equal(el.querySelector('[data-row="corp"]').getAttribute("aria-expanded"), "false");
    assert.equal(el.querySelector('[data-row="ma"]'), null);
  });

  const builder = (onSave = () => {}) => render(h(ReportBuilder, { measures: [{ value: "fees", label: "Fees" }, { value: "hours", label: "Hours" }], groupings: [{ value: "practice", label: "Practice" }],
    preview: ({ measures }) => [{ practice: "Corporate", fees: "£40k", hours: measures.includes("hours") ? "320" : undefined }], onSave }));

  // @covers US-041-AC3
  test("AC3: choosing measures and groupings updates the preview: groupings as rows, measures as columns", () => {
    const el = builder();
    click(byLabel(el, "Practice"));
    click(byLabel(el, "Fees"));
    assert.deepEqual([...el.querySelectorAll("thead th")].map(text), ["Practice", "Fees"]);
    assert.deepEqual([...el.querySelectorAll("tbody td")].map(text), ["Corporate", "£40k"]);
    click(byLabel(el, "Hours"));
    assert.deepEqual([...el.querySelectorAll("thead th")].map(text), ["Practice", "Fees", "Hours"]);
    click(byLabel(el, "Fees"));
    assert.deepEqual([...el.querySelectorAll("thead th")].map(text), ["Practice", "Hours"]);
  });

  // @covers US-041-AC4
  test("AC4: saving needs a name; with one the app gets the name and the choice", () => {
    const saved = [];
    const el = builder((x) => saved.push(x));
    click(byLabel(el, "Fees"));
    act(() => { el.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })); });
    assert.deepEqual(saved, []);
    assert.equal(text(el.querySelector(".piq-field__error")), "Enter a name for the report");
    assert.equal(byLabel(el, "Report name").getAttribute("aria-required"), "true");
    type(byLabel(el, "Report name"), "Fees by practice");
    act(() => { el.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })); });
    assert.deepEqual(saved, [{ name: "Fees by practice", measures: ["fees"], groupings: [] }]);
  });

  const SUBS = [
    { id: "s1", kind: "delivery", name: "Weekly aged debt", frequency: "Every Monday", recipients: ["cfo@acme.test"] },
    { id: "s2", kind: "alert", name: "Debt over £100k", threshold: "debt is over £100k", recipients: ["cfo@acme.test", "rl@acme.test"], paused: true },
  ];

  // @covers US-041-AC5
  test("AC5: each delivery shows its frequency and recipients, each alert its threshold and recipients", () => {
    const el = render(h(Subscriptions, { items: SUBS }));
    const details = [...el.querySelectorAll(".piq-subscriptions__detail")].map(text);
    assert.deepEqual(details, ["Every Monday · To cfo@acme.test", "Alert when debt is over £100k · To cfo@acme.test, rl@acme.test"]);
  });

  // @covers US-041-AC6
  test("AC6: adding gives the app the new subscription; pausing gives it the pause; a paused one says Paused", () => {
    const added = [], paused = [];
    const el = render(h(Subscriptions, { items: SUBS, onAdd: (s) => added.push(s), onPause: (s) => paused.push(s.id) }));
    assert.match(text(el.querySelectorAll(".piq-subscriptions__name")[1]), /Paused$/);
    click(button(el, "Pause Weekly aged debt"));
    assert.deepEqual(paused, ["s1"]);
    click(button(el, "Add"));
    const d = el.querySelector("dialog[open]");
    type(byLabel(d, "Name"), "Monthly fees");
    type(byLabel(d, "Recipients"), "a@acme.test, b@acme.test");
    act(() => { d.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })); });
    assert.deepEqual(added, [{ kind: "delivery", name: "Monthly fees", frequency: "Weekly", recipients: ["a@acme.test", "b@acme.test"] }]);
  });

  // @covers US-041-AC7
  test("AC7: deleting asks first, naming the subscription; confirm deletes, cancel keeps", () => {
    const deleted = [];
    const el = render(h(Subscriptions, { items: SUBS, onDelete: (s) => deleted.push(s.id) }));
    click(button(el, "Delete Weekly aged debt"));
    let d = el.querySelector("dialog[open]");
    assert.equal(text(document.getElementById(d.getAttribute("aria-labelledby"))), "Delete Weekly aged debt?");
    click(button(d, "Cancel"));
    assert.deepEqual(deleted, []);
    click(button(el, "Delete Weekly aged debt"));
    click(button(el.querySelector("dialog[open]"), "Delete"));
    assert.deepEqual(deleted, ["s1"]);
  });
});
