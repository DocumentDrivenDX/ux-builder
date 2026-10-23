---
ddx:
  id: STP-128
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-128
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-128-accept-simplifications-of-the-task-model

## Story Reference

**User Story**: [[US-128-accept-simplifications-of-the-task-model]] (Accept simplifications of the task model)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-128's criteria with fixtures only: no network, no model, no browser unless a row says so.
**Blocking Gate**: `npm test --workspace @ux-builder/ui`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-128-AC1 | Given a fixture task model seeded with an inferable input, a defaultable decision, two combinable steps and a navigation hop that can be removed, when `ux-builder-blueprint simplify --json` runs, then it returns one proposal for each seeded opportunity, each with its task, kind, what it saves and what it assumes. | `us-128-ac1` | It returns one proposal for each seeded opportunity, each with its task, kind, what it saves and what it assumes | `@covers US-128-AC1` | Unit | `packages/ui/test/blueprint-simplify.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |
| US-128-AC2 | Given an input listed in `inputs.required` that another task's `systemActions` already produces, when `simplify` runs, then it proposes moving it to `inputs.optional` as inferable. | `us-128-ac2` | It proposes moving it to `inputs.optional` as inferable | `@covers US-128-AC2` | Unit | `packages/ui/test/blueprint-simplify.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |
| US-128-AC3 | Given the same blueprint twice, when `simplify` runs both times, then the outputs are identical. | `us-128-ac3` | The outputs are identical | `@covers US-128-AC3` | Unit | `packages/ui/test/blueprint-simplify.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |
| US-128-AC4 | Given any blueprint, when `simplify` runs, then the blueprint file is unchanged afterwards. | `us-128-ac4` | The blueprint file is unchanged afterwards | `@covers US-128-AC4` | Unit | `packages/ui/test/blueprint-simplify.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |
| US-128-AC5 | Given a blueprint with no `tasks`, when `simplify` runs, then it exits 0 and says there is no task model to simplify. | `us-128-ac5` | It exits 0 and says there is no task model to simplify | `@covers US-128-AC5` | Unit | `packages/ui/test/blueprint-simplify.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |

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
