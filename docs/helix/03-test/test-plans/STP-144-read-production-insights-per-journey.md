---
ddx:
  id: STP-144
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-144
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-144-read-production-insights-per-journey

## Story Reference

**User Story**: [[US-144-read-production-insights-per-journey]] (Read production insights per journey)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-144's criteria on fixtures: a fixture app, blueprint and design state, with no network, no model and no real participants.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-144-AC1 | Given a fixture event export, when `ux-builder-design insights <events.jsonl>` runs, then it writes `docs/ux/insights/INS-<date>.md` with completion, abandonment points, failed searches, feature use and time per step for each journey. | `us-144-ac1` | It writes `docs/ux/insights/INS-<date>.md` with completion, abandonment points, failed searches, feature use and time per step for each journey | `@covers US-144-AC1` | Integration | `packages/design/test/insights.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-144-AC2 | Given events naming a journey the blueprint no longer has, when insights run, then they are reported as unmatched, not dropped. | `us-144-ac2` | They are reported as unmatched, not dropped | `@covers US-144-AC2` | Integration | `packages/design/test/insights.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-144-AC3 | Given `--support` and `--feedback` files, when insights run, then their entries are masked and linked to the journeys they mention, as evidence sources. | `us-144-ac3` | Their entries are masked and linked to the journeys they mention, as evidence sources | `@covers US-144-AC3` | Integration | `packages/design/test/insights.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-144-AC4 | Given an insights run, when it completes, then its findings are added to the evidence store, and the jobs table's confidence and the rubric's observed column cite them. | `us-144-ac4` | Its findings are added to the evidence store, and the jobs table's confidence and the rubric's observed column cite them | `@covers US-144-AC4` | Integration | `packages/design/test/insights.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-144-AC5 | Given the insights code with network APIs replaced by spies, when it runs, then it reads only the given files and makes no network request. | `us-144-ac5` | It reads only the given files and makes no network request | `@covers US-144-AC5` | Integration | `packages/design/test/insights.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |

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
