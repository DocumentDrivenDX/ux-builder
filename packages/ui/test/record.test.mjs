/* Record detail and list with detail (US-026; FEAT-006 SCR-04, SCR-05,
   REG-04, REG-05, REG-08, RSP-08), against the built package.
   record.browser.test.mjs checks columns, panes and focus in Chromium.

     npm run build && npm test --workspace @ux-builder/ui */

import "./dom.mjs";
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { act, createElement as h, useState } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "../dist/index.js";
import { DescriptionList, ListDetail, RecordDetail, TabsSection, Timeline } from "../dist/patterns.js";

let root, host;
function render(el) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(el));
  return host;
}
afterEach(() => { act(() => root?.unmount()); host?.remove(); root = null; });
const key = (el, k) => act(() => { el.dispatchEvent(new window.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true })); });
const click = (el) => act(() => { el.click(); });
const frame = () => act(() => new Promise((r) => requestAnimationFrame(() => r())));
const text = (el) => el?.textContent.trim();

let width = 1024;
const observers = new Set();
beforeEach(() => {
  observers.clear();
  window.ResizeObserver = globalThis.ResizeObserver = class { constructor(cb) { this.cb = cb; observers.add(this); } observe() {} disconnect() { observers.delete(this); } };
  window.HTMLElement.prototype.getBoundingClientRect = function () { return { width, height: 0, top: 0, left: 0, right: width, bottom: 0 }; };
});

const ITEMS = ["Acme v. Beta", "Globex v. Initech", "Hooli v. Pied Piper"].map((label, i) => ({ id: `r${i}`, label }));
function Screen({ initial = "r0", status }) {
  const [selected, setSelected] = useState(initial);
  const item = ITEMS.find((i) => i.id === selected);
  return h(ListDetail, {
    items: ITEMS, selected, onSelect: setSelected, listLabel: "Matters",
    detail: h(RecordDetail, { title: item?.label, status: status ?? (item ? "ready" : "empty"), statusPill: h("span", { className: "pill" }, "Open"), actions: h(Button, null, "Edit"), fields: [{ label: "Client", value: "Acme" }] }),
  });
}

