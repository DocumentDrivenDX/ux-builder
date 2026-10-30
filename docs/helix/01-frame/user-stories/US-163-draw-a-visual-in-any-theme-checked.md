---
ddx:
  id: US-163
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-019
    - kind: informed_by
      to: CONTRACT-009
---

# US-163: Draw a visual in any theme, checked

**Feature**: FEAT-019 — Visuals renderer
**Feature Requirements**: VIS-01 to VIS-05, CHK-01, CLI-01
**PRD Requirements**: FR-90, FR-91, FR-92, FR-94
**Priority**: P1
**Status**: Draft

## Story

**As** a producer of documentation visuals (HELIX's documentor, or a developer)
**I want** to render a `umf.visual` document to SVG in a theme, with a report that proves it is readable
**So that** every picture on every site looks like one family, follows the theme, and fails the build when it is unreadable

## Acceptance Criteria

- **US-163-AC1** — Given each graph-kind document in umf's fixtures and each theme in light and dark, when it is rendered to SVG, then the render succeeds, `check` finds nothing, and a second render gives the same bytes.
- **US-163-AC2** — Given `appearance: both`, when it is rendered, then every colour in the SVG is a `var(--piq-…)` reference with a fallback, and no colour literal appears outside one.
- **US-163-AC3** — Given a document with an unknown major version, an unsupported kind, a dangling reference or (by default) an unknown field, when it is rendered, then it is refused with `VISUAL_VERSION`, `VISUAL_UNSUPPORTED`, `VISUAL_INVALID` or `VISUAL_INCOMPLETE`.
- **US-163-AC4** — Given a layout report with text outside its box, an edge through a node, overlapping labels, crossings over budget, small text or a low-contrast pair, when it is checked, then each problem is reported with its code.
- **US-163-AC5** — Given the SVG, when it is read, then it has a title, a description, `role="img"`, stable ids from the document, step membership, and no external reference.
- **US-163-AC6** — Given several documents, when `ux-builder-visuals render` runs once with `--check`, then it writes every output and exits 0, and exits 1 when one is refused.
- **US-163-AC7** — Given a `flow/zoned` visual, when it is drawn, then each zone's `detail` is a caption along its bottom (along its header's row, or on the fewest lines, when lines cross the bottom), every line ends in an accent head, and a line between boxes in two zones of one tier brings the zones together and joins the boxes side to side with its tag between them.

## Dependencies

FEAT-017's tokens; umf's `umf.visual` 1.0.0; CONTRACT-009.
