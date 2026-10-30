/* The rest of the kinds (FEAT-019 M4, US-167): stack, nested, timeline, comparison and metric
   documents in umf's fixtures and the visuals inventory, drawn, checked and in their portable
   forms. */

import assert from "node:assert/strict";
import { test } from "node:test";
import { check, draw, loadTheme, render } from "../node.mjs";
import { fixture, fixtures, kindForm, themes } from "./helpers.mjs";

const REST = /^(structure\/(stack|nested)|timeline\/|comparison\/|metric\/)/;
const rest = fixtures.filter((f) => REST.test(kindForm(f.document)));
const shapes = (scene) => scene.items.flatMap((it) => it.shapes);
const texts = (scene) => shapes(scene).filter((s) => s.t === "text").map((s) => s.text);

test("@covers US-167-AC1 every remaining-kind document renders in every theme and appearance, passes check, and renders the same bytes twice", async () => {
  // Two stacks, a nested estate, a matrix, a quadrant, a before-and-after, three timelines, four metrics.
  assert.equal(rest.length, 13, rest.map((f) => f.id).join(", "));
  assert.equal(new Set(rest.map((f) => kindForm(f.document))).size, 12, "every form of the remaining kinds");
  for (const f of rest) for (const { name, appearances } of themes) for (const appearance of appearances) {
    const theme = loadTheme(name, appearance);
    const first = await render(f.document, { theme, appearance });
    assert.deepEqual(check(first.layout, { theme: (await draw(f.document, { theme, appearance })).theme }), [], `${f.id} in ${name} ${appearance}`);
    assert.equal((await render(f.document, { theme, appearance })).content, first.content, `${f.id} in ${name} ${appearance} is not deterministic`);
  }
});

test("@covers US-167-AC2 a matrix draws ratings as filled and empty circles with their words, partial support as a half circle, and marks the chosen item in the accent with its reason", async () => {
  const doc = fixture("layout-engines");
  doc.extensions["umf.visual"].form = "matrix";
  const c = doc.extensions["umf.visual"].comparison;
  const { scene } = await draw(doc, { theme: loadTheme("praxis") });
  const circles = shapes(scene).filter((s) => s.t === "circle");
  const filled = circles.filter((s) => s.fill === "piq-color-text-strong").length;
  assert.equal(filled, c.values.reduce((s, x) => s + x.rating, 0), "one filled circle per point");
  assert.equal(circles.length, c.values.length * 3, "every point of every scale, filled or empty");
  assert.ok(texts(scene).includes("1 of 3") && texts(scene).includes("3 of 3"), "each rating also in words");
  const ba = (await draw(fixture("visuals-before-after"), { theme: loadTheme("praxis") })).scene;
  assert.ok(shapes(ba).some((s) => s.t === "path" && /A5\.5 5\.5 0 0 0/.test(s.d)) && texts(ba).includes("Partly"), "partial support: a half circle and its word");
  assert.ok(shapes(scene).some((s) => s.t === "rect" && s.fill === "piq-color-accent"), "an accent rule over the chosen column");
  assert.ok(texts(scene).some((t) => t.startsWith("Chosen: The only")), "the reason under the chosen item");
});

test("@covers US-167-AC3 a metric draws several series in the series colours in order, a change with an arrow as well as a status colour, and every number with its unit", async () => {
  const theme = loadTheme("databricks", "light");
  const trend = (await draw(fixture("umf-ac-trend"), { theme })).scene;
  const lines = shapes(trend).filter((s) => s.t === "path" && s.sw === 2).map((s) => s.stroke);
  assert.deepEqual(lines, ["piq-color-series-1", "piq-color-series-2"]);
  assert.ok(!shapes(trend).some((s) => s.t === "text" && /series/.test(String(s.fill))), "no text in a series colour");
  const stat = (await draw(fixture("umf-ac-satisfied"), { theme })).scene;
  const arrow = shapes(stat).find((s) => s.t === "path" && /Z$/.test(s.d));
  assert.equal(arrow?.fill, "piq-color-status-positive", "up is good here: an arrow in the positive colour");
  assert.ok(texts(stat).includes("+12 since 18 Oct"));
  assert.ok(texts(stat).includes("criteria"), "the big number's unit");
  const meter = (await draw(fixture("umf-ac-coverage"), { theme })).scene;
  assert.ok(texts(meter).includes("180 criteria of 837 (22%)"));
});

test("@covers US-167-AC4 a dated roadmap is a gantt, milestones a timeline, and a stack, nested, comparison or metric a Markdown table", async () => {
  const theme = loadTheme("praxis");
  const dated = fixture("visuals-roadmap");
  const t = dated.extensions["umf.visual"].timeline;
  const dateOf = Object.fromEntries(t.scale.periods.map((p, i) => [p.id, `2026-${String(i + 3).padStart(2, "0")}-01`]));
  t.scale = { kind: "date" };
  for (const s of t.spans) { s.start = dateOf[s.start]; s.end = dateOf[s.end]; }
  const gantt = await render(dated, { theme, output: "mermaid" });
  assert.equal(gantt.format, "mermaid");
  assert.match(gantt.content, /\ngantt\n {2}title Visuals milestones\n {2}dateFormat YYYY-MM-DD\n {2}section umf\n/);
  assert.match(gantt.content, /HELIX PR #35;95 lands as it is :done, span_hm0, 2026-03-01, 2026-03-01/);
  const milestones = await render(fixture("umf-releases"), { theme, output: "mermaid" });
  assert.match(milestones.content, /\ntimeline\n {2}title umf releases\n {2}13 Oct 2026 : umf-v0\.2\.0\n/);
  assert.match(milestones.content, /18 Oct 2026 : umf-v0\.4\.0 : umf-v0\.4\.1 : umf-v0\.5\.0/);
  for (const id of ["beacon-stack", "beacon-estate-landscape", "helix-adr-options", "umf-ac-status"]) {
    const r = await render(fixture(id), { theme, output: "mermaid" });
    assert.equal(r.format, "markdown", id);
    assert.match(r.content, /^\*\*.+\*\*\n\n\| .+ \|\n\|---(\|---)+\|\n/, id);
  }
});

test("@covers US-167-AC5 a comparison's and a metric's text equivalent is a table holding every value drawn", async () => {
  const theme = loadTheme("praxis");
  const adr = fixture("helix-adr-options"), status = fixture("umf-ac-status");
  const a = await render(adr, { theme });
  for (const x of adr.extensions["umf.visual"].comparison.values) assert.ok(a.text.includes(x.text), x.text);
  assert.match(a.text, /\| Pros \| Stronger concurrency primitives \|/);
  const s = await render(status, { theme });
  for (const p of status.extensions["umf.visual"].metric.series[0].points) assert.ok(s.text.includes(`| ${p.value} criteria |`), String(p.value));
});

test("@covers US-167-AC6 below its minimum width a milestones or roadmap timeline is drawn as a history and the render warns", async () => {
  const theme = loadTheme("praxis");
  for (const id of ["umf-releases", "visuals-roadmap"]) {
    const narrow = await draw(fixture(id), { theme, width: 390 });
    assert.ok(narrow.warnings.some((w) => w.code === "NARROW_FALLBACK"), id);
    const history = await draw({ ...fixture(id), extensions: { "umf.visual": { ...fixture(id).extensions["umf.visual"], form: "history" } } }, { theme });
    assert.equal(narrow.scene.width, history.scene.width, `${id} is drawn as its history`);
    const wide = await draw(fixture(id), { theme });
    assert.ok(!wide.warnings.some((w) => w.code === "NARROW_FALLBACK"), `${id} keeps its form when wide`);
  }
});
