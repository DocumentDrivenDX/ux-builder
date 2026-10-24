---
ddx:
  id: STP-137
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-137
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-137-trace-an-item-and-apply-a-change-everywhere-it-reaches

## Story Reference

**User Story**: [[US-137-trace-an-item-and-apply-a-change-everywhere-it-reaches]] (Trace an item and apply a change everywhere it reaches)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-137's criteria on fixtures: a fixture app, blueprint and design state, with no network, no model and no real participants.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-137-AC1 | Given a fixture app whose job, task, journey, screen, prototype page, test task and finding are linked by ID, when `ux-builder-design trace <id> --json` runs on any of them, then it lists every linked item upstream and downstream, each with its file. | `us-137-ac1` | It lists every linked item upstream and downstream, each with its file | `@covers US-137-AC1` | Integration | `packages/design/test/trace-impact.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-137-AC2 | Given a fixture with seeded dependents of one screen, when `ux-builder-design impact "<change>" --json` runs, then it lists every seeded dependent task, journey, screen, pattern, prototype page, test-kit task, finding and HELIX document, and changes no file. | `us-137-ac2` | It lists every seeded dependent task, journey, screen, pattern, prototype page, test-kit task, finding and HELIX document, and changes no file | `@covers US-137-AC2` | Integration | `packages/design/test/trace-impact.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-137-AC3 | Given an impact list the person accepts, when `impact --apply` runs, then it updates the blueprint, regenerates the prototypes and the test kit, writes HELIX changes only as `propose` patches, and records a decision. | `us-137-ac3` | It updates the blueprint, regenerates the prototypes and the test kit, writes HELIX changes only as `propose` patches, and records a decision | `@covers US-137-AC3` | Integration | `packages/design/test/trace-impact.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-137-AC4 | Given an applied change, when its summary is printed, then it is one summary of what changed, with the complexity delta per journey. | `us-137-ac4` | It is one summary of what changed, with the complexity delta per journey | `@covers US-137-AC4` | Integration | `packages/design/test/trace-impact.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-137-AC5 | Given an applied change that breaks a journey, when `impact --apply` runs, then the check fails, nothing is regenerated, and the blueprint edit is left for the person to fix. | `us-137-ac5` | The check fails, nothing is regenerated, and the blueprint edit is left for the person to fix | `@covers US-137-AC5` | Integration | `packages/design/test/trace-impact.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |

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
- [x] No test depends on the network, a model or real participants
