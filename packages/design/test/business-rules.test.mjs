/* Business rules in the task model (US-147; FEAT-018 GDL-78;
   CONTRACT-008 Documents).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { cli } from "./helpers.mjs";
import { KIT_BP, kitApp } from "./kit-fixture.mjs";

const json = (a, args) => { const r = cli(a, [...args, "--json"]); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };
const put = (a, p, text) => { mkdirSync(join(a, p, ".."), { recursive: true }); writeFileSync(join(a, p), text); };
const SD = "---\nddx:\n  id: SD-001\n  type: solution-design\n---\n\n# SD-001: Rivers\n\n### Business Rules\n\n- **BR-1** — Only stretches with public access can be saved.\n- **BR-2** — A saved list holds at most 50 rivers.\n";
const DESIGNED = { id: "BR-1", trigger: "The one you like best has no public access", before: "The list marks private stretches", blocked: "Save is replaced by: Private, no public access", recover: "Nearby public stretches are offered" };
/* The kit app, whose solution design defines two rules; T-1 cites BR-1 and J-find's save step cites it too. */
function rulesApp({ designed = [DESIGNED], cite = ["BR-1"] } = {}) {
  const a = kitApp();
  put(a, "docs/helix/02-design/solution-designs/SD-001-rivers.md", SD);
  const bp = structuredClone(KIT_BP);
  bp.tasks[0].rules = cite;
  bp.journeys[0].steps[1].rules = ["BR-1"];
  bp.businessRules = designed;
  writeFileSync(join(a, "app.blueprint.json"), JSON.stringify(bp, null, 2));
  return a;
}
const messages = (a) => { const v = JSON.parse(cli(a, ["validate", "--json"]).stdout); return v.problems.map((p) => p.message); };

describe("US-147: design how users meet each business rule", () => {
  // @covers US-147-AC1
  test("AC1: a task or step citing a rule HELIX does not define fails validate, naming the item and the rule", () => {
    const a = rulesApp();
    assert.deepEqual(messages(a), []);
    const b = rulesApp({ cite: ["BR-1", "BR-9"] });
    assert.ok(messages(b).includes("T-1 cites BR-9, which no HELIX document defines (**BR-9** — <rule>)"), messages(b).join("\n"));
    const bp = JSON.parse(readFileSync(join(b, "app.blueprint.json"), "utf8"));
    bp.journeys[1].steps[0].rules = ["BR-8"];
    writeFileSync(join(b, "app.blueprint.json"), JSON.stringify(bp));
    assert.ok(messages(b).includes("J-saved step 1 cites BR-8, which no HELIX document defines (**BR-8** — <rule>)"));
    assert.equal(cli(b, ["validate"]).status, 1);
    // A rule defined twice is warned about.
    put(a, "docs/helix/01-frame/prd.md", "---\nddx:\n  id: prd\n  type: prd\n---\n\n# PRD\n\n- **BR-1** — Only public stretches.\n");
    assert.ok(JSON.parse(cli(a, ["validate", "--json"]).stdout).warnings.some((w) => w.message === "BR-1 is defined in more than one HELIX document"));
  });

  // @covers US-147-AC2
  test("AC2: a cited rule with no or partial businessRules entry fails, naming the rule and each missing answer", () => {
    const none = rulesApp({ designed: [] });
    assert.ok(messages(none).includes("BR-1: how the user meets it is not designed; businessRules needs trigger (the situation that triggers it), before (how the user learns of it before acting), blocked (what they see when it blocks them), recover (how they recover)"), messages(none).join("\n"));
    const part = rulesApp({ designed: [{ id: "BR-1", trigger: "No public access", blocked: "Save is disabled" }] });
    assert.ok(messages(part).includes("BR-1: how the user meets it is not designed; businessRules needs before (how the user learns of it before acting), recover (how they recover)"));
    assert.equal(cli(part, ["validate"]).status, 1);
  });

  // @covers US-147-AC3
  test("AC3: the kit has a task per cited rule, in its trigger situation, with the rule as its success criterion", () => {
    const a = rulesApp();
    const kit = json(a, ["test-kit"]);
    const rule = kit.tasks.find((t) => t.rule === "BR-1");
    assert.equal(rule.n, 3);
    assert.equal(rule.journey, "J-find");
    assert.equal(rule.goal, "find a river to fish this weekend, and the one you like best has no public access");
    assert.deepEqual(rule.criteria, [{ id: "BR-1", text: "Only stretches with public access can be saved." }]);
    assert.equal(kit.tasks.filter((t) => t.rule).length, 1, "one task per rule, though a task and a step both cite it");
    const scenarios = readFileSync(join(a, kit.dir, "scenarios.md"), "utf8");
    assert.match(scenarios, /^\| 3 \| J-find \| You want to find a river to fish this weekend, and the one you like best has no public access\. Show me how you would do that\. \| BR-1 \|$/m);
    assert.doesNotMatch(scenarios.split("\n").find((l) => l.startsWith("| 3 |")), /Save|Private|River details/);
  });

  // @covers US-147-AC4
  test("AC4: the report lists each cited rule with its kit tasks' results, and an untested rule under Not tested", () => {
    const a = rulesApp({ designed: [DESIGNED, { ...DESIGNED, id: "BR-2", trigger: "Your saved list is full" }], cite: ["BR-1", "BR-2"] });
    json(a, ["test-kit", "--journey", "J-find"]);
    const scen = readFileSync(join(a, "docs/ux/tests/TK-1/scenarios.md"), "utf8");
    const br1 = Number(scen.match(/^\| (\d+) \| J-find \| [^|]* \| BR-1 \|$/m)[1]);
    writeFileSync(join(a, "sheet.csv"), ["participant,task,completed,seconds,errors,assists,remark,problem", `P1,${br1},no,90,1,1,Thought saving was broken,save looked broken`, `P2,${br1},yes,40,0,0,,`].join("\n"));
    json(a, ["observe", "import", "sheet.csv", "--kit", "TK-1"]);
    const report = readFileSync(join(a, json(a, ["report"]).path), "utf8");
    assert.match(report, new RegExp(`## Business rules\\n\\n\\| Rule \\| Kit tasks \\| Completed \\| Problems seen \\|\\n\\|---\\|---\\|---\\|---\\|\\n\\| BR-1: Only stretches with public access can be saved\\. \\| TK-1 task ${br1} \\| 1 of 2 \\| save looked broken \\|\\n\\| BR-2: A saved list holds at most 50 rivers\\. \\| TK-1 task \\d+ \\| not tested \\| none \\|`));
    assert.match(report, /## Not tested[\s\S]*- BR-2: no one met this business rule in a test/);
  });

  // @covers US-147-AC5
  test("AC5: trace follows a rule to its HELIX document, tasks, journeys and screens; impact of a change naming it reaches them", () => {
    const a = rulesApp();
    const t = json(a, ["trace", "BR-1"]);
    assert.equal(t.item.kind, "rule");
    assert.equal(t.item.file, "docs/helix/02-design/solution-designs/SD-001-rivers.md");
    const down = t.downstream.map((x) => x.id);
    for (const x of ["T-1", "J-find", "screen:detail"]) assert.ok(down.includes(x), `${x} in ${down.join(", ")}`);
    const r = json(a, ["impact", "Let anglers save stretches without public access"]);
    const reached = r.affected.map((x) => x.id);
    for (const x of ["BR-1", "T-1", "J-find"]) assert.ok(reached.includes(x), `${x} in ${reached.join(", ")}`);
  });
});
