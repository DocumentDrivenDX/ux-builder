/* Combobox and Tooltip (US-033; FEAT-004 SDK-19), against the built
   package: roles, keyboard and state as the WAI-ARIA Authoring Practices
   describe them.

     npm run build && npm test --workspace @ux-builder/ui */

import "./dom.mjs";
import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { act, createElement as h, useState } from "react";
import { createRoot } from "react-dom/client";
import { Button, Combobox, Icon, Tooltip } from "../dist/index.js";

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
const type = (el, value) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, value);
  el.dispatchEvent(new window.Event("input", { bubbles: true }));
});
const fire = (el, name) => act(() => { el.dispatchEvent(new window.MouseEvent(name, { bubbles: false })); });

const CITIES = ["Amsterdam", "Athens", "Auckland", "Barcelona", "Beijing", "Berlin", "Bogotá", "Boston", "Brussels", "Buenos Aires", "Cairo", "Cape Town", "Chicago", "Copenhagen", "Dallas", "Delhi", "Dubai", "Dublin", "Frankfurt", "Geneva", "Hong Kong", "Houston", "Istanbul", "Jakarta", "Johannesburg", "Lagos", "Lima", "Lisbon", "London", "Los Angeles", "Madrid", "Manila", "Melbourne", "Mexico City", "Miami", "Milan", "Montreal", "Mumbai", "Munich", "Nairobi"].map((label, i) => ({ value: `c${i}`, label }));
function Picker({ onChoose = () => {} }) {
  const [value, setValue] = useState(undefined);
  return h(Combobox, { label: "Office", options: CITIES, value, onChange: (v) => { setValue(v); onChoose(v); } });
}

describe("US-033 combobox", () => {
  // @covers US-033-AC1
  test("AC1: typing opens a listbox of only the matching options; the input is a combobox that names its listbox and expanded state", () => {
    assert.equal(CITIES.length, 40);
    const el = render(h(Picker));
    const box = el.querySelector('[role="combobox"]');
    assert.equal(box.labels[0].textContent, "Office");
    assert.equal(box.getAttribute("aria-expanded"), "false");
    type(box, "lo");
    assert.equal(box.getAttribute("aria-expanded"), "true");
    const list = document.getElementById(box.getAttribute("aria-controls"));
    assert.equal(list.getAttribute("role"), "listbox");
    assert.equal(list.hidden, false);
    assert.deepEqual([...list.querySelectorAll('[role="option"]')].map((o) => o.textContent), ["London", "Los Angeles"]);
    assert.equal(box.getAttribute("aria-autocomplete"), "list");
  });

  // @covers US-033-AC2
  test("AC2: Down and Up move the active option, marked and referenced by aria-activedescendant, while focus stays in the input", () => {
    const el = render(h(Picker));
    const box = el.querySelector('[role="combobox"]');
    box.focus();
    type(box, "b");
    const active = () => document.getElementById(box.getAttribute("aria-activedescendant"));
    assert.equal(active().textContent, "Barcelona");
    key(box, "ArrowDown");
    assert.equal(active().textContent, "Beijing");
    assert.ok(active().classList.contains("is-hover"), "visibly marked");
    key(box, "ArrowUp");
    assert.equal(active().textContent, "Barcelona");
    assert.equal(document.activeElement, box);
  });

  // @covers US-033-AC3
  test("AC3: Enter chooses the active option: the input shows it, the popup closes and the app gets the value", () => {
    const chosen = [];
    const el = render(h(Picker, { onChoose: (v) => chosen.push(v) }));
    const box = el.querySelector('[role="combobox"]');
    type(box, "lon");
    key(box, "Enter");
    assert.deepEqual(chosen, ["c28"]);
    assert.equal(box.value, "London");
    assert.equal(box.getAttribute("aria-expanded"), "false");
    assert.equal(document.getElementById(box.getAttribute("aria-controls")).hidden, true);
  });

  // @covers US-033-AC4
  test("AC4: Escape closes the popup without changing the choice; focus stays", () => {
    const chosen = [];
    const el = render(h(Picker, { onChoose: (v) => chosen.push(v) }));
    const box = el.querySelector('[role="combobox"]');
    box.focus();
    type(box, "lon");
    key(box, "Enter");
    type(box, "par");
    key(box, "Escape");
    assert.equal(box.getAttribute("aria-expanded"), "false");
    assert.equal(box.value, "London", "the choice is unchanged");
    assert.deepEqual(chosen, ["c28"]);
    assert.equal(document.activeElement, box);
  });

  // @covers US-033-AC5
  test("AC5: no match shows an announced message, and Enter chooses nothing", () => {
    const chosen = [];
    const el = render(h(Picker, { onChoose: (v) => chosen.push(v) }));
    const box = el.querySelector('[role="combobox"]');
    type(box, "zzz");
    const status = el.querySelector('[role="status"]');
    assert.equal(status.textContent, "No matches");
    assert.equal(el.querySelectorAll('[role="option"]').length, 0);
    key(box, "Enter");
    assert.deepEqual(chosen, []);
  });
});

describe("US-033 tooltip", () => {
  const withTip = () => render(h(Tooltip, { content: "Download the matter's documents" }, h(Button, { variant: "text", "aria-label": "Download" }, h(Icon, { name: "download" }))));

  // @covers US-033-AC6
  test("AC6: shown on hover or keyboard focus with the tooltip role, referenced by aria-describedby; hidden when both leave", () => {
    const el = withTip();
    const btn = el.querySelector("button"), tip = el.querySelector('[role="tooltip"]'), anchor = el.querySelector(".piq-tooltip-anchor");
    assert.equal(btn.getAttribute("aria-describedby"), tip.id);
    assert.equal(tip.hidden, true);
    fire(anchor, "mouseenter");
    assert.equal(tip.hidden, false);
    fire(anchor, "mouseleave");
    assert.equal(tip.hidden, true);
    act(() => btn.focus());
    assert.equal(tip.hidden, false, "keyboard focus shows it");
    fire(anchor, "mouseenter");
    fire(anchor, "mouseleave");
    assert.equal(tip.hidden, false, "still focused");
    act(() => btn.blur());
    assert.equal(tip.hidden, true);
  });

  // @covers US-033-AC7
  test("AC7: Escape hides it without moving focus; moving onto the tooltip keeps it shown", () => {
    const el = withTip();
    const btn = el.querySelector("button"), tip = el.querySelector('[role="tooltip"]'), anchor = el.querySelector(".piq-tooltip-anchor");
    act(() => btn.focus());
    key(btn, "Escape");
    assert.equal(tip.hidden, true);
    assert.equal(document.activeElement, btn);
    act(() => btn.blur());
    fire(anchor, "mouseenter");
    assert.ok(anchor.contains(tip), "the tooltip is inside the hover area, so moving onto it is not leaving");
    assert.equal(tip.hidden, false);
  });

  // @covers US-033-AC8
  test("AC8: an icon-only button keeps its own name; the tooltip's text is its description", () => {
    const el = withTip();
    const btn = el.querySelector("button");
    assert.equal(btn.getAttribute("aria-label"), "Download");
    assert.equal(document.getElementById(btn.getAttribute("aria-describedby")).textContent, "Download the matter's documents");
    const both = render(h(Tooltip, { content: "More" }, h("button", { "aria-describedby": "hint" }, "x")));
    assert.match(both.querySelector("button").getAttribute("aria-describedby"), /^hint \S+$/, "an existing description is kept");
  });
});
