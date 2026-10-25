---
ddx:
  id: US-140
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-039
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: SD-006
---

# US-140: Get a usability test kit from the journeys

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-54
**PRD Requirements**: FR-87
**Priority**: P1
**Status**: Draft

## Story

**As a** product owner preparing a usability test
**I want** a ready test kit drawn from the app's journeys
**So that** I can run sessions with real users without writing the materials myself

## Context

`ux-builder-design test-kit` writes `docs/ux-builder/tests/TK-<n>/` (CONTRACT-008). Participants are recruited and paid by the owner (out of scope).

## Walkthrough

1. The owner asks to test map-first with five users.
2. The guide runs `ux-builder-design test-kit --journey J-find --journey J-access`.
3. The kit holds scenarios, a facilitator script, a consent note, a screener and an observation sheet.

## Acceptance Criteria

- [ ] **US-140-AC1** — Given a blueprint with journeys tied to stories, when `ux-builder-design test-kit` runs, then it writes `docs/ux-builder/tests/TK-<n>/` with `scenarios.md`, `script.md`, `consent.md`, `screener.md` and `observations.csv`, numbering the kit after the last one.
- [ ] **US-140-AC2** — Given a journey whose steps name screens and actions, when its scenario is written, then the scenario states the user's goal with no screen, pattern or control names from the blueprint.
- [ ] **US-140-AC3** — Given a journey tied to acceptance criteria, when the kit is written, then each scenario lists its success criteria from those criteria by ID.
- [ ] **US-140-AC4** — Given `--journey` given, when the kit is written, then only the named journeys are in it; an unknown journey ID exits 2 naming it.
- [ ] **US-140-AC5** — Given a brief listing target users, when the kit is written, then `screener.md` asks about those users, and `observations.csv` has one row per task with columns for participant, completed, time, errors, assists and remark.

## Edge Cases

- **A journey with no criteria**: the scenario says success criteria are missing, and `test-kit` warns.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-140-AC1 | a blueprint with journeys tied to stories | `ux-builder-design test-kit` runs | it writes `docs/ux-builder/tests/TK-<n>/` with `scenarios.md`, `script.md`, `consent.md`, `screener.md` and `observations.csv`, numbering the kit after the last one |
| AC2 | US-140-AC2 | a journey whose steps name screens and actions | its scenario is written | the scenario states the user's goal with no screen, pattern or control names from the blueprint |
| AC3 | US-140-AC3 | a journey tied to acceptance criteria | the kit is written | each scenario lists its success criteria from those criteria by ID |
| AC4 | US-140-AC4 | `--journey` given | the kit is written | only the named journeys are in it; an unknown journey ID exits 2 naming it |
| AC5 | US-140-AC5 | a brief listing target users | the kit is written | `screener.md` asks about those users, and `observations.csv` has one row per task with columns for participant, completed, time, errors, assists and remark |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-54
- **PRD Requirements**: FR-87
- **External**: ADR-039, CONTRACT-008, SD-006

## Out of Scope

- Recruiting or paying participants.
- Scheduling sessions.
