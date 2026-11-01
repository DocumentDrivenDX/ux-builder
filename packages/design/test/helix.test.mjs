/* Writing into HELIX through proposals (ADR-042 decision 2, ADR-030
   decision 5): one pending patch per document, section edits, numbering.

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { proposalsApply, validate } from "../index.mjs";
import { currentText, documentOfType, nextNumber, proposeChange, sectionOf, setSection, tableUnder } from "../helix.mjs";
import { helixApp, tempApp } from "./helpers.mjs";


describe("HELIX proposals", () => {
  test("setSection replaces a section, or adds it after the one named, or at the end", () => {
    const t = "# T\n\n## A\n\none\n\n## B\n\ntwo\n";
    assert.equal(setSection(t, "A", "uno"), "# T\n\n## A\n\nuno\n\n## B\n\ntwo\n");
    assert.equal(setSection(t, "C", "three", { after: "A" }), "# T\n\n## A\n\none\n\n## C\n\nthree\n\n## B\n\ntwo\n");
    assert.equal(setSection(t, "Z", "end"), "# T\n\n## A\n\none\n\n## B\n\ntwo\n\n## Z\n\nend\n");
    assert.equal(setSection(t, "Sub", "s", { level: 3, inside: "A" }), "# T\n\n## A\n\none\n\n### Sub\n\ns\n\n## B\n\ntwo\n");
    assert.equal(sectionOf("## A\n\nx\n\n### Sub\n\ny\n\n## B\n", "Sub", 3), "y");
    assert.deepEqual(tableUnder("## T\n\n| A | B |\n|---|---|\n| 1 | 2 |\n| [x] | [y] |\n", "T"), [["1", "2"]]);
  });

  test("a second change to a document builds on the first; one patch holds both, and applying it writes both", () => {
    const app = helixApp();
    const prd = "docs/helix/01-frame/prd.md";
    const a = proposeChange(app, prd, (t) => setSection(t, "User Needs", "| Need |\n|---|\n| Find a list |", { after: "Summary" }));
    assert.equal(a.patch, "docs/ux-builder/helix-proposals/helix/01-frame/prd.md.patch");
    proposeChange(app, prd, (t) => setSection(t, "Assumptions", "- People have lists"));
    assert.ok(!readFileSync(join(app, prd), "utf8").includes("User Needs"), "HELIX is never written directly");
    const now = currentText(app, prd).text;
    assert.ok(now.includes("## User Needs") && now.includes("- People have lists"));
    assert.equal(proposalsApply(app, { accepted: [a.id] }).applied.length, 1);
    assert.equal(readFileSync(join(app, prd), "utf8"), now);
  });

  test("a change that leaves the document as it is removes its pending patch", () => {
    const app = helixApp();
    const prd = "docs/helix/01-frame/prd.md";
    const a = proposeChange(app, prd, (t) => t + "\nmore\n");
    proposeChange(app, prd, () => readFileSync(join(app, prd), "utf8"));
    assert.equal(existsSync(join(app, a.patch)), false);
  });

  test("numbers count proposed documents, and a document of a type is found on disk or proposed", () => {
    const app = helixApp();
    assert.equal(nextNumber(app, "ADR"), 8);
    proposeChange(app, "docs/helix/02-design/adr/ADR-008-x.md", () => "---\nddx:\n  id: ADR-008\n  type: adr\n---\n\n# ADR-008: X\n");
    assert.equal(nextNumber(app, "ADR"), 9);
    assert.equal(documentOfType(app, "prd").path, "docs/helix/01-frame/prd.md");
    proposeChange(app, "docs/helix/01-frame/principles.md", () => "---\nddx:\n  id: principles\n  type: principles\n---\n\n# Principles\n");
    assert.equal(documentOfType(app, "principles").path, "docs/helix/01-frame/principles.md");
  });

  test("with no HELIX, proposing a change says to frame HELIX first", () => {
    const app = tempApp();
    assert.throws(() => proposeChange(app, "docs/helix/01-frame/prd.md", (t) => t), /has no HELIX.*frame/);
  });

  test("a proposal whose document changed under it: readers see the document as it is, a new change is refused, and validate names it", () => {
    const app = helixApp();
    const prd = "docs/helix/01-frame/prd.md";
    const a = proposeChange(app, prd, (t) => t.replace("A list app.", "A list app for anglers."));
    writeFileSync(join(app, prd), readFileSync(join(app, prd), "utf8").replace("A list app.", "A river app."));
    assert.equal(currentText(app, prd).stale, a.patch);
    assert.match(currentText(app, prd).text, /A river app\./);
    assert.throws(() => proposeChange(app, prd, (t) => t + "x\n"), /no longer applies/);
    assert.ok(validate(app).problems.some((p) => p.path === a.patch && /no longer applies to docs\/helix\/01-frame\/prd\.md/.test(p.message)));
  });
});

