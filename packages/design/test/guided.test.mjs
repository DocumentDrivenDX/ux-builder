/* The guided conversation: an overview, where the person is, terms
   explained, and each item reviewed and approved before moving on
   (US-148; FEAT-018 GDL-79; CONTRACT-008 Commands).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { decisionAdd, readState } from "../index.mjs";
import { cli, tempApp } from "./helpers.mjs";
import { KIT_BP, kitApp } from "./kit-fixture.mjs";

const SKILL = readFileSync(new URL("../skill/ux-builder-design/SKILL.md", import.meta.url), "utf8");
const json = (a, args) => { const r = cli(a, [...args, "--json"]); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };
const ids = (a) => json(a, ["review"]).pending.map((p) => p.id);
/* The kit app (a brief, jobs, two stories, two tasks and journeys) with two target users and a decision. */
function reviewApp() {
  const a = kitApp();
  writeFileSync(join(a, "docs/ux-builder/users.md"), "---\nux:\n  id: users\n  type: users\n---\n\n# Target users\n\n## Users\n\n| ID | User | Context | Needs | Jobs | Evidence | Confidence | Status |\n|---|---|---|---|---|---|---|---|\n| U-1 | Weekend anglers | On a phone at the river | None known | J-1 high | none | low | hypothesis |\n| U-2 | Guides | At a desk | None known | J-2 high | none | low | hypothesis |\n");
  decisionAdd(a, { question: "Map first?", options: ["Map", "List"], choice: "Map", why: "Fewer steps" });
  return a;
}
const approveAll = (a, steps) => { for (const p of json(a, ["review"]).pending.filter((x) => !steps || steps.includes(x.step))) json(a, ["review", "approve", p.id, "--answer", "Yes, that's right"]); };

