/* Admit a umf.visual document (CONTRACT-009 Input): the pinned umf-visual payload schema, then
   the resolution a layout depends on, with its diagnostic codes (umf-visual CONTRACT-083).
   umf-visual remains the full validator; this is what the renderer must be sure of before it draws. */

import Ajv2020 from "ajv/dist/2020.js";
import schema from "../../schema/umf-visual.schema.json" with { type: "json" };

export const FORMS = {
  flow: ["network", "pipeline", "zoned", "lanes"],
  sequence: ["lifelines", "ladder"],
  structure: ["stack", "tree", "nested", "entities"],
  state: ["machine", "lifecycle"],
  timeline: ["milestones", "roadmap", "history"],
  comparison: ["matrix", "quadrant", "before-after"],
  metric: ["stat", "bar", "line", "meter"],
};
export const SUPPORTED = new Set(["flow/network", "flow/pipeline", "flow/zoned", "flow/lanes", "sequence/lifelines", "sequence/ladder",
  "state/machine", "state/lifecycle", "structure/entities", "structure/tree", "structure/stack", "structure/nested",
  "comparison/matrix", "comparison/quadrant", "comparison/before-after",
  "timeline/milestones", "timeline/roadmap", "timeline/history",
  "metric/stat", "metric/bar", "metric/line", "metric/meter"]);
const CONTENT = {
  flow: { allowed: ["nodes", "edges", "groups"], required: ["nodes"] },
  sequence: { allowed: ["groups", "sequence"], required: ["sequence"] },
  structure: { allowed: ["nodes", "groups", "structure"], required: ["nodes"] },
  state: { allowed: ["nodes", "state"], required: ["nodes", "state"] },
  timeline: { allowed: ["timeline"], required: ["timeline"] },
  comparison: { allowed: ["comparison"], required: ["comparison"] },
  metric: { allowed: ["metric"], required: ["metric"] },
};
const KEYS = ["groups", "nodes", "edges", "sequence", "structure", "state", "timeline", "comparison", "metric"];
const WALKTHROUGH = new Set(["flow", "sequence", "state", "timeline"]);

const ajv = new Ajv2020({ allErrors: true, strict: false });
const structure = ajv.compile(schema);

const fail = (code, message, diagnostics) => Object.assign(new Error(message), { code, diagnostics });

/* Content the schema does not name, as JSON Pointers: retained by umf-visual, not drawn (CONTRACT-083 VISUAL_UNKNOWN). */
function unknown(node, sch, path, out) {
  if (sch.$ref) sch = schema.$defs[sch.$ref.split("/").at(-1)];
  if (sch.oneOf) { sch = sch.oneOf.find((c) => c.properties?.kind?.const === node?.kind); if (!sch) return; }
  if (sch.type === "object" && node && typeof node === "object" && !Array.isArray(node)) {
    for (const [key, child] of Object.entries(node)) {
      if (sch.properties && Object.hasOwn(sch.properties, key)) unknown(child, sch.properties[key], `${path}/${key}`, out);
      else out.push(`${path}/${key}`);
    }
  }
  if (sch.type === "array" && Array.isArray(node) && typeof sch.items === "object") node.forEach((c, i) => unknown(c, sch.items, `${path}/${i}`, out));
}

/**
 * The visual payload of a document, or a rejection with code VISUAL_VERSION, VISUAL_INVALID,
 * VISUAL_INCOMPLETE or VISUAL_UNSUPPORTED.
 */
