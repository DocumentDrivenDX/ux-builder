/* Target users as evidence-backed records (US-146; FEAT-018 GDL-77;
   CONTRACT-008 Documents).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { cli } from "./helpers.mjs";
import { KIT_BP, kitApp } from "./kit-fixture.mjs";

const json = (a, args) => { const r = cli(a, [...args, "--json"]); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };
const HEAD = "---\nux:\n  id: users\n  type: users\n---\n\n# Target users\n\n## Users\n\n| ID | User | Context | Needs | Jobs | Evidence | Confidence | Status |\n|---|---|---|---|---|---|---|---|\n";
const ROWS = [
  "| U-1 | Weekend anglers new to an area | On a phone at the riverbank, one hand free | Large touch targets | J-1 high, J-2 medium | EV-1 | medium | confirmed |",
  "| U-2 | Fishing guides | Plan at a desk for clients | None known | J-1 low, J-2 high | none | low | hypothesis |",
];
const users = (a, rows = ROWS) => writeFileSync(join(a, "docs/ux-builder/users.md"), HEAD + rows.join("\n") + "\n");
/* The kit app, with an interview (EV-1), a users table and tasks naming their users. */
function usersApp({ taskUsers = [["U-1"], ["U-1", "U-2"]] } = {}) {
  const a = kitApp();
  mkdirSync(join(a, "docs/ux-builder/evidence"), { recursive: true });
  writeFileSync(join(a, "docs/ux-builder/evidence/EV-1.md"), "---\nux:\n  id: EV-1\n  type: research-evidence\n  kind: interview\n  date: 2026-10-12\n  source: \"shared drive\"\n  file: \"i.txt\"\n  participants: {}\n---\n\n# EV-1: interview\n\n## Source\n\n- kept elsewhere\n\n## Excerpts\n\n- None cited yet.\n\n## Synthesis notes\n\n- None yet.\n");
  users(a);
  const bp = structuredClone(KIT_BP);
  bp.tasks = bp.tasks.map((t, i) => ({ ...t, users: taskUsers[i] }));
  writeFileSync(join(a, "docs/ux-builder/blueprint/app.blueprint.json"), JSON.stringify(bp, null, 2));
  return a;
}
const problems = (a) => JSON.parse(cli(a, ["validate", "--json"]).stdout);

