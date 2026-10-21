#!/usr/bin/env node
/* The SDK's machine-readable catalogue and the reference section of its
   agent guidance (FEAT-004 SDK-12, SDK-13; US-014), generated from source so
   they cannot drift.

     npm run catalogue            # write packages/ui/catalogue.json and the guidance
     npm run catalogue -- --check # fail if either is stale (npm run check runs this)

   Sources: tokens/names.json and CONTRACT-001 (every token, its path, tier
   and purpose); packages/ui/src (every export: components with their props
   and defaults, hooks, helpers, read from the code and the comment above it);
   the themes and design systems (tokens/); the icon names; the lint rules (packages/ui/lint/eslint.mjs).
   Nothing here is typed by hand except the rules in AGENTS.md. */

import { exportName, libraryMap } from "../packages/ui/scripts/gen-icons.mjs";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "../packages/tokens/compose.mjs";
import eslintPlugin from "../packages/ui/lint/eslint.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const UI = join(ROOT, "packages/ui");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const json = (p) => JSON.parse(read(p));

/* ---------------------------------------------------------------- tokens */
function tokens() {
  const names = json("tokens/names.json").tokens;
  const contract = read("docs/helix/02-design/contracts/CONTRACT-001-token-names.md");
  const rows = new Map();
  for (const [, , path, setBy, purpose] of contract.matchAll(/^\| (`--[a-z0-9-]+`|—) \| `([a-z0-9.-]+)` \| `--piq-[a-z0-9-]+` \| ([^|]*) \| ([^|]*) \|/gm)) rows.set(path, { setBy: setBy.trim(), purpose: purpose.trim() });
  return Object.entries(names).map(([path, n]) => ({
    name: `--piq-${path.replace(/\./g, "-")}`,
    path,
    group: path.split(".")[0],
    tier: n.tier,
    purpose: rows.get(path)?.purpose || null,
    alias0: n.css0 ? `--${n.css0}` : null,
  })).sort((a, b) => a.path.localeCompare(b.path));
}

/* --------------------------------------------------------------- widgets */
function splitTop(s) {
  const out = []; let depth = 0, cur = "", quote = null;
  for (const c of s) {
    if (quote) { cur += c; if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === "`") { quote = c; cur += c; continue; }
    if ("{[(".includes(c)) depth++;
    if ("}])".includes(c)) depth--;
    if (c === "," && depth === 0) { out.push(cur.trim()); cur = ""; } else cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
function propsOf(params) {
  const m = /^\{([\s\S]*)\}(\s*=\s*\{\})?$/.exec(params.trim());
  if (!m) return params.trim() ? splitTop(params).map((p) => ({ name: p.split("=")[0].trim(), default: p.includes("=") ? p.split("=").slice(1).join("=").trim() : null })) : [];
  return splitTop(m[1]).map((p) => {
    if (p.startsWith("...")) return { name: "...", default: null, note: "other props pass to the rendered element" };
    const [lhs, ...rhs] = p.split("=");
    const name = lhs.split(":")[0].trim();
    return { name, default: rhs.length ? rhs.join("=").trim() : null };
  });
}
// Comment text as prose: no comment marks, and no references to planning documents.
const clean = (c) => c.replace(/^\/\*+|\*+\/$/g, "").replace(/^\s*\*\s?/gm, "").replace(/\s*\((?:[A-Z]+-\d+[^()]*)\)/g, "").replace(/\s+/g, " ").trim();
const firstSentences = (t, n = 2) => (t.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [t]).slice(0, n).join("").trim();

/* The text between the bracket at open and its match: brackets nested in
   defaults (an arrow function, an object) and inside strings and template
   literals are skipped. */
function balanced(src, open) {
  let depth = 0, quote = null;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (quote) { if (c === "\\") i++; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c) && --depth === 0) return src.slice(open + 1, i);
  }
  return "";
}

