---
ddx:
  id: US-061
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-009
    - kind: informed_by
      to: ADR-026
---

# US-061: Inspect coverage instead of receiving a false pass

**Feature**: FEAT-009 — HELIX-aware UX assessment
**Brief**: UA-S06
**Feature Requirements**: COV-01, COV-02, COV-03
**PRD Requirements**: FR-40
**Priority**: P2
**Status**: Draft

## Story

**As a** app owner
**I want** a coverage matrix of every journey and state
**So that** I know what was not assessed instead of reading a clean report as a pass

## Context

CONTRACT-006 (coverage).

## Walkthrough

1. The report shows the journey-by-state matrix, each cell with its status, reason, outcome and evidence.

## Acceptance Criteria

- [ ] **US-061-AC1** — Given a plan, when the run ends, then every journey-and-state pair is `assessed`, `blocked`, `not assessed` or `not applicable` with a reason, and an `assessed` pair without an outcome and evidence fails validation.
- [ ] **US-061-AC2** — Given a heuristic concern not backed by a story, when it is reported, then it is a proposed criterion labelled as a recommendation, never as an existing obligation.
- [ ] **US-061-AC3** — Given claims about confusion, trust or time saved, when the report is written, then they are listed as needing representative users and none is stated as found.

## Edge Cases

- A journey with no applicable AI state marks the AI class `not applicable` with the reason.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Matrix | US-061-AC1 | Run with mixed statuses; one assessed pair without evidence | validate-report | Fails on the bare pair |
| Heuristic | US-061-AC2 | Heuristic finding | Report | Labelled proposed criterion |
| Users | US-061-AC3 | Report | Read | User-validation list present |

## Dependencies

- **Feature Spec**: FEAT-009
- **Feature Requirements**: COV-01, COV-02, COV-03
- **PRD Requirements**: FR-40
- **External**: CONTRACT-006; CONTRACT-004 revision

## Out of Scope

- See FEAT-009 "Out of Scope".
