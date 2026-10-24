/* @ux-builder/mcp (US-014-AC5, FEAT-004 SDK-14; bead acceptance: "MCP server
   tests pass for listing tokens, widgets and brands").

     npm test --workspace @ux-builder/mcp */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../server.mjs";
import { checkCard } from "@ux-builder/ui/adaptive-cards/check";
import { CLEAN, PAY_INVOICE } from "../../ui/src/adaptive-cards/story-data.js";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const cat = JSON.parse(readFileSync(`${ROOT}packages/ui/catalogue.json`, "utf8"));
// Every tool the server registers, read from its source (as the project site counts them).
const REGISTERED = [...readFileSync(`${ROOT}packages/mcp/server.mjs`, "utf8").matchAll(/registerTool\("([a-z_]+)"/g)].map((m) => m[1]).sort();
let client;
const call = async (name, args = {}) => {
  const r = await client.callTool({ name, arguments: args });
  return { ...r, data: r.isError ? null : JSON.parse(r.content[0].text) };
};

before(async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  await createServer().connect(a);
  client = new Client({ name: "test", version: "1" });
  await client.connect(b);
});

describe("US-014-AC5: agents list the SDK over MCP", () => {
  test("the tools and resources are listed, with instructions carrying the rules", async () => {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), REGISTERED);
    assert.deepEqual(REGISTERED, ["check_blueprint", "check_card", "design_status", "end_episode", "get_assessment_skill", "get_blueprint_schema", "get_design_state", "get_guidance", "get_pattern", "get_recipe", "get_rules", "get_theme", "get_token", "get_widget", "list_brands", "list_design_systems", "list_icons", "list_patterns", "list_recipes", "list_renderable", "list_themes", "list_tokens", "list_variants", "list_widgets", "propose_from_blueprint", "record_decision", "simplify_blueprint", "start_episode", "update_design_state", "validate_assessment_manifest", "validate_assessment_report"]);
    const { resources } = await client.listResources();
    assert.deepEqual(resources.map((r) => r.uri).sort(), ["ux-builder://catalogue", "ux-builder://guidance"]);
    assert.match(client.getInstructions(), /Never hard-code colours, font families or radii/);
  });

  // @covers US-014-AC5
  test("list_tokens: every token with its purpose, filterable", async () => {
    assert.equal((await call("list_tokens")).data.length, cat.tokens.length);
    const colour = (await call("list_tokens", { group: "color", tier: "role" })).data;
    assert.ok(colour.some((t) => t.name === "--piq-color-accent" && t.purpose));
    assert.ok(colour.every((t) => t.name.startsWith("--piq-color-")));
    assert.ok((await call("list_tokens", { query: "radius" })).data.length > 3);
  });

  test("get_token: its value in every theme and appearance", async () => {
    const t = (await call("get_token", { name: "color.accent" })).data;
    assert.equal(t.name, "--piq-color-accent");
    assert.match(t.values.databricks.light, /^#[0-9A-F]{6}$/i);
    assert.match(t.values.databricks.dark, /^#[0-9A-F]{6}$/i);
    assert.deepEqual(Object.keys((await call("get_token", { name: "--piq-button-radius", theme: "praxis-carbon" })).data.values), ["praxis-carbon"]);
    assert.equal((await call("get_token", { name: "--piq-color-sparkle" })).isError, true);
  });

  // @covers US-014-AC5
  test("list_widgets and get_widget: the components and their props", async () => {
    const widgets = (await call("list_widgets", { type: "component" })).data;
    assert.ok(widgets.some((w) => w.name === "ChoicePicker" && /segments/.test(w.purpose)));
    const button = (await call("get_widget", { name: "Button" })).data;
    assert.deepEqual(button.props.find((p) => p.name === "variant"), { name: "variant", default: '"primary"' });
    assert.equal(button.import, 'import { Button } from "@ux-builder/ui";');
    const miss = await call("get_widget", { name: "Buttons" });
    assert.equal(miss.isError, true);
    assert.match(miss.content[0].text, /Did you mean: Button/);
  });

  // @covers US-014-AC5
  test("list_brands: every brand, with the themes built on it", async () => {
    const brands = (await call("list_brands")).data;
    assert.ok(brands.length >= 5);
    assert.deepEqual(brands.find((b) => b.name === "praxis").themes.sort(), ["praxis", "praxis-carbon", "praxis-fluentui", "praxis-material"]);
  });

  test("list_themes and get_theme: imports, icon set and every role token's value", async () => {
    assert.equal((await call("list_themes")).data.length, cat.themes.length);
    const t = (await call("get_theme", { name: "praxis-carbon", appearance: "dark" })).data;
    assert.equal(t.iconSet, "carbon");
    assert.equal(t.css, "@ux-builder/tokens/themes/praxis-carbon.css");
    assert.match(t.roleTokens["--piq-color-ground"], /^#/);
    assert.match((await call("get_theme", { name: "plain", appearance: "dark" })).content[0].text, /has no dark appearance/);
    assert.match((await call("get_theme", { name: "acme" })).content[0].text, /No theme "acme"/);
  });

  test("design systems, icons and guidance", async () => {
    assert.deepEqual((await call("list_design_systems")).data.map((d) => d.name), ["carbon", "databricks", "fluent", "material"]);
    assert.equal((await call("list_icons")).data.length, 33);
    const found = (await call("list_icons", { query: "paperclip" })).data;
    assert.equal(found.library.import, "@ux-builder/ui/icons");
    assert.deepEqual(found.library.icons.find((i) => i.name === "paperclip"), { name: "paperclip", export: "iconPaperclip", sets: ["material", "fluent", "carbon"] });
    const g = await client.callTool({ name: "get_guidance", arguments: {} });
    assert.match(g.content[0].text, /## Rules/);
    const r = await client.readResource({ uri: "ux-builder://catalogue" });
    assert.equal(JSON.parse(r.contents[0].text).tokens.length, cat.tokens.length);
  });

  test("it runs as a stdio server, as an agent launches it", async () => {
    const c = new Client({ name: "stdio-test", version: "1" });
    await c.connect(new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL("../server.mjs", import.meta.url))] }));
    try {
      const { tools } = await c.listTools();
      assert.equal(tools.length, REGISTERED.length);
    } finally { await c.close(); }
  });
});

