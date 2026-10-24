/* Observations and consented transcripts from test sessions (US-141;
   FEAT-018 GDL-55 to GDL-58; ADR-039; CONTRACT-008 Commands).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { evaluationFindings, findingIdFor, readState, testKit } from "../index.mjs";
import { cli } from "./helpers.mjs";
import { kitApp, SHEET } from "./kit-fixture.mjs";

const json = (a, args) => { const r = cli(a, [...args, "--json"]); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };
export function sessionsApp() {
  const a = kitApp();
  testKit(a);
  writeFileSync(join(a, "sheet.csv"), SHEET);
  return a;
}

describe("US-141: import observations and consented transcripts", () => {
  // @covers US-141-AC1
  test("AC1: each row becomes a human finding with pseudonym, task, completed, time, errors, assists, a remark and a stable F- ID", () => {
    const a = sessionsApp();
    const r = json(a, ["observe", "import", "sheet.csv", "--kit", "TK-1"]);
    assert.equal(r.imported, 9);
    assert.deepEqual(r.sessions, ["P1", "P2", "P3", "P4", "P5"]);
    const store = JSON.parse(readFileSync(join(a, "docs/ux-builder/tests/TK-1/findings.json"), "utf8"));
    const f = store.findings.find((x) => x.participant === "P2" && x.task === 1);
    assert.deepEqual({ ...f }, { id: findingIdFor("TK-1", "P2", 1), source: "human", kit: "TK-1", participant: "P2", task: 1, journey: "J-find", completed: false, seconds: 240, errors: 2, assists: 1, remark: "Could not tell which access point was public", problem: "access points unclear", severity: 3, title: "access points unclear" });
    assert.match(f.id, /^F-[0-9a-f]{8}$/);
    // Importing again replaces, never duplicates: the IDs are stable.
    json(a, ["observe", "import", "sheet.csv", "--kit", "TK-1"]);
    const again = JSON.parse(readFileSync(join(a, "docs/ux-builder/tests/TK-1/findings.json"), "utf8"));
    assert.deepEqual(again.findings.map((x) => x.id), store.findings.map((x) => x.id));
    // A row for a task the kit does not have is reported and skipped.
    writeFileSync(join(a, "extra.csv"), "participant,task,completed\nP6,9,yes\n");
    const x = cli(a, ["observe", "import", "extra.csv", "--kit", "TK-1"]);
    assert.equal(x.status, 0);
    assert.match(x.stdout, /skipped row 1: task 9 is not in TK-1 \(tasks 1, 2\)/);
  });

  // @covers US-141-AC2
  test("AC2: names, email addresses and phone numbers are masked before anything is written; participants appear only by pseudonym", () => {
    const a = sessionsApp();
    writeFileSync(join(a, "named.csv"), [
      "participant,task,completed,seconds,errors,assists,remark",
      "Maria Lopez,1,yes,100,0,0,\"Maria said: email me at maria.lopez@example.com or call 415-555-0134\"",
      "P2,2,yes,50,0,0,Lopez family uses it too",
    ].join("\n"));
    const r = json(a, ["observe", "import", "named.csv", "--kit", "TK-1"]);
    const written = readFileSync(join(a, "docs/ux-builder/tests/TK-1/findings.json"), "utf8");
    for (const leak of ["Maria", "Lopez", "maria.lopez@example.com", "415-555-0134"]) assert.ok(!written.includes(leak), `${leak} written`);
    const m = r.findings.find((f) => f.task === 1);
    assert.equal(m.participant, "P1");
    assert.equal(m.remark, "P1 said: email me at [masked:email] or call [masked:phone]");
    assert.equal(r.findings.find((f) => f.task === 2).remark, "P1 family uses it too");
    // The real name is kept out of git, beside the pseudonym.
    assert.deepEqual(JSON.parse(readFileSync(join(a, ".ux-builder/participants.local.json"), "utf8")), { P1: "Maria Lopez" });
    // A name next to pseudonyms the sheet already uses never takes one of theirs; the kit's own sheet keeps only pseudonyms.
    writeFileSync(join(a, "docs/ux-builder/tests/TK-1/observations.csv"), "participant,task,completed,remark\nP2,1,yes,fine\nTom Reyes,1,no,Tom got lost\nP3,1,yes,\n");
    const mixed = json(a, ["observe", "import", "docs/ux-builder/tests/TK-1/observations.csv", "--kit", "TK-1"]);
    assert.deepEqual(mixed.findings.map((f) => f.participant).sort(), ["P2", "P3", "P4"], "three people, three pseudonyms: P1 is Maria, P2 and P3 the sheet's own");
    assert.equal(mixed.rewritten, "docs/ux-builder/tests/TK-1/observations.csv");
    const sheet = readFileSync(join(a, "docs/ux-builder/tests/TK-1/observations.csv"), "utf8");
    assert.ok(!/Tom|Reyes/.test(sheet), sheet);
    assert.match(sheet, /^P4,1,no,P4 got lost$/m);
  });

  // @covers US-141-AC3
  test("AC3: transcript add without --consent-confirmed refuses, says consent must be confirmed for the session, and writes nothing", () => {
    const a = sessionsApp();
    writeFileSync(join(a, "s1.txt"), "[00:00:05] Facilitator: Find a river.\n[00:00:20] P1: Where is the access?\n");
    const before = readFileSync(join(a, ".ux-builder/design-state.json"), "utf8");
    const r = cli(a, ["transcript", "add", "s1.txt", "--session", "S1", "--cite", "00:00:20"]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /consent must be confirmed for session S1 before its transcript is analysed/);
    assert.equal(existsSync(join(a, "docs/ux-builder/evidence")), false);
    assert.equal(readFileSync(join(a, ".ux-builder/design-state.json"), "utf8"), before);
  });

  // @covers US-141-AC4
  test("AC4: a consented transcript keeps only masked, cited excerpts with timestamps and its source; consent goes in the design state; recordings are refused", () => {
    const a = sessionsApp();
    writeFileSync(join(a, "s1.txt"), [
      "[00:00:05] Facilitator: Find a river you could fish this weekend.",
      "[00:00:20] Dana Wu: Hmm, where is the access? My number is 415-555-0199.",
      "[00:01:10] Dana Wu: Oh, it's on the details page.",
      "[00:02:00] Dana Wu: Nothing else to say.",
    ].join("\n"));
    const r = json(a, ["transcript", "add", "s1.txt", "--session", "S1", "--consent-confirmed", "--by", "facilitator on the call", "--cite", "00:00:20", "--cite", "00:01:10", "--date", "2026-10-20"]);
    assert.equal(r.id, "EV-1");
    assert.equal(r.excerpts, 2);
    const ev = readFileSync(join(a, "docs/ux-builder/evidence/EV-1.md"), "utf8");
    assert.match(ev, /kind: transcript/);
    assert.match(ev, /file: "s1\.txt"/);
    assert.match(ev, /^- P1: \[00:00:20\] "Hmm, where is the access\? My number is \[masked:phone\]\."$/m);
    assert.match(ev, /^- P1: \[00:01:10\] "Oh, it's on the details page\."$/m);
    assert.ok(!/Dana|Wu|415-555-0199|Nothing else to say/.test(ev), "only masked, cited excerpts");
    assert.match(ev, /consent:\n {4}confirmed: true\n {4}by: "facilitator on the call"\n {4}date: 2026-10-20/);
    assert.deepEqual(readState(a).consents, [{ session: "S1", confirmed: true, by: "facilitator on the call", date: "2026-10-20", evidence: "EV-1" }]);
    assert.equal(cli(a, ["validate"]).stdout.includes("EV-1"), false, "the record validates");
    for (const media of ["s1.mp4", "s1.m4a", "s1.wav"]) {
      writeFileSync(join(a, media), "");
      const x = cli(a, ["transcript", "add", media, "--session", "S2", "--consent-confirmed"]);
      assert.equal(x.status, 2);
      assert.match(x.stderr, /is a recording; recordings stay with their owner/);
    }
    assert.deepEqual(readdirSync(join(a, "docs/ux-builder/evidence")), ["EV-1.md"]);
  });

  // @covers US-141-AC5
  test("AC5: rubric --json reports per task the completion rate, median time, error rate and assists, and problems seen in two or more sessions", () => {
    const a = sessionsApp();
    json(a, ["observe", "import", "sheet.csv", "--kit", "TK-1"]);
    const r = json(a, ["rubric"]);
    assert.deepEqual(r.observedTasks, [
      { kit: "TK-1", task: 1, journey: "J-find", sessions: 5, completionRate: 0.6, medianSeconds: 180, errorRate: 0.6, assists: 4 },
      { kit: "TK-1", task: 2, journey: "J-saved", sessions: 4, completionRate: 0.75, medianSeconds: 37.5, errorRate: 0.5, assists: 1 },
    ]);
    assert.equal(r.recurring.length, 1);
    assert.deepEqual({ problem: r.recurring[0].problem, sessions: r.recurring[0].sessions, tasks: r.recurring[0].tasks }, { problem: "access points unclear", sessions: 3, tasks: ["TK-1#1"] });
    assert.ok(!r.recurring.some((p) => p.problem === "saved list hidden"), "seen once is not recurring");
    const eff = r.dimensions.find((d) => d.id === "task-effectiveness");
    assert.equal(eff.observed.value, "67% of 9 attempts completed (5 sessions)");
    assert.equal(eff.observed.verdict, "contradicts");
    assert.match(cli(a, ["rubric"]).stdout, /TK-1 task 1 \(J-find\): 60% completed, median 180 s, 60% with errors, 4 assists \(5 sessions\)\n {2}TK-1 task 2/);
  });

  // @covers US-141-AC6
  test("AC6: agent and human findings in one evaluation are each labelled; no agent recommendation carries source: human", () => {
    const a = sessionsApp();
    json(a, ["observe", "import", "sheet.csv", "--kit", "TK-1"]);
    const run = join(a, "ux-assessment/R-20261021T090000Z");
    const agent = { id: "F-agent01", title: "Access point not on the map", journey_id: "J-find", priority: "P1", finding_type: "heuristic", recommendation: "Show access points on the map.", evidence_refs: ["checkpoints/C-1/screenshot.png"], status: "open" };
    mkdirSync(run, { recursive: true });
    writeFileSync(join(run, "backlog.json"), JSON.stringify({ schema: "backlog", version: 1, findings: [agent] }));
    const fs = evaluationFindings(a);
    assert.equal(fs.find((f) => f.id === "F-agent01").label, "agent recommendation");
    assert.ok(fs.filter((f) => f.source === "human").length >= 5);
    for (const f of fs) assert.equal(f.label, f.source === "human" ? "human observation" : "agent recommendation", f.id);
    const text = readFileSync(join(a, json(a, ["report"]).path), "utf8");
    assert.match(text, /- \*\*F-agent01\*\* \(agent recommendation\) Severity 3: Access point not on the map/);
    assert.match(text, new RegExp(`- \\*\\*${findingIdFor("TK-1", "P2", 1)}\\*\\* \\(human observation\\) Severity 3: access points unclear`));
  });
});
