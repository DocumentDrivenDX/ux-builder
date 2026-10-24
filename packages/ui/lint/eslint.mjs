// ux-builder/no-hard-coded-values for ESLint: the same check on JSX style props
// (FEAT-004 SDK-10, SDK-11); and ux-builder/no-foreign-ui and
// ux-builder/no-inline-svg, below (US-022); and ux-builder/ai-neutral-voice, a
// warning on copy that presents the AI as a person or as the actor (US-081).
// uxBuilder.configs.recommended turns all four on.
//
//   // eslint.config.js
//   import uxBuilder from "@ux-builder/ui/eslint";
//   export default [{
//     files: ["src/**/*.{js,jsx,ts,tsx}"],
//     plugins: { "ux-builder": uxBuilder },
//     rules: {
//       "ux-builder/no-hard-coded-values": ["error", { theme: "databricks", allow: [] }],
//       "ux-builder/no-foreign-ui": "error",
//       "ux-builder/no-inline-svg": "error",
//       "ux-builder/ai-neutral-voice": "warn",
//     },
//   }];
//
// Only literal values are checked (strings, numbers for radii, template
// strings without expressions); a value computed at run time is the app's own
// data, not a hard-coded style.

import { RULE, check, checkAllow, loadTokens } from "./core.mjs";

const kebab = (k) => (k.startsWith("--") ? k : k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/^(webkit|moz|ms)-/, "-$1-"));
const keyOf = (p) => (p.key.type === "Identifier" ? p.key.name : p.key.type === "Literal" ? String(p.key.value) : null);

function literalOf(node, property) {
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "Literal" && typeof node.value === "number") return /radius$/.test(property) && node.value !== 0 ? `${node.value}px` : null;
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) return node.quasis[0].value.cooked;
  return null;
}

const rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Report hard-coded colours, font families and radii in JSX style props; use --piq-* role tokens" },
    schema: [{ type: "object", properties: { theme: { type: "string" }, allow: { type: "array" } }, additionalProperties: false }],
  },
  create(context) {
    const opts = context.options[0] ?? {};
    const allow = opts.allow ?? [];
    const tokens = loadTokens(opts.theme, "light", context.cwd ?? process.cwd());
    const file = context.filename ?? context.getFilename?.();
    return {
      Program(node) {
        for (const e of checkAllow(allow)) context.report({ node, message: `${e} (${RULE})` });
      },
      JSXAttribute(attr) {
        if (attr.name?.name !== "style" || attr.value?.type !== "JSXExpressionContainer") return;
        const obj = attr.value.expression;
        if (obj.type !== "ObjectExpression") return;
        for (const p of obj.properties) {
          if (p.type !== "Property" || p.computed) continue;
          const key = keyOf(p);
          if (!key) continue;
          const property = kebab(key), value = literalOf(p.value, property);
          if (value == null) continue;
          for (const f of check(property, value, { tokens, allow, file })) context.report({ node: p.value, message: f.message });
        }
      },
    };
  },
};

/* ux-builder/no-foreign-ui: another UI kit's components or icon set do not
   follow the theme, so an import of one is reported with the SDK's
   counterpart (US-022). allow: package names the app has reviewed. */
