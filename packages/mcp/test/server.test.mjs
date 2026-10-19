/* @ux-builder/mcp (US-014-AC5, FEAT-004 SDK-14; bead acceptance: "MCP server
   tests pass for listing tokens, widgets and brands").

     npm test --workspace @ux-builder/mcp */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../server.mjs";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const cat = JSON.parse(readFileSync(`${ROOT}packages/ui/catalogue.json`, "utf8"));
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
    assert.deepEqual(tools.map((t) => t.name).sort(), ["get_guidance", "get_pattern", "get_theme", "get_token", "get_widget", "list_brands", "list_design_systems", "list_icons", "list_patterns", "list_themes", "list_tokens", "list_variants", "list_widgets"]);
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
      assert.equal(tools.length, 13);
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
