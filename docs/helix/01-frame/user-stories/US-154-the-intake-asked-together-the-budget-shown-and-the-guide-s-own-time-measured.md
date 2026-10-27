---
ddx:
  id: US-154
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: CONTRACT-008
---

# US-154: The intake asked together, the budget shown, and the guide's own time measured

**Feature**: FEAT-018
**Feature Requirements**: GDL-83
**PRD Requirements**: FR-77, FR-89
**Priority**: P1
**Status**: Draft

## Story

**As a** person starting a design with the guide
**I want** the opening questions asked together after the agent has read what exists, to know how many decisions are left before a prototype, and the guide's use of my time measured
**So that** the start takes a few turns, I know what to expect, and changes to the guide can be shown to save time

## Context

The guide asked one question at a time, even independent ones the PRD already answered, and nothing measured the guided session itself.

## Walkthrough

1. The agent reads the PRD and the brief, runs `intake`, confirms what they answer in a line each and asks the rest in one message.
2. `status` says about 9 decisions and 27 minutes are left before the first prototype.
3. After each turn the agent records its kind; `metrics` reports against the targets.

## Acceptance Criteria

- [ ] **US-154-AC1** — Given an app, when `intake` runs, then it lists the intake questions the brief, HELIX's PRD, the users and jobs tables, evidence and the app's code do not answer, to ask together, and those they answer, to confirm; and the skill asks the intake together.
- [ ] **US-154-AC2** — Given a design state, when `status` or `intake` runs, then it gives the decisions left before the first prototype (a table per foundation kind still to approve, core-1, the choice at core-2, the coverage map, the modality) and the minutes they take at three each, falling as they are made.
- [ ] **US-154-AC3** — Given approvals, checkpoints, steps and turns recorded, when `metrics` runs, then it reports turns by kind, the share that are new information or decisions, approvals before testing, approvals reopened and carried, minutes to the first prototype (gaps over 10 minutes idle) and each target met or missed; an unknown turn kind exits 2; and the skill records each turn.

## Edge Cases

- **No sources**: every question is asked
- **No turns logged**: the share is reported as unknown, not as a miss

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-154-AC1 | an empty app; an app with a brief and PRD | `intake` | all asked; most confirmed |
| AC2 | US-154-AC2 | foundations pending, then approved | `status` | 9 decisions, then 4 |
| AC3 | US-154-AC3 | logged events | `metrics` | targets met |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-83
- **PRD Requirements**: FR-77, FR-89
- **External**: CONTRACT-008

## Out of Scope

- Measuring words or waiting time inside the agent: only what the commands and the agent record.
