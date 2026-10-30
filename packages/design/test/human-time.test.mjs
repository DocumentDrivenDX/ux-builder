/* The person's time spent on decisions: approvals by meaning, three tiers
   of review, the intake and budget, workflow metrics, grounded evidence and
   advance --until-decision (US-152 to US-155, US-160; FEAT-018 GDL-83;
   CONTRACT-008 Commands).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { advance, budget, carried, checkpoint, claimAdd, claimVerify, coverageMap, decisionAdd, evidenceAdd, intake, logTurn, mark, metrics, pendingReviews, readState, reviewApprove, reviewFeedback, reviewList, reviewTable, setStep, stateSet, validate, writeState } from "../index.mjs";
import { cli, tempApp } from "./helpers.mjs";
import { kitApp } from "./kit-fixture.mjs";

const SKILL = readFileSync(new URL("../skill/ux-builder-design/SKILL.md", import.meta.url), "utf8");
const STORY = "docs/helix/01-frame/user-stories/US-001-find.md";
const USERS = "---\nux:\n  id: users\n  type: users\n---\n\n# Target users\n\n## Users\n\n| ID | User | Context | Needs | Jobs | Evidence | Confidence | Status |\n|---|---|---|---|---|---|---|---|\n| U-1 | Weekend anglers | On a phone at the river | None known | J-1 high | none | low | hypothesis |\n| U-2 | Guides | At a desk | None known | J-2 high | none | low | hypothesis |\n";
const edit = (a, path, f) => writeFileSync(join(a, path), f(readFileSync(join(a, path), "utf8")));
const ids = (a) => pendingReviews(a).map((p) => p.id);
const json = (a, args) => { const r = cli(a, [...args, "--json"]); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };

/* The kit app with target users and a decision: every tier has items. */
function app() {
  const a = kitApp();
  writeFileSync(join(a, "docs/ux-builder/users.md"), USERS);
  decisionAdd(a, { question: "Map first?", options: ["Map", "List"], choice: "Map", why: "Fewer steps" });
  return a;
}
const approveFoundations = (a) => { for (const k of ["brief", "user", "job", "story", "decision"]) if (reviewTable(a, { kind: k }).pending.length) reviewApprove(a, { kind: k, answer: "Yes" }); };

