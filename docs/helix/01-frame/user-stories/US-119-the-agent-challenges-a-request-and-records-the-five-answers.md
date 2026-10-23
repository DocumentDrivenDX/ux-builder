---
ddx:
  id: US-119
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-036
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: CONTRACT-007
    - kind: informed_by
      to: US-107
---

# US-119: The agent challenges a request and records the five answers

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-09, GDL-10, GDL-11
**PRD Requirements**: FR-78
**Priority**: P1
**Status**: Draft

## Story

**As a** product owner asking for a new feature
**I want** the agent to question whether a feature is needed and how simple it can be, before it designs anything
**So that** the app does not get more complicated one reasonable request at a time

## Context

The standing objective is the minimum viable interaction. The agent asks six challenge questions before designing a feature, and records five answers (goal, without, simplest, assumptions, validation) before adding a destination, screen, modal, required input or journey step.

## Walkthrough

1. The owner asks for a favourites screen.
2. The agent asks which goal it serves and whether saving from the river page would do.
3. It records a decision with the five answers before adding anything to the blueprint.

## Acceptance Criteria

- [ ] **US-119-AC1** — Given an open episode, when `ux-builder-trace decide` runs with `--chose`, `--why`, `--goal`, `--without`, `--simplest`, `--assumptions` and `--validation`, then the `decision` event holds all seven, with masking applied to the free-text fields.
- [ ] **US-119-AC2** — Given MCP `record_decision` called with the same five fields, when the event is read, then it equals the event `decide` writes for the same input.
- [ ] **US-119-AC3** — Given `decide --kind addition` (a new destination, screen, modal, required input or step) without one of the five fields, when it runs, then it exits 2 naming the missing field and writes nothing.
- [ ] **US-119-AC4** — Given the installed skill and the app's `AGENTS.md`, when they are read, then they state the standing objective, the six challenge questions to ask before designing a feature, and that every addition needs a decision with the five answers.

## Edge Cases

- **The owner insists after the challenge**: the decision records their answer; the agent proceeds.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-119-AC1 | an open episode | `ux-builder-trace decide` runs with `--chose`, `--why`, `--goal`, `--without`, `--simplest`, `--assumptions` and `--validation` | the `decision` event holds all seven, with masking applied to the free-text fields |
| AC2 | US-119-AC2 | MCP `record_decision` called with the same five fields | the event is read | it equals the event `decide` writes for the same input |
| AC3 | US-119-AC3 | `decide --kind addition` (a new destination, screen, modal, required input or step) without one of the five fields | it runs | it exits 2 naming the missing field and writes nothing |
| AC4 | US-119-AC4 | the installed skill and the app's `AGENTS.md` | they are read | they state the standing objective, the six challenge questions to ask before designing a feature, and that every addition needs a decision with the five answers |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-09, GDL-10, GDL-11
- **PRD Requirements**: FR-78
- **External**: ADR-036, CONTRACT-008, CONTRACT-007, US-107

## Out of Scope

- Judging whether the answers are right.
