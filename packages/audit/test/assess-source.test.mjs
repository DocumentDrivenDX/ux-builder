/* Where each finding came from (FEAT-018 GDL-55, GDL-58; US-141-AC6;
   CONTRACT-008 "Amendment to CONTRACT-006"): the report labels each a human
   observation, an agent recommendation or a design-team note, and
   validate-report refuses an agent's finding labelled human.

     npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { report } from "../assess/report.mjs";
import { validateReport } from "../assess/validate-report.mjs";
import { prepared } from "./fixtures/run-package.mjs";

const made = [];
after(() => { for (const p of made) p.remove(); });

describe("US-141: findings labelled human or agent", () => {
  // @covers US-141-AC6
  test("AC6: each finding is labelled by origin, and an agent recommendation never carries source: human", () => {
    const p = prepared();
    made.push(p);
    p.checkpointAt("C-review-1");
    const agent = p.finding({ title: "Approving gives no confirmation", key: "agent" });
    const human = p.finding({ title: "Three of five people approved twice", key: "human", finding_type: "real-user", source: "human", evidence_refs: ["evidence/real-user/TK-1-findings.json"] });
    const team = p.finding({ title: "The team found the queue order confusing", key: "team", source: "design-team" });
    p.write("evidence/real-user/TK-1-findings.json", "{}");
    p.write("backlog.json", { schema: "backlog", version: 1, findings: [agent, human, team], user_validation: [] });
    assert.deepEqual(validateReport(p.dir).filter((x) => x.file === "backlog.json"), []);
    report(p.dir);
    const md = readFileSync(join(p.dir, "report.md"), "utf8");
    const line = (f) => md.split("\n")[md.split("\n").findIndex((l) => l.includes(`(${f.id})`)) + 2];
    assert.match(line(agent), /^\*\*agent recommendation\*\* · \*\*observed\*\*/);
    assert.match(line(human), /^\*\*human observation \(verified\)\*\* · \*\*real-user\*\*/);
    assert.match(line(team), /^\*\*design-team note \(not user evidence\)\*\*/);
    // The agent's own finding labelled human is refused, and so is a design-team note passed off as user evidence.
    const mislabelled = { ...agent, source: "human" };
    const passedOff = { ...team, finding_type: "real-user", evidence_refs: ["evidence/real-user/TK-1-findings.json"] };
    p.write("backlog.json", { schema: "backlog", version: 1, findings: [mislabelled, passedOff], user_validation: [] });
    const problems = validateReport(p.dir).map((x) => x.message);
    assert.ok(problems.some((m) => m.startsWith(`${agent.id} says source: human but is typed observed; an agent recommendation is never labelled a human observation`)), problems.join("\n"));
    assert.ok(problems.some((m) => m.includes("is a design-team note typed real-user; notes from people trying a prototype are never user evidence")));
  });
});