describe("US-026 list with detail", () => {
  // @covers US-026-AC2
  test("AC2: at expanded size the list is a listbox; Down and Up move the selection and the detail follows", () => {
    width = 1024;
    const el = render(h(Screen));
    const box = el.querySelector('[role="listbox"]');
    assert.equal(box.getAttribute("aria-label"), "Matters");
    const options = () => [...el.querySelectorAll('[role="option"]')];
    assert.deepEqual(options().map((o) => o.getAttribute("aria-selected")), ["true", "false", "false"]);
    assert.deepEqual(options().map((o) => o.tabIndex), [0, -1, -1], "one option in the tab order");
    options()[0].focus();
    key(options()[0], "ArrowDown");
    assert.equal(document.activeElement, options()[1]);
    assert.deepEqual(options().map((o) => o.getAttribute("aria-selected")), ["false", "true", "false"]);
    assert.equal(text(el.querySelector(".piq-record h1")), "Globex v. Initech");
    key(document.activeElement, "End");
    assert.equal(text(el.querySelector(".piq-record h1")), "Hooli v. Pied Piper");
    key(document.activeElement, "ArrowUp");
    assert.equal(text(el.querySelector(".piq-record h1")), "Globex v. Initech");
  });

  // @covers US-026-AC3
  test("AC3: below expanded, choosing a record opens its own view with Back, and Back returns to the list on that record", async () => {
    width = 800;
    const el = render(h(Screen, { initial: null }));
    const split = el.querySelector(".piq-split");
    assert.equal(split.dataset.show, "primary", "the list first");
    const options = () => [...el.querySelectorAll('[role="option"]')];
    options()[0].focus();
    key(options()[0], "ArrowDown");
    assert.equal(document.activeElement, options()[1], "arrows move focus");
    assert.equal(split.dataset.show, "primary", "but do not open a record below expanded");
    key(options()[1], "Enter");
    await frame();
    assert.equal(split.dataset.show, "secondary", "the record's own view");
    assert.equal(text(el.querySelector(".piq-record h1")), "Globex v. Initech");
    assert.ok(el.querySelector(".piq-list-detail__detail").contains(document.activeElement), "focus moves into the record");
    const back = el.querySelector(".piq-list-detail__back");
    assert.equal(text(back), "Back");
    click(back);
    await frame();
    assert.equal(split.dataset.show, "primary");
    assert.equal(document.activeElement, options()[1], "back on the record it opened");
  });

  test("a deep link to a record below expanded opens the record's own view", () => {
    width = 390;
    const el = render(h(Screen, { initial: "r2" }));
    assert.equal(el.querySelector(".piq-split").dataset.show, "secondary");
  });

  test("at expanded size the pane that holds focus is recorded, so a narrower layout keeps it", () => {
    width = 1024;
    const el = render(h(Screen));
    const split = el.querySelector(".piq-split");
    act(() => { el.querySelector(".piq-record button").focus(); });
    assert.equal(split.dataset.show, "secondary");
    act(() => { el.querySelector('[role="option"]').focus(); });
    assert.equal(split.dataset.show, "primary");
  });

  // @covers US-026-AC8
  test("AC8: no record chosen, a failed load or a record the user may not see shows a state panel; the list stays usable", () => {
    width = 1024;
    for (const [props, title, role] of [[{ initial: null }, "Choose a record", "status"], [{ status: "error" }, "This didn't load", "alert"], [{ status: "forbidden" }, "You don't have access to this", "status"]]) {
      const el = render(h(Screen, props));
      const panel = el.querySelector(".piq-list-detail__detail .piq-state-panel");
      assert.equal(text(panel.querySelector(".piq-state-panel__title")), title);
      assert.equal(panel.getAttribute("role"), role);
      assert.equal(el.querySelectorAll('[role="option"]').length, 3, "the list is still there");
      act(() => root.unmount()); host.remove(); root = null;
    }
    const retried = [];
    const el = render(h(RecordDetail, { status: "error", onRetry: () => retried.push(1) }));
    click([...el.querySelectorAll("button")].find((b) => text(b) === "Try again"));
    assert.deepEqual(retried, [1]);
  });
});

