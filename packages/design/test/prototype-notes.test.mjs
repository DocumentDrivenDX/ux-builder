/* Notes from trying a prototype (US-135-AC5; FEAT-018 GDL-43): kept as
   design-team observations, never as user evidence.

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readState, validate } from "../index.mjs";
import { cli, tempApp } from "./helpers.mjs";

describe("US-135-AC5: design-team observations", () => {
  // @covers US-135-AC5
  test("notes recorded with state set are observations with source design-team; any other source is refused", () => {
    const app = tempApp();
    let r = cli(app, ["state", "set", "observations[+]", JSON.stringify({ text: "Picking an activity first felt slow", alternative: "activity-first" }), "--json"]);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(r.stdout).value, { text: "Picking an activity first felt slow", alternative: "activity-first", id: "O-1", source: "design-team" });
    assert.deepEqual(readState(app).observations, [{ id: "O-1", text: "Picking an activity first felt slow", source: "design-team", alternative: "activity-first" }]);
    r = cli(app, ["state", "set", "observations[+]", JSON.stringify({ text: "Users loved it", source: "human" })]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /observations\[1\]\.source/);
    // They are not research evidence: no evidence record and no job is made from them.
    assert.deepEqual(validate(app).documents, []);
  });
});
