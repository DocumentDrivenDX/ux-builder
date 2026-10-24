---
ddx:
  id: US-139
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: FEAT-009
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: CONTRACT-006
    - kind: informed_by
      to: SD-006
---

# US-139: See agent-measured task effort per journey

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-52, GDL-53
**PRD Requirements**: FR-86
**Priority**: P1
**Status**: Draft

## Story

**As a** product owner reading the assessment
**I want** the effort each journey took when the agent walked it, against the planned shortest path
**So that** I see where the built experience is harder than the design intended

## Context

The assessment writes task metrics to the run's `metrics.json`, labelled agent-measured (CONTRACT-008 amends CONTRACT-006). They are diagnostic, not user evidence.

## Walkthrough

1. The agent walks journey J-find on the prototype.
2. The run records completion, interactions against the shortest path, the path, backtracks, failed actions, missing information, errors and time per step.
3. The report shows them labelled agent-measured, with the diagnostic note.

## Acceptance Criteria

- [ ] **US-139-AC1** — Given a walked journey in a fixture run, when the run's records are collected, then `metrics.json` holds, for the journey, completion, interactions taken, the blueprint's shortest path length, the path taken, backtracks, failed actions, information not found, interface errors and time per step.
- [ ] **US-139-AC2** — Given a fixture walk that revisits a screen, when metrics are computed, then the backtrack count and the extra interactions over the shortest path match the fixture.
- [ ] **US-139-AC3** — Given any report that shows task metrics, when it is rendered, then each metric is labelled `agent-measured` and the report states that agents navigate differently from people.
- [ ] **US-139-AC4** — Given a journey the agent could not complete, when metrics are computed, then completion is false and the step where it stopped is named.

## Edge Cases

- **A journey with alternates**: the shortest path is computed for the main path only.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-139-AC1 | a walked journey in a fixture run | the run's records are collected | `metrics.json` holds, for the journey, completion, interactions taken, the blueprint's shortest path length, the path taken, backtracks, failed actions, information not found, interface errors and time per step |
| AC2 | US-139-AC2 | a fixture walk that revisits a screen | metrics are computed | the backtrack count and the extra interactions over the shortest path match the fixture |
| AC3 | US-139-AC3 | any report that shows task metrics | it is rendered | each metric is labelled `agent-measured` and the report states that agents navigate differently from people |
| AC4 | US-139-AC4 | a journey the agent could not complete | metrics are computed | completion is false and the step where it stopped is named |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-52, GDL-53
- **PRD Requirements**: FR-86
- **External**: CONTRACT-006, CONTRACT-008, SD-006

## Out of Scope

- Comparing agent and human times.
