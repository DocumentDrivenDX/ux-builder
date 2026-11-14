/* Target users as evidence-backed records (US-146; FEAT-018 GDL-77;
   CONTRACT-008 Documents).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { cli } from "./helpers.mjs";
import { currentText, sectionOf } from "../index.mjs";
import { KIT_BP, kitApp } from "./kit-fixture.mjs";

const json = (a, args) => { const r = cli(a, [...args, "--json"]); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };
const PRD = "docs/helix/01-frame/prd.md";
const SEGMENTS = [
  "| Weekend anglers new to an area | On a phone at the riverbank, one hand free | Find a river, Go back to a river | anglers | medium | validated |",
  "| Fishing guides | Plan at a desk for clients | Find a river, Go back to a river | none | low | assumed |",
];
const NEEDS = ["| Find a river | high | none | low | assumed |", "| Go back to a river | medium | none | low | assumed |"];
/* The PRD with these User Segments and the fixture's User Needs, applied. */
const users = (a, rows = SEGMENTS, needs = NEEDS) => writeFileSync(join(a, PRD), `---\nddx:\n  id: prd\n  type: prd\n---\n\n# Product Requirements Document — Rivers\n\n## Users and Scope\n\n### User Segments\n\n| User | Context | Needs | Evidence | Confidence | Status |\n|---|---|---|---|---|---|\n${rows.join("\n")}\n\n### User Needs\n\n| Need | Importance | Evidence | Confidence | Status |\n|---|---|---|---|---|\n${needs.join("\n")}\n`);
/* The kit app, with an interview (the anglers study), the PRD's users and tasks naming their users. */
function usersApp({ taskUsers = [["Weekend anglers new to an area"], ["Weekend anglers new to an area", "Fishing guides"]] } = {}) {
  const a = kitApp();
  mkdirSync(join(a, "docs/helix/01-frame/research"), { recursive: true });
  writeFileSync(join(a, "docs/helix/01-frame/research/anglers.md"), "---\nddx:\n  id: research-anglers\n  type: research-plan\n---\n\n# Research plan: anglers\n");
  users(a);
  const bp = structuredClone(KIT_BP);
  bp.tasks = bp.tasks.map((t, i) => ({ ...t, users: taskUsers[i] }));
  writeFileSync(join(a, "docs/ux-builder/blueprint/app.blueprint.json"), JSON.stringify(bp, null, 2));
  return a;
}
const problems = (a) => JSON.parse(cli(a, ["validate", "--json"]).stdout);

