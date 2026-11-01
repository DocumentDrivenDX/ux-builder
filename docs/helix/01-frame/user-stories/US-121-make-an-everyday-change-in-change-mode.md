---
ddx:
  id: US-121
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: ADR-042
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-036
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: SD-006
---

# US-121: Make an everyday change in change mode

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-75
**PRD Requirements**: FR-76
**Priority**: P1
**Status**: Draft

## Story

**As a** developer making a small change
**I want** the guide to check a small change without running the whole loop
**So that** simplicity is checked on every change and the loop does not feel heavy

## Context

Change mode runs the challenge questions, `impact`, the complexity delta and a recorded decision. It stops at a checkpoint only when the change touches something already validated.

## Walkthrough

1. The developer asks to add a filter to the list.
2. The guide says it is in change mode and why, runs the challenge questions and `impact`, shows the complexity delta and records the decision.
3. The list was validated with users, so it stops at the significant-change checkpoint.

## Acceptance Criteria

- [ ] **US-121-AC1** — Given an app, when `ux-builder-design mode change` then `mode full` run, then the state's `mode` follows each, and `status` shows it.
- [ ] **US-121-AC2** — Given an app in change mode and a change to a screen whose decision is `tested`, when `impact "<change>" --json` runs, then it lists the affected items and sets `checkpointRequired` to `significant-change`.
- [ ] **US-121-AC3** — Given the same change to a screen with no tested decision, when `impact --json` runs, then `checkpointRequired` is absent.
- [ ] **US-121-AC4** — Given the installed skill, when its text is read, then it says when to use the full loop and when change mode, lists change mode's four steps, and tells the agent to say which mode it is in and that the person can switch; and that a requirement change goes through HELIX's `evolve` first, and drift between HELIX documents through HELIX's `validate` and `align` (ADR-042 decision 4).

## Edge Cases

- **A small change turns out large**: the guide proposes switching to the full loop.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-121-AC1 | an app | `ux-builder-design mode change` then `mode full` run | the state's `mode` follows each, and `status` shows it |
| AC2 | US-121-AC2 | an app in change mode and a change to a screen whose decision is `tested` | `impact "<change>" --json` runs | it lists the affected items and sets `checkpointRequired` to `significant-change` |
| AC3 | US-121-AC3 | the same change to a screen with no tested decision | `impact --json` runs | `checkpointRequired` is absent |
| AC4 | US-121-AC4 | the installed skill | its text is read | it says when to use the full loop and when change mode, lists change mode's four steps, and tells the agent to say which mode it is in and that the person can switch |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-75
- **PRD Requirements**: FR-76
- **External**: ADR-036, CONTRACT-008, SD-006

## Out of Scope

- How `impact` finds affected items (US-137).
