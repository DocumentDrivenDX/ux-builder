/* The settings screen (US-029; FEAT-006 SCR-10), against the built package.
   settings.browser.test.mjs checks the layout and a narrowing container in
   Chromium.

     npm run build && npm test --workspace @ux-builder/ui */

import "./dom.mjs";
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { SettingsPage } from "../dist/patterns.js";

let root, host;
function render(el) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(el));
  return host;
}
afterEach(() => { act(() => root?.unmount()); host?.remove(); root = null; });
const click = (el) => act(() => { el.click(); });
const frame = () => act(() => new Promise((r) => requestAnimationFrame(() => r())));
const text = (el) => el?.textContent.trim();

let width = 1366;
beforeEach(() => {
  window.ResizeObserver = globalThis.ResizeObserver = class { constructor(cb) { this.cb = cb; } observe() {} disconnect() {} };
  window.HTMLElement.prototype.getBoundingClientRect = function () { return { width, height: 0, top: 0, left: 0, right: width, bottom: 0 }; };
});
const SECTIONS = [
  { id: "profile", label: "Profile", content: h("p", null, "Profile settings") },
  { id: "notifications", label: "Notifications", content: h("p", null, "Notification settings") },
  { id: "billing", label: "Billing", disabled: "Only owners can change billing", content: h("p", null, "Billing") },
  { id: "members", label: "Members", hidden: true, content: h("p", null, "Members") },
];
const navButton = (el, name) => [...el.querySelectorAll(".piq-settings__nav button")].find((b) => text(b) === name);
const openSection = (el) => el.querySelector(".piq-settings__section:not([hidden])");

describe("US-029 settings", () => {
  // @covers US-029-AC2
  test("AC2: below expanded it opens on the list of sections; choosing one shows it alone with a link back", async () => {
    width = 390;
    const el = render(h(SettingsPage, { sections: SECTIONS }));
    const split = el.querySelector(".piq-split");
    assert.equal(split.dataset.show, "primary", "the list first");
    click(navButton(el, "Notifications"));
    await frame();
    assert.equal(split.dataset.show, "secondary");
    assert.equal(text(openSection(el).querySelector("h2")), "Notifications");
    const back = el.querySelector(".piq-settings__back");
    assert.equal(text(back), "All settings");
    click(back);
    await frame();
    assert.equal(split.dataset.show, "primary");
    assert.equal(document.activeElement, navButton(el, "Notifications"), "back on the section it opened");
  });

  // @covers US-029-AC3
  test("AC3: section navigation is a labelled landmark; the current section is marked aria-current=true", () => {
    const el = render(h(SettingsPage, { sections: SECTIONS }));
    const nav = el.querySelector("nav");
    assert.equal(nav.getAttribute("aria-label"), "Settings sections");
    assert.equal(navButton(el, "Profile").getAttribute("aria-current"), "true");
    click(navButton(el, "Notifications"));
    assert.equal(navButton(el, "Profile").getAttribute("aria-current"), null);
    assert.equal(navButton(el, "Notifications").getAttribute("aria-current"), "true");
    assert.equal(text(openSection(el).querySelector("h2")), "Notifications");
    assert.equal(el.querySelectorAll('[aria-current="true"]').length, 1);
  });

  // @covers US-029-AC4
  test("AC4: moving to a section by keyboard puts focus on its heading", async () => {
    const el = render(h(SettingsPage, { sections: SECTIONS }));
    navButton(el, "Notifications").focus();
    click(navButton(el, "Notifications"));
    await frame();
    assert.equal(document.activeElement, openSection(el).querySelector("h2"));
    assert.equal(document.activeElement.tabIndex, -1);
  });

  // @covers US-029-AC5
  test("AC5: a hidden section is left out, a disabled one states why; with none usable the screen says so", () => {
    const changes = [];
    const el = render(h(SettingsPage, { sections: SECTIONS, onChange: (id) => changes.push(id) }));
    assert.equal(navButton(el, "Members"), undefined, "hidden");
    const billing = navButton(el, "Billing");
    assert.equal(billing.getAttribute("aria-disabled"), "true");
    assert.equal(text(document.getElementById(billing.getAttribute("aria-describedby"))), "Only owners can change billing");
    click(billing);
    assert.deepEqual(changes, [], "a disabled section cannot be opened");
    act(() => root.unmount()); host.remove(); root = null;
    const none = render(h(SettingsPage, { sections: [{ id: "billing", label: "Billing", disabled: "Owners only", content: null }] }));
    assert.equal(text(none.querySelector(".piq-state-panel__title")), "You don't have access to this");
    assert.equal(text(none.querySelector("h1")), "Settings");
  });

  test("controlled: the app owns the current section", () => {
    const el = render(h(SettingsPage, { sections: SECTIONS, current: "notifications" }));
    assert.equal(navButton(el, "Notifications").getAttribute("aria-current"), "true");
  });
});
