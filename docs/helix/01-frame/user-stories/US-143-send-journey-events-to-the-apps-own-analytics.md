---
ddx:
  id: US-143
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-038
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: CONTRACT-004
    - kind: informed_by
      to: SD-006
---

# US-143: Send journey events to the app's own analytics

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-62
**PRD Requirements**: FR-88
**Priority**: P2
**Status**: Draft

## Story

**As an** app developer
**I want** the SDK to tell my own analytics when users start, progress through, finish or abandon a journey
**So that** I can see where users struggle in production without the SDK sending anything anywhere

## Context

ADR-038: the SDK emits journey events only to a sink the app supplies, and never makes a network call itself. `JourneyProvider` and `useJourneyStep` are added to `@ux-builder/ui` (CONTRACT-008 amends CONTRACT-004).

## Walkthrough

1. The developer wraps the app in `<JourneyProvider sink={(e) => analytics.track(e)}>`.
2. Screens call `useJourneyStep("J-find", 2)`.
3. As a user moves through J-find, the sink receives start, step and complete events.

## Acceptance Criteria

- [ ] **US-143-AC1** — Given an app wrapped in `JourneyProvider` with a sink, when a user starts, steps through and completes a journey, then the sink receives `journey-start`, `step` and `complete` events, each with journey, screen and step IDs and a timestamp.
- [ ] **US-143-AC2** — Given a journey left before completion, an error panel shown, an empty result and a search with no results, when they happen, then the sink receives `abandon`, `error-shown`, `empty-result` and `no-results-search`.
- [ ] **US-143-AC3** — Given no `JourneyProvider`, or a provider with no sink, when the same interactions happen, then nothing is emitted and nothing is stored.
- [ ] **US-143-AC4** — Given the journey-events code running with `fetch`, `navigator.sendBeacon` and `XMLHttpRequest` replaced by spies, when a full journey runs, then none of them is called.

## Edge Cases

- **A sink that throws**: the error is caught and logged once; the app keeps working.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-143-AC1 | an app wrapped in `JourneyProvider` with a sink | a user starts, steps through and completes a journey | the sink receives `journey-start`, `step` and `complete` events, each with journey, screen and step IDs and a timestamp |
| AC2 | US-143-AC2 | a journey left before completion, an error panel shown, an empty result and a search with no results | they happen | the sink receives `abandon`, `error-shown`, `empty-result` and `no-results-search` |
| AC3 | US-143-AC3 | no `JourneyProvider`, or a provider with no sink | the same interactions happen | nothing is emitted and nothing is stored |
| AC4 | US-143-AC4 | the journey-events code running with `fetch`, `navigator.sendBeacon` and `XMLHttpRequest` replaced by spies | a full journey runs | none of them is called |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-62
- **PRD Requirements**: FR-88
- **External**: ADR-038, CONTRACT-004, CONTRACT-008, SD-006

## Out of Scope

- An analytics service or dashboard.
- Session replay.
