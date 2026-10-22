/* Episodes (US-105, CONTRACT-007): opening, the unscoped episode, commit
   trailers, closing, and a trace that never breaks a build.

     npm test --workspace @ux-builder/trace */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { appendEvent, attemptOf, closeEpisode, currentEpisode, GITIGNORE_LINES, openEpisode, readEpisode, validateTrace } from "../index.mjs";
import { cli, commit, git, lines, PKG, tempApp, today } from "./helpers.mjs";

describe("opening an episode", () => {
  // @covers US-105-AC2
  test("trace start --goal --story --screen opens an episode with that goal, and current names it", () => {
    const app = tempApp();
    const r = cli(app, ["start", "--goal", "Review screen", "--story", "US-003", "--screen", "review", "--agent", "claude-code", "--model", "claude-opus-5-5"]);
    assert.equal(r.status, 0, r.stderr);
    const id = `E-${today()}-review-screen`;
    assert.equal(r.stdout.split("\n")[0], id);
    assert.equal(readFileSync(join(app, ".ux-builder/trace/current"), "utf8").trim(), id);
    assert.equal(currentEpisode(app), id);
    const [start] = lines(join(app, ".ux-builder/trace", `${id}.jsonl`));
    assert.equal(start.kind, "start");
    assert.equal(start.seq, 1);
    assert.equal(start.trigger, "change");
    assert.deepEqual(start.goal, { stories: ["US-003"], screens: ["review"], journeys: [], text: "Review screen" });
    assert.deepEqual(start.agent, { name: "claude-code", model: "claude-opus-5-5" });
    assert.equal(start.sdk["@ux-builder/trace"], JSON.parse(readFileSync(join(PKG, "package.json"), "utf8")).version);
    assert.equal(start.helix, null);
    assert.equal(start.commit, git(app, "rev-parse", "HEAD"));
    assert.deepEqual(validateTrace(app), []);
  });

  // @covers US-105-AC2
  test("openEpisode, the call MCP start_episode makes, opens the same episode; IDs stay unique", () => {
    const app = tempApp();
    const id = openEpisode(app, { goal: { text: "Review screen", stories: ["US-003"], screens: ["review"] }, agent: { name: "claude-code", model: "m" } });
    assert.equal(id, `E-${today()}-review-screen`);
    assert.equal(currentEpisode(app), id);
    closeEpisode(app);
    assert.equal(currentEpisode(app), null);
    assert.equal(existsSync(join(app, ".ux-builder/trace/current")), false);
    assert.equal(openEpisode(app, { goal: { text: "Review screen" } }), `${id}-2`);
  });

  // @covers US-105-AC3
  test("start while an episode is open exits 1, naming the open episode", () => {
    const app = tempApp();
    const id = cli(app, ["start", "--goal", "Checkout flow"]).stdout.split("\n")[0];
    const again = cli(app, ["start", "--goal", "Something else"]);
    assert.equal(again.status, 1);
    assert.match(again.stderr, new RegExp(`${id} is open; end it first`));
    assert.equal(currentEpisode(app), id);
    assert.throws(() => openEpisode(app, { goal: { text: "x" } }), (e) => e.code === "EPISODE_OPEN" && e.episode === id);
  });

  test("the only file meant to be ignored is current", () => {
    assert.deepEqual(GITIGNORE_LINES, [".ux-builder/trace/current"]);
  });
});

