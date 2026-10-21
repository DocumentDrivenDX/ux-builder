/* Screen flows and journeys in the blueprint (FEAT-012; US-086, US-087;
   ADR-030; CONTRACT-005 Flows and journeys).

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { blueprintSchema, checkBlueprint, skeleton } from "@ux-builder/ui/blueprint";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const ids = (fs) => fs.map((f) => f.rule);
const valid = (fs) => fs.filter((f) => f.rule === "blueprint.valid");

/* CONTRACT-005's Flows and journeys examples: a screen with actions, and a journey. */
const examples = () => [...read("docs/helix/02-design/contracts/CONTRACT-005-interaction-rules-and-blueprint.md").split("## Flows and journeys")[1].split("\n## ")[0].matchAll(/```json\n([\s\S]*?)```/g)].map((m) => JSON.parse(m[1]));
const withExamples = () => {
  const [screen, journey] = examples();
  return {
    ...skeleton("app"), name: "Time review",
    destinations: [{ id: "queue", label: "Review", screen: "queue" }],
    screens: [{ ...screen, states: ["empty", "loading", "error"], modals: [{ id: "reject-reason", title: "Reject entry", kind: "dialog", dismiss: "cancel" }] },
      { id: "entry", title: "Entry", pattern: "RecordDetail", states: ["empty", "loading", "error"] }],
    journeys: [journey],
  };
};

describe("FEAT-012 FLW-01, JRN-01: actions, modal actions and journeys in the schema", () => {
  test("CONTRACT-005's Flows and journeys examples validate, by the check and as JSON Schema", () => {
    const [screen, journey] = examples();
    assert.ok(screen.actions?.length === 4 && journey.id === "J-review-entry", "the contract has both examples");
    const bp = withExamples();
    assert.deepEqual(valid(checkBlueprint(bp)), []);
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    const v = ajv.compile(blueprintSchema);
    assert.ok(v(bp), JSON.stringify(v.errors));
  });

  test("actions take only CONTRACT-005's fields: destructive and highImpact are their enums", () => {
    const bp = withExamples();
    bp.screens[0].actions.push({ id: "pay", label: "Pay", to: "queue", destructive: true, highImpact: "always", colour: "red" });
    const f = valid(checkBlueprint(bp));
    assert.deepEqual(f.map((x) => x.path), ["/screens/0/actions/4/colour", "/screens/0/actions/4/destructive", "/screens/0/actions/4/highImpact"]);
    assert.match(f[1].message, /must be one of "undo", "confirm", "none"/);
    assert.match(f[2].message, /must be one of "each", "plan", "none"/);
    const noTo = withExamples();
    noTo.screens[0].actions[0] = { id: "open", label: "Open entry" };
    assert.deepEqual(valid(checkBlueprint(noTo)).map((x) => [x.path, x.message]), [["/screens/0/actions/0", '/screens/0/actions/0 needs "to".']]);
  });

  test("modals take actions too", () => {
    const bp = withExamples();
    bp.screens[0].modals[0].actions = [{ id: "confirm", label: "Reject", to: "back", destructive: "undo" }];
    assert.deepEqual(valid(checkBlueprint(bp)), []);
    bp.screens[0].modals[0].actions.push({ id: "confirm", label: "Again", to: "back", extra: 1 });
    assert.deepEqual(valid(checkBlueprint(bp)).map((x) => x.path), ["/screens/0/modals/0/actions/1/extra", "/screens/0/modals/0/actions/1/id"]);
  });

  test("journeys: J- IDs, US- stories and AC IDs, steps with known states, alternates from a step index, scenarios", () => {
    const bp = withExamples();
    bp.journeys.push({
      id: "review", story: "US12", criteria: ["US-012-1"], entry: "queue",
      steps: [{ screen: "queue", state: "busy", scenario: "scary" }],
      alternates: [{ from: -1, steps: [] }],
    });
    const f = valid(checkBlueprint(bp));
    assert.deepEqual(f.map((x) => x.path), [
      "/journeys/1/alternates/0/from", "/journeys/1/alternates/0/steps", "/journeys/1/criteria/0", "/journeys/1/id",
      "/journeys/1/steps/0/scenario", "/journeys/1/steps/0/state", "/journeys/1/story",
    ]);
    assert.match(f.find((x) => x.path === "/journeys/1/id").message, /"review"; it must match/);
    const ok = withExamples();
    ok.journeys[0].alternates[0] = { ...ok.journeys[0].alternates[0], reason: "The entry is wrong", scenario: "errorProne" };
    ok.journeys[0].steps[1].scenario = "risky";
    assert.deepEqual(valid(checkBlueprint(ok)), []);
    const twice = withExamples();
    twice.journeys.push(structuredClone(twice.journeys[0]));
    assert.deepEqual(valid(checkBlueprint(twice)).map((x) => [x.path, x.message]), [["/journeys/1/id", 'Journey ID "J-review-entry" is used twice.']]);
    const missing = withExamples();
    missing.journeys = [{ id: "J-x" }];
    assert.deepEqual(ids(valid(checkBlueprint(missing))).length, 3, "story, entry and steps are required");
  });
});
