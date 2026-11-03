/* US-165: the Mermaid form, parsed by Mermaid itself in a real browser. */

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { SUPPORTED, portableIsTable, render } from "../node.mjs";
import { fixture, fixtures, kindForm } from "./helpers.mjs";

let browser, page;
before(async () => {
  browser = await chromium.launch();
  page = await browser.newPage();
  await page.setContent("<div></div>");
  await page.addScriptTag({ path: createRequire(import.meta.url).resolve("mermaid/dist/mermaid.min.js") });
});
after(() => browser?.close());

const parses = (text) => page.evaluate(async (t) => { try { await window.mermaid.parse(t); return "ok"; } catch (e) { return String(e.message); } }, text);

test("@covers US-165-AC1 every graph-kind fixture emits Mermaid that parses, in the theme, naming everything in the document", async () => {
  // The kinds whose portable form is a Markdown table are US-167-AC4's.
  for (const f of fixtures.filter((x) => SUPPORTED.has(kindForm(x.document)) && !portableIsTable(x.document.extensions["umf.visual"]))) {
    const v = f.document.extensions["umf.visual"];
    const { content } = await render(f.document, { theme: "databricks", output: "mermaid" });
    assert.equal(await parses(content), "ok", f.id);
    const [init, id] = content.split("\n");
    assert.match(init, /^%%\{init: \{"theme":"base","themeVariables":\{"background":"#[0-9A-F]{6}"/);
    assert.equal(id, `%% id: ${v.id}`);
    const named = [...(v.nodes ?? []), ...(v.sequence?.participants ?? [])];
    for (const n of named) assert.ok(content.includes(n.id.replace(/_/g, "__").replace(/-/g, "_h")), `${f.id}: ${n.id}`);
    for (const e of v.edges ?? []) if (e.label) assert.ok(content.includes(e.label), `${f.id}: ${e.label}`);
    for (const m of v.sequence?.messages ?? []) assert.ok(content.includes(m.label.replace(/[;:]+/g, " ").trim()), `${f.id}: ${m.label}`);
    for (const t of v.state?.transitions ?? []) assert.ok(content.includes(t.event), `${f.id}: ${t.event}`);
  }
});

test("@covers US-165-AC2 quotes, brackets, colons and line breaks in labels are escaped", async () => {
  const doc = fixture("helix-context");
  const v = doc.extensions["umf.visual"];
  v.nodes[0].label = 'The "team" [all of it]';
  v.nodes[0].detail = "line one\nline two";
  v.edges[0].label = 'asks: "why?"';
  const { content } = await render(doc, { theme: "praxis", output: "mermaid" });
  assert.equal(await parses(content), "ok");
  assert.match(content, /#quot;team#quot;/);
  const seq = fixture("beacon-reply-draft");
  seq.extensions["umf.visual"].sequence.messages[0].label = "opens praxis: then; signs in #1";
  assert.equal(await parses((await render(seq, { theme: "praxis", output: "mermaid" })).content), "ok");
});

test("@covers US-169-AC2 an exact multiplicity's Mermaid takes the nearest crow's foot, keeps the count in its label, and parses", async () => {
  const doc = fixture("beacon-schema-tickets"), s = doc.extensions["umf.visual"].structure, r = s.references[0];
  doc.vocabularies["umf.visual"].version = "1.1.0";
  delete r.toCardinality; r.toMultiplicity = { min: 2, max: 5, text: "2..5" };
  const { content } = await render(doc, { theme: "praxis", output: "mermaid" });
  assert.match(content, /\|\{ tickets : "customer_id \(to 2\.\.5\)"/);
  assert.equal(await parses(content), "ok");
});
