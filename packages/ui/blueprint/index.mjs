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
  // AI and agent screens (FEAT-011 AIB-02): warnings, as ADR-028 decision 5.
  "agent.declare-high-impact", "agent.approve-high-impact", "ai.fallback", "ai.consent", "genui.renderable",
];
const STATES = ["empty", "loading", "error"];

/* What an assistant may render inline (FEAT-007 GEN-01). The catalogue's
   `renderable` flags decide once FEAT-007 ships them; until then, this list:
   the widgets and regions that fit inside a message and carry one small
   task (US-048: tables, cards and forms; FEAT-011: Wizard and FormPage).
   Shells, navigation, multi-pane screens and modals are left out; open those
   as an artifact pane instead (FEAT-007 AGT-T-05). SD-005 records the choice. */
const INLINE = [
  "Button", "Card", "Checkbox", "ChoicePicker", "Combobox", "DataTable", "DatePicker", "DateRangePicker", "Notice", "ProgressBar",
  "RadioGroup", "Select", "StatusPill", "Switch", "TextArea", "TextField",
  "ChartFrame", "DescriptionList", "ErrorSummary", "FormPage", "FormSection", "PeriodComparison", "ReviewConfirm", "StatePanel",
  "StatTile", "TaskList", "Timeline", "Wizard",
];
const COMPONENTS = [...catalogue.patterns, ...catalogue.widgets].filter((c) => c.type === "component");
const RENDERABLE = new Set(COMPONENTS.some((c) => "renderable" in c) ? COMPONENTS.filter((c) => c.renderable).map((c) => c.name) : INLINE);
const REGION = ["compact", "medium"];

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

/* A pattern an AI renders inline is checked with its own rules at the size
   classes of the region it renders in, not the window's (FEAT-011 AIB-03,
   ADR-021). Each entry checks one pattern rule for an inline pattern and
   returns [message, fix], or nothing when it passes. */
const INLINE_CHECKS = {
  "screen.states": ({ s, name, region }) => {
    const missing = STATES.filter((x) => !(Array.isArray(s.states) && s.states.includes(x)));
    if (missing.length) return [`${name}, rendered inline on "${s.title ?? s.id}" at ${region.join(" and ")}, has no ${missing.join(", ")} state${missing.length > 1 ? "s" : ""}; the screen does not declare ${missing.length > 1 ? "them" : "it"}.`, `Add ${missing.map((x) => JSON.stringify(x)).join(", ")} to the screen's states, and supply each state's content to the inline ${name}.`];
  },
  "view.no-shell": ({ name }) => [`A view renders ${name} inline; the host draws the shell.`, "Render a screen pattern without a shell, or a widget."],
};
const inlineRules = (name, bp, region) => RULES.filter((r) => INLINE_CHECKS[r.id] && r.appliesTo?.patterns?.includes(name) && !r.when?.aiRole
  && meets(r.when?.context, bp.kind) && meets(r.when?.sizeClass, region) && meets(r.when?.input, bp.supports?.inputs));

