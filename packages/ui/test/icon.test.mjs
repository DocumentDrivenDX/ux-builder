/* Icon (US-010-AC5 to AC7, FEAT-004 SDK-03), against the built package.

     npm run build && npm test --workspace @ux-builder/ui */

import "./dom.mjs";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { ICON_NAMES, Icon, ThemeProvider, iconSetFor, pickGlyph } from "../dist/index.js";

const PKG = fileURLToPath(new URL("..", import.meta.url));
let root, host;
function render(el) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(el));
  return host;
}
afterEach(() => { act(() => root?.unmount()); host?.remove(); });
const setOf = (el) => el.querySelector("svg.piq-icon").getAttribute("data-icon-set");

describe("US-010 icons", () => {
  // @covers US-010-AC5
  test("AC5: the active theme's design system picks the set; themes without one use Lucide", () => {
    const expect = { "praxis-material": "material", "praxis-fluentui": "fluent", "praxis-carbon": "carbon", praxis: "lucide", plain: "lucide", synaptiq: "lucide", databricks: "lucide" };
    for (const [theme, set] of Object.entries(expect)) {
      assert.equal(iconSetFor(theme), set, theme);
      const el = render(h(ThemeProvider, { theme, appearance: "light" }, h(Icon, { name: "warning" })));
      assert.equal(setOf(el), set, theme);
      act(() => root.unmount()); host.remove(); root = null;
    }
  });

  test("without a provider, the closest data-theme in the page is used", () => {
    const el = render(h("div", { "data-theme": "praxis-fluentui" }, h(Icon, { name: "search" })));
    assert.equal(setOf(el), "fluent");
  });

  test("set overrides the theme", () => {
    const el = render(h(ThemeProvider, { theme: "praxis-carbon" }, h(Icon, { name: "search", set: "material" })));
    assert.equal(setOf(el), "material");
  });

  test("switching theme at run time switches the glyph", () => {
    const el = render(h(ThemeProvider, { theme: "praxis-material", appearance: "light" }, h(Icon, { name: "close" })));
    assert.equal(setOf(el), "material");
    act(() => root.render(h(ThemeProvider, { theme: "praxis-carbon", appearance: "light" }, h(Icon, { name: "close" }))));
    assert.equal(setOf(el), "carbon");
  });

  // @covers US-010-AC6
  test("AC6: a name a set lacks is drawn from Lucide, never nothing", () => {
    const fake = { carbon: { warning: { viewBox: "0 0 32 32", body: "<path/>" } }, lucide: { warning: { viewBox: "0 0 24 24", body: "<path/>" }, lifebuoy: { viewBox: "0 0 24 24", body: "<circle/>" } } };
    assert.deepEqual(pickGlyph("lifebuoy", "carbon", fake)[1], "lucide");
    assert.deepEqual(pickGlyph("warning", "carbon", fake)[1], "carbon");
    assert.deepEqual(pickGlyph("nope", "carbon", fake), [null, null]);
  });

  test("every shared name exists in every set, so no fallback is needed today", () => {
    for (const set of ["material", "fluent", "carbon", "lucide"]) for (const n of ICON_NAMES) assert.equal(pickGlyph(n, set)[1], set, `${set} ${n}`);
    assert.ok(ICON_NAMES.length >= 30);
  });

  test("an unknown name warns and draws nothing", () => {
    const orig = console.warn, warned = [];
    console.warn = (m) => warned.push(m);
    try {
      const el = render(h(Icon, { name: "unicorn" }));
      assert.equal(el.querySelector("svg"), null);
      assert.match(warned[0], /no icon "unicorn"/);
    } finally { console.warn = orig; }
  });

  test("decorative by default; a label makes it an image with a name", () => {
    const plain = renderToStaticMarkup(h(Icon, { name: "info", set: "lucide" }));
    assert.match(plain, /aria-hidden="true"/);
    assert.doesNotMatch(plain, /role=/);
    const named = renderToStaticMarkup(h(Icon, { name: "info", set: "lucide", label: "More information" }));
    assert.match(named, /role="img"/);
    assert.match(named, /aria-label="More information"/);
  });

  test("Lucide is stroked, the others filled, all in the text colour", () => {
    assert.match(renderToStaticMarkup(h(Icon, { name: "add", set: "lucide" })), /fill="none" stroke="currentColor" stroke-width="2"/);
    for (const set of ["material", "fluent", "carbon"]) assert.match(renderToStaticMarkup(h(Icon, { name: "add", set })), /fill="currentColor"/, set);
  });

  // @covers US-010-AC7
  test("AC7: each set's licence ships with the package and matches what it declares", () => {
    const pkg = JSON.parse(readFileSync(join(PKG, "package.json"), "utf8"));
    assert.ok(pkg.files.includes("licenses"));
    const marks = { material: /Apache License/, carbon: /Apache License/, fluent: /MIT License/, lucide: /ISC License/ };
    for (const [set, mark] of Object.entries(marks)) {
      const f = join(PKG, "licenses", `${set}.LICENSE`);
      assert.ok(existsSync(f), f);
      assert.match(readFileSync(f, "utf8"), mark, set);
    }
  });

  test("the committed glyphs match the icon packages (regenerate with npm run icons)", async () => {
    const { build } = await import("../scripts/gen-icons.mjs");
    assert.equal(build(), readFileSync(join(PKG, "src/icons/glyphs.generated.js"), "utf8"));
  });
});

test("the page's --piq-icon-set wins over the theme list, so a theme newer than the package gets its icons", () => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  // happy-dom does not inherit custom properties, so the token is set on the icon itself here;
  // inheritance from the theme is checked in a real browser by the e2e test client.
  act(() => root.render(h("div", { "data-theme": "acme-legal-carbon" }, h(Icon, { name: "warning", style: { "--piq-icon-set": "carbon" } }))));
  assert.equal(host.querySelector("svg.piq-icon").getAttribute("data-icon-set"), "carbon");
});
