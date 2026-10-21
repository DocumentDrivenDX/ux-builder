/* The AI and agent experience rules, and the blueprint's AI checks (FEAT-011;
   US-076, US-077, US-080; SD-005; CONTRACT-005 AI and agent experience).

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkBlueprint, rulesFor, skeleton } from "@ux-builder/ui/blueprint";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const cat = JSON.parse(read("packages/ui/catalogue.json"));
const source = JSON.parse(read("guidelines/rules.json"));
const AI = source.rules.filter((r) => /^(ai|agent|genui|card)\./.test(r.id));
const ROLES = { G: "generative", A: "assistant", Ag: "agent" };

/* SD-005's rule catalogue: each row's ID and its Roles column. */
const sd005 = () => [...read("docs/helix/02-design/solution-designs/SD-005-ai-and-agent-experience-rules.md").matchAll(/^\| `([a-z]+\.[a-z0-9-]+)` \| [^|]+ \| ([^|]+) \| ([^|]+) \|/gm)]
  .map(([, id, roles, checks]) => ({ id, roles: roles.trim() === "(any)" ? null : roles.split(",").map((x) => ROLES[x.trim()]), checks: checks.split(",").map((x) => x.trim()) }));

describe("US-076: the AI rules for a screen's role", () => {
  // @covers US-076-AC1
  test("AC1: role agent gets every agent rule and every rule with no AI condition, and no rule only for another role", () => {
    const got = rulesFor({ aiRoles: ["agent"] }).map((r) => r.id);
    const expected = source.rules.filter((r) => !r.when?.aiRole || r.when.aiRole.includes("agent")).map((r) => r.id);
    assert.deepEqual(got, expected, "catalogue order");
    assert.ok(got.includes("agent.approve-high-impact") && got.includes("modal.one-at-a-time") && got.includes("ai.declared"));
    for (const id of ["ai.fallback", "ai.dismiss", "genui.renderable", "genui.keep-input", "genui.history"]) assert.ok(!got.includes(id), `${id} is not an agent rule`);
    // The other axes still apply alongside the role.
    const compact = rulesFor({ context: "app", sizeClasses: ["compact"], aiRoles: ["agent"] }).map((r) => r.id);
    assert.ok(compact.includes("agent.plan-visible") && compact.includes("nav.compact-destinations") && !compact.includes("view.no-shell"));
  });

  // @covers US-076-AC2
  test("AC2: a target with no AI role gets no rule with an AI condition", () => {
    for (const target of [{}, { context: "app" }, { aiRoles: [] }, { sizeClasses: ["compact"], inputs: ["coarse"] }]) {
      const got = rulesFor(target);
      assert.ok(got.length > 0);
      assert.ok(got.every((r) => !r.when?.aiRole), JSON.stringify(target));
    }
    assert.ok(rulesFor({}).some((r) => r.id === "ai.declared"), "ai.declared has no role condition: it applies to every screen");
  });

  // @covers US-076-AC3
  test("AC3: an embedded agent view gets both the view rules and the agent rules", () => {
    const got = new Set(rulesFor({ context: "view", aiRoles: ["agent"] }).map((r) => r.id));
    for (const id of ["view.no-shell", "view.size-classes", "view.states", "agent.approve-high-impact", "agent.interrupt", "ai.disclose"]) assert.ok(got.has(id), id);
    assert.ok(!got.has("nav.compact-destinations"), "no app-only rule");
    const two = new Set(rulesFor({ aiRoles: ["assistant", "agent"] }).map((r) => r.id));
    assert.ok(two.has("genui.keep-input") && two.has("agent.summary"), "a screen with two roles gets both families");
  });

  // @covers US-076-AC4
  test("AC4: every AI rule has a statement, rationale, check kind and a paraphrased, licensed source", () => {
    const licences = new Set(["apple-terms", "microsoft-terms", "CC-BY-4.0", "CC-BY-NC-SA-4.0", "CC-BY-NC-ND-4.0", "W3C", "own"]);
    assert.equal(AI.length, 47, "SD-005 has 47 rules");
    for (const r of AI) {
      assert.ok(r.title && r.statement && r.rationale, `${r.id} has a title, statement and rationale`);
      assert.ok(r.checks.length && r.checks.every((c) => ["blueprint", "audit", "lint", "card", "review"].includes(c.kind) && c.id), `${r.id} has a check kind`);
      assert.equal(r.severity, "warning", `${r.id} is a warning (ADR-028 decision 5)`);
      assert.ok(r.sources.length >= 1, `${r.id} cites a source`);
      for (const s of r.sources) {
        assert.ok(licences.has(s.licence), `${r.id}: ${s.licence}`);
        assert.equal(s.wording, "paraphrased", `${r.id} paraphrases ${s.title}`);
        assert.match(s.url, /^https:\/\//);
      }
    }
    assert.deepEqual(cat.interaction.rules, source.rules, "the catalogue carries them");
    assert.deepEqual(cat.interaction.aiRoles, ["generative", "assistant", "agent"]);
  });

  // @covers US-076-AC4
  test("AC4: the rules match SD-005's catalogue: the same IDs, roles and sources' licences", () => {
    const rows = sd005();
    assert.deepEqual(rows.map((x) => x.id), AI.map((r) => r.id), "SD-005's IDs in its order");
    for (const row of rows) {
      const r = AI.find((x) => x.id === row.id);
      assert.deepEqual(r.when?.aiRole ?? null, row.roles, `${r.id}'s roles`);
      // A rule whose only automated checks are built later (audit, lint, card) is reviewed until then.
      const own = new Set(r.checks.map((c) => c.kind));
      if (row.checks.includes("R")) assert.ok(own.has("review"), `${r.id} keeps its review check`);
      if (row.checks.includes("B")) assert.ok(own.has("blueprint") || own.has("review"), `${r.id} has its blueprint check or a review stand-in`);
    }
    const urls = new Set(AI.flatMap((r) => r.sources.map((s) => s.url)));
    for (const u of ["https://developer.apple.com/design/human-interface-guidelines/generative-ai", "https://microsoft.design/articles/ux-design-for-agents/", "https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/", "https://pair.withgoogle.com/guidebook", "https://arxiv.org/abs/2602.07283"]) assert.ok(urls.has(u), u);
  });

  // @covers US-076-AC5
  test("AC5: AGENTS.md and the skill list the AI rule IDs by role and say to declare each screen's role in the blueprint", () => {
    for (const p of ["packages/ui/AGENTS.md", "packages/ui/skill/ux-builder-ui/SKILL.md"]) {
      const text = read(p);
      const section = text.split("### AI and agent screens")[1]?.split("\n### ")[0];
      assert.ok(section, `${p} has the AI and agent screens section`);
      assert.match(section, /Declare each screen's AI role in the blueprint/);
      for (const role of cat.interaction.aiRoles) {
        const line = section.split("\n").find((l) => l.startsWith(`- **${role}**:`));
        assert.ok(line, `${p} lists the ${role} rules`);
        const listed = [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
        assert.deepEqual(listed, AI.filter((r) => r.when?.aiRole?.includes(role)).map((r) => r.id), `${p}: ${role}`);
      }
      for (const m of ['data-piq-ai="generated"', 'data-piq-ai="status"', 'data-piq-ai="plan"', 'data-piq-ai="approval"', "data-piq-ai-actor", "data-piq-ai-label"]) assert.ok(section.includes(m), `${p} names ${m}`);
      assert.match(text.replace(/\s+/g, " "), /not affiliated with or endorsed by Microsoft/);
    }
  });
});

/* ------------------------------------------------- the blueprint's ai */
const app = (screens, over = {}) => ({ ...skeleton("app"), destinations: [{ id: "home", label: "Home", screen: screens[0].id }], screens, ...over });
const screen = (ai, over = {}) => ({ id: "assist", title: "Assistant", pattern: "FormPage", ai, ...over });
const ids = (fs) => fs.map((f) => f.rule);
const only = (fs, rule) => fs.filter((f) => f.rule === rule);

describe("US-077: plan an AI screen in the blueprint", () => {
  // @covers US-077-AC1
  test("AC1: an agent that acts with no high-impact action listed is a warning asking to list them or set acts to false", () => {
    const f = checkBlueprint(app([screen({ roles: ["agent"], acts: true })]));
    assert.deepEqual(f.map((x) => [x.rule, x.severity, x.path]), [["agent.declare-high-impact", "warning", "/screens/0/ai"]]);
    assert.match(f[0].fix, /highImpactActions/);
    assert.match(f[0].fix, /set acts to false/);
    assert.deepEqual(checkBlueprint(app([screen({ roles: ["agent"], acts: false })])), [], "an agent that does not act");
    assert.deepEqual(checkBlueprint(app([screen({ roles: ["agent"], acts: true, highImpactActions: [{ label: "Pay", approval: "each" }] })])), []);
    assert.deepEqual(checkBlueprint(app([screen({ roles: ["assistant"], acts: true })])), [], "the rule is for agent screens");
  });

  // @covers US-077-AC2
  test("AC2: a high-impact action with approval none, or none given, is a warning naming it; each and plan pass", () => {
    const f = checkBlueprint(app([screen({ roles: ["agent"], acts: true, highImpactActions: [{ label: "Pay invoice", approval: "none" }, { label: "Send email" }, { label: "Book", approval: "each" }, { label: "Publish", approval: "plan" }] })]));
    assert.deepEqual(f.map((x) => [x.rule, x.severity, x.path]), [
      ["agent.approve-high-impact", "warning", "/screens/0/ai/highImpactActions/0"],
      ["agent.approve-high-impact", "warning", "/screens/0/ai/highImpactActions/1"],
    ]);
    assert.match(f[0].message, /Pay invoice/);
    assert.match(f[1].message, /Send email/);
    assert.match(f[0].fix, /"each"[\s\S]*"plan"/);
  });

  // @covers US-077-AC3
  test("AC3: a generative add-on with no fallback asks for the screen that does the job without AI", () => {
    const f = checkBlueprint(app([screen({ roles: ["generative"] })]));
    assert.deepEqual(f.map((x) => [x.rule, x.severity, x.path]), [["ai.fallback", "warning", "/screens/0/ai"]]);
    assert.match(f[0].fix, /without AI/);
    assert.deepEqual(ids(checkBlueprint(app([screen({ roles: ["generative"], essential: false })]))), ["ai.fallback"], "essential false is an add-on");
    assert.deepEqual(checkBlueprint(app([screen({ roles: ["generative"], essential: true })])), [], "the AI is the task");
    const two = [screen({ roles: ["generative"], fallback: "manual" }), { id: "manual", title: "Write it yourself", pattern: "FormPage" }];
    assert.deepEqual(checkBlueprint(app(two)), [], "a fallback screen");
    assert.deepEqual(checkBlueprint(app([screen({ roles: ["generative"], fallback: "home" })])), [], "or a destination");
    const wrong = checkBlueprint(app([screen({ roles: ["generative"], fallback: "nowhere" })]));
    assert.deepEqual(wrong.map((x) => [x.rule, x.path]), [["ai.fallback", "/screens/0/ai/fallback"]]);
  });

  // @covers US-077-AC4
  test("AC4: data that leaves the device with no consent screen or modal is a warning", () => {
    const f = checkBlueprint(app([screen({ roles: ["assistant"], dataLeavesDevice: true })]));
    assert.deepEqual(f.map((x) => [x.rule, x.severity, x.path]), [["ai.consent", "warning", "/screens/0/ai"]]);
    const modal = { id: "consent", title: "Share your data?", kind: "dialog", dismiss: "cancel" };
    assert.deepEqual(checkBlueprint(app([screen({ roles: ["assistant"], dataLeavesDevice: true, consent: "consent" }, { modals: [modal] })])), [], "a consent modal");
    assert.deepEqual(checkBlueprint(app([screen({ roles: ["assistant"], dataLeavesDevice: true, consent: "assist" })])), [], "or a screen");
    assert.deepEqual(ids(checkBlueprint(app([screen({ roles: ["assistant"], dataLeavesDevice: true, consent: "gone" })]))), ["ai.consent"], "consent that names nothing");
    assert.deepEqual(checkBlueprint(app([screen({ roles: ["assistant"], dataLeavesDevice: false })])), []);
  });

  // @covers US-077-AC5
  test("AC5: a blueprint with no ai gives exactly the findings it gave before this feature, byte for byte", () => {
    const { cases } = JSON.parse(read("packages/ui/test/fixtures/pre-ai-findings.json"));
    assert.ok(cases.length >= 10 && cases.some((c) => c.findings.length > 20));
    for (const c of cases) assert.equal(JSON.stringify(checkBlueprint(c.blueprint)), JSON.stringify(c.findings), c.name);
  });

  // @covers US-077-AC6
  test("AC6: an unknown field or role in ai is a blueprint.valid error naming it", () => {
    const f = checkBlueprint(app([screen({ roles: ["agent", "chatbot"], acts: false, mood: "cheerful" })]));
    assert.deepEqual(f.map((x) => [x.rule, x.severity, x.path]), [["blueprint.valid", "error", "/screens/0/ai/mood"], ["blueprint.valid", "error", "/screens/0/ai/roles/1"]]);
    assert.match(f[0].message, /"mood"/);
    assert.match(f[1].message, /"chatbot"/);
    assert.deepEqual(ids(checkBlueprint(app([screen({ acts: true })]))), ["blueprint.valid"], "roles is required");
    assert.deepEqual(ids(checkBlueprint(app([screen({ roles: [] })]))), ["blueprint.valid"], "and not empty");
    assert.deepEqual(ids(checkBlueprint(app([screen({ roles: ["agent"], highImpactActions: [{ label: "Pay", approval: "maybe" }] })]))), ["blueprint.valid"]);
  });

  test("a screen with two roles gets both families; the rules are warnings", () => {
    const f = checkBlueprint(app([screen({ roles: ["generative", "agent"], acts: true, dataLeavesDevice: true })]));
    assert.deepEqual(ids(f), ["agent.declare-high-impact", "ai.consent", "ai.fallback"]);
    assert.ok(f.every((x) => x.severity === "warning"));
  });
});

describe("US-080: a chat that renders UI inline (blueprint part)", () => {
  // @covers US-080-AC1
  test("AC1: an inline pattern's own rules apply at the conversation region's size classes, and point to the screen", () => {
    // CollectionList is a data pattern (screen.states): rendered inline, its states are the screen's.
    const chat = (ai, over) => app([{ id: "chat", title: "Ask", pattern: "FormPage", ai: { roles: ["generative"], essential: true, ...ai }, ...over }]);
    const f = checkBlueprint(chat({ renders: ["CollectionList"] }));
    assert.deepEqual(f.map((x) => [x.rule, x.severity, x.path]), [["screen.states", "warning", "/screens/0/ai/renders/0"]]);
    assert.match(f[0].message, /CollectionList, rendered inline on "Ask" at compact and medium/, "the default region: compact and medium");
    assert.match(checkBlueprint(chat({ renders: ["CollectionList"], region: ["expanded"] }))[0].message, /at expanded/, "ai.region sets the size classes");
    assert.deepEqual(checkBlueprint(chat({ renders: ["CollectionList"] }, { states: ["empty", "loading", "error"] })), [], "the screen declares the states");
    assert.deepEqual(checkBlueprint(chat({ renders: ["Wizard", "DataTable"] })), [], "patterns with no blueprint rule of their own");
    // In a view, a shell pattern inline breaks the view's own rule.
    const v = { ...skeleton("view") };
    v.screens = [{ ...v.screens[0], ai: { roles: ["generative"], essential: true, renders: ["AppShell"] } }];
    assert.deepEqual(checkBlueprint(v).map((x) => [x.rule, x.severity, x.path]), [["view.no-shell", "warning", "/screens/0/ai/renders/0"]]);
  });

  // @covers US-080-AC2
  test("AC2: an inline pattern that is not renderable is a warning naming it", () => {
    const chat = (renders) => app([{ id: "chat", title: "Ask", pattern: "FormPage", ai: { roles: ["assistant"], renders } }]);
    const f = only(checkBlueprint(chat(["Wizard", "ListDetail", "DataTable", "Wizzard"])), "genui.renderable");
    assert.deepEqual(f.map((x) => [x.severity, x.path]), [["warning", "/screens/0/ai/renders/1"], ["warning", "/screens/0/ai/renders/3"]]);
    assert.match(f[0].message, /ListDetail is not renderable/);
    assert.match(f[0].fix, /artifact pane/);
    assert.match(f[1].fix, /Did you mean "Wizard"/);
    assert.deepEqual(checkBlueprint(chat(["Wizard", "FormPage", "DataTable", "Card"])), []);
  });
});

describe("FEAT-011 non-functional: AI fields keep the check fast and deterministic", () => {
  // @covers US-053-AC8
  test("a 50-screen blueprint with ai on every screen is checked in under one second, the same each time", () => {
    const screens = Array.from({ length: 50 }, (_, i) => ({
      id: `screen-${i}`, title: `Screen ${i}`, pattern: ["CollectionList", "RecordDetail", "WorkQueue", "SettingsPage", "FormPage"][i % 5], states: ["empty", "loading", "error"],
      ai: { roles: [["generative", "assistant", "agent"][i % 3]], acts: i % 2 === 0, highImpactActions: [{ label: "Send", approval: i % 4 ? "each" : "none" }], renders: ["Wizard", "CollectionList", i % 7 ? "DataTable" : "ListDetail"], dataLeavesDevice: true, consent: `consent-${i}`, fallback: "screen-0" },
      modals: [{ id: `consent-${i}`, title: "Share?", kind: "dialog", dismiss: "cancel" }],
    }));
    const bp = app(screens, { destinations: screens.slice(0, 5).map((s) => ({ id: s.id, label: s.title, screen: s.id })) });
    const start = performance.now();
    const first = checkBlueprint(bp);
    const ms = performance.now() - start;
    assert.ok(ms < 1000, `took ${ms.toFixed(1)} ms`);
    assert.ok(first.length > 10 && first.every((f) => f.severity === "warning"));
    assert.equal(JSON.stringify(checkBlueprint(structuredClone(bp))), JSON.stringify(first));
  });
});
