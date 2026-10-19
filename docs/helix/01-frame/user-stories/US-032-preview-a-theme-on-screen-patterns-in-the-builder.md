---
ddx:
  id: US-032
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-003
    - kind: informed_by
      to: FEAT-006
    - kind: informed_by
      to: ADR-021
    - kind: informed_by
      to: US-017
---

# US-032: Preview a theme on screen patterns in the builder

**Feature**: FEAT-003 — Guided brand builder
**Feature Requirements**: BB-18 (FEAT-003); RSP-01, VAR-01 (FEAT-006)
**PRD Requirements**: FR-14
**Priority**: P1
**Status**: Draft

## Story

**As a** brand owner turning a client's logo into a theme
**I want** to see each option on whole screens (a collection list, a record, a form, a dashboard) at phone and desktop widths, light and dark
**So that** I judge the palette where people will actually use it, not only on a strip of widgets

## Context

Requested by the operator on 2026-10-18; extends FEAT-003's comparison
(BB-04, BB-06; US-017) to FEAT-006's screen patterns. Each preview cell
already composes an option with a design system and renders real widgets
with the composed tokens (SD-002). Patterns respond to their container's
width, not the window's (ADR-021), so a cell can show a phone layout and a
desktop layout side by side on one monitor without device emulation; the
cell also shows that design system's variants (ADR-022), which the brand
owner cannot change.

## Walkthrough

1. On the compare step, the brand owner picks "Collection list" from a
   screens selector (alongside "Widgets", the existing view).
2. Each palette × design system cell shows the collection list twice: a
   phone-width rendering (stacked items, filters button, bottom bar) beside
   a desktop-width rendering (side nav, full table).
3. They switch the step to "Light + dark"; every rendering shows both
   appearances.
4. They switch to "Dashboard"; every cell re-renders with the same option,
   design system and appearance.
5. They choose one combination and save it, as in US-019.

## Acceptance Criteria

- [ ] **US-032-AC1** — Given the compare step, when the brand owner chooses a screen from the screens selector, then every palette × design system cell renders that screen pattern from `@ux-builder/ui` with the cell's composed tokens, with sample content and no data fetching.
- [ ] **US-032-AC2** — Given a cell showing a screen, when it renders, then it shows a phone-width rendering (compact, below 600 px) and a desktop-width rendering (expanded or above) side by side, each laid out for its own width in the same browser window.
- [ ] **US-032-AC3** — Given the Light + dark / Light / Dark toggle, when it changes, then every screen rendering on the step follows it; Light + dark shows both appearances for each width.
- [ ] **US-032-AC4** — Given cells on two design systems that name different variants, when the same screen renders, then each cell shows its own design system's variants, and the builder offers the brand owner no control to change them.
- [ ] **US-032-AC5** — Given the screens selector, when the screen changes, then the chosen palettes, design systems, appearance and the selected combination are kept.
- [ ] **US-032-AC6** — Given any screen in any cell, when the audit runs on the builder's compare step, then a contrast failure in the previewed screen is reported against that option and design system.

## Edge Cases

- **Many cells** (3 palettes × 4 design systems × 2 widths × 2 appearances): renderings are scaled to fit the cell and remain legible on hover or focus enlargement; the grid scrolls rather than overflowing the page.
- **Screen not yet available** (a P1 pattern): it is absent from the selector.
- **Font still loading**: cells render with the fallback and update when the font arrives, without layout shift beyond the cell.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Screen in cells | US-032-AC1 | 2 palettes × 2 systems | Choose "Collection list" | 4 cells render the pattern with composed tokens |
| Two widths | US-032-AC2 | One cell, window 1440 px | Render | Phone rendering stacked items; desktop rendering full table |
| Appearance | US-032-AC3 | "Light + dark" | Toggle | 4 renderings per cell |
| Variants | US-032-AC4 | Carbon and Material cells | Choose "Record detail" | Carbon and Material variants; no variant control |
| Keep choices | US-032-AC5 | Combination selected, "Dark" | Switch to "Dashboard" | Same combination and appearance |
| Contrast | US-032-AC6 | Option with faint muted text on Material | Audit compare step | Finding names the option and Material |

## Dependencies

- **Stories**: US-017 (compare on real widgets), US-025, US-028, US-030
- **Feature Spec**: FEAT-003, FEAT-006
- **Feature Requirements**: BB-04, BB-06, RSP-01, VAR-01
- **PRD Requirements**: FR-14
- **External**: SD-002 (preview cells and composition), CONTRACT-003 (preview surface), CONTRACT-004 revision (pattern entry point)

## Out of Scope

- Choosing or comparing variants (brands cannot choose them; ADR-022).
- The app's own screens or data in the preview.
- Device emulation or user-agent switching (widths come from the container).
