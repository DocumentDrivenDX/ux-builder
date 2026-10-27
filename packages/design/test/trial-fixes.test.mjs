/* What the paced, simulated session (trial tasks-1) found, fixed: approvals
   by meaning through re-wraps, core-2 to step 5, approvals only the person
   gives, honest metrics, contradicted claims and drifting documents
   (US-161; FEAT-018 GDL-83; CONTRACT-008 Commands).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { checkpoint, claimAdd, claimContradict, decisionAdd, evidenceAdd, meaningOf, metrics, metricsText, pendingReviews, readEvents, readState, reviewApprove, reviewMap, reviewShow, reviewTable, stateSet, validate } from "../index.mjs";
import { tempApp } from "./helpers.mjs";
import { kitApp } from "./kit-fixture.mjs";

// The skill with its line wrapping undone, so a phrase is found wherever its lines break.
const SKILL = readFileSync(new URL("../skill/ux-builder-design/SKILL.md", import.meta.url), "utf8").replace(/\s+/g, " ");
const STORY = "docs/helix/01-frame/user-stories/US-001-find.md";
const BP = "docs/ux-builder/blueprint/app.blueprint.json";
const edit = (a, path, f) => writeFileSync(join(a, path), f(readFileSync(join(a, path), "utf8")));
const ids = (a) => pendingReviews(a).map((p) => p.id);
const CONTEXT = "\n## Context\n\nAnglers new to the area look for public water\nthey can reach from a road.\n";
const approveFoundations = (a) => { for (const k of ["brief", "user", "job", "story", "decision"]) if (reviewTable(a, { kind: k }).pending.length) reviewApprove(a, { kind: k, answer: "Yes" }); };

describe("US-161: approvals, steps and measures hold up in a real session", () => {
  // @covers US-161-AC1
  test("AC1: a re-wrapped paragraph or a moved bold marker keeps the approval; a word change reopens it; an earlier approval still holds", () => {
    const a = kitApp();
    edit(a, STORY, (t) => t + CONTEXT);
    reviewApprove(a, { item: "story:US-001", answer: "Yes" });
    // The trial's edit: the paragraph re-wrapped, the bold moved over the dash, a tag added.
    edit(a, STORY, (t) => t.replace("public water\nthey can", "public water they can").replace("**US-001-AC1** —", "**US-001-AC1 —**").replace("type: user-stories", "type: user-stories\n  tags: [find]"));
    assert.ok(!ids(a).includes("story:US-001"), "formatting does not reopen it");
    edit(a, STORY, (t) => t.replace("from a road", "from a car park"));
    assert.ok(ids(a).includes("story:US-001"), "a word change does");
    // Code keeps its lines; a list item's wrapped line joins the item.
    assert.equal(meaningOf("```\na\nb\n```"), "```\na\nb\n```");
    assert.equal(meaningOf("- one\n  more\n- two"), "- one more\n- two");
    // An approval kept under the earlier normalization (bold and wrapped lines in its snapshot) still holds.
    const b = kitApp();
    edit(b, STORY, (t) => t + CONTEXT);
    reviewApprove(b, { item: "story:US-001", answer: "Yes" });
    const s = readState(b);
    const r = s.reviews.find((x) => x.item === "story:US-001");
    r.hash = "0000000000000000"; r.raw = "0000000000000000";
    r.snapshot = readFileSync(join(b, STORY), "utf8").split("---\n").at(-1).trim();
    stateSet(b, { path: "reviews", value: s.reviews });
    assert.ok(!ids(b).includes("story:US-001"));
  });

  // @covers US-161-AC2
  test("AC2: passing core-2 leaves the design at step 5, Design the structure, still in Explore", () => {
    const a = tempApp();
    checkpoint(a, { id: "core-1", answer: "Yes" });
    assert.deepEqual([readState(a).step, readState(a).activity], [4, "explore"]);
    const r = checkpoint(a, { id: "core-2", answer: "One list" });
    assert.deepEqual([r.moved, r.step, readState(a).step, readState(a).activity], [true, 5, 5, "explore"]);
    assert.match(readState(a).next, /^Ask which modalities and screen sizes/);
    assert.deepEqual(readEvents(a).filter((e) => e.type === "step").map((e) => e.step), [4, 5]);
  });

  // @covers US-161-AC3
  test("AC3: approving again what changed needs it shown first, the map too; each approval keeps the person's answer", () => {
    const a = kitApp();
    reviewApprove(a, { item: "story:US-001", answer: "Yes" });
    edit(a, STORY, (t) => t.replace("they find one with access", "they find one with public access"));
    const before = readFileSync(join(a, ".ux-builder/design-state.json"), "utf8");
    assert.throws(() => reviewApprove(a, { item: "story:US-001", answer: "I tidied up one of the story files, carry on." }), /story:US-001 changed after it was approved, and the person has not seen the change: show it \(ux-builder-design review show story:US-001\)/);
    assert.equal(readFileSync(join(a, ".ux-builder/design-state.json"), "utf8"), before, "nothing recorded");
    assert.throws(() => reviewApprove(a, { kind: "story", answer: "Yes" }), /or review table story/);
    assert.ok(reviewShow(a, { item: "story:US-001" }).diff);
    reviewApprove(a, { item: "story:US-001", answer: "Yes, public access" });
    assert.equal(readEvents(a).filter((e) => e.type === "approval").at(-1).answer, "Yes, public access");
    // The coverage map: the first approval as before; approving it again after a change needs review map.
    approveFoundations(a);
    reviewApprove(a, { item: "map", answer: "Looks right" });
    edit(a, BP, (t) => t.replace("Go back to a river you saved", "Go back to a saved river"));
    assert.throws(() => reviewApprove(a, { item: "map", answer: "Plain." }), /the coverage map changed since it was approved, and the person has not seen it as it is now/);
    reviewMap(a);
    assert.equal(reviewApprove(a, { item: "map", answer: "Yes, that reads better" }).approved, true);
  });

  // @covers US-161-AC4
  test("AC4: testing starts at a step 7 the loop stays at; the person's approvals are distinct answers; a format-only reopening misses its target", () => {
    const a = tempApp();
    const ev = (o) => { mkdirSync(join(a, ".ux-builder"), { recursive: true }); appendFileSync(join(a, ".ux-builder/metrics.jsonl"), JSON.stringify(o) + "\n"); };
    ev({ type: "turn", kind: "answer", at: "2026-10-27T14:00:00Z" });
    ev({ type: "approval", items: ["brief"], answer: "Looks right", at: "2026-10-27T14:01:00Z" });
    ev({ type: "approval", items: ["map"], answer: "Yes", at: "2026-10-27T14:02:00Z" });
    ev({ type: "approval", items: ["story:US-001"], answer: "Yes", at: "2026-10-27T14:02:01Z" });
    // The trial's correction: step 6, then 7 by mistake, then back to 5 within seconds.
    ev({ type: "step", step: 6, at: "2026-10-27T14:03:00Z" });
    ev({ type: "step", step: 7, at: "2026-10-27T14:03:01Z" });
    ev({ type: "step", step: 5, at: "2026-10-27T14:03:02Z" });
    ev({ type: "approval", items: ["story:US-002"], answer: "Plain.", reopened: ["story:US-002"], formatOnly: ["story:US-002"], at: "2026-10-27T14:05:00Z" });
    ev({ type: "milestone", name: "prototype", at: "2026-10-27T14:20:00Z" });
    let m = metrics(a);
    assert.deepEqual([m.approvals, m.personApprovals, m.approvalsBeforeTesting], [4, 3, 3], "no testing yet: every approval counts, one per answer");
    assert.deepEqual(m.reopenedByFormat, { count: 1, items: ["story:US-002"] });
    assert.equal(m.targets.find((t) => /formatting/.test(t.target)).met, false);
    assert.match(metricsText(m), /Approvals: 3 given by the person \(3 before testing\), recorded as 4 approvals; reopened 1 \(story:US-002\), 1 by formatting alone/);
    assert.match(metricsText(m), /First prototype: 15 active minutes, to when it was marked as first tried/);
    // A step 7 the loop stays at starts testing.
    ev({ type: "step", step: 7, at: "2026-10-27T14:30:00Z" });
    ev({ type: "approval", items: ["kit:TK-1"], answer: "Run it", at: "2026-10-27T14:31:00Z" });
    m = metrics(a);
    assert.deepEqual([m.personApprovals, m.approvalsBeforeTesting], [4, 3]);
    // The real path: a list turned into plain lines keeps every word, so its re-approval is format-only.
    const b = kitApp();
    reviewApprove(b, { item: "story:US-001", answer: "Yes" });
    edit(b, STORY, (t) => t.replace(/^- \[ \] /gm, ""));
    reviewShow(b, { item: "story:US-001" });
    reviewApprove(b, { item: "story:US-001", answer: "Fine" });
    assert.deepEqual(readEvents(b).filter((e) => e.type === "approval").at(-1).formatOnly, ["story:US-001"]);
  });

  // @covers US-161-AC5
  test("AC5: a contradicted claim records the person's words and asks which holds; validate warns when nobody asked", () => {
    const a = kitApp();
    writeFileSync(join(a, "gripes.md"), "Missed the dentist because the date was buried.");
    evidenceAdd(a, { file: "gripes.md", kind: "feedback" });
    claimAdd(a, { id: "EV-1", text: "A buried date led to a missed appointment; dates must be visible", source: "gripes.md:1", basis: "observed", confidence: "high", direction: true, verified: true });
    const r = claimContradict(a, { id: "EV-1", claim: "C1", text: "I don't really use due dates" });
    assert.equal(r.contradicting, 'the person: "I don\'t really use due dates"');
    assert.match(readFileSync(join(a, r.path), "utf8"), /\| C1 \| A buried date[^\n]*\| the person: "I don't really use due dates" \|/);
    const q = readState(a).questions.at(-1);
    assert.deepEqual([q.status, q.text], ["open", `EV-1 C1 says "A buried date led to a missed appointment; dates must be visible", and the person said "I don't really use due dates". Which holds?`]);
    assert.ok(!validate(a).warnings.some((w) => /is contradicted/.test(w.message)));
    // A contradiction written by hand, with no question about it, is flagged.
    claimAdd(a, { id: "EV-1", text: "Sign-in is unwanted", source: "gripes.md:1", basis: "inferred", confidence: "medium", contradicts: "the person wants Google sign-in" });
    assert.ok(validate(a).warnings.some((w) => /EV-1 C2 is contradicted \(the person wants Google sign-in\), and no question asks the person which holds/.test(w.message)));
    assert.throws(() => claimContradict(a, { id: "EV-1", claim: "C1" }), /needs --text/);
  });

  // @covers US-161-AC6
  test("AC6: validate warns when the brief lists as confirmed a story no journey carries", () => {
    const a = kitApp();
    edit(a, "docs/ux-builder/brief.md", (t) => t.replace("## Primary jobs\n\n- None yet.", "## Primary jobs\n\n- US-001: Find a river [confirmed]\n- US-009: Same list on two devices [confirmed]"));
    const w = validate(a).warnings.map((x) => x.message);
    assert.ok(w.includes("the brief lists US-009 as confirmed, but no journey in the blueprint carries it: drop it from the brief, or mark it deferred"), w.join("\n"));
    assert.ok(!w.some((m) => /lists US-001/.test(m)));
  });

  // @covers US-161-AC9
  test("AC9: the skill says to approve only what the person approved, show diffs, ask about contradictions, mark the prototype when tried, and run one command per call", () => {
    assert.match(SKILL, /\*\*Only the person approves\.\*\*/);
    assert.match(SKILL, /never with words they said about something else/);
    assert.match(SKILL, /their own edits too/);
    assert.match(SKILL, /evidence claim contradict <EV-n> <Cn> --text/);
    assert.match(SKILL, /metrics mark prototype` when the person first tries it/);
    assert.match(SKILL, /re-read the whole story/);
    assert.match(SKILL, /\*\*One command per call\.\*\*/);
  });
});