describe("US-031: agents find the screen patterns over MCP", () => {
  // @covers US-031-AC2
  test("list_patterns, get_pattern and list_variants return the catalogue's own entries", async () => {
    const all = (await call("list_patterns")).data;
    assert.deepEqual(all.map((p) => p.name), cat.patterns.map((p) => p.name));
    const screens = (await call("list_patterns", { tier: "screen" })).data;
    assert.ok(screens.length >= 10 && screens.every((p) => p.chooseWhen));
    for (const name of ["CollectionList", "ListDetail", "FormPage", "Stack"]) assert.deepEqual((await call("get_pattern", { name })).data, cat.patterns.find((p) => p.name === name));
    const list = (await call("get_pattern", { name: "collectionlist" })).data;
    assert.ok(list.slots.includes("bulkActions") && list.statuses.includes("no-results") && list.sizeClasses.compact && list.variantPoints.includes("table"));
    const miss = await call("get_pattern", { name: "Collection" });
    assert.equal(miss.isError, true);
    assert.match(miss.content[0].text, /Did you mean: CollectionList/);
    assert.deepEqual((await call("list_variants")).data, cat.variants);
  });
});

describe("US-048: agents find the renderable components over MCP", () => {
  // @covers US-048-AC1
  test("list_renderable serves every component the catalogue marks renderable, with its props schema", async () => {
    const marked = [...cat.widgets, ...cat.patterns, ...cat.assistant].filter((e) => e.renderable);
    assert.ok(marked.length >= 5);
    const served = (await call("list_renderable")).data;
    assert.deepEqual(served.map((e) => e.name), marked.map((e) => e.name));
    for (const e of served) {
      const own = marked.find((m) => m.name === e.name);
      assert.deepEqual(e.propsSchema, own.propsSchema, e.name);
      assert.equal(e.import, own.import, e.name);
      assert.equal(e.propsSchema.type, "object", e.name);
    }
    assert.ok(served.some((e) => e.name === "DataTable" && e.propsSchema.required.includes("rows")));
    assert.ok(!served.some((e) => e.name === "Conversation"), "the conversation itself is not renderable");
    const table = (await call("get_widget", { name: "DataTable" })).data;
    assert.equal(table.renderable, true);
    assert.deepEqual(table.propsSchema, served.find((e) => e.name === "DataTable").propsSchema);
  });
});

