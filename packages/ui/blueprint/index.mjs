/* @ux-builder/ui/blueprint: the interaction and IA rules, and a check of an
   app's or view's plan against them (FEAT-008, ADR-025, CONTRACT-005).

     import { rulesFor, checkBlueprint } from "@ux-builder/ui/blueprint";
     rulesFor({ context: "view", sizeClasses: ["compact"], inputs: ["coarse"], aiRoles: ["agent"] });
     checkBlueprint(JSON.parse(readFileSync("app.blueprint.json", "utf8")));

   Reads only the installed catalogue.json, so it runs in Node or a browser
   with no network and no dependency. */

import catalogue from "../catalogue.json" with { type: "json" };

const { rules: RULES, recipes: RECIPES, limits: LIMITS, blueprintSchema, aiRoles: AI_ROLES } = catalogue.interaction;
const PATTERNS = catalogue.patterns.filter((p) => p.type === "component").map((p) => p.name);
const byId = new Map(RULES.map((r) => [r.id, r]));

export { blueprintSchema, LIMITS as limits, RULES as rules, RECIPES as recipes };

/* The checks this module runs, by the rule ID each reports. */
export const CHECKS = [
  "blueprint.valid", "pattern.exists", "nav.compact-destinations", "screen.states", "action.destructive-safeguard",
  "modal.titled", "modal.dismiss", "modal.one-at-a-time", "modal.unsaved-changes",
  "view.no-shell", "view.size-classes", "view.one-task", "view.states",
];
const STATES = ["empty", "loading", "error"];

/* ------------------------------------------------------------ rulesFor */
const meets = (axis, values) => !axis || values == null || axis.some((v) => [].concat(values).includes(v));
/* AI roles are the exception: a target with no role matches no AI rule (FEAT-011 AIO-02). */
const meetsRole = (axis, roles) => !axis || axis.some((v) => [].concat(roles ?? []).includes(v));

/* Rules whose `when` matches the target on every axis the rule names; an
   axis the target leaves out matches every value, except `aiRoles`: a rule
   for an AI role applies only to a target with that role. */
export function rulesFor({ context, sizeClasses, inputs, aiRoles } = {}) {
  return RULES.filter((r) => meets(r.when?.context, context) && meets(r.when?.sizeClass, sizeClasses) && meets(r.when?.input, inputs) && meetsRole(r.when?.aiRole, aiRoles));
}

/* ----------------------------------------------------------- recipes */
const words = (s) => (s ?? "").toLowerCase().match(/[a-z0-9-]+/g) ?? [];

