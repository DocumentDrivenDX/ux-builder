/* The MCP server writes the episode trace (FEAT-016 TRC-03, TRC-05;
   CONTRACT-007 MCP tools): every tool's answer is a guidance event in the
   app's open episode, and start_episode, record_decision and end_episode
   write the agent's side.

     npm test --workspace @ux-builder/mcp */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { currentEpisode, readEpisode, recordDecision, validateEvent, validateTrace } from "@ux-builder/trace";
import { skeleton } from "@ux-builder/ui/blueprint";
import { CLEAN } from "../../ui/src/adaptive-cards/story-data.js";
import { answerSummary, createServer, sdk } from "../server.mjs";

const app = mkdtempSync(join(tmpdir(), "mcp-trace-"));
writeFileSync(join(app, "package.json"), JSON.stringify({ name: "traced-app", private: true }) + "\n");
mkdirSync(join(app, ".ux-builder"));
after(() => rmSync(app, { recursive: true, force: true }));

let client;
const call = (name, args = {}) => client.callTool({ name, arguments: args });
const events = () => readEpisode(app, currentEpisode(app));
// A key-shaped value, assembled at run time so this file holds no literal a secret scanner flags.
const KEY = ["sk", "live", "Zx9Yw8Vu7Ts6Rq5Po4Nm3Lk2"].join("-");

before(async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  await createServer(undefined, undefined, undefined, undefined, undefined, undefined, { appDir: join(app, "src") }).connect(a);
  client = new Client({ name: "trace-test", version: "1" });
  await client.connect(b);
});

/* Arguments for the tools that need some; the others are called with none. */
const ARGS = {
  update_design_state: { path: "next", value: "Compare flows" },
  get_theme: { name: "databricks" }, get_widget: { name: "Button" }, get_pattern: { name: "CollectionList" }, get_token: { name: "color.accent" },
  list_icons: { query: "pin" }, get_rules: { modalities: ["chat"] }, list_recipes: { job: "review and approve flagged time entries" }, get_recipe: { id: "review-queue" },
  check_blueprint: { blueprint: skeleton("app") }, check_card: { card: CLEAN }, get_guidance: { modalities: ["responsive-web"] },
  propose_from_blueprint: { blueprint: skeleton("app"), path: join(app, "app.blueprint.json") },
  validate_assessment_manifest: { path: join(app, "ux-assessment.yml") }, validate_assessment_report: { dir: join(app, "no-run") },
};

