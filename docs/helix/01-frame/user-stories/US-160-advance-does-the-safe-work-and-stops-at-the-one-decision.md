---
ddx:
  id: US-160
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: CONTRACT-008
---

# US-160: Advance does the safe work and stops at the one decision

**Feature**: FEAT-018
**Feature Requirements**: GDL-83
**PRD Requirements**: FR-77, FR-89
**Priority**: P1
**Status**: Draft

## Story

**As a** person designing an app with the guide
**I want** the agent to do every safe, deterministic step itself and come to me only with the next real decision, a recommendation and what happens after
**So that** I spend no turns on bookkeeping and always know what I am deciding

## Context

The first guided session took 456 tool calls, many of them checks and regeneration the agent coordinated by conversation.

## Walkthrough

1. The agent runs `advance --until-decision`.
2. It reports that it kept one approval through a formatting change, worked out the map, and must check one claim first.
3. It names the decision: approve the target users table, how to show it, the recommendation, the command, and that the jobs table follows.

## Acceptance Criteria

- [ ] **US-160-AC1** — Given a design, when `advance --until-decision` runs at each stage, then the decision is the intake first, then each foundation table in turn, then the coverage map, then core-1, then core-2.
- [ ] **US-160-AC2** — Given a design, when `advance --until-decision` runs, then it says what it did and checked, lists the agent's own work (document problems, unverified claims, open feedback) before the decision, gives the decision with what to show, a recommendation, the command that records it and what follows, and the budget; it records no approval; without `--until-decision` it exits 2; and the skill uses it.

## Edge Cases

- **Nothing to decide**: it says so, with the budget

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-160-AC1 | each stage | `advance --until-decision` | intake, tables, map, core-1, core-2 |
| AC2 | US-160-AC2 | a carried approval and an unverified claim | `advance --until-decision` | done, checked, work, decision; nothing recorded |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-83
- **PRD Requirements**: FR-77, FR-89
- **External**: CONTRACT-008

## Out of Scope

- Regenerating prototypes or running the audit: it names them when they are the next work.