/* Recipes for a job, best keyword match first; all of them for no job. */
export function findRecipes(job, kind) {
  const fits = RECIPES.filter((r) => !kind || r.kind === "any" || r.kind === kind);
  const w = words(job);
  if (!w.length) return fits;
  const score = (r) => {
    const keys = new Set(r.keywords.flatMap(words)), text = new Set([...words(r.title), ...words(r.job)]);
    return w.reduce((n, x) => n + (keys.has(x) || keys.has(x.replace(/s$/, "")) ? 2 : text.has(x) ? 1 : 0), 0);
  };
  return fits.map((r, i) => ({ r, i, s: score(r) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.r);
}

export const getRecipe = (id) => RECIPES.find((r) => r.id === id) ?? null;

/* ------------------------------------------------------------ skeleton */
export function skeleton(kind = "app") {
  if (kind === "view") return {
    version: 1, kind: "view", name: "My view",
    supports: { sizeClasses: ["compact", "medium", "expanded"], inputs: ["coarse", "fine"] },
    screens: [{ id: "main", title: "Result", pattern: "RecordDetail", states: ["empty", "loading", "error"] }],
  };
  return {
    version: 1, kind: "app", name: "My app",
    supports: { sizeClasses: ["compact", "medium", "expanded", "large"], inputs: ["coarse", "fine"] },
    destinations: [{ id: "home", label: "Home", screen: "home" }],
    screens: [{ id: "home", title: "Home", pattern: "CollectionList", states: ["empty", "loading", "error"] }],
  };
}

/* ------------------------------------------------------------- schema */
const ptr = (p) => p.map((k) => String(k).replace(/~/g, "~0").replace(/\//g, "~1")).map((k) => "/" + k).join("");
const typeOf = (v) => Array.isArray(v) ? "array" : v === null ? "null" : Number.isInteger(v) ? "integer" : typeof v;

/* The subset of JSON Schema 2020-12 the blueprint schema uses. */
function validate(schema, value, path, out, root = schema) {
  if (schema.$ref) return validate(root.$defs[schema.$ref.replace("#/$defs/", "")], value, path, out, root);
  const t = typeOf(value);
  if ("const" in schema && value !== schema.const) return out.push([path, `must be ${JSON.stringify(schema.const)}`]);
  if (schema.enum && !schema.enum.includes(value)) return out.push([path, `must be one of ${schema.enum.map((e) => JSON.stringify(e)).join(", ")}`]);
  if (schema.type && !(schema.type === t || (schema.type === "number" && t === "integer"))) return out.push([path, `must be ${schema.type === "array" || schema.type === "object" ? "an" : "a"} ${schema.type}`]);
  if (t === "string" && schema.minLength && value.length < schema.minLength) out.push([path, "must not be empty"]);
  if (t === "array") {
    if (schema.minItems && value.length < schema.minItems) out.push([path, `must have at least ${schema.minItems} item${schema.minItems > 1 ? "s" : ""}`]);
    if (schema.uniqueItems && new Set(value.map((v) => JSON.stringify(v))).size !== value.length) out.push([path, "must not repeat an item"]);
    if (schema.items) value.forEach((v, i) => validate(schema.items, v, [...path, i], out, root));
  }
  if (t === "object") {
    for (const k of schema.required ?? []) if (!(k in value)) out.push([path, `needs "${k}"`]);
    for (const [k, v] of Object.entries(value)) {
      if (schema.properties?.[k]) validate(schema.properties[k], v, [...path, k], out, root);
      else if (schema.additionalProperties === false) out.push([[...path, k], `"${k}" is not a blueprint field`]);
    }
    if (schema.if && schema.then) {
      const probe = []; validate(schema.if, value, path, probe, root);
      if (!probe.length) validate(schema.then, value, path, out, root);
    }
  }
}

/* --------------------------------------------------------- the checks */
function distance(a, b) {
  a = a.toLowerCase(); b = b.toLowerCase();
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
export const nearestPattern = (name) => PATTERNS.reduce((best, p) => (distance(name, p) < distance(name, best) ? p : best), PATTERNS[0]);

const applies = (rule, bp) => {
  const w = rule.when ?? {};
  return meets(w.context, bp.kind) && meets(w.sizeClass, bp.supports?.sizeClasses) && meets(w.input, bp.supports?.inputs);
};

/* Every modal in a screen, with its path and whether it sits inside another. */
function* modalsOf(modals, path, depth = 0) {
  for (const [i, m] of (Array.isArray(modals) ? modals : []).entries()) {
    if (!m || typeof m !== "object") continue;
    yield { m, path: [...path, i], depth };
    yield* modalsOf(m.modals, [...path, i, "modals"], depth + 1);
  }
}

/* Findings for the blueprint: the schema, then every blueprint check whose
   rule applies to its kind, size classes and inputs. Ordered by path, then
   rule, in plain string order, not locale order (CONTRACT-005). */
export function checkBlueprint(bp) {
  const findings = [];
  const add = (id, path, message, fix, severity) => findings.push({ rule: id, severity: severity ?? byId.get(id)?.severity ?? "error", path: ptr(path), message, fix });
  if (!bp || typeof bp !== "object" || Array.isArray(bp)) {
    add("blueprint.valid", [], "The blueprint is not a JSON object.", "Start from ux-builder-blueprint init.");
    return findings;
  }
  const schemaErrors = [];
  validate(blueprintSchema, bp, [], schemaErrors);
  // A modal's missing title or dismiss is reported by its own rule.
  const own = (path, msg) => path.includes("modals") && /^needs "(title|dismiss)"$/.test(msg);
  schemaErrors.splice(0, Infinity, ...schemaErrors.filter(([path, msg]) => !own(path, msg)));
  for (const [path, msg] of schemaErrors) add("blueprint.valid", path, msg.startsWith('"') ? `${msg}.` : `${ptr(path) || "The blueprint"} ${msg}.`, "Follow the blueprint schema (get_blueprint_schema, or CONTRACT-005).");

  const screens = Array.isArray(bp.screens) ? bp.screens.filter((s) => s && typeof s === "object") : [];
  const ids = new Map();
  screens.forEach((s, i) => {
    if (typeof s.id !== "string") return;
    if (ids.has(s.id)) add("blueprint.valid", ["screens", i, "id"], `Screen ID "${s.id}" is used twice.`, "Give each screen its own ID.");
    else ids.set(s.id, i);
  });
  const dests = Array.isArray(bp.destinations) ? bp.destinations : [];
  dests.forEach((d, i) => {
    if (d && typeof d.screen === "string" && !ids.has(d.screen)) add("blueprint.valid", ["destinations", i, "screen"], `Destination "${d.label ?? d.id}" names no screen "${d.screen}".`, `Name one of: ${[...ids.keys()].join(", ")}.`);
  });

  const on = (id) => byId.has(id) && applies(byId.get(id), bp);
  screens.forEach((s, i) => {
    const at = ["screens", bp.screens.indexOf(s)];
    if (typeof s.pattern === "string" && !PATTERNS.includes(s.pattern)) {
      const near = nearestPattern(s.pattern);
      add("pattern.exists", [...at, "pattern"], `"${s.pattern}" is not a pattern in @ux-builder/ui ${catalogue.packages["@ux-builder/ui"]}.`, `Did you mean "${near}"? See list_patterns.`);
    }
    // In a view every screen declares its states (view.states, VEW-01), whatever
    // its pattern; screen.states covers the data patterns elsewhere.
    const statesRule = bp.kind === "view" && on("view.states") ? "view.states"
      : on("screen.states") && byId.get("screen.states").appliesTo.patterns.includes(s.pattern) ? "screen.states" : null;
    if (statesRule) {
      const missing = STATES.filter((x) => !(Array.isArray(s.states) && s.states.includes(x)));
      if (missing.length) add(statesRule, [...at, "states"], `"${s.title ?? s.id}" (${s.pattern}${statesRule === "view.states" ? ", in a view" : ""}) does not declare its ${missing.join(", ")} state${missing.length > 1 ? "s" : ""}.`, `Add ${missing.map((x) => JSON.stringify(x)).join(", ")} to states, and supply each state's content to the pattern.`);
    }
    if (on("action.destructive-safeguard")) (Array.isArray(s.destructiveActions) ? s.destructiveActions : []).forEach((a, j) => {
      if (a && a.safeguard === "none") add("action.destructive-safeguard", [...at, "destructiveActions", j], `${a.label} has no safeguard.`, 'Set safeguard to "undo" (an Undo toast) or "confirm" for an unexpected, irreversible loss.');
    });
    for (const { m, path, depth } of modalsOf(s.modals, [...at, "modals"])) {
      const name = m.title || m.id;
      if (on("modal.titled") && !(typeof m.title === "string" && m.title.trim())) add("modal.titled", [...path, "title"], `Modal "${m.id}" has no title.`, "Give it a title that names its task; it becomes the dialog's accessible name.");
      if (on("modal.dismiss") && !m.dismiss) add("modal.dismiss", path, `Modal "${name}" has no way out.`, 'Set dismiss to "cancel", "close" or "done".');
      if (on("modal.one-at-a-time") && depth > 0) add("modal.one-at-a-time", path, `Modal "${name}" opens on top of another modal.`, "Close the first modal before presenting this one, or make this step part of it.");
      if (on("modal.unsaved-changes") && m.editsData && !m.guardsUnsavedChanges) add("modal.unsaved-changes", [...path, "guardsUnsavedChanges"], `Closing "${name}" would lose what was entered.`, "Set guardsUnsavedChanges and ask before discarding (useUnsavedChangesWarning).");
    }
  });

  if (bp.kind === "app" && on("nav.compact-destinations") && dests.length > LIMITS.compactDestinations) {
    add("nav.compact-destinations", ["destinations"], `${dests.length} top-level destinations; at the compact size class the bar holds ${LIMITS.compactDestinations}.`, `Keep ${LIMITS.compactDestinations} or fewer: group related ones, or move the rest to settings or a secondary page (AppShell puts more than ${LIMITS.compactDestinations} behind "More").`);
  }
  if (bp.kind === "view") {
    if (on("view.no-shell")) {
      if ("destinations" in bp) add("view.no-shell", ["destinations"], "A view has destinations; the host provides the navigation.", "Remove destinations; reach other tasks through the host or modal tasks.");
      const shell = byId.get("view.no-shell").appliesTo.patterns;
      screens.forEach((s) => { if (shell.includes(s.pattern)) add("view.no-shell", ["screens", bp.screens.indexOf(s), "pattern"], `A view uses ${s.pattern}; the host draws the shell.`, "Use a screen pattern such as RecordDetail or CollectionList, without a shell."); });
    }
    if (on("view.size-classes") && Array.isArray(bp.supports?.sizeClasses)) {
      const missing = ["compact", "medium"].filter((c) => !bp.supports.sizeClasses.includes(c));
      if (missing.length) add("view.size-classes", ["supports", "sizeClasses"], `A view must support ${missing.join(" and ")}; a host's panel is often that narrow.`, `Add ${missing.map((x) => JSON.stringify(x)).join(" and ")} to supports.sizeClasses and design for them.`);
    }
    if (on("view.one-task") && screens.length > 1) add("view.one-task", ["screens"], `A view has ${screens.length} screens; a view does one task.`, "Keep one screen; put further steps in modals or sections of it.");
  }
  const order = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
  return findings.sort((a, b) => order(a.path, b.path) || order(a.rule, b.rule));
}
