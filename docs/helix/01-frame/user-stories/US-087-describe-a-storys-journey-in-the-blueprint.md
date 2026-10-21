---
ddx:
  id: US-087
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-012
    - kind: informed_by
      to: ADR-030
    - kind: informed_by
      to: CONTRACT-005
    - kind: informed_by
      to: FEAT-011
---

# US-087: Describe a story's journey in the blueprint

**Feature**: FEAT-012 — Screen flows and user journeys in the blueprint
**Feature Requirements**: JRN-01, JRN-02, JRN-03
**PRD Requirements**: FR-54
**Priority**: P2
**Status**: Draft

## Story

**As an** app developer (PRD primary persona) whose app is governed by HELIX stories
**I want** to describe each story's journey as steps through the flow, with alternates, and have it checked against the flow and the story
**So that** every story has a walkable path, every risky step has its safeguard, and the journey is written once

## Context

A journey ties a HELIX story and its acceptance criteria to steps through screens, actions and states (JRN-01). The check walks it over the flow (US-086), checks risky steps against FEAT-008's safeguards and FEAT-011's approvals, and, with a HELIX marker, reads the stories without writing them (JRN-03).

## Walkthrough

1. The developer adds journey J-review for US-012 (criteria AC1–AC3): queue → Open entry → entry → Reject → modal:reject → Confirm → queue.
2. They add an alternate from the entry screen for the error state.
3. The check reports `journey.safeguarded`: Reject is destructive with no safeguard.
4. They add `safeguard: confirm`; the check passes.

## Acceptance Criteria

Field names, rule IDs and commands are proposals in CONTRACT-005 *Flows and
journeys* and FEAT-012; the criteria name them so tests can cite them.

- [ ] **US-087-AC1** — Given a journey step whose action is not on its screen, or whose next step is not where that action leads, when the blueprint is checked, then `journey.walkable` warns with the step's path.
- [ ] **US-087-AC2** — Given a journey step that takes a destructive action with no safeguard or a high-impact action with no approval, when the blueprint is checked, then `journey.safeguarded` warns.
- [ ] **US-087-AC3** — Given a journey through a screen that declares an error state, when no alternate covers that state, then `journey.covers-errors` warns.
- [ ] **US-087-AC4** — Given a HELIX marker and an app screen serving a story no journey covers, when the blueprint is checked, then `journey.story-covered` warns naming the story.
- [ ] **US-087-AC5** — Given a journey naming a criterion its story lacks, when the blueprint is checked, then it warns naming the criterion, and no HELIX document is written.
- [ ] **US-087-AC6** — Given no HELIX marker, when the blueprint is checked, then the story checks are skipped and the output says so.

## Edge Cases

- **An alternate with a FEAT-011 scenario** (`risky`): checked as an AI journey's scenario when the screen declares an AI role.
- **A journey leaving the app** (`to: external`): ends there, or resumes at `entry`.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-087-AC1 | a journey step whose action is not on its screen, or whose next step is not where that action leads | the blueprint is checked | `journey.walkable` warns with the step's path |
| AC2 | US-087-AC2 | a journey step that takes a destructive action with no safeguard or a high-impact action with no approval | the blueprint is checked | `journey.safeguarded` warns |
| AC3 | US-087-AC3 | a journey through a screen that declares an error state | no alternate covers that state | `journey.covers-errors` warns |
| AC4 | US-087-AC4 | a HELIX marker and an app screen serving a story no journey covers | the blueprint is checked | `journey.story-covered` warns naming the story |
| AC5 | US-087-AC5 | a journey naming a criterion its story lacks | the blueprint is checked | it warns naming the criterion, and no HELIX document is written |
| AC6 | US-087-AC6 | no HELIX marker | the blueprint is checked | the story checks are skipped and the output says so |

## Dependencies

- **Stories**: US-086
- **Feature Spec**: FEAT-012
- **Feature Requirements**: JRN-01, JRN-02, JRN-03
- **PRD Requirements**: FR-54
- **External**: CONTRACT-005 *Flows and journeys*

## Out of Scope

- Running the journey (the assessment does, US-088).