describe("US-152: an approval holds until the meaning changes, and then shows the change", () => {
  // @covers US-152-AC1
  test("AC1: a change to a story's frontmatter or formatting keeps its approval; the approval is kept as it was carried", () => {
    const a = app();
    reviewApprove(a, { item: "story:US-001", answer: "Yes" });
    edit(a, STORY, (t) => t.replace("type: user-stories", "type: user-stories\n  status: draft").replace(/^- \[ \]/gm, "*   [ ]").replace("then they find one with access.", "then they find one with access.   ") + "\n\n\n");
    assert.ok(!ids(a).includes("story:US-001"), "metadata and formatting do not reopen it");
    assert.deepEqual(carried(a), ["story:US-001"]);
    const r = readState(a).reviews.find((x) => x.item === "story:US-001");
    assert.match(r.snapshot, /^# US-001: Find a river\n\n- \[ \] US-001-AC1/);
    assert.ok(r.raw && r.raw !== r.hash);
  });

  // @covers US-152-AC2
  test("AC2: a change to the meaning reopens it, with a diff of only what changed; approving it again is recorded as reopened", () => {
    const a = app();
    reviewApprove(a, { item: "story:US-001", answer: "Yes" });
    edit(a, STORY, (t) => t.replace("they find one with access", "they find one with public access"));
    const p = pendingReviews(a).find((x) => x.id === "story:US-001");
    assert.equal(p.changed, true);
    assert.match(p.diff, /^- - \[ \] US-001-AC1 — Given rivers nearby, when the angler looks, then they find one with access\.\n\+ - \[ \] US-001-AC1 — .*public access\.\n {2}- \[ \] US-001-AC2/m);
    assert.doesNotMatch(p.diff, /ddx:/, "no frontmatter in the diff");
    const shown = cli(a, ["review", "show", "story:US-001"]).stdout;
    assert.match(shown, /changed since approved[\s\S]*Changed since approved:\n- - \[ \] US-001-AC1/);
    reviewApprove(a, { item: "story:US-001", answer: "Yes, public access" });
    assert.deepEqual(metrics(a).reopened, { count: 1, items: ["story:US-001"] });
  });

  // @covers US-152-AC3
  test("AC3: an approval recorded before meanings were kept still holds, and a later change reopens it without a diff", () => {
    const a = app();
    const text = readFileSync(join(a, STORY), "utf8");
    const s = readState(a);
    s.reviews = [{ item: "story:US-001", hash: createHash("sha256").update(text).digest("hex").slice(0, 16), answer: "Yes", at: "2026-10-01T00:00:00Z" }];
    writeState(a, s);
    assert.ok(!ids(a).includes("story:US-001"));
    edit(a, STORY, (t) => t.replace("Find a river", "Find a river nearby"));
    const p = pendingReviews(a).find((x) => x.id === "story:US-001");
    assert.deepEqual([p.changed, p.diff], [true, undefined]);
  });
});

describe("US-153: foundations reviewed deliberately, what is built from them as one coverage map, records as decisions", () => {
  // @covers US-153-AC1
  test("AC1: review lists foundations and built items apart; records need no approval and hold no checkpoint", () => {
    const a = app();
    writeFileSync(join(a, "notes.txt"), "interview notes");
    evidenceAdd(a, { file: "notes.txt", kind: "interview" });
    const r = reviewList(a);
    assert.deepEqual(r.foundations, ["brief", "user:U-1", "user:U-2", "job:J-1", "job:J-2", "story:US-001", "story:US-002", "decision:ADR-001"]);
    assert.deepEqual(r.derived, ["task:T-1", "task:T-2", "journey:J-find", "journey:J-saved", "screen:map", "screen:detail", "screen:saved"]);
    assert.deepEqual(r.records, ["evidence:EV-1"]);
    assert.match(r.next, /^Show the brief table \(ux-builder-design review table brief\), every row in full/);
    const text = cli(a, ["review"]).stdout;
    assert.match(text, /Foundations, a table per kind:\n {2}step 1 {2}brief[\s\S]*Built from them, as the coverage map:\n {2}step 3 {2}task:T-1/);
    for (const k of ["brief", "user", "job", "story"]) reviewApprove(a, { kind: k, answer: "Yes" });
    reviewApprove(a, { item: "map", answer: "Yes", accept: [] });
    assert.equal(checkpoint(a, { id: "core-1", answer: "Yes" }).checkpoint.status, "passed", "the evidence record held nothing");
  });

  // @covers US-153-AC2
  test("AC2: a foundation kind is one table, approved at once in the person's words; open feedback refuses it; built kinds have no table", () => {
    const a = app();
    const t = json(a, ["review", "table", "user"]);
    assert.deepEqual(t.items.map((i) => [i.id, i.status]), [["user:U-1", "awaiting review"], ["user:U-2", "awaiting review"]]);
    assert.match(cli(a, ["review", "table", "user"]).stdout, /user:U-1: Weekend anglers \(awaiting review; docs\/ux-builder\/users\.md\)\n\nid: U-1\n[\s\S]*user:U-2: Guides[\s\S]*2 awaiting review: ux-builder-design review approve --kind user/);
    reviewFeedback(a, { item: "user:U-2", text: "Guides use it on a phone too" });
    assert.match(cli(a, ["review", "approve", "--kind", "user", "--answer", "Yes"]).stderr, /user:U-2 has feedback not yet addressed: FB-1/);
    cli(a, ["review", "respond", "FB-1", "--text", "Context now says phone or desk"]);
    const ok = json(a, ["review", "approve", "--kind", "user", "--answer", "Yes, those two"]);
    assert.deepEqual(ok.items, ["user:U-1", "user:U-2"]);
    assert.deepEqual(readState(a).reviews.map((r) => [r.item, r.via, r.answer]), [["user:U-1", "table", "Yes, those two"], ["user:U-2", "table", "Yes, those two"]]);
    assert.equal(cli(a, ["review", "table", "screen"]).status, 2);
    assert.match(cli(a, ["review", "approve", "--kind", "task", "--answer", "Yes"]).stderr, /built items are approved with the coverage map/);
  });

  // @covers US-153-AC3
  test("AC3: the coverage map traces each job to its tasks, journeys and screens; its exceptions must be fixed or accepted before it approves every built item", () => {
    const a = app();
    edit(a, "docs/ux-builder/jobs.md", (t) => `${t}| J-3 | Plan a trip | low | none | low | hypothesis |\n`);
    edit(a, "docs/ux-builder/blueprint/app.blueprint.json", (t) => { const bp = JSON.parse(t); bp.screens.push({ id: "settings", title: "Settings", pattern: "Form" }); return JSON.stringify(bp); });
    stateSet(a, { path: "assumptions[+]", value: { text: "Anglers carry phones at the river" } });
    const m = coverageMap(a);
    assert.deepEqual(m.rows[0], { job: "J-1", title: "Find a river", tasks: ["T-1"], journeys: ["J-find"], screens: ["map", "detail"] });
    assert.deepEqual(m.exceptions.map((e) => e.id), ["gap:J-3", "untraced:screen:settings", "assumption:A-1"]);
    const text = cli(a, ["review", "map"]).stdout;
    assert.match(text, /J-1 Find a river\n {4}tasks T-1; journeys J-find; screens map, detail/);
    assert.match(text, /Exceptions to look at one by one \(3\):\n {2}gap:J-3: J-3 \("Plan a trip"\) has no task serving it\n {2}untraced:screen:settings: screen settings \("Settings"\) is on no journey/);
    const refused = cli(a, ["review", "approve", "map", "--answer", "Looks right"]);
    assert.equal(refused.status, 2);
    assert.match(refused.stderr, /exceptions the person has not seen through: gap:J-3 \(J-3 \("Plan a trip"\) has no task serving it\); untraced:screen:settings/);
    const ok = json(a, ["review", "approve", "map", "--answer", "Fine; trips come later", "--accept", "gap:J-3", "--accept", "untraced:screen:settings", "--accept", "assumption:A-1"]);
    assert.equal(ok.items.length, 8);
    assert.deepEqual(reviewList(a).derived, []);
    assert.deepEqual(coverageMap(a).exceptions.map((e) => e.id), ["gap:J-3", "untraced:screen:settings"], "an accepted assumption is not asked again");
  });

  // @covers US-153-AC4
  test("AC4: after the map is approved, only what changed comes back: the changed item with its diff", () => {
    const a = app();
    reviewApprove(a, { item: "map", answer: "Yes" });
    edit(a, "docs/ux-builder/blueprint/app.blueprint.json", (t) => { const bp = JSON.parse(t); bp.journeys[1].entry = "map"; return JSON.stringify(bp); });
    const m = coverageMap(a);
    assert.deepEqual(m.pending, ["journey:J-saved"]);
    assert.match(m.changed[0].diff, /^- entry: saved\n\+ entry: map$/m);
    assert.match(cli(a, ["review", "map"]).stdout, /Changed since approved:\n {2}journey:J-saved\n {6}task: T-2\n {4}- entry: saved\n {4}\+ entry: map\n[\s\S]*Approving the map approves 1 built item: journey:J-saved\./);
  });

  // @covers US-153-AC5
  test("AC5: the skill reviews foundations a table per kind, built items as the map, and records only as decisions", () => {
    assert.match(SKILL, /\*\*Three tiers of review\.\*\*/);
    assert.match(SKILL, /`ux-builder-design review table <kind>`/);
    assert.match(SKILL, /`ux-builder-design review map`/);
    assert.match(SKILL, /Never ask the person to approve the same content twice/);
  });
});

describe("US-154: the intake asked together, the budget shown, and the guide's own time measured", () => {
  // @covers US-154-AC1
  test("AC1: intake asks what the sources do not answer, together, and lists what to confirm from them", () => {
    const empty = tempApp();
    const r = intake(empty);
    assert.deepEqual(r.ask, ["product", "users", "outcome", "jobs", "constraints", "sources"]);
    assert.match(r.text, /^Ask together, in one message; a narrative answer is fine, and a part they skip becomes an assumption:\n {2}1\. What is the product/);
    const a = app();
    mkdirSync(join(a, "docs/helix/01-frame"), { recursive: true });
    writeFileSync(join(a, "docs/helix/01-frame/prd.md"), "# PRD\n");
    const k = intake(a);
    assert.deepEqual(k.confirm, [{ id: "product", from: "docs/ux-builder/brief.md" }, { id: "users", from: "docs/ux-builder/brief.md" }, { id: "outcome", from: "docs/ux-builder/brief.md" }, { id: "jobs", from: "docs/ux-builder/jobs.md" }, { id: "constraints", from: "docs/helix/01-frame/prd.md" }]);
    assert.deepEqual(k.ask, ["sources"]);
    assert.match(cli(a, ["intake"]).stdout, /Read first, then confirm in one line each:\n {2}product: from docs\/ux-builder\/brief\.md/);
    assert.match(SKILL, /\*\*Ask the intake together\.\*\*/);
  });

  // @covers US-154-AC2
  test("AC2: the budget counts the decisions left before the first prototype, and falls as they are made", () => {
    const a = app();
    const before = budget(a);
    assert.deepEqual(before.decisions, ["the brief", "the target users table", "the jobs table", "the stories table", "the decisions table", "checkpoint core-1", "the choice of approach (core-2)", "the coverage map", "the modality, screen sizes and app frame"]);
    assert.equal(before.minutes, 27);
    approveFoundations(a);
    assert.equal(budget(a).count, 4);
    assert.match(cli(a, ["status"]).stdout, /About 4 decisions left before the first prototype, roughly 12 minutes of your time: checkpoint core-1/);
  });

  // @covers US-154-AC3
  test("AC3: metrics count turns, approvals before testing, reopened and carried approvals, and minutes to the first prototype, against the targets", () => {
    const a = app();
    const at = (m) => new Date(Date.UTC(2026, 9, 27, 10, m)).toISOString();
    logTurn(a, { kind: "answer", at: at(0) });
    reviewApprove(a, { kind: "user", answer: "Yes", now: at(4) });
    logTurn(a, { kind: "approval", at: at(4) });
    logTurn(a, { kind: "other", note: "go on", at: at(6) });
    logTurn(a, { kind: "decision", at: at(8) });
    mark(a, { name: "prototype", at: at(16) });
    logTurn(a, { kind: "correction", at: at(25) });
    const m = metrics(a);
    assert.deepEqual([m.turns, m.byKind.other, m.meaningfulShare, m.approvals, m.approvalsBeforeTesting, m.minutesToPrototype], [5, 1, 0.8, 1, 1, 16]);
    assert.deepEqual(m.targets.map((t) => t.met), [true, true, true, true]);
    assert.equal(cli(a, ["metrics", "turn", "--kind", "chat"]).status, 2);
    const text = cli(a, ["metrics"]).stdout;
    assert.match(text, /Turns: 5 \(1 answer, 1 decision, 1 approval, 1 correction, 1 other\); 80% new information or decisions\./);
    assert.match(text, /First prototype: 16 active minutes/);
    assert.match(text, /met: at most 10 approvals before testing \(1\)/);
    assert.match(SKILL, /`ux-builder-design metrics turn --kind/);
  });
});

describe("US-155: every claim that shapes the design names its source", () => {
  const withEvidence = () => { const a = app(); writeFileSync(join(a, "notes.txt"), "notes"); evidenceAdd(a, { file: "notes.txt", kind: "observation" }); return a; };

  // @covers US-155-AC1
  test("AC1: a claim is recorded with its source, basis and confidence in the record's Claims, before the synthesis notes; one without is refused", () => {
    const a = withEvidence();
    assert.equal(cli(a, ["evidence", "claim", "add", "EV-1", "--text", "Ranking is by distance", "--basis", "observed", "--confidence", "high"]).status, 2);
    assert.match(cli(a, ["evidence", "claim", "add", "EV-1", "--text", "Ranking is by distance", "--source", "src/rank.js:12", "--basis", "seen", "--confidence", "high"]).stderr, /basis is observed or inferred/);
    const r = json(a, ["evidence", "claim", "add", "EV-1", "--text", "Ranking is by distance | then rating", "--source", "src/rank.js:12", "--basis", "observed", "--confidence", "high", "--contradicts", "the help page says rating"]);
    assert.equal(r.id, "C1");
    const doc = readFileSync(join(a, "docs/ux-builder/evidence/EV-1.md"), "utf8");
    assert.match(doc, /## Claims\n\n\| ID \| Claim \| Source \| Basis \| Confidence \| Direction \| Verified \| Contradicting \| Unknown \|\n\|---\|---\|---\|---\|---\|---\|---\|---\|---\|\n\| C1 \| Ranking is by distance \/ then rating \| src\/rank\.js:12 \| observed \| high \| no \| no \| the help page says rating \| – \|\n\n## Synthesis notes/);
    assert.equal(validate(a).valid, true);
  });

  // @covers US-155-AC2
  test("AC2: a direction-changing claim not checked against its source is a warning until it is verified or marked low confidence; a row with no source fails validate", () => {
    const a = withEvidence();
    const r = claimAdd(a, { id: "EV-1", text: "Assigners are notified on every change", source: "subagent summary of src/notify", basis: "inferred", confidence: "medium", direction: true });
    assert.match(r.warnings[0], /EV-1 C1 changes the design's direction but was not checked against its source/);
    assert.match(validate(a).warnings.map((w) => w.message).join("\n"), /EV-1 C1 changes the design's direction/);
    claimVerify(a, { id: "EV-1", claim: "C1", confidence: "high" });
    assert.equal(validate(a).warnings.filter((w) => /C1/.test(w.message)).length, 0);
    claimAdd(a, { id: "EV-1", text: "Most users are on phones", source: "P2 remark", basis: "inferred", confidence: "low", direction: true });
    assert.equal(validate(a).warnings.filter((w) => /C2/.test(w.message)).length, 0, "low confidence is labelled uncertain");
    edit(a, "docs/ux-builder/evidence/EV-1.md", (t) => t.replace(/(\| C2 \| Most users are on phones \| )P2 remark/, "$1–"));
    assert.match(validate(a).problems.map((p) => p.message).join("\n"), /EV-1 C2 has no source/);
    assert.match(SKILL, /never relay a\s+subagent's summary as fact/);
  });
});

describe("US-160: advance does the safe work and stops at the one decision the person must make", () => {
  // @covers US-160-AC1
  test("AC1: a new design stops at the intake; then the foundations a table per kind; then the map; then core-1; then core-2", () => {
    const a = app();
    assert.equal(advance(a).decision.kind, "intake");
    reviewApprove(a, { item: "brief", answer: "Yes" });
    let d = advance(a).decision;
    assert.deepEqual([d.kind, d.table, d.items], ["table", "user", ["user:U-1", "user:U-2"]]);
    assert.equal(d.record, 'ux-builder-design review approve --kind user --answer "<their words>"');
    approveFoundations(a);
    setStep(a, { to: "3" });
    assert.equal(advance(a).decision.kind, "map");
    reviewApprove(a, { item: "map", answer: "Yes" });
    assert.deepEqual([advance(a).decision.kind, advance(a).decision.checkpoint], ["checkpoint", "core-1"]);
    checkpoint(a, { id: "core-1", answer: "Yes" });
    assert.equal(advance(a).decision.checkpoint, "core-2");
  });

  // @covers US-160-AC2
  test("AC2: it says what it did, what it checked, the agent's own work first, the decision with a recommendation and what follows; it records no approval", () => {
    const a = app();
    reviewApprove(a, { item: "brief", answer: "Yes" });
    edit(a, STORY, (t) => t.replace("type: user-stories", "type: user-stories\n  status: draft"));
    reviewApprove(a, { kind: "story", answer: "Yes" });
    edit(a, STORY, (t) => t.replace("status: draft", "status: approved"));
    writeFileSync(join(a, "notes.txt"), "notes");
    evidenceAdd(a, { file: "notes.txt", kind: "observation" });
    claimAdd(a, { id: "EV-1", text: "Anglers search by river name", source: "agent summary", basis: "inferred", confidence: "medium", direction: true });
    const before = readFileSync(join(a, ".ux-builder/design-state.json"), "utf8");
    const r = cli(a, ["advance", "--until-decision"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^Step 1 of 8: Define intent\.\nDone: kept 1 approval through a formatting or metadata change: story:US-001\.\nDone: worked out the coverage map: 2 jobs, 0 exceptions\.\nChecked: \d+ design documents: no problems, \d+ warnings\.\nBefore asking, the agent must:\n {2}check 1 direction-changing claim against its source before showing it: EV-1 C1/);
    assert.match(r.stdout, /Decision for the person: approve the user table \(2 items\)\n {2}Show: ux-builder-design review table user, every row in full\n {2}Recommended: .+\n {2}Record: .+\n {2}After: the next foundation table \(job\)\nAbout \d+ decisions left/);
    assert.equal(readFileSync(join(a, ".ux-builder/design-state.json"), "utf8"), before, "no approval recorded");
    assert.equal(cli(a, ["advance"]).status, 2);
    assert.match(SKILL, /`ux-builder-design advance --until-decision`/);
  });
});