describe("US-053: an agent plans and checks screens through MCP", () => {
  // @covers US-053-AC1
  test("get_rules returns the same rules as rulesFor", async () => {
    const { rulesFor } = await import("@ux-builder/ui/blueprint");
    for (const target of [{}, { context: "view" }, { context: "app", sizeClasses: ["compact"], inputs: ["coarse"] }, { sizeClasses: ["large"], inputs: ["fine"] }]) {
      assert.deepEqual((await call("get_rules", target)).data, rulesFor(target));
    }
    assert.ok((await call("get_rules", { context: "view" })).data.some((r) => r.id === "view.no-shell"));
  });

  // @covers US-053-AC2
  test("list_recipes: best match first; get_recipe: patterns and rule IDs", async () => {
    const found = (await call("list_recipes", { job: "review and approve flagged time entries" })).data;
    assert.equal(found[0].id, "review-queue");
    assert.ok(found[0].patterns.includes("WorkQueue"));
    assert.equal((await call("list_recipes", {})).data.length, cat.interaction.recipes.length);
    const r = (await call("get_recipe", { id: "review-queue" })).data;
    assert.ok(r.screens.every((x) => x.pattern && x.role));
    assert.ok(r.rules.includes("action.destructive-safeguard"));
    assert.equal((await call("get_recipe", { id: "nope" })).isError, true);
  });

  // @covers US-053-AC3
  test("check_blueprint returns the validator's findings; get_blueprint_schema the schema", async () => {
    const { checkBlueprint } = await import("@ux-builder/ui/blueprint");
    const plan = { version: 1, kind: "app", name: "x", supports: { sizeClasses: ["compact"], inputs: ["coarse"] }, destinations: [{ id: "a", label: "A", screen: "a" }], screens: [{ id: "a", title: "A", pattern: "ListDetails" }] };
    const res = (await call("check_blueprint", { blueprint: plan })).data;
    assert.deepEqual(res.findings, checkBlueprint(plan));
    assert.equal(res.errors, 1);
    const { schema, skeleton } = (await call("get_blueprint_schema")).data;
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.deepEqual(schema, cat.interaction.blueprintSchema);
    assert.deepEqual(checkBlueprint(skeleton.app), []);
  });

  // @covers US-053-AC6
  test("get_guidance states the plan, check, build, lint and audit loop", async () => {
    const text = (await client.callTool({ name: "get_guidance", arguments: {} })).content[0].text;
    assert.match(text, /\*\*plan\*\*[\s\S]*\*\*check\*\*[\s\S]*\*\*build\*\*[\s\S]*\*\*lint\*\*[\s\S]*\*\*audit\*\*/);
    assert.match(text, /ux-builder-blueprint check/);
    assert.match(client.getInstructions(), /app\.blueprint\.json/);
  });
});

describe("US-076: an agent reads the AI rules for a screen's role through MCP", () => {
  // @covers US-076-AC1
  test("AC1: get_rules with role agent returns what rulesFor does: the agent rules and the rules with no AI condition", async () => {
    const { rulesFor } = await import("@ux-builder/ui/blueprint");
    for (const target of [{ aiRoles: ["agent"] }, { context: "view", aiRoles: ["agent"] }, { aiRoles: ["assistant", "generative"], sizeClasses: ["compact"] }]) {
      assert.deepEqual((await call("get_rules", target)).data, rulesFor(target));
    }
    const got = (await call("get_rules", { aiRoles: ["agent"] })).data;
    assert.ok(got.some((r) => r.id === "agent.approve-high-impact") && got.some((r) => r.id === "modal.one-at-a-time"));
    assert.ok(!got.some((r) => r.when?.aiRole && !r.when.aiRole.includes("agent")));
  });

  // @covers US-076-AC2
  test("AC2: without a role, no AI rule; an unknown role is refused, naming the roles", async () => {
    assert.ok((await call("get_rules", {})).data.every((r) => !r.when?.aiRole));
    const miss = await call("get_rules", { aiRoles: ["chatbot"] });
    assert.equal(miss.isError, true);
    assert.match(miss.content[0].text, /"chatbot"[\s\S]*generative, assistant, agent/);
  });
});

