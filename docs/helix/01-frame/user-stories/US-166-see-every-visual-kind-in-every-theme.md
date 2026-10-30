---
ddx:
  id: US-166
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-019
    - kind: informed_by
      to: CONTRACT-009
---

# US-166: See every visual kind in every theme

**Feature**: FEAT-019 — Visuals renderer
**Feature Requirements**: STY-01
**PRD Requirements**: FR-94
**Priority**: P1
**Status**: Draft

## Story

**As** a designer or developer reviewing ux-builder
**I want** a Storybook story for each kind and form that follows the toolbar's theme
**So that** I judge how each kind looks in each theme before it ships

## Acceptance Criteria

- **US-166-AC1** — Given Storybook, when it is built, then there is one story per supported kind and form, each drawn from a fixture.
- **US-166-AC2** — Given a story, when the toolbar's theme or appearance changes, then the visual is drawn again in that theme's fonts and colours.

## Dependencies

FEAT-017's tokens; umf's `umf.visual` 1.0.0; CONTRACT-009.