describe("US-146: describe target users with their context and evidence", () => {
  // @covers US-146-AC1
  test("AC1: validate checks each user's ID, context, needs, jobs with their importance, evidence, confidence and status", () => {
    const a = usersApp();
    assert.deepEqual(problems(a).problems, [], JSON.stringify(problems(a).problems));
    assert.ok(problems(a).notes.some((n) => n.message === "U-2 is a hypothesis: Fishing guides"));
    users(a, [
      "| U-1 | Weekend anglers | | | J-1 | EV-1 | high | confirmed |",
      "| U-1 | Guides | At a desk | None known | J-2 high | none | medium | confirmed |",
      "| U-3 | Clubs | Meet weekly | None known | J-1 low | EV-1 | low | hypothesis |",
      "| X | Bad | x | x | J-1 low | none | low | maybe |",
    ]);
    const msgs = problems(a).problems.filter((p) => p.path === "docs/ux-builder/users.md").map((p) => p.message);
    for (const m of [
      "U-1: say the user's context (where, on what, with what expertise)",
      'U-1: needs is empty; write "none known" when there are none',
      'U-1: "J-1" is not a job and its importance (J-<n> high, medium or low)',
      "U-1 is used by more than one user",
      "U-1: confidence medium needs at least one evidence source (EV-<n>)",
      "U-3: evidence lists a source, but status is hypothesis; a hypothesis has no evidence (mark it confirmed, or clear evidence)",
      'user row "X" needs an ID U-<n>',
    ]) assert.ok(msgs.includes(m), `${m}\n in ${msgs.join("\n")}`);
  });

  // @covers US-146-AC2
  test("AC2: a user holding a job jobs.md lacks, or citing missing evidence, exits 1 naming the user and the ID", () => {
    const a = usersApp();
    users(a, ["| U-1 | Weekend anglers | On a phone | None known | J-9 high | EV-7 | medium | confirmed |"]);
    const r = cli(a, ["validate"]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /docs\/ux-builder\/users\.md: U-1: holds J-9, which docs\/ux-builder\/jobs\.md does not have/);
    assert.match(r.stdout, /docs\/ux-builder\/users\.md: U-1: evidence EV-7 does not exist in docs\/ux-builder\/evidence\//);
  });

  // @covers US-146-AC3
  test("AC3: the brief's Target users come from users.md alone, each with its context and status", () => {
    const a = usersApp();
    json(a, ["state", "set", "assumptions[+]", JSON.stringify({ text: "Families on holiday", section: "users", status: "hypothesis" })]);
    json(a, ["brief"]);
    const brief = readFileSync(join(a, "docs/ux-builder/brief.md"), "utf8");
    const section = brief.slice(brief.indexOf("## Target users"), brief.indexOf("## Primary outcome"));
    assert.match(section, /^- Weekend anglers new to an area \(U-1\): On a phone at the riverbank, one hand free \[confirmed\]$/m);
    assert.match(section, /^- Fishing guides \(U-2\): Plan at a desk for clients \[hypothesis\]\n {2}Confirm by: research evidence about these users/m);
    assert.doesNotMatch(section, /Families on holiday/, "a separate user point is not repeated beside the records");
    assert.match(brief, / {4}- kind: informed_by\n {6}to: users\n/);
    assert.equal(cli(a, ["validate"]).status, 0, cli(a, ["validate"]).stdout);
    assert.match(cli(a, ["status"]).stdout, /^Target users: 1 confirmed, 1 hypothesis\.$/m);
  });

  // @covers US-146-AC4
  test("AC4: a task naming an unknown user exits 1; one serving a low-confidence user is warned about", () => {
    const a = usersApp({ taskUsers: [["U-1"], ["U-2", "U-9"]] });
    const v = problems(a);
    assert.ok(v.problems.some((p) => p.path === "docs/ux-builder/blueprint/app.blueprint.json" && p.message === "T-2 names U-9, which docs/ux-builder/users.md does not have"));
    assert.ok(v.warnings.some((p) => p.message === 'T-2 serves U-2 ("Fishing guides"), whose confidence is low'));
    assert.equal(cli(a, ["validate"]).status, 1);
  });

  // @covers US-146-AC5
  test("AC5: the screener asks about each target user and their context; scenarios say who each task is for; the sheet has a user column", () => {
    const a = usersApp();
    const kit = json(a, ["test-kit"]);
    const screener = readFileSync(join(a, kit.dir, "screener.md"), "utf8");
    assert.match(screener, /## U-1: Weekend anglers new to an area\n\n- Does this describe you: weekend anglers new to an area\? \(yes \/ no\)\n- Is this how you would use it: on a phone at the riverbank, one hand free\? \(yes \/ no\)/);
    assert.match(screener, /## U-2: Fishing guides/);
    assert.match(screener, /Note the one each participant matches in the observation sheet's user column/);
    const scenarios = readFileSync(join(a, kit.dir, "scenarios.md"), "utf8");
    assert.match(scenarios, /^\| Task \| Journey \| Goal given to the participant \| Success criteria \| For \|$/m);
    assert.match(scenarios, /^\| 1 \| J-find \| .* \| U-1 \|$/m);
    assert.match(scenarios, /^\| 2 \| J-saved \| .* \| U-1, U-2 \|$/m);
    assert.equal(readFileSync(join(a, kit.dir, "observations.csv"), "utf8").split("\n")[0], "participant,task,completed,seconds,errors,assists,remark,problem,user");
  });

  // @covers US-146-AC6
  test("AC6: the report breaks its measures down by user, and trace follows a user to its jobs, tasks and journeys", () => {
    const a = usersApp();
    json(a, ["test-kit"]);
    writeFileSync(join(a, "sheet.csv"), [
      "participant,task,completed,seconds,errors,assists,remark,problem,user",
      "P1,1,yes,60,0,0,,,U-1", "P2,1,no,200,2,1,lost,access unclear,U-1", "P3,1,yes,90,0,0,,,U-2", "P4,1,yes,80,0,0,,,",
    ].join("\n"));
    const imported = json(a, ["observe", "import", "sheet.csv", "--kit", "TK-1"]);
    assert.deepEqual(imported.findings.map((f) => f.user ?? null), ["U-1", "U-1", "U-2", null]);
    const report = readFileSync(join(a, json(a, ["report"]).path), "utf8");
    assert.match(report, /By target user:\n\n\| User \| Attempts \| Completed \| Median time \| With errors \| Assists \|\n\|---\|---\|---\|---\|---\|---\|\n\| U-1 Weekend anglers new to an area \| 2 \(2 sessions\) \| 50% \| 130 s \| 50% \| 1 \|\n\| U-2 Fishing guides \| 1 \(1 sessions\) \| 100% \| 90 s \| 0% \| 0 \|\n\| not recorded \| 1 \(1 sessions\) \| 100% \| 80 s \| 0% \| 0 \|/);
    const t = json(a, ["trace", "U-2"]);
    assert.equal(t.item.kind, "user");
    const down = t.downstream.map((x) => x.id);
    for (const x of ["J-1", "J-2", "T-2", "J-saved"]) assert.ok(down.includes(x), `${x} in ${down.join(", ")}`);
  });
});
