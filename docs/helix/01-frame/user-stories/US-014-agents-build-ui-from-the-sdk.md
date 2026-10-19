---
ddx:
  id: US-014
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-004
    - kind: informed_by
      to: CONTRACT-001
---

# US-014: AI coding agents build UI from the SDK, not from invention

**Feature**: FEAT-004 — App SDK
**Feature Requirements**: SDK-12, SDK-13, SDK-14
**PRD Requirements**: FR-21
**Priority**: P1 (guidance, catalogue) / P2 (MCP server)
**Status**: Draft

## Story

**As a** developer who works with an AI coding agent
**I want** the SDK to ship instructions and a catalogue the agent reads, naming the widgets, tokens and rules
**So that** "add a filter bar" produces a `ChoicePicker` on role tokens, not a hand-rolled component with hard-coded colours

## Context

Agents write much of the UI code in adopting apps. Without guidance they
invent components and literal values, which the lint rule then rejects or,
worse, which slip through. The catalogue must be generated from the source,
or it drifts like a hand-written gallery would.

## Walkthrough

1. The SDK package ships `AGENTS.md`-style guidance (a Claude skill or
   equivalent) and `catalogue.json`.
2. An agent asked for a filter bar reads both, uses `ChoicePicker` and
   `--piq-…` tokens, and runs the lint rule.
3. With the MCP server (P2), an agent lists widgets, tokens and themes without
   reading files.

## Acceptance Criteria

- [ ] **US-014-AC1** — Given the source, when `npm run check` runs, then the catalogue (every token with its role, group and purpose; every widget with its props and purpose) is regenerated, and a committed copy that differs fails the build.
- [ ] **US-014-AC2** — Given the guidance file, when it is tested, then every token and widget it names exists in the catalogue.
- [ ] **US-014-AC3** — Given the guidance, when an agent reads it, then it states: use SDK widgets; use role tokens; never hard-code colours, fonts or radii; run the lint rule; select themes with the provider.
- [ ] **US-014-AC4** — Given a graded sample of agent tasks, when the output is reviewed, then ≥ 90% of components use SDK widgets and role tokens (PRD metric).
- [ ] **US-014-AC5** — (P2) Given the MCP server, when an agent lists widgets, tokens or themes, then it receives the catalogue's entries.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Fresh catalogue | US-014-AC1 | Change a widget prop | `npm run check` | Fails until regenerated |
| Guidance names real things | US-014-AC2 | Guidance file | Test | Every name in catalogue |
| Rules present | US-014-AC3 | Guidance file | Review | Five rules present |
| Graded sample | US-014-AC4 | 10 agent tasks | Review | ≥ 90% |
| MCP | US-014-AC5 | Server | List calls | Catalogue entries |

## Dependencies

- **Feature Spec**: FEAT-004
- **External**: beads `d4b0e72f` (guidance, catalogue), `d4fb4c65` (MCP)

## Out of Scope

- Agents creating brands (FEAT-003).
