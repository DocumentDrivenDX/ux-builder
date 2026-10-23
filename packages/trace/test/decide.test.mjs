/* The five answers on a decision (US-119-AC1, AC3; FEAT-018 GDL-11;
   CONTRACT-007 as amended by CONTRACT-008).

     npm test --workspace @ux-builder/trace */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { currentEpisode, readEpisode, recordDecision, validateEvent } from "../index.mjs";
import { cli, SECRETS, tempApp } from "./helpers.mjs";

const FIVE = ["--goal", "Find a river near me", "--without", `No: without a map people can't judge distance (token ${SECRETS.github})`, "--simplest", "A list sorted by distance", "--assumptions", "Location is available", "--assumptions", "People fish near home", "--validation", "Compare task time with the list in a test"];

describe("decide with the five answers", () => {
  // @covers US-119-AC1
  test("decide with --chose, --why and the five answers writes all seven, masking the free text", () => {
    const app = tempApp();
    assert.equal(cli(app, ["start", "--goal", "Map screen"]).status, 0);
    const r = cli(app, ["decide", "--kind", "addition", "--chose", "A map screen", "--why", "People choose rivers by place", ...FIVE]);
    assert.equal(r.status, 0, r.stderr);
    const d = readEpisode(app, currentEpisode(app)).at(-1);
    assert.equal(d.kind, "decision");
    assert.equal(d.decisionKind, "addition");
    assert.equal(d.chose, "A map screen");
    assert.equal(d.why, "People choose rivers by place");
    assert.equal(d.goal, "Find a river near me");
    assert.match(d.without, /^No: without a map people can't judge distance \(token \[masked:[a-z-]+\]\)$/);
    assert.equal(d.simplest, "A list sorted by distance");
    assert.deepEqual(d.assumptions, ["Location is available", "People fish near home"]);
    assert.equal(d.validation, "Compare task time with the list in a test");
    assert.deepEqual(validateEvent(d), []);
    assert.ok(!readFileSync(join(app, ".ux-builder/trace", `${d.episode}.jsonl`), "utf8").includes(SECRETS.github));
  });

  // @covers US-119-AC3
  test("decide --kind addition without one of the five answers exits 2 naming it, and writes nothing", () => {
    const app = tempApp();
    assert.equal(cli(app, ["start", "--goal", "Map screen"]).status, 0);
    const before = readEpisode(app, currentEpisode(app)).length;
    const pairs = [["--goal", "goal"], ["--without", "without"], ["--simplest", "simplest"], ["--assumptions", "assumptions"], ["--validation", "validation"]];
    for (const [flag, field] of pairs) {
      const args = [];
      for (let i = 0; i < FIVE.length; i += 2) if (FIVE[i] !== flag) args.push(FIVE[i], FIVE[i + 1]);
      const r = cli(app, ["decide", "--kind", "addition", "--chose", "A map screen", "--why", "People choose rivers by place", ...args]);
      assert.equal(r.status, 2, `${field}: ${r.stderr}`);
      assert.match(r.stderr, new RegExp(`an addition needs "${field}"`));
    }
    assert.equal(readEpisode(app, currentEpisode(app)).length, before);
  });

  test("a decision that is not an addition needs none of the five; an unknown kind is refused", () => {
    const app = tempApp();
    assert.equal(cli(app, ["start", "--goal", "Review"]).status, 0);
    const e = recordDecision(app, { chose: "WorkQueue", why: "A queue fits review" });
    assert.equal(e.kind, "decision");
    assert.equal(e.decisionKind, undefined);
    assert.equal(e.goal, undefined);
    assert.throws(() => recordDecision(app, { chose: "x", why: "y", kind: "whim" }), /kind is one of addition, checkpoint/);
    assert.ok(existsSync(join(app, ".ux-builder/trace")));
  });
});
