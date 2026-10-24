---
ddx:
  id: US-129
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-036
    - kind: informed_by
      to: CONTRACT-005
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: SD-006
---

# US-129: Draft and check alternative blueprints

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-26, GDL-27
**PRD Requirements**: FR-83
**Priority**: P1
**Status**: Draft

## Story

**As a** designer or developer using the guide (PRD primary persona)
**I want** two or more complete alternative blueprints for the same tasks
**So that** the first design drafted is not automatically the one that gets built

## Context

Alternatives are separate files, `app.blueprint.<name>.json` (ADR-036). `ux-builder-blueprint alternative new <name>` copies the current blueprint as a starting point; `alternative choose <name> --reason <text>` makes it `app.blueprint.json` and records every alternative's status (`chosen` or `rejected`) and reason in the design state. The agent generates at least two alternatives for every open question about the interaction model.

## Walkthrough

1. The brief has an open question: search first, map first or activity first.
2. The agent runs `alternative new search-first`, `map-first` and `activity-first` and edits each.
3. Each is checked like the main blueprint.
4. The owner picks map first; `alternative choose map-first --reason "…"` records the choice.

## Acceptance Criteria

- [ ] **US-129-AC1** — Given an app with `app.blueprint.json`, when `ux-builder-blueprint alternative new map-first` runs, then it writes `app.blueprint.map-first.json` as a copy and refuses (exit 1) if that file exists.
- [ ] **US-129-AC2** — Given an alternative file with an error, when `ux-builder-blueprint check app.blueprint.map-first.json` runs, then it reports the error exactly as it would for the main blueprint.
- [ ] **US-129-AC3** — Given three alternatives, when `alternative choose map-first --reason "fewest steps"` runs, then `app.blueprint.json` becomes the map-first content, and the design state lists map-first as `chosen` and the others as `rejected`, each with the reason and date.
- [ ] **US-129-AC4** — Given `alternative choose` without `--reason`, when it runs, then it exits 1 naming the missing reason and changes nothing.
- [ ] **US-129-AC5** — Given a created app, when the skill's interaction-optimization section is read, then it tells the agent to draft at least two alternatives for every open question about the interaction model and to recommend one.

## Edge Cases

- **An alternative covers different tasks**: allowed to exist; `compare` refuses it (US-130).

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-129-AC1 | an app with `app.blueprint.json` | `ux-builder-blueprint alternative new map-first` runs | it writes `app.blueprint.map-first.json` as a copy and refuses (exit 1) if that file exists |
| AC2 | US-129-AC2 | an alternative file with an error | `ux-builder-blueprint check app.blueprint.map-first.json` runs | it reports the error exactly as it would for the main blueprint |
| AC3 | US-129-AC3 | three alternatives | `alternative choose map-first --reason "fewest steps"` runs | `app.blueprint.json` becomes the map-first content, and the design state lists map-first as `chosen` and the others as `rejected`, each with the reason and date |
| AC4 | US-129-AC4 | `alternative choose` without `--reason` | it runs | it exits 1 naming the missing reason and changes nothing |
| AC5 | US-129-AC5 | a created app | the skill's interaction-optimization section is read | it tells the agent to draft at least two alternatives for every open question about the interaction model and to recommend one |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-26, GDL-27
- **PRD Requirements**: FR-83
- **External**: ADR-036, CONTRACT-005, CONTRACT-008, SD-006

## Out of Scope

- Merging two alternatives.
