---
ddx:
  id: US-134
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: SD-006
---

# US-134: See each alternative's predicted rubric

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-37, GDL-38, GDL-39
**PRD Requirements**: FR-84
**Priority**: P1
**Status**: Draft

## Story

**As a** designer or developer using the guide (PRD primary persona)
**I want** each alternative rated on the nine rubric dimensions, never averaged
**So that** I can see where a design is predicted to be strong or weak, and never pick one that fails effectiveness or accessibility

## Context

`guidelines/rubric.json` holds nine dimensions: task effectiveness, task efficiency, cognitive load, discoverability, learnability, consistency, accessibility, error recovery and user confidence, each with its question, measures and sources. `ux-builder-design rubric` fills the *predicted* column: computed measures where they exist, and the agent's recorded judgment with reasoning where they do not. Task effectiveness and accessibility are baselines.

## Walkthrough

1. Three alternatives have scores and judgments.
2. `ux-builder-design rubric --alternative map-first` shows efficiency and consistency computed, learnability judged.
3. Activity first fails the accessibility baseline, so the guide does not recommend it.

## Acceptance Criteria

- [ ] **US-134-AC1** — Given `guidelines/rubric.json`, when it is validated against its schema, then it holds exactly the nine dimensions, each with an ID, a question, measures and at least one cited source, with `task-effectiveness` and `accessibility` marked baseline.
- [ ] **US-134-AC2** — Given an alternative with scores, audit results and recorded judgments, when `ux-builder-design rubric --alternative <name> --json` runs, then each dimension shows a predicted value and its basis: `computed` with the measures used, or `judgment` with the reasoning.
- [ ] **US-134-AC3** — Given a dimension with no computed measure and no recorded judgment, when `rubric` runs, then that dimension shows `to validate`, never an estimate.
- [ ] **US-134-AC4** — Given any alternative, when `rubric --json` runs, then the output contains no overall or average score.
- [ ] **US-134-AC5** — Given an alternative that fails a baseline dimension, when `rubric` runs, then it is marked not recommendable, naming the baseline it fails, whatever its other values.

## Edge Cases

- **No alternatives yet**: `rubric` rates the current blueprint.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-134-AC1 | `guidelines/rubric.json` | it is validated against its schema | it holds exactly the nine dimensions, each with an ID, a question, measures and at least one cited source, with `task-effectiveness` and `accessibility` marked baseline |
| AC2 | US-134-AC2 | an alternative with scores, audit results and recorded judgments | `ux-builder-design rubric --alternative <name> --json` runs | each dimension shows a predicted value and its basis: `computed` with the measures used, or `judgment` with the reasoning |
| AC3 | US-134-AC3 | a dimension with no computed measure and no recorded judgment | `rubric` runs | that dimension shows `to validate`, never an estimate |
| AC4 | US-134-AC4 | any alternative | `rubric --json` runs | the output contains no overall or average score |
| AC5 | US-134-AC5 | an alternative that fails a baseline dimension | `rubric` runs | it is marked not recommendable, naming the baseline it fails, whatever its other values |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-37, GDL-38, GDL-39
- **PRD Requirements**: FR-84
- **External**: CONTRACT-008, SD-006

## Out of Scope

- The observed column (US-142).
