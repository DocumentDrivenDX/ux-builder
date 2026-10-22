---
ddx:
  id: US-106
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-016
    - kind: informed_by
      to: ADR-035
    - kind: informed_by
      to: CONTRACT-007
    - kind: informed_by
      to: CONTRACT-004
---

# US-106: The trace records what ux-builder said and every check

**Feature**: FEAT-016 — Learning from builds
**Feature Requirements**: TRC-03, TRC-04
**PRD Requirements**: FR-68
**Priority**: P1
**Status**: Draft

## Story

**As an** app owner reviewing an agent's work (PRD primary persona)
**I want** the trace to show every answer ux-builder gave the agent and every check it ran, failures included
**So that** I can see what the agent was told and how many tries each check took

## Context

Today the MCP server logs nothing and checks keep only their last result. TRC-03 has each tool append its own event.

## Walkthrough

1. The agent calls `get_rules` and `get_guidance`; each writes a `guidance` event.
2. Lint fails twice on `ux-builder/no-hard-coded-values`, then passes; three `check` events record attempts 1 to 3.
3. The audit passes; `trace end` writes `outcome` with `checksToGreen: { lint: 3, audit: 1 }`, the attempt on which each check first passed.

## Acceptance Criteria

- [ ] **US-106-AC1** — Given an open episode, when any MCP tool answers, then a `guidance` event records the tool, its input and the rule IDs, components and recipes it returned, with the guidance hash.
- [ ] **US-106-AC2** — Given an open episode, when lint, `check:blueprint`, `checkCard` or the audit runs, then a `check` event records its status, its attempt number for that check, and each rule ID found with its severity and count.
- [ ] **US-106-AC3** — Given an episode with checks, when `trace end` runs, then `outcome` gives the audit's verdicts, its findings per rule, and the attempts each check took before its first pass.
- [ ] **US-106-AC4** — Given any event, when it is written, then it contains no source code or file contents, and validates against `event.schema.json`.
- [ ] **US-106-AC5** — Given a created app, when its `.gitignore` is read, then `.ux-builder/trace/` is committed and only `.ux-builder/trace/current` is ignored.

## Edge Cases

- **An assessment ran in the episode**: `outcome.assessment` names its run and `compare` classes.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-106-AC1 | an open episode | any MCP tool answers | a `guidance` event records the tool, its input and the rule IDs, components and recipes it returned, with the guidance hash |
| AC2 | US-106-AC2 | an open episode | lint, `check:blueprint`, `checkCard` or the audit runs | a `check` event records its status, its attempt number for that check, and each rule ID found with its severity and count |
| AC3 | US-106-AC3 | an episode with checks | `trace end` runs | `outcome` gives the audit's verdicts, its findings per rule, and the attempts each check took before its first pass |
| AC4 | US-106-AC4 | any event | it is written | it contains no source code or file contents, and validates against `event.schema.json` |
| AC5 | US-106-AC5 | a created app | its `.gitignore` is read | `.ux-builder/trace/` is committed and only `.ux-builder/trace/current` is ignored |

## Dependencies

- **Feature Spec**: FEAT-016
- **Feature Requirements**: TRC-03, TRC-04
- **PRD Requirements**: FR-68
- **External**: ADR-035, CONTRACT-007, CONTRACT-004

## Out of Scope

- Changing what the checks check.
