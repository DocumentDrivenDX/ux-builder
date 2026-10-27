---
ddx:
  id: STP-154
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-154
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-154-the-intake-asked-together-the-budget-shown-and-the-guide-s-own-time-measured

## Story Reference

**User Story**: [[US-154-the-intake-asked-together-the-budget-shown-and-the-guide-s-own-time-measured]]
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-154's criteria with fixtures only: no network, no model, no browser.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-154-AC1 | Given an app, when `intake` runs, then it lists the intake questions the brief, HELIX's PRD, the users and jobs tables, evidence and the app's code do not answer, to ask together, and those they answer, to confirm; and the skill asks the intake together. | `us-154-ac1` | It lists the intake questions the brief, HELIX's PRD, the users and jobs tables, evidence and the app's code do not answer, to ask together, and those they answer, to confirm; and the skill asks the intake together | `@covers US-154-AC1` | Integration | `packages/design/test/human-time.test.mjs` | Fixture apps in temp folders; timestamps given; no network, no model | Built |
| US-154-AC2 | Given a design state, when `status` or `intake` runs, then it gives the decisions left before the first prototype (a table per foundation kind still to approve, core-1, the choice at core-2, the coverage map, the modality) and the minutes they take at three each, falling as they are made. | `us-154-ac2` | It gives the decisions left before the first prototype (a table per foundation kind still to approve, core-1, the choice at core-2, the coverage map, the modality) and the minutes they take at three each, falling as they are made | `@covers US-154-AC2` | Integration | `packages/design/test/human-time.test.mjs`, `packages/design/test/status.test.mjs` | Fixture apps in temp folders; timestamps given; no network, no model | Built |
| US-154-AC3 | Given approvals, checkpoints, steps and turns recorded, when `metrics` runs, then it reports turns by kind, the share that are new information or decisions, approvals before testing, approvals reopened and carried, minutes to the first prototype (gaps over 10 minutes idle) and each target met or missed; an unknown turn kind exits 2; and the skill records each turn. | `us-154-ac3` | It reports turns by kind, the share that are new information or decisions, approvals before testing, approvals reopened and carried, minutes to the first prototype (gaps over 10 minutes idle) and each target met or missed; an unknown turn kind exits 2; and the skill records each turn | `@covers US-154-AC3` | Integration | `packages/design/test/human-time.test.mjs` | Fixture apps in temp folders; timestamps given; no network, no model | Built |

## Executable Proof

```bash
npm test --workspace @ux-builder/design
```

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
