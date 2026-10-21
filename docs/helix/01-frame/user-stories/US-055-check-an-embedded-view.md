---
ddx:
  id: US-055
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-008
    - kind: informed_by
      to: ADR-025
---

# US-055: Check an embedded view against the view profile

**Feature**: FEAT-008 — Interaction and information architecture: rules, blueprint and audit
**Feature Requirements**: VEW-01, VEW-02, RUL-03
**PRD Requirements**: FR-33, FR-34
**Priority**: P1
**Status**: Draft

## Story

**As a** developer or agent building an MCP App view, such as a Praxis plug-in
**I want** my view's blueprint checked against the rules for embedded views
**So that** every plug-in fits its host's chrome, sizes and states the same way

## Context

ADR-024 makes MCP App views a generic SDK target; ADR-025 decision 6 gives them a profile. Praxis-specific rules live in the Praxis adapter.

## Walkthrough

1. The agent writes a blueprint of kind `view` for a review queue.
2. `get_rules` with context `view` returns the view profile.
3. The check reports an app-shell pattern and a missing compact size class.
4. The agent removes the shell and adds compact support.

## Acceptance Criteria

- [ ] **US-055-AC1** — Given a blueprint of kind `view` with destinations, or a screen whose pattern is an app shell or primary navigation, when it is checked, then each is an error with its rule ID.
- [ ] **US-055-AC2** — Given a view blueprint that does not support both the compact and medium size classes, when it is checked, then it reports an error naming the missing classes.
- [ ] **US-055-AC3** — Given a view blueprint with more than one screen, when it is checked, then it reports a warning that a view does one task.
- [ ] **US-055-AC4** — Given a target with context `view`, when `rulesFor` runs, then it returns the view-profile rules and no rule whose context is only `app`.
- [ ] **US-055-AC5** — Given a view blueprint whose screen does not declare its empty, loading and error states, whatever the screen's pattern (a `FormPage` too), when it is checked, then it reports one `view.states` finding naming the missing states, and no second `screen.states` finding for the same screen.

## Edge Cases

- A view's modal tasks are allowed; they are not screens.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Shell | US-055-AC1 | View with destinations and AppShell | check | Two errors |
| Sizes | US-055-AC2 | View supporting expanded only | check | Error naming compact and medium |
| One task | US-055-AC3 | View with two screens | check | Warning |
| Profile | US-055-AC4 | context view | rulesFor | View rules only |
| States | US-055-AC5 | View on FormPage with no states | check | One view.states finding |

## Dependencies

- **Feature Spec**: FEAT-008
- **Feature Requirements**: VEW-01, VEW-02, RUL-03
- **PRD Requirements**: FR-33, FR-34
- **External**: CONTRACT-004 and CONTRACT-005 revisions

## Out of Scope

- See FEAT-008 "Out of Scope".
