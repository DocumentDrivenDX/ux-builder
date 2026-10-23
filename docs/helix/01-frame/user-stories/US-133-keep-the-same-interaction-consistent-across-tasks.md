---
ddx:
  id: US-133
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

# US-133: Keep the same interaction consistent across tasks

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-34
**PRD Requirements**: FR-84
**Priority**: P1
**Status**: Draft

## Story

**As a** designer or developer using the guide (PRD primary persona)
**I want** the check to tell me when two tasks do the same kind of thing in different ways
**So that** users learn one way to choose a location, not three

## Context

Tasks declare the interaction kinds they need (`interactionKinds`, for example `choose-location`). The check compares the screens and flows that serve the same kind and reports where they use different patterns or flows. The rule is cited data in `rules.json` (ADR-025 rule 7).

## Walkthrough

1. T-1 and T-3 both declare `choose-location`.
2. T-1 uses a map picker screen; T-3 uses a form field.
3. `check` reports the inconsistency and recommends the pattern most tasks already use.

## Acceptance Criteria

- [ ] **US-133-AC1** — Given two tasks that declare the same interaction kind and reach it through screens with different patterns, when `ux-builder-blueprint check` runs, then it reports the consistency rule's ID, both tasks, both screens and the recommended pattern.
- [ ] **US-133-AC2** — Given three tasks sharing a kind, two on one pattern and one on another, when `check` runs, then it recommends the pattern used by two.
- [ ] **US-133-AC3** — Given tasks sharing a kind on the same pattern, when `check` runs, then no consistency finding is reported.
- [ ] **US-133-AC4** — Given `guidelines/rules.json`, when `npm run rules` runs, then the consistency rule has an ID, a statement in ux-builder's words and at least one cited source.

## Edge Cases

- **A tie**: the finding names both patterns and recommends neither.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-133-AC1 | two tasks that declare the same interaction kind and reach it through screens with different patterns | `ux-builder-blueprint check` runs | it reports the consistency rule's ID, both tasks, both screens and the recommended pattern |
| AC2 | US-133-AC2 | three tasks sharing a kind, two on one pattern and one on another | `check` runs | it recommends the pattern used by two |
| AC3 | US-133-AC3 | tasks sharing a kind on the same pattern | `check` runs | no consistency finding is reported |
| AC4 | US-133-AC4 | `guidelines/rules.json` | `npm run rules` runs | the consistency rule has an ID, a statement in ux-builder's words and at least one cited source |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-34
- **PRD Requirements**: FR-84
- **External**: CONTRACT-005, SD-006

## Out of Scope

- Inferring interaction kinds from screens without declarations.
