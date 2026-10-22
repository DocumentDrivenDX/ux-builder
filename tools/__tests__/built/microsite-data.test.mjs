/* The project site's generated Reference and Proof data (microsite-data.mjs):
   nothing that ships is missing from it, so the site cannot drift from the
   source. Fails when an option, command, MCP tool, export, rule, licence or
   card element is left out. Needs the built packages: runs in npm run test:built. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { NOTES, micrositeData } from "../../../apps/theme-builder/microsite-data.mjs";

const REPO = fileURLToPath(new URL("../../../", import.meta.url));
const read = (p) => readFileSync(join(REPO, p), "utf8");
const strip = (o) => o.option.replace(/^--/, "");
let d;
before(async () => { d = await micrositeData(); });

describe("Reference: command line and MCP", () => {
  test("create-app: every parseArgs option is documented, and nothing else", () => {
    const { options, parsed } = d.cli.createApp;
    assert.ok(parsed.length >= 7);
    assert.deepEqual(options.map(strip).sort(), [...parsed].sort());
    for (const o of options) assert.ok(o.text.length > 10, o.option);
  });
  test("ux-builder-audit: every parseArgs option is documented, and every check is listed", async () => {
    const { options, parsed, checks } = d.cli.audit;
    assert.deepEqual(options.map(strip).sort(), [...parsed].sort());
    const { RULES } = await import(new URL("../../../packages/audit/audit.mjs", import.meta.url).href);
    assert.deepEqual(checks.map((c) => c.id), Object.keys(RULES));
  });
  test("assess: every subcommand the CLI defines has its line in the header and in --help", () => {
    const { defined, listed, usage, commands } = d.cli.assess;
    assert.ok(defined.length >= 16);
    assert.deepEqual([...listed].sort(), [...defined].sort(), "header");
    assert.deepEqual([...usage].sort(), [...defined].sort(), "--help");
    for (const c of commands) { assert.ok(c.text, c.name); assert.ok(c.call.startsWith(c.name), c.name); }
  });
  test("ux-builder-blueprint: every command from --help, each with a note, and every command the CLI handles", () => {
    const { commands, handled } = d.cli.blueprint;
    const names = commands.map((c) => c.name);
    assert.deepEqual(names, ["check", "init", "propose", "draw", "wireframes"]);
    for (const c of commands) assert.ok(c.text, c.name);
    for (const h of handled) assert.ok(names.includes(h), h);
  });
  test("MCP: every tool the server registers, with its description", () => {
    const registered = [...read("packages/mcp/server.mjs").matchAll(/registerTool\("([a-z_]+)"/g)].map((m) => m[1]).sort();
    assert.ok(registered.length >= 24);
    assert.deepEqual(d.cli.mcp.tools.map((t) => t.name), registered);
    for (const t of d.cli.mcp.tools) assert.ok(t.description.length > 10, t.name);
  });
});

describe("Reference: packages", () => {
  test("every public package's every export has a one-line note, and no note is stale", () => {
    const keys = new Set();
    for (const p of d.packages) for (const e of p.exports) { keys.add(`${p.name} ${e.key}`); assert.ok(e.note, `${p.name} ${e.key} needs a note in microsite-data.mjs NOTES`); }
    for (const k of Object.keys(NOTES)) assert.ok(keys.has(k), `NOTES names ${k}, which no package exports`);
    const ui = d.packages.find((p) => p.name === "@ux-builder/ui").exports.map((e) => e.import);
    for (const i of ["@ux-builder/ui/blueprint", "@ux-builder/ui/assistant", "@ux-builder/ui/assistant/ai-sdk", "@ux-builder/ui/assistant/assistant-ui", "@ux-builder/ui/adaptive-cards", "@ux-builder/ui/eslint", "@ux-builder/ui/stylelint", "@ux-builder/ui/patterns", "@ux-builder/ui/icons", "@ux-builder/ui/catalogue.json", "@ux-builder/ui/AGENTS.md"]) assert.ok(ui.includes(i), i);
    const skill = d.packages.find((p) => p.name === "@ux-builder/audit").exports.find((e) => e.key === "./skill/*");
    assert.deepEqual(skill.matches.examples, ["ux-builder-assess"]);
  });
});

describe("Reference: rules and Adaptive Cards", () => {
  test("every rule in the catalogue, with its checks and sources", () => {
    const rules = JSON.parse(read("packages/ui/catalogue.json")).interaction.rules;
    assert.equal(d.rules.length, rules.length);
    assert.equal(d.rules.length, 99);
    for (const r of d.rules) { assert.ok(r.checks.length, r.id); assert.ok(r.sources.length, r.id); }
  });
  test("the contract's element mapping covers every element and action the renderer draws", () => {
    const { mapping, elements, actions, example } = d.cards;
    assert.ok(elements.length >= 16 && actions.length >= 5);
    for (const t of [...elements, ...actions]) assert.ok(mapping.some((m) => m.element.includes(`\`${t}\``)), `${t} is not in CONTRACT-004's element mapping`);
    assert.match(example, /"highImpact": true/);
  });
});

describe("Proof: traceability and sources", () => {
  test("the coverage counts are check-coverage's, and every criterion is in a story", async () => {
    const { report } = await import(new URL("../../../tools/check-coverage.mjs", import.meta.url).href);
    const r = report();
    const c = d.coverage;
    assert.deepEqual([c.total, c.cited, c.excepted], [r.total, r.cited, r.excepted]);
    assert.equal(c.stories.flatMap((s) => s.criteria).length, c.total);
    for (const e of c.exceptions) assert.ok(e.reason, e.id);
    assert.ok(c.reviews.length >= 4);
  });
  test("every distinct source, every licence explained, the counsel bead and the disclaimer", () => {
    const urls = new Set(d.rules.flatMap((r) => r.sources.map((s) => s.url)));
    assert.equal(d.sources.length, urls.size);
    assert.equal(d.sources.reduce((n, s) => n + s.rules.length, 0), d.rules.reduce((n, r) => n + new Set(r.sources.map((s) => s.url)).size, 0));
    for (const s of d.sources) assert.ok(d.licences[s.licence], `licence ${s.licence} needs a meaning in microsite-data.mjs LICENCES`);
    assert.equal(d.notices.bead, "ux-builder-78483e2c");
    assert.ok(d.notices.amendment.some((p) => /waived/.test(p)));
    for (const who of ["Apple", "Google", "Microsoft"]) assert.match(d.notices.disclaimer, new RegExp(`not affiliated with or endorsed by[^.;]*${who}`));
  });
});
