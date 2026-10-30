/* The docs/ux types (US-123-AC1, AC2; CONTRACT-008 Documents): each has
   its meta, template, prompt and example, and each example passes
   validate.

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { ARTIFACTS, documentTypes, exampleFile, parseDocument, validateDocument } from "../index.mjs";

/* The types CONTRACT-008's Documents table names. */
const CONTRACT = ["experience-brief", "baseline", "research-evidence", "jobs", "users", "test-kit", "usability-evaluation-report", "insights", "experiment"];

describe("the docs/ux types", () => {
  // @covers US-123-AC1
  test("every type CONTRACT-008 names has meta.yml, template.md, prompt.md and example.md; each meta names its ID prefix and output path", () => {
    assert.deepEqual(Object.keys(documentTypes()).sort(), [...CONTRACT].sort());
    for (const type of CONTRACT) {
      for (const f of ["meta.yml", "template.md", "prompt.md", "example.md"]) assert.ok(existsSync(join(ARTIFACTS, type, f)), `${type}/${f}`);
      const meta = documentTypes()[type];
      assert.equal(meta.type, type);
      assert.ok(meta.id.prefix, `${type}: id.prefix`);
      assert.match(meta.output, /^docs\/ux-builder\//, `${type}: output under docs/ux-builder/`);
      assert.ok(meta.sections.length >= 1, `${type}: sections`);
      // The template has every section, so an agent filling it in passes validate's section check.
      const headings = parseDocument(readFileSync(join(ARTIFACTS, type, "template.md"), "utf8")).headings.map((h) => h.toLowerCase());
      for (const s of meta.sections) assert.ok(headings.includes(s.toLowerCase()), `${type}: template has ## ${s}`);
    }
  });

  // @covers US-123-AC2
  test("each type's example passes validate", () => {
    // The examples link each other and the PRD; validate them as one set.
    const examples = CONTRACT.map((type) => ({ type, text: readFileSync(exampleFile(type), "utf8") }));
    const known = new Set(["prd", "ADR-008", "jobs", "J-1", "J-2", "J-3", "J-4", ...examples.map((e) => String(parseDocument(e.text).front.ux.id))]);
    for (const { type, text } of examples) {
      assert.deepEqual(validateDocument(text, { known }).filter((p) => p.level !== "note"), [], type);
      assert.equal(parseDocument(text).front.ux.type, type);
    }
  });

  test("the prompts tell the agent what not to invent", () => {
    const prompt = (t) => readFileSync(join(ARTIFACTS, t, "prompt.md"), "utf8");
    assert.match(prompt("experience-brief"), /Never mark a guess as confirmed/);
    assert.match(prompt("research-evidence"), /never its raw contents/);
    assert.match(prompt("usability-evaluation-report"), /never average them/);
  });
});
