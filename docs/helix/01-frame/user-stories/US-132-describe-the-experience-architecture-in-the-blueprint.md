---
ddx:
  id: US-132
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: CONTRACT-005
    - kind: informed_by
      to: SD-006
---

# US-132: Describe the experience architecture in the blueprint

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-32, GDL-33, GDL-35, GDL-36
**PRD Requirements**: FR-84
**Priority**: P1
**Status**: Draft

## Story

**As a** designer or developer using the guide (PRD primary persona)
**I want** each screen's purpose and its content in priority order recorded beside its navigation, pattern and states
**So that** the experience architecture is one consistent plan, and wireframes show what matters most first

## Context

The blueprint already covers navigation, patterns, states, size classes and accessibility through the audit. CONTRACT-005 adds `screens[].purpose` and `screens[].content`, the information on the screen in priority order. Wireframes place and label content in that order. `propose` drafts the architecture into the design system's *Destinations by Size Class* and the screen-flow and wireframe drafts. The skill tells the agent to generate information architecture, interaction design and interface design together from the chosen flow.

## Walkthrough

1. The agent fills `purpose` and `content` for each screen of the chosen blueprint.
2. `ux-builder-blueprint wireframes` places "Access points" above "River conditions" on the river screen.
3. `propose` drafts the design system's navigation table and the screen-flow and wireframe drafts.

## Acceptance Criteria

- [ ] **US-132-AC1** — Given a screen with `purpose` and a `content` list of objects with `label` and optional `kind`, when `ux-builder-blueprint check` runs, then it validates; a `content` that is not an array, or an item without `label`, is an error naming the screen.
- [ ] **US-132-AC2** — Given a screen with no `purpose`, when `check` runs, then it reports a warning naming the screen.
- [ ] **US-132-AC3** — Given a screen with three content items, when `ux-builder-blueprint wireframes` runs, then each wireframe page shows the items labelled in that order, before any placeholder content.
- [ ] **US-132-AC4** — Given a blueprint with purposes and content, when `ux-builder-blueprint propose` runs, then the wireframe patches list each screen's purpose and content order.
- [ ] **US-132-AC5** — Given a created app, when the skill's UX design section is read, then it tells the agent to generate information architecture, interaction design and interface design together from the chosen flow, and to fill every screen's purpose and content.

## Edge Cases

- **A pattern has no slot for an item**: the wireframe shows it in a labelled box.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-132-AC1 | a screen with `purpose` and a `content` list of objects with `label` and optional `kind` | `ux-builder-blueprint check` runs | it validates; a `content` that is not an array, or an item without `label`, is an error naming the screen |
| AC2 | US-132-AC2 | a screen with no `purpose` | `check` runs | it reports a warning naming the screen |
| AC3 | US-132-AC3 | a screen with three content items | `ux-builder-blueprint wireframes` runs | each wireframe page shows the items labelled in that order, before any placeholder content |
| AC4 | US-132-AC4 | a blueprint with purposes and content | `ux-builder-blueprint propose` runs | the wireframe drafts list each screen's purpose and content order |
| AC5 | US-132-AC5 | a created app | the skill's UX design section is read | it tells the agent to generate information architecture, interaction design and interface design together from the chosen flow, and to fill every screen's purpose and content |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-32, GDL-33, GDL-35, GDL-36
- **PRD Requirements**: FR-84
- **External**: CONTRACT-005, SD-006

## Out of Scope

- High-fidelity visual design.