describe("closing an episode", () => {
  // @covers US-105-AC4
  test("trace end lists the commits carrying UX-Episode: <id> and warns about those without", () => {
    const app = tempApp();
    const id = cli(app, ["start", "--goal", "Review screen", "--screen", "review"]).stdout.split("\n")[0];
    const a = commit(app, "a.txt", `Add the review list\n\nUX-Episode: ${id}`);
    const b = commit(app, "b.txt", "Fix a typo");
    commit(app, "c.txt", "Another episode's work\n\nUX-Episode: E-20261001-other");
    const d = commit(app, "d.txt", `Review empty state\n\nCo-Authored-By: X <x@example.com>\nUX-Episode: ${id}`);
    appendEvent(app, "decision", { chose: "list-detail", considered: ["table"], why: "two panes fit", relied: ["US-003"], departs: false, workaround: false, screen: "review-detail" });
    const r = cli(app, ["end"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, new RegExp(`commit ${b.slice(0, 7)} \\("Fix a typo"\\) has no "UX-Episode: ${id}" trailer`));
    assert.doesNotMatch(r.stderr, new RegExp(a.slice(0, 7)));
    const ev = readEpisode(app, id);
    assert.deepEqual(ev.slice(-3).map((e) => e.kind), ["change", "outcome", "end"]);
    const change = ev.find((e) => e.kind === "change");
    assert.deepEqual(change.commits, [a, d]);
    assert.deepEqual(change.untrailered, [b]);
    assert.equal(change.files, 4);
    assert.deepEqual(change.screens, ["review", "review-detail"]);
    assert.equal(ev.at(-1).status, "done");
    assert.equal(currentEpisode(app), null);
    assert.deepEqual(validateTrace(app), []);
  });

  test("outcome: the last audit's verdicts and findings per rule, and the runs each check took to pass", () => {
    const app = tempApp();
    const id = openEpisode(app, { goal: { text: "Outcome" } });
    const check = (c, status, findings = [], extra = {}) => appendEvent(app, "check", { check: c, attempt: attemptOf(app, c), status, findings, ...extra }, { by: "test@0" });
    check("lint", "fail", [{ ruleId: "ux-builder/no-hex", severity: "error", count: 2 }]);
    check("lint", "fail", [{ ruleId: "ux-builder/no-hex", severity: "error", count: 1 }]);
    check("lint", "pass");
    check("blueprint", "warn", [{ ruleId: "flow.back", severity: "warn", count: 1 }]);
    check("card", "fail", [{ ruleId: "card.high-impact", severity: "error", count: 1 }]);
    check("audit", "fail", [{ ruleId: "theme.colour", severity: "serious", count: 3 }], { report: "audit-report/report.json" });
    const verdicts = { theme: "fail", modality: [{ modality: "responsive-web", status: "fail" }, { modality: "desktop", status: "pass" }] };
    const compare = [{ rule: "theme.colour", finding: "F-0001", status: "persistent" }, { rule: null, finding: "F-0002", status: "resolved" }, { rule: "a11y.contrast", finding: "F-0003", status: "regressed" }];
    check("audit", "fail", [{ ruleId: "theme.colour", severity: "serious", count: 1 }, { ruleId: "a11y.contrast", severity: "serious", count: 2 }, { ruleId: "theme.colour", severity: "minor", count: 1 }], { report: "audit-report/report.json", verdicts, assessment: { run: "R-20261022-1", compare } });
    assert.equal(attemptOf(app, "lint"), 4);
    const r = closeEpisode(app, { status: "abandoned" });
    assert.equal(r.episode, id);
    assert.equal(r.status, "abandoned");
    assert.deepEqual(r.outcome.checksToGreen, { lint: 2, blueprint: 0, card: null, audit: null });
    assert.deepEqual(r.outcome.audit, { verdicts, findings: { "theme.colour": 2, "a11y.contrast": 2 } });
    assert.deepEqual(r.outcome.assessment, { run: "R-20261022-1", compare });
    assert.deepEqual(validateTrace(app), []);
  });

  test("with no audit and no assessment, outcome.audit is { verdicts: null, findings: {} } and assessment null", () => {
    const app = tempApp();
    openEpisode(app, { goal: { text: "No audit" } });
    const r = closeEpisode(app);
    assert.deepEqual(r.outcome, { audit: { verdicts: null, findings: {} }, assessment: null, checksToGreen: {} });
  });

  // @covers US-105-AC4
  test("an episode opened before the first commit (start.commit null): change carries parent, from its first trailer commit", () => {
    const app = tempApp({ repo: false });
    git(app, "init", "-q", "-b", "main");
    const id = openEpisode(app, { trigger: "create", goal: { text: "Create" } });
    assert.equal(readEpisode(app, id)[0].commit, null);
    const first = commit(app, "package.json", `Create the app\n\nUX-Episode: ${id}`);
    const r = closeEpisode(app);
    assert.deepEqual(r.change.commits, [first]);
    assert.equal(r.change.parent, null, "the first trailer commit is the root commit");
    assert.equal(r.change.files, 1);
    const app2 = tempApp({ repo: false });
    git(app2, "init", "-q", "-b", "main");
    const id2 = openEpisode(app2, { goal: { text: "Later" } });
    const root = commit(app2, "a.txt", "Scaffold");
    const mine = commit(app2, "b.txt", `Build\n\nUX-Episode: ${id2}`);
    const r2 = closeEpisode(app2);
    assert.deepEqual(r2.change.commits, [mine]);
    assert.equal(r2.change.parent, root);
    assert.equal(r2.change.files, 1, "measured from the parent");
    assert.deepEqual(validateTrace(app2), []);
  });
});

describe("the unscoped episode", () => {
  // @covers US-105-AC5
  test("with no open episode an event goes to E-<date>-unscoped-<branch>, which ends as unscoped", () => {
    const app = tempApp();
    const e = appendEvent(app, "check", { check: "lint", attempt: attemptOf(app, "lint"), status: "fail", findings: [{ ruleId: "ux-builder/no-hex", severity: "error", count: 1 }] }, { by: "@ux-builder/ui@0.9.0" });
    const id = `E-${today()}-unscoped-main`;
    assert.equal(e.episode, id);
    assert.equal(e.seq, 2);
    assert.equal(e.by, "@ux-builder/ui@0.9.0");
    assert.equal(attemptOf(app, "lint"), 2);
    const ev = readEpisode(app, id);
    assert.equal(ev[0].kind, "start");
    assert.equal(ev[0].unscoped, true);
    assert.match(ev[0].goal.text, /no episode open/);
    assert.equal(currentEpisode(app), null);
    const r = cli(app, ["end", "--status", "done"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, new RegExp(`Ended ${id} \\(unscoped\\)`));
    assert.equal(readEpisode(app, id).at(-1).status, "unscoped");
    assert.deepEqual(validateTrace(app), []);
  });

  // @covers US-105-AC5
  test("a branch has its own unscoped episode, and starting an episode ends it as unscoped", () => {
    const app = tempApp();
    const { git } = { git: (...a) => spawnSync("git", a, { cwd: app }) };
    git("checkout", "-q", "-b", "feature/Review-2");
    assert.equal(appendEvent(app, "guidance", { tool: "get_rules", input: { context: "view" }, answer: { ruleIds: ["flow.back"], components: [], recipes: [], guidanceHash: null, bytes: 10 } }).episode, `E-${today()}-unscoped-feature-review-2`);
    const id = openEpisode(app, { goal: { text: "Scoped now" } });
    assert.equal(readEpisode(app, `E-${today()}-unscoped-feature-review-2`).at(-1).status, "unscoped");
    assert.equal(appendEvent(app, "guidance", { tool: "get_rules", input: {}, answer: { ruleIds: [], components: [], recipes: [], guidanceHash: null, bytes: 0 } }).episode, id);
    closeEpisode(app);
    assert.equal(appendEvent(app, "decision", { chose: "a", why: "b" }).episode, `E-${today()}-unscoped-feature-review-2-2`);
  });
});

describe("a trace never breaks a build", () => {
  // @covers US-105-AC6
  test("with .ux-builder/ read-only, writing an event succeeds for the tool and warns once on stderr", { skip: process.getuid?.() === 0 && "root ignores file modes" }, () => {
    const app = tempApp();
    openEpisode(app, { goal: { text: "Read only" } });
    for (const d of [".ux-builder/trace", ".ux-builder"]) chmodSync(join(app, d), 0o555);
    for (const f of [".ux-builder/trace/current"]) chmodSync(join(app, f), 0o444);
    const id = currentEpisode(app);
    chmodSync(join(app, ".ux-builder/trace", `${id}.jsonl`), 0o444);
    try {
      const script = `
        import { appendEvent } from ${JSON.stringify(new URL("../index.mjs", import.meta.url).href)};
        const a = appendEvent(process.argv[1], "check", { check: "lint", attempt: 1, status: "pass", findings: [] });
        const b = appendEvent(process.argv[1], "decision", { chose: "x", why: "y" });
        const c = appendEvent(process.argv[1], "no-such-kind", {});
        console.log(JSON.stringify([a, b, c]));`;
      const r = spawnSync(process.execPath, ["--input-type=module", "-e", script, app], { encoding: "utf8" });
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(JSON.parse(r.stdout), [null, null, null]);
      const warnings = r.stderr.split("\n").filter(Boolean);
      assert.equal(warnings.length, 1, r.stderr);
      assert.match(warnings[0], /^ux-builder-trace: could not write the episode trace in .*\.ux-builder \(.*\); carrying on without it$/);
    } finally {
      for (const d of [".ux-builder", ".ux-builder/trace"]) chmodSync(join(app, d), 0o755);
    }
  });

  test("an unknown kind is refused without throwing", () => {
    const app = tempApp();
    mkdirSync(join(app, ".ux-builder"), { recursive: true });
    assert.equal(appendEvent(app, "start", {}), null);
  });

  test("outside a git repository the episode still opens and closes, with no commits", () => {
    const app = tempApp({ repo: false });
    const id = openEpisode(app, { goal: { text: "No git" } });
    const r = closeEpisode(app);
    assert.equal(r.episode, id);
    assert.deepEqual(r.change, { commits: [], files: 0, screens: [], parent: null });
    assert.equal(readEpisode(app, id)[0].commit, null);
    assert.match(r.warnings[0], /not a git repository/);
    assert.deepEqual(validateTrace(app), []);
  });
});
