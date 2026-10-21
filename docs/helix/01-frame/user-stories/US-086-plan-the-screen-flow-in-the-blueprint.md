---
ddx:
  id: US-086
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-012
    - kind: informed_by
      to: ADR-030
    - kind: informed_by
      to: CONTRACT-005
---

# US-086: Plan the screen flow in the blueprint

**Feature**: FEAT-012 — Screen flows and user journeys in the blueprint
**Feature Requirements**: FLW-01, FLW-02, FLW-03
**PRD Requirements**: FR-53
**Priority**: P2
**Status**: Draft

## Story

**As an** app developer (PRD primary persona) planning an app's screens
**I want** to say what each screen's actions do and where they lead, and have the flow checked
**So that** unreachable screens, dead ends and actions that lead nowhere are found before any code

## Context

The blueprint lists destinations and screens but not how screens connect. FLW-01 adds `screens[].actions[]` with a `to` target (a screen, `modal:<id>`, `back`, `state:<state>`, `external`), turning the screen list into a flow graph (CONTRACT-005 *Flows and journeys*).

## Walkthrough

1. The developer adds actions to the queue screen: Open entry → `entry`, Reject → `modal:reject`.
2. They add Back → `back` to the entry screen and leave Settings with no destination and no incoming action.
3. `ux-builder-blueprint check` reports `flow.reachable` for Settings.
4. They add Settings to the destinations; the check passes.

## Acceptance Criteria

Field names, rule IDs and commands are proposals in CONTRACT-005 *Flows and
journeys* and FEAT-012; the criteria name them so tests can cite them.

- [ ] **US-086-AC1** — Given a screen that no destination and no action reaches, when the blueprint is checked, then `flow.reachable` warns, naming the screen and the size classes at which it is unreachable.
- [ ] **US-086-AC2** — Given a screen or modal whose actions lead nowhere onward and offer no `back`, when the blueprint is checked, then `flow.no-dead-end` warns.
- [ ] **US-086-AC3** — Given an action whose `to` names no screen, modal or state, when the blueprint is checked, then `flow.target-exists` is an error with the action's path.
- [ ] **US-086-AC4** — Given a screen with both `primaryAction` and `actions`, when the primary action is not among its actions, then `flow.primary-consistent` warns.
- [ ] **US-086-AC5** — Given a blueprint without `actions`, when it is checked, then its findings are exactly as before this feature.

## Edge Cases

- **`to: external`**: counts as onward; it never makes a screen unreachable or a dead end.
- **A view blueprint**: destinations are absent, so reachability starts at the view's first screen.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-086-AC1 | a screen that no destination and no action reaches | the blueprint is checked | `flow.reachable` warns, naming the screen and the size classes at which it is unreachable |
| AC2 | US-086-AC2 | a screen or modal whose actions lead nowhere onward and offer no `back` | the blueprint is checked | `flow.no-dead-end` warns |
| AC3 | US-086-AC3 | an action whose `to` names no screen, modal or state | the blueprint is checked | `flow.target-exists` is an error with the action's path |
| AC4 | US-086-AC4 | a screen with both `primaryAction` and `actions` | the primary action is not among its actions | `flow.primary-consistent` warns |
| AC5 | US-086-AC5 | a blueprint without `actions` | it is checked | its findings are exactly as before this feature |

## Dependencies

- **Stories**: none
- **Feature Spec**: FEAT-012
- **Feature Requirements**: FLW-01, FLW-02, FLW-03
- **PRD Requirements**: FR-53
- **External**: CONTRACT-005 *Flows and journeys*

## Out of Scope

- Drawing the flow (US-090).
