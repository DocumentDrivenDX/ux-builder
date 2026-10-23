---
ddx:
  id: STP-143
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-143
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-143-send-journey-events-to-the-apps-own-analytics

## Story Reference

**User Story**: [[US-143-send-journey-events-to-the-apps-own-analytics]] (Send journey events to the app's own analytics)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-143's criteria on fixtures: a fixture app, blueprint and design state, with no network, no model and no real participants.
**Blocking Gate**: `npm test --workspace @ux-builder/ui`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-143-AC1 | Given an app wrapped in `JourneyProvider` with a sink, when a user starts, steps through and completes a journey, then the sink receives `journey-start`, `step` and `complete` events, each with journey, screen and step IDs and a timestamp. | `us-143-ac1` | The sink receives `journey-start`, `step` and `complete` events, each with journey, screen and step IDs and a timestamp | `@covers US-143-AC1` | Unit | `packages/ui/test/journey-events.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-143-AC2 | Given a journey left before completion, an error panel shown, an empty result and a search with no results, when they happen, then the sink receives `abandon`, `error-shown`, `empty-result` and `no-results-search`. | `us-143-ac2` | The sink receives `abandon`, `error-shown`, `empty-result` and `no-results-search` | `@covers US-143-AC2` | Unit | `packages/ui/test/journey-events.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-143-AC3 | Given no `JourneyProvider`, or a provider with no sink, when the same interactions happen, then nothing is emitted and nothing is stored. | `us-143-ac3` | Nothing is emitted and nothing is stored | `@covers US-143-AC3` | Unit | `packages/ui/test/journey-events.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-143-AC4 | Given the journey-events code running with `fetch`, `navigator.sendBeacon` and `XMLHttpRequest` replaced by spies, when a full journey runs, then none of them is called. | `us-143-ac4` | None of them is called | `@covers US-143-AC4` | Unit | `packages/ui/test/journey-events.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |

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
- [x] No test depends on the network, a model or real participants
