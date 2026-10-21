/* @ux-builder/ui/adaptive-cards/check: checkCard, a check of an Adaptive
   Card payload before an agent sends it (ADR-029, FEAT-011 AIC-02 and
   AIC-03, SD-005 card rules, CONTRACT-004 Adaptive Cards). The same
   functions are exported by @ux-builder/ui/adaptive-cards; this module has
   no React in it, so Node tools (the MCP server, check-rules) can load it.

     import { checkCard } from "@ux-builder/ui/adaptive-cards/check";
     checkCard(JSON.parse(payload)); // [{ rule, severity, path, message, fix }]

   First the vendored Adaptive Cards 1.6 JSON Schema (MIT, schema-1.6/), read
   as data, then every card.* rule that has an automatic check. Findings are
   CONTRACT-005 findings with a JSON Pointer into the card, ordered by path,
   then rule, in plain string order, as checkBlueprint orders them. Schema
   errors are errors, reported under card.version (the card is not a valid
   1.6 card); every rule finding is a warning (ADR-028 decision 5). No rule
   runs on an element the schema rejected, or on anything inside it. */

import schema from "./schema-1.6/adaptive-card.json" with { type: "json" };

/* The vendored Adaptive Cards 1.6 JSON Schema (draft-06), as data. */
export const cardSchema = schema;
/* The highest schema version the renderer and the check support. */
export const SUPPORTED_VERSION = "1.6";

/* The checks this module runs, by the rule ID each reports. */
export const CHECKS = [
  "card.version", "card.actions-few", "card.wrap", "card.input-label", "card.input-error", "card.heading",
  "card.columns-few", "card.image-alt", "card.action-titles", "card.no-hidden-inputs", "card.high-impact-marked",
];

const DEFS = schema.definitions;
/* Every element, action and input type the schema defines, by its `type`. */
export const ELEMENT_TYPES = Object.keys(DEFS).filter((k) => DEFS[k].properties?.type?.enum?.length === 1 && DEFS[k].properties.type.enum[0] === k);
const ACTIONS = new Set(ELEMENT_TYPES.filter((t) => t.startsWith("Action.")));
const INPUTS = new Set(ELEMENT_TYPES.filter((t) => t.startsWith("Input.") && t !== "Input.Choice"));
/* Types that only appear inside their parent, never on their own. */
const PARTS = new Set(["Fact", "Input.Choice", "TableCell", "TableRow", "TableColumnDefinition", "TextRun", "Column", "MediaSource", "CaptionSource", "TargetElement", "Data.Query", "AuthCardButton", "TokenExchangeResource", "Refresh", "Authentication", "BackgroundImage", "Metadata"]);
const KNOWN = new Set(ELEMENT_TYPES);
/* Keys whose values are the author's own data, never card content. */
const DATA_KEYS = new Set(["data", "metadata", "refresh", "authentication", "choices.data", "requires"]);

