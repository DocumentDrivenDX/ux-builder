/* The catalogue and the agent guidance (US-014, FEAT-004 SDK-12, SDK-13).

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { RULES, outputs } from "../../../tools/gen-catalogue.mjs";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const cat = JSON.parse(read("packages/ui/catalogue.json"));
const GUIDES = ["packages/ui/AGENTS.md", "packages/ui/skill/ux-builder-ui/SKILL.md"];

describe("US-014", () => {
  // @covers US-014-AC1
  test("AC1: the committed catalogue and guidance are what the source generates", () => {
    for (const [p, content] of Object.entries(outputs())) assert.equal(read(p), content, `${p} is stale: run npm run catalogue`);
    const r = spawnSync(process.execPath, [join(ROOT, "tools/gen-catalogue.mjs"), "--check"], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
  });

  test("AC1: the catalogue covers every export, token, theme and icon", () => {
    const index = read("packages/ui/src/index.js");
    const exported = [...index.matchAll(/export \{([^}]+)\}/g)].flatMap(([, n]) => n.split(",").map((x) => x.trim()).filter(Boolean));
    assert.deepEqual(cat.widgets.map((w) => w.name).sort(), exported.sort());
    for (const w of cat.widgets.filter((x) => x.type === "component")) {
      assert.ok(w.purpose.length > 10, `${w.name} has a purpose`);
      // <Favicon /> takes none: it reads the theme on <html>.
      if (w.name !== "Favicon") assert.ok(w.props.length > 0, `${w.name} has props`);
    }
    const names = JSON.parse(read("tokens/names.json")).tokens;
    assert.deepEqual(cat.tokens.map((t) => t.path).sort(), Object.keys(names).sort());
    assert.ok(cat.tokens.every((t) => t.purpose), "every token has a purpose from CONTRACT-001");
    const manifest = JSON.parse(read("packages/tokens/dist/manifest.json"));
    assert.deepEqual(cat.themes.map((t) => t.name).sort(), manifest.themes.map((t) => t.name).sort());
    assert.equal(cat.icons.length, 33);
    assert.deepEqual(Object.fromEntries(cat.designSystems.map((d) => [d.name, d.iconSet])), { carbon: "carbon", databricks: "lucide", fluent: "fluent", material: "material" });
  });

  test("AC1: the catalogue lists every pattern export with its import, and every variant point with each design system's choice", () => {
    const index = read("packages/ui/src/patterns/index.js");
    const exported = [...index.matchAll(/export \{([^}]+)\}/g)].flatMap(([, n]) => n.split(",").map((x) => x.trim()).filter(Boolean));
    assert.deepEqual(cat.patterns.map((p) => p.name).sort(), exported.sort());
    for (const p of cat.patterns) {
      if (p.type === "component" || p.type === "hook") assert.equal(p.import, `import { ${p.name} } from "@ux-builder/ui/patterns";`, p.name);
      assert.ok(p.purpose.length > 10 && p.props.length > 0, p.name);
    }
    assert.deepEqual(cat.variants.map((v) => v.point), ["navigation", "page-header", "table", "tabs"]);
    assert.equal(cat.variants.find((v) => v.point === "navigation").chosenBy.material, "rail");
    assert.deepEqual(cat.sizeClasses.map((c) => c.minWidth), ["0px", "600px", "840px", "1200px", "1600px"]);
  });

  // @covers US-014-AC2
  test("AC2: every token, widget, hook and icon the guidance names exists", () => {
    const tokens = new Set(cat.tokens.map((t) => t.name));
    const widgets = new Set([...cat.widgets, ...cat.patterns, ...(cat.assistant ?? [])].map((w) => w.name));
    const icons = new Set(cat.icons);
    const library = new Set(cat.iconLibrary.icons.map((i) => i.name)), exports = new Set(cat.iconLibrary.icons.map((i) => i.export));
    for (const g of GUIDES) {
      const text = read(g);
      for (const [t] of text.matchAll(/--piq-[a-z0-9-]+(?![a-z0-9-]*\*)/g)) if (!t.endsWith("-")) assert.ok(tokens.has(t), `${g}: ${t}`);
      for (const [, w] of text.matchAll(/<([A-Z][A-Za-z]+)[\s>/]/g)) if (w !== "App") assert.ok(widgets.has(w), `${g}: <${w}>`);
      for (const [, h] of text.matchAll(/\b(use[A-Z]\w+)\(\)/g)) assert.ok(widgets.has(h), `${g}: ${h}()`);
      // A shared name, or a library icon (usable by name once registered).
      for (const [, n] of text.matchAll(/<Icon name="([a-z0-9-]+)"/g)) assert.ok(icons.has(n) || library.has(n), `${g}: icon ${n}`);
      for (const [, e] of text.matchAll(/\b(icon[A-Z][A-Za-z0-9_]*)\b/g)) assert.ok(exports.has(e), `${g}: icon export ${e}`);
    }
  });

  // @covers US-014-AC3
  test("AC3: the guidance states the rules", () => {
    assert.equal(RULES.length, 7);
    const topics = [/SDK's widgets/, /role tokens/, /Never hard-code colours, font families or radii/, /lint rule ux-builder\/no-hard-coded-values/, /ThemeProvider/, /Compose screens from @ux-builder\/ui\/patterns/, /Plan before you build: describe the app or view in app.blueprint.json/];
    RULES.forEach((r, i) => assert.match(r, topics[i]));
    for (const g of GUIDES) for (const [i, r] of RULES.entries()) assert.ok(read(g).includes(`${i + 1}. ${r}`), `${g}: rule ${i + 1}`);
    assert.deepEqual(cat.rules, RULES);
  });

  // @covers US-021-AC8
  test("US-021-AC8: the catalogue and guidance include the loading widgets and the busy button", () => {
    for (const name of ["ProgressBar", "Spinner", "Skeleton"]) assert.ok(cat.widgets.some((w) => w.name === name && w.type === "component"), name);
    assert.ok(cat.widgets.find((w) => w.name === "Button").props.some((p) => p.name === "busy"));
    for (const t of ["progress.height", "spinner.line-cap", "skeleton.effect"]) assert.ok(cat.tokens.some((x) => x.path === t), t);
    assert.match(RULES[0], /progress bars, spinners, skeletons/);
    for (const g of GUIDES) {
      const text = read(g);
      assert.match(text, /### Loading and progress/, g);
      for (const s of ["<ProgressBar", "<Spinner", "<Skeleton", "<Button busy>", 'aria-busy="true"']) assert.ok(text.includes(s), `${g}: ${s}`);
    }
  });

  test("the Claude Code skill has a name and says when to use it", () => {
    const skill = read("packages/ui/skill/ux-builder-ui/SKILL.md");
    assert.match(skill, /^---\nname: ux-builder-ui\ndescription: .*@ux-builder\/ui.*\n---\n/);
  });

  test("the package ships the catalogue, the guidance and the skill", () => {
    const pkg = JSON.parse(read("packages/ui/package.json"));
    for (const f of ["catalogue.json", "AGENTS.md", "skill"]) assert.ok(pkg.files.includes(f), f);
    assert.equal(pkg.exports["./catalogue.json"], "./catalogue.json");
  });
});

describe("US-031 patterns for agents", () => {
  // @covers US-031-AC1
  test("AC1: every pattern's catalogue entry names its slots, states, size-class behaviour and variant points, from metadata checked against the code", () => {
    const comps = cat.patterns.filter((p) => p.type === "component");
    assert.ok(comps.length >= 30);
    for (const p of comps) {
      for (const k of ["slots", "statuses", "sizeClasses", "variantPoints", "chooseWhen", "insteadOf"]) assert.ok(k in p, `${p.name}.${k}`);
      assert.ok(Object.keys(p.sizeClasses).length > 0, `${p.name} says how it adapts`);
      const props = new Set(p.props.map((x) => x.name));
      for (const slot of p.slots) assert.ok(props.has(slot), `${p.name}: ${slot} is a prop`);
    }
    // Metadata that drifts from the code fails generation, and so npm run check.
    const metaPath = join(ROOT, "packages/ui/src/patterns/patterns.meta.json");
    const meta = readFileSync(metaPath, "utf8");
    try {
      const broken = JSON.parse(meta);
      broken.patterns.CollectionList.slots.push("sidebar");
      writeFileSync(metaPath, JSON.stringify(broken));
      assert.throws(() => outputs(), /CollectionList: slot "sidebar" is not one of its props/);
      delete broken.patterns.CollectionList;
      writeFileSync(metaPath, JSON.stringify(broken));
      assert.throws(() => outputs(), /CollectionList has no entry/);
    } finally { writeFileSync(metaPath, meta); }
  });

  // @covers US-031-AC3
  test("AC3: the guidance says when to choose list or list with detail, full-page form or quick create, and table or stacked items; every pattern it names exists", () => {
    const names = new Set(cat.patterns.map((p) => p.name));
    for (const g of GUIDES) {
      const text = read(g);
      assert.match(text, /`<CollectionList>`[^\n]*Choose `<ListDetail>` instead when/);
      assert.match(text, /`<FormPage>`[^\n]*Choose `<QuickEdit>` instead when/);
      assert.match(text, /Never choose between a table and stacked items yourself/);
      const section = text.slice(text.indexOf("### Choosing a pattern"), text.indexOf("Every pattern's slots"));
      for (const [, n] of section.matchAll(/`<([A-Z][A-Za-z]+)>`/g)) assert.ok(names.has(n), `${g}: <${n}>`);
    }
  });

  // @covers US-031-AC4
  test("AC4: the rules direct agents to compose screens from patterns and layout primitives before writing layout CSS", () => {
    assert.ok(cat.rules.some((r) => /Compose screens from @ux-builder\/ui\/patterns before writing any layout CSS/.test(r) && /Stack, Cluster, Grid, Page, SplitView/.test(r)));
    for (const g of GUIDES) assert.match(read(g), /Compose screens from @ux-builder\/ui\/patterns before writing any layout CSS/);
  });

  test("the rules say each screen goes inside a Page, since AppShell's content area and the screen patterns have no gutter of their own", () => {
    assert.ok(cat.rules.some((r) => /AppShell for the frame, with each screen inside a Page/.test(r)));
    for (const g of GUIDES) assert.match(read(g), /AppShell for the frame, with each screen inside a Page/);
  });
});
