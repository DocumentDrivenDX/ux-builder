---
ddx:
  id: STP-120
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-120
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-120-see-the-complexity-a-blueprint-change-adds

## Story Reference

**User Story**: [[US-120-see-the-complexity-a-blueprint-change-adds]] (See the complexity a blueprint change adds)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-120's criteria on fixture apps in temporary folders, with no network and no model.
**Blocking Gate**: `npm run rules` and `npm test --workspace @ux-builder/ui`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-120-AC1 | Given two blueprints where the second adds a screen and a step to J-find and removes a step from J-save, when `check --diff <base>` runs, then it reports, per journey, screens, steps, required inputs and decisions added and removed. | `us-120-ac1-diff-delta` | per-journey counts | `@covers US-120-AC1` | Unit | `packages/ui/test/blueprint-diff.test.mjs` | Fixture blueprint pair | Built |
| US-120-AC2 | Given a journey that grows and a trace with no decision naming the added screen or step, when `check --diff` runs, then it reports a warning with the new rule's ID and its sources. | `us-120-ac2-diff-warning` | rule ID and sources | `@covers US-120-AC2` | Unit | `packages/ui/test/blueprint-diff.test.mjs` | Fixture pair; empty trace | Built |
| US-120-AC3 | Given the same change with a decision whose `screen` or step names it, when `check --diff` runs, then no warning is reported. | `us-120-ac3-diff-decision-clears` | no warning | `@covers US-120-AC3` | Unit | `packages/ui/test/blueprint-diff.test.mjs` | Fixture pair; trace with a decision | Built |
| US-120-AC4 | Given the new rule in `guidelines/rules.json`, when `npm run rules` runs, then the rule has a paraphrased statement and at least one cited source, and passes the provenance check. | `us-120-ac4-diff-rule-provenance` | provenance passes | `@covers US-120-AC4` | Unit | `packages/ui/test/blueprint-diff.test.mjs` | Repository rules | Built |

## Executable Proof

```bash
npm run rules
npm test --workspace @ux-builder/ui
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
