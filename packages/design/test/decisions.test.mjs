/* Interaction decision records (US-131; FEAT-018 GDL-31; CONTRACT-008).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { currentEpisode, openEpisode, readEpisode } from "@ux-builder/trace";
import { parseDocument, validate } from "../index.mjs";
import { cli, tempApp } from "./helpers.mjs";

const ADD = ["decision", "add", "--question", "What should users see first?", "--option", "Search first", "--option", "Map first", "--option", "Activity first", "--choice", "Map first", "--why", "Supports immediate exploration", "--assumption", "Location is available", "--validation", "Comparative usability test", "--link", "prd"];
function helixApp() {
  const app = tempApp();
  writeFileSync(join(app, ".helix.yml"), "flows:\n  - id: helix\n    root: docs/helix/\n");
  mkdirSync(join(app, "docs/helix/01-frame"), { recursive: true });
  writeFileSync(join(app, "docs/helix/01-frame/prd.md"), "---\nddx:\n  id: prd\n  type: prd\n---\n\n# PRD\n");
  return app;
}

describe("US-131: decision records", () => {
  // @covers US-131-AC1
  test("AC1: decision add writes UXD-<n> with the next number, every field, and status not-tested", () => {
    const app = helixApp();
    const r = cli(app, [...ADD, "--json"]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(JSON.parse(r.stdout).id, "UXD-1");
    const doc = parseDocument(readFileSync(join(app, "docs/ux/decisions/UXD-1.md"), "utf8"));
    assert.deepEqual(doc.front.ux, { id: "UXD-1", type: "ux-decision", status: "not-tested", links: [{ kind: "informed_by", to: "prd" }] });
    assert.deepEqual(doc.headings, ["Question", "Alternatives", "Recommendation", "Rationale", "Assumptions", "Validation"]);
    for (const s of ["What should users see first?", "- Search first\n- Map first\n- Activity first", "## Recommendation\n\nMap first", "- Supports immediate exploration", "- Location is available", "**Required**: Comparative usability test"]) assert.ok(doc.body.includes(s), s);
    assert.equal(JSON.parse(cli(app, [...ADD, "--json"]).stdout).id, "UXD-2");
  });

  // @covers US-131-AC2
  test("AC2: fewer than two alternatives, or a choice not among them, exits 2 naming the problem and writes nothing", () => {
    const app = tempApp();
    let r = cli(app, ["decision", "add", "--question", "Q?", "--option", "Only one", "--choice", "Only one", "--why", "w"]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /at least two --option alternatives; got 1/);
    r = cli(app, ["decision", "add", "--question", "Q?", "--option", "A", "--option", "B", "--choice", "C", "--why", "w"]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /--choice must be one of the options \(A, B\), not "C"/);
    assert.equal(existsSync(join(app, "docs/ux/decisions")), false);
  });

  // @covers US-131-AC3
  test("AC3: decision status UXD-1 refuted --evidence UER-1 sets the status with the evidence and date, keeping the earlier status in its history", () => {
    const app = helixApp();
    cli(app, ADD);
    let r = cli(app, ["decision", "status", "UXD-1", "tested", "--evidence", "EV-1", "--json"]);
    assert.equal(r.status, 0, r.stderr);
    r = cli(app, ["decision", "status", "UXD-1", "refuted", "--evidence", "UER-1", "--json"]);
    assert.equal(r.status, 0, r.stderr);
    const today = new Date().toISOString().slice(0, 10);
    const ux = parseDocument(readFileSync(join(app, "docs/ux/decisions/UXD-1.md"), "utf8")).front.ux;
    assert.equal(ux.status, "refuted");
    assert.deepEqual(ux.validated, { status: "refuted", date: today, evidence: "UER-1" });
    assert.deepEqual(ux.history, [{ status: "not-tested", until: today }, { status: "tested", until: today, evidence: "EV-1" }]);
    // The rest of the record is kept.
    assert.match(readFileSync(join(app, "docs/ux/decisions/UXD-1.md"), "utf8"), /## Recommendation\n\nMap first[\s\S]*\*\*Status\*\*: refuted \(evidence UER-1, \d{4}-\d{2}-\d{2}\)/);
  });

  // @covers US-131-AC4
  test("AC4: validate checks the links to HELIX documents and the status", () => {
    const app = helixApp();
    cli(app, ADD);
    assert.equal(validate(app).valid, true, JSON.stringify(validate(app).problems));
    const p = join(app, "docs/ux/decisions/UXD-1.md");
    writeFileSync(p, readFileSync(p, "utf8").replace("to: prd", "to: FEAT-404").replace("status: not-tested", "status: probably"));
    const msgs = validate(app).problems.map((x) => x.message);
    assert.ok(msgs.includes("link to FEAT-404 (informed_by) does not resolve to a docs/ux document or a HELIX document"), msgs.join("\n"));
    assert.ok(msgs.includes('status is "probably"; use not-tested, tested or refuted'), msgs.join("\n"));
  });

  // @covers US-131-AC5
  test("AC5: adding a decision writes a decision event to the trace with the UXD ID", () => {
    const app = helixApp();
    const episode = openEpisode(app, { trigger: "change", goal: { text: "Explore" } });
    cli(app, ADD);
    assert.equal(currentEpisode(app), episode);
    const d = readEpisode(app, episode).at(-1);
    assert.deepEqual({ kind: d.kind, ux: d.ux, chose: d.chose, considered: d.considered, assumptions: d.assumptions }, { kind: "decision", ux: "UXD-1", chose: "Map first", considered: ["Search first", "Activity first"], assumptions: ["Location is available"] });
  });
});