export function admit(document, { allowIncomplete = false } = {}) {
  const version = document?.vocabularies?.["umf.visual"]?.version;
  if (typeof version !== "string" || version.split(".")[0] !== "1") throw fail("VISUAL_VERSION", `Expected umf.visual 1.x, found ${version ?? "none"}`, []);
  const v = document.extensions?.["umf.visual"];
  if (!structure(v)) throw fail("VISUAL_INVALID", "The visual does not match the umf.visual schema", structure.errors.map((e) => ({ code: "EXTENSION_STRUCTURE", path: e.instancePath, message: e.message })));
  const diagnostics = [];
  const add = (code, path, message) => diagnostics.push({ code, path, message });
  if (!FORMS[v.kind].includes(v.form)) add("VISUAL_FORM", "/form", `${v.form} is not a form of ${v.kind}`);
  for (const key of KEYS) {
    if (v[key] !== undefined && !CONTENT[v.kind].allowed.includes(key)) add("VISUAL_BLOCK", `/${key}`, `A ${v.kind} visual does not carry ${key}`);
    if (v[key] === undefined && CONTENT[v.kind].required.includes(key)) add("VISUAL_BLOCK", "", `A ${v.kind} visual requires ${key}`);
  }
  if (v.steps && !WALKTHROUGH.has(v.kind)) add("VISUAL_STEPS", "/steps", `A ${v.kind} visual has no walkthrough`);
  const ids = new Map();
  const declare = (list, sort, path) => (list ?? []).forEach((item, i) => {
    if (ids.has(item.id)) add("VISUAL_ID", `${path}/${i}/id`, `${item.id} is already used by a ${ids.get(item.id)}`);
    else ids.set(item.id, sort);
  });
  const s = v.sequence, st = v.structure, sm = v.state, t = v.timeline, c = v.comparison, m = v.metric;
  declare(v.groups, "group", "/groups"); declare(v.nodes, "node", "/nodes"); declare(v.edges, "edge", "/edges"); declare(v.steps, "step", "/steps");
  declare(s?.participants, "participant", "/sequence/participants"); declare(s?.messages, "message", "/sequence/messages");
  declare(st?.layers, "layer", "/structure/layers"); declare(st?.references, "reference", "/structure/references");
  declare(sm?.transitions, "transition", "/state/transitions");
  declare(t?.scale?.periods, "period", "/timeline/scale/periods"); declare(t?.lanes, "lane", "/timeline/lanes");
  declare(t?.events, "event", "/timeline/events"); declare(t?.spans, "span", "/timeline/spans"); declare(t?.markers, "marker", "/timeline/markers");
  declare(c?.items, "item", "/comparison/items"); declare(c?.criteria, "criterion", "/comparison/criteria");
  declare(m?.axis?.categories, "category", "/metric/axis/categories"); declare(m?.series, "series", "/metric/series");
  const resolve = (id, sorts, path) => {
    if (id === undefined) return;
    const sort = ids.get(id);
    if (!sort || (sorts.length && !sorts.includes(sort))) add("VISUAL_REFERENCE", path, `${id} is not a ${sorts.join(" or ") || "declared item"}`);
  };
  (v.groups ?? []).forEach((g, i) => resolve(g.parent, ["group"], `/groups/${i}/parent`));
  (v.nodes ?? []).forEach((n, i) => { resolve(n.group, ["group"], `/nodes/${i}/group`); resolve(n.parent, ["node"], `/nodes/${i}/parent`); resolve(n.layer, ["layer"], `/nodes/${i}/layer`); });
  (v.edges ?? []).forEach((e, i) => { resolve(e.from, ["node"], `/edges/${i}/from`); resolve(e.to, ["node"], `/edges/${i}/to`); });
  (v.steps ?? []).forEach((step, i) => step.focus.forEach((id, j) => resolve(id, [], `/steps/${i}/focus/${j}`)));
  (s?.messages ?? []).forEach((msg, i) => { resolve(msg.from, ["participant"], `/sequence/messages/${i}/from`); resolve(msg.to, ["participant"], `/sequence/messages/${i}/to`); resolve(msg.group, ["group"], `/sequence/messages/${i}/group`); });
  const fields = new Map((st?.entities ?? []).map((e) => [e.node, new Set(e.fields.map((f) => f.name))]));
  (st?.entities ?? []).forEach((e, i) => resolve(e.node, ["node"], `/structure/entities/${i}/node`));
  (st?.references ?? []).forEach((r, i) => ["from", "to"].forEach((end) => {
    resolve(r[end].node, ["node"], `/structure/references/${i}/${end}/node`);
    if (r[end].field !== undefined && !fields.get(r[end].node)?.has(r[end].field)) add("VISUAL_REFERENCE", `/structure/references/${i}/${end}/field`, `${r[end].node} declares no field ${r[end].field}`);
  }));
  if (sm) {
    resolve(sm.initial, ["node"], "/state/initial");
    (sm.final ?? []).forEach((id, i) => resolve(id, ["node"], `/state/final/${i}`));
    sm.transitions.forEach((x, i) => { resolve(x.from, ["node"], `/state/transitions/${i}/from`); resolve(x.to, ["node"], `/state/transitions/${i}/to`); });
  }
  for (const [list, path] of [[v.nodes, "/nodes"], [v.groups, "/groups"]]) {
    const parents = new Map((list ?? []).map((x) => [x.id, x.parent]));
    (list ?? []).forEach((x, i) => {
      const seen = new Set();
      for (let at = x.parent; at !== undefined && !seen.has(at); at = parents.get(at)) {
        if (at === x.id) { add("VISUAL_CYCLE", `${path}/${i}/parent`, `${x.id} contains itself`); break; }
        seen.add(at);
      }
    });
  }
  // Form rules a layout depends on (umf-visual CONTRACT-083 VISUAL_FORM_RULE).
  if (v.kind === "flow" && v.form === "zoned") {
    (v.nodes ?? []).forEach((n, i) => { if (n.group === undefined) add("VISUAL_FORM_RULE", `/nodes/${i}`, "Every node in a zoned flow is in a group"); });
    (v.groups ?? []).forEach((g, i) => { if (g.parent === undefined && g.tier === undefined) add("VISUAL_FORM_RULE", `/groups/${i}`, "Every root group in a zoned flow has a tier"); });
  }
  if (diagnostics.length) throw fail("VISUAL_INVALID", `The visual has ${diagnostics.length} problem${diagnostics.length > 1 ? "s" : ""}`, diagnostics);
  const extra = [];
  unknown(v, schema, "", extra);
  if (extra.length && !allowIncomplete) throw fail("VISUAL_INCOMPLETE", "The visual has content this renderer does not read", extra.map((path) => ({ code: "VISUAL_UNKNOWN", path, message: "Unknown visual content" })));
  if (!SUPPORTED.has(`${v.kind}/${v.form}`)) throw fail("VISUAL_UNSUPPORTED", `${v.kind}/${v.form} is not drawn by @ux-builder/visuals 0.1`, []);
  return { visual: v, unknown: extra };
}
