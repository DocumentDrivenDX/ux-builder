/* Tasks in the feature's Task Model (US-127-AC7; FEAT-018 GDL-22; ADR-042).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { currentText, sectionOf, taskModel, validate } from "../index.mjs";
import { cli } from "./helpers.mjs";
import { KIT_BP, kitApp } from "./kit-fixture.mjs";

const FEAT = "docs/helix/01-frame/features/FEAT-001-rivers.md";
const json = (a, args) => { const r = cli(a, [...args, "--json"]); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };
function featureApp() {
  const a = kitApp();
  writeFileSync(join(a, ".helix.yml"), "flows:\n  - id: helix\n    root: docs/helix/\n");
  mkdirSync(join(a, "docs/helix/01-frame/features"), { recursive: true });
  writeFileSync(join(a, FEAT), "---\nddx:\n  id: FEAT-001\n  type: feature-specification\n---\n\n# FEAT-001: Rivers\n\n## Functional Areas\n\n- Finding rivers\n\n## Requirements\n\n- FR-1\n");
  json(a, ["segment", "add", "--user", "Weekend anglers", "--context", "On a phone at the riverbank", "--need", "Find a river"]);
  return a;
}

describe("US-127: tasks in the Task Model", () => {
  // @covers US-127-AC7
  test("AC7: task add proposes a row of the feature's Task Model with its goal, users and needs by name, rules, what realizes it and its key; unknown users, needs or features are refused", () => {
    const a = featureApp();
    const r = json(a, ["task", "add", "--feature", "FEAT-001", "--task", "Find a river to fish", "--goal", "A river with public access this weekend", "--user", "Weekend anglers", "--need", "Find a river", "--business-rule", "BR-1", "--realized-by", "J-find"]);
    assert.deepEqual({ task: r.task, key: r.key, feature: r.feature, path: r.path }, { task: "Find a river to fish", key: "find-a-river-to-fish", feature: "FEAT-001", path: FEAT });
    assert.ok(!readFileSync(join(a, FEAT), "utf8").includes("Task Model"), "HELIX is written only by applying the proposal");
    const text = currentText(a, FEAT).text;
    assert.match(text, /## Functional Areas\n\n- Finding rivers\n\n## Task Model\n\n/, "after Functional Areas");
    assert.equal(sectionOf(text, "Task Model"), "| Task | Goal | Users | Needs | Rules | Realized by | Key |\n|---|---|---|---|---|---|---|\n| Find a river to fish | A river with public access this weekend | Weekend anglers | Find a river | BR-1 | J-find | find-a-river-to-fish |");
    assert.deepEqual(Object.keys(taskModel(a)), ["find-a-river-to-fish"]);
    assert.match(cli(a, ["task", "add", "--feature", "FEAT-001", "--task", "x", "--goal", "y", "--user", "Guides"]).stderr, /no user "Guides" in the PRD's User Segments/);
    assert.match(cli(a, ["task", "add", "--feature", "FEAT-001", "--task", "x", "--goal", "y", "--need", "Rate rivers"]).stderr, /no need "Rate rivers" in its User Needs/);
    assert.match(cli(a, ["task", "add", "--feature", "FEAT-009", "--task", "x", "--goal", "y"]).stderr, /no feature specification FEAT-009: name one with --feature \(FEAT-001\)/);
    // A blueprint task that is not a Task Model row is warned about; one named by its key is not.
    const bp = structuredClone(KIT_BP);
    writeFileSync(join(a, "docs/ux-builder/blueprint/app.blueprint.json"), JSON.stringify(bp));
    assert.ok(validate(a).warnings.some((w) => w.message.startsWith("task T-1 is not a row of a feature's Task Model: name it by its Task Model key (find-a-river-to-fish)")));
    bp.tasks[0].id = "find-a-river-to-fish"; bp.journeys[0].task = "find-a-river-to-fish";
    writeFileSync(join(a, "docs/ux-builder/blueprint/app.blueprint.json"), JSON.stringify(bp));
    assert.ok(!validate(a).warnings.some((w) => w.message.startsWith("task find-a-river-to-fish")));
  });
});
