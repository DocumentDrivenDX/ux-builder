---
ddx:
  id: US-016
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-003
---

# US-016: Start with a logo and the design systems to compare

**Feature**: FEAT-003 — Guided brand builder
**Feature Requirements**: BB-01, BB-02, BB-03
**PRD Requirements**: FR-13
**Priority**: P0
**Status**: Draft

## Story

**As a** developer creating a client's theme
**I want** to upload the logo, see the brand colours the engine found, and pick the design systems the client's apps may use
**So that** the options I compare start from the right colours and the right systems

## Acceptance Criteria

- [ ] **US-016-AC1** — Given an SVG or PNG logo (or a light and a dark variant), when it is uploaded, then it is shown, and an SVG is shown only as an image (no script runs).
- [ ] **US-016-AC2** — Given an uploaded logo, when it is analysed, then the extracted colours and their share are shown before any option (US-006).
- [ ] **US-016-AC3** — Given the shared design systems (Material, Fluent, Carbon, Databricks), when the person ticks one or more, then only those appear in the comparison.
- [ ] **US-016-AC5** — Given an uploaded logo, when the person adds a mark (the symbol on its own) with "Add a mark / favicon", then it is shown beside the logo as the brand's mark and favicon. *[Added 2026-10-07, operator]*
- [ ] **US-016-AC4** — Given an unsupported file, when uploaded, then the engine's error is shown and nothing else changes.

## Dependencies

- **External**: US-006 (extraction)
