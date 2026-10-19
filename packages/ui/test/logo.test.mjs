/* Logo (US-010-AC8 to AC10, FEAT-004 SDK-15), against the built package.
   happy-dom does not cascade custom properties, so here a brand's artwork
   tokens are set on the element itself; logo.browser.test.mjs checks the
   real theme CSS in Chromium.

     npm run build && npm test --workspace @ux-builder/ui */

import "./dom.mjs";
import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { Logo, ThemeProvider, brandTitleFor } from "../dist/index.js";

let root, host;
function render(el) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(el));
  return host;
}
afterEach(() => { act(() => root?.unmount()); host?.remove(); root = null; });
const logo = (el) => el.querySelector(".piq-logo");

describe("US-010 logo", () => {
  test("brand titles come from the themes the package was built with", () => {
    assert.equal(brandTitleFor("praxis-carbon"), "Praxis");
    assert.equal(brandTitleFor("plain"), "Plain");
    assert.equal(brandTitleFor("no-such-theme"), null);
  });

  // @covers US-010-AC8
  test("AC8: a brand with artwork is drawn as artwork, one named image", () => {
    const el = render(h(ThemeProvider, { theme: "praxis", appearance: "light" },
      h(Logo, { style: { "--piq-brand-logo-image": 'url("logo.png")' } })));
    const l = logo(el);
    assert.equal(l.getAttribute("data-logo"), "artwork");
    assert.equal(l.getAttribute("role"), "img");
    assert.equal(l.getAttribute("aria-label"), "Praxis");
    assert.equal(l.textContent, "");
    assert.ok(!l.classList.contains("piq-logo--text"));
  });

  test("a single-colour brand drawn as a mask counts as artwork", () => {
    const el = render(h(ThemeProvider, { theme: "plain" }, h(Logo, { style: { "--piq-brand-logo-mask": 'url("logo.svg")' } })));
    assert.equal(logo(el).getAttribute("data-logo"), "artwork");
  });

  // @covers US-010-AC9
  test("AC9: a brand without artwork gets its title as a wordmark; the mark gets its initial", () => {
    const el = render(h(ThemeProvider, { theme: "plain" }, h(Logo), h(Logo, { variant: "mark", size: "sm" })));
    const [word, mark] = el.querySelectorAll(".piq-logo");
    assert.equal(word.getAttribute("data-logo"), "text");
    assert.ok(word.classList.contains("piq-logo--text"));
    assert.equal(word.textContent, "Plain");
    assert.equal(word.getAttribute("aria-label"), "Plain");
    assert.equal(word.querySelector(".piq-logo__text").getAttribute("aria-hidden"), "true", "named once, by the image");
    assert.equal(mark.textContent, "P");
    assert.ok(mark.classList.contains("piq-logo--mark") && mark.classList.contains("piq-logo--sm"));
  });

  test("switching theme switches the logo", () => {
    const el = render(h(ThemeProvider, { theme: "databricks" }, h(Logo)));
    assert.equal(logo(el).textContent, "Databricks");
    act(() => root.render(h(ThemeProvider, { theme: "synaptiq" }, h(Logo))));
    assert.equal(logo(el).textContent, "Synaptiq");
  });

  test("without a provider, the closest data-theme names the brand; label overrides", () => {
    const el = render(h("div", { "data-theme": "databricks" }, h(Logo), h(Logo, { label: "Matters" })));
    const [a, b] = el.querySelectorAll(".piq-logo");
    assert.equal(a.getAttribute("aria-label"), "Databricks");
    assert.equal(b.getAttribute("aria-label"), "Matters");
    assert.equal(b.textContent, "Matters");
  });

  // @covers US-010-AC10
  test("AC10: an embedded view (ThemeProvider with tokens) draws no logo", () => {
    const warn = console.warn; const seen = [];
    console.warn = (m) => seen.push(m);
    try {
      const el = render(h(ThemeProvider, { tokens: { "piq-color-text": "#111111" } }, h(Logo)));
      assert.equal(logo(el), null);
      assert.ok(seen.some((m) => /embedded view/.test(m)));
    } finally { console.warn = warn; }
  });
});
