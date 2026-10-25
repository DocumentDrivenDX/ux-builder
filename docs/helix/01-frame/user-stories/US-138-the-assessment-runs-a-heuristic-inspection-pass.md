---
ddx:
  id: US-138
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

# US-138: The assessment runs a heuristic inspection pass

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-50, GDL-51
**PRD Requirements**: FR-86
**Priority**: P1
**Status**: Draft

## Story

**As a** product owner reading the assessment
**I want** every screen inspected against the usability heuristics, with coverage I can see
**So that** obvious problems are fixed before any user sees the design, and a clean result means checked, not skipped

## Context

CONTRACT-008 amends CONTRACT-006: `assess heuristics` records a pass over Nielsen's ten heuristics, error prevention and recovery, information hierarchy against `screens[].content`, and navigation complexity. It runs on exploratory prototypes and on the app.

## Walkthrough

1. The guide runs the assessment on the `map-first` prototype.
2. `assess heuristics` records, per screen and heuristic, a finding or `checked: no finding`.
3. The report shows which heuristics found problems and where none were found.

## Acceptance Criteria

- [ ] **US-138-AC1** — Given a run on a fixture app, when `assess heuristics` runs and the agent records its results, then the run's records hold an entry for every heuristic in the pass for every walked screen, each a finding or `checked: no finding`.
- [ ] **US-138-AC2** — Given a record missing a heuristic for a walked screen, when `assess validate-report` runs, then it fails naming the screen and the heuristic.
- [ ] **US-138-AC3** — Given a screen whose content order differs from its declared `screens[].content`, when the information-hierarchy check runs, then it reports a finding naming the first content out of order.
- [ ] **US-138-AC4** — Given an exploratory prototype served from `docs/ux-builder/prototypes/<name>/`, when the assessment runs against it, then it inspects the prototype's pages like the app's, matched by `data-piq-screen`.

## Edge Cases

- **A screen not walked**: it is listed as not inspected, never as clean.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-138-AC1 | a run on a fixture app | `assess heuristics` runs and the agent records its results | the run's records hold an entry for every heuristic in the pass for every walked screen, each a finding or `checked: no finding` |
| AC2 | US-138-AC2 | a record missing a heuristic for a walked screen | `assess validate-report` runs | it fails naming the screen and the heuristic |
| AC3 | US-138-AC3 | a screen whose content order differs from its declared `screens[].content` | the information-hierarchy check runs | it reports a finding naming the first content out of order |
| AC4 | US-138-AC4 | an exploratory prototype served from `docs/ux-builder/prototypes/<name>/` | the assessment runs against it | it inspects the prototype's pages like the app's, matched by `data-piq-screen` |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-50, GDL-51
- **PRD Requirements**: FR-86
- **External**: CONTRACT-006, CONTRACT-008, SD-006

## Out of Scope

- Scoring heuristics into one number.
