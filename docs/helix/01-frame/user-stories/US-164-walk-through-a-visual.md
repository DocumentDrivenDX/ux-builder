---
ddx:
  id: US-164
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-019
    - kind: informed_by
      to: CONTRACT-009
---

# US-164: Walk through a visual: plate and presentation

**Feature**: FEAT-019 — Visuals renderer
**Feature Requirements**: PRT-02
**PRD Requirements**: FR-93
**Priority**: P1
**Status**: Draft

## Story

**As** a developer reading a first map of a codebase, or someone presenting to a room
**I want** the visual with its walkthrough beside it, or played one step at a time
**So that** I follow one request through the system in order without reading the whole picture at once

## Acceptance Criteria

- **US-164-AC1** — Given a `flow/lanes` visual with steps, when it is rendered as a plate, then one offline HTML page holds the takeaway, the SVG, the numbered steps, a legend of the roles drawn, the source and the omissions.
- **US-164-AC2** — Given a visual with steps, when it is rendered as a presentation, then one offline HTML page shows the first step and moves with the buttons and the arrow keys, focusing each step's items.
- **US-164-AC3** — Given a visual with no steps, when a presentation is requested, then it is refused with `VISUAL_NO_STEPS`.
- **US-164-AC4** — Given a visual with a step whose `when` is any of umf.visual's presets or `other` with a `tag`, when it is drawn, then that step is marked with its words (upper case, the tag when given) instead of a number, the numbered steps count without it, the drawing passes check, and the plate and the text equivalent say it after the numbered steps, led by when it happens.

## Dependencies

FEAT-017's tokens; umf's `umf.visual` 1.0.0; CONTRACT-009.
