#!/usr/bin/env node
/* @ux-builder/mcp: the AI-UI SDK for AI agents, over MCP (FEAT-004 SDK-14,
   US-014-AC5). Everything comes from the installed @ux-builder/ui catalogue
   (generated from source) and @ux-builder/tokens, so it describes the SDK
   version the app has.

     claude mcp add ux-builder -- npx @ux-builder/mcp          # Claude Code
     { "mcpServers": { "ux-builder": { "command": "npx", "args": ["@ux-builder/mcp"] } } }

   Tools: list_themes, get_theme, list_brands, list_design_systems,
   list_widgets, get_widget, list_patterns, get_pattern, list_renderable, list_variants,
   list_tokens, get_token, list_icons, get_guidance; and, from @ux-builder/ui
   0.7, the interaction rules and blueprint (FEAT-008): get_rules,
   list_recipes, get_recipe, get_blueprint_schema, check_blueprint; with
   FEAT-012, propose_from_blueprint (HELIX proposals, never written); and
   check_card (Adaptive Cards, ADR-029); and the episode trace (FEAT-016,
   CONTRACT-007): start_episode, record_decision, end_episode. Resources:
   ux-builder://catalogue, ux-builder://guidance.

   The episode trace: every other tool's answer is written as a `guidance`
   event, and check_blueprint and check_card also write a `check` event, to
   the open episode of the app the server serves (else that branch's
   unscoped episode). The app is the server's working directory, as an
   agent host starts it in the project (UX_BUILDER_APP=<dir> names another),
   and the trace goes to the nearest folder at or above it that has
   .ux-builder/. Where there is none, nothing is written until
   start_episode opens one. A guidance event records the tool, its
   arguments (an object argument, such as a blueprint or a card, only by its
   sha256 and size, never its contents) and a summary of the answer: the
   rule IDs, components and recipes it named, its sha256 and its size. */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
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
// Its HELIX story reader, beside it (FEAT-012 JRN-03): journeys are checked against the stories above the server's directory.
let storyReader = null;
try { storyReader = await import(new URL("./helix.mjs", pathToFileURL(require.resolve("@ux-builder/ui/blueprint"))).href); } catch { /* before FEAT-012 */ }
// Its HELIX proposals, beside it (FEAT-012 DRF-01): drafted from the blueprint, returned and never written.
let proposer = null;
try { proposer = await import(new URL("./propose.mjs", pathToFileURL(require.resolve("@ux-builder/ui/blueprint"))).href); } catch { /* before FEAT-012 step 4 */ }
// The Adaptive Cards check (ADR-029), from the same copy (the minor that ships it, and later).
let cards = null;
try { cards = await import(pathToFileURL(require.resolve("@ux-builder/ui/adaptive-cards/check")).href); } catch { /* an older @ux-builder/ui */ }
// The UX assessment's checks, when the app has @ux-builder/audit 0.2 or later (FEAT-009, optional wrappers).
let assess = null;
try {
  const at = (m) => pathToFileURL(require.resolve(`@ux-builder/audit/assess/${m}`)).href;
  const [manifest, report] = await Promise.all([import(at("manifest.mjs")), import(at("validate-report.mjs"))]);
  assess = { manifest, report, skill: readFileSync(require.resolve("@ux-builder/audit/skill/ux-builder-assess/SKILL.md"), "utf8") };
} catch { /* no @ux-builder/audit, or an older one */ }
// The guided design loop (FEAT-018, ADR-036): the app's @ux-builder/design, else ours if installed.
// Optional: the design package's own CLI does everything these tools do.
let designPkg = null;
try { designPkg = await import(pathToFileURL(require.resolve("@ux-builder/design")).href); } catch { /* no @ux-builder/design */ }
// The episode trace (FEAT-016), the app's @ux-builder/trace else ours.
let trace = null;
try { trace = await import(pathToFileURL(require.resolve("@ux-builder/trace")).href); } catch { /* no @ux-builder/trace */ }
const OWN = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
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
const sha256 = (text) => `sha256:${createHash("sha256").update(text).digest("hex")}`;

