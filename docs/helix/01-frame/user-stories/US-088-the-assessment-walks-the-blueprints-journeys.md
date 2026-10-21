---
ddx:
  id: US-088
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-012
    - kind: informed_by
      to: FEAT-009
    - kind: informed_by
      to: CONTRACT-006
---

# US-088: The assessment walks the blueprint's journeys

**Feature**: FEAT-012 — Screen flows and user journeys in the blueprint
**Feature Requirements**: ASM-01
**PRD Requirements**: FR-55
**Priority**: P2
**Status**: Draft

## Story

**As an** app owner (PRD primary persona) assessing an app
**I want** the assessment manifest to reference the blueprint's journeys instead of restating them
**So that** a journey is defined once and the assessment, the stories and the tests cannot drift apart

## Context

FEAT-009's manifest declares journeys with a story, criteria, entry and states (CONTRACT-006). With FEAT-012 the blueprint holds them. ASM-01 lets a manifest journey reference a blueprint journey (`blueprint: "J-…"`) and supply only what the assessment adds (role, fixture, priority, tests).

## Walkthrough

1. The owner writes a manifest journey `{ blueprint: "J-review", role: "reviewer", priority: "critical" }`.
2. `assess validate` resolves J-review from the app's blueprint.
3. `assess plan` builds the walkthrough from the journey's steps and alternates.
4. The report links each finding to the journey step.

## Acceptance Criteria

Field names, rule IDs and commands are proposals in CONTRACT-005 *Flows and
journeys* and FEAT-012; the criteria name them so tests can cite them.

- [ ] **US-088-AC1** — Given a manifest journey with `blueprint` naming a blueprint journey, when `assess validate` runs, then the story, criteria, entry and steps come from the blueprint, and validation passes.
- [ ] **US-088-AC2** — Given a manifest journey with both `blueprint` and its own `story` or `entry`, when `assess validate` runs, then it is refused naming both definitions.
- [ ] **US-088-AC3** — Given `blueprint` naming no journey in the app's blueprint, when `assess validate` runs, then it is refused naming the missing ID.
- [ ] **US-088-AC4** — Given a referenced journey with alternates, when `assess plan` runs, then each alternate becomes a walkthrough pair with its state.

## Edge Cases

- **No blueprint in the app**: `blueprint` references are refused; manifests with their own journeys work as before.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-088-AC1 | a manifest journey with `blueprint` naming a blueprint journey | `assess validate` runs | the story, criteria, entry and steps come from the blueprint, and validation passes |
| AC2 | US-088-AC2 | a manifest journey with both `blueprint` and its own `story` or `entry` | `assess validate` runs | it is refused naming both definitions |
| AC3 | US-088-AC3 | `blueprint` naming no journey in the app's blueprint | `assess validate` runs | it is refused naming the missing ID |
| AC4 | US-088-AC4 | a referenced journey with alternates | `assess plan` runs | each alternate becomes a walkthrough pair with its state |

## Dependencies

- **Stories**: US-086
- **Feature Spec**: FEAT-012
- **Feature Requirements**: ASM-01
- **PRD Requirements**: FR-55
- **External**: CONTRACT-005 *Flows and journeys*; CONTRACT-006 (`journeys[].blueprint`)

## Out of Scope

- Changing how the assessment ranks findings.
