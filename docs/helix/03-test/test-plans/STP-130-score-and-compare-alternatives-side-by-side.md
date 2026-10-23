---
ddx:
  id: STP-130
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-130
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-130-score-and-compare-alternatives-side-by-side

## Story Reference

**User Story**: [[US-130-score-and-compare-alternatives-side-by-side]] (Score and compare alternatives side by side)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-130's criteria with fixtures only: no network, no model, no browser unless a row says so.
**Blocking Gate**: `npm test --workspace @ux-builder/ui`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-130-AC1 | Given a fixture blueprint with known counts, when `ux-builder-blueprint score --json` runs, then it returns per journey the steps, screens, modals, required inputs, decisions, navigation hops, check findings and patterns reused versus introduced, each matching the fixture and labelled `predicted`. | `us-130-ac1` | It returns per journey the steps, screens, modals, required inputs, decisions, navigation hops, check findings and patterns reused versus introduced, each matching the fixture and labelled `predicted` | `@covers US-130-AC1` | Unit | `packages/ui/test/blueprint-compare.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |
| US-130-AC2 | Given three seeded alternatives, when `compare` runs, then the page marks, per journey and dimension, the alternative with the best value. | `us-130-ac2` | The page marks, per journey and dimension, the alternative with the best value | `@covers US-130-AC2` | Unit | `packages/ui/test/blueprint-compare.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |
| US-130-AC3 | Given judgments recorded for each alternative in the design state, when `compare` runs, then the page shows each judgment with its reasoning, labelled a preliminary judgment, not a measured result. | `us-130-ac3` | The page shows each judgment with its reasoning, labelled a preliminary judgment, not a measured result | `@covers US-130-AC3` | Unit | `packages/ui/test/blueprint-compare.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |
| US-130-AC4 | Given the same inputs twice, when `compare` runs both times, then the HTML files are byte-identical. | `us-130-ac4` | The HTML files are byte-identical | `@covers US-130-AC4` | Unit | `packages/ui/test/blueprint-compare.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |
| US-130-AC5 | Given two alternatives whose `tasks` differ, when `compare` runs, then it exits 1 and names the tasks that differ. | `us-130-ac5` | It exits 1 and names the tasks that differ | `@covers US-130-AC5` | Unit | `packages/ui/test/blueprint-compare.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |

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
