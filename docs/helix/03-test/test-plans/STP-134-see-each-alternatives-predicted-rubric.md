---
ddx:
  id: STP-134
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-134
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-134-see-each-alternatives-predicted-rubric

## Story Reference

**User Story**: [[US-134-see-each-alternatives-predicted-rubric]] (See each alternative's predicted rubric)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-134's criteria with fixtures only: no network, no model, no browser unless a row says so.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-134-AC1 | Given `guidelines/rubric.json`, when it is validated against its schema, then it holds exactly the nine dimensions, each with an ID, a question, measures and at least one cited source, with `task-effectiveness` and `accessibility` marked baseline. | `us-134-ac1` | It holds exactly the nine dimensions, each with an ID, a question, measures and at least one cited source, with `task-effectiveness` and `accessibility` marked baseline | `@covers US-134-AC1` | Unit | `packages/design/test/rubric.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-134-AC2 | Given an alternative with scores, audit results and recorded judgments, when `ux-builder-design rubric --alternative <name> --json` runs, then each dimension shows a predicted value and its basis: `computed` with the measures used, or `judgment` with the reasoning. | `us-134-ac2` | Each dimension shows a predicted value and its basis: `computed` with the measures used, or `judgment` with the reasoning | `@covers US-134-AC2` | Unit | `packages/design/test/rubric.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-134-AC3 | Given a dimension with no computed measure and no recorded judgment, when `rubric` runs, then that dimension shows `to validate`, never an estimate. | `us-134-ac3` | That dimension shows `to validate`, never an estimate | `@covers US-134-AC3` | Unit | `packages/design/test/rubric.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-134-AC4 | Given any alternative, when `rubric --json` runs, then the output contains no overall or average score. | `us-134-ac4` | The output contains no overall or average score | `@covers US-134-AC4` | Unit | `packages/design/test/rubric.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-134-AC5 | Given an alternative that fails a baseline dimension, when `rubric` runs, then it is marked not recommendable, naming the baseline it fails, whatever its other values. | `us-134-ac5` | It is marked not recommendable, naming the baseline it fails, whatever its other values | `@covers US-134-AC5` | Unit | `packages/design/test/rubric.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |

## Executable Proof

```bash
npm test --workspace @ux-builder/design
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
