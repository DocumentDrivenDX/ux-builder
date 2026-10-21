#!/usr/bin/env node
/* @ux-builder/mcp: the AI-UI SDK for AI agents, over MCP (FEAT-004 SDK-14,
   US-014-AC5). Everything comes from the installed @ux-builder/ui catalogue
   (generated from source) and @ux-builder/tokens, so it describes the SDK
   version the app has.

     claude mcp add ux-builder -- npx @ux-builder/mcp          # Claude Code
     { "mcpServers": { "ux-builder": { "command": "npx", "args": ["@ux-builder/mcp"] } } }

   Tools: list_themes, get_theme, list_brands, list_design_systems,
   list_widgets, get_widget, list_patterns, get_pattern, list_variants,
   list_tokens, get_token, list_icons, get_guidance; and, from @ux-builder/ui
   0.7, the interaction rules and blueprint (FEAT-008): get_rules,
   list_recipes, get_recipe, get_blueprint_schema, check_blueprint. Resources:
   ux-builder://catalogue, ux-builder://guidance. */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const own = createRequire(import.meta.url);
// The app's own @ux-builder/ui and @ux-builder/tokens when run from its directory, else ours (FEAT-009 AGW-04).
const app = createRequire(join(process.cwd(), "package.json"));
const require = { resolve: (spec) => { try { return app.resolve(spec); } catch { return own.resolve(spec); } } };
// The rules and the blueprint check, from the same copy (0.7 and later).
let blueprint = null;
try { blueprint = await import(pathToFileURL(require.resolve("@ux-builder/ui/blueprint")).href); } catch { /* an older @ux-builder/ui */ }
// The UX assessment's checks, when the app has @ux-builder/audit 0.2 or later (FEAT-009, optional wrappers).
let assess = null;
try {
  const at = (m) => pathToFileURL(require.resolve(`@ux-builder/audit/assess/${m}`)).href;
  const [manifest, report] = await Promise.all([import(at("manifest.mjs")), import(at("validate-report.mjs"))]);
  assess = { manifest, report, skill: readFileSync(require.resolve("@ux-builder/audit/skill/ux-builder-assess/SKILL.md"), "utf8") };
} catch { /* no @ux-builder/audit, or an older one */ }
const readJson = (spec) => JSON.parse(readFileSync(require.resolve(spec), "utf8"));
const readText = (spec) => readFileSync(require.resolve(spec), "utf8");

/* The SDK as the app has it installed: catalogue, manifest, resolved values. */
export function sdk() {
  const catalogue = readJson("@ux-builder/ui/catalogue.json");
  const manifest = readJson("@ux-builder/tokens/manifest.json");
  const resolved = (theme, appearance) => { try { return readJson(`@ux-builder/tokens/resolved/${theme}.${appearance}.json`).tokens; } catch { return null; } };
  return { catalogue, manifest, resolved, guidance: () => readText("@ux-builder/ui/AGENTS.md") };
}

const ok = (data) => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: Array.isArray(data) ? { items: data } : data });
const fail = (message) => ({ content: [{ type: "text", text: message }], isError: true });
const near = (name, names) => names.filter((n) => n.includes(name) || name.includes(n)).slice(0, 5);

const SIZE_CLASSES = ["compact", "medium", "expanded", "large", "extra-large"];

