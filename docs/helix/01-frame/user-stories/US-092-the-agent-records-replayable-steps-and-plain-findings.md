---
ddx:
  id: US-092
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-013
    - kind: informed_by
      to: ADR-031
    - kind: informed_by
      to: CONTRACT-006
---

# US-092: The agent records replayable steps and plain-English findings

**Feature**: FEAT-013 — Annotated journey walkthrough videos
**Feature Requirements**: REP-01, ANN-03
**PRD Requirements**: FR-57, FR-58
**Priority**: P2
**Status**: Draft

## Story

**As** a coding agent running a UX assessment with the `ux-builder-assess` skill
**I want** to record each browser action as a replayable step, and each finding's problem and recommendation in plain English
**So that** the run can be replayed as a video without walking the app again, and a leader can read every caption

## Context

Today `walkthrough.json` records what the agent did as text and findings carry technical recommendations. The skill and CONTRACT-006 gain `steps[].do` and findings' `plain` (ADR-031 decisions 1 and 5).

## Walkthrough

1. The agent clicks Open on the first entry and records `do: { click: "role=link[name='Entry 1']" }` on that step.
2. It types the reviewer's note and records `do: { fill: "#note", value: "Looks fine" }`.
3. It merges a finding and writes `plain.problem` and `plain.recommendation` in two short sentences.

## Acceptance Criteria

Field names and commands are proposals in CONTRACT-006 *Walkthrough videos*
and FEAT-013; the criteria name them so tests can cite them.

- [ ] **US-092-AC1** — Given a walkthrough step marked `done` that took a browser action, when the run is validated, then the step has `do` in the replay format (`goto`, `click`, `fill`, `press`, `waitFor`), or `validate-report` reports it as not replayable.
- [ ] **US-092-AC2** — Given a fill into a password field or a field the manifest marks secret, when the step is recorded, then `do.value` is a reference (`{ secret: NAME }`), never the literal, and a literal matching a secret pattern fails validation.
- [ ] **US-092-AC3** — Given a run with a `video/` folder, when `validate-report` runs, then every finding shown has `plain.problem` and `plain.recommendation`, each at most two sentences, with no rule ID, `--piq-` token or component name.
- [ ] **US-092-AC4** — Given the skill's instructions, when an agent follows them, then they say to record `do` with each action and `plain` with each finding, and to keep specifics in the existing fields.

## Edge Cases

- **An action the agent took by keyboard only**: recorded as `press` steps.
- **A step that replays differently from how it was walked**: caught by REP-05 at the next checkpoint.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-092-AC1 | a walkthrough step marked `done` that took a browser action | the run is validated | the step has `do` in the replay format (`goto`, `click`, `fill`, `press`, `waitFor`), or `validate-report` reports it as not replayable |
| AC2 | US-092-AC2 | a fill into a password field or a field the manifest marks secret | the step is recorded | `do.value` is a reference (`{ secret: NAME }`), never the literal, and a literal matching a secret pattern fails validation |
| AC3 | US-092-AC3 | a run with a `video/` folder | `validate-report` runs | every finding shown has `plain.problem` and `plain.recommendation`, each at most two sentences, with no rule ID, `--piq-` token or component name |
| AC4 | US-092-AC4 | the skill's instructions | an agent follows them | they say to record `do` with each action and `plain` with each finding, and to keep specifics in the existing fields |

## Dependencies

- **Stories**: US-088 (the assessment walks the blueprint's journeys)
- **Feature Spec**: FEAT-013
- **Feature Requirements**: REP-01, ANN-03
- **PRD Requirements**: FR-57, FR-58
- **External**: CONTRACT-006 *Walkthrough videos*

## Out of Scope

- Recording the agent's own walk as video.
