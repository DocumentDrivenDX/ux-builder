// ux-builder/no-hard-coded-values for ESLint: the same check on JSX style props
// (FEAT-004 SDK-10, SDK-11); and ux-builder/no-foreign-ui and
// ux-builder/no-inline-svg, below (US-022).
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

export default { meta: { name: "@ux-builder/ui/eslint" }, rules: { "no-hard-coded-values": rule, "no-foreign-ui": foreign, "no-inline-svg": inlineSvg } };
