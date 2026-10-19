---
ddx:
  id: US-023
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
      to: CONTRACT-001
---

# US-023: Lay out a screen from layout primitives

**Feature**: FEAT-006 — Screen patterns
**Feature Requirements**: LAY-01, LAY-02, LAY-03, RSP-01, RSP-02
**PRD Requirements**: FR-25, FR-26
**Priority**: P0
**Status**: Draft

## Story

**As an** app developer building on the SDK
**I want** to arrange a screen with the SDK's stack, cluster, grid, page and split-view primitives
**So that** the screen has the design system's spacing, gutters and widths at every size, and my app writes no layout CSS

## Context

Requested by the operator on 2026-10-18; implements the foundations of
FEAT-006 under ADR-020 (a patterns layer above the widgets) and ADR-021
(patterns adapt to their container by size class; layout measures are tokens).
Today `@ux-builder/ui` has no breakpoints or layout tokens, so every app writes
its own flex and grid CSS with literal gaps, and the lint rule and audit
(US-013, US-022) flag the results. Primitives are content-free: they take
any children and decide only space, alignment and columns, from tokens whose
values each design system sets.

## Walkthrough

1. The developer wraps a screen in the page primitive, which applies the
   page gutter and maximum width for the current size class.
2. Inside it, a stack spaces a heading, a cluster of buttons and a grid of
   cards; a split view places a list beside a detail area.
3. The page sits in the harness's 480 px iframe: the grid shows one column
   and the split view shows one pane, because the container is compact.
4. The same page full screen at 1366 px shows the grid at its expanded
   column count and both split panes side by side.
5. The developer switches the theme from Praxis Carbon to Praxis Material;
   gaps and gutters change to Material's values with no code change.
6. With `dir="rtl"` on the document, the split view's panes and every
   alignment mirror.

## Acceptance Criteria

- [ ] **US-023-AC1** — Given the built themes, when their tokens are read, then every theme sets a value for each size-class boundary, the page gutter per size class, the reading, form and page maximum widths and the minimum touch-target size (CONTRACT-001).
- [ ] **US-023-AC2** — Given a stack, cluster or grid with arbitrary children, when it renders, then every gap between children equals one of the active theme's space tokens and the primitive's stylesheet contains no literal length other than zero and the size-class boundaries in its query conditions.
- [ ] **US-023-AC3** — Given a grid inside a 480 px container in a 1920 px window, when it renders, then it lays out in the compact size class (one column), not the window's.
- [ ] **US-023-AC4** — Given a split view, when its container is resized across 839/840 px, then it shows one pane below expanded and two panes side by side at expanded and above.
- [ ] **US-023-AC5** — Given a page containing every primitive, when rendered at 320 CSS px, then the document has no horizontal scroll and no content is clipped (WCAG 1.4.10).
- [ ] **US-023-AC6** — Given a page of primitives in a right-to-left document, when it renders, then start and end placement are mirrored relative to the left-to-right render, with no right-to-left-specific CSS.
- [ ] **US-023-AC7** — Given a page of primitives, when the audit runs at one width per size class (360, 720, 1024, 1366, 1920) in every theme and appearance, then it reports no errors.

## Edge Cases

- **Container narrower than 320 px**: the compact layout applies; children wrap; nothing is cut off without a way to reach it.
- **Primitive in a flex parent with no set width**: it keeps its content width rather than collapsing to zero under containment.
- **Design system that wants its own boundaries** (Carbon's 672/1056): not available; the boundaries are SDK constants, because CSS cannot read a token in a query condition (ADR-021, corrected 2026-10-18). The design system tunes gutters and content widths instead.
- **Browser without container queries**: the compact, single-column layout applies and remains usable.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Layout tokens | US-023-AC1 | Built themes.css | Read each theme | All boundary, gutter, max-width and target tokens set |
| Token gaps | US-023-AC2 | Stack of 3 cards, cluster of 4 buttons | Render, read computed gap | Equals a space token |
| Container not window | US-023-AC3 | Grid in 480 px box, window 1920 px | Render in Playwright | 1 column |
| Split view | US-023-AC4 | Split view at 839 px, then 840 px | Resize container | 1 pane, then 2 |
| Reflow | US-023-AC5 | Kitchen-sink page | Render at 320 px | `scrollWidth` ≤ viewport width |
| RTL | US-023-AC6 | Split view, cluster, `dir="rtl"` | Render | Panes and alignment mirrored |
| Audit | US-023-AC7 | Kitchen-sink story | `ux-builder-audit` at 5 widths × themes × appearances | Exit 0 |

## Dependencies

- **Feature Spec**: FEAT-006
- **Feature Requirements**: LAY-01, LAY-02, LAY-03, RSP-01, RSP-02
- **PRD Requirements**: FR-25, FR-26
- **External**: CONTRACT-001 revision (layout token names), CONTRACT-004 revision (the patterns entry point); FEAT-001 (layout token values per design system)

## Out of Scope

- Screen patterns built on the primitives (US-024 to US-029).
- Density, which stays a design-system decision (ADR-013).
- A page builder or configuration-driven layout (ADR-020).
