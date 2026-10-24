---
ddx:
  id: STP-127
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-127
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-127-model-tasks-in-the-blueprint

## Story Reference

**User Story**: [[US-127-model-tasks-in-the-blueprint]] (Model tasks in the blueprint)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-127's criteria with fixtures only: no network, no model, no browser unless a row says so.
**Blocking Gate**: `npm test --workspace @ux-builder/ui`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-127-AC1 | Given a blueprint with `tasks[]` holding every field above, when `ux-builder-blueprint check` runs, then it validates against the amended schema with no errors. | `us-127-ac1` | It validates against the amended schema with no errors | `@covers US-127-AC1` | Unit | `packages/ui/test/blueprint-tasks.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |
| US-127-AC2 | Given a task missing `goal` or `success`, or with an ID not matching `T-<n>`, when `check` runs, then it reports an error naming the task and the field. | `us-127-ac2` | It reports an error naming the task and the field | `@covers US-127-AC2` | Unit | `packages/ui/test/blueprint-tasks.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |
| US-127-AC3 | Given a journey whose `task` names a task the blueprint lacks, when `check` runs, then it reports an error naming the journey and the task. | `us-127-ac3` | It reports an error naming the journey and the task | `@covers US-127-AC3` | Unit | `packages/ui/test/blueprint-tasks.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |
| US-127-AC4 | Given a task that no journey realizes, when `check` runs, then it reports a warning naming the task. | `us-127-ac4` | It reports a warning naming the task | `@covers US-127-AC4` | Unit | `packages/ui/test/blueprint-tasks.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |
| US-127-AC5 | Given a blueprint with no `tasks`, when `check` runs, then it reports nothing new, so existing blueprints still pass. | `us-127-ac5` | It reports nothing new, so existing blueprints still pass | `@covers US-127-AC5` | Unit | `packages/ui/test/blueprint-tasks.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |
| US-127-AC6 | Given a created app, when the skill's task-modelling section is read, then it tells the agent to draft tasks from the jobs and stories and to ask the human to confirm the essential goals before Explore, recording the answer in the design state. | `us-127-ac6` | It tells the agent to draft tasks from the jobs and stories and to ask the human to confirm the essential goals before Explore, recording the answer in the design state | `@covers US-127-AC6` | Content | `packages/ui/test/blueprint-tasks.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |

## Executable Proof

```bash
npm test --workspace @ux-builder/ui
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
