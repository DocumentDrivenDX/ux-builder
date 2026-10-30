/* US-163: draw a visual in any theme, checked. */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { SUPPORTED, check, createTheme, draw, loadTheme, render } from "../node.mjs";
import { textEquivalent } from "../src/text.mjs";
import { HERE, KNOWN, PER_FORM, fixture, fixtures, kindForm, themes } from "./helpers.mjs";

const supported = fixtures.filter((f) => SUPPORTED.has(kindForm(f.document)));

test("@covers US-163-AC1 every graph-kind fixture renders in every theme and appearance, passes check, and renders the same bytes twice", async () => {
  assert.ok(supported.length >= 40, `expected the inventory's graph visuals, found ${supported.length}`);
  for (const { name, appearances } of themes) {
    for (const appearance of [...appearances, ...(appearances.length === 2 ? ["both"] : [])]) {
      const theme = createTheme(loadTheme(name, appearance), appearance);
      for (const f of supported) {
        const first = await render(f.document, { theme: name, appearance });
        const findings = check(first.layout, { theme }).filter((x) => !KNOWN[f.id]?.includes(x.code));
        assert.deepEqual(findings, [], `${f.id} in ${name} ${appearance}`);
        const again = await render(f.document, { theme: name, appearance });
        assert.equal(again.content, first.content, `${f.id} in ${name} ${appearance} is not deterministic`);
      }
    }
  }
});

test("@covers US-163-AC1 golden SVGs: one fixture per form in two themes", async () => {
  const dir = join(HERE, "test/golden");
  mkdirSync(dir, { recursive: true });
  for (const [form, id] of Object.entries(PER_FORM)) {
    assert.ok(SUPPORTED.has(form));
    for (const [name, appearance] of [["praxis", "light"], ["databricks", "dark"]]) {
      const { content } = await render(fixture(id), { theme: name, appearance });
      const file = join(dir, `${id}.${name}-${appearance}.svg`);
      if (process.env.UPDATE_GOLDEN || !existsSync(file)) writeFileSync(file, content);
      assert.equal(content, readFileSync(file, "utf8"), `${file} changed; rerun with UPDATE_GOLDEN=1 after reviewing it`);
    }
  }
});

