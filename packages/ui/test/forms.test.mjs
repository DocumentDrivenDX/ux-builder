/* Forms, quick edit and confirmation (US-027; FEAT-006 SCR-06, SCR-07,
   REG-09; FEAT-004 SDK-19 Dialog), against the built package.
   forms.browser.test.mjs checks the layout, the sticky actions and the
   modal focus in Chromium.

     npm run build && npm test --workspace @ux-builder/ui */

import "./dom.mjs";
import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { act, createElement as h, useState } from "react";
import { createRoot } from "react-dom/client";
import { Button, Dialog, TextField } from "../dist/index.js";
import { ConfirmDialog, FormPage, FormSection, QuickEdit, useFormState } from "../dist/patterns.js";

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
const type = (el, value) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, value);
  el.dispatchEvent(new window.Event("input", { bubbles: true }));
});
const blur = (el) => act(() => { el.focus(); el.blur(); el.dispatchEvent(new window.FocusEvent("focusout", { bubbles: true })); });
const text = (el) => el?.textContent.trim();
const field = (el, label) => [...el.querySelectorAll("label")].find((l) => l.textContent === label)?.control ?? el.querySelector(`#${CSS.escape([...el.querySelectorAll("label")].find((l) => l.textContent === label).htmlFor)}`);

const validate = (v) => ({ client: v.client ? null : "Enter the client", name: v.name ? null : "Enter the matter name" });
function NewMatter({ onSubmit = () => {}, onCancel = () => {} }) {
  const form = useFormState({ initial: { client: "", name: "", notes: "" }, validate, onSubmit });
  return h(FormPage, { title: "New matter", form, onCancel },
    h(FormSection, { title: "Matter" },
      h(TextField, { label: "Client", ...form.field("client") }),
      h(TextField, { label: "Matter name", ...form.field("name") })),
    h(TextField, { label: "Notes", ...form.field("notes") }));
}
globalThis.CSS ??= { escape: (s) => s.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`) };

describe("US-027 full-page form", () => {
  // @covers US-027-AC1
  test("AC1: fields are one column with each label above its field, in a form with Save and Cancel", () => {
    const el = render(h(NewMatter));
    const form = el.querySelector("form.piq-form-page");
    assert.equal(form.getAttribute("novalidate"), "");
    assert.equal(text(form.querySelector("h1")), "New matter");
    for (const f of form.querySelectorAll(".piq-field")) {
      const [first, second] = f.children;
      assert.equal(first.tagName, "LABEL", "label first");
      assert.equal(second.tagName, "INPUT");
      assert.equal(first.htmlFor, second.id);
    }
    assert.equal(form.querySelector("fieldset legend").textContent, "Matter");
    assert.deepEqual([...form.querySelectorAll(".piq-form-page__actions button")].map(text), ["Save", "Cancel"]);
    assert.equal(form.querySelector(".piq-form-page__actions button").type, "submit");
  });

  // @covers US-027-AC2
  test("AC2: an invalid field shows its error once left, tied to the field; a valid field shows none", () => {
    const el = render(h(NewMatter));
    const client = field(el, "Client");
    assert.equal(el.querySelector(".piq-field__error"), null, "no error before the field is left");
    blur(client);
    const err = el.querySelector(".piq-field__error");
    assert.equal(text(err), "Enter the client");
    assert.equal(client.getAttribute("aria-invalid"), "true");
    assert.ok(client.getAttribute("aria-describedby").split(" ").includes(err.id));
    type(client, "Acme");
    assert.equal(client.getAttribute("aria-invalid"), null);
    assert.equal(el.querySelectorAll(".piq-field__error").length, 0);
    blur(field(el, "Notes"));
    assert.equal(el.querySelectorAll(".piq-field__error").length, 0, "Notes has no rule");
  });

  // @covers US-027-AC3
  test("AC3: submitting with two invalid fields shows a summary that takes focus and links to each field", () => {
    const submitted = [];
    const el = render(h(NewMatter, { onSubmit: (v) => submitted.push(v) }));
    act(() => { el.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })); });
    const summary = el.querySelector(".piq-error-summary");
    assert.ok(summary, "summary shown");
    assert.equal(document.activeElement, summary, "summary has focus");
    assert.equal(summary.tabIndex, -1);
    assert.equal(document.getElementById(summary.getAttribute("aria-labelledby")).textContent, "There is a problem");
    const links = [...summary.querySelectorAll("a")];
    assert.deepEqual(links.map(text), ["Enter the client", "Enter the matter name"]);
    click(links[1]);
    assert.equal(document.activeElement, field(el, "Matter name"));
    assert.equal(links[0].getAttribute("href"), `#${field(el, "Client").id}`);
    assert.deepEqual(submitted, [], "not submitted");
    type(field(el, "Client"), "Acme");
    type(field(el, "Matter name"), "Acme v. Beta");
    act(() => { el.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })); });
    assert.equal(submitted.length, 1);
    assert.equal(submitted[0].client, "Acme");
  });

  // @covers US-027-AC4
  test("AC4: with unsaved changes, leaving the page is warned, and Cancel asks before discarding; staying keeps the input", () => {
    let cancelled = 0;
    const el = render(h(NewMatter, { onCancel: () => cancelled++ }));
    const before = () => { const e = new window.Event("beforeunload", { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; };
    assert.equal(before(), false, "nothing to lose yet");
    type(field(el, "Client"), "Acme");
    assert.equal(before(), true, "the browser warns before leaving");
    click([...el.querySelectorAll("button")].find((b) => text(b) === "Cancel"));
    const ask = el.querySelector('dialog[role="alertdialog"]');
    assert.equal(ask.open, true);
    assert.equal(text(ask.querySelector("h2")), "Discard your changes?");
    assert.equal(text(document.activeElement), "Keep editing", "focus on the safe choice");
    click(document.activeElement);
    assert.equal(ask.open, false);
    assert.equal(field(el, "Client").value, "Acme", "input intact");
    assert.equal(cancelled, 0);
    click([...el.querySelectorAll("button")].find((b) => text(b) === "Cancel"));
    click([...ask.querySelectorAll("button")].find((b) => text(b) === "Discard"));
    assert.equal(cancelled, 1);
  });
});

