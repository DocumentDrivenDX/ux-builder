---
ddx:
  id: US-111
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-016
    - kind: informed_by
      to: ADR-035
    - kind: informed_by
      to: FEAT-004
---

# US-111: Replay episodes as evaluation tasks

**Feature**: FEAT-016 — Learning from builds
**Feature Requirements**: TRC-11
**PRD Requirements**: FR-72
**Priority**: P1
**Status**: Draft

## Story

**As a** ux-builder maintainer (operator)
**I want** recorded episodes turned into evaluation tasks I can replay against a new SDK version and grade
**So that** I can tell whether a change to ux-builder makes agents build better

## Context

US-014-AC4 and US-031-AC5 wait on graded agent runs. An episode's goal, starting commit and outcome make an evaluation task.

## Walkthrough

1. The maintainer runs `ux-builder-learn --evals`.
2. Each finished episode becomes a task: goal, starting commit, outcome to beat.
3. A replay with the new SDK reports checks-to-green and audit findings next to the original.

## Acceptance Criteria

- [ ] **US-111-AC1** — Given finished episodes in the store, when `--evals` runs, then each becomes a task with its goal, its starting commit's hash, its modality and the outcome to beat (checks to green, audit findings per rule, the assessment's open findings).
- [ ] **US-111-AC2** — Given a task and an SDK version, when it is replayed by an agent, then the result records the same fields as the original outcome, side by side. *[Amended 2026-10-23 — AR-2026-10-22 D-5]* Until a replay runner exists, the replay follows the manual procedure in `docs/learning/replay-an-evaluation-task.md`, and `replay-result` refuses a result that does not follow its format, naming each problem.
- [ ] **US-111-AC3** — Given a set of replays, when they are graded, then the report gives for each the share of components on SDK widgets and role tokens and the matching patterns used, as US-014-AC4 and US-031-AC5 measure.

## Edge Cases

- **A starting commit no longer available**: the task is skipped and listed.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-111-AC1 | finished episodes in the store | `--evals` runs | each becomes a task with its goal, its starting commit's hash, its modality and the outcome to beat (checks to green, audit findings per rule, the assessment's open findings) |
| AC2 | US-111-AC2 | a task and an SDK version | it is replayed by an agent | the result records the same fields as the original outcome, side by side |
| AC3 | US-111-AC3 | a set of replays | they are graded | the report gives for each the share of components on SDK widgets and role tokens and the matching patterns used, as US-014-AC4 and US-031-AC5 measure |

## Dependencies

- **Feature Spec**: FEAT-016
- **Feature Requirements**: TRC-11
- **PRD Requirements**: FR-72
- **External**: ADR-035, FEAT-004

## Out of Scope

- Running the agents (the maintainer chooses them).
