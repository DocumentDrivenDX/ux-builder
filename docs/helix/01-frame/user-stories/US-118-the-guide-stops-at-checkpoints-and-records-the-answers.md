---
ddx:
  id: US-118
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
---

# US-118: The guide stops at checkpoints and records the answers

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-05, GDL-06, GDL-07, GDL-08
**PRD Requirements**: FR-77
**Priority**: P1
**Status**: Draft

## Story

**As a** product owner steering the guide
**I want** the guide to stop and ask me at the moments that need my decision, and to remember what I said
**So that** I make the decisions that matter without signing off documents

## Context

Three core checkpoints (after Define, Explore and Validate) and three conditional ones (a significant change to something validated, an experiment users will see, a production release). A checkpoint is one question; the answer is a decision in the trace and the state.

## Walkthrough

1. After Define, the guide asks: "Is this the outcome, and is this how we'll know it worked?"
2. The owner answers. The guide runs `state checkpoint core-1 --answer "…"`.
3. It offers the HELIX patches `propose` drafted, as one batch.

## Acceptance Criteria

- [ ] **US-118-AC1** — Given an app at Define with an open episode, when `state checkpoint core-1 --answer <text>` runs, then the state marks `core-1` passed with the answer and time, and the trace gains a `decision` event whose `chose` is the answer.
- [ ] **US-118-AC2** — Given an app, when `state checkpoint core-2 --skip --reason <text>` runs, then the state marks `core-2` skipped with the reason; without `--reason` it exits 1 and writes nothing.
- [ ] **US-118-AC3** — Given any checkpoint ID other than the six CONTRACT-008 names, when `state checkpoint` runs with it, then it exits 1 naming the six valid IDs.
- [ ] **US-118-AC4** — Given the installed skill, when its text is read, then it lists the three core and three conditional checkpoints, says to ask one question and wait, to ask only questions whose answers change the design, and to list small reversible assumptions with `state set`.
- [ ] **US-118-AC5** — Given the installed skill, when its text is read, then it says HELIX documents change only through `ux-builder-blueprint propose` patches offered as a batch at a checkpoint, and that the guide never edits `docs/helix/` itself.

## Edge Cases

- **No open episode**: the decision goes to the unscoped episode, as CONTRACT-007 says.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-118-AC1 | an app at Define with an open episode | `state checkpoint core-1 --answer <text>` runs | the state marks `core-1` passed with the answer and time, and the trace gains a `decision` event whose `chose` is the answer |
| AC2 | US-118-AC2 | an app | `state checkpoint core-2 --skip --reason <text>` runs | the state marks `core-2` skipped with the reason; without `--reason` it exits 1 and writes nothing |
| AC3 | US-118-AC3 | any checkpoint ID other than the six CONTRACT-008 names | `state checkpoint` runs with it | it exits 1 naming the six valid IDs |
| AC4 | US-118-AC4 | the installed skill | its text is read | it lists the three core and three conditional checkpoints, says to ask one question and wait, to ask only questions whose answers change the design, and to list small reversible assumptions with `state set` |
| AC5 | US-118-AC5 | the installed skill | its text is read | it says HELIX documents change only through `ux-builder-blueprint propose` patches offered as a batch at a checkpoint, and that the guide never edits `docs/helix/` itself |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-05, GDL-06, GDL-07, GDL-08
- **PRD Requirements**: FR-77
- **External**: ADR-036, CONTRACT-008, CONTRACT-007

## Out of Scope

- What triggers a conditional checkpoint in change mode (US-121).
