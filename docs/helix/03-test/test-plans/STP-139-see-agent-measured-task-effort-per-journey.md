---
ddx:
  id: STP-139
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-139
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-139-see-agent-measured-task-effort-per-journey

## Story Reference

**User Story**: [[US-139-see-agent-measured-task-effort-per-journey]] (See agent-measured task effort per journey)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-139's criteria on fixtures: a fixture app, blueprint and design state, with no network, no model and no real participants.
**Blocking Gate**: `npm test --workspace @ux-builder/audit`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-139-AC1 | Given a walked journey in a fixture run, when the run's records are collected, then `metrics.json` holds, for the journey, completion, interactions taken, the blueprint's shortest path length, the path taken, backtracks, failed actions, information not found, interface errors and time per step. | `us-139-ac1` | `metrics.json` holds, for the journey, completion, interactions taken, the blueprint's shortest path length, the path taken, backtracks, failed actions, information not found, interface errors and time per step | `@covers US-139-AC1` | Unit | `packages/audit/test/assess-metrics.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-139-AC2 | Given a fixture walk that revisits a screen, when metrics are computed, then the backtrack count and the extra interactions over the shortest path match the fixture. | `us-139-ac2` | The backtrack count and the extra interactions over the shortest path match the fixture | `@covers US-139-AC2` | Unit | `packages/audit/test/assess-metrics.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-139-AC3 | Given any report that shows task metrics, when it is rendered, then each metric is labelled `agent-measured` and the report states that agents navigate differently from people. | `us-139-ac3` | Each metric is labelled `agent-measured` and the report states that agents navigate differently from people | `@covers US-139-AC3` | Unit | `packages/audit/test/assess-metrics.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-139-AC4 | Given a journey the agent could not complete, when metrics are computed, then completion is false and the step where it stopped is named. | `us-139-ac4` | Completion is false and the step where it stopped is named | `@covers US-139-AC4` | Unit | `packages/audit/test/assess-metrics.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |

## Executable Proof

```bash
npm test --workspace @ux-builder/audit
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network, a model or real participants
