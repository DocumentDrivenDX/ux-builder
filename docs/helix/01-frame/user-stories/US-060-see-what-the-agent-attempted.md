---
ddx:
  id: US-060
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-009
    - kind: informed_by
      to: ADR-026
---

# US-060: See what the agent attempted and observed

**Feature**: FEAT-009 — HELIX-aware UX assessment
**Brief**: UA-S05
**Feature Requirements**: JRN-01, JRN-02, JRN-03, JRN-04, JRN-05, ENV-01, ENV-02, ENV-03
**PRD Requirements**: FR-40
**Priority**: P2
**Status**: Draft

## Story

**As a** reviewer
**I want** each journey's plan, steps and checkpoints recorded with evidence
**So that** I can see what the agent actually tried and saw, not a summary of it

## Context

ADR-026 decision 4: the agent drives a browser it shares with the audit over CDP.

## Walkthrough

1. The agent plans each journey from its story and the E2E test's setup.
2. It walks the journey, recording a checkpoint at each significant step, and inspects it (US-062).

## Acceptance Criteria

- [ ] **US-060-AC1** — Given a journey, when it is planned, then its role, fixture, entry route, goal, steps, expected outcomes and story and criterion IDs are recorded, reusing the E2E setup and paths where the manifest maps them.
- [ ] **US-060-AC2** — Given a walkthrough, when the agent observes a screen, then it uses screenshots and the accessibility tree from a supported driver, and an observation based on DOM text alone is not recorded as a visual judgment.
- [ ] **US-060-AC3** — Given each significant step, when a checkpoint is recorded, then it has the URL, the actions so far, the observation and evidence references, and agent judgments are stored apart from deterministic failures.
- [ ] **US-060-AC4** — Given a state that needs a fixture, mock, permission or integration the manifest does not provide, when it is attempted, then it is `blocked` or `not assessed` with the reason and no observation.
- [ ] **US-060-AC5** — Given a walkthrough, when a step would leave `run.origins`, call an excluded integration or take a denied action, then it is not taken and is recorded as `blocked: restricted`; each scenario starts after its fixture's `reset`; and every screenshot and tree is masked per `evidence.redact` before it is written.

## Edge Cases

- A step the driver cannot perform ends the journey as `partial` at that step.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Plan | US-060-AC1 | Journey mapped to an E2E spec | Plan | Fields recorded; setup reused |
| Observe | US-060-AC2 | Checkpoint record | Validate | Screenshot and tree references required for visual judgments |
| Checkpoint | US-060-AC3 | Walkthrough | Record | URL, actions, observation, evidence; judgment separate |
| Restricted | US-060-AC5 | Step to another origin; a payment button | Attempt | Not taken; recorded; reset ran; masked evidence |
| Blocked | US-060-AC4 | State needing an absent mock | Attempt | blocked with reason |

## Dependencies

- **Feature Spec**: FEAT-009
- **Feature Requirements**: JRN-01, JRN-02, JRN-03, JRN-04, JRN-05, ENV-01, ENV-02, ENV-03
- **PRD Requirements**: FR-40
- **External**: CONTRACT-006; CONTRACT-004 revision

## Out of Scope

- See FEAT-009 "Out of Scope".
