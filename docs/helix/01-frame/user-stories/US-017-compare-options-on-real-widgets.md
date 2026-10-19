---
ddx:
  id: US-017
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-003
    - kind: informed_by
      to: CONTRACT-003
---

# US-017: Compare options on real widgets, in every chosen design system, light and dark

**Feature**: FEAT-003 — Guided brand builder
**Feature Requirements**: BB-04, BB-05, BB-06
**PRD Requirements**: FR-14
**Priority**: P0
**Status**: Draft

## Story

**As a** developer creating a client's theme
**I want** each palette option drawn on the SDK's real widgets in each chosen design system, with one light/dark switch
**So that** I judge colours where they will actually be used

## Acceptance Criteria

- [ ] **US-017-AC1** — Given chosen palettes and systems, when compared, then each cell composes that palette with that design system and shows, from `@ux-builder/ui`, the system's icons, a card with buttons and a count badge, a dropdown, a switch, a notice and status pills.
- [ ] **US-017-AC2** — Given the Light + dark / Light / Dark toggle, when it changes, then every preview on the step follows it; Light + dark shows both side by side.
- [ ] **US-017-AC3** — Given an option with a flagged colour move (US-008-AC4), when shown, then the move is listed on that option's card with the original and final colour.
- [ ] **US-017-AC4** — Given the comparison, when one combination is chosen, then a footer names it and offers "Save this theme".

## Dependencies

- **External**: US-007, US-008 (options, fitting)
