/* The guide's own measures, as VIP List session 2 found them wanting: check
   time, step 1's minutes, one entry per step, the testing milestone,
   simulated data, the share's percent, the next action, and a proposal ID
   given without --accepted (FEAT-018 GDL-83; CONTRACT-008 Commands).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { evaluationFindings, logEvent, metrics, metricsText, observeImport, readEvents, readState, stepCheck, stepDecide, stepPrototype, testKit, writeState } from "../index.mjs";
import { approveAll, cli } from "./helpers.mjs";
import { KIT_BP, kitApp, SHEET } from "./kit-fixture.mjs";

const BP = "docs/ux-builder/blueprint/app.blueprint.json";
function app() {
  const a = kitApp();
  const bp = structuredClone(KIT_BP);
  bp.screens[1].actions = [{ id: "save", label: "Save river", to: "saved" }];
  bp.tasks = bp.tasks.map((t, k) => ({ ...t, success: [k ? "US-002-AC1" : "US-001-AC2"] }));
  writeFileSync(join(a, BP), JSON.stringify(bp, null, 2));
  return a;
}
const slow = async ({ pages }) => { await new Promise((r) => setTimeout(r, 1100)); return { ran: true, pagesAudited: pages.length, errors: 0, warnings: 0, findings: [] }; };

describe("VIP List session 2: the guide's measures", () => {
  // @covers US-172-AC2
  test("a check is stamped when it ends, with the seconds it took", async () => {
    const a = app();
    await stepPrototype(a);
    const before = Date.now();
    const r = await stepCheck(a, { audit: slow });
    assert.ok(r.seconds >= 1, `took ${r.seconds} s`);
    const ev = readEvents(a).filter((e) => e.type === "step-check").at(-1);
    assert.ok(Date.parse(ev.at) >= before + 1000, "stamped after the audit");
    assert.equal(ev.seconds, r.seconds);
  });

  test("step 1 has its minutes, and a step logged twice is one entry", () => {
    const a = app();
    const t = (m) => new Date(Date.parse("2026-10-31T10:00:00Z") + m * 60000).toISOString();
    logEvent(a, "command", { command: "overview" }, t(0));
    logEvent(a, "turn", { kind: "answer" }, t(5));
    logEvent(a, "step", { step: 2 }, t(8));
    logEvent(a, "step", { step: 2 }, t(8));
    logEvent(a, "turn", { kind: "approval" }, t(12));
    const by = metrics(a).byStep;
    assert.deepEqual(by.map((s) => s.step), [1, 2]);
    assert.equal(by[0].minutes, 8);
  });

  test("testing starts when the first study is written", () => {
    const a = app();
    approveAll(a);
    testKit(a, { study: "rivers" });
    assert.equal(readEvents(a).filter((e) => e.type === "milestone" && e.name === "testing").length, 1);
    testKit(a, { study: "rivers" });
    assert.equal(readEvents(a).filter((e) => e.type === "milestone" && e.name === "testing").length, 1, "once");
  });

  // @covers US-172-AC2
  test("simulated sessions, evidence and results are marked, and never confirm a job", () => {
    const a = app();
    approveAll(a);
    testKit(a, { study: "rivers" });
    writeFileSync(join(a, "sheet.csv"), typeof SHEET === "string" ? SHEET : SHEET.join("\n"));
    observeImport(a, { file: "sheet.csv", study: "rivers", simulated: true });
    const f = evaluationFindings(a).filter((x) => x.source === "human");
    assert.ok(f.length && f.every((x) => x.simulated && x.label === "simulated session, not a person"));
    const events = [{ type: "journey-start", journey: "J-find", session: "s", at: "2026-10-31T10:00:00Z" }, { type: "complete", journey: "J-find", session: "s", at: "2026-10-31T10:01:00Z" }];
    writeFileSync(join(a, "events.jsonl"), events.map((e) => JSON.stringify(e)).join("\n"));
    const r = cli(a, ["insights", "events.jsonl", "--simulated", "--json"]);
    assert.equal(r.status, 0, r.stderr);
    // Amended 2026-11-01 (ADR-042): insights are run output; simulated ones say so and confirm nothing.
    const out = JSON.parse(r.stdout);
    assert.equal(out.simulated, true);
    assert.match(readFileSync(join(a, out.path), "utf8"), /SIMULATED data: not evidence from real people/);
  });

  // @covers US-174-AC5
  test("an event logged with a bare date gets the moment it was logged; times out of order do not stretch a span", () => {
    const a = app();
    const t = (m) => new Date(Date.parse("2026-10-31T10:00:00Z") + m * 60000).toISOString();
    logEvent(a, "command", { command: "overview" }, t(0));
    logEvent(a, "approval", { items: [] }, "2026-10-31");
    assert.match(readEvents(a).at(-1).at, /T\d\d:\d\d/);
    // A log written before the fix, with a bare date in it, does not start the session at midnight.
    const b = app();
    logEvent(b, "command", { command: "overview" }, t(0));
    logEvent(b, "milestone", { name: "prototype" }, t(3));
    appendFileSync(join(b, ".ux-builder/metrics.jsonl"), JSON.stringify({ type: "approval", at: "2026-10-31", items: [] }) + "\n");
    assert.equal(metrics(b).minutesToPrototype, 3);
    assert.equal(metrics(b).activeMinutes, 3);
  });

  test("the share of meaningful turns prints as a percent", () => {
    const a = app();
    logEvent(a, "turn", { kind: "answer" });
    assert.match(metricsText(metrics(a)), /new information or decisions \(100%\)/);
  });

  test("continuing a step sets the next action to the next step's work", async () => {
    const a = app();
    await stepPrototype(a);
    const c = await stepCheck(a, { audit: async () => ({ ran: true, pagesAudited: 1, errors: 0, warnings: 0, findings: [] }) });
    await stepCheck(a, { accept: c.open.map((f) => f.id), reason: "the fixture's own gaps" });
    stepDecide(a, { choice: "continue", answer: "Go on" });
    assert.match(readState(a).next, /^Step 2 of 8, Understand users/);
  });

  test("proposals apply refuses an ID given without --accepted", () => {
    const a = app();
    const r = cli(a, ["proposals", "apply", "--accepted", "one", "two"]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /two was not given with --accepted\. Nothing was written/);
  });
});

describe("VIP List session 2: the scope, as one list for the person to cut", () => {
  // @covers US-172-AC7
  test("scope lists the stories with their criteria, the screens and destinations, and what people must and may give", async () => {
    const { scope } = await import("../index.mjs");
    const a = app();
    const bp = JSON.parse(readFileSync(join(a, BP), "utf8"));
    bp.screens.push({ id: "claim", title: "Claim a spot", pattern: "FormPage", content: ["Mobile number", "Name on the list", "Email (optional)", "Promotional texts (opt-in)"].map((label) => ({ label, kind: "data" })) });
    writeFileSync(join(a, BP), JSON.stringify(bp, null, 2));
    const r = scope(a);
    assert.deepEqual(r.stories.map((s) => [s.id, s.criteria]), [["US-001", 2], ["US-002", 0]]);
    assert.equal(r.criteria, 2);
    assert.deepEqual(r.required.map((i) => i.label), ["Mobile number", "Name on the list"]);
    assert.deepEqual(r.optional.map((i) => i.label), ["Email (optional)", "Promotional texts (opt-in)"]);
    assert.match(r.text, /2 stories with 2 acceptance criteria, 4 screens, 2 destinations \(Find, Saved\), 2 required inputs/);
    assert.match(r.text, /which of these can wait for a later release, and which input can people be spared\?/);
  });
});
