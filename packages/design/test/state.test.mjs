/* The design state (US-117, CONTRACT-008 Design state): the schema, state
   get and set, appending with defaults, and a stable key order.

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { DesignError, emptyState, parsePath, readState, serialize, stateGet, stateSet, validateState, writeInApp } from "../index.mjs";
import { cli, tempApp } from "./helpers.mjs";

/* A state with every field CONTRACT-008 defines. */
const FULL = {
  version: 1,
  activity: "explore",
  mode: "full",
  modeReason: "A new product",
  startedFrom: "new",
  checkpoints: [{ id: "core-1", status: "passed", answer: "Yes, that is the outcome", at: "2026-10-23T10:00:00.000Z" }],
  questions: [{ id: "Q-1", text: "Search first or map first?", status: "open" }],
  assumptions: [{ id: "A-1", text: "Location is available", status: "assumed", evidence: [] }],
  alternatives: [{ name: "map-first", file: "app.blueprint.map-first.json", status: "chosen" }, { name: "search-first", file: "app.blueprint.search-first.json", status: "rejected", reason: "More steps" }],
  issues: [{ finding: "F-3", status: "open" }],
  experiments: [{ id: "EXP-1", status: "running" }],
  faked: [{ what: "River conditions", where: "screens/detail" }],
  next: "Test map first with five users",
};

describe("the design state schema", () => {
  // @covers US-117-AC1
  test("a state with every CONTRACT-008 field passes; an unknown field or a bad assumption status fails, naming the path", () => {
    assert.deepEqual(validateState(FULL), []);
    assert.deepEqual(validateState(emptyState()), []);
    assert.deepEqual(validateState(emptyState({ startedFrom: "existing" })), []);

    const unknown = validateState({ ...FULL, mood: "good" });
    assert.ok(unknown.some((e) => e.path === "mood" && /not a design state field/.test(e.message)), JSON.stringify(unknown));

    const bad = structuredClone(FULL);
    bad.assumptions[0].status = "probably";
    const errors = validateState(bad);
    assert.ok(errors.some((e) => e.path === "assumptions[0].status" && /assumed/.test(e.message)), JSON.stringify(errors));
  });

  // @covers US-117-AC1
  test("reading an invalid state file refuses with each error's path", () => {
    const app = tempApp({ state: { activity: "dreaming" } });
    assert.throws(() => readState(app), (e) => e instanceof DesignError && e.details.some((d) => d.path === "activity"));
    const r = cli(app, ["status"]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /activity: must be one of baseline, define, explore, experience, validate/);
  });
});

describe("state get and set", () => {
  // @covers US-117-AC2
  test("state set assumptions[+] appends an assumption with an A- ID, status assumed and no evidence; state get --json returns it", () => {
    const app = tempApp();
    let r = cli(app, ["state", "set", "assumptions[+]", JSON.stringify({ text: "Location is available" })]);
    assert.equal(r.status, 0, r.stderr);
    r = cli(app, ["state", "set", "assumptions[+]", JSON.stringify({ text: "People fish near home" })]);
    assert.equal(r.status, 0, r.stderr);

    r = cli(app, ["state", "get", "assumptions", "--json"]);
    assert.equal(r.status, 0, r.stderr);
    const { value } = JSON.parse(r.stdout);
    assert.deepEqual(value, [
      { id: "A-1", text: "Location is available", status: "assumed", evidence: [] },
      { id: "A-2", text: "People fish near home", status: "assumed", evidence: [] },
    ]);
    r = cli(app, ["state", "get", "assumptions[1].id", "--json"]);
    assert.equal(JSON.parse(r.stdout).value, "A-2");
  });

  // @covers US-117-AC2
  test("the file is rewritten in a stable key order, whatever order the value's keys came in", () => {
    const app = tempApp();
    stateSet(app, { path: "assumptions[+]", value: { evidence: ["EV-1"], status: "confirmed", text: "Anglers start from a map" } });
    stateSet(app, { path: "next", value: "Compare flows" });
    const text = readFileSync(join(app, ".ux-builder/design-state.json"), "utf8");
    assert.equal(text, serialize(readState(app)));
    const keys = Object.keys(JSON.parse(text));
    assert.deepEqual(keys, ["version", "activity", "mode", "startedFrom", "checkpoints", "questions", "assumptions", "alternatives", "issues", "experiments", "faked", "next"]);
    assert.deepEqual(Object.keys(JSON.parse(text).assumptions[0]), ["id", "text", "status", "evidence"]);
  });

  test("a value the schema rejects is refused with exit 2 and nothing is written", () => {
    const app = tempApp();
    const before = readFileSync(join(app, ".ux-builder/design-state.json"), "utf8");
    const r = cli(app, ["state", "set", "mode", '"sideways"']);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /mode: must be one of full, change/);
    assert.equal(readFileSync(join(app, ".ux-builder/design-state.json"), "utf8"), before);
  });

  test("paths: fields, indexes and [+]; a bad path or a missing value is refused", () => {
    assert.deepEqual(parsePath("assumptions[0].status"), ["assumptions", 0, "status"]);
    assert.deepEqual(parsePath("questions[+]"), ["questions", "+"]);
    assert.throws(() => parsePath("a..b"), DesignError);
    const app = tempApp();
    assert.throws(() => stateGet(app, { path: "assumptions[3]" }), /no value/);
    assert.equal(cli(app, ["state", "set", "next", "not json"]).status, 2);
  });

  test("with no design state, the commands say to run init", () => {
    const app = tempApp({ state: false });
    const r = cli(app, ["state", "get"]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /run ux-builder-design init/);
  });
});

describe("where the guide writes", () => {
  test("writes outside docs/ux/, .ux-builder/, prototype/ and the blueprint files are refused", () => {
    const app = tempApp();
    assert.throws(() => writeInApp(app, "docs/helix/01-frame/prd.md", "x"), /refusing to write docs\/helix/);
    assert.throws(() => writeInApp(app, "../outside.md", "x"), DesignError);
    assert.equal(writeInApp(app, "docs/ux/brief.md", "x"), "docs/ux/brief.md");
    assert.equal(writeInApp(app, "app.blueprint.map-first.json", "{}"), "app.blueprint.map-first.json");
  });

  test("the network guard is active: any network use throws", async () => {
    await assert.rejects(async () => fetch("https://example.com"), /network use is blocked/);
  });
});
