/* Checkpoints (US-118-AC1 to AC3, CONTRACT-008 Commands): an answer or a
   skip in the state and the trace, and the six IDs.

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { currentEpisode, openEpisode, readEpisode, validateTrace } from "@ux-builder/trace";
import { readState } from "../index.mjs";
import { cli, tempApp } from "./helpers.mjs";

const stateText = (app) => readFileSync(join(app, ".ux-builder/design-state.json"), "utf8");

describe("state checkpoint", () => {
  // @covers US-118-AC1
  test("an answer at core-1 is passed in the state with the answer and time, and is a decision in the open episode", () => {
    const app = tempApp();
    const episode = openEpisode(app, { trigger: "change", goal: { text: "Define River Path" } });
    const r = cli(app, ["state", "checkpoint", "core-1", "--answer", "Yes: people find and reach a river; measured by task success", "--json"]);
    assert.equal(r.status, 0, r.stderr);
    const [cp] = readState(app).checkpoints;
    assert.equal(cp.id, "core-1");
    assert.equal(cp.status, "passed");
    assert.equal(cp.answer, "Yes: people find and reach a river; measured by task success");
    assert.ok(!Number.isNaN(Date.parse(cp.at)));
    assert.equal(currentEpisode(app), episode);
    const d = readEpisode(app, episode).at(-1);
    assert.equal(d.kind, "decision");
    assert.equal(d.decisionKind, "checkpoint");
    assert.equal(d.checkpoint, "core-1");
    assert.equal(d.chose, cp.answer);
    assert.equal(JSON.parse(r.stdout).trace.episode, episode);
    assert.deepEqual(validateTrace(app), []);
    // core-1 moves the loop to Explore, and a next action that waited on it gives way; core-2 moves it to Experience.
    assert.equal(readState(app).activity, "explore");
    assert.match(readState(app).next, /^Draft at least two alternatives/);
    cli(app, ["state", "set", "next", JSON.stringify("Compare, then ask core-2")]);
    assert.match(cli(app, ["state", "checkpoint", "core-2", "--answer", "Map first"]).stdout, /\nNow experience\. Next: Prototype the chosen design/);
    // A "not yet" is recorded, never counts as passed, and status says so.
    assert.equal(cli(app, ["state", "set", "prototype", JSON.stringify({ branch: "proto/map" })]).status, 0);
    assert.match(cli(app, ["state", "checkpoint", "core-3", "--answer", "Not yet: fix Saved first", "--declined"]).stdout, /^Checkpoint core-3 declined/);
    assert.equal(readState(app).checkpoints.at(-1).status, "declined");
    const st = cli(app, ["status"]).stdout;
    assert.match(st, /Checkpoints declined \(no or not yet\): core-3\./);
    assert.match(st, /is still a prototype \(core-3 answered not yet\)/);
    assert.equal(cli(app, ["state", "checkpoint", "core-3", "--skip", "--declined", "--reason", "x"]).status, 2);
  });

  // @covers US-118-AC2
  test("a skip at core-2 is recorded with its reason; without --reason it exits 2 and writes nothing", () => {
    const app = tempApp();
    const episode = openEpisode(app, { trigger: "change", goal: { text: "Explore flows" } });
    const before = stateText(app);
    const bad = cli(app, ["state", "checkpoint", "core-2", "--skip"]);
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /skipping core-2 needs --reason/);
    assert.equal(stateText(app), before);

    const r = cli(app, ["state", "checkpoint", "core-2", "--skip", "--reason", "We will compare flows after the first test"]);
    assert.equal(r.status, 0, r.stderr);
    const [cp] = readState(app).checkpoints;
    assert.deepEqual({ id: cp.id, status: cp.status, reason: cp.reason }, { id: "core-2", status: "skipped", reason: "We will compare flows after the first test" });
    const d = readEpisode(app, episode).at(-1);
    assert.deepEqual({ decisionKind: d.decisionKind, checkpoint: d.checkpoint, chose: d.chose, why: d.why }, { decisionKind: "checkpoint", checkpoint: "core-2", chose: "Skipped checkpoint core-2", why: "We will compare flows after the first test" });
  });

  // @covers US-118-AC3
  test("any other ID exits 2 naming the six valid IDs", () => {
    const app = tempApp();
    const before = stateText(app);
    const r = cli(app, ["state", "checkpoint", "core-4", "--answer", "Yes"]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /"core-4" is not a checkpoint; use one of core-1, core-2, core-3, significant-change, experiment, release/);
    assert.equal(stateText(app), before);
  });

  test("an answer is needed unless skipping, and not both", () => {
    const app = tempApp();
    assert.match(cli(app, ["state", "checkpoint", "release"]).stderr, /needs --answer/);
    assert.match(cli(app, ["state", "checkpoint", "release", "--answer", "Yes", "--skip", "--reason", "x"]).stderr, /not both/);
  });
});
