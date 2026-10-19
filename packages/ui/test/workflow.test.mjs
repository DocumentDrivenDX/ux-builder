/* Wizards, task lists, review, editable grids, work queues, import and
   export (US-035 to US-038; FEAT-006 WIZ-01, WIZ-02, REV-01, GRID-01,
   QUEUE-01, IMP-01, EXP-01), against the built package.
   workflow.browser.test.mjs checks the wizard's size classes in Chromium.

     npm run build && npm test --workspace @ux-builder/ui */

import "./dom.mjs";
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { act, createElement as h, useState } from "react";
import { createRoot } from "react-dom/client";
import { TextField } from "../dist/index.js";
import { EditableGrid, ExportDialog, ImportFlow, ReviewConfirm, TaskList, WorkQueue, Wizard } from "../dist/patterns.js";

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
const type = (el, value) => act(() => {
  const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
  el.dispatchEvent(new window.Event("input", { bubbles: true }));
});
const text = (el) => el?.textContent.trim();
const button = (el, name) => [...el.querySelectorAll("button")].find((b) => text(b) === name);
const byLabel = (el, label) => { const l = [...el.querySelectorAll("label")].find((x) => x.textContent.trim() === label); return l && (l.control ?? document.getElementById(l.htmlFor)); };

let width = 1024;
beforeEach(() => {
  window.ResizeObserver = globalThis.ResizeObserver = class { constructor(cb) { this.cb = cb; } observe() {} disconnect() {} };
  window.HTMLElement.prototype.getBoundingClientRect = function () { return { width, height: 0, top: 0, left: 0, right: width, bottom: 0 }; };
});

const STEPS = [
  { id: "client", title: "Client", content: ({ errors }) => h(TextField, { label: "Client name", name: "client", error: errors.client }), validate: (d) => ({ client: d.client ? null : "Enter the client's name" }) },
  { id: "matter", title: "Matter", content: h(TextField, { label: "Matter name", name: "matter" }) },
  { id: "billing", title: "Billing", content: ({ data }) => h("div", null, h("p", { className: "earlier" }, `Billing for ${data.client ?? ""}`), h(TextField, { label: "Rate", name: "rate" })) },
  { id: "team", title: "Team", content: h(TextField, { label: "Partner", name: "partner" }) },
];