describe("US-026 record detail", () => {
  // @covers US-026-AC5
  test("AC5: the record's header shows its status and actions; its fields are a description list", () => {
    const el = render(h(RecordDetail, { title: "Acme v. Beta", statusPill: h("span", { className: "pill" }, "Open"), actions: h(Button, null, "Edit"), overflow: [{ label: "Archive" }],
      fields: [{ label: "Client", value: "Acme" }, { label: "Owner", value: "R. Lee" }, { label: "Summary", value: "Contract dispute", wide: true }] }));
    assert.equal(text(el.querySelector("h1")), "Acme v. Beta");
    assert.equal(text(el.querySelector(".piq-page-header__heading .pill")), "Open");
    assert.ok([...el.querySelectorAll(".piq-page-header__actions button")].some((b) => text(b) === "Edit"));
    const dl = el.querySelector("dl");
    assert.deepEqual([...dl.querySelectorAll("dt")].map(text), ["Client", "Owner", "Summary"]);
    assert.deepEqual([...dl.querySelectorAll("dd")].map(text), ["Acme", "R. Lee", "Contract dispute"]);
    assert.equal(dl.querySelector("[data-wide]").querySelector("dt").textContent, "Summary");
    assert.ok([...dl.children].every((c) => c.tagName === "DIV" && c.querySelector(":scope > dt") && c.querySelector(":scope > dd")), "dt and dd pairs in div groups");
  });

  test("activity sits in a labelled supporting region", () => {
    const el = render(h(RecordDetail, { title: "Acme", activity: [{ id: 1, kind: "comment", actor: "R. Lee", action: "commented", time: "2026-10-01T10:00:00Z" }] }));
    assert.equal(el.querySelector("aside.piq-record__aside").getAttribute("aria-label"), "Activity");
  });

  // @covers US-026-AC6
  test("AC6: a tabs section keeps the chosen tab in the URL, restores it on reload, shows counts and follows the Tabs pattern", () => {
    window.history.replaceState(null, "", "/matters/r0");
    const tabs = [{ id: "overview", label: "Overview", panel: "O" }, { id: "documents", label: "Documents", count: 12, panel: "D" }, { id: "billing", label: "Billing", panel: "B" }];
    let el = render(h(TabsSection, { tabs, label: "Matter" }));
    const tab = (name) => [...el.querySelectorAll('[role="tab"]')].find((t) => t.textContent.startsWith(name));
    assert.equal(text(tab("Documents").querySelector(".piq-tabs__count")), "12");
    assert.equal(el.querySelector('[role="tablist"]').getAttribute("aria-label"), "Matter");
    click(tab("Documents"));
    assert.equal(new URLSearchParams(window.location.search).get("tab"), "documents");
    assert.equal(tab("Documents").getAttribute("aria-selected"), "true");
    tab("Documents").focus();
    key(tab("Documents"), "ArrowRight");
    assert.equal(document.activeElement, tab("Billing"));
    assert.equal(new URLSearchParams(window.location.search).get("tab"), "billing");
    // Reload: a new mount reads the URL.
    act(() => root.unmount()); host.remove(); root = null;
    el = render(h(TabsSection, { tabs, label: "Matter" }));
    assert.equal(el.querySelector('[aria-selected="true"]').textContent, "Billing");
    assert.equal(text(el.querySelector('[role="tabpanel"]:not([hidden])')), "B");
  });

  // @covers US-026-AC7
  test("AC7: the timeline lists events newest first with actor, action and time, each kind named in text with its own icon", () => {
    const events = [
      { id: "a", kind: "system", actor: "Import", action: "created the matter", time: "2026-10-01T09:00:00Z" },
      { id: "b", kind: "comment", actor: "R. Lee", action: "commented", time: "2026-10-03T14:30:00Z", body: "Called the client." },
      { id: "c", kind: "change", actor: "S. Patel", action: "changed status to Open", time: "2026-10-02T11:00:00Z" },
    ];
    const el = render(h(Timeline, { events, locale: "en-GB" }));
    const items = [...el.querySelectorAll("ol > li")];
    assert.deepEqual(items.map((li) => li.dataset.kind), ["comment", "change", "system"], "newest first");
    assert.deepEqual(items.map((li) => text(li.querySelector(".piq-timeline__kind"))), ["Comment", "Change", "System"]);
    assert.deepEqual(items.map((li) => text(li.querySelector(".piq-timeline__actor"))), ["R. Lee", "S. Patel", "Import"]);
    assert.equal(text(items[1].querySelector(".piq-timeline__action")), "changed status to Open");
    assert.equal(items[0].querySelector("time").getAttribute("datetime"), "2026-10-03T14:30:00.000Z");
    assert.match(text(items[0].querySelector("time")), /3 Oct 2026/);
    const glyphs = items.map((li) => li.querySelector(".piq-timeline__mark").outerHTML);
    assert.equal(new Set(glyphs).size, 3, "a different icon for each kind");
    assert.equal(el.querySelector("section").getAttribute("aria-label"), "Activity");
    const oldest = render(h(Timeline, { events, order: "oldest" }));
    assert.deepEqual([...oldest.querySelectorAll("ol > li")].map((li) => li.dataset.kind), ["system", "change", "comment"]);
  });

  test("a description list shows a dash for a missing value", () => {
    const el = render(h(DescriptionList, { items: [{ label: "Closed", value: null }] }));
    assert.equal(text(el.querySelector("dd")), "—");
  });
});
