---
ddx:
  id: US-077
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-011
    - kind: informed_by
      to: ADR-028
    - kind: informed_by
      to: CONTRACT-005
---

# US-077: Plan an AI screen in the blueprint

**Feature**: FEAT-011 — AI and agent experience rules
**Feature Requirements**: AIB-01, AIB-02
**PRD Requirements**: FR-47
**Priority**: P1
**Status**: Draft

## Story

**As an** app developer (PRD primary persona) planning a screen with an assistant or agent
**I want** to declare its AI role, its high-impact actions and what data it sends, and have the plan checked
**So that** unsafe AI designs are found before any code: a payment with no approval, an add-on with no fallback, data sent with no consent

## Context

The blueprint (CONTRACT-005) already plans screens, actions and states. FEAT-011 adds `screens[].ai`. As with `destructiveActions` and their safeguards, each high-impact action must name its approval.

## Walkthrough

1. The developer adds `ai` to the screen: roles, `acts: true`, `highImpactActions: [{ label: "Submit payment", approval: "each" }]`, `dataLeavesDevice: true`.
2. They run `ux-builder-blueprint check`.
3. The check returns a warning for each AI rule the plan breaks, with its path, rule ID and fix.
4. They fix the plan; the check passes.

## Acceptance Criteria

Exact rule IDs, fields, markers and check names are proposals in SD-005 and
CONTRACT-005 *[Amendment 2026-10-21]*; the criteria name them so tests can
cite them.

- [ ] **US-077-AC1** — Given a screen with `ai.roles` including `agent` and `acts: true` but no `highImpactActions`, when the blueprint is checked, then a warning (`agent.declare-high-impact`) asks the developer to list them or to set `acts: false`.
- [ ] **US-077-AC2** — Given a high-impact action with `approval: "none"` or no approval, when the blueprint is checked, then a warning (`agent.approve-high-impact`) names the action.
- [ ] **US-077-AC3** — Given a screen with role `generative` whose AI is an add-on (`ai.essential` false or absent) and no `fallback`, when the blueprint is checked, then a warning (`ai.fallback`) asks for the screen or destination that does the job without AI.
- [ ] **US-077-AC4** — Given `dataLeavesDevice: true` and no consent screen or modal declared (`ai.consent`), when the blueprint is checked, then a warning (`ai.consent`) is reported.
- [ ] **US-077-AC5** — Given a blueprint with no `ai` on any screen, when it is checked, then its findings are exactly as before this feature.
- [ ] **US-077-AC6** — Given an `ai` object with an unknown field or role, when it is checked, then `blueprint.valid` reports an error naming it.

## Edge Cases

- **`approval: "plan"`**: allowed only when the screen also shows its plan (`agent.plan-visible`); otherwise a warning.
- **A screen with two roles** (`assistant` and `agent`): both families apply.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-077-AC1 | a screen with `ai.roles` including `agent` and `acts: true` but no `highImpactActions` | the blueprint is checked | a warning (`agent.declare-high-impact`) asks the developer to list them or to set `acts: false` |
| AC2 | US-077-AC2 | a high-impact action with `approval: "none"` or no approval | the blueprint is checked | a warning (`agent.approve-high-impact`) names the action |
| AC3 | US-077-AC3 | a screen with role `generative` whose AI is an add-on (`ai.essential` false or absent) and no `fallback` | the blueprint is checked | a warning (`ai.fallback`) asks for the screen or destination that does the job without AI |
| AC4 | US-077-AC4 | `dataLeavesDevice: true` and no consent screen or modal declared (`ai.consent`) | the blueprint is checked | a warning (`ai.consent`) is reported |
| AC5 | US-077-AC5 | a blueprint with no `ai` on any screen | it is checked | its findings are exactly as before this feature |
| AC6 | US-077-AC6 | an `ai` object with an unknown field or role | it is checked | `blueprint.valid` reports an error naming it |

## Dependencies

- **Stories**: US-076
- **Feature Spec**: FEAT-011
- **Feature Requirements**: AIB-01, AIB-02
- **PRD Requirements**: FR-47
- **External**: CONTRACT-005 (rules, blueprint, AI markup); SD-005 (rule catalogue)

## Out of Scope

- Generating code from the blueprint.