describe("US-098: the modalities choose the rules and components, over MCP", () => {
  // @covers US-098-AC1
  test("AC1: get_rules with modalities [chat] is rulesFor's: the assistant AI rules, feedback, input and text; no nav.* or card.*", async () => {
    const { rulesFor } = await import("@ux-builder/ui/blueprint");
    for (const target of [{ modalities: ["chat"] }, { modalities: ["hybrid-chat"] }, { context: "app", modalities: ["responsive-web", "hybrid-chat"] }]) {
      assert.deepEqual((await call("get_rules", target)).data, rulesFor(target));
    }
    const got = (await call("get_rules", { modalities: ["chat"] })).data.map((r) => r.id);
    assert.ok(got.includes("ai.disclose") && got.includes("feedback.explain-failure") && got.includes("input.touch-targets") && got.includes("text.line-length"));
    assert.deepEqual(got.filter((id) => /^(nav|card)\./.test(id)), []);
    const ios = await call("get_rules", { modalities: ["ios"] });
    assert.equal(ios.isError, true);
    assert.match(ios.content[0].text, /"ios" is a future modality/);
  });

  // @covers US-098-AC5
  test("AC5: get_guidance with modalities names, for each, the components to build with and the rule families", async () => {
    const text = (await client.callTool({ name: "get_guidance", arguments: { modalities: ["chat", "hybrid-chat"] } })).content[0].text;
    const head = text.slice(0, text.indexOf("\n# ", 2));
    assert.match(head, /## chat: [\s\S]*Build with: @ux-builder\/ui\/assistant\.[\s\S]*Rule families that apply: ai\.\*, feedback\.\*, input\.\*, text\.\*/);
    assert.match(head, /## hybrid-chat: [\s\S]*Build with: @ux-builder\/ui\/assistant, @ux-builder\/ui\/adaptive-cards\.[\s\S]*genui\.\*, card\.\*/);
    assert.doesNotMatch(head, /## responsive-web/);
    assert.match(text, /### Modalities/, "then the whole guidance");
    const web = (await client.callTool({ name: "get_guidance", arguments: { modalities: ["responsive-web"] } })).content[0].text;
    assert.match(web, /## responsive-web: [\s\S]*Build with: @ux-builder\/ui, @ux-builder\/ui\/patterns\.[\s\S]*nav\.\*/);
    const bad = await client.callTool({ name: "get_guidance", arguments: { modalities: ["android"] } });
    assert.equal(bad.isError, true);
  });
});

describe("US-087: check_blueprint checks journeys against the HELIX stories", () => {
  // @covers US-087-AC4
  test("journeys are checked against the stories under the marker above the server's directory", async () => {
    const { checkBlueprint } = await import("@ux-builder/ui/blueprint");
    const { readStories } = await import(new URL("../../ui/blueprint/helix.mjs", import.meta.url).href);
    const plan = { version: 1, kind: "app", name: "x", supports: { sizeClasses: ["compact"], inputs: ["coarse"] }, destinations: [{ id: "a", label: "A", screen: "a" }],
      screens: [{ id: "a", title: "A", pattern: "FormPage", stories: ["US-086"], actions: [{ id: "on", label: "On", to: "external" }] }],
      journeys: [{ id: "J-a", story: "US-087", criteria: ["US-087-AC1", "US-087-AC99"], entry: "a", steps: [{ screen: "a" }] }] };
    const res = (await call("check_blueprint", { blueprint: plan })).data;
    assert.deepEqual(res.findings, checkBlueprint(plan, { helix: readStories(join(process.cwd(), "app.blueprint.json")) }));
    assert.deepEqual(res.findings.filter((f) => f.rule === "journey.story-covered").map((f) => f.path), ["/journeys/0/criteria/1", "/screens/0/stories/0"]);
    assert.equal(res.notes, undefined, "this repository has a marker");
  });
});

describe("US-089: propose_from_blueprint returns HELIX proposals without writing them", () => {
  // @covers US-089-AC1
  test("the same proposals as ux-builder-blueprint propose, and no HELIX document or file is written", async () => {
    const { makeApp, BLUEPRINT } = await import("../../ui/test/helix-app.mjs");
    const { propose } = await import("../../ui/blueprint/propose.mjs");
    const { readdirSync, statSync } = await import("node:fs");
    const app = makeApp();
    try {
      const plan = JSON.parse(readFileSync(BLUEPRINT, "utf8"));
      const files = () => { const out = []; const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else out.push([p, statSync(p).mtimeMs, readFileSync(p, "utf8")]); } }; walk(app.dir); return out; };
      const before = files();
      const res = (await call("propose_from_blueprint", { blueprint: plan, path: app.blueprint })).data;
      assert.equal(res.written, false);
      const { marker, ...expected } = propose(plan, { blueprintFile: app.blueprint });
      assert.deepEqual(res.proposals, expected.proposals);
      assert.ok(res.proposals.some((p) => p.id === "US-012-walkthrough" && /^\+1\. On \*\*Review queue\*\*/m.test(p.patch)));
      assert.deepEqual(res.disagreements.map((d) => d.path), ["docs/helix/01-frame/user-stories/US-013-add-an-entry.md"]);
      assert.deepEqual(files(), before, "nothing in the app changed");
      const none = await call("propose_from_blueprint", { blueprint: plan, path: join(tmpdir(), "no-marker-here", "app.blueprint.json") });
      assert.equal(none.isError, true);
      assert.match(none.content[0].text, /\.helix\.yml/);
    } finally { rmSync(app.dir, { recursive: true, force: true }); }
  });
});

describe("FEAT-009 AGW-04: the SDK as the app has it", () => {
  // @covers US-057-AC4
  test("run from an app's directory, the server serves that app's installed @ux-builder/ui catalogue and guidance", async () => {
    const app = mkdtempSync(join(tmpdir(), "mcp-app-"));
    try {
      const ui = join(app, "node_modules/@ux-builder/ui");
      mkdirSync(ui, { recursive: true });
      writeFileSync(join(app, "package.json"), JSON.stringify({ name: "app", private: true }));
      writeFileSync(join(ui, "package.json"), JSON.stringify({ name: "@ux-builder/ui", version: "9.8.7" }));
      writeFileSync(join(ui, "catalogue.json"), JSON.stringify({ ...cat, packages: { ...cat.packages, "@ux-builder/ui": "9.8.7" } }));
      writeFileSync(join(ui, "AGENTS.md"), "# The app's own guidance, version 9.8.7\n");
      const c = new Client({ name: "app-test", version: "1" });
      await c.connect(new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL("../server.mjs", import.meta.url))], cwd: app }));
      try {
        assert.match(c.getInstructions(), /@ux-builder\/ui 9\.8\.7/);
        const g = await c.callTool({ name: "get_guidance", arguments: {} });
        assert.match(g.content[0].text, /The app's own guidance, version 9\.8\.7/);
      } finally { await c.close(); }
    } finally { rmSync(app, { recursive: true, force: true }); }
  });
});