test("@covers US-163-AC2 appearance both writes every colour as a var() with a fallback", async () => {
  for (const id of Object.values(PER_FORM)) {
    const { content } = await render(fixture(id), { theme: "praxis", appearance: "both" });
    const colours = [...content.matchAll(/(?:fill|stroke):([^;"]+)/g)].map((m) => m[1]).filter((c) => c !== "none");
    assert.ok(colours.length > 0);
    // A derived colour is a color-mix of two such vars.
    const one = "var\\(--piq-[\\w-]+, #[0-9A-F]{6}\\)";
    for (const c of colours) assert.match(c, new RegExp(`^(${one}|color-mix\\(in srgb, ${one} \\d+%, ${one}\\))$`), `${id}: ${c}`);
    assert.match(content, /font-family:var\(--piq-font-body, /);
    assert.doesNotMatch(content.replace(/var\([^)]*\)/g, ""), /#[0-9A-Fa-f]{3,8}\b/, `${id} has a colour literal outside var()`);
  }
});

test("@covers US-163-AC3 refusals: unknown major version, dangling reference and unknown content", async () => {
  const refuse = async (doc, code, options = {}) => {
    await assert.rejects(render(doc, { theme: "praxis", ...options }), (e) => e.code === code, code);
  };
  const v2 = fixture("helix-context"); v2.vocabularies["umf.visual"].version = "2.0.0";
  await refuse(v2, "VISUAL_VERSION");
  // Every form umf.visual 1.0 defines is drawn since 0.2.0, so no valid document is unsupported;
  // VISUAL_UNSUPPORTED stays for a form a later minor version of umf.visual adds.
  const dangling = fixture("helix-context"); dangling.extensions["umf.visual"].edges[0].to = "nowhere";
  await refuse(dangling, "VISUAL_INVALID");
  const wrongForm = fixture("helix-context"); wrongForm.extensions["umf.visual"].form = "lifelines";
  await refuse(wrongForm, "VISUAL_INVALID");
  const badRole = fixture("helix-context"); badRole.extensions["umf.visual"].nodes[0].role = "database";
  await refuse(badRole, "VISUAL_INVALID");
  const unknown = fixture("helix-context"); unknown.extensions["umf.visual"].nodes[0].fill = "#123456";
  await refuse(unknown, "VISUAL_INCOMPLETE");
  const drawn = await render(unknown, { theme: "praxis", allowIncomplete: true });
  assert.deepEqual(drawn.warnings.map((w) => w.code), ["FONT_STAND_IN", "INCOMPLETE"]);
  assert.doesNotMatch(drawn.content, /#123456/i);
});

test("@covers US-163-AC5 the SVG is accessible, carries stable ids and step membership, and references nothing outside itself", async () => {
  const doc = fixture("beacon-field-guide");
  const v = doc.extensions["umf.visual"];
  const { content, text } = await render(doc, { theme: "databricks" });
  assert.match(content, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 [\d.]+ [\d.]+" width="[\d.]+" height="[\d.]+" role="img" aria-labelledby="beacon-field-guide-title" aria-describedby="beacon-field-guide-desc"/);
  assert.match(content, new RegExp(`<title id="beacon-field-guide-title">${v.title.replace(/[.]/g, "\\.")}</title>`));
  assert.match(content, /<desc id="beacon-field-guide-desc">Start at the API: it is the only part that acts for an agent/);
  for (const n of v.nodes) assert.match(content, new RegExp(`<g id="beacon-field-guide--${n.id}" class="uxb-node"`));
  for (const s of v.steps) for (const id of s.focus) assert.match(content, new RegExp(`id="beacon-field-guide--${id}"[^>]*data-steps="[^"]*\\b${s.id}\\b`));
  assert.doesNotMatch(content.replace("http://www.w3.org/2000/svg", ""), /https?:|@import|url\(/);
  for (const n of v.nodes) assert.ok(text.includes(n.label), `text equivalent names ${n.label}`);
});

test("@covers US-163-AC1 a theme whose font is shipped is measured with it; one that is not names its stand-in", async () => {
  const shipped = await draw(fixture("helix-context"), { theme: "databricks" });
  assert.equal(shipped.layout.font.family, "DM Sans");
  assert.equal(shipped.layout.font.standIn, false);
  const system = await draw(fixture("helix-context"), { theme: "praxis" });
  assert.equal(system.layout.font.standIn, true);
  assert.equal(system.warnings[0].code, "FONT_STAND_IN");
});

test("@covers US-163-AC1 narrow lifelines fall back to the ladder", async () => {
  const r = await render(fixture("beacon-reply-draft"), { theme: "praxis", width: 390 });
  assert.ok(r.warnings.some((w) => w.code === "NARROW_FALLBACK"));
  assert.ok(r.layout.width <= 390);
  assert.deepEqual(check(r.layout, { theme: createTheme(loadTheme("praxis")) }), []);
});

test("@covers US-164-AC4 a step outside the sequence is marked with its words, not a number, in every form that walks", async () => {
  const presets = ["throughout", "before", "after", "background", "scheduled", "on-failure", "optional"];
  const words = { throughout: "THROUGHOUT", before: "BEFORE", after: "AFTER", background: "IN THE BACKGROUND", scheduled: "SCHEDULED", "on-failure": "ON FAILURE", optional: "IF NEEDED" };
  const theme = createTheme(loadTheme("praxis", "light"), "light");
  for (const id of Object.values(PER_FORM)) {
    const base = fixture(id), kind = base.extensions["umf.visual"].kind;
    if (!["flow", "state"].includes(kind) || !SUPPORTED.has(kindForm(base))) continue;
    const v0 = base.extensions["umf.visual"], items = [...(v0.edges ?? []), ...(v0.state?.transitions ?? [])].map((x) => x.id);
    if (items.length < 3) continue;
    // One numbered step, then the presets and a tagged other, one per line, in as many renders as it takes.
    const all = [...presets, "other"], per = items.length - 1;
    for (let k = 0; k < all.length; k += per) {
      const doc = fixture(id), v = doc.extensions["umf.visual"], batch = all.slice(k, k + per);
      v.steps = [{ id: "first", title: "First", focus: [items[0]] },
        ...batch.map((when, j) => ({ id: `w-${when}`, title: when, focus: [items[1 + j]], when, ...(when === "other" ? { tag: "on retry" } : {}) }))];
      const { content, layout } = await render(doc, { theme: "praxis" });
      const findings = check(layout, { theme }).filter((x) => !KNOWN[id]?.includes(x.code));
      assert.deepEqual(findings, [], `${id}: ${batch}`);
      for (const when of batch) assert.ok(content.includes(`>${when === "other" ? "ON RETRY" : words[when]}</text>`), `${id}: ${when}`);
      assert.ok(!content.includes(">2</text>"), `${id}: only the one numbered step is numbered`);
      const text = textEquivalent(v);
      assert.match(text, /^1\. First/m);
      for (const when of batch) assert.match(text, new RegExp(`^${when === "other" ? "On retry" : words[when][0] + words[when].slice(1).toLowerCase()}: ${when}`, "m"));
    }
  }
});

test("@covers US-163-AC7 a zoned view captions its zones, ends its lines in the accent, and joins neighbours across zones side to side", async () => {
  const theme = createTheme(loadTheme("praxis", "light"), "light");
  const doc = fixture("beacon-deployment"), v = doc.extensions["umf.visual"];
  const { content, layout } = await render(doc, { theme: "praxis" });
  // Captions: each zone's detail, inside its zone, with no line through it.
  const zones = new Map(layout.boxes.filter((b) => b.kind === "group").map((b) => [b.id, b]));
  const segments = layout.edges.flatMap((e) => e.points.slice(1).map((p, i) => [e.points[i], p]));
  for (const g of v.groups.filter((x) => x.detail)) {
    const t = layout.texts.find((x) => x.text === g.detail), z = zones.get(g.id);
    assert.ok(t && t.x >= z.x && t.x + t.width <= z.x + z.width && t.y >= z.y && t.y + t.height <= z.y + z.height, `${g.id}'s caption in its zone`);
    assert.ok(!segments.some(([[x1, y1], [x2, y2]]) => Math.max(x1, x2) > t.x && Math.min(x1, x2) < t.x + t.width && Math.max(y1, y2) > t.y && Math.min(y1, y2) < t.y + t.height), `${g.id}'s caption is clear of lines`);
  }
  // Heads: every arrowhead is the accent.
  const accent = theme.color("piq-color-accent");
  const heads = [...content.matchAll(/<path d="[^"]*Z" style="fill:([^;]+);stroke:([^;]+);/g)];
  assert.ok(heads.length >= v.edges.length);
  for (const [, fill, stroke] of heads) assert.deepEqual([fill, stroke], [accent, accent]);
  // Neighbours across zones: the reply drafter, at the end of the app platform, joins the model
  // gateway at the start of model services, its neighbour in the same tier, side to side.
  assert.notEqual(v.nodes.find((n) => n.id === "drafter").group, v.nodes.find((n) => n.id === "gateway").group, "in two zones");
  const moved = { layout };
  assert.deepEqual(check(moved.layout, { theme }), []);
  const join = moved.layout.edges.find((e) => e.from === "drafter" && e.to === "gateway");
  const a = moved.layout.boxes.find((b) => b.id === "drafter"), b = moved.layout.boxes.find((x) => x.id === "gateway");
  assert.equal(join.points.length, 2, "one straight run");
  assert.deepEqual(join.points.map(([x]) => Math.round(x)), [Math.round(a.x + a.width), Math.round(b.x)], "from the drafter's right side to the gateway's left");
  const tag = moved.layout.boxes.find((x) => x.id === join.label);
  assert.ok(tag.x > a.x + a.width && tag.x + tag.width < b.x, "its tag between them");
});
