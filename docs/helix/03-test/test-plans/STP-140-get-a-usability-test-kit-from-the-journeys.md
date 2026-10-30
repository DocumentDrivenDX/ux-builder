---
ddx:
  id: STP-140
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-140
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-140-get-a-usability-test-kit-from-the-journeys

## Story Reference

**User Story**: [[US-140-get-a-usability-test-kit-from-the-journeys]] (Get a usability test kit from the journeys)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-140's criteria on fixtures: a fixture app, blueprint and design state, with no network, no model and no real participants.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-140-AC1 | Given a blueprint with journeys tied to stories, when `ux-builder-design test-kit --study <study>` runs, then it proposes the study's *Scenarios*, *Success Criteria* and *Screener* for its HELIX research plan's *Research Methods*, and writes the facilitator script, consent note, observation sheet and task list to `docs/ux-builder/runs/studies/<study>/` (run output, ADR-042). | `us-140-ac1` | It proposes the study's Scenarios, Success Criteria and Screener for its research plan and writes the session materials to `docs/ux-builder/runs/studies/<study>/` | `@covers US-140-AC1` | Integration | `packages/design/test/test-kit.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-140-AC2 | Given a journey whose steps name screens and actions, when its scenario is written, then the scenario states the user's goal with no screen, pattern or control names from the blueprint. | `us-140-ac2` | The scenario states the user's goal with no screen, pattern or control names from the blueprint | `@covers US-140-AC2` | Integration | `packages/design/test/test-kit.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-140-AC3 | Given a journey tied to acceptance criteria, when the kit is written, then each scenario's success criteria list those criteria by ID. | `us-140-ac3` | Each scenario lists its success criteria from those criteria by ID | `@covers US-140-AC3` | Integration | `packages/design/test/test-kit.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-140-AC4 | Given `--journey` given, when the kit is written, then only the named journeys are in it; an unknown journey ID exits 2 naming it. | `us-140-ac4` | Only the named journeys are in it; an unknown journey ID exits 2 naming it | `@covers US-140-AC4` | Integration | `packages/design/test/test-kit.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-140-AC5 | Given a brief listing target users, when the kit is written, then the plan's *Screener* asks about those users, and `observations.csv` has one row per task with columns for participant, completed, time, errors, assists and remark. | `us-140-ac5` | `screener.md` asks about those users, and `observations.csv` has one row per task with columns for participant, completed, time, errors, assists and remark | `@covers US-140-AC5` | Integration | `packages/design/test/test-kit.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |

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
