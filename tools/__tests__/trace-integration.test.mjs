/* The episode trace across ux-builder's tools (FEAT-016 TRC-03, TRC-04;
   CONTRACT-007): an agent's episode in a temporary app, written by the
   tools themselves: the MCP server's guidance, `ux-builder-trace lint`
   failing twice and then passing, ux-builder-blueprint check, the audit's
   check, the agent's decision and its commit, then end_episode. The outcome
   gives the audit's verdicts and findings and each check's attempts, and no
   event holds source code or a file's contents.

     npm test */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { readEpisode, validateEvent, validateTrace } from "../../packages/trace/index.mjs";
import { cli, commit, tempApp } from "../../packages/trace/test/helpers.mjs";
import { createServer } from "../../packages/mcp/server.mjs";
import { recordAudit } from "../../packages/audit/trace.mjs";
import { skeleton } from "../../packages/ui/blueprint/index.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SOURCES = {
  "src/review.js": "var queue = [];\nexport function review(entry) { queue.push(entry); return queue.length; }\n",
  "src/review.css": ".review-queue { color: #c0ffee; padding: var(--piq-space-4); }\n",
};
const LINT = ["lint", "--stylelint", "src/**/*.css", "--eslint", "src"];
let app, client, episode, closed;
const call = async (name, args = {}) => { const r = await client.callTool({ name, arguments: args }); assert.ok(!r.isError, `${name}: ${r.content[0].text}`); return JSON.parse(r.content[0].text); };
const events = () => readEpisode(app, episode);

before(async () => {
  app = tempApp({ pkg: { name: "review-app", private: true, type: "module" } });
  mkdirSync(join(app, ".ux-builder"));
  mkdirSync(join(app, "src"));
  writeFileSync(join(app, "eslint.config.js"), 'export default [{ files: ["src/**/*.js"], rules: { "no-var": "error" } }];\n');
  writeFileSync(join(app, ".stylelintrc.json"), JSON.stringify({ rules: { "color-no-hex": true } }));
  writeFileSync(join(app, "app.blueprint.json"), JSON.stringify(skeleton("app"), null, 2) + "\n");
  for (const [f, text] of Object.entries(SOURCES)) writeFileSync(join(app, f), text);

  const [a, b] = InMemoryTransport.createLinkedPair();
  await createServer(undefined, undefined, undefined, undefined, undefined, undefined, { appDir: app }).connect(a);
  client = new Client({ name: "agent", version: "1" });
  await client.connect(b);

  // The agent's episode, as AGENTS.md asks for it.
  ({ episode } = await call("start_episode", { goal: "Review queue screen", stories: ["US-003"], screens: ["review"], agent: "claude-code", model: "claude-opus-5-5" }));
  await call("get_rules", { modalities: ["responsive-web"] });
  await call("list_recipes", { job: "review and approve flagged entries" });
  // Lint fails twice (a hard-coded colour, then var), then passes.
  assert.equal(cli(app, LINT).status, 1);
  writeFileSync(join(app, "src/review.css"), ".review-queue { color: var(--piq-color-text); padding: var(--piq-space-4); }\n");
  assert.equal(cli(app, LINT).status, 1);
  writeFileSync(join(app, "src/review.js"), SOURCES["src/review.js"].replace("var queue", "const queue"));
  assert.equal(cli(app, LINT).status, 0);
  // The blueprint check, as npm run check:blueprint runs it.
  const bp = spawnSync(process.execPath, [join(ROOT, "packages/ui/blueprint/cli.mjs"), "check", "app.blueprint.json"], { cwd: app, encoding: "utf8" });
  assert.equal(bp.status, 0, bp.stderr);
  // The audit passes (its report, as ux-builder-audit writes it after a run).
  await recordAudit({
    summary: { error: 0, warning: 0, info: 2 },
    findings: [{ check: "token-colors", ruleId: null, severity: "info" }, { check: "nav", ruleId: "nav.compact-destinations", severity: "info" }],
    verdicts: { theme: { status: "pass", items: [] }, modality: [{ modality: "responsive-web", status: "pass", components: [] }] },
  }, { out: join(app, "audit-report"), start: app });
  await call("record_decision", { chose: "WorkQueue", considered: ["CollectionList"], why: "reviewers act on one entry at a time", relied: ["review-queue", "US-003"], screen: "review" });
  commit(app, "src/review.js", `Review queue screen\n\nUX-Episode: ${episode}`);
  closed = await call("end_episode", {});
});

