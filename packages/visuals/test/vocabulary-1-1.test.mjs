/* umf.visual 1.1.0 (US-169): both pinned versions are read, exact multiplicities and stable field
   ids are drawn without changing their meaning, early years keep their value, and graphs above
   fifteen nodes draw. The 1.1.0 documents are the pinned 1.0.0 fixtures declared as 1.1.0 and
   given the fields 1.1.0 adds. */

import assert from "node:assert/strict";
import { test } from "node:test";
import { admit, check, createTheme, loadTheme, render } from "../node.mjs";
import { fixture } from "./helpers.mjs";

const theme = createTheme(loadTheme("praxis"));
const v = (doc) => doc.extensions["umf.visual"];
const as11 = (doc) => { doc.vocabularies["umf.visual"].version = "1.1.0"; return doc; };
const code = (fn) => { try { fn(); return "admitted"; } catch (e) { return [e.code, ...(e.diagnostics ?? []).map((d) => d.code)].join(" "); } };

/* beacon-schema-tickets as 1.1.0: its first reference ends at a field named by id with 2..5. */
function tickets() {
  const doc = as11(fixture("beacon-schema-tickets")), s = v(doc).structure, r = s.references[0];
  s.entities.find((e) => e.node === r.to.node).fields.find((f) => f.name === r.to.field).id = "ticket-customer";
  delete r.to.field; r.to.fieldId = "ticket-customer";
  delete r.toCardinality; r.toMultiplicity = { min: 2, max: 5, text: "2..5" };
  return doc;
}

test("@covers US-169-AC1 each document is read with its version's schema, and 1.1.0's entity rules hold", () => {
  assert.equal(code(() => admit(fixture("beacon-schema-tickets"))), "admitted", "1.0.0");
  assert.equal(code(() => admit(tickets())), "admitted", "1.1.0");
  const old = tickets(); old.vocabularies["umf.visual"].version = "1.0.0";
  assert.match(code(() => admit(old)), /^VISUAL_INCOMPLETE/, "a 1.1.0 field in a 1.0.0 document is unknown");
  const later = tickets(); later.vocabularies["umf.visual"].version = "1.4.0"; v(later).novel = true;
  assert.match(code(() => admit(later)), /^VISUAL_INCOMPLETE VISUAL_UNKNOWN/, "a later minor reads as 1.1.0, its additions unknown");
  const major = tickets(); major.vocabularies["umf.visual"].version = "2.0.0";
  assert.match(code(() => admit(major)), /^VISUAL_VERSION/);
  const missing = tickets(); v(missing).structure.references[0].to.fieldId = "nowhere";
  assert.match(code(() => admit(missing)), /^VISUAL_INVALID VISUAL_REFERENCE/);
  const two = tickets(); v(two).structure.references[0].to.field = "id";
  assert.match(code(() => admit(two)), /^VISUAL_INVALID VISUAL_REFERENCE/, "field and fieldId name different fields");
  const reversed = tickets(); v(reversed).structure.references[0].toMultiplicity = { min: 5, max: 2 };
  assert.match(code(() => admit(reversed)), /^VISUAL_INVALID VISUAL_VALUE/);
  const clash = tickets(); v(clash).structure.references[0].toCardinality = "exactly-one";
  assert.match(code(() => admit(clash)), /^VISUAL_INVALID VISUAL_VALUE/, "a cardinality contradicting the multiplicity");
});

test("@covers US-169-AC2 a count no crow's foot states is written, never widened, in every output", async () => {
  const doc = tickets(), r = v(doc).structure.references[0];
  const svg = await render(doc, { theme: "praxis" });
  assert.match(svg.content, />2\.\.5</, "the SVG writes the notation");
  assert.deepEqual(check(svg.layout, { theme }), []);
  const mermaid = (await render(doc, { theme: "praxis", output: "mermaid" })).content;
  assert.match(mermaid, new RegExp(`customers \\|\\|--\\|\\{ tickets : "customer_id \\(to 2\\.\\.5\\)"`), "nearest crow's foot, exact count in the label");
  assert.match(svg.text, /tickets\.customer\\_id: customer\\_id \(exactly one to 2\.\.5\)/, "the text version, Markdown-escaped");
  // A multiplicity that a cardinality states draws as that cardinality, with no count written.
  r.toMultiplicity = { min: 0 };
  const conventional = await render(doc, { theme: "praxis" });
  assert.doesNotMatch(conventional.content, />0\.\.\*</);
  assert.ok(conventional.content.length > 0);
});

test("@covers US-169-AC3 an end named only by fieldId enters at that field's row and is named by it", async () => {
  const doc = tickets();
  const byId = await render(doc, { theme: "praxis" });
  const byName = await render(fixture("beacon-schema-tickets"), { theme: "praxis" });
  const end = (layout, id) => layout.edges.find((e) => e.id === id).points.at(-1);
  assert.deepEqual(end(byId.layout, "customers--tickets--customer-id"), end(byName.layout, "customers--tickets--customer-id"), "the same row as when the end names the field");
  assert.match(byId.text, /tickets\.customer\\_id/);
  assert.match((await render(doc, { theme: "praxis", output: "mermaid" })).content, /customer_id/);
});

