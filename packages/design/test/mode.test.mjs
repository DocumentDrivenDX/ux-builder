/* The full loop and change mode (US-121-AC1, CONTRACT-008 Commands).
   US-121-AC2 and AC3 need impact (B-033) and are tested there.

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readState } from "../index.mjs";
import { cli, tempApp } from "./helpers.mjs";

describe("mode", () => {
  // @covers US-121-AC1
  test("mode change then mode full: the state's mode follows each, and status shows it", () => {
    const app = tempApp();
    let r = cli(app, ["mode", "change", "--why", "Adding a filter to the list"]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(readState(app).mode, "change");
    assert.equal(readState(app).modeReason, "Adding a filter to the list");
    assert.match(cli(app, ["status"]).stdout, /^Define, in change mode\./);
    assert.equal(JSON.parse(cli(app, ["status", "--json"]).stdout).mode, "change");

    r = cli(app, ["mode", "full"]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(readState(app).mode, "full");
    assert.equal(readState(app).modeReason, undefined);
    assert.match(cli(app, ["status"]).stdout, /^Define, in the full loop\./);
  });

  test("any other mode is refused with exit 2", () => {
    const app = tempApp();
    const r = cli(app, ["mode", "fast"]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /mode is full or change/);
  });
});
