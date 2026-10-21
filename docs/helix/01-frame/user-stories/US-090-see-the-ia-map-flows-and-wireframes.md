---
ddx:
  id: US-090
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-012
    - kind: informed_by
      to: ADR-030
    - kind: informed_by
      to: ADR-021
---

# US-090: See the IA map, flows and wireframes

**Feature**: FEAT-012 — Screen flows and user journeys in the blueprint
**Feature Requirements**: DRW-01, DRW-02
**PRD Requirements**: FR-56
**Priority**: P2
**Status**: Draft

## Story

**As an** rand owner (PRD secondary persona) reviewing an app's plan with a client
**I want** an IA map, flow diagrams and wireframes drawn from the blueprint with the SDK's real patterns
**So that** the plan can be reviewed visually before anything is built, and what I review is what the app will be

## Context

DRW-01 draws the IA map, the flow and each journey as Mermaid (and SVG). DRW-02 renders each screen's pattern with placeholder content, in a neutral theme, at each supported size class, so a wireframe is the real layout (ADR-021 size classes).

## Walkthrough

1. The brand owner runs `ux-builder-blueprint draw` and `ux-builder-blueprint wireframes`.
2. They open the IA map, the flow diagram and the J-review journey diagram.
3. They page through wireframes of each screen at compact and expanded.

## Acceptance Criteria

Field names, rule IDs and commands are proposals in CONTRACT-005 *Flows and
journeys* and FEAT-012; the criteria name them so tests can cite them.

- [ ] **US-090-AC1** — Given a blueprint, when `draw` runs, then it writes an IA map of destinations and screens by size class, a flow diagram of screens and modals joined by actions, and one diagram per journey, each as Mermaid and SVG.
- [ ] **US-090-AC2** — Given a blueprint, when `wireframes` runs, then each screen is rendered with its catalogue pattern and placeholder content at each supported size class, as HTML and PNG, in a neutral theme.
- [ ] **US-090-AC3** — Given a wireframe, when it is audited, then the pattern's own audit checks pass, as for the pattern's stories.
- [ ] **US-090-AC4** — Given the same blueprint, when `draw` runs twice, then its output is identical.

## Edge Cases

- **A pattern unknown to the installed catalogue**: its wireframe is a labelled box, and `pattern.exists` already reports it.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-090-AC1 | a blueprint | `draw` runs | it writes an IA map of destinations and screens by size class, a flow diagram of screens and modals joined by actions, and one diagram per journey, each as Mermaid and SVG |
| AC2 | US-090-AC2 | a blueprint | `wireframes` runs | each screen is rendered with its catalogue pattern and placeholder content at each supported size class, as HTML and PNG, in a neutral theme |
| AC3 | US-090-AC3 | a wireframe | it is audited | the pattern's own audit checks pass, as for the pattern's stories |
| AC4 | US-090-AC4 | the same blueprint | `draw` runs twice | its output is identical |

## Dependencies

- **Stories**: US-086
- **Feature Spec**: FEAT-012
- **Feature Requirements**: DRW-01, DRW-02
- **PRD Requirements**: FR-56
- **External**: CONTRACT-005 *Flows and journeys*

## Out of Scope

- A visual editor.
