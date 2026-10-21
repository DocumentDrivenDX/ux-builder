---
ddx:
  id: US-082
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-011
    - kind: informed_by
      to: FEAT-009
    - kind: informed_by
      to: ADR-026
    - kind: informed_by
      to: CONTRACT-006
---

# US-082: Assess an AI journey in three scenarios

**Feature**: FEAT-011 — AI and agent experience rules
**Feature Requirements**: AIX-01, AIX-02, AIX-03
**PRD Requirements**: FR-50
**Priority**: P1
**Status**: Draft

## Story

**As an** app owner (PRD primary persona) assessing an app with an assistant or agent
**I want** each AI journey assessed as it goes right, as it goes wrong, and when it reaches a risky action
**So that** the report shows how the AI holds up when it errs or is about to do something irreversible, not only on the happy path

## Context

Cheng et al. (IUI '26) studied users in normal, error-prone and risky executions of an agent and found needs that only show when things go wrong: noticing errors, recovering without restarting, approving at the right moment. FEAT-009's assessment walks journeys through states. This story adds AI heuristics and the three scenarios to it. The risky scenario stops at the approval; the assessment never approves (FEAT-009 ENV-01).

## Walkthrough

1. The manifest marks a journey `ai: true` and declares its three scenarios: inputs for normal, an ambiguous or failing input for error-prone, and the step with the high-impact action for risky.
2. The agent running the assessment walks each scenario; the audit inspects each checkpoint in place.
3. In the risky scenario it reaches the approval, records it, denies it, and stops.
4. The report ranks findings, naming the AI rule or heuristic for each.

## Acceptance Criteria

Exact rule IDs, fields, markers and check names are proposals in SD-005 and
CONTRACT-005 *[Amendment 2026-10-21]*; the criteria name them so tests can
cite them.

- [ ] **US-082-AC1** — Given a manifest journey with `ai: true`, when `assess validate` runs, then it requires the three scenarios (`normal`, `errorProne`, `risky`) and reports any missing (CONTRACT-006).
- [ ] **US-082-AC2** — Given an AI journey, when it is assessed, then the rubric's heuristics include the AI rules for the screen's roles and the AI `review` heuristics, and each finding names one.
- [ ] **US-082-AC3** — Given the risky scenario, when the walkthrough reaches the approval, then the approval is recorded, Deny is chosen, the walkthrough stops, and no approve control is activated.
- [ ] **US-082-AC4** — Given a risky scenario where no approval appears before the high-impact step, when the walkthrough reaches the step, then it stops before acting and records a P1 finding (`agent.approve-high-impact`).
- [ ] **US-082-AC5** — Given the error-prone scenario, when the agent errs or is blocked, then the inspection records whether the error was shown in place and whether recovery was possible without restarting (`agent.recover`, `ai.improve-request`).

## Edge Cases

- **No safe way to trigger an error**: the scenario is recorded as blocked with the reason, not skipped silently.
- **A risky action that cannot be stopped before it happens** (no approval in the UI): the step is never taken; the finding says so.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-082-AC1 | a manifest journey with `ai: true` | `assess validate` runs | it requires the three scenarios (`normal`, `errorProne`, `risky`) and reports any missing (CONTRACT-006) |
| AC2 | US-082-AC2 | an AI journey | it is assessed | the rubric's heuristics include the AI rules for the screen's roles and the AI `review` heuristics, and each finding names one |
| AC3 | US-082-AC3 | the risky scenario | the walkthrough reaches the approval | the approval is recorded, Deny is chosen, the walkthrough stops, and no approve control is activated |
| AC4 | US-082-AC4 | a risky scenario where no approval appears before the high-impact step | the walkthrough reaches the step | it stops before acting and records a P1 finding (`agent.approve-high-impact`) |
| AC5 | US-082-AC5 | the error-prone scenario | the agent errs or is blocked | the inspection records whether the error was shown in place and whether recovery was possible without restarting (`agent.recover`, `ai.improve-request`) |

## Dependencies

- **Stories**: US-076
- **Feature Spec**: FEAT-011
- **Feature Requirements**: AIX-01, AIX-02, AIX-03
- **PRD Requirements**: FR-50
- **External**: CONTRACT-005 (rules, blueprint, AI markup), CONTRACT-006 (manifest scenarios); SD-005 (rule catalogue)

## Out of Scope

- Evaluating model accuracy.
