/* The builder's local API (SD-002): feedback and save. US-018, US-019.

     npm test --workspace @ux-builder/theme-builder */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { defaults } from "../../../packages/engine/src/index.js";
import { generateFromFile } from "../../../packages/engine/node.js";
import { load } from "../../../packages/tokens/compose.mjs";
import { framed, frameSvg, svgBox } from "../api/artwork.mjs";
import { TOOL, feedback, mockModel } from "../api/feedback.mjs";
import { openaiKey } from "../api/key.mjs";
import { plan, save } from "../api/save.mjs";
import { theme } from "../api/theme.mjs";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const LOGO = join(ROOT, "tests/fixtures/logos/red-mark.svg");
const DS = ["carbon", "databricks", "fluent", "material"];
const tmp = mkdtempSync(join(tmpdir(), "builder-api-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

// A stand-in for the OpenAI client: records the request, answers with one adjust_settings call.
const fakeModel = (input, record = []) => ({
  name: "fake", client: { chat: { completions: { create: async (req) => { record.push(req); return { choices: [{ message: { tool_calls: [{ type: "function", function: { name: "adjust_settings", arguments: JSON.stringify(input) } }] } }] }; } } } },
});

describe("feedback (US-018)", () => {
  // @covers US-018-AC1
  test("AC1: the model may only change settings; output is validated and clamped, unknown keys dropped", async () => {
    const r = await feedback({ body: { feedback: "much bolder", settings: defaults() }, model: fakeModel({ chromaScale: 9, warmth: 3, explanation: "Raised saturation a lot." }) });
    assert.deepEqual(r.changes, { chromaScale: 1.5 });
    assert.deepEqual(r.clamped, [{ name: "chromaScale", given: 9, used: 1.5 }]);
    assert.deepEqual(r.dropped, ["warmth"]);
  });

  test("the model is forced to call adjust_settings, whose schema is SD-001's settings plus an explanation", async () => {
    const calls = [];
    await feedback({ body: { feedback: "warmer", settings: defaults(), options: [] }, model: fakeModel({ hueShift: 10, explanation: "Warmer." }, calls) });
    assert.deepEqual(calls[0].tool_choice, { type: "function", function: { name: "adjust_settings" } });
    assert.equal(calls[0].tools[0].function.name, "adjust_settings");
    assert.deepEqual(Object.keys(TOOL.input_schema.properties).sort(), [...Object.keys(defaults()), "explanation"].sort());
    assert.deepEqual(TOOL.input_schema.required, ["explanation"]);
  });

  // @covers US-018-AC2
  test("AC2: the explanation comes back with the changes", async () => {
    const r = await feedback({ body: { feedback: "cooler", settings: defaults() }, model: fakeModel({ hueShift: -12, explanation: "Moved the hue cooler." }) });
    assert.equal(r.explanation, "Moved the hue cooler.");
    assert.deepEqual(r.changes, { hueShift: -12 });
  });

  test("an invalid value from the model is an error, not a palette", async () => {
    await assert.rejects(feedback({ body: { feedback: "x", settings: defaults() }, model: fakeModel({ strategies: "pastel", explanation: "?" }) }), (e) => e.status === 502 && /invalid setting/.test(e.message));
  });

  test("empty or very long feedback is refused before any call", async () => {
    const calls = [];
    await assert.rejects(feedback({ body: { feedback: "  ", settings: defaults() }, model: fakeModel({}, calls) }), /empty/);
    await assert.rejects(feedback({ body: { feedback: "x".repeat(1001), settings: defaults() }, model: fakeModel({}, calls) }), /too long/);
    assert.equal(calls.length, 0);
  });

  // @covers US-018-AC6
  test("AC6: the request carries settings and option colours, never a logo", async () => {
    const calls = [];
    await feedback({ body: { feedback: "warmer", settings: defaults(), options: [{ label: "faithful", light: { structure: "#EB0918" } }], logo: "PHN2Zz4=" }, model: fakeModel({ hueShift: 5, explanation: "x" }, calls) });
    const sent = JSON.stringify(calls[0]);
    assert.doesNotMatch(sent, /PHN2Zz4=|<svg|image/);
    assert.match(sent, /#EB0918/);
  });

  test("the mock model maps the core flow's phrase deterministically", () => {
    const r = mockModel({ feedback: "more conservative", settings: defaults() });
    assert.equal(r.chromaScale, 0.7);
    assert.match(r.explanation, /lowered saturation/);
  });

  test("the key comes from the environment and is never part of a response", async () => {
    assert.equal(openaiKey({ OPENAI_API_KEY: "sk-test" }), "sk-test");
    const r = await feedback({ body: { feedback: "warmer", settings: defaults() }, model: fakeModel({ hueShift: 5, explanation: "x" }) });
    assert.doesNotMatch(JSON.stringify(r), /sk-/);
  });
});

describe("save (US-019)", async () => {
  const { options } = await generateFromFile(LOGO);
  const option = options.find((o) => o.strategy === "muted");
  const logo = { filename: "acme.svg", base64: readFileSync(LOGO).toString("base64") };
  const body = (over = {}) => ({ name: "acme", designSystem: "carbon", option, logo, ...over });
  const repo = (n) => {
    const d = join(tmp, n);
    cpSync(join(ROOT, "tokens"), join(d, "tokens"), { recursive: true });
    cpSync(join(ROOT, "brand"), join(d, "brand"), { recursive: true });
    return d;
  };

  // @covers US-019-AC1
  test("AC1: a name already used by a brand or theme is refused; so is a malformed one", () => {
    for (const name of ["databricks", "plain", "praxis-carbon"]) assert.throws(() => plan({ body: body({ name }), root: ROOT, designSystems: DS }), (e) => e.status === 409);
    for (const name of ["Acme", "acme_legal", "../x", "a".repeat(41)]) assert.throws(() => plan({ body: body({ name }), root: ROOT, designSystems: DS }), (e) => e.status === 400);
  });

  // @covers US-019-AC3
  test("AC3: the brand file, theme file and logo are written, and the build loads them", () => {
    const d = repo("files");
    const r = save({ body: body(), root: d, designSystems: DS, review: "files" });
    assert.deepEqual(r.files.sort(), [".changeset/theme-acme.md", "brand/acme/logo.svg", "tokens/brands/acme.brand.json", "tokens/themes/acme.theme.json"]);
    const src = load(join(d, "tokens"), join(d, "brand"));
    assert.equal(src.themes.get("acme").designSystem, "carbon");
    assert.equal(src.themes.get("acme").default, "light");
    const brand = JSON.parse(readFileSync(join(d, "tokens/brands/acme.brand.json"), "utf8"));
    assert.equal(brand.generation.strategy, "muted");
    assert.equal(brand.generation.logo.path, "../../brand/acme/logo.svg");
    assert.equal(brand.appearances.light.brand["logo-image"].$value, "../../brand/acme/logo.svg");
  });

  test("the saved brand regenerates exactly with npm run brand", () => {
    const d = repo("regen");
    save({ body: body(), root: d, designSystems: DS, review: "files" });
    const out = execFileSync(process.execPath, [join(ROOT, "tools/brand.mjs"), "--regenerate", join(d, "tokens/brands/acme.brand.json")], { encoding: "utf8" });
    assert.match(out, /identical/);
  });

  test("a save regenerates the catalogue and agent guidance, which list every theme", () => {
    // A copy with the generator and what it reads, inside the repository so its modules resolve.
    const d = mkdtempSync(join(ROOT, "node_modules", ".builder-catalogue-"));
    try {
      for (const p of ["tokens", "brand", "guidelines", "tools/gen-catalogue.mjs", "packages/tokens/compose.mjs", "packages/tokens/compose-core.mjs", "packages/tokens/package.json", "packages/ui/src", "packages/ui/scripts", "packages/ui/lint", "packages/ui/package.json", "packages/ui/AGENTS.md", "packages/ui/catalogue.json", "packages/ui/skill", "docs/helix/02-design/contracts/CONTRACT-001-token-names.md"]) cpSync(join(ROOT, p), join(d, p), { recursive: true });
      const r = save({ body: body({ name: "regen-carbon" }), root: d, designSystems: DS, review: "files" });
      assert.deepEqual(r.files.filter((f) => f.startsWith("packages/")).sort(), ["packages/ui/AGENTS.md", "packages/ui/catalogue.json", "packages/ui/skill/ux-builder-ui/SKILL.md"]);
      assert.ok(JSON.parse(readFileSync(join(d, "packages/ui/catalogue.json"), "utf8")).themes.some((t) => t.name === "regen-carbon"));
      assert.match(readFileSync(join(d, "packages/ui/AGENTS.md"), "utf8"), /`regen-carbon` \| carbon/);
    } finally { rmSync(d, { recursive: true, force: true }); }
  });

  test("a theme named <brand>-<design system> is stored as that brand, as the prototype shows", () => {
    const d = repo("names");
    const dark = { filename: "acme-dark.svg", base64: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="9" height="9" fill="#FFFFFF"/></svg>').toString("base64") };
    const r = save({ body: body({ name: "acme-legal-carbon", darkLogo: dark }), root: d, designSystems: DS, review: "files" });
    assert.deepEqual(r.files.sort(), [".changeset/theme-acme-legal-carbon.md", "brand/acme-legal/logo-dark.svg", "brand/acme-legal/logo.svg", "tokens/brands/acme-legal.brand.json", "tokens/themes/acme-legal-carbon.theme.json"]);
    const src = load(join(d, "tokens"), join(d, "brand"));
    assert.equal(src.themes.get("acme-legal-carbon").brand, "acme-legal");
    assert.equal(src.themes.get("acme-legal-carbon").title, "Acme Legal Carbon");
    assert.equal(src.brands.get("acme-legal").title, "Acme Legal");
    const brand = JSON.parse(readFileSync(join(d, "tokens/brands/acme-legal.brand.json"), "utf8"));
    assert.equal(brand.appearances.dark.brand["logo-image"].$value, "../../brand/acme-legal/logo-dark.svg");
    assert.equal(brand.appearances.light.brand["logo-image"].$value, "../../brand/acme-legal/logo.svg");
  });

  // @covers US-020-AC4
  test("US-020-AC4: a theme saved after start previews, composed from tokens/ on request", () => {
    const d = repo("preview");
    save({ body: body({ name: "fresh-carbon" }), root: d, designSystems: DS, review: "files" });
    const t = theme({ root: d, name: "fresh-carbon" });
    assert.deepEqual([t.name, t.brand.name, t.designSystem.name, t.iconSet], ["fresh-carbon", "fresh", "carbon", "carbon"]);
    assert.ok(t.brand.generated);
    const brand = JSON.parse(readFileSync(join(d, "tokens/brands/fresh.brand.json"), "utf8"));
    for (const ap of Object.keys(brand.appearances)) {
      const a = t.appearances[ap];
      assert.equal(a.tokens["piq-color-accent"], brand.appearances[ap].color.accent.$value, `${ap} accent resolves`);
      assert.ok(Object.keys(a.tokens).every((k) => k.startsWith("piq-")) && !Object.values(a.tokens).some((v) => String(v).startsWith("url(")));
      assert.equal(a.palette.find((c) => c.role === "accent").hex, brand.appearances[ap].color.accent.$value);
      assert.match(a.logo, /^data:image\/svg\+xml;base64,/, "the saved logo");
      assert.equal(a.favicon, null);
    }
    assert.throws(() => theme({ root: d, name: "nope" }), (e) => e.status === 404);
  });

  test("a theme's artwork comes back for each appearance", () => {
    const t = theme({ root: ROOT, name: "praxis-carbon" });
    const decode = (u) => Buffer.from(u.split(",")[1], "base64").toString("utf8");
    assert.notEqual(t.appearances.light.logo, t.appearances.dark.logo, "a logo per appearance");
    assert.match(decode(t.appearances.light.favicon), /<svg/);
    assert.equal(t.appearances.dark.logoAspect, "3.045");
  });

  // @covers US-019-AC5
  test("AC5: a logo with margins is drawn from a copy framed to the drawing; the upload stays the generation source", () => {
    const d = repo("frame");
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="500" viewBox="0 0 1000 500" aria-label="Wide"><rect x="400" y="200" width="200" height="100" fill="#1F3A5F"/></svg>';
    const wide = { filename: "wide.svg", base64: Buffer.from(svg).toString("base64"), frame: { bounds: { x: 0.4, y: 0.4, w: 0.2, h: 0.2 } } };
    const dark = { filename: "wide-dark.svg", base64: Buffer.from(svg.replace("#1F3A5F", "#FFFFFF")).toString("base64"), frame: { bounds: { x: 0.4, y: 0.4, w: 0.2, h: 0.2 } } };
    const r = save({ body: body({ name: "wide", logo: wide, darkLogo: dark }), root: d, designSystems: DS, review: "files" });
    assert.ok(r.files.includes("brand/wide/logo.svg") && r.files.includes("brand/wide/logo-framed.svg") && r.files.includes("brand/wide/logo-dark.svg"));
    assert.equal(readFileSync(join(d, "brand/wide/logo.svg"), "utf8"), svg, "the upload, byte for byte");
    const framed = readFileSync(join(d, "brand/wide/logo-framed.svg"), "utf8");
    assert.match(framed, /^<svg viewBox="396 196 208 108" width="208" height="108" xmlns="http:\/\/www.w3.org\/2000\/svg" aria-label="Wide">/, "the drawing plus a 2% margin");
    assert.ok(framed.endsWith('<rect x="400" y="200" width="200" height="100" fill="#1F3A5F"/></svg>'), "artwork unchanged");
    const brand = JSON.parse(readFileSync(join(d, "tokens/brands/wide.brand.json"), "utf8"));
    assert.equal(brand.appearances.light.brand["logo-image"].$value, "../../brand/wide/logo-framed.svg");
    assert.equal(brand.appearances.light.brand["logo-aspect"].$value, "1.926");
    assert.match(readFileSync(join(d, "brand/wide/logo-dark.svg"), "utf8"), /viewBox="396 196 208 108"/, "the dark logo is stored framed");
    assert.equal(brand.generation.logo.path, "../../brand/wide/logo.svg");
    load(join(d, "tokens"), join(d, "brand"));
  });

  test("a PNG with margins is drawn from the browser's crop, checked; a tight logo is not copied", () => {
    const png = (w, h) => { const b = Buffer.alloc(33); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b); b.writeUInt32BE(13, 8); b.write("IHDR", 12, "latin1"); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20); return b; };
    const art = { ext: ".png", bytes: png(1000, 1000) };
    const crop = framed(art, { bounds: { x: 0.1, y: 0.3, w: 0.8, h: 0.4 }, base64: png(800, 400).toString("base64") }, "logo");
    assert.deepEqual([crop.framed, crop.aspect], [true, 2]);
    assert.throws(() => framed(art, { bounds: { x: 0.1, y: 0.3, w: 0.8, h: 0.4 }, base64: "AAAA" }, "logo"), /not a PNG/);
    assert.throws(() => framed(art, { bounds: { x: 0.5, y: 0, w: 0.8, h: 1 } }, "logo"), /not valid/);
    const tight = framed(art, { bounds: { x: 0, y: 0, w: 0.99, h: 0.99 } }, "logo");
    assert.deepEqual([tight.framed, tight.aspect, tight.bytes], [false, 1, art.bytes]);
    assert.equal(svgBox('<svg width="72px" height="36">').w, 72);
    assert.equal(frameSvg("<p>not svg</p>", { x: 0, y: 0, w: 1, h: 1 }), null);
  });

  // @covers US-019-AC7
  test("AC7: a mark is stored framed to a square and set as mark and favicon in every appearance", () => {
    const d = repo("mark");
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="500" viewBox="0 0 1000 500"><rect x="400" y="200" width="200" height="100" fill="#1F3A5F"/></svg>';
    const mark = { filename: "symbol.svg", base64: Buffer.from(svg).toString("base64"), frame: { bounds: { x: 0.4, y: 0.4, w: 0.2, h: 0.2 } } };
    const r = save({ body: body({ name: "marked", mark }), root: d, designSystems: DS, review: "files" });
    assert.ok(r.files.includes("brand/marked/mark.svg"));
    assert.match(readFileSync(join(d, "brand/marked/mark.svg"), "utf8"), /^<svg viewBox="396 146 208 208" width="208" height="208"/, "a square centred on the drawing");
    const brand = JSON.parse(readFileSync(join(d, "tokens/brands/marked.brand.json"), "utf8"));
    for (const a of Object.values(brand.appearances)) {
      assert.equal(a.brand["mark-image"].$value, "../../brand/marked/mark.svg");
      assert.equal(a.brand.favicon.$value, "../../brand/marked/mark.svg");
    }
    load(join(d, "tokens"), join(d, "brand"));
    const without = JSON.parse(String(plan({ body: body({ name: "plainmark" }), root: ROOT, designSystems: DS })["tokens/brands/plainmark.brand.json"]));
    assert.ok(Object.values(without.appearances).every((a) => !a.brand["mark-image"] && !a.brand.favicon), "no mark, no mark or favicon");
    const png = (w2, h2) => { const b = Buffer.alloc(33); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b); b.write("IHDR", 12, "latin1"); b.writeUInt32BE(w2, 16); b.writeUInt32BE(h2, 20); return b; };
    assert.throws(() => framed({ ext: ".png", bytes: png(9, 9) }, { bounds: { x: 0.1, y: 0.1, w: 0.5, h: 0.2 }, base64: png(50, 20).toString("base64") }, "mark", { square: true }), /not square/);
  });

  // @covers US-019-AC6
  test("AC6: a save carries a changeset, so merging it queues a release with the theme", () => {
    const files = plan({ body: body({ name: "acme-carbon" }), root: ROOT, designSystems: DS });
    const cs = String(files[".changeset/theme-acme-carbon.md"]);
    assert.match(cs, /^---\n"@ux-builder\/tokens": minor\n"@ux-builder\/ui": patch\n---\n/);
    assert.match(cs, /`acme-carbon` theme/);
    assert.match(cs, /data-theme="acme-carbon"/);
  });

  test("a theme whose brand name is taken is refused", () => {
    assert.throws(() => plan({ body: body({ name: "synaptiq-carbon" }), root: ROOT, designSystems: DS }), (e) => e.status === 409 && /brand called "synaptiq"/.test(e.message));
  });

  test("an unknown design system, a bad logo or a missing option is refused", () => {
    assert.throws(() => plan({ body: body({ designSystem: "bootstrap" }), root: ROOT, designSystems: DS }), /shared design systems/);
    assert.throws(() => plan({ body: body({ logo: { filename: "x.gif", base64: "AAAA" } }), root: ROOT, designSystems: DS }), /SVG or PNG/);
    assert.throws(() => plan({ body: body({ option: null }), root: ROOT, designSystems: DS }), /choose an option/);
  });

  test("pull-request mode: a branch, a commit with only the theme's files, a push and gh pr create", () => {
    const d = repo("pr"), remote = join(tmp, "remote.git"), ghLog = join(tmp, "gh.log"), gh = join(tmp, "gh");
    const git = (...a) => execFileSync("git", a, { cwd: d, encoding: "utf8" }).trim();
    execFileSync("git", ["init", "-q", "--bare", remote]);
    git("init", "-q", "-b", "main"); git("config", "user.email", "t@example.com"); git("config", "user.name", "Test");
    git("add", "."); git("commit", "-q", "-m", "base"); git("remote", "add", "origin", remote); git("push", "-q", "-u", "origin", "main");
    writeFileSync(gh, `#!/bin/sh\necho "$@" > ${ghLog}\necho https://example.invalid/pull/7\n`); chmodSync(gh, 0o755);
    const r = save({ body: body(), root: d, designSystems: DS, review: "pr", gh });
    assert.equal(r.branch, "theme/acme");
    assert.equal(r.pr, "https://example.invalid/pull/7");
    assert.equal(git("rev-parse", "--abbrev-ref", "HEAD"), "main", "back on the starting branch");
    assert.deepEqual(git("show", "--name-only", "--format=", "theme/acme").split("\n").sort(), [".changeset/theme-acme.md", "brand/acme/logo.svg", "tokens/brands/acme.brand.json", "tokens/themes/acme.theme.json"]);
    assert.ok(execFileSync("git", ["--git-dir", remote, "branch", "--list", "theme/acme"], { encoding: "utf8" }).includes("theme/acme"), "pushed");
    assert.match(readFileSync(ghLog, "utf8"), /pr create --head theme\/acme --base main --title Add the acme theme/, "reviewed against the branch it was made from");
    assert.ok(!existsSync(join(d, "tokens/themes/acme.theme.json")), "the files live on the theme branch, not the starting one");
  });
});