describe("US-106: the trace across the tools", () => {
  // @covers US-106-AC2
  test("AC2: lint, the blueprint check and the audit each wrote check events with status, attempt and findings per rule", () => {
    const checks = events().filter((e) => e.kind === "check");
    assert.deepEqual(checks.map((c) => [c.check, c.attempt, c.status, c.by.replace(/@[\d.]+$/, "")]), [
      ["lint", 1, "fail", "@ux-builder/trace"], ["lint", 2, "fail", "@ux-builder/trace"], ["lint", 3, "pass", "@ux-builder/trace"],
      ["blueprint", 1, "pass", "@ux-builder/ui"], ["audit", 1, "pass", "@ux-builder/audit"],
    ]);
    assert.deepEqual(checks[0].findings, [{ ruleId: "color-no-hex", severity: "error", count: 1 }, { ruleId: "no-var", severity: "error", count: 1 }]);
    assert.deepEqual(checks[1].findings, [{ ruleId: "no-var", severity: "error", count: 1 }]);
    assert.equal(checks[4].report, "audit-report/report.json");
  });

  // @covers US-106-AC3
  test("AC3: trace end's outcome gives the audit's verdicts, its findings per rule, and the attempts each check took before its first pass", () => {
    const outcome = events().find((e) => e.kind === "outcome");
    assert.deepEqual(outcome, { ...outcome, ...closed.outcome }, "end_episode returns what it wrote");
    assert.deepEqual(outcome.audit.verdicts, { theme: "pass", modality: [{ modality: "responsive-web", status: "pass" }] });
    assert.deepEqual(outcome.audit.findings, { "nav.compact-destinations": 1, "token-colors": 1 });
    // checksToGreen is the attempt on which each check first passed (CONTRACT-007, event.schema.json):
    // lint failed twice and passed at attempt 3; the blueprint check and the audit passed first time.
    assert.deepEqual(outcome.checksToGreen, { lint: 3, blueprint: 1, audit: 1 });
    const green = (check) => events().find((e) => e.kind === "check" && e.check === check && e.status !== "fail").attempt;
    assert.deepEqual([green("lint"), green("audit")], [3, 1]);
    const change = events().find((e) => e.kind === "change");
    assert.equal(change.commits.length, 1);
    assert.deepEqual(change.screens, ["review"]);
    assert.deepEqual(closed.warnings, [], "a decision was recorded and the commit has the trailer");
  });

  // @covers US-106-AC4
  test("AC4: every event validates against event.schema.json and none holds source code or a file's contents", () => {
    const ev = events();
    assert.deepEqual(ev.map((e) => e.kind), ["start", "guidance", "guidance", "check", "check", "check", "check", "check", "decision", "change", "outcome", "end"]);
    for (const e of ev) assert.deepEqual(validateEvent(e), [], `${e.seq} ${e.kind}`);
    assert.deepEqual(validateTrace(app), []);
    const raw = readFileSync(join(app, `.ux-builder/trace/${episode}.jsonl`), "utf8");
    const texts = [...Object.values(SOURCES), readFileSync(join(app, "app.blueprint.json"), "utf8"), readFileSync(join(app, "eslint.config.js"), "utf8")];
    for (const text of texts) for (const line of text.split("\n").map((l) => l.trim()).filter((l) => l.length > 12)) assert.ok(!raw.includes(line), `"${line}" is in the trace`);
    assert.doesNotMatch(raw, /#c0ffee|var queue|src\/review\.(js|css)/, "no source, and no file names from the lint");
  });
});
