---
ddx:
  id: US-105
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-016
    - kind: informed_by
      to: ADR-035
    - kind: informed_by
      to: CONTRACT-007
---

# US-105: Every build is an episode

**Feature**: FEAT-016 — Learning from builds
**Feature Requirements**: TRC-01, TRC-02
**PRD Requirements**: FR-67
**Priority**: P1
**Status**: Draft

## Story

**As an** app owner (PRD primary persona)
**I want** every app creation and every UI or UX change to be an episode with a goal, linked to its commits
**So that** I can follow any screen's history from the goal to the change that made it

## Context

ADR-035 makes each build an episode, opened by create-app, `ux-builder-trace start` or MCP `start_episode`, and named on each of its commits.

## Walkthrough

1. The developer creates an app; its trace starts with episode E-20261022-create.
2. Later an agent calls `start_episode` with goal US-003 and screen review.
3. Its commits end with `UX-Episode: E-20261022-review-screen`.
4. `ux-builder-trace end` closes the episode.

## Acceptance Criteria

- [ ] **US-105-AC1** — Given `npm create @ux-builder/app`, when it creates the app, then `.ux-builder/trace/` holds one episode whose first events are `start` (trigger `create`, the agent and model when known, the SDK and HELIX versions) and `created`.
- [ ] **US-105-AC2** — Given `ux-builder-trace start --goal "…" --story US-003 --screen review`, or MCP `start_episode` with the same arguments, when it runs, then a new episode is opened with that goal, and `.ux-builder/trace/current` names it.
- [ ] **US-105-AC3** — Given an episode is open, when `start` runs again, then it exits 1 naming the open episode.
- [ ] **US-105-AC4** — Given commits made in an episode, when `trace end` runs, then the `change` event lists those carrying `UX-Episode: <id>` and warns about any that lack it.
- [ ] **US-105-AC5** — Given no open episode, when a tool writes an event, then it goes to `E-<date>-unscoped-<branch>`, and that episode's `end` status is `unscoped`.
- [ ] **US-105-AC6** — Given a read-only `.ux-builder/`, when a tool writes an event, then the tool still succeeds and warns once on stderr.

## Edge Cases

- **Two branches at once**: each branch has its own open episode, keyed by branch.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-105-AC1 | `npm create @ux-builder/app` | it creates the app | `.ux-builder/trace/` holds one episode whose first events are `start` (trigger `create`, the agent and model when known, the SDK and HELIX versions) and `created` |
| AC2 | US-105-AC2 | `ux-builder-trace start --goal "…" --story US-003 --screen review`, or MCP `start_episode` with the same arguments | it runs | a new episode is opened with that goal, and `.ux-builder/trace/current` names it |
| AC3 | US-105-AC3 | an episode is open | `start` runs again | it exits 1 naming the open episode |
| AC4 | US-105-AC4 | commits made in an episode | `trace end` runs | the `change` event lists those carrying `UX-Episode: <id>` and warns about any that lack it |
| AC5 | US-105-AC5 | no open episode | a tool writes an event | it goes to `E-<date>-unscoped-<branch>`, and that episode's `end` status is `unscoped` |
| AC6 | US-105-AC6 | a read-only `.ux-builder/` | a tool writes an event | the tool still succeeds and warns once on stderr |

## Dependencies

- **Feature Spec**: FEAT-016
- **Feature Requirements**: TRC-01, TRC-02
- **PRD Requirements**: FR-67
- **External**: ADR-035, CONTRACT-007

## Out of Scope

- The learning store.