export function createServer(s = sdk(), bp = blueprint, ux = assess) {
  const { catalogue: cat, manifest, resolved } = s;
  const server = new McpServer({ name: "ux-builder", version: cat.packages["@ux-builder/ui"] }, {
    instructions: `The AI-UI SDK (@ux-builder/ui ${cat.packages["@ux-builder/ui"]}, @ux-builder/tokens ${cat.packages["@ux-builder/tokens"]}). Before writing UI in an app that uses it, read get_guidance. Rules: ${cat.rules.join(" ")}`,
  });

  server.registerTool("list_themes", {
    title: "List themes",
    description: "Every theme an app can select with data-theme or ThemeProvider: its brand, design system, appearances, and the CSS and font imports.",
    inputSchema: {},
  }, async () => ok(cat.themes));

  server.registerTool("get_theme", {
    title: "Get a theme",
    description: "One theme: its brand, design system, icon set, imports, and the final value of every role token in one appearance.",
    inputSchema: { name: z.string().describe("Theme name, e.g. databricks"), appearance: z.enum(["light", "dark"]).optional().describe("Defaults to the theme's default appearance") },
  }, async ({ name, appearance }) => {
    const t = cat.themes.find((x) => x.name === name);
    if (!t) return fail(`No theme "${name}". Themes: ${cat.themes.map((x) => x.name).join(", ")}`);
    const ap = appearance ?? t.default;
    if (!t.appearances.includes(ap)) return fail(`Theme "${name}" has no ${ap} appearance; it has ${t.appearances.join(", ")}`);
    const values = resolved(name, ap) ?? {};
    const roles = Object.fromEntries(cat.tokens.filter((x) => x.tier === "role").map((x) => [x.name, values[x.name.slice(2)] ?? null]));
    const ds = cat.designSystems.find((d) => d.name === t.designSystem);
    return ok({ ...t, appearance: ap, iconSet: ds?.iconSet ?? values["piq-icon-set"] ?? "lucide", fontsUsed: ds?.fonts ?? null, roleTokens: roles });
  });

  server.registerTool("list_brands", {
    title: "List brands",
    description: "Every brand (a client's palette and artwork) and its appearances. A theme pairs a brand with a design system.",
    inputSchema: {},
  }, async () => ok(manifest.brands.map((b) => ({ ...b, themes: cat.themes.filter((t) => t.brand === b.name).map((t) => t.name) }))));

  server.registerTool("list_design_systems", {
    title: "List design systems",
    description: "The shared design systems (anatomy: shapes, type, icons) a brand can be paired with.",
    inputSchema: {},
  }, async () => ok(cat.designSystems));

  server.registerTool("list_widgets", {
    title: "List widgets",
    description: "Every export of @ux-builder/ui: components, hooks, helpers and constants, with what each is for.",
    inputSchema: { type: z.enum(["component", "hook", "function", "constant"]).optional() },
  }, async ({ type }) => ok(cat.widgets.filter((w) => !type || w.type === type).map(({ name, type: t, purpose }) => ({ name, type: t, purpose }))));

  server.registerTool("get_widget", {
    title: "Get a widget",
    description: "One export of @ux-builder/ui with its props, defaults, purpose and import line.",
    inputSchema: { name: z.string().describe("e.g. Button, ChoicePicker, useTheme") },
  }, async ({ name }) => {
    const w = cat.widgets.find((x) => x.name === name) ?? cat.widgets.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (!w) return fail(`No export "${name}" in @ux-builder/ui.${near(name.toLowerCase(), cat.widgets.map((x) => x.name.toLowerCase())).length ? ` Did you mean: ${cat.widgets.filter((x) => near(name.toLowerCase(), [x.name.toLowerCase()]).length).map((x) => x.name).join(", ")}?` : ""} Use list_widgets.`);
    return ok(w);
  });

  // Screen patterns (FEAT-006 AGT-01; US-031-AC2): the catalogue's entries as they are.
  const patterns = cat.patterns ?? [];
  server.registerTool("list_patterns", {
    title: "List patterns",
    description: "The screen patterns, regions, navigation and layout primitives of @ux-builder/ui/patterns: what each is for and when to choose it. Compose screens from these before writing layout CSS.",
    inputSchema: { tier: z.enum(["primitive", "navigation", "region", "screen", "helper"]).optional() },
  }, async ({ tier }) => ok(patterns.filter((p) => !tier || p.tier === tier).map(({ name, tier: t, purpose, chooseWhen }) => ({ name, tier: t, purpose, chooseWhen }))));

  server.registerTool("get_pattern", {
    title: "Get a pattern",
    description: "One pattern with its props, slots, states, size-class behaviour, variant points, when to choose it and what to choose instead, and its import line.",
    inputSchema: { name: z.string().describe("e.g. CollectionList, ListDetail, FormPage, Stack") },
  }, async ({ name }) => {
    const p = patterns.find((x) => x.name === name) ?? patterns.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (!p) return fail(`No pattern "${name}" in @ux-builder/ui/patterns.${near(name.toLowerCase(), patterns.map((x) => x.name.toLowerCase())).length ? ` Did you mean: ${patterns.filter((x) => near(name.toLowerCase(), [x.name.toLowerCase()]).length).map((x) => x.name).join(", ")}?` : ""} Use list_patterns.`);
    return ok(p);
  });

  server.registerTool("list_variants", {
    title: "List variants",
    description: "The variant points where design systems follow different conventions (navigation, tabs, page header, table rows), each one's variants, and which each design system chooses. Variants come from the theme; never restyle a pattern per theme.",
    inputSchema: {},
  }, async () => ok(cat.variants ?? []));

  server.registerTool("list_tokens", {
    title: "List tokens",
    description: "The --piq-* tokens with their purpose. Style your own markup with role tokens; widget (component) tokens belong to the widgets.",
    inputSchema: {
      group: z.string().optional().describe("e.g. color, space, radius, font, button"),
      tier: z.enum(["role", "component", "brand"]).optional(),
      query: z.string().optional().describe("Matched against name and purpose"),
    },
  }, async ({ group, tier, query }) => {
    const q = query?.toLowerCase();
    return ok(cat.tokens.filter((t) => (!group || t.group === group) && (!tier || t.tier === tier) && (!q || t.name.includes(q) || (t.purpose ?? "").toLowerCase().includes(q)))
      .map(({ name, group: g, tier: ti, purpose }) => ({ name, group: g, tier: ti, purpose })));
  });

  server.registerTool("get_token", {
    title: "Get a token",
    description: "One token: purpose, path, 0.x alias, and its value in every theme and appearance (or one theme).",
    inputSchema: { name: z.string().describe("e.g. --piq-color-accent or color.accent"), theme: z.string().optional() },
  }, async ({ name, theme }) => {
    const n = name.startsWith("--") ? name : name.startsWith("piq-") ? `--${name}` : `--piq-${name.replace(/\./g, "-")}`;
    const t = cat.tokens.find((x) => x.name === n);
    if (!t) return fail(`No token ${n}. Use list_tokens.`);
    const themes = cat.themes.filter((x) => !theme || x.name === theme);
    if (theme && !themes.length) return fail(`No theme "${theme}".`);
    const values = Object.fromEntries(themes.map((x) => [x.name, Object.fromEntries(x.appearances.map((ap) => [ap, resolved(x.name, ap)?.[n.slice(2)] ?? null]))]));
    return ok({ ...t, values });
  });

  server.registerTool("list_icons", {
    title: "List icons",
    description: "Icons. Without a query: the shared names for <Icon name=\"…\" />, which follow the theme's design system. With a query: also the matching icons of @ux-builder/ui/icons (every Lucide icon), with the export to import and which sets have their own glyph.",
    inputSchema: { query: z.string().optional().describe("Part of a name, e.g. pin, play, paperclip") },
  }, async ({ query }) => {
    if (!query) return ok(cat.icons);
    const q = query.toLowerCase();
    const lib = cat.iconLibrary;
    return ok({
      shared: cat.icons.filter((n) => n.includes(q)),
      library: lib ? { import: lib.import, icons: lib.icons.filter((i) => i.name.includes(q)).slice(0, 100) } : null,
    });
  });

  // Interaction and IA rules, recipes and the blueprint check (FEAT-008 AGT-01; US-053).
  if (bp && cat.interaction) {
    server.registerTool("get_rules", {
      title: "Get the interaction rules",
      description: "The interaction and information-architecture rules that apply to a target: how screens fit together and behave (navigation by size, modals, safeguards, states, emphasis). Rules apply by context (app, or an embedded view), size class and input, never by device. Each has an ID the blueprint check and the audit report use, and links to its sources.",
      inputSchema: {
        context: z.enum(["app", "view"]).optional().describe("A whole app with its own shell, or a view embedded in a host (an MCP App view)"),
        sizeClasses: z.array(z.enum(SIZE_CLASSES)).optional().describe("The size classes the app or view supports: compact from 0px, medium 600, expanded 840, large 1200, extra-large 1600"),
        inputs: z.array(z.enum(["coarse", "fine"])).optional().describe("coarse: touch; fine: mouse, trackpad or pen"),
      },
    }, async (target) => ok(bp.rulesFor(target)));

    server.registerTool("list_recipes", {
      title: "List recipes",
      description: "Recipes: tested combinations of patterns for common jobs, with the rules they satisfy. Describe the job in words; the best matches come first. Start a blueprint's screens from a recipe.",
      inputSchema: { job: z.string().optional().describe("e.g. review and approve flagged time entries"), kind: z.enum(["app", "view"]).optional() },
    }, async ({ job, kind }) => ok(bp.findRecipes(job ?? "", kind).map(({ id, title, job: j, kind: k, screens }) => ({ id, title, job: j, kind: k, patterns: screens.map((x) => x.pattern) }))));

    server.registerTool("get_recipe", {
      title: "Get a recipe",
      description: "One recipe: its screens (pattern and role) and the rule IDs it satisfies.",
      inputSchema: { id: z.string() },
    }, async ({ id }) => {
      const r = bp.getRecipe(id);
      return r ? ok(r) : fail(`No recipe "${id}". Recipes: ${cat.interaction.recipes.map((x) => x.id).join(", ")}`);
    });

    server.registerTool("get_blueprint_schema", {
      title: "Get the blueprint schema",
      description: "The JSON Schema of app.blueprint.json: an app's or view's kind, supported size classes and inputs, destinations and screens (each a catalogue pattern, with its primary action, destructive actions and safeguards, states and modals). Plan here before building.",
      inputSchema: {},
    }, async () => ok({ schema: bp.blueprintSchema, skeleton: { app: bp.skeleton("app"), view: bp.skeleton("view") } }));

    server.registerTool("check_blueprint", {
      title: "Check a blueprint",
      description: "Check an app's or view's blueprint against the rules. Returns findings, each with its rule ID, severity, JSON Pointer path, message and fix. Fix every error before building; the same check runs as ux-builder-blueprint check in CI.",
      inputSchema: { blueprint: z.record(z.string(), z.unknown()).describe("The blueprint object (app.blueprint.json)") },
    }, async ({ blueprint: b }) => {
      const findings = bp.checkBlueprint(b);
      return ok({ errors: findings.filter((f) => f.severity === "error").length, warnings: findings.filter((f) => f.severity === "warning").length, findings });
    });
  }

  // The UX assessment (FEAT-009): its deterministic checks and the skill, for agents without a shell.
  if (ux) {
    server.registerTool("get_assessment_skill", {
      title: "Get the UX assessment skill",
      description: "How to assess a HELIX-governed app's UX with @ux-builder/audit: the stages, the commands, how to label every conclusion, the P0–P3 rubric and the safety rules. The assessment only proposes; it never changes the app or its HELIX documents.",
      inputSchema: {},
    }, async () => ({ content: [{ type: "text", text: ux.skill }] }));

    server.registerTool("validate_assessment_manifest", {
      title: "Validate an assessment manifest",
      description: "Check ux-assessment.yml against its schema, the repository and the app's HELIX marker, flow and catalogue. Returns each problem with its path, and the HELIX binding.",
      inputSchema: { path: z.string().describe("Path to ux-assessment.yml") },
    }, async ({ path }) => {
      let m;
      try { m = ux.manifest.load(path); } catch (e) { return fail(`${path}: ${e.message.split("\n")[0]}`); }
      const { problems, helix } = ux.manifest.validate(m);
      return ok({ valid: !problems.length, problems, helix: helix && { flow: helix.flow.id, root: helix.flow.rootRel, catalog: helix.catalog, documents: helix.documents } });
    });

    server.registerTool("validate_assessment_report", {
      title: "Validate an assessment run",
      description: "Check a run package (ux-assessment/<run>/): every record against its schema, the coverage matrix, walkthroughs, findings and proposals. Run it before handing an assessment over.",
      inputSchema: { dir: z.string().describe("The run's directory") },
    }, async ({ dir }) => {
      const problems = ux.report.validateReport(dir);
      return ok({ valid: !problems.length, problems });
    });
  }

  server.registerTool("get_guidance", {
    title: "Get the SDK guidance",
    description: "How to build UI with the SDK: the rules, setup, common tasks and a reference. Read before writing UI.",
    inputSchema: {},
  }, async () => ({ content: [{ type: "text", text: s.guidance() }] }));

  server.registerResource("catalogue", "ux-builder://catalogue", { title: "SDK catalogue", description: "Every token, widget, theme, design system and icon", mimeType: "application/json" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(cat) }] }));
  server.registerResource("guidance", "ux-builder://guidance", { title: "SDK guidance (AGENTS.md)", mimeType: "text/markdown" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: s.guidance() }] }));

  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === (await import("node:fs")).realpathSync(process.argv[1])) {
  await createServer().connect(new StdioServerTransport());
}
