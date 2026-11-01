/* US-163-AC4: each quality problem in a layout report is found with its code. */

import assert from "node:assert/strict";
import { test } from "node:test";
import { check, createTheme, loadTheme } from "../node.mjs";

const base = () => ({
  width: 400, height: 200, form: "flow/network", font: { family: "DM Sans", standIn: false },
  boxes: [
    { id: "a", kind: "node", x: 10, y: 10, width: 100, height: 40 },
    { id: "b", kind: "node", x: 290, y: 10, width: 100, height: 40 },
    { id: "c", kind: "node", x: 150, y: 100, width: 100, height: 40 },
    { id: "a--b#label", kind: "label", x: 170, y: 21, width: 60, height: 18 },
  ],
  texts: [{ id: "a", text: "A", box: "a", x: 20, y: 20, width: 40, height: 15, size: 14 }],
  edges: [{ id: "a--b", from: "a", to: "b", points: [[110, 30], [290, 30]], label: "a--b#label" }],
  colors: [{ id: "a", kind: "text", fg: "piq-color-text-strong", bg: "piq-color-surface" }],
});

test("@covers US-163-AC4 a clean report passes", () => {
  assert.deepEqual(check(base(), { theme: createTheme(loadTheme("praxis")) }), []);
});

test("@covers US-163-AC4 each problem is found with its code", () => {
  const cases = [
    ["TEXT_OVERFLOW", (r) => { r.texts[0].width = 120; }],
    ["TEXT_TOO_SMALL", (r) => { r.texts[0].size = 10; }],
    ["EDGE_THROUGH_NODE", (r) => { r.edges[0].points = [[110, 30], [200, 30], [200, 160], [290, 160], [290, 30]]; r.edges[0].label = null; r.boxes.pop(); }],
    ["EDGE_THROUGH_LABEL", (r) => { r.edges.push({ id: "c--x", from: "c", to: "x", points: [[200, 100], [200, 0]], label: null }); }],
    ["LABEL_OVERLAP", (r) => { r.boxes.push({ id: "c--b#label", kind: "label", x: 180, y: 25, width: 60, height: 18 }); }],
    ["LABEL_OVERLAP", (r) => { r.boxes[3].y = 95; r.boxes[3].x = 160; }],
    ["CROSSINGS", (r) => { r.form = "flow/pipeline"; r.edges.push({ id: "c--x", from: "c", to: "x", points: [[140, 100], [140, 0]], label: null }); }],
    ["CONTRAST", (r) => { r.colors.push({ id: "b", kind: "text", fg: "piq-color-diagram-region-1", bg: "piq-color-ground" }); }],
    ["CONTRAST", (r) => { r.colors.push({ id: "b", kind: "line", fg: "piq-color-border", bg: "piq-color-ground" }); }],
  ];
  const theme = createTheme(loadTheme("praxis"));
  for (const [code, mutate] of cases) {
    const r = base();
    mutate(r);
    const found = check(r, { theme });
    assert.ok(found.some((f) => f.code === code), `${code}: ${JSON.stringify(found)}`);
    assert.ok(found.every((f) => f.message && Array.isArray(f.ids)));
  }
});

test("@covers US-163-AC4 contrast is checked in both appearances for a both-appearance drawing", () => {
  const r = base();
  r.colors = [{ id: "a", kind: "text", fg: "piq-color-text-strong", bg: "piq-color-surface" }];
  assert.deepEqual(check(r, { theme: createTheme(loadTheme("praxis", "both"), "both") }), []);
  r.colors.push({ id: "b", kind: "text", fg: "piq-color-diagram-region-1", bg: "piq-color-ground" });
  const found = check(r, { theme: createTheme(loadTheme("praxis", "both"), "both") }).filter((f) => f.code === "CONTRAST");
  assert.equal(found.length, 2);
  assert.ok(found.some((f) => f.message.includes("(light)")) && found.some((f) => f.message.includes("(dark)")));
});
