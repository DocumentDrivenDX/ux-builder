/* The loading widgets (US-021-AC1 to AC5, FEAT-004 SDK-17), against the
   built package. loading.browser.test.mjs checks each design system's
   anatomy and reduced motion in Chromium.

     npm run build && npm test --workspace @ux-builder/ui */

import "./dom.mjs";
import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { Button, ProgressBar, Skeleton, Spinner } from "../dist/index.js";

let root, host;
function render(el) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(el));
  return host;
}
afterEach(() => { act(() => root?.unmount()); host?.remove(); root = null; });

describe("US-021 loading widgets", () => {
  // @covers US-021-AC1
  test("AC1: a determinate bar is a named progressbar with its value, clamped, and a fill of that share", () => {
    const el = render(h("div", null,
      h(ProgressBar, { label: "Uploading", value: 150, max: 200, showValue: true }),
      h(ProgressBar, { label: "Over", value: 140 }),
      h(ProgressBar, { label: "Pages", value: 3, max: 12, valueText: "Page 3 of 12" })));
    const [a, b, c] = el.querySelectorAll("[role=progressbar]");
    const label = document.getElementById(a.getAttribute("aria-labelledby"));
    assert.equal(label.textContent, "Uploading", "named by its visible label");
    assert.equal(a.getAttribute("aria-valuemin"), "0");
    assert.equal(a.getAttribute("aria-valuemax"), "200");
    assert.equal(a.getAttribute("aria-valuenow"), "150");
    assert.equal(a.querySelector(".piq-progress__fill").style.width, "75%");
    assert.equal(el.querySelector(".piq-progress__value").textContent, "75%");
    assert.equal(b.getAttribute("aria-valuenow"), "100", "clamped to max");
    assert.equal(b.querySelector(".piq-progress__fill").style.width, "100%");
    assert.equal(c.getAttribute("aria-valuetext"), "Page 3 of 12");
  });

  test("a hidden label still names the bar; a max of 0 counts as 100", () => {
    const el = render(h(ProgressBar, { label: "Syncing", value: 20, max: 0, hideLabel: true }));
    const bar = el.querySelector("[role=progressbar]");
    assert.equal(document.getElementById(bar.getAttribute("aria-labelledby")).textContent, "Syncing");
    assert.ok(el.querySelector(".piq-visually-hidden .piq-progress__label"));
    assert.equal(bar.getAttribute("aria-valuemax"), "100");
    assert.equal(bar.getAttribute("aria-valuenow"), "20");
  });

  // @covers US-021-AC2
  test("AC2: without a value the bar is indeterminate: no aria-valuenow, a moving fill", () => {
    const el = render(h(ProgressBar, { label: "Preparing" }));
    const bar = el.querySelector("[role=progressbar]");
    assert.equal(bar.hasAttribute("aria-valuenow"), false);
    assert.ok(el.querySelector(".piq-progress").classList.contains("piq-progress--indeterminate"));
    assert.equal(bar.querySelector(".piq-progress__fill").style.width, "");
  });

  // @covers US-021-AC3
  test("AC3: a spinner is a status that says its label, visually hidden unless showLabel; three sizes", () => {
    const el = render(h("div", null, h(Spinner), h(Spinner, { size: "lg", label: "Saving", showLabel: true })));
    const [a, b] = el.querySelectorAll(".piq-spinner");
    assert.equal(a.getAttribute("role"), "status");
    assert.equal(a.textContent, "Loading");
    assert.ok(a.querySelector(".piq-visually-hidden"));
    assert.ok(a.classList.contains("piq-spinner--md"));
    assert.equal(a.querySelector("svg").getAttribute("aria-hidden"), "true");
    assert.equal(b.textContent, "Saving");
    assert.ok(b.querySelector(".piq-spinner__label"));
    assert.ok(b.classList.contains("piq-spinner--lg"));
  });

  // @covers US-021-AC4
  test("AC4: skeletons are hidden from assistive technology and draw lines, a block or a circle", () => {
    const el = render(h("div", null,
      h(Skeleton, { lines: 3 }),
      h(Skeleton, { variant: "rect", width: "50%", height: 120 }),
      h(Skeleton, { variant: "circle", width: 32 })));
    const [text, rect, circle] = el.querySelectorAll(".piq-skeleton");
    for (const s of [text, rect, circle]) assert.equal(s.getAttribute("aria-hidden"), "true");
    assert.equal(text.querySelectorAll(".piq-skeleton__line").length, 3);
    assert.equal(rect.style.width, "50%");
    assert.equal(rect.style.height, "120px");
    assert.ok(circle.classList.contains("piq-skeleton--circle"));
    assert.equal(circle.style.width, "32px");
    assert.equal(circle.style.height, "32px", "a circle is as tall as it is wide");
  });

  // @covers US-021-AC5
  test("AC5: a busy button shows a spinner, keeps its label, is busy and disabled to AT, and ignores clicks", () => {
    let clicks = 0;
    const onClick = () => { clicks++; };
    const el = render(h(Button, { busy: true, onClick, badge: 2 }, "Save"));
    const btn = el.querySelector("button");
    assert.equal(btn.getAttribute("aria-busy"), "true");
    assert.equal(btn.getAttribute("aria-disabled"), "true");
    assert.ok(btn.querySelector(".piq-btn__spinner svg[aria-hidden=true]"));
    assert.equal(btn.textContent, "Save2", "the label and badge stay, so the name and width do");
    act(() => btn.click());
    assert.equal(clicks, 0);

    act(() => root.render(h(Button, { busy: false, onClick }, "Save")));
    const idle = el.querySelector("button");
    assert.equal(idle.hasAttribute("aria-busy"), false);
    assert.equal(idle.querySelector(".piq-btn__spinner"), null);
    act(() => idle.click());
    assert.equal(clicks, 1);
  });

  test("a busy submit button does not submit its form; a disabled one stays disabled after", () => {
    let submits = 0;
    const el = render(h("form", { onSubmit: (e) => { e.preventDefault(); submits++; } }, h(Button, { type: "submit", busy: true, disabled: true }, "Send")));
    act(() => el.querySelector("button").click());
    assert.equal(submits, 0);
    act(() => root.render(h("form", null, h(Button, { type: "submit", disabled: true }, "Send"))));
    assert.equal(el.querySelector("button").disabled, true);
  });
});
