---
ddx:
  id: US-153
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: ADR-042
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: CONTRACT-008
---

# US-153: Foundations reviewed deliberately, what is built from them as one coverage map

**Feature**: FEAT-018
**Feature Requirements**: GDL-83
**PRD Requirements**: FR-77, FR-89
**Priority**: P1
**Status**: Draft

## Story

**As a** person designing an app with the guide (PRD primary persona)
**I want** to review the foundations (brief, users, jobs, stories, rules, decisions) carefully, a table per kind, and what is built from them as one map of what covers what
**So that** my attention goes to what everything else rests on, not to approving dozens of derived items one by one

## Context

In the first guided session, 52 of 100 human turns were approvals, most of items derived from facts the person had already approved. The foundations deserve deliberate review; tasks, journeys and screens built from them need review only where they add, miss or change something.

## Walkthrough

1. `review` lists the foundations a table per kind and the built items as the map.
2. The person reviews the target users table, every row in full, and approves it in one answer.
3. `review map` shows each job with its tasks, journeys and screens, and two exceptions: a job nothing serves, a screen on no journey.
4. The person accepts one, the other is fixed, and approving the map approves every built item.
5. Later a journey changes: only it comes back, with its diff.

## Acceptance Criteria

- [ ] **US-153-AC1** — Given an app with foundations, built items and an evidence record, when `review` runs, then it lists foundations and built items apart, records need no approval and hold no checkpoint, and its next step names the first foundation table.
- [ ] **US-153-AC2** — Given target users awaiting review, when `review table user` runs, then it shows every user in full with its status, `review approve --kind user --answer` approves them all in the person's words, open feedback on any refuses it, and a built kind has no table and no `--kind` approval.
- [ ] **US-153-AC3** — Given a blueprint and jobs, when `review map` runs, then it traces each job to its tasks, journeys and screens and lists the exceptions (a job nothing serves, a task serving no job, a journey with no story or task, a screen on no journey, an undefined rule, a new assumption); `review approve map` refuses, naming them, until each is fixed or accepted with `--accept`, and then approves every built item; once approved, the map is proposed as the solution design's *Experience Traceability* (need, task, flow, view; ADR-042).
- [ ] **US-153-AC4** — Given an approved map, when a built item's meaning changes, then the map lists only that item, with its diff, and approving the map approves only it.
- [ ] **US-153-AC5** — Given the skill, when it is read, then it reviews foundations a table per kind, built items as the map with exceptions one by one, records only as the decisions they lead to, and never asks for the same content twice.

## Edge Cases

- **A foundation with feedback open**: the table cannot be approved until the feedback is addressed
- **An exception the person accepts**: is recorded with the map's approval; an accepted assumption is not raised again

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-153-AC1 | all three tiers | `review` | tiers apart; records not gating |
| AC2 | US-153-AC2 | two users | `review table`, `approve --kind` | one approval for both |
| AC3 | US-153-AC3 | a gap, a stray screen, a new assumption | `review map`, `approve map` | refused, then accepted |
| AC4 | US-153-AC4 | an approved map, a changed journey | `review map` | only the change |
| AC5 | US-153-AC5 | the skill | read | three tiers |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-83
- **PRD Requirements**: FR-77, FR-89
- **External**: CONTRACT-008

## Out of Scope

- Choosing which foundations to skip: every foundation kind is still reviewed.