export const ptr = (p) => p.map((k) => "/" + String(k).replace(/~/g, "~0").replace(/\//g, "~1")).join("");
const typeOf = (v) => (Array.isArray(v) ? "array" : v === null ? "null" : Number.isInteger(v) ? "integer" : typeof v);
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const lower = (v) => (typeof v === "string" ? v.toLowerCase() : v);

/* A version string as a number pair, for comparing: "1.6" → [1, 6]. */
export function versionOf(v) {
  const m = /^(\d+)\.(\d+)/.exec(String(v ?? ""));
  return m ? [Number(m[1]), Number(m[2])] : null;
}
export const newerThanSupported = (v) => { const x = versionOf(v); return !!x && (x[0] > 1 || (x[0] === 1 && x[1] > 6)); };

/* ------------------------------------------------------------- schema */
const resolve = (s) => (s.$ref ? DEFS[s.$ref.replace("#/definitions/", "")] : s);
/* The element type a branch of an "ImplementationsOf" union stands for. */
function branchType(b) {
  const def = b.allOf?.length === 1 && b.allOf[0].$ref ? resolve(b.allOf[0]) : b.$ref ? resolve(b) : null;
  const e = def?.properties?.type?.enum;
  return e?.length === 1 ? e[0] : null;
}
function enumsOf(s, seen = new Set()) {
  s = resolve(s);
  if (!s || seen.has(s)) return [];
  seen.add(s);
  return [...(s.enum ?? []), ...(s.anyOf ?? []).flatMap((b) => enumsOf(b, seen))];
}

/* Validates value against the subset of draft-06 the schema uses, pushing
   [path, message] pairs to out, and [path, type] to unknown for an element
   whose type the schema does not define. A union of element types is
   matched by its `type`, so an error names the element's own property. */
function validate(s, value, path, out, unknown) {
  s = resolve(s);
  if (!s) return;
  const t = typeOf(value);
  if (s.allOf) for (const b of s.allOf) validate(b, value, path, out, unknown);
  if (s.anyOf) {
    const typed = s.anyOf.map(branchType);
    if (typed.length && typed.every(Boolean) && isObj(value)) {
      const i = typed.indexOf(value.type);
      if (i >= 0) validate(s.anyOf[i], value, path, out, unknown);
      else if (typeof value.type !== "string") out.push([path, `needs a "type", one of ${typed.join(", ")}`]);
      else unknown.push([path, value.type, typed]);
    } else if (!s.anyOf.some((b) => { const probe = []; validate(b, value, path, probe, []); return !probe.length; })) {
      // A union of objects with one object branch: report that branch's own errors.
      const objects = s.anyOf.filter((b) => (resolve(b).type ?? (resolve(b).properties ? "object" : null)) === "object" || branchType(b));
      if (t === "object" && objects.length === 1) validate(objects[0], value, path, out, unknown);
      else {
        const allowed = [...new Set(enumsOf(s))];
        const types = [...new Set(s.anyOf.map((b) => resolve(b).type).filter(Boolean))];
        out.push([path, allowed.length ? `is ${JSON.stringify(value)}; it must be one of ${allowed.map((a) => JSON.stringify(a)).join(", ")}` : `must be ${types.join(" or ") || "another value"}`]);
      }
    }
  }
  if (s.enum && !s.enum.some((e) => e === value || lower(e) === lower(value))) return out.push([path, `is ${JSON.stringify(value)}; it must be one of ${s.enum.map((e) => JSON.stringify(e)).join(", ")}`]);
  if (s.type && !(s.type === t || (s.type === "number" && t === "integer"))) return out.push([path, `must be ${/^[aeiou]/.test(s.type) ? "an" : "a"} ${s.type}`]);
  if (t === "string" && s.pattern && !s.anyOf && !new RegExp(s.pattern).test(value)) out.push([path, `is ${JSON.stringify(value)}; it must match ${s.pattern}`]);
  if ((t === "number" || t === "integer") && "minimum" in s && value < s.minimum) out.push([path, `must be at least ${s.minimum}`]);
  if (t === "array" && s.items) value.forEach((v, i) => validate(s.items, v, [...path, i], out, unknown));
  if (t === "object") {
    for (const k of Array.isArray(s.required) ? s.required : []) if (!(k in value)) out.push([path, `needs "${k}"`]);
    if (s.properties || s.additionalProperties !== undefined) {
      for (const [k, v] of Object.entries(value)) {
        const p = s.properties?.[k];
        if (p && Object.keys(p).length) validate(p, v, [...path, k], out, unknown);
        else if (!p && s.additionalProperties === false) out.push([[...path, k], `"${k}" is not a property of ${value.type ?? "this object"} in schema 1.6`]);
        else if (!p && isObj(s.additionalProperties)) validate(s.additionalProperties, v, [...path, k], out, unknown);
      }
    }
  }
}

/* The card's schema problems: errors ([path, message]) and the elements
   whose type schema 1.6 does not define ([path, type]). An unknown element
   with a fallback is checked through its fallback. */
export function schemaProblems(card) {
  const errors = [], unknown = [];
  const pending = [];
  validate({ $ref: "#/definitions/AdaptiveCard" }, card, [], errors, pending);
  while (pending.length) {
    const [path, type, union] = pending.shift();
    const el = path.reduce((v, k) => v?.[k], card);
    if (isObj(el?.fallback)) {
      const s = { anyOf: union.map((t) => ({ required: ["type"], allOf: [{ $ref: `#/definitions/${t}` }] })) };
      validate(s, el.fallback, [...path, "fallback"], errors, pending);
    } else unknown.push([path, type, el?.fallback]);
  }
  return { errors, unknown };
}

/* --------------------------------------------------------------- walk */
/* Every element, action and input in the card, with its path, its parent
   element's path and whether it is hidden (isVisible false, on it or above
   it). The author's data is never walked. */
export function elementsOf(card) {
  const out = [];
  const walk = (v, path, parent, hidden) => {
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, [...path, i], parent, hidden));
    if (!isObj(v)) return;
    let here = parent, h = hidden;
    if (typeof v.type === "string" && path.length) {
      h = hidden || v.isVisible === false;
      out.push({ el: v, path, parent, hidden: h });
      here = path;
    }
    for (const [k, x] of Object.entries(v)) if (!DATA_KEYS.has(k) && (k !== "fallback" || isObj(x))) walk(x, [...path, k], here, h);
  };
  walk(card, [], null, false);
  return out;
}

