/* Inputs the schema allows that the fixtures do not exercise: each once broke a layout or a writer. */

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { main } from "../cli.mjs";
import { parse, toHex } from "../src/theme/color.mjs";
import { check, createTheme, loadTheme, render } from "../node.mjs";
import { fixtures } from "./helpers.mjs";

const doc = (visual) => ({ umf: "0.10.0", id: `visual:${visual.id}`, vocabularies: { "umf.visual": { version: "1.0.0" } }, extensions: { "umf.visual": visual }, modules: [] });
const theme = createTheme(loadTheme("praxis"));
const clean = async (visual) => {
  const r = await render(doc(visual), { theme: "praxis" });
  assert.deepEqual(check(r.layout, { theme }), [], visual.id);
  return r;
};
let browser, page;
before(async () => {
  browser = await chromium.launch();
  page = await browser.newPage();
  await page.setContent("<div></div>");
  await page.addScriptTag({ path: createRequire(import.meta.url).resolve("mermaid/dist/mermaid.min.js") });
});
after(() => browser?.close());
const parses = (text) => page.evaluate(async (t) => { try { await window.mermaid.parse(t); return "ok"; } catch (e) { return String(e.message); } }, text);

test("@covers US-164-AC2 document text in a step cannot close the presentation's script", async () => {
  const v = structuredClone(fixtures.find((f) => f.id === "beacon-overview").document);
  v.extensions["umf.visual"].steps[0].title = "</script><script>alert(1)</script>";
  v.extensions["umf.visual"].steps[0].caption = "<!-- </SCRIPT x>";
  const { content } = await render(v, { theme: "praxis", output: "presentation" });
  const script = content.slice(content.indexOf('<script type="module">'));
  assert.equal((script.match(/<\/script>/gi) ?? []).length, 1, "only the page's own closing tag");
  const dir = mkdtempSync(join(tmpdir(), "uxb-xss-"));
  try {
    writeFileSync(join(dir, "p.html"), content);
    const p = await browser.newPage();
    let dialog = false;
    p.on("dialog", (d) => { dialog = true; d.dismiss(); });
    await p.goto(`file://${join(dir, "p.html")}`);
    await p.keyboard.press("ArrowRight");
    assert.equal(await p.locator("#uxb-title").textContent(), "</script><script>alert(1)</script>");
    assert.equal(dialog, false);
    await p.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("@covers US-163-AC3 a zoned flow with a node outside every group, or an untiered root group, is refused with umf's form rule", async () => {
  const loose = { id: "z", kind: "flow", form: "zoned", question: "q", groups: [{ id: "g", label: "G", role: "zone", tier: 2 }], nodes: [{ id: "a", label: "A", group: "g" }, { id: "b", label: "B" }], edges: [{ id: "e", from: "b", to: "a" }] };
  await assert.rejects(render(doc(loose), { theme: "praxis" }), (e) => e.code === "VISUAL_INVALID" && e.diagnostics.some((d) => d.code === "VISUAL_FORM_RULE"));
  const untiered = { id: "z", kind: "flow", form: "zoned", question: "q", groups: [{ id: "g", label: "G", role: "zone" }], nodes: [{ id: "a", label: "A", group: "g" }] };
  await assert.rejects(render(doc(untiered), { theme: "praxis" }), (e) => e.code === "VISUAL_INVALID");
});

test("@covers US-163-AC1 composite states are drawn behind their states and transitions, and pass check", async () => {
  for (const order of [["p", "c", "d", "e"], ["c", "d", "p", "e"]]) {
    const states = { p: { id: "p", label: "Working" }, c: { id: "c", label: "Drafting", parent: "p" }, d: { id: "d", label: "Reviewing", parent: "p" }, e: { id: "e", label: "Done" } };
    const r = await clean({ id: "m", kind: "state", form: "machine", question: "q", nodes: order.map((id) => states[id]),
      state: { initial: "c", final: ["e"], transitions: [{ id: "t1", from: "c", to: "d", event: "submit" }, { id: "t2", from: "p", to: "e", event: "approve" }] } });
    const at = (id) => r.content.indexOf(`id="m--${id}"`);
    assert.ok(at("p") < at("t1") && at("t1") < at("c") && at("t1") < at("d"), order.join());
    assert.match(r.content, new RegExp(`id="m--p" class="uxb-state"[^>]*>\\n<rect [^>]*rx="(\\d+)"`));
    assert.ok(Number(/id="m--p" class="uxb-state"[^>]*>\n<rect [^>]*rx="([\d.]+)"/.exec(r.content)[1]) < 20, "a container is not a pill");
  }
});

test("@covers US-163-AC1 a lifecycle whose main path loops back or skips routes those transitions below the row", async () => {
  await clean({ id: "l", kind: "state", form: "lifecycle", question: "q", nodes: ["a", "b", "c"].map((id) => ({ id, label: id.toUpperCase() })),
    state: { initial: "a", transitions: [{ id: "t1", from: "a", to: "b", event: "go", path: "main" }, { id: "t2", from: "b", to: "c", event: "go on", path: "main" },
      { id: "t3", from: "a", to: "c", event: "skip ahead", path: "alternate" }, { id: "t4", from: "c", to: "a", event: "start again", path: "failure" }] } });
});

test("@covers US-163-AC1 a long note on one participant fits its box", async () => {
  await clean({ id: "s", kind: "sequence", form: "lifelines", question: "q", sequence: {
    participants: [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }],
    messages: [{ id: "m1", from: "a", to: "b", label: "asks" }, { id: "m2", from: "a", to: "a", kind: "note", label: "A note long enough to wrap onto several lines inside its own box, whatever the column" }] } });
});

test("@covers US-165-AC1 Mermaid keeps ids distinct that differ only by - and _, and writes nested and phase groups", async () => {
  const flow = await render(doc({ id: "f", kind: "flow", form: "network", question: "q", nodes: [{ id: "a-b", label: "A-B" }, { id: "a_b", label: "A_B" }], edges: [{ id: "e", from: "a-b", to: "a_b" }] }), { theme: "praxis", output: "mermaid" });
  assert.equal(await parses(flow.content), "ok");
  assert.match(flow.content, /v_a_hb\["A-B"\]/);
  assert.match(flow.content, /v_a__b\["A_B"\]/);
  assert.match(flow.content, /v_a_hb --> v_a__b/);
  const seq = await render(doc({ id: "s", kind: "sequence", form: "lifelines", question: "q",
    groups: [{ id: "ph", label: "Sign in", role: "phase" }, { id: "lp", label: "each retry", role: "loop", parent: "ph" }],
    sequence: { participants: [{ id: "a", label: "A" }, { id: "b", label: "B" }], messages: [
      { id: "m1", from: "a", to: "b", label: "one", group: "ph" }, { id: "m2", from: "b", to: "a", label: "two", kind: "return", group: "lp" }, { id: "m3", from: "a", to: "b", label: "three" }] } }), { theme: "praxis", output: "mermaid" });
  assert.equal(await parses(seq.content), "ok");
  assert.match(seq.content, /rect rgb\(\d+, \d+, \d+\)\n {4}Note over v_a,v_b: Sign in\n {4}v_a->>v_b: one\n {4}loop each retry\n {6}v_b-->>v_a: two\n {4}end\n {2}end\n {2}v_a->>v_b: three/);
  assert.doesNotMatch(seq.content, /critical/);
});

test("@covers US-165-AC2 markup in labels and details is written as Mermaid entity codes, never as HTML", async () => {
  const r = await render(doc({ id: "f", kind: "flow", form: "network", question: "q", nodes: [{ id: "a", label: "<b>A</b>", detail: '<img src=x onerror="alert(1)"> & more' }] }), { theme: "praxis", output: "mermaid" });
  assert.equal(await parses(r.content), "ok");
  assert.doesNotMatch(r.content, /<b>|<img/);
  assert.match(r.content, /#lt;b#gt;A#lt;\/b#gt;<br\/><small>#lt;img src=x onerror=#quot;alert\(1\)#quot;#gt; #amp; more<\/small>/);
});

test("@covers US-163-AC6 bad options exit 2 with the usage, and a repeated id is refused rather than overwritten", async () => {
  const file = fixtures.find((f) => f.id === "helix-context").file;
  for (const args of [["--theme", "nope"], ["--theme", "praxis", "--appearance", "dim"], ["--theme", "praxis", "--width", "abc"], ["--theme", "praxis", "--width", "-5"]]) {
    const r = await main(["render", file, ...args]);
    assert.equal(r.code, 2, args.join(" "));
    assert.match(r.stderr, /usage: ux-builder-visuals render/);
  }
  const out = mkdtempSync(join(tmpdir(), "uxb-dup-"));
  try {
    const r = await main(["render", file, file, "--theme", "praxis", "--out", out]);
    assert.equal(r.code, 1);
    const summary = JSON.parse(r.stdout);
    assert.equal(summary.rendered.length, 1);
    assert.equal(summary.refused[0].code, "VISUAL_DUPLICATE_ID");
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test("@covers US-163-AC1 color-mix follows CSS Color 5: transparent, a leading percentage, a sum under 100%", () => {
  assert.equal(toHex(parse("color-mix(in srgb, #29261F 10%, transparent)")), "#29261F1A");
  assert.equal(toHex(parse("color-mix(in srgb, 30% #000, #fff)")), "#B3B3B3");
  assert.equal(toHex(parse("color-mix(in srgb, #000 20%, #fff 20%)")), "#80808066");
  assert.equal(toHex(parse("color-mix(in srgb, #D12800 12%, #FFFFFF)")), "#F9E5E0");
});

test("@covers US-163-AC1 zoned lanes nest: right-going lines from one box, rightmost exit on top", async () => {
  const { layout } = await render(structuredClone(fixtures.find((f) => f.id === "beacon-deployment").document), { theme: "praxis" });
  const lane = (e) => e.points[1][1];
  const api = layout.boxes.find((b) => b.id === "api");
  const below = layout.edges.filter((e) => e.from === "api" && e.points[0][1] === api.y + api.height);
  // Lines going down to the next tier and heading right (a loop back up to a neighbour is not one of them).
  const right = below.filter((e) => e.points.at(-1)[1] > lane(e) && e.points.at(-1)[0] > e.points[0][0]).sort((a, b) => b.points[0][0] - a.points[0][0]);
  assert.ok(right.length >= 2);
  for (let i = 1; i < right.length; i++) assert.ok(lane(right[i - 1]) < lane(right[i]), `${right[i - 1].id} above ${right[i].id}`);
});

test("@covers US-163-AC1 zoned neighbours that connect are joined side to side, with room for their tag", async () => {
  const { layout } = await render(structuredClone(fixtures.find((f) => f.id === "beacon-deployment").document), { theme: "praxis" });
  const box = (id) => layout.boxes.find((b) => b.id === id);
  for (const [id, a, b] of [["web--api", "web", "api"], ["gateway--models", "gateway", "models"]]) {
    const e = layout.edges.find((x) => x.id === id);
    assert.equal(e.points.length, 2, `${id} is one straight line`);
    // The report rounds each coordinate to 0.01px on its own.
    assert.ok(Math.abs(e.points[0][0] - (box(a).x + box(a).width)) < 0.05, `${id} leaves ${a}'s right side`);
    assert.ok(Math.abs(e.points[1][0] - box(b).x) < 0.05, `${id} enters ${b}'s left side`);
    const tag = layout.boxes.find((x) => x.id === e.label);
    assert.ok(tag.x > e.points[0][0] && tag.x + tag.width < e.points[1][0], `${id}'s tag sits between the two boxes`);
  }
});

test("@covers US-163-AC1 zoned corridor tracks nest: the shorter line runs inside, and the two never cross", async () => {
  // Two lines that skip tiers, so they take the corridor: one spans two tiers, the other three.
  const doc = structuredClone(fixtures.find((f) => f.id === "beacon-deployment").document);
  doc.extensions["umf.visual"].edges.push({ id: "admin--worker", from: "admin", to: "worker", label: "schedules digests" }, { id: "agent--db", from: "agent", to: "db", label: "exports a ticket" });
  const { layout } = await render(doc, { theme: "praxis" });
  const edge = (id) => layout.edges.find((e) => e.id === id);
  const inner = edge("admin--worker"), outer = edge("agent--db");
  const track = (e) => Math.min(...e.points.map(([x]) => x));
  assert.ok(track(inner) > track(outer), "the line spanning fewer tiers takes the inner track");
  const segments = (p) => p.slice(1).map((q, i) => [p[i], q]);
  const crosses = (a, b) => {
    const [h, v] = a[0][1] === a[1][1] ? [a, b] : [b, a];
    if (h[0][1] !== h[1][1] || v[0][0] !== v[1][0]) return false;
    const [y, x] = [h[0][1], v[0][0]];
    return x > Math.min(h[0][0], h[1][0]) && x < Math.max(h[0][0], h[1][0]) && y > Math.min(v[0][1], v[1][1]) && y < Math.max(v[0][1], v[1][1]);
  };
  assert.equal(segments(inner.points).filter((a) => segments(outer.points).some((b) => crosses(a, b))).length, 0);
});

test("@covers US-163-AC1 no tag has another line through or under it, in any fixture", async () => {
  const through = ([[x1, y1], [x2, y2]], b) => (y1 === y2
    ? y1 > b.y && y1 < b.y + b.height && Math.max(x1, x2) > b.x && Math.min(x1, x2) < b.x + b.width
    : x1 > b.x && x1 < b.x + b.width && Math.max(y1, y2) > b.y && Math.min(y1, y2) < b.y + b.height);
  for (const f of fixtures) {
    let layout;
    try { ({ layout } = await render(f.document, { theme: "praxis" })); } catch (e) { if (e.code === "VISUAL_UNSUPPORTED") continue; throw e; }
    for (const tag of layout.boxes.filter((b) => b.kind === "label")) {
      const owner = tag.id.replace(/#label$/, "");
      const crossing = layout.edges.filter((e) => e.id !== owner && e.label !== tag.id && e.points.slice(1).some((p, i) => through([e.points[i], p], tag)));
      assert.deepEqual(crossing.map((e) => e.id), [], `${f.id}: ${owner}'s tag`);
    }
  }
});