function exportsOf(file) {
  const src = read(file);
  const header = /^(?:import[^\n]*\n|\s)*\/\*([\s\S]*?)\*\//.exec(src)?.[1];
  const out = [];
  for (const m of src.matchAll(/^export (function|const) (\w+)(?:\s*=\s*[^(\n]*)?\s*/gm)) {
    const [, kind, name] = m;
    const params = src[m.index + m[0].length] === "(" ? balanced(src, m.index + m[0].length) : "";
    const before = src.slice(0, m.index);
    // The comment directly above the export, if there is one.
    const open = before.lastIndexOf("/*"), close = before.lastIndexOf("*/");
    const near = open >= 0 && close > open && /^\s*$/.test(before.slice(close + 2)) ? before.slice(open + 2, close) : null;
    const purpose = firstSentences(clean(near ?? header ?? ""));
    const type = /^use[A-Z]/.test(name) ? "hook" : /^[A-Z][a-z]/.test(name) && kind === "function" ? "component" : kind === "const" ? "constant" : "function";
    out.push({ name, type, purpose, ...(type === "component" || type === "function" || type === "hook" ? { props: propsOf(params) } : {}), source: file.replace(/^packages\/ui\//, "") });
  }
  return out;
}

function exportedFrom(indexFile, importPath) {
  const index = read(indexFile);
  const dir = indexFile.slice(0, indexFile.lastIndexOf("/") + 1);
  const exported = new Map();
  for (const [, names, from] of index.matchAll(/export \{([^}]+)\} from "([^"]+)"/g)) for (const n of names.split(",").map((x) => x.trim()).filter(Boolean)) exported.set(n, `${dir}${from.replace(/^\.\//, "")}`);
  const all = [...new Set(exported.values())].flatMap(exportsOf).filter((e) => exported.has(e.name));
  for (const e of all) if (e.type === "component" || e.type === "hook") e.import = `import { ${e.name} } from "${importPath}";`;
  return all;
}

/* Patterns (@ux-builder/ui/patterns, ADR-020): each export, its tier, props and
   purpose, as for widgets. */
const TIERS = { Stack: "primitive", Cluster: "primitive", Grid: "primitive", Page: "primitive", SplitView: "primitive", PrimaryNav: "navigation", WorkspaceSwitcher: "navigation", AppShell: "screen", ErrorScreen: "screen", CollectionList: "screen", ListDetail: "screen", RecordDetail: "screen", FormPage: "screen", QuickEdit: "screen", Dashboard: "screen", ReportViewer: "screen", SettingsPage: "screen", Wizard: "screen", WorkQueue: "screen", ImportFlow: "screen", HomeScreen: "screen", AuditLog: "screen", UsersAndRoles: "screen", CommandPalette: "navigation", ContextMenu: "navigation", NotificationCentre: "navigation" };
const STATUSES = new Set(["ready", "loading", "empty", "no-results", "forbidden", "error", "partial", "not-found"]);
const SIZES = new Set(["compact", "medium", "expanded", "large", "extra-large"]);
function patterns(variantPoints) {
  const meta = json("packages/ui/src/patterns/patterns.meta.json").patterns;
  const all = exportedFrom("packages/ui/src/patterns/index.js", "@ux-builder/ui/patterns")
    .map((e) => ({ ...e, tier: TIERS[e.name] ?? (e.type === "component" ? "region" : "helper") }));
  const names = new Set(all.map((e) => e.name));
  // patterns.meta.json must match the code (US-031-AC1): an entry per pattern, real props, known states and points.
  const problems = [];
  for (const e of all.filter((x) => x.type === "component")) {
    const m = meta[e.name];
    if (!m) { problems.push(`${e.name} has no entry in patterns.meta.json`); continue; }
    const props = new Set(e.props.map((p) => p.name));
    for (const slot of m.slots) if (!props.has(slot)) problems.push(`${e.name}: slot "${slot}" is not one of its props`);
    for (const st of m.statuses) if (!STATUSES.has(st)) problems.push(`${e.name}: unknown status "${st}"`);
    for (const k of Object.keys(m.sizeClasses)) if (!SIZES.has(k)) problems.push(`${e.name}: unknown size class "${k}"`);
    for (const v of m.variantPoints) if (!variantPoints.has(v)) problems.push(`${e.name}: unknown variant point "${v}"`);
    for (const i of m.insteadOf) if (!names.has(i.name)) problems.push(`${e.name}: insteadOf names "${i.name}", which is not a pattern`);
    if (!m.chooseWhen) problems.push(`${e.name}: no chooseWhen`);
  }
  for (const n of Object.keys(meta)) if (!names.has(n)) problems.push(`patterns.meta.json has "${n}", which is not exported`);
  if (problems.length) throw new Error(`patterns.meta.json disagrees with the code:\n  ${problems.join("\n  ")}`);
  return all.map((e) => (meta[e.name] ? { ...e, ...meta[e.name] } : e)).sort((a, b) => a.name.localeCompare(b.name));
}

function widgets() {
  const index = read("packages/ui/src/index.js");
  const exported = new Map();
  for (const [, names, from] of index.matchAll(/export \{([^}]+)\} from "([^"]+)"/g)) for (const n of names.split(",").map((x) => x.trim()).filter(Boolean)) exported.set(n, `packages/ui/src/${from.replace(/^\.\//, "")}`);
  const files = [...new Set(exported.values())];
  const all = files.flatMap(exportsOf).filter((e) => exported.has(e.name));
  for (const e of all) if (e.type === "component" || e.type === "hook") e.import = `import { ${e.name} } from "@ux-builder/ui";`;
  return all.sort((a, b) => ["component", "hook", "function", "constant"].indexOf(a.type) - ["component", "hook", "function", "constant"].indexOf(b.type) || a.name.localeCompare(b.name));
}

/* ------------------------------------------------------- themes, icons */
function themesAndSystems() {
  const src = load(join(ROOT, "tokens"), join(ROOT, "brand"));
  const ds = [...src.designSystems.values()].map((d) => ({ name: d.name, title: d.title, iconSet: d.tokens.icon?.set?.$value ?? "lucide", fonts: [...new Set(Object.values(d.fonts).map((f) => f.family))] })).sort((a, b) => a.name.localeCompare(b.name));
  const themes = [...src.themes.values()].map((t) => ({
    name: t.name, title: t.title, brand: t.brand, designSystem: t.designSystem ?? null,
    appearances: Object.keys(src.brands.get(t.brand).appearances).sort(),
    default: t.default ?? (src.brands.get(t.brand).appearances.dark ? "dark" : "light"),
    css: `@ux-builder/tokens/themes/${t.name}.css`, fonts: `@ux-builder/tokens/fonts/${t.name}.css`,
  })).sort((a, b) => a.name.localeCompare(b.name));
  const variants = [...src.variants.values()].map((v) => ({
    point: v.point, title: v.title, default: v.default,
    variants: Object.entries(v.variants).map(([name, x]) => ({ name, title: x.title, tokens: Object.entries(x.tokens).flatMap(([g, ts]) => Object.keys(ts).map((k) => `--piq-${g}-${k}`)) })),
    chosenBy: Object.fromEntries([...src.designSystems.values()].map((d) => [d.name, d.variants?.[v.point] ?? v.default]).sort()),
  })).sort((a, b) => a.point.localeCompare(b.point));
  const sizeClasses = Object.entries(src.layout.constants.size).map(([k, t]) => ({ from: k.replace("breakpoint-", ""), minWidth: t.$value }));
  return { themes, designSystems: ds, variants, sizeClasses: [{ name: "compact", minWidth: "0px" }, ...sizeClasses.map((c) => ({ name: c.from, minWidth: c.minWidth }))] };
}
const icons = () => Object.keys(JSON.parse(/export const GLYPHS = (\{[\s\S]*\});?\s*$/.exec(read("packages/ui/src/icons/glyphs.generated.js"))[1]).lucide).sort();
/* The icon library (@ux-builder/ui/icons): every Lucide icon, its export, and which sets have their own glyph. */
const iconLibrary = () => {
  const map = libraryMap();
  const sets = ["material", "fluent", "carbon"];
  return {
    import: "@ux-builder/ui/icons",
    count: Object.keys(map).length,
    matched: Object.fromEntries(sets.map((k) => [k, Object.values(map).filter((m) => m[k]).length])),
    icons: Object.entries(map).map(([name, m]) => ({ name, export: exportName(name), sets: sets.filter((k) => m[k]) })),
  };
};

/* ------------------------------------------------------------- the rules */
export const RULES = [
  "Use the SDK's widgets (@ux-builder/ui) for buttons, fields, choices, tables, menus, tabs, breadcrumbs, sheets, notices, status pills, toasts, progress bars, spinners, skeletons, icons and the logo; do not build your own. Icons beyond the shared names come from @ux-builder/ui/icons, never hand-drawn.",
  "Style your own markup with --piq-* role tokens (var(--piq-color-text), var(--piq-space-4), var(--piq-radius-control)); pick tokens by role, not by how they look today.",
  "Never hard-code colours, font families or radii: no hex, rgb(), named colours, font names or pixel radii in CSS or style props.",
  "Run the lint rule ux-builder/no-hard-coded-values (@ux-builder/ui/stylelint, @ux-builder/ui/eslint) with ux-builder/no-foreign-ui, ux-builder/no-inline-svg and ux-builder/ai-neutral-voice (a warning on copy that presents the AI as a person, \"I think…\", or as the actor, \"Copilot, summarize\"; English only), then the theme audit on the running app (npx ux-builder-audit <url>, @ux-builder/audit), and fix what they report.",
  "Select themes with ThemeProvider (theme, appearance) or data-theme and data-appearance on <html>; never restyle per theme in app code.",
  "Compose screens from @ux-builder/ui/patterns before writing any layout CSS: AppShell for the frame, with each screen inside a Page, which gives it the page gutter and width (AppShell's content area and the screen patterns have none of their own; ErrorScreen excepted); CollectionList, ListDetail, RecordDetail, FormPage, QuickEdit, Dashboard, ReportViewer, SettingsPage and ErrorScreen for screens; the regions and the layout primitives (Stack, Cluster, Grid, Page, SplitView) for anything else. Supply content, data and actions through their slots; never fork or restyle a pattern.",
  "Plan before you build: describe the app or view in app.blueprint.json (ux-builder-blueprint init, or the MCP tool get_blueprint_schema), choose its screens from the recipes (list_recipes), and run ux-builder-blueprint check (or check_blueprint) until it reports no errors. Then build, lint and audit. Rules apply by size class, input and context (app or embedded view), never by device.",
];

/* ------------------------------------------- interaction rules (FEAT-008) */
export function interaction() {
  const rules = json("guidelines/rules.json"), recipes = json("guidelines/recipes.json");
  const blueprintSchema = json("guidelines/schema/blueprint.schema.json");
  // The AI roles a rule or a screen may name (FEAT-011, CONTRACT-005), from the rule schema.
  const aiRoles = json("guidelines/schema/rules.schema.json").$defs.rule.properties.when.properties.aiRole.items.enum;
  return { version: rules.version, limits: rules.limits, aiRoles, rules: rules.rules, recipes: recipes.recipes, blueprintSchema };
}

export function catalogue() {
  const systems = themesAndSystems();
  const { version } = json("packages/ui/package.json");
  const tokensVersion = json("packages/tokens/package.json").version;
  return {
    $description: "Generated by tools/gen-catalogue.mjs from source (FEAT-004 SDK-13). Do not edit; run npm run catalogue.",
    packages: { "@ux-builder/ui": version, "@ux-builder/tokens": tokensVersion },
    rules: RULES,
    lint: { rule: "ux-builder/no-hard-coded-values", rules: Object.keys(eslintPlugin.rules).map((r) => `ux-builder/${r}`), stylelint: "@ux-builder/ui/stylelint", eslint: "@ux-builder/ui/eslint" },
    audit: { package: "@ux-builder/audit", command: "npx ux-builder-audit <url>", report: "audit-report/index.html" },
    ...systems,
    widgets: widgets(),
    patterns: patterns(new Set(systems.variants.map((v) => v.point))),
    icons: icons(),
    iconLibrary: iconLibrary(),
    tokens: tokens(),
    interaction: interaction(),
  };
}

/* ------------------------------------------------------------ guidance */
const code = (s) => "`" + s + "`";
function reference(cat) {
  const comps = cat.widgets.filter((w) => w.type === "component"), hooks = cat.widgets.filter((w) => w.type === "hook");
  const sig = (w) => w.props.filter((p) => p.name !== "...").map((p) => p.default ? `${p.name} = ${p.default}` : p.name).join(", ");
  const role = cat.tokens.filter((t) => t.tier === "role");
  const groups = [...new Set(role.map((t) => t.group))];
  const comp = [...new Set(cat.tokens.filter((t) => t.tier === "component").map((t) => t.group))];
  return [
    "## Reference (generated from the SDK; do not edit by hand)",
    "",
    `@ux-builder/ui ${cat.packages["@ux-builder/ui"]}, @ux-builder/tokens ${cat.packages["@ux-builder/tokens"]}. The full catalogue, with every token and prop, is ${code("@ux-builder/ui/catalogue.json")}.`,
    "",
    "### Components",
    "",
    "| Component | Props | Use it for |",
    "|-----------|-------|------------|",
    ...comps.map((w) => `| ${code(`<${w.name}>`)} | ${code(sig(w) || "—")} | ${w.purpose.replace(/\|/g, "\\|")} |`),
    "",
    "### Layout",
    "",
    `Lay out screens with the layout primitives from ${code("@ux-builder/ui/patterns")} (load ${code("@ux-builder/ui/patterns.css")} after ${code("ui.css")}), never with your own flex or grid CSS. Each adapts to the width it is given, not the window, so it works in a narrow embed as on a phone. Size classes: ${cat.sizeClasses.map((c) => `${c.name} from ${c.minWidth}`).join(", ")}.`,
    "",
    "| Primitive | Props | Use it for |",
    "|-----------|-------|------------|",
    ...cat.patterns.filter((p) => p.tier === "primitive").map((w) => `| ${code(`<${w.name}>`)} | ${code(sig(w) || "—")} | ${w.purpose.replace(/\|/g, "\\|")} |`),
    "",
    "| Pattern | Props | Use it for |",
    "|---------|-------|------------|",
    ...cat.patterns.filter((p) => p.tier !== "primitive").map((w) => `| ${code(`<${w.name}>`)} | ${code(sig(w) || "—")} | ${w.purpose.replace(/\|/g, "\\|")} |`),
    "",
    `A list of records is ${code("<CollectionList>")}: give it the current page's rows and keep its query in the URL with ${code("useListQuery()")}; it brings the header, search, filters, selection and bulk actions, pagination, and the empty, no-results, no-permission, error and loading states. Never hand-build a list screen.`,
    "",
    "### Choosing a pattern",
    "",
    ...cat.patterns.filter((p) => p.tier === "screen").map((p) => `- ${code(`<${p.name}>`)}: ${p.chooseWhen}${p.insteadOf?.length ? ` Choose ${p.insteadOf.map((i) => `${code(`<${i.name}>`)} instead when ${i.when}`).join("; ")}.` : ""}`),
    "",
    `Every pattern's slots, states, size-class behaviour and variant points are in ${code("catalogue.json")} (${code("patterns")}) and from the MCP tools ${code("list_patterns")} and ${code("get_pattern")}.`,
    "",
    `Frame an app with ${code("<AppShell>")}: it places the navigation for the screen size (bottom bar and drawer, rail, or side navigation) and keeps the bars from covering focus. Navigation between pages is links (${code("PrimaryNav")}), never a menu; ${code("<MenuButton>")} is for actions.`,
    "",
    `Spacing props (${code("gap")}) are the theme's space steps, 0 to 8. Each design system chooses its own look at some points (${cat.variants.map((v) => code(v.point)).join(", ")}); never restyle a pattern per theme.`,
    "",
    "### Hooks",
    "",
    ...hooks.map((w) => `- ${code(`${w.name}()`)}: ${w.purpose}`),
    "",
    "### Role tokens",
    "",
    "Style your own markup with these. Each names a role; its value comes from the theme.",
    "",
    ...groups.map((g) => `- **${g}**: ${role.filter((t) => t.group === g).map((t) => code(t.name)).join(", ")}`),
    "",
    `Widget tokens (${comp.map(code).join(", ")}) belong to the widgets; style widgets through their props, not their tokens.`,
    "",
    "### Icons",
    "",
    `${code('<Icon name="…" />')} with one of: ${cat.icons.map(code).join(", ")}. The glyph follows the theme's design system.`,
    "",
    `Any other icon: ${code(cat.iconLibrary.import)} has all ${cat.iconLibrary.count} Lucide icons by their Lucide name, each with Material, Fluent or Carbon's own glyph where one matches (${cat.iconLibrary.matched.material}, ${cat.iconLibrary.matched.fluent} and ${cat.iconLibrary.matched.carbon}; otherwise Lucide's). Import the ones you use, so the bundle carries only those, and pass one or register them: ${code('import { iconPin, iconPlay } from "@ux-builder/ui/icons"')}, then ${code("<Icon icon={iconPin} />")}, or ${code("registerIcons(iconPin, iconPlay)")} once and ${code('<Icon name="pin" />')}. The export is ${code("icon")} + the name in PascalCase. Find names in ${code("@ux-builder/ui/catalogue.json")} (${code("iconLibrary.icons")}) or with the MCP tool ${code("list_icons")} and a query. Never draw an icon the library has; for one it lacks, ${code("registerIcons({ name, glyphs: { lucide: { viewBox, body } } })")} so it still draws through ${code("Icon")}.`,
    "",
    "### Loading and progress",
    "",
    `Show waiting with the SDK, never a hand-drawn loader or another library's: ${code('<ProgressBar label="Uploading" value={40} />')} when the amount is known (leave out ${code("value")} while it is not), ${code('<Spinner label="Saving" />')} for a short wait (${code("showLabel")} to show the words, ${code('size="sm"')} inline), ${code("<Skeleton lines={3} />")} (or ${code('variant="rect"')} or ${code('"circle"')}) in place of content that is loading, inside a region marked ${code('aria-busy="true"')}, and ${code("<Button busy>")} while a button's action runs. Each follows the theme's design system and the user's reduced-motion setting.`,
    "",
    "### Logo and favicon",
    "",
    `${code("<Logo />")} in the app's header (${code('variant="mark"')} where space is tight, ${code('size="sm"')} for the compact height). It draws the theme's brand artwork, or the brand's title as a wordmark when the brand has none, and changes with the theme and appearance. Never import or hard-code a logo file. An embedded view draws no logo.`,
    "",
    `The page's favicon follows the theme too: the top-level ${code("ThemeProvider")} sets it (${code("favicon={false}")} turns that off). An app that sets ${code("data-theme")} on ${code("<html>")} without a provider renders ${code("<Favicon />")} once. Keep the app's own ${code('<link rel="icon">')} in index.html: it shows for a theme without a favicon. Never hard-code the brand's favicon.`,
    "",
    "### Interaction and screen rules",
    "",
    `How screens fit together and behave: navigation by size, modals, safeguards, states and emphasis (FEAT-008). Each rule has an ID that the blueprint check and the audit report use. The loop: **plan** the app in ${code("app.blueprint.json")} (${code("npx ux-builder-blueprint init")}) from the recipes, **check** it (${code("npx ux-builder-blueprint check app.blueprint.json")}, or the MCP tool ${code("check_blueprint")}) until it has no errors, **build** from the patterns it names, then **lint** and **audit**. Rules apply by size class, input (${code("coarse")} touch, ${code("fine")} pointer) and context (${code("app")}, or an embedded ${code("view")}), never by device. Get the rules for a target with ${code("rulesFor()")} from ${code("@ux-builder/ui/blueprint")} or the MCP tool ${code("get_rules")}; the full rules, recipes and blueprint schema are in ${code("catalogue.json")} (${code("interaction")}).`,
    "",
    "| Rule | Applies | Checked by | Statement |",
    "|------|---------|------------|-----------|",
    ...cat.interaction.rules.map((r) => `| ${code(r.id)} | ${r.when ? Object.entries(r.when).map(([k, v]) => `${k}: ${v.join(", ")}`).join("; ") : "always"} | ${r.checks.map((c) => c.kind === "review" ? "review" : `${c.kind} ${code(c.id)}`).join(", ")} | ${r.statement.replace(/\|/g, "\\|")} |`),
    "",
    "Recipes (tested combinations of patterns for a job):",
    "",
    ...cat.interaction.recipes.map((r) => `- ${code(r.id)} (${r.kind}): ${r.job} ${r.screens.map((x) => code(`<${x.pattern}>`)).join(", ")}.`),
    "",
    ...aiSection(cat),
    "",
    "The rules restate guidance from Apple's Human Interface Guidelines, Material Design 3, WCAG 2.2 and the WAI-ARIA Authoring Practices in this SDK's own words, with a link to each source. They are not those guidelines. ux-builder is not affiliated with or endorsed by Apple or Google; Human Interface Guidelines is a trademark of Apple Inc., and Material Design is a trademark of Google LLC. The AI rules also restate, in the SDK's own words, Microsoft's HAX Toolkit, its design and Learn guidance and the Adaptive Cards documentation, Google PAIR's People + AI Guidebook, and Cheng, Liang, Schoop and Nichols (IUI '26); ux-builder is not affiliated with or endorsed by Microsoft either.",
    "",
    "### Themes",
    "",
    "| Theme | Design system | Appearances |",
    "|-------|---------------|-------------|",
    ...cat.themes.map((t) => `| ${code(t.name)} | ${t.designSystem ?? "own anatomy"} | ${t.appearances.join(", ")} (default ${t.default}) |`),
  ].join("\n");
}

/* The AI and agent section (FEAT-011 AIO-01, US-076-AC5): the AI rule IDs
   by role, how to declare a screen's role, and the markers the audit reads
   (CONTRACT-005 AI markup). */
const AI_MARKERS = [
  ['data-piq-ai="generated"', 'content made by AI, with a visible disclosure and a correction control (data-piq-ai-control="retry", "regenerate", "edit" or "undo"); inline UI it makes has a label on each input, pre-filled values the user can edit, and a submit control of its own'],
  ['data-piq-ai="status"', 'the live region saying what the AI is doing (aria-live; aria-busy="true" while working), with a Stop or Pause control in or beside it'],
  ['data-piq-ai="plan"', 'an agent\'s steps, each data-piq-ai="step" with data-piq-ai-status (pending, running, done, failed or skipped) and that status in text'],
  ['data-piq-ai="approval"', 'a request for approval, with data-piq-ai-control="approve" and "deny", neither pre-chosen'],
  ['data-piq-ai-actor="agent" | "user"', "the live region saying who is acting now, updated on takeover and hand-back"],
  ["data-piq-ai-label", "an ancestor whose visible text discloses AI for everything inside it"],
  ['data-piq-ai="prompt"', 'the field or form where the user asks the AI; an empty conversation offers suggested starting points (data-piq-ai-control="starter")'],
  ['data-piq-ai-status="done"', 'on the status region when a run has finished, with its summary shown (data-piq-ai="summary")'],
  ['data-piq-ai-takeover', 'on the agent region when the user can take over; then data-piq-ai-actor says who is acting'],
  ['data-piq-ai-control="previous"', 'returns to the previous step, beside "retry", on a failed step'],
  ['data-piq-screen="<screen id>"', "on the page's root: the blueprint screen it shows, for ux-builder-audit --blueprint"],
];
function aiSection(cat) {
  const ai = cat.interaction.rules.filter((r) => r.when?.aiRole);
  const any = cat.interaction.rules.filter((r) => /^(ai|agent|genui|card)\./.test(r.id) && !r.when?.aiRole);
  return [
    "### AI and agent screens",
    "",
    `Declare each screen's AI role in the blueprint: a screen where AI generates content, converses or acts has ${code("ai")} in ${code("app.blueprint.json")}, for example ${code('"ai": { "roles": ["agent"], "acts": true, "highImpactActions": [{ "label": "Pay", "approval": "each" }] }')}. The roles are ${cat.interaction.aiRoles.map(code).join(", ")}: ${code("generative")} for AI output inside an ordinary screen, ${code("assistant")} for a conversation, ${code("agent")} where the AI acts for the user. The AI rules apply by declared role and combine with the others, so an embedded agent view gets the view rules and the agent rules. Get them with ${code("rulesFor({ aiRoles })")} or ${code("get_rules")} with ${code("aiRoles")}; a target with no role gets no AI rule. The AI rules by role:`,
    "",
    ...cat.interaction.aiRoles.map((role) => `- **${role}**: ${ai.filter((r) => r.when.aiRole.includes(role)).map((r) => code(r.id)).join(", ")}`),
    ...(any.length ? [`- **any screen**: ${any.map((r) => code(r.id)).join(", ")}`] : []),
    "",
    "Mark AI in the markup so the audit can check it (the SDK's assistant components do this for you):",
    "",
    ...AI_MARKERS.map(([m, what]) => `- ${code(m)}: ${what}.`),
  ];
}

const START = "<!-- catalogue:start -->", END = "<!-- catalogue:end -->";
function withReference(text, ref) {
  const a = text.indexOf(START), b = text.indexOf(END);
  if (a < 0 || b < a) throw new Error(`missing ${START} … ${END}`);
  return text.slice(0, a + START.length) + "\n" + ref + "\n" + text.slice(b);
}

const SKILL_HEAD = `---
name: ux-builder-ui
description: Build or change UI in an app that uses @ux-builder/ui and @ux-builder/tokens (the AI-UI SDK). Use whenever adding screens, components, styles, colours, fonts, icons, the logo or theme switching in such an app.
---

`;

const RSTART = "<!-- rules:start -->", REND = "<!-- rules:end -->";
function withRules(text) {
  const a = text.indexOf(RSTART), b = text.indexOf(REND);
  if (a < 0 || b < a) throw new Error(`missing ${RSTART} … ${REND}`);
  return text.slice(0, a + RSTART.length) + "\n" + RULES.map((r, i) => `${i + 1}. ${r}`).join("\n") + "\n" + text.slice(b);
}

export function outputs() {
  const cat = catalogue();
  const agents = withReference(withRules(read("packages/ui/AGENTS.md")), reference(cat));
  return {
    "packages/ui/catalogue.json": JSON.stringify(cat, null, 2) + "\n",
    "packages/ui/AGENTS.md": agents,
    "packages/ui/skill/ux-builder-ui/SKILL.md": SKILL_HEAD + agents.replace(/^# .*\n+/, "# Building UI with the AI-UI SDK\n\n"),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  const stale = [];
  for (const [p, content] of Object.entries(outputs())) {
    const abs = join(ROOT, p);
    if (check) { if (!existsSync(abs) || readFileSync(abs, "utf8") !== content) stale.push(p); continue; }
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
    console.log(relative(ROOT, abs));
  }
  if (check) {
    if (stale.length) { console.error(`stale: ${stale.join(", ")}. Run npm run catalogue and commit the result.`); process.exit(1); }
    console.log("catalogue and agent guidance are up to date");
  }
}
