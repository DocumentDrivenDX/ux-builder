---
ddx:
  id: US-124
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

# US-124: The agent proposes user hypotheses, labelled as such

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-17
**PRD Requirements**: FR-81
**Priority**: P1
**Status**: Draft

## Story

**As an** AI coding agent running the guide (PRD secondary persona)
**I want** to propose user segments, jobs, motivations, frustrations, usage contexts and accessibility needs before any research exists
**So that** the team has something to test, and nobody mistakes my guesses for evidence

## Context

Phase 2, hypothesis mode. The research capability works from the brief and domain knowledge. What it proposes is recorded in `docs/ux/jobs.md` and the design state as *hypothesis*, with no evidence. `ux-builder-design validate` refuses a hypothesis that claims evidence.

## Walkthrough

1. The brief exists, and no evidence has been added.
2. The guide proposes three segments and five jobs, each marked *hypothesis*.
3. It writes them to `docs/ux/jobs.md` from the jobs template and lists them in the design state.
4. `ux-builder-design validate` passes, and `status` shows five jobs, all hypotheses.

## Acceptance Criteria

- [ ] **US-124-AC1** — Given a created app, when the `ux-builder-design` skill is read, then its research section tells the agent to propose segments, jobs, motivations, frustrations, usage contexts and accessibility needs from the brief, and to mark every item *hypothesis* with no evidence.
- [ ] **US-124-AC2** — Given a `docs/ux/jobs.md` whose items all have status `hypothesis` and no evidence, when `ux-builder-design validate` runs, then it exits 0 and reports each item as a hypothesis.
- [ ] **US-124-AC3** — Given a job with status `hypothesis` that lists an evidence source, when `ux-builder-design validate` runs, then it exits 1 and names the job and the field.
- [ ] **US-124-AC4** — Given hypotheses recorded in the design state, when `ux-builder-design status --json` runs, then it counts jobs by status, and every hypothesis has confidence `low` or none.

## Edge Cases

- **No brief yet**: the skill tells the agent to run Define first; `validate` reports the missing brief as a warning.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-124-AC1 | a created app | the `ux-builder-design` skill is read | its research section tells the agent to propose segments, jobs, motivations, frustrations, usage contexts and accessibility needs from the brief, and to mark every item *hypothesis* with no evidence |
| AC2 | US-124-AC2 | a `docs/ux/jobs.md` whose items all have status `hypothesis` and no evidence | `ux-builder-design validate` runs | it exits 0 and reports each item as a hypothesis |
| AC3 | US-124-AC3 | a job with status `hypothesis` that lists an evidence source | `ux-builder-design validate` runs | it exits 1 and names the job and the field |
| AC4 | US-124-AC4 | hypotheses recorded in the design state | `ux-builder-design status --json` runs | it counts jobs by status, and every hypothesis has confidence `low` or none |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-17
- **PRD Requirements**: FR-81
- **External**: ADR-039, CONTRACT-008, SD-006

## Out of Scope

- Judging whether a hypothesis is plausible.
