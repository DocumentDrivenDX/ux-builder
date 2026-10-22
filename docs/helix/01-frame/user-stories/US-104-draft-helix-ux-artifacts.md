---
ddx:
  id: US-104
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-015
    - kind: informed_by
      to: ADR-033
    - kind: informed_by
      to: ADR-030
    - kind: informed_by
      to: FEAT-012
---

# US-104: Draft HELIX UX artifacts covering every state

**Feature**: FEAT-015 — Findings by journey, with every rule spelled out
**Feature Requirements**: RPT-09
**PRD Requirements**: FR-66
**Priority**: P1
**Status**: Draft

## Story

**As an** app developer (PRD primary persona) keeping HELIX documents current
**I want** ux-builder to draft interaction-state diagrams and wireframes for every declared state, and to fill HELIX's UX artifact types once they exist
**So that** the design of every state (empty, loading, error, success) is documented, not just the happy path

## Context

FEAT-012's `propose` and `draw` cover flows and ideal-state wireframes. RPT-09 adds a state diagram per screen covering every declared state, and wireframes per state; when HELIX defines user-journey-map, screen-flow, wireframe and interaction-state-diagram types, `propose` fills their templates.

## Walkthrough

1. The developer runs `ux-builder-blueprint draw` and `propose`.
2. draw writes a state diagram per screen and a wireframe per screen per declared state.
3. propose writes patches into the HELIX types when the installed HELIX has them.

## Acceptance Criteria

- [ ] **US-104-AC1** — Given a screen declaring states, when `draw` runs, then it writes a Mermaid `stateDiagram-v2` per screen with every declared state and the transitions between them, and a state table with what the user sees, the action available and the announcement.
- [ ] **US-104-AC2** — Given a screen declaring states, when `wireframes` runs, then it writes a wireframe per supported size class for each declared state (ideal, empty, loading, error), from the real pattern in that state.
- [ ] **US-104-AC3** — Given an installed HELIX that defines `interaction-state-diagram`, `screen-flow`, `wireframe` or `user-journey-map`, when `propose` runs, then it drafts that type from its template as a patch; when it does not, `propose` says which types are missing and writes the drafts under the run's output.
- [ ] **US-104-AC4** — Given the same blueprint, when `draw` runs twice, then its output is identical.

## Edge Cases

- **A screen with no declared states**: its diagram has the ideal state only, and the output notes the missing states.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-104-AC1 | a screen declaring states | `draw` runs | it writes a Mermaid `stateDiagram-v2` per screen with every declared state and the transitions between them, and a state table with what the user sees, the action available and the announcement |
| AC2 | US-104-AC2 | a screen declaring states | `wireframes` runs | it writes a wireframe per supported size class for each declared state (ideal, empty, loading, error), from the real pattern in that state |
| AC3 | US-104-AC3 | an installed HELIX that defines `interaction-state-diagram`, `screen-flow`, `wireframe` or `user-journey-map` | `propose` runs | it drafts that type from its template as a patch; when it does not, `propose` says which types are missing and writes the drafts under the run's output |
| AC4 | US-104-AC4 | the same blueprint | `draw` runs twice | its output is identical |

## Dependencies

- **Feature Spec**: FEAT-015
- **Feature Requirements**: RPT-09
- **PRD Requirements**: FR-66
- **External**: ADR-033, ADR-030, FEAT-012

## Out of Scope

- Writing the HELIX types (proposed in docs/proposals).
