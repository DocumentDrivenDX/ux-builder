---
ddx:
  id: US-127
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: ADR-042
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: CONTRACT-005
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: SD-006
---

# US-127: Model tasks in the blueprint

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-22, GDL-23, GDL-25
**PRD Requirements**: FR-82
**Priority**: P1
**Status**: Draft

## Story

**As a** designer or developer using the guide (PRD primary persona)
**I want** the tasks users must accomplish, with their inputs, actions, success and exceptions, recorded in the blueprint
**So that** flows can be compared per task and the agent can find what to simplify

## Context

CONTRACT-005 gains top-level `tasks[]`. Each task has `id` (its Task Model key, ADR-042; an older blueprint's `T-<n>`), `goal`, `needs` (the PRD's User Needs, by name; an older blueprint's `jobs`), `users`, `trigger`, `inputs.required`, `inputs.optional`, `systemActions`, `userActions`, `success` (acceptance criteria IDs), `exceptions`, `subtasks` (each with its alternative `ways`) and `interactionKinds`. A journey names the task it realizes in `journeys[].task`. The guide drafts the task model and the human confirms the essential goals at checkpoint 1.

## Walkthrough

1. The agent drafts T-1 "Find a suitable river" from the jobs and stories.
2. Its subtasks include "Establish geographic context" with three ways.
3. Journey J-find names `task: T-1`.
4. `ux-builder-blueprint check` passes; the guide asks the human to confirm the essential goals.

## Acceptance Criteria

- [ ] **US-127-AC1** — Given a blueprint with `tasks[]` holding every field above, when `ux-builder-blueprint check` runs, then it validates against the amended schema with no errors.
- [ ] **US-127-AC2** — Given a task missing `goal` or `success`, or with an ID that is neither a Task Model key (a slug) nor an older `T-<n>`, when `check` runs, then it reports an error naming the task and the field.
- [ ] **US-127-AC3** — Given a journey whose `task` names a task the blueprint lacks, when `check` runs, then it reports an error naming the journey and the task.
- [ ] **US-127-AC4** — Given a task that no journey realizes, when `check` runs, then it reports a warning naming the task.
- [ ] **US-127-AC5** — Given a blueprint with no `tasks`, when `check` runs, then it reports nothing new, so existing blueprints still pass.
- [ ] **US-127-AC6** — Given a created app, when the skill's task-modelling section is read, then it tells the agent to draft tasks from the jobs and stories and to ask the human to confirm the essential goals before Explore, recording the answer in the design state.
- [ ] **US-127-AC7** — Given a feature specification, when `ux-builder-design task add --feature FEAT-<n> --task <t> --goal <g> [--user <who>]... [--need <need>]... [--business-rule BR-<n>]... [--realized-by <journey>]...` runs, then it proposes a row of its *Task Model* (after *Functional Areas*) with the task, goal, users and needs by name, rules, what realizes it and its key (the task's name as a slug); unknown users, needs or features are refused; and `validate` warns about a blueprint task that is not a Task Model key.

## Edge Cases

- **A task serves no job yet**: allowed while jobs are hypotheses; `ux-builder-design validate` warns.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-127-AC1 | a blueprint with `tasks[]` holding every field above | `ux-builder-blueprint check` runs | it validates against the amended schema with no errors |
| AC2 | US-127-AC2 | a task missing `goal` or `success`, or with an ID not matching `T-<n>` | `check` runs | it reports an error naming the task and the field |
| AC3 | US-127-AC3 | a journey whose `task` names a task the blueprint lacks | `check` runs | it reports an error naming the journey and the task |
| AC4 | US-127-AC4 | a task that no journey realizes | `check` runs | it reports a warning naming the task |
| AC5 | US-127-AC5 | a blueprint with no `tasks` | `check` runs | it reports nothing new, so existing blueprints still pass |
| AC6 | US-127-AC6 | a created app | the skill's task-modelling section is read | it tells the agent to draft tasks from the jobs and stories and to ask the human to confirm the essential goals before Explore, recording the answer in the design state |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-22, GDL-23, GDL-25
- **PRD Requirements**: FR-82
- **External**: CONTRACT-005, CONTRACT-008, SD-006

## Out of Scope

- Generating tasks automatically from stories.
