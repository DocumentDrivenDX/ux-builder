/* What the other tools call (FEAT-016 TRC-03, TRC-05): findApp,
   recordCheck, recordDecision and `decide`, `lint`, and the warning when
   screens changed with no decision (US-107-AC4).

     npm test --workspace @ux-builder/trace */

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { closeEpisode, countFindings, currentEpisode, findApp, listEpisodes, openEpisode, readEpisode, recordCheck, recordDecision, statusOf, validateTrace } from "../index.mjs";
import { cli, commit, tempApp } from "./helpers.mjs";

describe("US-107-AC4: trace end warns when screens changed with no decision", () => {
  // @covers US-107-AC4
  test("AC4: an episode whose change touched screens but holds no decision warns that no decisions were recorded", () => {
    const app = tempApp();
    const id = cli(app, ["start", "--goal", "Review screen", "--screen", "review"]).stdout.split("\n")[0];
    commit(app, "review.jsx", `Review screen\n\nUX-Episode: ${id}`);
    const r = cli(app, ["end"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /^warning: no decisions were recorded, though the episode changed screen review: record each pattern choice, departure and workaround with record_decision \(or ux-builder-trace decide\)$/m);
    const change = readEpisode(app, id).find((e) => e.kind === "change");
    assert.deepEqual(change.screens, ["review"]);

    // With a decision, or with no screen, there is no such warning.
    const id2 = openEpisode(app, { goal: { text: "Queue screen", screens: ["queue"] } });
    recordDecision(app, { chose: "WorkQueue", why: "a queue fits triage", screen: "queue" });
    assert.ok(!closeEpisode(app).warnings.some((w) => /no decisions/.test(w)), id2);
    openEpisode(app, { goal: { text: "Copy fix" } });
    assert.ok(!closeEpisode(app).warnings.some((w) => /no decisions/.test(w)));
    assert.deepEqual(validateTrace(app), []);
  });
});

describe("recordDecision and decide", () => {
  test("chose and why are required: the error names the field and nothing is written", () => {
    const app = tempApp();
    const id = openEpisode(app, { goal: { text: "Review screen" } });
    for (const [args, field] of [[["--why", "it fits"], "chose"], [["--chose", "WorkQueue"], "why"]]) {
      const r = cli(app, ["decide", ...args]);
      assert.equal(r.status, 2);
      assert.match(r.stderr, new RegExp(`needs "${field}"`));
    }
    assert.throws(() => recordDecision(app, { chose: "x", why: " " }), (e) => e.code === "MISSING" && e.field === "why");
    assert.equal(readEpisode(app, id).length, 1, "only start");
    const ok = cli(app, ["decide", "--chose", "WorkQueue", "--considered", "CollectionList", "--why", "a queue fits review", "--relied", "US-003", "--screen", "review", "--workaround"]);
    assert.equal(ok.status, 0, ok.stderr);
    const d = readEpisode(app, id).at(-1);
    assert.deepEqual({ ...d, at: null }, { v: 1, episode: id, seq: 2, at: null, kind: "decision", by: "agent", chose: "WorkQueue", considered: ["CollectionList"], why: "a queue fits review", relied: ["US-003"], departs: false, workaround: true, screen: "review" });
  });
});

describe("findApp, countFindings, recordCheck", () => {
  test("findApp: the nearest folder at or above with .ux-builder/, else null", () => {
    const app = tempApp({ repo: false });
    mkdirSync(join(app, "src/screens"), { recursive: true });
    assert.equal(findApp(join(app, "src/screens")), null);
    mkdirSync(join(app, ".ux-builder"));
    assert.equal(findApp(join(app, "src/screens")), app);
  });

  test("countFindings groups by rule and severity; statusOf follows the worst; recordCheck counts the attempt", () => {
    const f = countFindings([{ rule: "b.x", severity: "warning" }, { rule: "a.y", severity: "error" }, { rule: "b.x", severity: "warning" }, { ruleId: "a.y", severity: "warning" }]);
    assert.deepEqual(f, [{ ruleId: "a.y", severity: "error", count: 1 }, { ruleId: "a.y", severity: "warning", count: 1 }, { ruleId: "b.x", severity: "warning", count: 2 }]);
    assert.deepEqual([statusOf(f), statusOf(f.slice(1)), statusOf([])], ["fail", "warn", "pass"]);
    const app = tempApp();
    openEpisode(app, { goal: { text: "Checks" } });
    assert.equal(recordCheck(app, "blueprint", { findings: f }).attempt, 1);
    const second = recordCheck(app, "blueprint", { findings: [] });
    assert.deepEqual([second.attempt, second.status], [2, "pass"]);
    assert.equal(recordCheck(app, "nope", {}), null, "an unknown check is not written, and does not throw");
    assert.ok(currentEpisode(app));
  });
});

describe("ux-builder-trace lint", () => {
  test("runs Stylelint and ESLint with the app's config, prints their reports, and records one lint check per run", () => {
    const app = tempApp({ pkg: { name: "lint-app", private: true, type: "module" } });
    mkdirSync(join(app, "src"));
    writeFileSync(join(app, "eslint.config.js"), 'export default [{ files: ["src/**/*.js"], rules: { "no-var": "error", "prefer-const": "warn" } }];\n');
    writeFileSync(join(app, ".stylelintrc.json"), JSON.stringify({ rules: { "color-no-hex": true } }));
    writeFileSync(join(app, "src/app.css"), ".a { color: #fff; }\n");
    writeFileSync(join(app, "src/app.js"), "var a = 1;\nexport { a };\n");
    const args = ["lint", "--stylelint", "src/**/*.css", "--eslint", "src"];
    const first = cli(app, args);
    assert.equal(first.status, 1, first.stderr);
    assert.match(first.stdout, /color-no-hex/);
    assert.match(first.stdout, /no-var/);
    writeFileSync(join(app, "src/app.css"), ".a { color: var(--piq-color-text); }\n");
    writeFileSync(join(app, "src/app.js"), "let a = 1;\nexport { a };\n");
    const second = cli(app, args);
    assert.equal(second.status, 0, second.stderr);
    writeFileSync(join(app, "src/app.js"), "const a = 1;\nexport { a };\n");
    assert.equal(cli(app, args).status, 0);
    // No episode is open, so the runs go to this branch's unscoped episode.
    const [unscoped] = listEpisodes(app);
    assert.match(unscoped.id, /^E-\d{8}-unscoped-main$/);
    const ep = readEpisode(app, unscoped.id);
    const checks = ep.filter((e) => e.kind === "check");
    assert.deepEqual(checks.map((c) => [c.check, c.attempt, c.status]), [["lint", 1, "fail"], ["lint", 2, "warn"], ["lint", 3, "pass"]]);
    assert.deepEqual(checks[0].findings, [{ ruleId: "color-no-hex", severity: "error", count: 1 }, { ruleId: "no-var", severity: "error", count: 1 }]);
    assert.deepEqual(checks[1].findings, [{ ruleId: "prefer-const", severity: "warning", count: 1 }]);
    assert.deepEqual(validateTrace(app), []);
    assert.equal(cli(app, ["lint"]).status, 2, "needs a linter to run");
  });
});