describe("FEAT-009: the UX assessment's checks over MCP", () => {
  test("the skill, the manifest check and the run check, from the installed @ux-builder/audit", async () => {
    assert.match((await client.callTool({ name: "get_assessment_skill", arguments: {} })).content[0].text, /# Assessing an app's UX with ux-builder/);
    const m = (await call("validate_assessment_manifest", { path: `${ROOT}apps/theme-builder/ux-assessment.yml` })).data;
    assert.deepEqual(m.problems, []);
    assert.equal(m.helix.flow, "helix");
    const run = mkdtempSync(join(tmpdir(), "mcp-run-"));
    try {
      writeFileSync(join(run, "run.json"), JSON.stringify({ schema: "run", version: 1, id: "R-20261021T000000Z", stages: [] }));
      assert.equal((await call("validate_assessment_report", { dir: run })).data.valid, true);
      writeFileSync(join(run, "coverage.json"), JSON.stringify({ schema: "coverage", version: 1, entries: [{ journey: "J-a", state: "success", status: "assessed", reason: "walked" }] }));
      const bad = (await call("validate_assessment_report", { dir: run })).data;
      assert.equal(bad.valid, false);
    } finally { rmSync(run, { recursive: true, force: true }); }
  });
});

describe("US-084: check_card checks an Adaptive Card over MCP", () => {
  // @covers US-084-AC6
  test("check_card returns the same findings as checkCard", async () => {
    const draft = {
      type: "AdaptiveCard", version: "1.6",
      body: [{ type: "TextBlock", text: "Order" }, { type: "Input.Text", id: "q", placeholder: "Quantity" }, { type: "ColumnSet", columns: [1, 2, 3, 4].map(() => ({ type: "Column", items: [] })) }],
      actions: Array.from({ length: 7 }, (_, i) => ({ type: "Action.Submit", title: "Option " + (i + 1) })),
    };
    for (const card of [draft, CLEAN, PAY_INVOICE, { type: "NotACard" }]) {
      const res = (await call("check_card", { card })).data;
      assert.deepEqual(res.findings, checkCard(card));
      assert.equal(res.warnings, checkCard(card).filter((f) => f.severity === "warning").length);
    }
    const rules = (await call("check_card", { card: draft })).data.findings.map((f) => f.rule);
    for (const r of ["card.actions-few", "card.input-label", "card.columns-few"]) assert.ok(rules.includes(r), r);
    assert.deepEqual((await call("check_card", { card: CLEAN })).data.findings, []);
  });
});
