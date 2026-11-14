/* UX decisions as HELIX ADRs (US-131; FEAT-018 GDL-31; ADR-042; CONTRACT-008).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { currentEpisode, openEpisode, readEpisode } from "@ux-builder/trace";
import { parseDocument, uiDecisions } from "../index.mjs";
import { currentText } from "../helix.mjs";
import { cli, helixApp, tempApp } from "./helpers.mjs";

const ADD = ["decision", "add", "--question", "What should users see first?", "--option", "Search first", "--option", "Map first", "--option", "Activity first", "--choice", "Map first", "--why", "Supports immediate exploration", "--assumption", "Location is available", "--validation", "Comparative usability test", "--link", "prd"];
const ADR = "docs/helix/02-design/adr/ADR-008-what-should-users-see-first.md";
const adrDir = (app) => readdirSync(join(app, "docs/helix/02-design/adr")).sort();

describe("US-131: UX decisions as HELIX ADRs", () => {
  // @covers US-131-AC1
  test("AC1: decision add proposes ADR-<nnn> with the next number, tagged area:ui, every field and Validation not tested; nothing is written under docs/helix/", () => {
    const app = helixApp();
    const before = adrDir(app);
    const r = cli(app, [...ADD, "--json"]);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.deepEqual({ id: out.id, path: out.path, status: out.status }, { id: "ADR-008", path: ADR, status: "not-tested" });
    assert.deepEqual(adrDir(app), before, "nothing is written under docs/helix/");
    const doc = parseDocument(currentText(app, ADR).text);
    assert.deepEqual(doc.front.ddx, { id: "ADR-008", type: "adr", status: "accepted", authoring: { home: "repo" }, tags: ["area:ui"], links: [{ kind: "informed_by", to: "prd" }] });
    assert.deepEqual(doc.headings, ["Problem", "Decision", "Why We Chose This", "Consequences", "Assumptions", "Validation"]);
    for (const s of ["What should users see first?", "We will map first.", "- Supports immediate exploration", "### Over Search first", "### Over Activity first", "- Location is available", "**Result**: not tested", "**Required**: Comparative usability test"]) assert.ok(doc.body.includes(s), s);
    assert.equal(JSON.parse(cli(app, [...ADD, "--json"]).stdout).id, "ADR-009", "the next number counts the proposed ADR");
  });

  // @covers US-131-AC2
  test("AC2: fewer than two alternatives, or a choice not among them, exits 2 naming the problem and writes nothing", () => {
    const app = helixApp();
    let r = cli(app, ["decision", "add", "--question", "Q?", "--option", "Only one", "--choice", "Only one", "--why", "w"]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /at least two --option alternatives; got 1/);
    r = cli(app, ["decision", "add", "--question", "Q?", "--option", "A", "--option", "B", "--choice", "C", "--why", "w"]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /--choice must be one of the options \(A, B\), not "C"/);
    assert.equal(existsSync(join(app, "docs/ux-builder/helix-proposals")), false);
  });

  // @covers US-131-AC3
  test("AC3: decision status ADR-008 refuted --evidence <where> proposes the result with the evidence and date, keeping the earlier result in its history", () => {
    const app = helixApp();
    cli(app, ADD);
    let r = cli(app, ["decision", "status", "ADR-008", "tested", "--evidence", "research/first-screen.md", "--json"]);
    assert.equal(r.status, 0, r.stderr);
    r = cli(app, ["decision", "status", "ADR-008", "refuted", "--evidence", "metrics dashboard", "--json"]);
    assert.equal(r.status, 0, r.stderr);
    const today = new Date().toISOString().slice(0, 10);
    const text = currentText(app, ADR).text;
    assert.match(text, /\*\*Result\*\*: refuted\n\*\*Evidence\*\*: metrics dashboard \(\d{4}-\d{2}-\d{2}\)/);
    assert.ok(text.includes(`- not tested until ${today}\n- tested until ${today} (research/first-screen.md (${today}))`), text);
    assert.match(text, /## Why We Chose This\n\n- Supports immediate exploration/, "the rest of the ADR is kept");
    assert.equal(uiDecisions(app)[0].status, "refuted");
    assert.equal(cli(app, ["decision", "status", "UXD-1", "tested"]).status, 2);
  });

  // @covers US-131-AC4
  test("AC4: applied, the ADR has HELIX's required sections; with no HELIX, decision add exits 2 saying to frame HELIX first", () => {
    const app = helixApp();
    const id = JSON.parse(cli(app, [...ADD, "--json"]).stdout).proposal;
    const r = cli(app, ["proposals", "apply", "--accepted", id, "--json"]);
    assert.equal(r.status, 0, r.stderr);
    const doc = parseDocument(readFileSync(join(app, ADR), "utf8"));
    for (const h of ["Problem", "Decision", "Why We Chose This", "Consequences"]) assert.ok(doc.headings.includes(h), h);
    assert.match(doc.body, /ADR-[0-9]{3}/);
    const bare = tempApp();
    const n = cli(bare, ADD);
    assert.equal(n.status, 2);
    assert.match(n.stderr, /no HELIX.*frame/);
  });

  // @covers US-131-AC5
  test("AC5: adding a decision writes a decision event to the trace with the ADR ID", () => {
    const app = helixApp();
    const episode = openEpisode(app, { trigger: "change", goal: { text: "Explore" } });
    cli(app, ADD);
    assert.equal(currentEpisode(app), episode);
    const d = readEpisode(app, episode).at(-1);
    assert.deepEqual({ kind: d.kind, ux: d.ux, chose: d.chose, considered: d.considered, assumptions: d.assumptions }, { kind: "decision", ux: "ADR-008", chose: "Map first", considered: ["Search first", "Activity first"], assumptions: ["Location is available"] });
  });
});