/* A tool's arguments as a guidance event keeps them: an object argument (a
   blueprint, a card) only by its hash and size, never its contents. */
export function inputSummary(args = {}) {
  const out = {};
  for (const [k, v] of Object.entries(args ?? {})) {
    if (v && typeof v === "object" && !Array.isArray(v)) { const text = JSON.stringify(v); out[k] = { sha256: sha256(text), bytes: Buffer.byteLength(text) }; }
    else if (Array.isArray(v)) out[k] = v.map((x) => (x && typeof x === "object" ? sha256(JSON.stringify(x)) : x));
    else out[k] = v;
  }
  return out;
}

/* A tool's answer as a guidance event keeps it (CONTRACT-007): the rule IDs,
   components and recipes it named, its hash and its size. From JSON, the
   string values that are a known ID or name; from Markdown, rule IDs
   anywhere and names in code spans or tags. */
export function answerSummary(result, cat) {
  const text = (result?.content ?? []).map((c) => c.text ?? "").join("\n");
  const ruleIds = new Set(), components = new Set(), recipes = new Set();
  const knownRules = new Set((cat.interaction?.rules ?? []).map((r) => r.id));
  const knownRecipes = new Set((cat.interaction?.recipes ?? []).map((r) => r.id));
  const knownComponents = new Set([...cat.widgets.filter((w) => w.type === "component"), ...(cat.patterns ?? []).filter((p) => p.tier !== "helper"), ...(cat.assistant ?? [])].map((x) => x.name).filter((n) => /^[A-Z]/.test(n)));
  const data = result?.structuredContent;
  if (data && !result.isError) {
    const walk = (v, key) => {
      if (typeof v === "string") {
        if (knownRules.has(v)) ruleIds.add(v);
        if (knownComponents.has(v)) components.add(v);
        if (knownRecipes.has(v) && /^(id|recipe|recipes)$/.test(key ?? "")) recipes.add(v);
      } else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
    };
    walk(data);
  } else {
    for (const m of text.matchAll(/[a-z][a-z0-9-]*(?:\.[a-z0-9-]+)+/g)) if (knownRules.has(m[0])) ruleIds.add(m[0]);
    for (const m of text.matchAll(/`([^`\n]+)`|<([A-Z][A-Za-z0-9]*)/g)) for (const w of (m[1] ?? m[2]).match(/[A-Za-z][A-Za-z0-9-]*/g) ?? []) {
      if (knownComponents.has(w)) components.add(w);
      if (m[1] && knownRecipes.has(w)) recipes.add(w);
    }
  }
  const sort = (x) => [...x].sort();
  return { ruleIds: sort(ruleIds), components: sort(components), recipes: sort(recipes), guidanceHash: text ? sha256(text) : null, bytes: Buffer.byteLength(text) };
}

/* createServer(s, bp, ux, hx, px, cc, { trace, appDir }): `trace` is
   @ux-builder/trace (null: no trace), `appDir` where the app is
   (default UX_BUILDER_APP, else the working directory). */
export function createServer(s = sdk(), bp = blueprint, ux = assess, hx = storyReader, px = proposer, cc = cards, { trace: tr = trace, appDir = process.env.UX_BUILDER_APP || process.cwd(), design = designPkg } = {}) {
  const { catalogue: cat, manifest, resolved } = s;
  const server = new McpServer({ name: "ux-builder", version: cat.packages["@ux-builder/ui"] }, {
    instructions: `The AI-UI SDK (@ux-builder/ui ${cat.packages["@ux-builder/ui"]}, @ux-builder/tokens ${cat.packages["@ux-builder/tokens"]}). Before writing UI in an app that uses it, read get_guidance. Rules: ${cat.rules.join(" ")}${tr ? " Record the build: start_episode before you change a screen, record_decision at every pattern choice, departure from the guidance and workaround, the trailer UX-Episode: <episode> on every commit, and end_episode when it is committed." : ""}`,
  });

  // The episode trace (FEAT-016 TRC-03): every other tool's answer is a guidance event in the app's trace.
  const by = `${OWN.name}@${OWN.version}`;
  const app = () => (tr ? tr.findApp(appDir) : null);
  const EPISODE_TOOLS = new Set(["start_episode", "record_decision", "end_episode"]);
  const register = server.registerTool.bind(server);
  server.registerTool = (name, config, handler) => register(name, config, async (...a) => {
    const result = await handler(...a);
    const at = !EPISODE_TOOLS.has(name) && app();
    if (at) tr.appendEvent(at, "guidance", { tool: name, input: inputSummary(a.length > 1 ? a[0] : {}), answer: answerSummary(result, cat) }, { by });
    return result;
  });
  // A check's findings, as a check event (US-106-AC2), when the app keeps a trace.
  const checked = (check, findings) => { const at = app(); if (at) tr.recordCheck(at, check, { findings: tr.countFindings(findings) }, { by }); };

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

  // Generative UI (FEAT-007 GEN-01; US-048-AC1): the components an agent may render in a conversation, with their props schemas.
  server.registerTool("list_renderable", {
    title: "List renderable components",
    description: "The components an assistant may render in a conversation from a tool result ({ component, props }), each with the JSON Schema its props must pass. Anything else renders as a plain notice. Props are JSON only.",
    inputSchema: {},
  }, async () => ok([...cat.widgets, ...patterns, ...(cat.assistant ?? [])].filter((e) => e.renderable).map(({ name, import: imp, purpose, propsSchema }) => ({ name, import: imp, purpose, propsSchema }))));

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
    // AI roles (FEAT-011 AIO-02), from @ux-builder/ui 0.x with FEAT-011; an unknown role is refused, naming the valid ones.
    const aiRoles = cat.interaction.aiRoles;
    server.registerTool("get_rules", {
      title: "Get the interaction rules",
      description: `The interaction and information-architecture rules that apply to a target: how screens fit together and behave (navigation by size, modals, safeguards, states, emphasis${aiRoles ? ", and AI and agent screens" : ""}). Rules apply by context (app, or an embedded view), size class and input${aiRoles ? ", and by a screen's AI role" : ""}, never by device. Each has an ID the blueprint check and the audit report use, and links to its sources.`,
      inputSchema: {
        context: z.enum(["app", "view"]).optional().describe("A whole app with its own shell, or a view embedded in a host (an MCP App view)"),
        sizeClasses: z.array(z.enum(SIZE_CLASSES)).optional().describe("The size classes the app or view supports: compact from 0px, medium 600, expanded 840, large 1200, extra-large 1600"),
        inputs: z.array(z.enum(["coarse", "fine"])).optional().describe("coarse: touch; fine: mouse, trackpad or pen"),
        ...(aiRoles ? { aiRoles: z.array(z.string()).optional().describe(`The screen's AI roles: ${aiRoles.join(", ")} (generative: AI output in an ordinary screen; assistant: a conversation; agent: the AI acts for the user). Without one, no AI rule is returned`) } : {}),
        ...(bp.MODALITIES ? { modalities: z.array(z.string()).optional().describe(`The app's modalities (its blueprint's supports.modalities): ${Object.keys(bp.MODALITIES).join(", ")}. They expand to the size classes, inputs and AI roles the target leaves out, and keep only their rule families (FEAT-014)`) } : {}),
      },
    }, async (target) => {
      const unknown = (target.aiRoles ?? []).filter((r) => !aiRoles.includes(r));
      if (unknown.length) return fail(`Unknown AI role${unknown.length > 1 ? "s" : ""} ${unknown.map((r) => `"${r}"`).join(", ")}. The roles are: ${aiRoles.join(", ")}.`);
      const problems = target.modalities && bp.modalityProblems ? bp.modalityProblems(target.modalities) : [];
      if (problems.length) return fail(problems.join(" "));
      return ok(bp.rulesFor(target));
    });

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
      // Journeys are checked against the HELIX stories above the app's directory, read and never written.
      const storied = hx?.needsStories(b) ?? false;
      const helix = storied ? hx.readStories(join(process.cwd(), "app.blueprint.json")) : null;
      const findings = bp.checkBlueprint(b, { helix });
      checked("blueprint", findings);
      const notes = storied && !helix ? [hx.skippedNote(process.cwd())] : [];
      return ok({ errors: findings.filter((f) => f.severity === "error").length, warnings: findings.filter((f) => f.severity === "warning").length, findings, ...(notes.length ? { notes } : {}) });
    });
  }

  // HELIX proposals from the blueprint (FEAT-012 DRF-01, DRF-02; ADR-030): returned, never written or applied.
  if (px) {
    server.registerTool("propose_from_blueprint", {
      title: "Propose HELIX content from a blueprint",
      description: "Draft HELIX content from the blueprint's flow and journeys, as unified-diff patches a person reviews and applies: story walkthroughs, the solution design's Mermaid screen flow, architecture's Data Flow sequence diagram, DESIGN.md's navigation table and story test plan scenarios. Reads the HELIX documents and templates under the .helix.yml marker above the blueprint's path; writes nothing and applies nothing. Where a HELIX section already says something else, it returns a disagreement with both texts instead of a patch: HELIX governs.",
      inputSchema: {
        blueprint: z.record(z.string(), z.unknown()).describe("The blueprint object (app.blueprint.json)"),
        path: z.string().optional().describe("Where the blueprint lives; the HELIX marker is found walking up from it (default: app.blueprint.json in the server's directory)"),
      },
    }, async ({ blueprint: b, path }) => {
      const r = px.propose(b, { blueprintFile: path ?? join(process.cwd(), "app.blueprint.json") });
      if (!r.marker) return fail(`No HELIX marker (.helix.yml) above ${path ?? process.cwd()}: propose_from_blueprint drafts into the HELIX flow that marker names.`);
      const { marker, ...rest } = r;
      return ok({ ...rest, written: false });
    });
  }

  // Adaptive Cards (ADR-029, FEAT-011 AIC-03): a card payload checked before an agent sends it.
  if (cc) {
    server.registerTool("check_card", {
      title: "Check an Adaptive Card",
      description: "Check an Adaptive Card payload (open-source schema 1.6) before an agent sends it: the vendored 1.6 schema, then the card.* rules (few actions, wrapping text, labelled inputs with error messages, a heading, few columns, alt text, clear action titles, no hidden validated inputs, a supported version, high-impact actions marked). Returns findings, each with its rule ID, severity, JSON Pointer path into the card, message and fix; the same as checkCard from @ux-builder/ui/adaptive-cards.",
      inputSchema: { card: z.record(z.string(), z.unknown()).describe("The card payload (type AdaptiveCard)") },
    }, async ({ card }) => {
      const findings = cc.checkCard(card);
      checked("card", findings);
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

  // The modalities (FEAT-014's matrix): from the catalogue, or the blueprint module of an older one.
  const modalities = cat.interaction?.modalities ?? (bp?.MODALITIES ? Object.entries(bp.MODALITIES).map(([name, m]) => ({ name, ...m })) : null);
  server.registerTool("get_guidance", {
    title: "Get the SDK guidance",
    description: `How to build UI with the SDK: the rules, setup, common tasks and a reference. Read before writing UI.${modalities ? ` With modalities (the app's supports.modalities: ${modalities.map((m) => m.name).join(", ")}), it starts with the components to build with and the rule families that apply for each.` : ""}`,
    inputSchema: modalities ? { modalities: z.array(z.string()).optional().describe(`The app's modalities: ${modalities.map((m) => m.name).join(", ")}`) } : {},
  }, async ({ modalities: want } = {}) => {
    if (!want?.length || !modalities) return { content: [{ type: "text", text: s.guidance() }] };
    const unknown = want.filter((n) => !modalities.some((m) => m.name === n));
    if (unknown.length) return fail(bp?.modalityProblems ? bp.modalityProblems(unknown).join(" ") : `Unknown modality ${unknown.map((n) => `"${n}"`).join(", ")}. Available now: ${modalities.map((m) => m.name).join(", ")}.`);
    const lines = ["# For this app's modalities", ""];
    for (const n of want) {
      const m = modalities.find((x) => x.name === n);
      lines.push(`## ${m.name}: ${m.label}`, "", `- Shell: ${m.shell}.`, `- Build with: ${m.components.join(", ")}.`, `- Rule families that apply: ${m.ruleFamilies.map((f) => `${f}.*`).join(", ")} (get_rules with modalities ["${m.name}"]).`, `- Size classes: ${m.sizeClasses.join(", ")}; inputs: ${m.inputs.join(", ")}; AI roles on its screens: ${m.aiRoles.length ? m.aiRoles.join(", ") : "none"}.`, "");
    }
    return { content: [{ type: "text", text: `${lines.join("\n")}\n${s.guidance()}` }] };
  });

  // The guided design loop's tools (CONTRACT-008 MCP tools; ADR-036 rule 2): each wraps the
  // function behind a ux-builder-design command and returns what its --json prints.
  if (design) {
    const at = () => design.findApp(appDir);
    const run = (fn) => { try { return ok(fn()); } catch (e) { return fail(e.details ? `${e.message}\n${e.details.map((d) => `${d.path}: ${d.message}`).join("\n")}` : e.message); } };
    server.registerTool("get_design_state", {
      title: "Get the design state",
      description: "The guided design loop's state (.ux-builder/design-state.json), or one field by path such as activity or assumptions[0].status; as `ux-builder-design state get --json` returns it.",
      inputSchema: { path: z.string().optional().describe("A field, an index or a dotted path; omit for the whole state") },
    }, async ({ path }) => run(() => design.stateGet(at(), { path })));
    server.registerTool("update_design_state", {
      title: "Update the design state",
      description: "Write one field of the design state, checked against its schema; path[+] appends to a list (assumptions[+] gets the next A-<n> ID and status assumed). As `ux-builder-design state set --json` returns it.",
      inputSchema: { path: z.string().describe("The field, e.g. next, or assumptions[+]"), value: z.any().describe("The JSON value to write") },
    }, async ({ path, value }) => run(() => design.stateSet(at(), { path, value })));
    server.registerTool("design_status", {
      title: "Where the design loop stands",
      description: "The activity, mode, chosen alternative, untested assumptions, open questions, checkpoints, next action and docs/ux documents; as `ux-builder-design status --json` returns it.",
      inputSchema: {},
    }, async () => run(() => design.status(at())));
  }

  // The episode trace's own tools (CONTRACT-007 MCP tools; US-105-AC2, US-107).
  if (tr) {
    const where = () => tr.findApp(appDir) ?? resolve(appDir);
    const list = () => z.array(z.string()).optional();
    server.registerTool("start_episode", {
      title: "Start an episode",
      description: "Open an episode before changing the app's UI or UX: its goal, and the HELIX stories, blueprint screens and journeys it serves. Every ux-builder tool then records what it told you and every check in it, in the app's .ux-builder/trace/. End each commit message in it with the trailer UX-Episode: <episode>, and call end_episode when its commits are made. Refused while another episode is open.",
      inputSchema: {
        goal: z.string().describe("What the change is for, in a sentence"),
        stories: list().describe("HELIX story IDs, e.g. US-003"), screens: list().describe("Blueprint screen IDs"), journeys: list().describe("Journey IDs, e.g. J-review"),
        agent: z.string().optional().describe("The agent, e.g. claude-code"), model: z.string().optional().describe("The model ID"),
        transcripts: z.boolean().optional().describe("false: attach no transcript to this episode"),
      },
    }, async ({ goal, stories, screens, journeys, agent, model, transcripts }) => {
      try {
        const id = tr.openEpisode(where(), { trigger: "change", goal: { text: goal, stories, screens, journeys }, agent: { name: agent ?? null, model: model ?? null }, transcripts: transcripts !== false, by });
        return ok({ episode: id, trailer: `${tr.TRAILER}: ${id}`, next: "Record each pattern choice, departure and workaround with record_decision; end every commit message with the trailer; call end_episode when the change is committed." });
      } catch (e) { return fail(e.message); }
    });

    server.registerTool("record_decision", {
      title: "Record a decision",
      description: "Record a decision in the open episode, at every pattern choice, every departure from the guidance and every workaround for a missing component: what you chose (required), what else you considered, why (required, a sentence; masked like a transcript), the rule and story IDs you relied on, whether it departs from the guidance, whether it works around a missing component, and the screen. Never include code.",
      inputSchema: {
        chose: z.string().optional().describe("Required: what you chose, e.g. WorkQueue"),
        considered: list().describe("What else you considered, e.g. CollectionList"),
        why: z.string().optional().describe("Required: why, in a sentence"),
        relied: list().describe("The rule IDs and story IDs you relied on"),
        departs: z.boolean().optional().describe("true when this departs from the guidance"),
        workaround: z.boolean().optional().describe("true when this works around a missing component"),
        screen: z.string().optional().describe("The blueprint screen ID, when the decision is about one"),
        kind: z.enum(["addition", "checkpoint"]).optional().describe("addition: a new destination, screen, modal, required input or step; it then needs the five answers below"),
        goal: z.string().optional().describe("For an addition: the user goal it supports"),
        without: z.string().optional().describe("For an addition: whether the goal can be reached without it"),
        simplest: z.string().optional().describe("For an addition: the simplest viable alternative"),
        assumptions: list().describe("For an addition: what it assumes about user behaviour"),
        validation: z.string().optional().describe("For an addition: how the team will know the result is better"),
      },
    }, async (d) => {
      try {
        const e = tr.recordDecision(where(), d, { by: "agent" });
        return e ? ok({ recorded: true, episode: e.episode, seq: e.seq }) : fail("The decision could not be written to the trace (see the server's stderr).");
      } catch (e) { return fail(e.message); }
    });

    server.registerTool("end_episode", {
      title: "End the episode",
      description: "Close the open episode once its commits are made: records its commits carrying the UX-Episode trailer, the files and screens changed, the audit's verdicts and findings, and each check's attempts before it passed. Returns warnings for commits without the trailer, or screens changed with no decision recorded.",
      inputSchema: {
        status: z.enum(["done", "abandoned"]).optional().describe("done (default) or abandoned"),
        assessment: z.string().optional().describe("An assessment run's directory (after ux-builder-audit assess compare), for the outcome's compare classes"),
      },
    }, async ({ status, assessment }) => {
      let ref;
      if (assessment) { ref = tr.assessmentRef(resolve(where(), assessment)); if (!ref) return fail(`${assessment}: no comparison.json from ux-builder-audit assess compare there.`); }
      try { return ok(tr.closeEpisode(where(), { status: status ?? "done", assessment: ref, by })); } catch (e) { return fail(e.message); }
    });
  }

  server.registerResource("catalogue", "ux-builder://catalogue", { title: "SDK catalogue", description: "Every token, widget, theme, design system and icon", mimeType: "application/json" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(cat) }] }));
  server.registerResource("guidance", "ux-builder://guidance", { title: "SDK guidance (AGENTS.md)", mimeType: "text/markdown" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: s.guidance() }] }));

  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === (await import("node:fs")).realpathSync(process.argv[1])) {
  await createServer().connect(new StdioServerTransport());
}
