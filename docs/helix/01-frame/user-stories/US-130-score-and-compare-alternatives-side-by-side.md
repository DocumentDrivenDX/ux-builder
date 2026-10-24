---
ddx:
  id: US-130
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: CONTRACT-005
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: SD-006
---

# US-130: Score and compare alternatives side by side

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-28, GDL-29, GDL-30
**PRD Requirements**: FR-83
**Priority**: P1
**Status**: Draft

## Story

**As a** designer or developer using the guide (PRD primary persona)
**I want** each alternative's measured effort and the agent's judgments on one page
**So that** I can choose an interaction model from evidence instead of a hunch

## Context

`ux-builder-blueprint score` computes, per journey: steps, screens and modals visited, required inputs and decisions, navigation hops, check findings, and patterns reused versus introduced, each labelled *predicted*. The agent adds preliminary design judgments with reasoning in the design state. `compare` writes one deterministic HTML page with flows and wireframes side by side, the scores with the best value per dimension marked, the judgments, the predicted rubric (US-134) and check findings.

## Walkthrough

1. Three alternatives exist.
2. `ux-builder-blueprint compare app.blueprint.search-first.json app.blueprint.map-first.json app.blueprint.activity-first.json --out compare/` runs.
3. The page marks map first as fewest steps for J-find and search first as fewest inputs for J-known.
4. The agent's judgments appear beside the scores, labelled preliminary.

## Acceptance Criteria

- [ ] **US-130-AC1** — Given a fixture blueprint with known counts, when `ux-builder-blueprint score --json` runs, then it returns per journey the steps, screens, modals, required inputs, decisions, navigation hops, check findings and patterns reused versus introduced, each matching the fixture and labelled `predicted`.
- [ ] **US-130-AC2** — Given three seeded alternatives, when `compare` runs, then the page marks, per journey and dimension, the alternative with the best value.
- [ ] **US-130-AC3** — Given judgments recorded for each alternative in the design state, when `compare` runs, then the page shows each judgment with its reasoning, labelled a preliminary judgment, not a measured result.
- [ ] **US-130-AC4** — Given the same inputs twice, when `compare` runs both times, then the HTML files are byte-identical.
- [ ] **US-130-AC5** — Given two alternatives whose `tasks` differ, when `compare` runs, then it exits 1 and names the tasks that differ.

## Edge Cases

- **One alternative fails its check**: it is still compared, and its findings are shown first.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-130-AC1 | a fixture blueprint with known counts | `ux-builder-blueprint score --json` runs | it returns per journey the steps, screens, modals, required inputs, decisions, navigation hops, check findings and patterns reused versus introduced, each matching the fixture and labelled `predicted` |
| AC2 | US-130-AC2 | three seeded alternatives | `compare` runs | the page marks, per journey and dimension, the alternative with the best value |
| AC3 | US-130-AC3 | judgments recorded for each alternative in the design state | `compare` runs | the page shows each judgment with its reasoning, labelled a preliminary judgment, not a measured result |
| AC4 | US-130-AC4 | the same inputs twice | `compare` runs both times | the HTML files are byte-identical |
| AC5 | US-130-AC5 | two alternatives whose `tasks` differ | `compare` runs | it exits 1 and names the tasks that differ |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-28, GDL-29, GDL-30
- **PRD Requirements**: FR-83
- **External**: CONTRACT-005, CONTRACT-008, SD-006

## Out of Scope

- Averaging scores into one number.
