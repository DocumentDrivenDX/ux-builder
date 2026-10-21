/* The AI and agent experience rules, and the blueprint's AI checks (FEAT-011;
   US-076, US-077, US-080; SD-005; CONTRACT-005 AI and agent experience).

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { rulesFor } from "@ux-builder/ui/blueprint";

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