describe("US-035 wizard, task list and review", () => {
  // @covers US-035-AC1
  test("AC1: the heading reads Step 2 of 5 with the title, the step list marks it current, and a progress bar exposes it", () => {
    const el = render(h(Wizard, { steps: STEPS, review: () => h("p", null, "Review") }));
    type(byLabel(el, "Client name"), "Acme");
    click(button(el, "Continue"));
    assert.equal(text(el.querySelector("h2")), "Step 2 of 5: Matter");
    const current = el.querySelector('.piq-wizard__steps [aria-current="step"]');
    assert.equal(text(current), "Matter");
    assert.equal(el.querySelectorAll(".piq-wizard__steps li").length, 5);
    const bar = el.querySelector('.piq-wizard__progress [role="progressbar"]');
    assert.deepEqual([bar.getAttribute("aria-valuenow"), bar.getAttribute("aria-valuemax"), bar.getAttribute("aria-valuetext")], ["2", "5", "Step 2 of 5"]);
  });

  // @covers US-035-AC2
  test("AC2: an invalid field keeps the wizard on its step with the step's errors; valid, it moves on", () => {
    const el = render(h(Wizard, { steps: STEPS }));
    click(button(el, "Continue"));
    assert.equal(text(el.querySelector("h2")), "Step 1 of 4: Client");
    assert.equal(text(el.querySelector(".piq-error-summary a")), "Enter the client's name");
    assert.equal(text(el.querySelector(".piq-field__error")), "Enter the client's name");
    type(byLabel(el, "Client name"), "Acme");
    click(button(el, "Continue"));
    assert.equal(text(el.querySelector("h2")), "Step 2 of 4: Matter");
    assert.equal(el.querySelector(".piq-error-summary"), null);
  });

  // @covers US-035-AC3
  test("AC3: going back and forward keeps every value entered", () => {
    const el = render(h(Wizard, { steps: STEPS }));
    type(byLabel(el, "Client name"), "Acme");
    click(button(el, "Continue"));
    type(byLabel(el, "Matter name"), "Acme v. Beta");
    click(button(el, "Back"));
    assert.equal(byLabel(el, "Client name").value, "Acme");
    click(button(el, "Continue"));
    assert.equal(byLabel(el, "Matter name").value, "Acme v. Beta");
  });

  // @covers US-035-AC4
  test("AC4: Save draft gives the app what has been entered, and stays on the step", () => {
    const drafts = [];
    const el = render(h(Wizard, { steps: STEPS, onSaveDraft: (d) => drafts.push(d) }));
    type(byLabel(el, "Client name"), "Acme");
    click(button(el, "Continue"));
    type(byLabel(el, "Matter name"), "Acme v. Beta");
    click(button(el, "Save draft"));
    assert.equal(drafts.length, 1);
    assert.equal(drafts[0].client, "Acme");
    assert.equal(drafts[0].matter, "Acme v. Beta");
    assert.equal(text(el.querySelector("h2")), "Step 2 of 4: Matter");
  });

  // @covers US-035-AC5
  test("AC5: a later step shows an answer given earlier instead of asking for it again, and the last step is the review", () => {
    const el = render(h(Wizard, { steps: STEPS, review: (d) => h("p", { className: "summary" }, `Client ${d.client}, matter ${d.matter}`) }));
    type(byLabel(el, "Client name"), "Acme");
    click(button(el, "Continue"));
    click(button(el, "Continue"));
    assert.equal(text(el.querySelector(".earlier")), "Billing for Acme");
    assert.equal(el.querySelectorAll('input[name="client"]').length, 1, "the client is not asked for again");
    click(button(el, "Continue"));
    click(button(el, "Continue"));
    assert.equal(text(el.querySelector("h2")), "Step 5 of 5: Check your answers");
    assert.equal(text(el.querySelector(".piq-wizard__panel:not([hidden]) .summary")), "Client Acme, matter");
  });

  // @covers US-035-AC6
  test("AC6: a task list of six sections links each with its status in text, and counts the completed", () => {
    const statuses = ["completed", "completed", "in-progress", "not-started", "not-started", "not-started"];
    const el = render(h(TaskList, { title: "Open a matter", sections: statuses.map((status, i) => ({ id: `s${i}`, label: `Section ${i + 1}`, href: `#s${i}`, status })) }));
    assert.equal(text(el.querySelector(".piq-task-list__count")), "2 of 6 sections completed");
    const items = [...el.querySelectorAll(".piq-task-list__item")];
    assert.equal(items.length, 6);
    assert.deepEqual(items.map((li) => text(li.querySelector(".piq-task-list__status"))), ["Completed", "Completed", "In progress", "Not started", "Not started", "Not started"]);
    assert.ok(items.every((li) => li.querySelector("a").getAttribute("href")));
    assert.equal(document.getElementById(items[2].querySelector("a").getAttribute("aria-describedby")).textContent, "In progress");
  });

  // @covers US-035-AC7
  test("AC7: review shows answers by section with a Change link each, and says what submitting does before the button", () => {
    const el = render(h(ReviewConfirm, { consequence: "Submitting opens the matter and notifies the partner.", sections: [
      { id: "client", title: "Client", href: "#client", answers: [{ label: "Name", value: "Acme" }] },
      { id: "matter", title: "Matter", href: "#matter", answers: [{ label: "Name", value: "Acme v. Beta" }, { label: "Rate", value: "£450" }] },
    ] }));
    const sections = [...el.querySelectorAll(".piq-review__section")];
    assert.equal(sections.length, 2);
    assert.deepEqual(sections.map((s) => text(s.querySelector(".piq-review__change"))), ["Change Client", "Change Matter"], "each link names its section");
    assert.equal(sections[1].querySelectorAll("dt").length, 2);
    const consequence = el.querySelector(".piq-review__consequence");
    assert.ok(consequence.compareDocumentPosition(button(el, "Submit")) & window.Node.DOCUMENT_POSITION_FOLLOWING);
  });

  // @covers US-035-AC8
  test("AC8: after submitting, a confirmation panel shows the result and the reference", () => {
    const el = render(h(ReviewConfirm, { result: { title: "Matter opened", reference: "M-2026-0412", text: "The partner has been told." } }));
    const panel = el.querySelector(".piq-confirmation");
    assert.equal(panel.getAttribute("role"), "status");
    assert.equal(text(panel.querySelector("h2")), "Matter opened");
    assert.match(text(panel), /Reference M-2026-0412/);
    assert.equal(document.activeElement, panel);
  });
});

