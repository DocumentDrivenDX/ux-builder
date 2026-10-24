---
ddx:
  id: US-146
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-036
    - kind: informed_by
      to: CONTRACT-008
---

# US-146: Describe target users with their context and evidence

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-77
**PRD Requirements**: FR-81
**Priority**: P2
**Status**: Draft

## Story

**As a** designer or developer using the guide (PRD primary persona)
**I want** each target user described once, with their context, needs and the jobs they hold, backed by evidence
**So that** the design, the tests and the results are organized by the people they are for, without a second, invented description of them

## Context

Until now target users were one-line points in the brief, and the PRD's personas were read in beside them; nothing linked a user to the jobs, tasks, tests or findings about them. The same job can matter more to one user than another, and a user's context (one hand on a phone at the riverbank) changes the design. This story makes target users records in `docs/ux/users.md`, rated like jobs, and connects them to the rest of the loop. They are evidence-backed segments, not personas with invented biographies.

## Walkthrough

1. The agent proposes two target users as hypotheses: weekend anglers new to an area (on a phone at the riverbank) and fishing guides (know the water; plan for clients).
2. An interview confirms the first; its row cites EV-1 and becomes medium confidence.
3. The brief's Target users now shows both, each with its context and status.
4. Task T-1 serves U-1; T-2 serves U-1 and U-2.
5. The test kit's screener asks about each user, and each scenario says who it is for; the facilitator notes each participant's user on the sheet.
6. The evaluation report shows completion by user.

## Acceptance Criteria

- [ ] **US-146-AC1** — Given a `docs/ux/users.md` written from the template, when `ux-builder-design validate` runs, then it checks every row has a unique `U-<n>` ID, a user, a context, jobs with an importance each, evidence, a confidence and a status; confidence above low needs at least one evidence source, and a hypothesis cites none.
- [ ] **US-146-AC2** — Given a user row citing a job `jobs.md` lacks, or an evidence source that does not exist, when `validate` runs, then it exits 1 naming the user and the missing ID.
- [ ] **US-146-AC3** — Given `users.md`, when `ux-builder-design brief` runs, then the brief's Target users lists each user with its context and status, from `users.md` alone (not the PRD's personas or separate user points).
- [ ] **US-146-AC4** — Given a task whose `users` cites a user `users.md` lacks, when `validate` runs, then it exits 1 naming the task and the ID; a task citing a low-confidence user gets a warning.
- [ ] **US-146-AC5** — Given tasks that name their users, when `test-kit` runs, then the screener asks about each target user with its context, `scenarios.md` says who each task is for, and `observations.csv` has a `user` column.
- [ ] **US-146-AC6** — Given imported observations whose rows name a user, when `report` runs, then its measures are broken down by user; and `trace U-<n>` lists the user's jobs, tasks and journeys.

## Edge Cases

- **No `users.md`**: everything works as before; the brief reads target users from the design state and the PRD's personas.
- **An observation row with no user**: it counts in the totals, and under "not recorded" in the breakdown.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-146-AC1 | a `docs/ux/users.md` written from the template | `ux-builder-design validate` runs | every row's fields are checked, with the jobs table's evidence rules |
| AC2 | US-146-AC2 | a user citing a missing job or evidence source | `validate` runs | it exits 1 naming the user and the missing ID |
| AC3 | US-146-AC3 | `users.md` | `brief` runs | Target users lists each user with context and status, from `users.md` alone |
| AC4 | US-146-AC4 | a task citing an unknown or low-confidence user | `validate` runs | exit 1 naming task and ID; a warning for a low-confidence user |
| AC5 | US-146-AC5 | tasks that name their users | `test-kit` runs | screener by user with context; scenarios say who each task is for; the sheet has a `user` column |
| AC6 | US-146-AC6 | observations naming users | `report` runs; `trace U-<n>` runs | measures by user; the user's jobs, tasks and journeys |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-77
- **PRD Requirements**: FR-81
- **External**: ADR-036, CONTRACT-008

## Out of Scope

- Production insights by user: journey events carry no user, by design (ADR-038).
- Moving the users table into HELIX (stage 2).
