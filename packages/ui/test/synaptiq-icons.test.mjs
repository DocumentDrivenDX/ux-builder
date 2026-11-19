/* The Synaptiq icon set (vk-synaptiq, 2026-11-19), against the built package: the shared names in brand icons on a
   theme whose icon.set is "synaptiq", and the whole brand library by number, loaded on first use.

     npm run build && npm test --workspace @ux-builder/ui */

import "./dom.mjs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { afterEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { ICON_NAMES, Icon, ThemeProvider, iconSetFor } from "../dist/index.js";
import { SYNAPTIQ_LIBRARY, SYNAPTIQ_LIBRARY_NAMES, SYNAPTIQ_SHARED } from "../dist/icons-synaptiq.js";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const LIB = fileURLToPath(new URL("../../../brand/synaptiq/icons/library", import.meta.url));
let root, host;
function render(el) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(el));
  return host;
}
afterEach(() => { act(() => root?.unmount()); host?.remove(); root = null; });
const svg = (el) => el.querySelector("svg.piq-icon");

describe("the Synaptiq icon set", () => {
  test("the generated modules are what the brand library generates", () => {
    execFileSync(process.execPath, ["scripts/gen-synaptiq-icons.mjs", "--check"], { cwd: PKG, stdio: "pipe" });
  });

  test("every icon of the brand library is in it, by its number", () => {
    const files = readdirSync(LIB).filter((f) => f.endsWith(".svg"));
    assert.equal(SYNAPTIQ_LIBRARY_NAMES.length, files.length);
    assert.equal(files.length, 581);
    for (const f of files) assert.ok(SYNAPTIQ_LIBRARY[`syn-${f.slice(1, 7)}`], f);
    for (const g of Object.values(SYNAPTIQ_LIBRARY)) {
      assert.match(g.body, /fill="currentColor"/);
      assert.doesNotMatch(g.body, /#302A28|<script|\son\w+=|href=/i);
    }
  });

  test("vk-synaptiq draws the shared names in brand icons, filled in the text colour; other themes keep theirs", () => {
    assert.equal(iconSetFor("vk-synaptiq"), "synaptiq");
    for (const name of Object.keys(SYNAPTIQ_SHARED)) assert.ok(ICON_NAMES.includes(name), `${name} is a shared name`);
    let el = render(h(ThemeProvider, { theme: "vk-synaptiq" }, h(Icon, { name: "search", label: "Search" })));
    const s = svg(el);
    assert.deepEqual([s.getAttribute("data-icon"), s.getAttribute("data-icon-set")], ["search", "synaptiq"]);
    assert.equal(s.getAttribute("fill"), "currentColor");
    assert.equal(s.getAttribute("stroke"), null, "no stroke: the brand's icons are filled shapes");
    assert.equal(s.getAttribute("aria-label"), "Search");
    act(() => root.unmount()); host.remove();
    el = render(h(ThemeProvider, { theme: "vk-praxis-material" }, h(Icon, { name: "search" })));
    assert.equal(svg(el).getAttribute("data-icon-set"), "material");
  });

  test("a library icon by number draws in any theme once the library has loaded, keeping its box meanwhile", async () => {
    const el = render(h(ThemeProvider, { theme: "vk-praxis-carbon" }, h(Icon, { name: "syn-60-031", label: "Guide" })));
    let s = svg(el);
    assert.equal(s.getAttribute("data-icon"), "syn-60-031");
    assert.equal(s.getAttribute("aria-label"), "Guide", "named while it loads");
    for (let i = 0; i < 50 && !svg(el).innerHTML; i++) await act(() => new Promise((r) => setTimeout(r, 20)));
    s = svg(el);
    assert.equal(s.getAttribute("viewBox"), SYNAPTIQ_LIBRARY["syn-60-031"].viewBox);
    assert.equal(s.getAttribute("data-icon-set"), "synaptiq");
    assert.match(s.innerHTML, /fill="currentColor"/);
  });
});