const COLS = [{ key: "task", label: "Task" }, { key: "hours", label: "Hours", numeric: true }, { key: "fee", label: "Fee", numeric: true }];
function Grid({ initial, errors }) {
  const [rows, setRows] = useState(initial ?? [{ id: 1, task: "Draft", hours: 2, fee: 900 }, { id: 2, task: "Review", hours: 1, fee: 450 }]);
  let n = 10;
  return h(EditableGrid, { label: "Time entries", columns: COLS, rows, onChange: setRows, errors, newRow: () => ({ id: n++, task: "", hours: 0, fee: 0 }) });
}

describe("US-036 editable grid", () => {
  const cell = (el, r, c) => el.querySelector(`[data-r="${r}"][data-c="${c}"]`);
  const totals = (el) => [...el.querySelectorAll("tfoot td")].map(text);

  // @covers US-036-AC1
  test("AC1: a grid that is one stop in the Tab order; arrow keys move between cells", async () => {
    const el = render(h(Grid));
    const grid = el.querySelector('[role="grid"]');
    assert.equal(grid.getAttribute("aria-label"), "Time entries");
    assert.equal(grid.querySelectorAll('[tabindex="0"]').length, 1, "one Tab stop");
    cell(el, 0, 0).focus();
    key(cell(el, 0, 0), "ArrowRight"); await frame();
    assert.equal(document.activeElement, cell(el, 0, 1));
    key(document.activeElement, "ArrowDown"); await frame();
    assert.equal(document.activeElement, cell(el, 1, 1));
    key(document.activeElement, "Home"); await frame();
    assert.equal(document.activeElement, cell(el, 1, 0));
    assert.equal(grid.querySelectorAll('[tabindex="0"]').length, 1);
    assert.ok([...grid.querySelectorAll("tbody td")].every((td) => td.getAttribute("role") === "gridcell"));
  });

  // @covers US-036-AC2 @covers US-036-AC6
  test("AC2, AC6: Enter edits a cell, Enter commits and returns focus; the totals include the new value", async () => {
    const el = render(h(Grid));
    assert.deepEqual(totals(el), ["Total", "3", "1350", ""]);
    cell(el, 0, 0).focus();
    key(cell(el, 0, 0), "ArrowRight"); await frame();
    key(cell(el, 0, 1), "Enter");
    const input = cell(el, 0, 1).querySelector("input");
    assert.equal(input.value, "2");
    type(input, "5");
    key(input, "Enter"); await frame();
    assert.equal(text(cell(el, 0, 1)), "5");
    assert.equal(document.activeElement, cell(el, 0, 1));
    assert.deepEqual(totals(el), ["Total", "6", "1350", ""]);
    key(cell(el, 0, 1), "F2");
    assert.ok(cell(el, 0, 1).querySelector("input"), "F2 edits too");
  });

  // @covers US-036-AC3
  test("AC3: Escape discards the change and returns focus to the cell", async () => {
    const el = render(h(Grid));
    cell(el, 0, 0).focus();
    key(cell(el, 0, 0), "Enter");
    const input = cell(el, 0, 0).querySelector("input");
    type(input, "Something else");
    key(input, "Escape"); await frame();
    assert.equal(text(cell(el, 0, 0)), "Draft");
    assert.equal(document.activeElement, cell(el, 0, 0));
  });

  // @covers US-036-AC4
  test("AC4: an added row is reachable by keyboard; a removed row is gone from the totals", async () => {
    const el = render(h(Grid));
    click(button(el, "Add row")); await frame();
    assert.equal(el.querySelectorAll("tbody tr").length, 3);
    assert.equal(document.activeElement, cell(el, 2, 0), "focus on the new row");
    click(el.querySelector('[aria-label="Remove row 1"]'));
    assert.equal(el.querySelectorAll("tbody tr").length, 2);
    assert.deepEqual(totals(el), ["Total", "1", "450", ""]);
  });

  // @covers US-036-AC5
  test("AC5: a value the app reports invalid marks its cell, with the message tied to it", () => {
    const el = render(h(Grid, { errors: { 2: { hours: "Hours must be under 24" } } }));
    const c = cell(el, 1, 1);
    assert.equal(c.getAttribute("aria-invalid"), "true");
    assert.equal(text(document.getElementById(c.getAttribute("aria-describedby"))), "Hours must be under 24");
    assert.equal(cell(el, 0, 1).getAttribute("aria-invalid"), null);
  });

  // @covers US-036-AC7
  test("AC7: in a 390px container choosing a row opens a sheet of its fields; saving updates the row and totals, closing returns focus", async () => {
    width = 390;
    const el = render(h(Grid));
    cell(el, 0, 0).focus();
    key(cell(el, 0, 0), "Enter");
    const sheet = el.querySelector("dialog.piq-sheet");
    assert.equal(sheet.open, true);
    assert.equal(text(sheet.querySelector("h2")), "Edit row 1");
    type(byLabel(sheet, "Hours"), "4");
    act(() => { sheet.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })); });
    await frame();
    assert.equal(sheet.open, false);
    assert.equal(text(cell(el, 0, 1)), "4");
    assert.deepEqual(totals(el), ["Total", "5", "1350", ""]);
    assert.equal(document.activeElement, cell(el, 0, 0));
    width = 1024;
  });
});

