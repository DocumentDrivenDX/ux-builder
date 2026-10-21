---
ddx:
  id: US-079
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-011
    - kind: informed_by
      to: ADR-028
    - kind: informed_by
      to: US-047
---

# US-079: Users can follow and steer an agent

**Feature**: FEAT-011 — AI and agent experience rules
**Feature Requirements**: AIR-01 (agent actions, explanation, failure), AIA-01
**PRD Requirements**: FR-46, FR-48
**Priority**: P1
**Status**: Draft

## Story

**As an** app developer (PRD primary persona) building an agent that acts for users, including on a UI
**I want** rules and checks for the agent's plan, step status, approvals, interruption, takeover and recovery
**So that** the app's users can see what the agent is doing, stop it, take over, and go back a step without starting again

## Context

From Cheng et al. (IUI '26): users want the plan and next step visible, risky steps flagged for approval without confirming every step, and interrupt and takeover with clear cues. They want to revert to a prior step, to tell agent actions from their own, and to see status while not watching. Microsoft's agent guidance and HAX add on/off, state and global controls. FEAT-007 AGT-T-01 to AGT-T-05 specify the SDK's components; this story makes the same expectations rules any agent screen is checked against.

## Walkthrough

1. The agent screen shows its plan as a list of steps with statuses.
2. A step marked high-impact waits for the user's approval; the user can deny it.
3. The user presses Pause, edits a step, and hands control back; the screen shows who is acting.
4. After an error, the user returns to the previous step instead of restarting.
5. At the end, a summary lists what was done.

## Acceptance Criteria

Exact rule IDs, fields, markers and check names are proposals in SD-005 and
CONTRACT-005 *[Amendment 2026-10-21]*; the criteria name them so tests can
cite them.

- [ ] **US-079-AC1** — Given an element marked `data-piq-ai="plan"`, when the audit runs, then a warning (`agent.plan-visible`) is reported unless each step (`data-piq-ai="step"`) states its status in text.
- [ ] **US-079-AC2** — Given a running agent (`status` busy), when the audit runs, then a warning (`agent.interrupt`) is reported unless a reachable Pause or Stop control exists.
- [ ] **US-079-AC3** — Given a screen that supports takeover (`ai.takeover` in the blueprint), when the audit runs, then a warning (`agent.who-acts`) is reported unless the current actor is stated in a live region.
- [ ] **US-079-AC4** — Given a step with status `failed`, when the audit runs, then a warning (`agent.recover`) is reported unless the failure is described in text at that step and a control to retry it or return to the previous step exists.
- [ ] **US-079-AC5** — Given a finished run (`status` done), when the audit runs, then a warning (`agent.summary`) is reported unless a summary of the actions taken is shown.
- [ ] **US-079-AC6** — Given the review rules for agents (uncertainty, assumptions, attention), when the rules are read for role `agent`, then each is returned with `kind: review` and its sources.

## Edge Cases

- **An agent with one step**: no plan required; status and interrupt still apply.
- **Agent working in the background**: status must reach the user without watching, by a notification or a persistent status region (review rule `agent.status-unwatched`).

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-079-AC1 | an element marked `data-piq-ai="plan"` | the audit runs | a warning (`agent.plan-visible`) is reported unless each step (`data-piq-ai="step"`) states its status in text |
| AC2 | US-079-AC2 | a running agent (`status` busy) | the audit runs | a warning (`agent.interrupt`) is reported unless a reachable Pause or Stop control exists |
| AC3 | US-079-AC3 | a screen that supports takeover (`ai.takeover` in the blueprint) | the audit runs | a warning (`agent.who-acts`) is reported unless the current actor is stated in a live region |
| AC4 | US-079-AC4 | a step with status `failed` | the audit runs | a warning (`agent.recover`) is reported unless the failure is described in text at that step and a control to retry it or return to the previous step exists |
| AC5 | US-079-AC5 | a finished run (`status` done) | the audit runs | a warning (`agent.summary`) is reported unless a summary of the actions taken is shown |
| AC6 | US-079-AC6 | the review rules for agents (uncertainty, assumptions, attention) | the rules are read for role `agent` | each is returned with `kind: review` and its sources |

## Dependencies

- **Stories**: US-047, US-048 (FEAT-007 components that emit markers)
- **Feature Spec**: FEAT-011
- **Feature Requirements**: AIR-01 (agent actions, explanation, failure), AIA-01
- **PRD Requirements**: FR-46, FR-48
- **External**: CONTRACT-005 (rules, blueprint, AI markup); SD-005 (rule catalogue)

## Out of Scope

- How the agent decides its plan.
