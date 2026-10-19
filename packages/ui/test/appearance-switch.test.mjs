/* AppearanceSwitch: light, the system's setting or dark as three icons in a
   radio group, against the built package.

     npm run build && npm run test:ui */

import "./dom.mjs";
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { act, createElement as h, useState } from "react";
import { createRoot } from "react-dom/client";
import { AppearanceSwitch } from "../dist/index.js";

let root, host;
function render(el) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(el));
  return host;
}
afterEach(() => { act(() => root?.unmount()); host?.remove(); });
const radios = (el) => [...el.querySelectorAll('[role="radio"]')];
const key = (el, k) => act(() => { el.dispatchEvent(new window.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true })); });

function Live({ start = "system", ...props }) { const [v, setV] = useState(start); return h(AppearanceSwitch, { ...props, value: v, onChange: setV }); }

test("a labelled radio group of Light, Auto and Dark, each an icon with its name, the chosen one checked", () => {
  const el = render(h(AppearanceSwitch, { value: "dark" }));
  const group = el.querySelector('[role="radiogroup"]');
  assert.equal(group.getAttribute("aria-label"), "Appearance");
  assert.deepEqual(radios(el).map((r) => [r.getAttribute("aria-label"), r.getAttribute("aria-checked"), r.tabIndex]), [["Light", "false", -1], ["Auto", "false", -1], ["Dark", "true", 0]]);
  assert.ok(radios(el).every((r) => r.querySelector("svg.piq-icon")), "each shows an icon");
});

test("clicking or the arrow keys choose, and focus follows; Home and End go to the ends", () => {
  const el = render(h(Live));
  act(() => radios(el)[0].click());
  assert.equal(radios(el)[0].getAttribute("aria-checked"), "true");
  key(radios(el)[0], "ArrowRight");
  assert.equal(radios(el)[1].getAttribute("aria-checked"), "true");
  assert.equal(document.activeElement, radios(el)[1]);
  key(radios(el)[1], "End");
  assert.equal(radios(el)[2].getAttribute("aria-checked"), "true");
  key(radios(el)[2], "ArrowRight");
  assert.equal(radios(el)[0].getAttribute("aria-checked"), "true", "it wraps");
});

test("an appearance the theme lacks is disabled and skipped", () => {
  const el = render(h(Live, { available: ["light"], start: "light" }));
  assert.deepEqual(radios(el).map((r) => r.disabled), [false, false, true]);
  key(radios(el)[0], "ArrowLeft");
  assert.equal(radios(el)[1].getAttribute("aria-checked"), "true", "Dark is skipped, so left from Light wraps to Auto");
});
