---
ddx:
  id: US-113
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-017
    - kind: informed_by
      to: US-020
---

# US-113: See a theme's diagram tokens on its page

**Feature**: FEAT-017 — Diagram and data-visualization tokens
**Feature Requirements**: PAGE-01, PAGE-02, PAGE-03
**PRD Requirements**: FR-73
**Priority**: P1
**Status**: Draft

## Story

**As a** brand owner or developer (PRD personas) choosing or checking a theme
**I want** the theme's page to show its diagram and chart colours, strokes and node corners with their contrast
**So that** I see how diagrams will look in this theme before anything draws one

## Context

Each theme's page (`?theme=<name>`, US-020) shows its brand, CSS and every
widget. FEAT-017 adds diagram roles; this story puts them on the page.

## Walkthrough

1. The person opens `?theme=praxis-carbon` and picks "Diagrams and data"
   in the menu.
2. They see the status colours on their fills, the eight series in order,
   the region tints, the edge weights and the lifecycle tints. Each has a
   swatch, its CSS name, its value and its contrast.
3. A sample node and edge show Carbon's square corners and strokes.
4. They switch to dark; every value and verdict changes with it.

## Acceptance Criteria

- [ ] **US-113-AC1** — Given a theme's page, when the menu is read, then it has a "Diagrams and data" link to a section of that name, after the CSS.
- [ ] **US-113-AC2** — Given the section in an appearance, when it renders, then it lists every diagram colour token, each with its CSS name and that appearance's resolved value, and the contrast it is held to against what it sits on, with the ratio.
- [ ] **US-113-AC3** — Given the section, when it renders, then a sample node and edge draw with the theme's diagram node radius and stroke widths.
- [ ] **US-113-AC4** — Given the page, when the appearance switches, then the listed values change to the other appearance's.

## Edge Cases

- **A theme with one appearance**: the section shows that one.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-113-AC1 | `?theme=praxis-carbon` | read the menu | a "Diagrams and data" link after the CSS links |
| AC2 | US-113-AC2 | the section, light | render | every diagram colour token with name, resolved value and ratio |
| AC3 | US-113-AC3 | the section | render | the sample node's corner and stroke are the theme's tokens |
| AC4 | US-113-AC4 | the page | switch to dark | values are the dark appearance's |

## Dependencies

- **Feature Spec**: FEAT-017
- **Feature Requirements**: PAGE-01, PAGE-02, PAGE-03
- **PRD Requirements**: FR-73
- **External**: US-020 (the theme page)

## Out of Scope

- The gallery release page; it already lists every token by group.
