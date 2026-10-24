/* ux-builder-design status (US-117-AC3, CONTRACT-008 Commands).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { status } from "../index.mjs";
import { cli, tempApp } from "./helpers.mjs";

const EXPLORING = {
  activity: "explore",
  checkpoints: [{ id: "core-1", status: "passed", answer: "Yes", at: "2026-10-23T10:00:00.000Z" }],
  questions: [{ id: "Q-1", text: "Should people sign in to save rivers?", status: "open" }, { id: "Q-2", text: "Search or map?", status: "answered", answer: "Map" }],
  assumptions: [
    { id: "A-1", text: "Location is available", status: "assumed", evidence: [] },
    { id: "A-2", text: "Anglers plan the night before", status: "hypothesis", evidence: [] },
    { id: "A-3", text: "Most use phones", status: "confirmed", evidence: ["EV-1"] },
  ],
  alternatives: [{ name: "map-first", file: "docs/ux-builder/blueprint/app.blueprint.map-first.json", status: "chosen" }, { name: "search-first", file: "docs/ux-builder/blueprint/app.blueprint.search-first.json", status: "rejected", reason: "More steps" }],
  next: "Build an exploratory prototype of map first.",
};

describe("status", () => {
  // @covers US-117-AC3
  test("prints the activity, the chosen alternative, untested assumptions, open questions and the next action in plain words", () => {
    const app = tempApp({ state: EXPLORING });
    const r = cli(app, ["status"]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, [
      "Step 4 of 8: Explore alternatives (Explore, in the full loop).",
      "map-first is chosen.",
      "2 assumptions are untested.",
      "Open question: Should people sign in to save rivers?",
      "Checkpoints passed: core-1.",
      "Next: Build an exploratory prototype of map first.",
      "",
    ].join("\n"));
  });

  // @covers US-117-AC3
  test("--json returns the same facts, and the documents in docs/ux-builder/", () => {
    const app = tempApp({ state: EXPLORING });
    mkdirSync(join(app, "docs/ux-builder/decisions"), { recursive: true });
    writeFileSync(join(app, "docs/ux-builder/brief.md"), "# Brief\n");
    writeFileSync(join(app, "docs/ux-builder/decisions/UXD-1.md"), "# UXD-1\n");
    const r = cli(app, ["status", "--json"]);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.activity, "explore");
    assert.equal(out.chosen, "map-first");
    assert.equal(out.untestedAssumptions, 2);
    assert.deepEqual(out.openQuestions, ["Should people sign in to save rivers?"]);
    assert.equal(out.next, "Build an exploratory prototype of map first.");
    assert.deepEqual(out.documents.map((d) => d.path), ["docs/ux-builder/brief.md", "docs/ux-builder/decisions/UXD-1.md"]);
    assert.deepEqual(out, status(app));
  });

  test("a new app's empty state reads as a start at Define", () => {
    const app = tempApp();
    const r = cli(app, ["status"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^Step 1 of 8: Define intent \(Define, in the full loop\)\.\nNo alternative is chosen yet\.\nNo untested assumptions\.\nNo open questions\.\nNext \(not set; the activity.s first step\): Interview the person about what users must accomplish, then draft the brief and ask core-1\.\n$/);
  });

  test("status finds the app from a folder below it", () => {
    const app = tempApp({ state: EXPLORING });
    mkdirSync(join(app, "src/screens"), { recursive: true });
    const r = cli(join(app, "src/screens"), ["status", "--json"]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(JSON.parse(r.stdout).chosen, "map-first");
  });
});
