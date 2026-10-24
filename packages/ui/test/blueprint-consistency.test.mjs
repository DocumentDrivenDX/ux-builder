/* One kind of interaction, one pattern (US-133; FEAT-018 GDL-34).

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkBlueprint } from "../blueprint/index.mjs";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const st = ["empty", "loading", "error"];
/* Tasks that each choose a location, on a screen of the given pattern. */
function bp(patterns) {
  const screens = patterns.map((p, i) => ({ id: `where-${i + 1}`, title: `Where ${i + 1}`, pattern: p, states: st, purpose: "Choose a place", interactionKinds: ["choose-location"] }));
  return {
    version: 1, kind: "app", name: "rivers", supports: { sizeClasses: ["compact"], inputs: ["coarse"] },
    destinations: screens.map((s) => ({ id: `d-${s.id}`, label: s.title, screen: s.id })),
    screens,
    tasks: patterns.map((_, i) => ({ id: `T-${i + 1}`, goal: `Task ${i + 1}`, success: [`US-00${i + 1}-AC1`], interactionKinds: ["choose-location"] })),
    journeys: patterns.map((_, i) => ({ id: `J-t${i + 1}`, story: `US-00${i + 1}`, task: `T-${i + 1}`, entry: `where-${i + 1}`, steps: [{ screen: `where-${i + 1}` }] })),
  };
}
const consistency = (b) => checkBlueprint(b).filter((f) => f.rule === "consistency.same-kind");

describe("US-133: consistency", () => {
  // @covers US-133-AC1
  test("AC1: two tasks reaching the same kind through different patterns: the rule, both tasks, both screens and the recommended pattern", () => {
    const [f] = consistency(bp(["FormPage", "CollectionList"]));
    assert.equal(f.severity, "warning");
    assert.equal(f.message, "T-2 handles choose-location on where-2 (CollectionList), but T-1 handles it on where-1 (FormPage).");
    assert.equal(f.fix, "Use FormPage for choose-location on where-2 too, so people learn it once.");
  });

  // @covers US-133-AC2
  test("AC2: three tasks, two on one pattern: the pattern used by two is recommended", () => {
    const f = consistency(bp(["CollectionList", "FormPage", "FormPage"]));
    assert.equal(f.length, 1);
    assert.match(f[0].message, /^T-1 handles choose-location on where-1 \(CollectionList\), but T-2 handles it on where-2 \(FormPage\)\.$/);
    assert.match(f[0].fix, /^Use FormPage /);
  });

  // @covers US-133-AC3
  test("AC3: tasks sharing a kind on the same pattern: no finding", () => {
    assert.deepEqual(consistency(bp(["FormPage", "FormPage"])), []);
  });

  // @covers US-133-AC4
  test("AC4: the rule has an ID, a statement in ux-builder's words and a cited source, and passes npm run rules' checks", async () => {
    const rules = JSON.parse(readFileSync(`${ROOT}guidelines/rules.json`, "utf8"));
    const r = rules.rules.find((x) => x.id === "consistency.same-kind");
    assert.ok(r.statement.length > 40);
    assert.ok(r.sources.length >= 1 && r.sources.every((s) => s.wording === "paraphrased"));
    const { checkRules, known, NOTICES } = await import(`${ROOT}tools/check-rules.mjs`);
    const problems = checkRules({ rules, recipes: JSON.parse(readFileSync(`${ROOT}guidelines/recipes.json`, "utf8")), notices: readFileSync(`${ROOT}${NOTICES}`, "utf8") }, await known());
    assert.deepEqual(problems.filter((p) => p.includes("consistency.same-kind")), []);
  });
});
