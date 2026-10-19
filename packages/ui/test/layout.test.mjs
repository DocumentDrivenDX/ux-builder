/* The layout primitives (US-023; FEAT-006 LAY-02, LAY-03; CONTRACT-004 screen
   patterns), against the built package: the markup patterns.css styles, the
   entry point, and the stylesheet's use of tokens. layout.browser.test.mjs
   checks the layout itself in Chromium.

     npm run build && npm test --workspace @ux-builder/ui */

import "./dom.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, test } from "node:test";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import * as widgets from "../dist/index.js";
import * as patterns from "../dist/patterns.js";

const { Cluster, Grid, Page, SplitView, Stack } = patterns;
const CSS = readFileSync(new URL("../dist/patterns.css", import.meta.url), "utf8");

let root, host;
function render(el) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(el));
  return host;
}
afterEach(() => { act(() => root?.unmount()); host?.remove(); root = null; });

describe("the patterns entry point", () => {
  test("exports the primitives and patterns, and the widget entry exports none of them", () => {
    assert.deepEqual(Object.keys(patterns).sort(), Object.keys(patterns).sort().filter((n) => /^[A-Za-z]/.test(n)));
    for (const n of ["AppShell", "CollectionList", "Grid", "ListDetail", "PageHeader", "RecordDetail", "SplitView", "Stack", "useListQuery"]) assert.ok(n in patterns, n);
    for (const n of Object.keys(patterns)) assert.equal(widgets[n], undefined, `${n} is not in @ux-builder/ui`);
  });

  test("package.json exports @ux-builder/ui/patterns and @ux-builder/ui/patterns.css", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    assert.equal(pkg.exports["./patterns"], "./dist/patterns.js");
    assert.equal(pkg.exports["./patterns.css"], "./dist/patterns.css");
  });
});

describe("US-023 primitives", () => {
  test("Stack and Cluster carry their space step, alignment and wrapping; any element, any children", () => {
    const el = render(h("div", null,
      h(Stack, { gap: 6, as: "section", "aria-label": "Summary" }, h("p", null, "a"), h("p", null, "b")),
      h(Cluster, { justify: "between", wrap: false }, h("button", null, "One"), h("button", null, "Two"))));
    const stack = el.querySelector(".piq-stack");
    assert.equal(stack.tagName, "SECTION");
    assert.equal(stack.getAttribute("aria-label"), "Summary");
    assert.equal(stack.dataset.gap, "6");
    assert.equal(stack.children.length, 2);
    const cluster = el.querySelector(".piq-cluster");
    assert.deepEqual([cluster.dataset.gap, cluster.dataset.justify, cluster.dataset.wrap], ["3", "between", "false"]);
  });

  test("a gap outside the theme's space steps falls back to the default step", () => {
    const el = render(h("div", null, h(Stack, { gap: 12 }), h(Cluster, { gap: 2.5 }), h(Grid, { gap: -1 })));
    assert.deepEqual([...el.querySelectorAll("[data-gap]")].map((x) => x.dataset.gap), ["4", "3", "4"]);
  });

  test("Grid sets a column count for every size class, a class left out keeping the previous one, clamped to 1-6", () => {
    const el = render(h("div", null,
      h(Grid, { columns: { compact: 1, expanded: 3 } }, h("div", null, "x")),
      h(Grid, { columns: 9, as: "ul" }, h("li", null, "y")),
      h(Grid, null)));
    const [a, b, c] = el.querySelectorAll(".piq-grid");
    const counts = (g) => ["compact", "medium", "expanded", "large", "extra-large"].map((k) => g.getAttribute(`data-cols-${k}`));
    assert.deepEqual(counts(a), ["1", "1", "3", "3", "3"]);
    assert.deepEqual(counts(b), ["6", "6", "6", "6", "6"]);
    assert.equal(b.querySelector(".piq-grid__items").tagName, "UL");
    assert.deepEqual(counts(c), ["1", "2", "3", "4", "4"], "the default");
  });

  test("Page names its content width and renders the element asked for", () => {
    const el = render(h(Page, { width: "form", as: "main" }, h("h1", null, "Edit matter")));
    assert.equal(el.querySelector(".piq-page").dataset.width, "form");
    assert.equal(el.querySelector(".piq-page__body").tagName, "MAIN");
  });

  test("SplitView puts each slot in its pane, names the pane shown below expanded, and labels panes as regions", () => {
    const el = render(h(SplitView, { primary: h("ul", null, h("li", null, "Acme")), secondary: h("article", null, "Acme v. Doe"), show: "secondary", ratio: "1:1", primaryLabel: "Matters", secondaryLabel: "Matter" }));
    const split = el.querySelector(".piq-split");
    assert.deepEqual([split.dataset.show, split.dataset.ratio], ["secondary", "1:1"]);
    const [p, s] = split.querySelectorAll(".piq-split__pane");
    assert.deepEqual([p.dataset.pane, p.getAttribute("role"), p.getAttribute("aria-label"), p.querySelector("li").textContent], ["primary", "region", "Matters", "Acme"]);
    assert.deepEqual([s.dataset.pane, s.getAttribute("aria-label"), s.textContent], ["secondary", "Matter", "Acme v. Doe"]);
    const bare = render(h(SplitView, { primary: "a", secondary: "b", show: "nonsense" }));
    assert.equal(bare.querySelector(".piq-split").dataset.show, "primary");
    assert.equal(bare.querySelector(".piq-split__pane").getAttribute("role"), null, "no region without a label");
  });
});

describe("US-023 patterns.css", () => {
  const body = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

  // @covers US-023-AC2
  test("AC2: gaps are the theme's space steps, and no literal length appears outside the size-class query conditions", () => {
    for (let n = 1; n <= 8; n++) assert.match(body, new RegExp(`\\[data-gap="${n}"\\][^{]*\\{ gap: var\\(--piq-space-${n}\\); \\}`), `step ${n}`);
    const conditions = [...body.matchAll(/@(?:container|media) \(min-width: (\d+)px\)/g)].map(([, n]) => n);
    assert.deepEqual([...new Set(conditions)].sort((x, y) => x - y), ["600", "840", "1200", "1600"], "only the size-class boundaries");
    const rest = body.replace(/@(?:container|media) \([^)]*\)/g, "");
    const literals = [...rest.matchAll(/(?<![\w-])(\d*\.?\d+)(px|rem|em|ch|vw|vh|vi|vb|cqi|cqw|pt)\b/g)].map(([m]) => m).filter((m) => parseFloat(m) !== 0);
    assert.deepEqual(literals, [], "every other length is a token");
  });

  test("the query boundaries are the tokens' values", () => {
    const layout = JSON.parse(readFileSync(new URL("../../../tokens/layout.json", import.meta.url), "utf8"));
    assert.deepEqual(Object.values(layout.constants.size).map((t) => t.$value), ["600px", "840px", "1200px", "1600px"]);
  });

  // @covers US-023-AC6
  test("AC6: the stylesheet uses logical properties only, so right-to-left needs no CSS of its own", () => {
    assert.doesNotMatch(body, /(?:^|[\s;{])(?:margin|padding|border)-(?:left|right)\s*:|(?:^|[\s;{])(?:left|right)\s*:|text-align:\s*(?:left|right)|float:\s*(?:left|right)/m);
    assert.doesNotMatch(body, /\[dir=|:dir\(/, "no right-to-left rules");
  });
});
