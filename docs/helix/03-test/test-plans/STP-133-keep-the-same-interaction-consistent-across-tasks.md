---
ddx:
  id: STP-133
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-133
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-133-keep-the-same-interaction-consistent-across-tasks

## Story Reference

**User Story**: [[US-133-keep-the-same-interaction-consistent-across-tasks]] (Keep the same interaction consistent across tasks)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-133's criteria with fixtures only: no network, no model, no browser unless a row says so.
**Blocking Gate**: `npm test --workspace @ux-builder/ui`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-133-AC1 | Given two tasks that declare the same interaction kind and reach it through screens with different patterns, when `ux-builder-blueprint check` runs, then it reports the consistency rule's ID, both tasks, both screens and the recommended pattern. | `us-133-ac1` | It reports the consistency rule's ID, both tasks, both screens and the recommended pattern | `@covers US-133-AC1` | Unit | `packages/ui/test/blueprint-consistency.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |
| US-133-AC2 | Given three tasks sharing a kind, two on one pattern and one on another, when `check` runs, then it recommends the pattern used by two. | `us-133-ac2` | It recommends the pattern used by two | `@covers US-133-AC2` | Unit | `packages/ui/test/blueprint-consistency.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |
| US-133-AC3 | Given tasks sharing a kind on the same pattern, when `check` runs, then no consistency finding is reported. | `us-133-ac3` | No consistency finding is reported | `@covers US-133-AC3` | Unit | `packages/ui/test/blueprint-consistency.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |
| US-133-AC4 | Given `guidelines/rules.json`, when `npm run rules` runs, then the consistency rule has an ID, a statement in ux-builder's words and at least one cited source. | `us-133-ac4` | The consistency rule has an ID, a statement in ux-builder's words and at least one cited source | `@covers US-133-AC4` | Unit | `packages/ui/test/blueprint-consistency.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |

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
