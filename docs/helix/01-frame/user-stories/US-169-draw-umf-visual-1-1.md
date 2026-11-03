---
ddx:
  id: US-169
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-019
    - kind: informed_by
      to: CONTRACT-009
---

# US-169: Draw umf.visual 1.1 as well as 1.0

**Feature**: FEAT-019 — Visuals renderer
**Feature Requirements**: VIS-01, VIS-02, VIS-06
**PRD Requirements**: FR-90, FR-91
**Priority**: P1
**Status**: Draft

## Story

**As** a producer of documentation visuals (HELIX's documentor, or a developer)
**I want** the renderer to read `umf.visual` 1.1.0 as well as 1.0.0, and to draw what 1.1.0 adds without changing its meaning
**So that** an entity diagram's exact counts and stable field ids survive into every output, and a document written for either version draws the same way it validates in umf-visual

## Acceptance Criteria

- **US-169-AC1** — Given a document declaring `umf.visual` 1.0.0 or 1.1.0, when it is admitted, then it is checked against that version's pinned schema. A 1.0.0 document using a 1.1.0 field is refused as `VISUAL_INCOMPLETE`. A later 1.x version is read with the newest pinned schema, its additions unknown. A field id the entity lacks, a `field` and `fieldId` naming different fields, or a multiplicity whose bounds are reversed or contradict its cardinality is refused as `VISUAL_INVALID`.
- **US-169-AC2** — Given an entity reference with an exact multiplicity that no crow's foot states (such as `2..5`), when it is drawn, then the SVG writes that notation beside the end of the line and draws no crow's foot there; a multiplicity whose bounds match a cardinality draws that cardinality's crow's foot. The Mermaid output uses the nearest crow's foot and carries the exact notation in the relationship's label, and the text version lists it. `check` finds nothing.
- **US-169-AC3** — Given a reference end that names its field only by `fieldId`, when it is drawn, then the line enters at that field's row, and the Mermaid and text outputs name the field by its displayed name.
- **US-169-AC4** — Given a timeline whose dates fall in the years 0000–0099, when it is drawn, then its ticks name those years, not years in the 1900s.
- **US-169-AC5** — Given a graph-kind document with more than fifteen nodes, which `umf.visual` 1.1.0 admits with advice to split it, when it is drawn in each graph form, then the render succeeds and `check` reports what is unreadable rather than the renderer refusing it.

## Dependencies

FEAT-017's tokens; umf-visual's `umf.visual` 1.0.0 and 1.1.0 (CONTRACT-083); CONTRACT-009.
