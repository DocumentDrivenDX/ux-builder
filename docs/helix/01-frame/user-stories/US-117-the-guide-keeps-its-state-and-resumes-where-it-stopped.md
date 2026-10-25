---
ddx:
  id: US-117
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
      to: SD-006
---

# US-117: The guide keeps its state and resumes where it stopped

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-02, GDL-03, GDL-04
**PRD Requirements**: FR-77
**Priority**: P1
**Status**: Draft

## Story

**As a** designer or developer working with the guide over several sessions
**I want** the guide to remember where we are, what is assumed and what was chosen
**So that** each session picks up where the last one stopped

## Context

The design state, `.ux-builder/design-state.json`, is committed with the app (D-9). It holds the activity, checkpoints, open questions, assumptions, alternatives, unresolved issues, experiments and the next action.

## Walkthrough

1. The guide records an assumption and an open question with `state set`.
2. The next day, a new session runs `ux-builder-design status` and opens with: "Map first is chosen. Two assumptions are untested. Next: test with users."

## Acceptance Criteria

- [ ] **US-117-AC1** — Given a design state with each field CONTRACT-008 defines, when it is validated, then it passes `design-state.schema.json`; a state with an unknown field or a bad assumption status fails, naming the path.
- [ ] **US-117-AC2** — Given an app with a design state, when `state set assumptions[+]` adds an assumption and `state get --json` runs, then the assumption is returned with status `assumed`, an ID `A-<n>` and an empty evidence list, and the file is rewritten in a stable key order.
- [ ] **US-117-AC3** — Given a state at Explore with two untested assumptions and a chosen alternative, when `ux-builder-design status` runs, then it prints *[Amended 2026-10-25 — alignment, GDL-79/GDL-81]* the step ("Step n of 8"), the activity, the chosen alternative, the count of untested assumptions, open questions and the next action, in plain words.
- [ ] **US-117-AC4** — Given the installed skill, when its text is read, then it describes *[Amended 2026-10-25 — alignment, GDL-79/GDL-81]* the eight steps the person sees and the four activities they fall into, with the stages inside each and what the human does in each, and says the human works with the experience while the guide keeps the documents.
- [ ] **US-117-AC5** — Given the installed skill, when its text is read, then it names the guide's knowledge sources (rules, rubric, evidence, task model, decisions) and tools (assessment, prototype, audit, journey events).

## Edge Cases

- **Two people edit the state on different branches**: it is plain JSON in a stable order, so git merges it; `validate` reports a broken merge.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-117-AC1 | a design state with each field CONTRACT-008 defines | it is validated | it passes `design-state.schema.json`; a state with an unknown field or a bad assumption status fails, naming the path |
| AC2 | US-117-AC2 | an app with a design state | `state set assumptions[+]` adds an assumption and `state get --json` runs | the assumption is returned with status `assumed`, an ID `A-<n>` and an empty evidence list, and the file is rewritten in a stable key order |
| AC3 | US-117-AC3 | a state at Explore with two untested assumptions and a chosen alternative | `ux-builder-design status` runs | it prints the activity, the chosen alternative, the count of untested assumptions, open questions and the next action, in plain words |
| AC4 | US-117-AC4 | the installed skill | its text is read | it describes the four activities with the stages inside each and what the human does in each, and says the human works with the experience while the guide keeps the documents |
| AC5 | US-117-AC5 | the installed skill | its text is read | it names the guide's knowledge sources (rules, rubric, evidence, task model, decisions) and tools (assessment, prototype, audit, journey events) |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-02, GDL-03, GDL-04
- **PRD Requirements**: FR-77
- **External**: ADR-036, CONTRACT-008, SD-006

## Out of Scope

- Checkpoints (US-118).