/* The value at a path in the blueprint. */
const valueAt = (bp, path) => path.reduce((v, k) => (v && typeof v === "object" ? v[k] : undefined), bp);

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
  // Inside a screen's ai, a value outside its enum is named (US-077-AC6); elsewhere the message is as before.
  const named = (path, msg) => (path[2] === "ai" && msg.startsWith("must be one of") ? `is ${JSON.stringify(valueAt(bp, path))}; it ${msg}` : msg);
  for (const [path, msg] of schemaErrors) add("blueprint.valid", path, msg.startsWith('"') ? `${msg}.` : `${ptr(path) || "The blueprint"} ${named(path, msg)}.`, "Follow the blueprint schema (get_blueprint_schema, or CONTRACT-005).");

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
    if (s.ai && typeof s.ai === "object" && !Array.isArray(s.ai)) aiChecks(s, at);
  });

  /* The AI checks of one screen (FEAT-011 AIB-02, AIB-03): each applies when
     its rule's roles meet the screen's declared ai.roles. All are warnings. */
  function aiChecks(s, at) {
    const ai = s.ai, roles = Array.isArray(ai.roles) ? ai.roles : [];
    const onAi = (id) => on(id) && meetsRole(byId.get(id).when?.aiRole, roles);
    const title = s.title ?? s.id;
    const hia = Array.isArray(ai.highImpactActions) ? ai.highImpactActions : [];
    if (onAi("agent.declare-high-impact") && ai.acts === true && !hia.length) {
      add("agent.declare-high-impact", [...at, "ai"], `The agent on "${title}" acts, but no high-impact action is listed.`, 'List each action it can take that is irreversible, costly or seen by others in ai.highImpactActions, each with its approval; or set acts to false if it changes nothing outside the conversation.');
    }
    // "plan" is approval as part of a plan the user reviews. The blueprint has
    // no field saying a plan is shown, so on an agent screen (the only one this
    // rule applies to) "plan" is accepted, and the audit's agent.plan-visible
    // check confirms the plan in the markup.
    if (onAi("agent.approve-high-impact")) hia.forEach((a, j) => {
      if (a && typeof a === "object" && (a.approval === "none" || !("approval" in a))) {
        add("agent.approve-high-impact", [...at, "ai", "highImpactActions", j], `${a.label ?? "A high-impact action"} on "${title}" ${a.approval === "none" ? "has no approval" : "declares no approval"}.`, 'Set approval to "each" (the user approves it every time) or "plan" (approved as part of a plan the user reviews); the agent never approves it for the user.');
      }
    });
    // A fallback names a screen or a destination; consent a screen or a modal.
    const destIds = new Set(dests.filter((d) => d && typeof d === "object").map((d) => d.id));
    if (onAi("ai.fallback") && ai.essential !== true) {
      if (!ai.fallback) add("ai.fallback", [...at, "ai"], `The AI on "${title}" adds to the task, but nothing does the task without it.`, "Set ai.fallback to the screen or destination that does the job without AI, or set ai.essential to true if the AI is the task.");
      else if (typeof ai.fallback === "string" && !ids.has(ai.fallback) && !destIds.has(ai.fallback)) add("ai.fallback", [...at, "ai", "fallback"], `The fallback "${ai.fallback}" names no screen or destination.`, `Name one of: ${[...ids.keys()].join(", ")}.`);
    }
    if (onAi("ai.consent") && ai.dataLeavesDevice === true) {
      const modalIds = new Set(screens.flatMap((x) => [...modalsOf(x.modals, [])].map(({ m }) => m.id)));
      if (!ai.consent) add("ai.consent", [...at, "ai"], `Data leaves the device for the AI on "${title}", but no consent is declared.`, "Set ai.consent to the screen or modal where the user is told what is sent and why, and agrees; it must also let them opt out later.");
      else if (typeof ai.consent === "string" && !ids.has(ai.consent) && !modalIds.has(ai.consent)) add("ai.consent", [...at, "ai", "consent"], `The consent "${ai.consent}" names no screen or modal.`, "Name the screen or modal where the user consents.");
    }
    const renders = Array.isArray(ai.renders) ? ai.renders : [];
    const region = Array.isArray(ai.region) && ai.region.length ? ai.region : REGION;
    renders.forEach((name, j) => {
      if (typeof name !== "string") return;
      const path = [...at, "ai", "renders", j];
      if (onAi("genui.renderable") && !RENDERABLE.has(name)) {
        const known = COMPONENTS.some((c) => c.name === name);
        add("genui.renderable", path, known ? `${name} is not renderable inline in "${title}".` : `"${name}" is not a component in @ux-builder/ui ${catalogue.packages["@ux-builder/ui"]}.`, known ? `Render one of: ${[...RENDERABLE].sort().join(", ")}; or open ${name} as an artifact pane beside the conversation.` : `Did you mean "${nearestPattern(name)}"? Render one of: ${[...RENDERABLE].sort().join(", ")}.`);
      }
      for (const r of PATTERNS.includes(name) ? inlineRules(name, bp, region) : []) {
        const hit = INLINE_CHECKS[r.id]({ s, name, region });
        if (hit) add(r.id, path, hit[0], hit[1], "warning");
      }
    });
  }

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
