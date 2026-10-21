/* AI journeys in three scenarios (FEAT-011 AIX-01 to AIX-03; ADR-028
   decision 8; US-082; CONTRACT-006 journeys[].ai, journeys[].scenarios).

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { load, validate } from "../assess/manifest.mjs";
import { agentApp } from "./fixtures/agent-app.mjs";
import { prepared } from "./fixtures/run-package.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const CATALOGUE = JSON.parse(readFileSync(join(PKG, "../ui/catalogue.json"), "utf8"));
const made = [];
const pkg = (o) => { const p = prepared(o); made.push(p); return p; };
let app;
before(async () => { app = await agentApp(); });
after(() => { app?.close(); for (const p of made) p.remove(); });

const SCENARIOS = {
  normal: { description: "Ask for reminders to the overdue customers", inputs: "Remind everyone overdue" },
  errorProne: { description: "Ask for a list the agent cannot read", inputs: "Remind the customers in the archived list" },
  risky: { description: "Reminders are sent: a high-impact action", step: 4 },
};
const aiJourney = (over = {}) => ({ id: "J-remind", story: "US-001", priority: "critical", role: "reviewer", entry: "/agent", ai: true, scenarios: SCENARIOS, ...over });
const run = (cwd, args) => new Promise((resolve) => {
  const c = spawn(process.execPath, [join(PKG, "cli.mjs"), "assess", ...args], { cwd });
  let o = "", e = "";
  c.stdout.on("data", (d) => { o += d; }); c.stderr.on("data", (d) => { e += d; });
  c.on("close", (code) => resolve({ code, o, e }));
});
// A replay of the agent app, inspected as a checkpoint of the AI journey.
const replay = async (p, id, steps, args = [], expect) => {
  writeFileSync(join(p.r.dir, `${id}.json`), JSON.stringify({ baseUrl: app.base, steps, ...(expect ? { expect } : {}) }));
  const r = await run(p.r.dir, ["inspect", "--manifest", "ux-assessment.yml", "--run", p.run, "--replay", `${id}.json`, "--checkpoint", id, "--journey", "J-remind", ...args]);
  return { ...r, record: p.read(`checkpoints/${id}/inspection.json`) };
};
const agentPkg = (journey = {}) => pkg({ manifest: { run: { baseUrl: `${app.base}/`, environment: "local" }, journeys: [aiJourney(journey)] } });

describe("US-082: assess an AI journey in three scenarios", () => {
  // @covers US-082-AC1
  test("AC1: an AI journey needs its normal, error-prone and risky scenarios; each missing one is reported", () => {
    const p = agentPkg();
    const check = (journey) => { writeFileSync(join(p.r.dir, "ux-assessment.yml"), stringify({ version: 1, app: { name: "Agent" }, run: { baseUrl: `${app.base}/`, environment: "local" }, roles: [{ id: "reviewer", auth: "none" }], journeys: [journey], restrictions: { writes: "report-only" } })); return validate(load(join(p.r.dir, "ux-assessment.yml"))).problems; };
    const none = check(aiJourney({ scenarios: undefined }));
    assert.deepEqual(none.map((x) => x.path), ["/journeys/0/scenarios/errorProne", "/journeys/0/scenarios/normal", "/journeys/0/scenarios/risky"]);
    assert.match(none.find((x) => x.path.endsWith("/risky")).message, /an AI journey needs its risky \(a step with a high-impact action\) scenario/);
    const some = check(aiJourney({ scenarios: { normal: SCENARIOS.normal } }));
    assert.deepEqual(some.map((x) => x.path), ["/journeys/0/scenarios/errorProne", "/journeys/0/scenarios/risky"]);
    const noStep = check(aiJourney({ scenarios: { ...SCENARIOS, risky: { description: "sends" } } }));
    assert.deepEqual(noStep.map((x) => [x.path, x.message]), [["/journeys/0/scenarios/risky/step", "needs the high-impact step: the walkthrough stops there, chooses Deny and never approves"]]);
    assert.deepEqual(check(aiJourney()), [], "all three scenarios: valid");
    assert.deepEqual(check(aiJourney({ ai: false, scenarios: undefined })), [], "not an AI journey: no scenarios needed");
    // The CLI says the same, with each path.
    writeFileSync(join(p.r.dir, "bad.yml"), stringify({ version: 1, app: { name: "Agent" }, run: { baseUrl: `${app.base}/`, environment: "local" }, roles: [{ id: "reviewer", auth: "none" }], journeys: [aiJourney({ scenarios: { risky: SCENARIOS.risky } })], restrictions: { writes: "report-only" } }));
    return run(p.r.dir, ["validate", "--manifest", "bad.yml"]).then((v) => {
      assert.equal(v.code, 1);
      assert.match(v.o, /\/journeys\/0\/scenarios\/errorProne\s+an AI journey needs its error-prone/);
      assert.match(v.o, /\/journeys\/0\/scenarios\/normal\s+an AI journey needs its normal/);
      assert.match(v.o, /2 problems/);
    });
  });

  // @covers US-082-AC2
  test("AC2: the rubric's AI heuristics are the AI rules for the journey's roles, review heuristics included; each finding names one", () => {
    const blueprint = { version: 1, kind: "app", name: "Agent", supports: ["compact"], destinations: [{ id: "home", label: "Home", screen: "chat" }],
      screens: [{ id: "chat", title: "Assistant", pattern: "WorkQueue", ai: { roles: ["assistant"] } }],
      journeys: [{ id: "J-chat", story: "US-001", entry: "chat", steps: [{ screen: "chat" }] }] };
    const p = pkg({ files: { "app.blueprint.json": JSON.stringify(blueprint) }, manifest: { run: { baseUrl: `${app.base}/`, environment: "local" }, journeys: [aiJourney(), { blueprint: "J-chat", priority: "important", role: "reviewer", ai: true, scenarios: SCENARIOS }] } });
    const plan = p.read("plan.json");
    const [remind, chat] = plan.journeys;
    const forRoles = (roles) => CATALOGUE.interaction.rules.filter((r) => r.when?.aiRole?.some((x) => roles.includes(x))).map((r) => r.id);
    // No blueprint screen: every AI role.
    assert.deepEqual([remind.ai.roles, remind.ai.roleSource], [["generative", "assistant", "agent"], "all"]);
    assert.deepEqual(remind.ai.heuristics.map((h) => h.rule), forRoles(["generative", "assistant", "agent"]));
    // The blueprint screen's roles: assistant rules only, so no agent-only rule.
    assert.deepEqual([chat.ai.roles, chat.ai.roleSource], [["assistant"], "blueprint"]);
    assert.deepEqual(chat.ai.heuristics.map((h) => h.rule), forRoles(["assistant"]));
    assert.ok(!chat.ai.heuristics.some((h) => h.rule === "agent.recover"));
    assert.ok(chat.ai.heuristics.some((h) => h.rule === "ai.disclose" && h.review), "review heuristics are in the rubric");
    assert.ok(remind.ai.heuristics.some((h) => h.rule === "ai.fallback" && !h.review), "and rules checked elsewhere");
    // The plan expands the journey into its three scenario walkthroughs.
    assert.deepEqual(remind.walkthroughs.map((w) => [w.scenario, w.state]), [["normal", "ai"], ["errorProne", "recoverable-error"], ["risky", "ai"]]);
    assert.deepEqual([remind.walkthroughs[2].step, remind.walkthroughs[2].never], [4, "approve"]);
    assert.deepEqual(remind.walkthroughs[1].rules, ["agent.recover", "ai.improve-request"]);
    // Each finding of an AI journey names an AI rule or heuristic of its rubric.
    p.checkpointAt("C-review-1");
    const backlog = (over) => p.write("backlog.json", { schema: "backlog", version: 1, user_validation: [], findings: [p.finding({ journey_id: "J-remind", state_id: "S-remind-ai", ...over })] });
    backlog({});
    assert.match(p.cli("validate-report", p.dir).stdout, /is a finding of the AI journey J-remind: name the AI rule or heuristic it is about \(rule\)/);
    backlog({ journey_id: "J-chat", state_id: "S-chat-ai", rule: "agent.recover" });
    assert.match(p.cli("validate-report", p.dir).stdout, /agent\.recover is not one of J-chat's AI heuristics/);
    backlog({ rule: "agent.recover" });
    const ok = p.cli("validate-report", p.dir);
    assert.equal(ok.status, 0, ok.stdout);
  });

  // @covers US-082-AC3
  test("AC3: the risky scenario stops at the approval: recorded, Deny chosen, nothing approved", async () => {
    const p = agentPkg();
    const before = { ...app.counts };
    const r = await replay(p, "C-remind-1", [{ goto: "/agent" }, { fill: "#req", value: "Remind everyone overdue" }, { click: "#run" }, { click: "#send-now", highImpact: true }], ["--scenario", "risky"], { selector: "#outcome", text: "Denied" });
    assert.equal(r.code, 0, r.e + r.o);
    const k = r.record;
    assert.equal(k.scenario, "risky");
    assert.deepEqual([k.risky.stoppedAt, k.risky.highImpactStep, k.risky.denied, k.risky.approved], [4, 4, true, false]);
    assert.match(k.risky.approval.text, /Send 3 payment reminders/);
    assert.deepEqual(k.risky.approval.controls.map((c) => c.control), ["approve", "deny"]);
    assert.ok(existsSync(join(p.dir, "checkpoints/C-remind-1/approval.png")), "the approval as it was shown");
    assert.deepEqual(k.verified, { assertion: { selector: "#outcome", text: "Denied" }, passed: true }, "Deny was chosen");
    assert.deepEqual(app.counts, before, "nothing approved, and the high-impact step not taken");
    assert.ok(!k.findings.some((f) => f.rule === "agent.approve-high-impact"));
    // An approve control is never activated, in any scenario: named in the replay, it is refused before any step…
    const named = await replay(p, "C-remind-2", [{ goto: "/agent" }, { click: "#run" }, { click: '[data-piq-ai-control="approve"]' }], [], { selector: "h1" });
    assert.equal(named.code, 1);
    assert.match(named.record.message, /^blocked: restricted — step 3 would activate an approve control .*the assessment never approves.*nothing was taken/);
    // …and reached through another selector, it is refused when the replay gets there.
    const reached = await replay(p, "C-remind-3", [{ goto: "/agent" }, { click: "#run" }, { click: "#ok" }], [], { selector: "h1" });
    assert.equal(reached.code, 1);
    assert.equal(reached.record.error, "restricted");
    assert.match(reached.record.message, /step 3 would activate an approve control .*; step 3 and those after it were not taken/);
    assert.deepEqual(app.counts, before, "never approved");
    // The skill tells the agent the same.
    const skill = readFileSync(join(PKG, "skill/ux-builder-assess/SKILL.md"), "utf8");
    assert.match(skill, /\*\*Never approve\.\*\*/);
    for (const s of ["normal:", "errorProne:", "risky:", "--scenario risky", "agent.approve-high-impact"]) assert.ok(skill.includes(s), s);
  });

  // @covers US-082-AC4
  test("AC4: with no approval before the high-impact step, the walkthrough stops before it and records a P1 agent.approve-high-impact", async () => {
    const p = agentPkg({ entry: "/agent-no-approval", scenarios: { ...SCENARIOS, risky: { description: "Reminders are sent", step: 3 } } });
    const before = { ...app.counts };
    // The high-impact step comes from the manifest's scenarios.risky.step.
    const r = await replay(p, "C-remind-1", [{ goto: "/agent-no-approval" }, { fill: "#req", value: "Remind everyone" }, { click: "#send" }], ["--scenario", "risky"]);
    assert.equal(r.code, 0, r.e + r.o);
    assert.deepEqual([r.record.risky.stoppedAt, r.record.risky.approval, r.record.risky.approved], [3, null, false]);
    assert.equal(app.counts.acted, before.acted, "the high-impact action was not taken");
    const f = r.record.findings.filter((x) => x.rule === "agent.approve-high-impact");
    assert.equal(f.length, 1);
    assert.equal(f[0].priority, "P1");
    assert.match(f[0].message, /no approval appeared before step 3, the high-impact step; the walkthrough stopped before it and took nothing/);
    assert.equal(r.record.steps, 3, "two steps taken, and the inspection");
    // Without a high-impact step, a risky replay cannot know where to stop: it takes nothing.
    const p2 = agentPkg({ scenarios: { ...SCENARIOS, risky: { description: "sends", step: "Send reminders" } } });
    const none = await replay(p2, "C-remind-2", [{ goto: "/agent-no-approval" }, { click: "#send" }], ["--scenario", "risky"]);
    assert.equal(none.code, 1);
    assert.match(none.record.message, /blocked: restricted — the risky scenario names no high-impact step/);
    assert.equal(app.counts.acted, before.acted);
  });

  // @covers US-082-AC5
  test("AC5: the error-prone scenario records whether the error was shown in place and whether recovery needs no restart", async () => {
    const p = agentPkg();
    const good = await replay(p, "C-remind-1", [{ goto: "/agent-error" }, { fill: "#req", value: "Remind the archived list" }, { click: "#run" }], ["--scenario", "errorProne"], { selector: '[data-piq-ai-status="failed"]' });
    assert.equal(good.code, 0, good.e + good.o);
    const g = good.record.errorProne;
    assert.deepEqual([g.errorShownInPlace, g.recoveryWithoutRestart, g.requestEditable], [true, true, true]);
    assert.deepEqual(g.controls, ["retry"]);
    assert.match(g.error, /failed: the customer list could not be read/);
    assert.deepEqual(g.rules, ["agent.recover", "ai.improve-request"]);
    assert.ok(!good.record.findings.some((f) => ["agent.recover", "ai.improve-request"].includes(f.rule)));
    const bad = await replay(p, "C-remind-2", [{ goto: "/agent-error-bad" }, { fill: "#req", value: "Remind the archived list" }, { click: "#run" }], ["--scenario", "errorProne"], { selector: '[role="alert"]' });
    assert.equal(bad.code, 0, bad.e + bad.o);
    const b = bad.record.errorProne;
    assert.deepEqual([b.errorShown, b.errorShownInPlace, b.recoveryWithoutRestart, b.requestEditable], [true, false, false, false]);
    const rules = bad.record.findings.filter((f) => f.scenario === "errorProne").map((f) => f.rule);
    assert.deepEqual(rules, ["agent.recover", "agent.recover", "ai.improve-request"], "each finding names its AI rule");
    assert.match(bad.record.findings.find((f) => f.rule === "agent.recover").message, /shown away from the step that failed/);
    assert.equal(p.cli("validate-report", p.dir).status, 0, "the records validate");
  });
});