describe("US-146: describe target users with their context and evidence", () => {
  // @covers US-146-AC1
  test("AC1: segment add proposes a row of the PRD's User Segments with the user, context, needs by name, evidence, confidence and status; validate checks each row", () => {
    const a = kitApp();
    const r = json(a, ["segment", "add", "--user", "Weekend anglers new to an area", "--context", "On a phone at the riverbank", "--need", "Find a river", "--need", "go back to a river"]);
    assert.deepEqual({ user: r.user, key: r.key, path: r.path, status: r.status }, { user: "Weekend anglers new to an area", key: "weekend-anglers-new-to-an-area", path: PRD, status: "assumed" });
    assert.match(sectionOf(currentText(a, PRD).text, "User Segments", 3), /^\| Weekend anglers new to an area \| On a phone at the riverbank \| Find a river, Go back to a river \| none \| low \| assumed \|$/m);
    assert.match(cli(a, ["segment", "add", "--user", "Guides"]).stderr, /--context: where, on what, with what expertise/);
    assert.match(cli(a, ["segment", "add", "--user", "Guides", "--context", "At a desk", "--need", "Rate rivers"]).stderr, /no need "Rate rivers" in the PRD's User Needs: add it with need add first/);
    // Rows written by hand are checked too.
    users(a, ["| Weekend anglers | | Find a river | anglers | high | validated |", "| Clubs | Meet weekly | Find a river | none | medium | maybe |"]);
    const msgs = problems(a).problems.filter((p) => p.path === PRD).map((p) => p.message);
    for (const m of ['user "Weekend anglers": say the user\'s context (where, on what, with what expertise)', 'user "Clubs": confidence medium needs at least one evidence source (a study)', 'user "Clubs": status is "maybe"; use assumed, validated or invalidated']) assert.ok(msgs.includes(m), `${m}\n${msgs.join("\n")}`);
  });

  // @covers US-146-AC2
  test("AC2: a user holding a need the PRD lacks, or citing a study that does not exist, exits 1 naming the user and the need or study", () => {
    const a = usersApp();
    users(a, ["| Weekend anglers new to an area | On a phone | Rate rivers | nope | medium | validated |"]);
    const r = cli(a, ["validate"]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /prd\.md: user "Weekend anglers new to an area": holds the need "Rate rivers", which User Needs does not have/);
    assert.match(r.stdout, /prd\.md: user "Weekend anglers new to an area": evidence nope is not a study/);
  });

  // @covers US-146-AC3
  test("AC3: the brief's Target users come from the PRD's User Segments alone, each with its context and status", () => {
    const a = usersApp();
    json(a, ["state", "set", "assumptions[+]", JSON.stringify({ text: "Families on holiday", section: "users", status: "hypothesis" })]);
    json(a, ["brief"]);
    const brief = readFileSync(join(a, "docs/ux-builder/brief.md"), "utf8");
    const section = brief.slice(brief.indexOf("## Target users"), brief.indexOf("## Primary outcome"));
    assert.match(section, /^- Weekend anglers new to an area: On a phone at the riverbank, one hand free \[confirmed\]$/m);
    assert.match(section, /^- Fishing guides: Plan at a desk for clients \[hypothesis\]\n {2}Confirm by: research about these users/m);
    assert.doesNotMatch(section, /Families on holiday/, "a separate user point is not repeated beside the PRD's");
    assert.equal(cli(a, ["validate"]).status, 0, cli(a, ["validate"]).stdout);
    assert.match(cli(a, ["status"]).stdout, /^Target users: 1 confirmed, 1 hypothesis\.$/m);
  });

  // @covers US-146-AC4
  test("AC4: a task naming an unknown user exits 1; one serving a low-confidence user is warned about", () => {
    const a = usersApp({ taskUsers: [["Weekend anglers new to an area"], ["Fishing guides", "Clubs"]] });
    const v = problems(a);
    assert.ok(v.problems.some((p) => p.path === "docs/ux-builder/blueprint/app.blueprint.json" && p.message === "T-2 names the user Clubs, which the PRD's User Segments does not have"), JSON.stringify(v.problems));
    assert.ok(v.warnings.some((p) => p.message === 'T-2 serves "Fishing guides", whose confidence is low'));
    assert.equal(cli(a, ["validate"]).status, 1);
  });

  // @covers US-146-AC5
  test("AC5: the screener asks about each target user and their context; scenarios say who each task is for; the sheet has a user column", () => {
    const a = usersApp();
    const kit = json(a, ["test-kit", "--study", "rivers"]);
    const screener = sectionOf(currentText(a, kit.path).text, "Screener", 3);
    assert.match(screener, /- Does this describe you: weekend anglers new to an area\? \(yes \/ no\)\n- Is this how you would use it: on a phone at the riverbank, one hand free\? \(yes \/ no\)/);
    assert.match(screener, /- Does this describe you: fishing guides\? \(yes \/ no\)/);
    assert.match(screener, /note the user they match in the observation sheet's user column/);
    // Who each task is for travels with the session's task list.
    const tasks = JSON.parse(readFileSync(join(a, kit.run, "tasks.json"), "utf8")).tasks;
    assert.deepEqual(tasks.map((t) => [t.journey, t.users]), [["J-find", ["Weekend anglers new to an area"]], ["J-saved", ["Weekend anglers new to an area", "Fishing guides"]]]);
    assert.equal(readFileSync(join(a, kit.run, "observations.csv"), "utf8").split("\n")[0], "participant,task,completed,seconds,errors,assists,remark,problem,user");
  });

  // @covers US-146-AC6
  test("AC6: the report breaks its measures down by user, and trace follows a user to its jobs, tasks and journeys", () => {
    const a = usersApp();
    json(a, ["test-kit", "--study", "rivers"]);
    writeFileSync(join(a, "sheet.csv"), [
      "participant,task,completed,seconds,errors,assists,remark,problem,user",
      "P1,1,yes,60,0,0,,,Weekend anglers new to an area", "P2,1,no,200,2,1,lost,access unclear,Weekend anglers new to an area", "P3,1,yes,90,0,0,,,Fishing guides", "P4,1,yes,80,0,0,,,",
    ].join("\n"));
    const imported = json(a, ["observe", "import", "sheet.csv", "--study", "rivers"]);
    assert.deepEqual(imported.findings.map((f) => f.user ?? null), ["Weekend anglers new to an area", "Weekend anglers new to an area", "Fishing guides", null]);
    const report = readFileSync(join(a, json(a, ["report"]).path), "utf8");
    assert.match(report, /By target user:\n\n\| User \| Attempts \| Completed \| Median time \| With errors \| Assists \|\n\|---\|---\|---\|---\|---\|---\|\n\| Fishing guides \| 1 \(1 sessions\) \| 100% \| 90 s \| 0% \| 0 \|\n\| Weekend anglers new to an area \| 2 \(2 sessions\) \| 50% \| 130 s \| 50% \| 1 \|\n\| not recorded \| 1 \(1 sessions\) \| 100% \| 80 s \| 0% \| 0 \|/);
    const t = json(a, ["trace", "fishing-guides"]);
    assert.equal(t.item.kind, "user");
    const down = t.downstream.map((x) => x.id);
    for (const x of ["find-a-river", "go-back-to-a-river", "T-2", "J-saved"]) assert.ok(down.includes(x), `${x} in ${down.join(", ")}`);
  });
});