const FOREIGN = [
  [/^@mui\/(?!utils|base)/, "Material UI", "the SDK's widgets"],
  [/^antd(\/|$)/, "Ant Design", "the SDK's widgets"],
  [/^@chakra-ui\//, "Chakra UI", "the SDK's widgets"],
  [/^@carbon\/(react|icons-react)/, "Carbon React", "the SDK's widgets on a Carbon theme"],
  [/^@fluentui\//, "Fluent UI", "the SDK's widgets on a Fluent theme"],
  [/^@mantine\//, "Mantine", "the SDK's widgets"],
  [/^react-bootstrap(\/|$)|^bootstrap(\/|$)/, "Bootstrap", "the SDK's widgets"],
  [/^@blueprintjs\//, "Blueprint", "the SDK's widgets"],
  [/^primereact(\/|$)/, "PrimeReact", "the SDK's widgets"],
  [/^@radix-ui\/themes/, "Radix Themes", "the SDK's widgets"],
  [/^lucide-react|^react-icons(\/|$)|^@heroicons\/|^@phosphor-icons\/|^@tabler\/icons|^@fortawesome\//, "an icon set", "<Icon> with @ux-builder/ui/icons, which follows the theme's icon set"],
  [/^react-spinners|^react-loader-spinner|^react-loading-skeleton/, "a loader library", "the SDK's loading widgets"],
];
const foreign = {
  meta: {
    type: "suggestion",
    docs: { description: "Report imports of other UI kits and icon sets; use @ux-builder/ui" },
    schema: [{ type: "object", properties: { allow: { type: "array", items: { type: "string" } } }, additionalProperties: false }],
  },
  create(context) {
    const allow = new Set(context.options[0]?.allow ?? []);
    const check = (node, source) => {
      if (typeof source !== "string" || allow.has(source)) return;
      const hit = FOREIGN.find(([re]) => re.test(source));
      if (hit) context.report({ node, message: `"${source}" is ${hit[1] === "an icon set" || hit[1] === "a loader library" ? hit[1] : `from ${hit[1]}`}, which does not follow the theme: use ${hit[2]} (ux-builder/no-foreign-ui)` });
    };
    return {
      ImportDeclaration: (n) => check(n, n.source.value),
      ImportExpression: (n) => check(n, n.source.value),
      CallExpression: (n) => { if (n.callee.name === "require" && n.arguments[0]?.type === "Literal") check(n, n.arguments[0].value); },
    };
  },
};

/* ux-builder/no-inline-svg: an <svg> written in app JSX is an icon or a loader
   drawn by hand, which keeps its shape whatever the theme's design system.
   Use <Icon> (any of @ux-builder/ui/icons, or registerIcons for the app's own
   drawing) or the loading widgets. Charts and illustrations can opt out with
   allow: ["chart"] matching a className or id on the <svg>. */
const inlineSvg = {
  meta: {
    type: "suggestion",
    docs: { description: "Report hand-drawn <svg> in JSX; use <Icon> or registerIcons" },
    schema: [{ type: "object", properties: { allow: { type: "array", items: { type: "string" } } }, additionalProperties: false }],
  },
  create(context) {
    const allow = context.options[0]?.allow ?? [];
    const attr = (el, name) => el.attributes.find((a) => a.name?.name === name)?.value?.value;
    return {
      JSXOpeningElement(el) {
        if (el.name.type !== "JSXIdentifier" || el.name.name !== "svg") return;
        const ids = `${attr(el, "className") ?? ""} ${attr(el, "id") ?? ""}`;
        if (allow.some((a) => ids.split(/\s+/).includes(a))) return;
        context.report({ node: el, message: "a hand-drawn <svg> does not follow the theme's icon set: use <Icon> (import it from @ux-builder/ui/icons, or registerIcons({ name, glyphs }) for your own drawing) (ux-builder/no-inline-svg)" });
      },
    };
  },
};

/* ux-builder/ai-neutral-voice (FEAT-011 AIV-01, ADR-028 decision 6; US-081):
   copy around an AI feature should not present the AI as a person or make it
   the actor. A warning on JSX text, string attributes, and string or
   expression-free template literals in JSX, that contain
   - a first-person mental-state phrase ("I think", "I feel", "I understand",
     "I believe", and variants such as "I'm thinking"; any case, whole
     words), citing SD-005 rule ai.not-a-person;
   - a vocative label, "<Name>, <verb> …" at the start ("Copilot, summarize"),
     citing ai.user-initiates: label the user's action instead ("Summarize",
     or "Summarize with Copilot").
   English only: copy in other languages is not checked. A brand that chooses
   a persona opts a string out with a `// ux-builder-ai-persona` comment on
   the line before it (between JSX attributes, or as
   {/* ux-builder-ai-persona *\/} before JSX text). Text the model produces
   at run time is not linted. */
const MIND = /\bI(?:'m|’m|\s+am)?\s+(?:(?:really|truly|honestly|do|also|just|still)\s+)?(think|thinking|thought|feel|feeling|felt|understand|understanding|understood|believe|believing|believed)\b/i;
const VERBS = new Set(("summarize summarise write draft explain translate rewrite generate create make find search show tell help fix answer analyze analyse review plan "
  + "book send schedule compose describe list compare suggest improve shorten expand edit check research recommend build give do run open read complete "
  + "continue simplify outline brainstorm design refactor debug calculate convert sort organize organise clean format update add remove delete cancel start "
  + "stop play draw extract proofread reply respond fill prepare get take turn set look tidy").split(" "));
const NOT_A_NAME = new Set(("first next then now finally also please so okay ok yes no here today later again instead otherwise meanwhile alternatively "
  + "optionally or and but if when once after before lastly second third done ready tip note hint sorry thanks hello hi hey oh well step to").split(" "));
const VOCATIVE = /^(?:(?:[Hh]ey|OK|[Oo]k|[Oo]kay)\s+)?([A-Z][A-Za-z0-9]*(?:\s+[A-Z][A-Za-z0-9]*)?),\s+([A-Za-z]+)\b/;
const NOT_COPY = new Set(["className", "class", "id", "key", "href", "src", "style", "type", "name", "role", "htmlFor", "for", "rel", "target", "method", "action", "lang", "dir", "slot", "ref"]);
const OPT_OUT = "ux-builder-ai-persona";
const cap = (s) => s[0].toUpperCase() + s.slice(1);

/* The voice findings for one string: [{ id, message }]. */
export function voice(text) {
  const out = [];
  const t = String(text).replace(/\s+/g, " ").trim();
  const mind = MIND.exec(t);
  if (mind) out.push({ id: "ai.not-a-person", message: `"${mind[0]}" presents the AI as a person: use neutral, task-focused copy that says what the feature does or produced (ai.not-a-person; ux-builder/ai-neutral-voice)` });
  const voc = VOCATIVE.exec(t);
  if (voc && !voc[1].split(/\s+/).some((w) => NOT_A_NAME.has(w.toLowerCase())) && VERBS.has(voc[2].toLowerCase())) {
    const verb = cap(voc[2].toLowerCase());
    out.push({ id: "ai.user-initiates", message: `"${voc[0]}" makes the AI the actor: label the user's action instead ("${verb}" or "${verb} with ${voc[1]}") (ai.user-initiates; ux-builder/ai-neutral-voice)` });
  }
  return out;
}

const aiVoice = {
  meta: {
    type: "suggestion",
    docs: { description: "Warn on copy that presents the AI as a person or as the actor (English only); opt a string out with // ux-builder-ai-persona on the line before it" },
    schema: [],
  },
  create(context) {
    const source = context.sourceCode ?? context.getSourceCode();
    const optedOut = new Set(source.getAllComments().filter((c) => c.value.trim() === OPT_OUT).map((c) => c.loc.end.line));
    const report = (node, text, line = node.loc.start.line) => {
      if (optedOut.has(line - 1)) return;
      for (const f of voice(text)) context.report({ node, message: f.message });
    };
    const stringOf = (n) => (n?.type === "Literal" && typeof n.value === "string" ? n.value
      : n?.type === "TemplateLiteral" && n.expressions.length === 0 ? n.quasis[0].value.cooked : null);
    return {
      JSXText(node) {
        if (!node.value.trim()) return;
        const lead = /^\s*/.exec(node.value)[0];
        report(node, node.value, node.loc.start.line + (lead.match(/\n/g)?.length ?? 0));
      },
      JSXAttribute(attr) {
        const name = attr.name?.type === "JSXIdentifier" ? attr.name.name : null;
        if (!name || NOT_COPY.has(name) || /^(data|on)[-A-Z]/.test(name)) return;
        const v = attr.value?.type === "JSXExpressionContainer" ? attr.value.expression : attr.value;
        const s = stringOf(v);
        if (s != null) report(v, s);
      },
      JSXExpressionContainer(node) {
        if (!["JSXElement", "JSXFragment"].includes(node.parent?.type)) return;
        const s = stringOf(node.expression);
        if (s != null) report(node.expression, s);
      },
    };
  },
};

/* ux-builder/no-prototype-import (FEAT-018 GDL-42, ADR-037): exploratory
   prototypes under docs/ux-builder/prototypes/ (or an unmigrated app's
   prototype/) are disposable; app code never imports them. */
const PROTOTYPE = /(^|\/)prototype\/|(^|\/)docs\/ux-builder\/prototypes\//;
const noPrototypeImport = {
  meta: {
    type: "problem",
    docs: { description: "Report an import from docs/ux-builder/prototypes/ (or prototype/): exploratory prototypes are disposable and never app code (ADR-037)" },
    schema: [],
  },
  create(context) {
    const check = (node, source) => {
      if (typeof source === "string" && PROTOTYPE.test(source)) context.report({ node, message: `"${source}" imports from a prototype: exploratory prototypes are disposable and never app code (ADR-037). Build the screen from the SDK's patterns instead.` });
    };
    return {
      ImportDeclaration(node) { check(node, node.source.value); },
      ExportNamedDeclaration(node) { if (node.source) check(node, node.source.value); },
      ExportAllDeclaration(node) { check(node, node.source.value); },
      ImportExpression(node) { if (node.source.type === "Literal") check(node, node.source.value); },
      CallExpression(node) { if (node.callee.type === "Identifier" && node.callee.name === "require" && node.arguments[0]?.type === "Literal") check(node, node.arguments[0].value); },
    };
  },
};

const plugin = { meta: { name: "@ux-builder/ui/eslint" }, rules: { "no-hard-coded-values": rule, "no-foreign-ui": foreign, "no-inline-svg": inlineSvg, "ai-neutral-voice": aiVoice, "no-prototype-import": noPrototypeImport } };

/* The recommended config (flat): the theme rules as errors and the voice rule
   as a warning (ADR-028 decision 5). no-hard-coded-values takes { theme } for
   its suggestions; set it in your own rules to add one. */
plugin.configs = {
  recommended: {
    plugins: { "ux-builder": plugin },
    rules: {
      "ux-builder/no-hard-coded-values": "error",
      "ux-builder/no-foreign-ui": "error",
      "ux-builder/no-inline-svg": "error",
      "ux-builder/ai-neutral-voice": "warn",
      "ux-builder/no-prototype-import": "error",
    },
  },
};

export default plugin;