/* ------------------------------------------------------------ the rules */
const VALIDATES = (el) => el.isRequired === true || !!el.regex || el.min != null || el.max != null;
const VAGUE = /^\s*(click|click here|here|tap here|press here|this|link|more|go)\s*[.!…]*\s*$/i;
const BARE = /^\s*(submit|ok|okay|send|done|yes|continue)\s*[.!…]*\s*$/i;
const HIGH_IMPACT_WORDS = /\b(pay|pays|paying|payment|send|sends|sending|delete|deletes|deleting|publish|publishes|publishing)\b/i;
const px = (w) => { const m = /^\s*(\d+(?:\.\d+)?)px\s*$/i.exec(String(w ?? "")); return m ? Number(m[1]) : null; };
export const COMPACT_WIDTH = 320;
export const MAX_ACTIONS = 6;
export const markerOf = (action) => (isObj(action?.data) && isObj(action.data["ux-builder"]) ? action.data["ux-builder"] : null);

/* Findings for a card payload: the vendored 1.6 schema, then every card
   rule with an automatic check. Ordered by path, then rule. */
export function checkCard(card) {
  const findings = [];
  const add = (rule, path, message, fix, severity = "warning") => findings.push({ rule, severity, path: ptr(path), message, fix });
  if (!isObj(card) || card.type !== "AdaptiveCard") {
    add("card.version", isObj(card) ? ["type"] : [], `This is not an Adaptive Card: its "type" is ${isObj(card) ? JSON.stringify(card.type ?? null) : `a${Array.isArray(card) ? "n array" : ` ${typeOf(card)}`}`}, not "AdaptiveCard".`, 'Send a card object with "type": "AdaptiveCard", "version": "1.6" and a "body".', "error");
    return findings;
  }
  const { errors, unknown } = schemaProblems(card);
  const elements = elementsOf(card);
  const elementPaths = new Set(elements.map((e) => ptr(e.path)));
  // An error marks the nearest element around it invalid; no rule runs on it or inside it.
  const invalid = new Set();
  for (const [path, message] of errors) {
    add("card.version", path, `Schema 1.6: ${path.length ? ptr(path) : "the card"} ${message}.`, "Fix the payload so it validates against the Adaptive Cards 1.6 schema (cardSchema).", "error");
    let p = [...path];
    while (p.length && !elementPaths.has(ptr(p))) p = p.slice(0, -1);
    invalid.add(ptr(p));
  }
  // An element outside schema 1.6 is not checked, nor is anything in it but its fallback.
  const outside = new Set();
  for (const [path, type, fallback] of unknown) {
    outside.add(ptr(path));
    if (fallback === undefined) add("card.version", path, `${type} is not an element of Adaptive Cards ${SUPPORTED_VERSION}, and it has no fallback, so hosts that lack it show nothing in its place.`, `Give it a "fallback" (an element of schema ${SUPPORTED_VERSION}, or "drop"), or use schema ${SUPPORTED_VERSION} elements only.`);
  }
  const skipped = (path) => {
    for (let n = path.length; n >= 0; n--) {
      const p = ptr(path.slice(0, n));
      if (invalid.has(p) && (n > 0 || !path.length)) return true;
      if (outside.has(p) && path[n] !== "fallback") return true;
    }
    return false;
  };
  const ok = elements.filter((e) => !skipped(e.path) && KNOWN.has(e.el.type));

  // card.version: the declared version.
  if (!invalid.has("")) {
    if (card.version == null) add("card.version", [], "The card declares no schema version.", `Add "version": "${SUPPORTED_VERSION}" (or the lowest version it needs).`);
    else if (!versionOf(card.version)) add("card.version", ["version"], `The card's version ${JSON.stringify(card.version)} is not a version number.`, `Declare "version": "${SUPPORTED_VERSION}" or lower.`);
    else if (newerThanSupported(card.version)) add("card.version", ["version"], `The card declares version ${card.version}; this host supports ${SUPPORTED_VERSION} and earlier, so newer parts are left out.`, `Declare "version": "${SUPPORTED_VERSION}" and give a fallback for anything newer.`);
    for (const k of ["refresh", "authentication"]) if (card[k] != null) add("card.version", [k], `The card uses ${k}, which this host does not support; it is ignored.`, `Leave out ${k}, or make the card work without it.`);
  }

  // card.heading: a card with more than its title marks the title as a heading.
  const body = Array.isArray(card.body) ? card.body : [];
  if (!invalid.has("") && body.length + (card.actions?.length ?? 0) > 1 && !ok.some((e) => e.el.type === "TextBlock" && lower(e.el.style) === "heading")) {
    const first = body.findIndex((x) => x?.type === "TextBlock");
    add("card.heading", first >= 0 ? ["body", first] : ["body"], "The card has more than a title, but no TextBlock is marked as its heading, so screen-reader users cannot find its title.", first >= 0 ? 'Add "style": "heading" to the card\'s title TextBlock.' : 'Start the card with a TextBlock title with "style": "heading".');
  }

  // card.actions-few: the card's and each ActionSet's primary actions.
  const tooMany = (actions, path) => {
    const primary = (Array.isArray(actions) ? actions : []).filter((a) => lower(a?.mode) !== "secondary");
    if (primary.length > MAX_ACTIONS) add("card.actions-few", path, `${primary.length} primary actions; a card offers one to three, and never more than ${MAX_ACTIONS}.`, 'Keep the main next steps; move the rest to "mode": "secondary" (the overflow menu) or to a follow-up card.');
  };
  if (!invalid.has("")) tooMany(card.actions, ["actions"]);

  for (const { el, path, hidden } of ok) {
    const type = el.type;
    if (type === "ActionSet") tooMany(el.actions, [...path, "actions"]);
    if ((type === "TextBlock" || type === "Input.ChoiceSet") && el.wrap !== true) {
      add("card.wrap", path, `${type === "TextBlock" ? "This TextBlock" : "This ChoiceSet's choices"} will not wrap, so ${type === "TextBlock" ? "its text is" : "long choices are"} cut off on a narrow screen.`, 'Add "wrap": true.');
    }
    if (INPUTS.has(type)) {
      if (typeof el.label !== "string" || !el.label.trim()) add("card.input-label", path, `${type} ${JSON.stringify(el.id ?? "")} has no label${el.placeholder ? "; its placeholder disappears as the user types and is not a label" : ""}.`, 'Add a "label" that names the input.');
      if (VALIDATES(el) && !(typeof el.errorMessage === "string" && el.errorMessage.trim())) add("card.input-error", path, `${type} ${JSON.stringify(el.id ?? "")} validates (${["isRequired", "regex", "min", "max"].filter((k) => el[k] != null && el[k] !== false).join(", ")}) but has no errorMessage, so the user is not told what to fix.`, 'Add an "errorMessage" saying what a valid value is.');
      if (VALIDATES(el) && hidden) add("card.no-hidden-inputs", path, `${type} ${JSON.stringify(el.id ?? "")} validates but is hidden, so submitting can fail with an error the user cannot see.`, "Show the input, or make it optional; if it must start hidden, the toggle that shows it says what it shows.");
    }
    if (type === "ColumnSet" && Array.isArray(el.columns)) {
      const widths = el.columns.map((c) => px(c?.width)).filter((w) => w != null);
      const sum = widths.reduce((a, b) => a + b, 0);
      if (el.columns.length > 3) add("card.columns-few", path, `${el.columns.length} columns; on a compact screen they squeeze until the content is unreadable.`, "Use at most three columns; put the rest in rows or a FactSet.");
      else if (sum > COMPACT_WIDTH) add("card.columns-few", path, `Fixed column widths add up to ${sum}px, wider than a ${COMPACT_WIDTH}px compact screen.`, 'Use "auto", "stretch" or weights instead of pixel widths.');
    }
    if (type === "Image" && !(typeof el.altText === "string" && el.altText.trim())) add("card.image-alt", path, "This Image has no altText, so people who cannot see it lose what it says.", 'Add "altText" describing the image (or what it shows).');
    if (ACTIONS.has(type)) {
      const title = typeof el.title === "string" ? el.title : "";
      if (!title.trim() && !el.iconUrl) add("card.action-titles", path, `This ${type} has no title, so nobody can tell what it does.`, 'Add a "title" that says what the action does, such as "Approve expense".');
      else if (VAGUE.test(title)) add("card.action-titles", path, `"${title}" does not say what the action does.`, 'Title the action with what it does, such as "View order".');
      else if (BARE.test(title) && !(typeof el.tooltip === "string" && el.tooltip.trim())) add("card.action-titles", path, `"${title}" alone does not say what will happen.`, 'Say what it does, such as "Submit expense" or "Book table".');
      if (type === "Action.Submit" || type === "Action.Execute") {
        const m = markerOf(el);
        if (m?.highImpact === true) {
          if (!(typeof m.consequence === "string" && m.consequence.trim())) add("card.high-impact-marked", [...path, "data", "ux-builder"], `"${title}" is marked high-impact but gives no consequence, so the approval can only repeat its title.`, 'Add "consequence": what will happen, such as "Pay £120.00 to Acme Ltd".');
        } else if (HIGH_IMPACT_WORDS.test(`${title} ${el.verb ?? ""}`)) {
          add("card.high-impact-marked", path, `"${title}" looks like it pays, sends, deletes or publishes, but is not marked high-impact, so the host will not ask the user to approve it.`, 'If it is, add "data": { "ux-builder": { "highImpact": true, "consequence": "<what will happen>" } }.');
        }
      }
    }
  }
  const order = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
  return findings.sort((a, b) => order(a.path, b.path) || order(a.rule, b.rule));
}
