---
ddx:
  id: STP-138
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-138
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-138-the-assessment-runs-a-heuristic-inspection-pass

## Story Reference

**User Story**: [[US-138-the-assessment-runs-a-heuristic-inspection-pass]] (The assessment runs a heuristic inspection pass)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-138's criteria on fixtures: a fixture app, blueprint and design state, with no network, no model and no real participants.
**Blocking Gate**: `npm test --workspace @ux-builder/audit`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-138-AC1 | Given a run on a fixture app, when `assess heuristics` runs and the agent records its results, then the run's records hold an entry for every heuristic in the pass for every walked screen, each a finding or `checked: no finding`. | `us-138-ac1` | The run's records hold an entry for every heuristic in the pass for every walked screen, each a finding or `checked: no finding` | `@covers US-138-AC1` | Unit | `packages/audit/test/assess-heuristics.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-138-AC2 | Given a record missing a heuristic for a walked screen, when `assess validate-report` runs, then it fails naming the screen and the heuristic. | `us-138-ac2` | It fails naming the screen and the heuristic | `@covers US-138-AC2` | Unit | `packages/audit/test/assess-heuristics.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-138-AC3 | Given a screen whose content order differs from its declared `screens[].content`, when the information-hierarchy check runs, then it reports a finding naming the first content out of order. | `us-138-ac3` | It reports a finding naming the first content out of order | `@covers US-138-AC3` | Unit | `packages/audit/test/assess-heuristics.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-138-AC4 | Given an exploratory prototype served from `prototype/<name>/`, when the assessment runs against it, then it inspects the prototype's pages like the app's, matched by `data-piq-screen`. | `us-138-ac4` | It inspects the prototype's pages like the app's, matched by `data-piq-screen` | `@covers US-138-AC4` | Unit | `packages/audit/test/assess-heuristics.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |

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
