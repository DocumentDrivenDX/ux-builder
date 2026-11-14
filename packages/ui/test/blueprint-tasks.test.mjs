/* The task model in the blueprint (US-127; FEAT-018 GDL-22, GDL-23, GDL-25;
   CONTRACT-005 as amended by CONTRACT-008).

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { checkBlueprint } from "../blueprint/index.mjs";

const SKILL = readFileSync(new URL("../../design/skill/ux-builder-design/SKILL.md", import.meta.url), "utf8");
const TASK = {
  id: "T-1", goal: "Find a suitable river", jobs: ["J-1"], trigger: "Planning a trip",
  inputs: { required: ["location"], optional: ["activity"] }, systemActions: ["Sort rivers by distance"], userActions: ["Choose a river"],
  success: ["US-001-AC1"], exceptions: ["No river within range"], subtasks: [{ goal: "Establish where", ways: ["Use current location", "Enter destination", "Explore without location"] }],
  interactionKinds: ["choose-location"],
};
const bp = (extra = {}) => ({
  version: 1, kind: "app", name: "rivers",
  supports: { sizeClasses: ["compact", "expanded"], inputs: ["coarse", "fine"] },
  destinations: [{ id: "find", label: "Find", screen: "map" }],
  screens: [{ id: "map", title: "Map", pattern: "CollectionList", states: ["empty", "loading", "error"], actions: [{ id: "open", label: "Open", to: "detail", primary: true }] }, { id: "detail", title: "River", pattern: "RecordDetail", states: ["empty", "loading", "error"] }],
  journeys: [{ id: "J-find", story: "US-001", task: "T-1", entry: "map", steps: [{ screen: "map", action: "open" }, { screen: "detail" }] }],
  tasks: [TASK],
  ...extra,
});
const rules = (f, prefix) => f.filter((x) => x.rule.startsWith(prefix));

describe("US-127: tasks", () => {
  // @covers US-127-AC1
  test("AC1: tasks with every field validate with no errors", () => {
    const f = checkBlueprint(bp());
    assert.deepEqual(f.filter((x) => x.severity === "error"), []);
    assert.deepEqual(rules(f, "task.").concat(rules(f, "journey.task")), []);
  });

  // @covers US-127-AC2
  test("AC2: a task missing goal or success, or with a bad ID, is an error naming the task and the field", () => {
    const { goal, success, ...rest } = TASK;
    const f = checkBlueprint(bp({ tasks: [{ ...rest, success }, { ...rest, id: "T-2", goal: "x" }, { ...TASK, id: "Task 3!" }] }));
    const msgs = f.filter((x) => x.rule === "blueprint.valid").map((x) => x.message);
    assert.ok(msgs.includes('Task T-1 (/tasks/0) needs "goal".'), msgs.join("\n"));
    assert.ok(msgs.includes('Task T-2 (/tasks/1) needs "success".'), msgs.join("\n"));
    assert.ok(msgs.some((m) => m.startsWith("Task Task 3! (/tasks/2/id)")), msgs.join("\n"));
  });

  // @covers US-127-AC3
  test("AC3: a journey naming a task the blueprint lacks is an error naming the journey and the task", () => {
    const b = bp();
    b.journeys[0].task = "T-9";
    const f = rules(checkBlueprint(b), "journey.task-exists");
    assert.equal(f.length, 1);
    assert.equal(f[0].severity, "error");
    assert.match(f[0].message, /^J-find realizes T-9, which is not one of the blueprint's tasks\./);
  });

  // @covers US-127-AC4
  test("AC4: a task no journey realizes is a warning naming the task", () => {
    const b = bp({ tasks: [TASK, { ...TASK, id: "T-2", goal: "Save a river" }] });
    const f = rules(checkBlueprint(b), "task.realized");
    assert.deepEqual(f.map((x) => [x.severity, x.message]), [["warning", 'T-2 ("Save a river") is realized by no journey.']]);
  });

  // @covers US-127-AC5
  test("AC5: a blueprint with no tasks reports nothing new", () => {
    const b = bp();
    delete b.tasks;
    delete b.journeys[0].task;
    const f = checkBlueprint(b);
    assert.deepEqual(rules(f, "task.").concat(rules(f, "journey.task")), []);
    assert.deepEqual(f.filter((x) => x.severity === "error"), []);
  });

  // @covers US-127-AC6
  test("AC6: the skill drafts tasks from the jobs and stories and has the person confirm the essential goals before Explore, recorded in the state", () => {
    const s = SKILL.slice(SKILL.indexOf("## Model tasks"), SKILL.indexOf("## Checkpoints"));
    assert.match(s, /Draft the task model from the jobs and the stories/);
    assert.match(s, /Before Explore, ask the person to confirm the essential goals/);
    assert.match(s, /state checkpoint core-1 --answer/);
  });
});