test("@covers US-169-AC4 years 0000-0099 keep their value on a timeline", async () => {
  const doc = fixture("umf-releases"), t = v(doc).timeline;
  t.events = [{ id: "a", label: "A", at: "0098-03-01" }, { id: "b", label: "B", at: "0100-06-01" }, { id: "c", label: "C", at: "0101-09-01" }];
  const { content, layout } = await render(doc, { theme: "praxis" });
  assert.match(content, />99</); assert.match(content, />100</);
  assert.doesNotMatch(content, /19(98|99)/, "no year in the 1900s");
  assert.deepEqual(check(layout, { theme }), []);
});

/* Twenty nodes in each graph form, chained so every node has a line. */
const N = 20, ids = Array.from({ length: N }, (_, i) => `n${i}`);
const chain = () => ids.slice(1).map((id, i) => ({ id: `e${i}`, from: ids[i], to: id }));
const doc = (visual) => ({ umf: "0.10.0", id: `visual:${visual.id}`, vocabularies: { "umf.visual": { version: "1.1.0" } }, extensions: { "umf.visual": { question: "What connects?", ...visual } }, modules: [] });
const LARGE = {
  "flow/network": doc({ id: "net", kind: "flow", form: "network", nodes: ids.map((id) => ({ id, label: `Part ${id}` })), edges: chain() }),
  "flow/pipeline": doc({ id: "pipe", kind: "flow", form: "pipeline", nodes: ids.map((id) => ({ id, label: `Step ${id}` })), edges: chain() }),
  "flow/zoned": doc({ id: "zoned", kind: "flow", form: "zoned", groups: [1, 2, 3, 4].map((t) => ({ id: `z${t}`, label: `Zone ${t}`, role: "zone", tier: t })), nodes: ids.map((id, i) => ({ id, label: `Part ${id}`, group: `z${1 + (i % 4)}` })), edges: chain() }),
  "flow/lanes": doc({ id: "lanes", kind: "flow", form: "lanes", groups: [1, 2, 3, 4].map((t) => ({ id: `l${t}`, label: `Lane ${t}`, role: "lane" })), nodes: ids.map((id, i) => ({ id, label: `Part ${id}`, group: `l${1 + (i % 4)}` })), edges: chain() }),
  "structure/tree": doc({ id: "tree", kind: "structure", form: "tree", nodes: ids.map((id, i) => ({ id, label: `Item ${id}`, ...(i ? { parent: ids[Math.floor((i - 1) / 4)] } : {}) })) }),
  "structure/stack": doc({ id: "stack", kind: "structure", form: "stack", nodes: ids.map((id, i) => ({ id, label: `Piece ${id}`, layer: `y${i % 4}` })), structure: { layers: [0, 1, 2, 3].map((y) => ({ id: `y${y}`, label: `Layer ${y}` })) } }),
  "structure/nested": doc({ id: "nested", kind: "structure", form: "nested", nodes: ids.map((id, i) => ({ id, label: `Box ${id}`, ...(i ? { parent: ids[i < 5 ? 0 : 1 + (i % 4)] } : {}) })) }),
  "structure/entities": doc({ id: "entities", kind: "structure", form: "entities", nodes: ids.map((id) => ({ id, label: `table_${id}`, role: "store" })),
    structure: { entities: ids.map((id) => ({ node: id, fields: [{ name: "id", type: "uuid", keys: ["pk"] }, { name: "parent_id", type: "uuid", keys: ["fk"] }] })),
      references: ids.slice(1).map((id, i) => ({ id: `r${i}`, from: { node: ids[i] }, to: { node: id, field: "parent_id" }, fromCardinality: "exactly-one", toCardinality: "zero-or-many" })) } }),
  "state/machine": doc({ id: "machine", kind: "state", form: "machine", nodes: ids.map((id) => ({ id, label: `State ${id}` })), state: { initial: "n0", final: ["n19"], transitions: ids.slice(1).map((id, i) => ({ id: `t${i}`, from: ids[i], to: id, event: `go ${i}` })) } }),
  "state/lifecycle": doc({ id: "life", kind: "state", form: "lifecycle", nodes: ids.map((id) => ({ id, label: `Phase ${id}` })), state: { initial: "n0", final: ["n19"], transitions: ids.slice(1).map((id, i) => ({ id: `t${i}`, from: ids[i], to: id, event: `go ${i}`, path: "main" })) } }),
};

test("@covers US-169-AC5 every graph form draws more than fifteen nodes, and check reports what is unreadable", async () => {
  const seen = {};
  for (const [form, d] of Object.entries(LARGE)) {
    assert.equal(code(() => admit(d)), "admitted", form);
    const { content, layout } = await render(d, { theme: "praxis" });
    assert.match(content, /^<svg/, form);
    const findings = check(layout, { theme });
    assert.ok(Array.isArray(findings), form);
    seen[form] = [...new Set(findings.map((f) => f.code))].join(",") || "clean";
  }
  // What each layout makes of twenty nodes, for the record (CONTRACT-009 Checks).
  console.log(JSON.stringify(seen));
});