describe("US-027 quick edit and confirmation", () => {
  function Quick() {
    const [open, setOpen] = useState(false);
    const form = useFormState({ initial: { name: "" } });
    return h("div", null, h("button", { id: "opener", onClick: () => setOpen(true) }, "Quick add"),
      h(QuickEdit, { open, onClose: () => setOpen(false), title: "Quick add", form }, h(TextField, { label: "Name", ...form.field("name") })));
  }
  const media = (wide) => { window.matchMedia = (q) => ({ media: q, matches: q.includes("min-width") ? wide : false, addEventListener() {}, removeEventListener() {} }); };

  // @covers US-027-AC6
  test("AC6: quick create is a modal dialog from medium size and a full-screen sheet below; focus returns to the opener", () => {
    for (const [wide, cls] of [[true, "piq-dialog"], [false, "piq-sheet"]]) {
      media(wide);
      const el = render(h(Quick));
      const opener = el.querySelector("#opener");
      opener.focus();
      click(opener);
      const d = el.querySelector("dialog");
      assert.ok(d.classList.contains(cls), `${wide ? "wide" : "narrow"}: ${cls}`);
      if (!wide) assert.equal(d.dataset.side, "full");
      assert.equal(d.open, true, "opened with showModal");
      assert.equal(text(document.getElementById(d.getAttribute("aria-labelledby"))), "Quick add");
      click([...d.querySelectorAll("button")].find((b) => text(b) === "Cancel"));
      assert.equal(d.open, false);
      assert.equal(document.activeElement, opener, "focus back on the opener");
      act(() => root.unmount()); host.remove(); root = null;
    }
  });

  // @covers US-027-AC7
  test("AC7: a destructive confirmation names the object and the consequence, and focus starts on Cancel", () => {
    const el = render(h(ConfirmDialog, { open: true, objectName: "Acme v. Beta", consequence: "Its documents and billing history will be deleted for everyone.", onConfirm() {}, onCancel() {} }));
    const d = el.querySelector("dialog");
    assert.equal(d.getAttribute("role"), "alertdialog");
    assert.equal(text(document.getElementById(d.getAttribute("aria-labelledby"))), "Delete Acme v. Beta?");
    assert.equal(text(document.getElementById(d.getAttribute("aria-describedby"))), "Its documents and billing history will be deleted for everyone.");
    assert.equal(text(document.activeElement), "Cancel");
  });

  // @covers US-027-AC8
  test("AC8: with typed confirmation, Delete is unavailable until the name matches", () => {
    let confirmed = 0;
    const el = render(h(ConfirmDialog, { open: true, objectName: "Acme v. Beta", consequence: "Gone for good.", requireTyping: true, onConfirm: () => confirmed++, onCancel() {} }));
    const del = [...el.querySelectorAll("button")].find((b) => text(b) === "Delete");
    const input = el.querySelector("dialog input");
    assert.equal(el.querySelector(`label[for="${input.id}"]`).textContent, "Type Acme v. Beta to confirm");
    assert.equal(del.disabled, true);
    type(input, "Acme v. Bet");
    assert.equal(del.disabled, true);
    click(del);
    assert.equal(confirmed, 0);
    type(input, "Acme v. Beta");
    assert.equal(del.disabled, false);
    click(del);
    assert.equal(confirmed, 1);
  });

  test("Dialog: a title, a description and actions; Escape asks to close", () => {
    let closed = 0;
    const el = render(h(Dialog, { open: true, title: "Rename", description: "Choose a new name.", onClose: () => closed++, actions: h(Button, null, "Save") }, h("p", null, "body")));
    const d = el.querySelector("dialog.piq-dialog");
    assert.equal(text(document.getElementById(d.getAttribute("aria-labelledby"))), "Rename");
    act(() => { d.dispatchEvent(new window.Event("cancel", { cancelable: true })); });
    assert.equal(closed, 1);
  });
});
