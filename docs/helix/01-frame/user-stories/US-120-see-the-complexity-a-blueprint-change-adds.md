---
ddx:
  id: US-120
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: CONTRACT-005
    - kind: informed_by
      to: ADR-025
---

# US-120: See the complexity a blueprint change adds

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-12
**PRD Requirements**: FR-78
**Priority**: P1
**Status**: Draft

## Story

**As a** developer or reviewer of a blueprint change
**I want** to see what a change adds to each journey: screens, steps, required inputs and decisions
**So that** added complexity is visible in review and needs a reason

## Context

`ux-builder-blueprint check --diff <base>` compares two blueprints per journey. A cited rule warns when a journey grows and no recorded decision names the change.

## Walkthrough

1. A pull request adds an activity picker before the map.
2. `check --diff main:app.blueprint.json` reports J-find: +1 screen, +1 step, +1 required input, +1 decision.
3. No decision names the picker, so the check warns.

## Acceptance Criteria

- [ ] **US-120-AC1** — Given two blueprints where the second adds a screen and a step to J-find and removes a step from J-save, when `check --diff <base>` runs, then it reports, per journey, screens, steps, required inputs and decisions added and removed.
- [ ] **US-120-AC2** — Given a journey that grows and a trace with no decision naming the added screen or step, when `check --diff` runs, then it reports a warning with the new rule's ID and its sources.
- [ ] **US-120-AC3** — Given the same change with a decision whose `screen` or step names it, when `check --diff` runs, then no warning is reported.
- [ ] **US-120-AC4** — Given the new rule in `guidelines/rules.json`, when `npm run rules` runs, then the rule has a paraphrased statement and at least one cited source, and passes the provenance check.

## Edge Cases

- **`--diff` with `--json`**: the delta is in the JSON output for the guide to show.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-120-AC1 | two blueprints where the second adds a screen and a step to J-find and removes a step from J-save | `check --diff <base>` runs | it reports, per journey, screens, steps, required inputs and decisions added and removed |
| AC2 | US-120-AC2 | a journey that grows and a trace with no decision naming the added screen or step | `check --diff` runs | it reports a warning with the new rule's ID and its sources |
| AC3 | US-120-AC3 | the same change with a decision whose `screen` or step names it | `check --diff` runs | no warning is reported |
| AC4 | US-120-AC4 | the new rule in `guidelines/rules.json` | `npm run rules` runs | the rule has a paraphrased statement and at least one cited source, and passes the provenance check |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-12
- **PRD Requirements**: FR-78
- **External**: CONTRACT-008, CONTRACT-005, ADR-025

## Out of Scope

- Blocking a merge; it is a warning.
