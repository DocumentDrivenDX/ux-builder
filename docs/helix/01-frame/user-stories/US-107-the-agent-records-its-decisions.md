---
ddx:
  id: US-107
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

# US-107: The agent records its decisions

**Feature**: FEAT-016 — Learning from builds
**Feature Requirements**: TRC-05
**PRD Requirements**: FR-69
**Priority**: P1
**Status**: Draft

## Story

**As an** AI coding agent (PRD secondary persona)
**I want** to record what I chose, what else I considered and why, at every pattern choice, departure and workaround
**So that** people and ux-builder can learn from my reasoning without reading my whole transcript

## Context

ADR-035 relies on recorded decisions rather than hidden model reasoning. The MCP tool `record_decision` writes a `decision` event.

## Walkthrough

1. The agent chooses `WorkQueue` over `CollectionList` for the review screen.
2. It calls `record_decision` with what it chose, what it considered, why, and the rules it relied on.
3. It works around a missing date-range control and records `workaround: true`.

## Acceptance Criteria

- [ ] **US-107-AC1** — Given an open episode, when MCP `record_decision` is called with `chose`, `considered`, `why`, `relied`, `departs`, `workaround` and `screen`, then a `decision` event records them, with masking applied to `why`.
- [ ] **US-107-AC2** — Given `record_decision` without `chose` or `why`, when it is called, then it answers with an error naming the missing field and writes nothing.
- [ ] **US-107-AC3** — Given a created app, when its `AGENTS.md` and the skill are read, then they tell the agent to open an episode, record a decision at every pattern choice, departure from guidance and workaround, add the commit trailer and end the episode.
- [ ] **US-107-AC4** — Given an episode whose `change` touched screens but holds no `decision`, when `trace end` runs, then it warns that no decisions were recorded.

## Edge Cases

- **A decision about no screen**: `screen` is omitted.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-107-AC1 | an open episode | MCP `record_decision` is called with `chose`, `considered`, `why`, `relied`, `departs`, `workaround` and `screen` | a `decision` event records them, with masking applied to `why` |
| AC2 | US-107-AC2 | `record_decision` without `chose` or `why` | it is called | it answers with an error naming the missing field and writes nothing |
| AC3 | US-107-AC3 | a created app | its `AGENTS.md` and the skill are read | they tell the agent to open an episode, record a decision at every pattern choice, departure from guidance and workaround, add the commit trailer and end the episode |
| AC4 | US-107-AC4 | an episode whose `change` touched screens but holds no `decision` | `trace end` runs | it warns that no decisions were recorded |

## Dependencies

- **Feature Spec**: FEAT-016
- **Feature Requirements**: TRC-05
- **PRD Requirements**: FR-69
- **External**: ADR-035, CONTRACT-007

## Out of Scope

- Judging whether a decision was right.