describe("FEAT-016: the MCP server writes the episode trace", () => {
  // @covers US-105-AC2
  test("start_episode opens an episode with its goal; current names it; a second is refused, naming it", async () => {
    const r = await call("start_episode", { goal: "Review screen", stories: ["US-003"], screens: ["review"], agent: "claude-code", model: "claude-opus-5-5" });
    assert.ok(!r.isError, r.content[0].text);
    const { episode, trailer } = JSON.parse(r.content[0].text);
    assert.match(episode, /^E-\d{8}-review-screen$/);
    assert.equal(trailer, `UX-Episode: ${episode}`);
    assert.equal(readFileSync(join(app, ".ux-builder/trace/current"), "utf8").trim(), episode, "the app is the nearest folder above the server's with .ux-builder/");
    const start = events()[0];
    assert.equal(start.kind, "start");
    assert.deepEqual(start.goal, { stories: ["US-003"], screens: ["review"], journeys: [], text: "Review screen" });
    assert.deepEqual(start.agent, { name: "claude-code", model: "claude-opus-5-5" });
    const again = await call("start_episode", { goal: "Another" });
    assert.equal(again.isError, true);
    assert.match(again.content[0].text, new RegExp(`${episode} is open`));
  });

  // @covers US-106-AC1
  test("AC1: every other tool's answer writes a guidance event: the tool, its input, and the rule IDs, components and recipes it returned, with the guidance hash", async () => {
    const { tools } = await client.listTools();
    const others = tools.map((t) => t.name).filter((n) => !["start_episode", "record_decision", "end_episode"].includes(n));
    assert.ok(others.length >= 24);
    for (const name of others) {
      const before = events().length;
      const r = await call(name, ARGS[name] ?? {});
      const added = events().slice(before);
      const g = added.find((e) => e.kind === "guidance");
      assert.ok(g, `${name} wrote no guidance event`);
      assert.equal(g.tool, name);
      assert.deepEqual(Object.keys(g.input).sort(), Object.keys(ARGS[name] ?? {}).sort(), name);
      assert.deepEqual(g.answer, answerSummary(r, sdk().catalogue), name);
      assert.match(g.answer.guidanceHash, /^sha256:[0-9a-f]{64}$/, name);
      assert.ok(g.answer.bytes > 0, name);
      assert.deepEqual(validateEvent(g), [], name);
    }
    const by = (tool) => events().find((e) => e.kind === "guidance" && e.tool === tool);
    assert.ok(by("get_rules").answer.ruleIds.length > 3, "get_rules names its rules");
    assert.ok(by("get_rules").answer.ruleIds.every((id) => !/^nav\./.test(id)), "chat has no nav.* rules");
    assert.ok(by("list_recipes").answer.recipes.includes("review-queue"));
    assert.ok(by("get_recipe").answer.components.includes("WorkQueue"));
    assert.deepEqual(by("get_widget").answer.components, ["Button"]);
    assert.ok(by("get_guidance").answer.components.includes("AppShell"), "Markdown: the components in its code");
    assert.deepEqual(by("get_widget").input, { name: "Button" });
  });

  // @covers US-106-AC2
  test("AC2: check_blueprint and check_card also write a check event: status, attempt and each rule's findings", async () => {
    const bad = { ...skeleton("app"), screens: [{ id: "a", title: "A", pattern: "ListDetails" }] };
    const r = JSON.parse((await call("check_blueprint", { blueprint: bad })).content[0].text);
    const checks = events().filter((e) => e.kind === "check" && e.check === "blueprint");
    const last = checks.at(-1);
    assert.equal(last.status, "fail");
    assert.equal(last.attempt, checks.length);
    assert.ok(last.attempt >= 2, "the earlier check_blueprint was attempt 1");
    const counted = new Map();
    for (const f of r.findings) counted.set(`${f.rule} ${f.severity}`, (counted.get(`${f.rule} ${f.severity}`) ?? 0) + 1);
    assert.deepEqual(new Map(last.findings.map((f) => [`${f.ruleId} ${f.severity}`, f.count])), counted);
    await call("check_card", { card: { type: "AdaptiveCard", version: "1.6", body: [{ type: "Input.Text", id: "q" }] } });
    const card = events().filter((e) => e.kind === "check" && e.check === "card").at(-1);
    assert.ok(card.findings.some((f) => f.ruleId === "card.input-label"));
    assert.ok(["warn", "fail"].includes(card.status));
  });

  // @covers US-106-AC4
  test("AC4: no guidance event holds a blueprint's or a card's contents: an object argument is kept by its hash and size", () => {
    const raw = readFileSync(join(app, `.ux-builder/trace/${currentEpisode(app)}.jsonl`), "utf8");
    const g = events().find((e) => e.kind === "guidance" && e.tool === "check_blueprint");
    assert.deepEqual(Object.keys(g.input.blueprint).sort(), ["bytes", "sha256"]);
    assert.doesNotMatch(raw, /"destinations"|"screens":\[\{|"type":"AdaptiveCard"|"TextBlock"/);
    assert.deepEqual(validateTrace(app), []);
  });

  // @covers US-107-AC1
  test("AC1: record_decision writes a decision event with every field, and masks why", async () => {
    const r = await call("record_decision", { chose: "WorkQueue", considered: ["CollectionList"], why: `a queue fits review; the demo key ${KEY} stays out of it`, relied: ["action.destructive-safeguard", "US-003"], departs: false, workaround: true, screen: "review" });
    assert.ok(!r.isError, r.content[0].text);
    const d = events().at(-1);
    assert.equal(d.kind, "decision");
    assert.equal(d.by, "agent");
    assert.equal(d.chose, "WorkQueue");
    assert.deepEqual(d.considered, ["CollectionList"]);
    assert.deepEqual(d.relied, ["action.destructive-safeguard", "US-003"]);
    assert.equal(d.departs, false);
    assert.equal(d.workaround, true);
    assert.equal(d.screen, "review");
    assert.match(d.why, /^a queue fits review; the demo key \[masked:[a-z-]+\] stays out of it$/);
    assert.ok(!readFileSync(join(app, `.ux-builder/trace/${d.episode}.jsonl`), "utf8").includes(KEY));
    assert.deepEqual(validateEvent(d), []);
  });

  // @covers US-119-AC2
  test("US-119-AC2: record_decision with the five answers writes the same event decide does", async () => {
    const input = { kind: "addition", chose: "A map screen", why: "People choose rivers by place", goal: "Find a river near me", without: "No: a list hides distance", simplest: "A list sorted by distance", assumptions: ["Location is available"], validation: "Compare task time in a test" };
    const r = await call("record_decision", input);
    assert.ok(!r.isError, r.content[0].text);
    const viaMcp = events().at(-1);
    // The same input through the library decide uses, in another app.
    const other = mkdtempSync(join(tmpdir(), "mcp-decide-"));
    try {
      mkdirSync(join(other, ".ux-builder"), { recursive: true });
      const viaDecide = recordDecision(other, input, { by: "agent" });
      const strip = ({ seq, at, episode, ...rest }) => rest;
      assert.deepEqual(strip(viaMcp), strip(viaDecide));
      assert.equal(viaMcp.goal, "Find a river near me");
      assert.deepEqual(validateEvent(viaMcp), []);
    } finally { rmSync(other, { recursive: true, force: true }); }
    const missing = await call("record_decision", { ...input, validation: undefined });
    assert.equal(missing.isError, true);
    assert.match(missing.content[0].text, /an addition needs "validation"/);
  });

  // @covers US-107-AC2
  test("AC2: record_decision without chose or why answers with an error naming the field, and writes nothing", async () => {
    for (const [args, field] of [[{ why: "it fits" }, "chose"], [{ chose: "WorkQueue" }, "why"], [{ chose: "WorkQueue", why: "  " }, "why"]]) {
      const before = events().length;
      const r = await call("record_decision", args);
      assert.equal(r.isError, true);
      assert.match(r.content[0].text, new RegExp(`needs "${field}"`));
      assert.equal(events().length, before, "nothing written");
    }
  });

  test("end_episode closes it: change, outcome and end, with the checks' attempts", async () => {
    const r = await call("end_episode", {});
    assert.ok(!r.isError, r.content[0].text);
    const res = JSON.parse(r.content[0].text);
    assert.equal(res.status, "done");
    assert.ok("blueprint" in res.outcome.checksToGreen);
    assert.equal(currentEpisode(app), null);
    assert.deepEqual(validateTrace(app), []);
    assert.equal((await call("end_episode", {})).isError, true, "none is open now");
  });
});
