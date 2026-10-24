---
ddx:
  id: US-128
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: CONTRACT-005
    - kind: informed_by
      to: SD-006
---

# US-128: Accept simplifications of the task model

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-24
**PRD Requirements**: FR-82
**Priority**: P1
**Status**: Draft

## Story

**As a** designer or developer using the guide (PRD primary persona)
**I want** a list of ways to make each task simpler, with what each saves and assumes
**So that** I can remove steps and decisions before anyone designs screens around them

## Context

`ux-builder-blueprint simplify` reads the task model and proposes, per task: steps to eliminate, interactions to combine, inputs to infer, sensible defaults, decisions to remove and navigation to reduce. It is deterministic and changes nothing; the agent applies what the human accepts.

## Walkthrough

1. The owner asks the guide to simplify T-1.
2. `simplify` finds that location can be inferred from the device and that "choose activity" is a decision with a sensible default.
3. Each proposal states what it saves and what it assumes.
4. The owner accepts one; the agent edits the blueprint and records the decision.

## Acceptance Criteria

- [ ] **US-128-AC1** — Given a fixture task model seeded with an inferable input, a defaultable decision, two combinable steps and a navigation hop that can be removed, when `ux-builder-blueprint simplify --json` runs, then it returns one proposal for each seeded opportunity, each with its task, kind, what it saves and what it assumes.
- [ ] **US-128-AC2** — Given an input listed in `inputs.required` that another task's `systemActions` already produces, when `simplify` runs, then it proposes moving it to `inputs.optional` as inferable.
- [ ] **US-128-AC3** — Given the same blueprint twice, when `simplify` runs both times, then the outputs are identical.
- [ ] **US-128-AC4** — Given any blueprint, when `simplify` runs, then the blueprint file is unchanged afterwards.
- [ ] **US-128-AC5** — Given a blueprint with no `tasks`, when `simplify` runs, then it exits 0 and says there is no task model to simplify.

## Edge Cases

- **Two proposals conflict**: both are listed, each naming the other.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-128-AC1 | a fixture task model seeded with an inferable input, a defaultable decision, two combinable steps and a navigation hop that can be removed | `ux-builder-blueprint simplify --json` runs | it returns one proposal for each seeded opportunity, each with its task, kind, what it saves and what it assumes |
| AC2 | US-128-AC2 | an input listed in `inputs.required` that another task's `systemActions` already produces | `simplify` runs | it proposes moving it to `inputs.optional` as inferable |
| AC3 | US-128-AC3 | the same blueprint twice | `simplify` runs both times | the outputs are identical |
| AC4 | US-128-AC4 | any blueprint | `simplify` runs | the blueprint file is unchanged afterwards |
| AC5 | US-128-AC5 | a blueprint with no `tasks` | `simplify` runs | it exits 0 and says there is no task model to simplify |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-24
- **PRD Requirements**: FR-82
- **External**: CONTRACT-005, SD-006

## Out of Scope

- Applying proposals automatically.
