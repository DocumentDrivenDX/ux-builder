---
ddx:
  id: STP-160
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-160
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-160-advance-does-the-safe-work-and-stops-at-the-one-decision

## Story Reference

**User Story**: [[US-160-advance-does-the-safe-work-and-stops-at-the-one-decision]]
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-160's criteria with fixtures only: no network, no model, no browser.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-160-AC1 | Given a design, when `advance --until-decision` runs at each stage, then the decision is the intake first, then each foundation table in turn, then the coverage map, then core-1, then core-2. | `us-160-ac1` | The decision is the intake first, then each foundation table in turn, then the coverage map, then core-1, then core-2 | `@covers US-160-AC1` | Integration | `packages/design/test/human-time.test.mjs` | Fixture apps in temp folders; no network, no model | Built |
| US-160-AC2 | Given a design, when `advance --until-decision` runs, then it says what it did and checked, lists the agent's own work (document problems, unverified claims, open feedback) before the decision, gives the decision with what to show, a recommendation, the command that records it and what follows, and the budget; it records no approval; without `--until-decision` it exits 2; and the skill uses it. | `us-160-ac2` | It says what it did and checked, lists the agent's own work (document problems, unverified claims, open feedback) before the decision, gives the decision with what to show, a recommendation, the command that records it and what follows, and the budget; it records no approval; without `--until-decision` it exits 2; and the skill uses it | `@covers US-160-AC2` | Integration | `packages/design/test/human-time.test.mjs` | Fixture apps in temp folders; no network, no model | Built |

## Executable Proof

```bash
npm test --workspace @ux-builder/design
```

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