describe("US-037 work queue", () => {
  const ITEMS = Array.from({ length: 12 }, (_, i) => ({ id: `i${i + 1}`, title: `Invoice ${i + 1}`, content: h("p", null, `Details ${i + 1}`) }));
  function Queue(props) {
    const [index, setIndex] = useState(2);
    return h(WorkQueue, { items: ITEMS, index, onIndexChange: setIndex, people: [{ id: "rl", label: "R. Lee" }], ...props });
  }

  // @covers US-037-AC1
  test("AC1: one item with its position, and next and previous", () => {
    const el = render(h(Queue));
    assert.equal(text(el.querySelector(".piq-queue__position")), "3 of 12");
    assert.equal(text(el.querySelector(".piq-queue__title")), "Invoice 3");
    click(button(el, "Next"));
    assert.equal(text(el.querySelector(".piq-queue__position")), "4 of 12");
    click(button(el, "Previous"));
    click(button(el, "Previous"));
    assert.equal(text(el.querySelector(".piq-queue__title")), "Invoice 2");
  });

  // @covers US-037-AC2
  test("AC2: approve gives the app that item", () => {
    const got = [];
    const el = render(h(Queue, { onApprove: (i) => got.push(i.id) }));
    click(button(el, "Approve"));
    assert.deepEqual(got, ["i3"]);
  });

  // @covers US-037-AC3
  test("AC3: reject needs a comment; with one the app gets the rejection and the comment", () => {
    const got = [];
    const el = render(h(Queue, { onReject: (i, c) => got.push([i.id, c]) }));
    click(button(el, "Reject"));
    const dialog = el.querySelector("dialog[open]");
    const area = byLabel(dialog, "Comment");
    assert.equal(area.getAttribute("aria-required"), "true");
    act(() => { dialog.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })); });
    assert.deepEqual(got, []);
    assert.equal(text(dialog.querySelector(".piq-field__error")), "A comment is required to reject");
    type(area, "Wrong rate");
    act(() => { dialog.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })); });
    assert.deepEqual(got, [["i3", "Wrong rate"]]);
  });

  // @covers US-037-AC4
  test("AC4: assign and pick a person gives the app the item and the person", () => {
    const got = [];
    const el = render(h(Queue, { onAssign: (i, p) => got.push([i.id, p.id]) }));
    click(el.querySelector('.piq-queue__actions .piq-menubutton button'));
    click([...el.querySelectorAll('[role="menuitem"]')].find((m) => text(m) === "R. Lee"));
    assert.deepEqual(got, [["i3", "rl"]]);
  });

  // @covers US-037-AC5
  test("AC5: the shortcuts help is a modal dialog listing each shortcut, and closing returns focus", () => {
    const el = render(h(Queue));
    const opener = button(el, "Keyboard shortcuts");
    opener.focus();
    click(opener);
    const d = [...el.querySelectorAll("dialog[open]")].find((x) => text(x.querySelector("h2")) === "Keyboard shortcuts");
    assert.deepEqual([...d.querySelectorAll("tbody tr")].map((r) => [...r.cells].map(text)), [["J", "Next item"], ["K", "Previous item"], ["A", "Approve"], ["R", "Reject"]]);
    click(button(d, "Close"));
    assert.equal(d.open, false);
    assert.equal(document.activeElement, opener);
  });

  // @covers US-037-AC6
  test("AC6: single-key shortcuts work and can be turned off; off, the key does nothing", () => {
    const el = render(h(Queue));
    key(document.body, "j");
    assert.equal(text(el.querySelector(".piq-queue__position")), "4 of 12");
    click(button(el, "Keyboard shortcuts"));
    const sw = el.querySelector('dialog[open] input[role="switch"]');
    click(sw);
    assert.equal(sw.checked, false);
    click(button(el.querySelector("dialog[open]"), "Close"));
    key(document.body, "j");
    assert.equal(text(el.querySelector(".piq-queue__position")), "4 of 12", "turned off");
  });

  // @covers US-037-AC7
  test("AC7: an empty queue says there is nothing to review, with no item actions", () => {
    const el = render(h(WorkQueue, { items: [] }));
    assert.equal(text(el.querySelector(".piq-state-panel__title")), "Nothing to review");
    assert.equal(button(el, "Approve"), undefined);
  });
});