describe("US-148: follow the guide step by step, and approve each item", () => {
  // @covers US-148-AC1
  test("AC1: overview lists the eight steps with what the person does, what comes out and the checkpoints; the skill opens a first session with it", () => {
    const a = tempApp();
    const o = json(a, ["overview"]);
    assert.deepEqual(o.steps.map((s) => s.name), ["Define intent", "Understand users", "Model tasks", "Explore alternatives", "Design the structure", "Prototype", "Test with people", "Refine and improve"]);
    for (const s of o.steps) { assert.ok(s.you.length > 20, s.name); assert.ok(s.produces, s.name); assert.ok(s.terms.length, s.name); }
    assert.deepEqual(o.steps.filter((s) => s.checkpoint).map((s) => [s.n, s.checkpoint]), [[3, "core-1"], [4, "core-2"], [7, "core-3"], [8, "experiment, release"]]);
    const text = cli(a, ["overview"]).stdout;
    assert.match(text, /^Step 1 of 8: Define intent\n {2}You: /m);
    assert.match(text, /one at a time, asks for your feedback, makes the changes, and moves on only when you approve it/);
    assert.match(SKILL, /\*\*In the first session\*\* \(no checkpoint answered, nothing approved yet\),\n {3}start with an overview, before any question: run\n {3}`ux-builder-design overview`/);
  });

  // @covers US-148-AC2
  test("AC2: status leads with the step; step next moves on; a passed core checkpoint moves past the steps it closes", () => {
    const a = tempApp();
    assert.match(cli(a, ["status"]).stdout, /^Step 1 of 8: Define intent \(Define, in the full loop\)\./);
    assert.equal(json(a, ["step", "next"]).text, "Step 2 of 8: Understand users");
    assert.equal(json(a, ["step", "3"]).text, "Step 3 of 8: Model tasks");
    assert.equal(cli(a, ["step", "9"]).status, 2);
    json(a, ["state", "checkpoint", "core-1", "--answer", "Yes"]);
    assert.equal(readState(a).step, 4);
    assert.match(cli(a, ["status"]).stdout, /^Step 4 of 8: Explore alternatives \(Explore/);
    json(a, ["mode", "change"]);
    json(a, ["step", "2"]);
    assert.match(cli(a, ["status"]).stdout, /^Change mode, step 2 of 4: Impact/);
    const b = tempApp({ state: { activity: "baseline", startedFrom: "existing" } });
    assert.match(cli(b, ["status"]).stdout, /^Baseline, before step 1 of 8 \(Baseline/);
  });

  // @covers US-148-AC3
  test("AC3: explain gives each term's meaning and why it is valuable; --step lists a step's terms; an unknown term exits 2", () => {
    const a = tempApp();
    const r = json(a, ["explain", "blueprint"]);
    assert.equal(r.terms[0].term, "blueprint");
    assert.match(r.terms[0].means, /plan of the app's screens/);
    assert.match(r.terms[0].why, /checked, scored, compared and prototyped before code exists/);
    assert.match(cli(a, ["explain", "user", "stories"]).stdout, /^user story: A short statement/);
    assert.deepEqual(json(a, ["explain", "--step", "2"]).terms.map((t) => t.term), ["target user", "job to be done", "evidence", "confidence"]);
    for (const s of json(a, ["overview"]).steps) for (const t of s.terms) assert.equal(cli(a, ["explain", t]).status, 0, t);
    const bad = cli(a, ["explain", "synergy"]);
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /"synergy" is not in the glossary; it has checkpoint, design state, HELIX, /);
    assert.match(SKILL, /The first time a term comes up in\na session/);
  });

  // @covers US-148-AC4
  test("AC4: review lists every item not yet approved, in step order, with its ID and step; review show prints its content", () => {
    const a = reviewApp();
    const pending = json(a, ["review"]).pending;
    assert.deepEqual(pending.map((p) => p.id), ["brief", "user:U-1", "user:U-2", "job:J-1", "job:J-2", "story:US-001", "story:US-002", "task:T-1", "task:T-2", "journey:J-find", "journey:J-saved", "decision:UXD-1", "screen:map", "screen:detail", "screen:saved"]);
    assert.deepEqual([...new Set(pending.map((p) => p.step))], [1, 2, 3, 4, 5]);
    const show = json(a, ["review", "show", "user:U-1"]);
    assert.equal(show.status, "awaiting review");
    assert.match(show.content, /^id: U-1\nuser: Weekend anglers\ncontext: On a phone at the river\n/);
    assert.match(cli(a, ["review", "show", "story:US-001"]).stdout, /story:US-001: US-001: Find a river \(step 3, awaiting review; docs\/helix\/01-frame\/user-stories\/US-001-find\.md\)\n\n---\nddx:/);
    assert.match(cli(a, ["review", "show", "task:T-1"]).stdout, /goal: Find a river to fish this weekend on the River map\njobs: J-1/);
    assert.equal(cli(a, ["review", "show", "task:T-9"]).status, 2);
  });

  // @covers US-148-AC5
  test("AC5: approval waits for feedback to be addressed, records the person's words, and a changed item is listed again", () => {
    const a = reviewApp();
    const fb = json(a, ["review", "feedback", "user:U-1", "--text", "They fish from a kayak too, not only the bank"]);
    assert.equal(fb.id, "FB-1");
    const refused = cli(a, ["review", "approve", "user:U-1", "--answer", "OK"]);
    assert.equal(refused.status, 2);
    assert.match(refused.stderr, /user:U-1 has feedback not yet addressed: FB-1 \("They fish from a kayak too, not only the bank"\)/);
    writeFileSync(join(a, "docs/ux-builder/users.md"), readFileSync(join(a, "docs/ux-builder/users.md"), "utf8").replace("On a phone at the river", "On a phone at the river or in a kayak"));
    json(a, ["review", "respond", "FB-1", "--text", "Context now says: on a phone at the river or in a kayak"]);
    const ok = json(a, ["review", "approve", "user:U-1", "--answer", "Yes, that's them"]);
    assert.equal(ok.next, "brief", "the next is the first still awaiting review, in step order");
    const s = readState(a);
    assert.equal(s.reviews[0].item, "user:U-1");
    assert.equal(s.reviews[0].answer, "Yes, that's them");
    assert.deepEqual(s.feedback[0], { ...s.feedback[0], status: "addressed", response: "Context now says: on a phone at the river or in a kayak" });
    assert.ok(!ids(a).includes("user:U-1"));
    // Changed after approval: listed again, marked as changed.
    writeFileSync(join(a, "docs/ux-builder/users.md"), readFileSync(join(a, "docs/ux-builder/users.md"), "utf8").replace("| None known | J-1 high", "| Large touch targets | J-1 high"));
    const again = json(a, ["review"]).pending.find((p) => p.id === "user:U-1");
    assert.equal(again.changed, true);
    assert.match(cli(a, ["review"]).stdout, /step 2 {2}user:U-1 {2}Weekend anglers {2}\(changed since approved\)/);
  });

  // @covers US-148-AC6
  test("AC6: a checkpoint, or step next, refuses while items of its steps await review, naming them; a skip still records", () => {
    const a = reviewApp();
    const before = readFileSync(join(a, ".ux-builder/design-state.json"), "utf8");
    const r = cli(a, ["state", "checkpoint", "core-1", "--answer", "Yes"]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /checkpoint core-1 cannot be passed yet: 9 items await the person's review: brief, user:U-1, user:U-2, job:J-1, job:J-2, story:US-001, story:US-002, task:T-1, task:T-2\. /);
    assert.equal(readFileSync(join(a, ".ux-builder/design-state.json"), "utf8"), before, "nothing recorded");
    assert.match(cli(a, ["step", "next"]).stderr, /step 1 has items awaiting the person's review: brief/);
    approveAll(a, [1, 2, 3]);
    assert.equal(cli(a, ["state", "checkpoint", "core-1", "--answer", "Yes"]).status, 0);
    // core-2 waits for step 4's journeys and decision; a "not yet" and a skip are still recorded.
    assert.match(cli(a, ["state", "checkpoint", "core-2", "--answer", "Map"]).stderr, /journey:J-find, journey:J-saved, decision:UXD-1/);
    assert.equal(cli(a, ["state", "checkpoint", "core-2", "--answer", "Not yet", "--declined"]).status, 0);
    assert.equal(cli(a, ["state", "checkpoint", "core-2", "--skip", "--reason", "The person wants to see a prototype first"]).status, 0);
    approveAll(a, [4]);
    assert.equal(cli(a, ["state", "checkpoint", "core-2", "--answer", "Map"]).status, 0);
  });
});
