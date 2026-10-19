---
ddx:
  id: US-031
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-006
    - kind: informed_by
      to: ADR-020
    - kind: informed_by
      to: ADR-021
    - kind: informed_by
      to: ADR-022
    - kind: informed_by
      to: US-014
---

# US-031: An agent builds a list, detail and form screen from patterns

**Feature**: FEAT-006 — Screen patterns
**Feature Requirements**: AGT-01, AGT-02, AGT-03
**PRD Requirements**: FR-21, FR-25
**Priority**: P1
**Status**: Draft

## Story

**As an** AI coding agent working in an app built on the SDK
**I want** the catalogue and MCP server to list every screen pattern with its slots, states, size-class behaviour and variant points, and guidance on which to choose
**So that** asked for "a matters list with a detail panel and an edit form", I compose patterns and supply only the app's data, instead of hand-writing layout

## Context

Requested by the operator on 2026-10-18; implements FEAT-006's agent
guidance under ADR-020, extending US-014 (agents build UI from the SDK)
from widgets and tokens to patterns. Without it, agents hand-build layouts
with literal breakpoints that drift from the design system, skip empty and
error states, and fail at phone widths. Like the widget catalogue, pattern
entries are generated from source so they cannot drift.

## Walkthrough

1. A developer asks the agent for "a matters list with a detail panel and
   an edit form".
2. The agent lists patterns through `@ux-builder/mcp` and reads the guidance
   on list versus list-with-detail and full-page form versus quick create.
3. It composes the app shell, list-with-detail and full-page form, and
   supplies columns, fields, data and actions through slots.
4. It runs lint and the audit; both pass at every size class, with no
   layout CSS in the app.

## Acceptance Criteria

- [ ] **US-031-AC1** — Given the source, when `npm run check` runs, then `catalogue.json` is regenerated with an entry for every pattern naming its slots, states, size-class behaviour and variant points, and a committed copy that differs fails the build.
- [ ] **US-031-AC2** — Given the MCP server, when an agent lists or looks up patterns, then it receives the same pattern entries as the catalogue.
- [ ] **US-031-AC3** — Given the agent guidance, when it is tested, then it states when to choose list or list-with-detail, full-page form or quick create, and table or stacked items, and every pattern it names exists in the catalogue.
- [ ] **US-031-AC4** — Given the agent rules in the catalogue, when read, then they direct agents to compose screens from patterns and layout primitives before writing layout CSS.
- [ ] **US-031-AC5** — Given a graded sample of 10 agent tasks asking for list, detail and form screens, when the output is reviewed, then at least 9 use the matching patterns and contain no app-written layout CSS, and their pattern stories pass the audit at one width per size class.

## Edge Cases

- **Request that matches no pattern** (a board view before it is admitted): guidance says to compose from layout primitives and widgets, and to flag the need under ADR-020's admission rule.
- **Agent without MCP access**: the same entries are in `catalogue.json` in the installed package.
- **Pattern added without catalogue regeneration**: `npm run check` fails.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Fresh catalogue | US-031-AC1 | Add a slot to the collection list | `npm run check` | Fails until regenerated; entry lists the slot |
| MCP parity | US-031-AC2 | Server and catalogue | List patterns | Same entries |
| Choice guidance | US-031-AC3 | Guidance file | Test | Three choices present; names exist |
| Rules | US-031-AC4 | Catalogue rules | Read | Patterns and primitives before layout CSS |
| Graded sample | US-031-AC5 | 10 tasks | Review; lint; audit | ≥ 9 compliant; audit exit 0 |

## Dependencies

- **Stories**: US-014, US-024, US-025, US-026, US-027
- **Feature Spec**: FEAT-006
- **Feature Requirements**: AGT-01, AGT-02, AGT-03
- **PRD Requirements**: FR-21, FR-25
- **External**: CONTRACT-004 revision (catalogue and MCP pattern entries)

## Out of Scope

- Agents creating brands or design systems (FEAT-003).
- Wizard and task-list guidance until those P1 patterns land.