describe("US-038 import and export", () => {
  const file = new window.File(["a,b,c"], "matters.csv", { type: "text/csv" });
  function Flow(props) { return h(ImportFlow, { columns: ["Name", "Client", "Rate"], fields: [{ value: "name", label: "Matter name" }, { value: "client", label: "Client" }, { value: "rate", label: "Rate" }], ...props }); }
  const steps = (el) => [...el.querySelectorAll(".piq-import__steps li")];

  // @covers US-038-AC1
  test("AC1: the steps are upload, map, validate, preview and import, with the current step marked, then the result", () => {
    const el = render(h(Flow));
    assert.deepEqual(steps(el).map(text), ["Upload", "Map columns", "Validate", "Preview", "Import"]);
    assert.equal(text(el.querySelector('[aria-current="step"]')), "Upload");
    unmount();
    const done = render(h(Flow, { result: h("p", null, "48 matters imported") }));
    assert.equal(done.querySelector('[aria-current="step"]'), null);
    assert.equal(text(done.querySelector(".piq-import__result")), "48 matters imported");
  });

  // @covers US-038-AC2
  test("AC2: a file chosen with the button or dropped reaches the app", () => {
    const got = [];
    const el = render(h(Flow, { onFile: (f) => got.push(f.name) }));
    const input = el.querySelector('input[type="file"]');
    assert.ok(button(el, "Choose a file"), "a button, not only drag and drop");
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    act(() => { input.dispatchEvent(new window.Event("change", { bubbles: true })); });
    const drop = new window.Event("drop", { bubbles: true, cancelable: true });
    drop.dataTransfer = { files: [new window.File(["x"], "dropped.csv")] };
    act(() => { el.querySelector(".piq-import__drop").dispatchEvent(drop); });
    assert.deepEqual(got, ["matters.csv", "dropped.csv"]);
  });

  // @covers US-038-AC3 @covers US-038-AC4 @covers US-038-AC5
  test("AC3-AC5: each column gets a field; errors by row with the failed rows; the preview, the commit and the result", () => {
    const maps = [], commits = [];
    function App() {
      const [result, setResult] = useState(null);
      return h(Flow, { onMap: (m) => maps.push(m), onCommit: () => { commits.push(1); setResult(h("p", null, "2 matters imported")); }, result,
        errors: [{ row: 4, message: "Rate is not a number" }, { row: 9, message: "Client is missing" }], failedRowsHref: "/failed.csv",
        preview: { columns: [{ key: "name", label: "Matter name" }], rows: [{ name: "Acme v. Beta" }, { name: "Globex" }] } });
    }
    const el = render(h(App));
    const input = el.querySelector('input[type="file"]');
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    act(() => { input.dispatchEvent(new window.Event("change", { bubbles: true })); });
    click(button(el, "Continue"));
    const selects = [...el.querySelectorAll(".piq-import__mapping select")];
    assert.deepEqual(selects.map((s) => s.labels[0].textContent), ["File column “Name”", "File column “Client”", "File column “Rate”"]);
    for (const [s, v] of [[selects[0], "name"], [selects[1], "client"], [selects[2], "rate"]]) act(() => { s.value = v; s.dispatchEvent(new window.Event("change", { bubbles: true })); });
    click(button(el, "Continue"));
    assert.deepEqual(maps, [{ Name: "name", Client: "client", Rate: "rate" }]);
    assert.deepEqual([...el.querySelectorAll(".piq-import__errors li")].map(text), ["Row 4: Rate is not a number", "Row 9: Client is missing"]);
    assert.equal(el.querySelector('.piq-import__errors a[download]').getAttribute("href"), "/failed.csv");
    click(button(el, "Continue"));
    assert.deepEqual([...el.querySelectorAll("tbody td")].map(text), ["Acme v. Beta", "Globex"]);
    click(button(el, "Import 2 rows"));
    assert.deepEqual(commits, [1]);
    assert.equal(text(el.querySelector(".piq-import__result")), "2 matters imported");
  });

  // @covers US-038-AC6
  test("AC6: export is a modal dialog to choose a format and fields; confirming gives them to the app", () => {
    const got = [];
    const el = render(h(ExportDialog, { open: true, formats: [{ value: "csv", label: "CSV" }, { value: "xlsx", label: "Excel" }], fields: [{ value: "name", label: "Name" }, { value: "rate", label: "Rate" }], onExport: (x) => got.push(x) }));
    const d = el.querySelector("dialog");
    assert.equal(d.open, true);
    click(d.querySelector('input[value="xlsx"]'));
    click(byLabel(d, "Rate"));
    click(button(d, "Export"));
    assert.deepEqual(got, [{ format: "xlsx", fields: ["name"] }]);
  });

  // @covers US-038-AC7
  test("AC7: a long export shows progress, announced, outside the closed dialog; ready, it links to the file", () => {
    const el = render(h(ExportDialog, { open: false, formats: [{ value: "csv", label: "CSV" }], fields: [{ value: "name", label: "Name" }], progress: 40 }));
    const status = el.querySelector('.piq-export__status[role="status"]');
    const bar = status.querySelector('[role="progressbar"]');
    assert.equal(bar.getAttribute("aria-valuenow"), "40");
    unmount();
    const ready = render(h(ExportDialog, { open: false, formats: [], fields: [], ready: { href: "/exports/matters.csv", label: "Download matters.csv" } }));
    const link = ready.querySelector('[role="status"] a');
    assert.deepEqual([link.getAttribute("href"), text(link)], ["/exports/matters.csv", "Download matters.csv"]);
  });
});
