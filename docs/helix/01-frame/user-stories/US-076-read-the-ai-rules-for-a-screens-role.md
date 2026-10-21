---
ddx:
  id: US-076
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

# US-076: Read the AI rules for a screen's role

**Feature**: FEAT-011 — AI and agent experience rules
**Feature Requirements**: AIR-01, AIR-02, AIO-01, AIO-02
**PRD Requirements**: FR-46
**Priority**: P1
**Status**: Draft

## Story

**As an** AI coding agent (PRD secondary persona) building a screen with AI in it
**I want** the AI rules that apply to that screen's role, with their sources, from the installed SDK
**So that** I build disclosure, control, approvals and recovery from cited rules instead of from my training data

## Context

FEAT-008 gave agents the rules for a context, size class and input (`get_rules`). AI screens have no rules. FEAT-011 adds AI rule families (SD-005) that apply by a screen's AI role (`generative`, `assistant`, `agent`), alone or with the existing axes.

## Walkthrough

1. The agent reads the blueprint and finds a screen with `ai.roles: ["agent"]`.
2. It calls `get_rules` with that role, the app's size classes and inputs.
3. The SDK returns the AI rules for agents plus the rules for the size classes, each with its statement, rationale, check and sources.
4. The agent builds the screen to them.

## Acceptance Criteria

Exact rule IDs, fields, markers and check names are proposals in SD-005 and
CONTRACT-005 *[Amendment 2026-10-21]*; the criteria name them so tests can
cite them.

- [ ] **US-076-AC1** — Given the installed catalogue, when `rulesFor` (or `get_rules`) is asked for role `agent`, then every rule whose `when.aiRole` includes `agent`, and every rule with no AI condition that matches the other axes, is returned, and no rule for another role only.
- [ ] **US-076-AC2** — Given a target with no AI role, when the rules are read, then no rule with a `when.aiRole` condition is returned.
- [ ] **US-076-AC3** — Given a target of context `view` and role `agent`, when the rules are read, then both the view rules and the agent rules are returned.
- [ ] **US-076-AC4** — Given any AI rule in the catalogue, when it is read, then it has a statement, rationale, check kind and at least one source with licence and `wording: paraphrased`.
- [ ] **US-076-AC5** — Given the generated guidance (`AGENTS.md`, the skill), when an agent reads it, then it lists the AI rule IDs by role and says to declare each screen's AI role in the blueprint.

## Edge Cases

- **An unknown role**: `get_rules` refuses it naming the valid roles.
- **A rule with only `review` checks**: returned like any other, so the agent and the assessment see it.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-076-AC1 | the installed catalogue | `rulesFor` (or `get_rules`) is asked for role `agent` | every rule whose `when.aiRole` includes `agent`, and every rule with no AI condition that matches the other axes, is returned, and no rule for another role only |
| AC2 | US-076-AC2 | a target with no AI role | the rules are read | no rule with a `when.aiRole` condition is returned |
| AC3 | US-076-AC3 | a target of context `view` and role `agent` | the rules are read | both the view rules and the agent rules are returned |
| AC4 | US-076-AC4 | any AI rule in the catalogue | it is read | it has a statement, rationale, check kind and at least one source with licence and `wording: paraphrased` |
| AC5 | US-076-AC5 | the generated guidance (`AGENTS.md`, the skill) | an agent reads it | it lists the AI rule IDs by role and says to declare each screen's AI role in the blueprint |

## Dependencies

- **Stories**: none
- **Feature Spec**: FEAT-011
- **Feature Requirements**: AIR-01, AIR-02, AIO-01, AIO-02
- **PRD Requirements**: FR-46
- **External**: CONTRACT-005 (rules, blueprint, AI markup); SD-005 (rule catalogue)

## Out of Scope

- Writing the AI screen's code.
