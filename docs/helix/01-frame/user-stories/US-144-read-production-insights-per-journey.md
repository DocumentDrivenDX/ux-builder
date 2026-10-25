---
ddx:
  id: US-144
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-038
    - kind: informed_by
      to: ADR-039
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: SD-006
---

# US-144: Read production insights per journey

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-63, GDL-69
**PRD Requirements**: FR-88
**Priority**: P2
**Status**: Draft

## Story

**As a** product owner of a released app
**I want** exported journey events, support requests and feedback turned into per-journey insights
**So that** I see where users drop off and that evidence updates the design's confidence

## Context

`ux-builder-design insights` reads files the owner exports and writes `docs/ux-builder/insights/INS-<date>.md` (CONTRACT-008). It fetches nothing (ADR-038).

## Walkthrough

1. The owner exports a week of journey events and support tickets.
2. The guide runs `ux-builder-design insights events.jsonl --support tickets.csv`.
3. The insight shows 40% of J-find abandoning after the filter step.
4. The findings join the evidence store, and the jobs table's confidence and the rubric's observed column update.

## Acceptance Criteria

- [ ] **US-144-AC1** — Given a fixture event export, when `ux-builder-design insights <events.jsonl>` runs, then it writes `docs/ux-builder/insights/INS-<date>.md` with completion, abandonment points, failed searches, feature use and time per step for each journey.
- [ ] **US-144-AC2** — Given events naming a journey the blueprint no longer has, when insights run, then they are reported as unmatched, not dropped.
- [ ] **US-144-AC3** — Given `--support` and `--feedback` files, when insights run, then their entries are masked and linked to the journeys they mention, as evidence sources.
- [ ] **US-144-AC4** — Given an insights run, when it completes, then its findings are added to the evidence store, and the jobs table's confidence and the rubric's observed column cite them.
- [ ] **US-144-AC5** — Given the insights code with network APIs replaced by spies, when it runs, then it reads only the given files and makes no network request.

## Edge Cases

- **An empty export**: the insight says no events were found.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-144-AC1 | a fixture event export | `ux-builder-design insights <events.jsonl>` runs | it writes `docs/ux-builder/insights/INS-<date>.md` with completion, abandonment points, failed searches, feature use and time per step for each journey |
| AC2 | US-144-AC2 | events naming a journey the blueprint no longer has | insights run | they are reported as unmatched, not dropped |
| AC3 | US-144-AC3 | `--support` and `--feedback` files | insights run | their entries are masked and linked to the journeys they mention, as evidence sources |
| AC4 | US-144-AC4 | an insights run | it completes | its findings are added to the evidence store, and the jobs table's confidence and the rubric's observed column cite them |
| AC5 | US-144-AC5 | the insights code with network APIs replaced by spies | it runs | it reads only the given files and makes no network request |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-63, GDL-69
- **PRD Requirements**: FR-88
- **External**: ADR-038, ADR-039, CONTRACT-008, SD-006

## Out of Scope

- Fetching data from analytics services.
