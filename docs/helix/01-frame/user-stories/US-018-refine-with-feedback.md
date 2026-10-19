---
ddx:
  id: US-018
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-003
    - kind: informed_by
      to: ADR-014
    - kind: informed_by
      to: ADR-019
---

# US-018: Refine the options in plain language, or by settings

**Feature**: FEAT-003 — Guided brand builder
**Feature Requirements**: BB-07, BB-08, BB-09, BB-10
**PRD Requirements**: FR-11, FR-15
**Priority**: P0
**Status**: Draft

## Story

**As a** developer creating a client's theme
**I want** to say what is wrong ("too orange, it's a law firm") on the palettes step and get new options, or move the settings myself
**So that** I reach the right palette in a few rounds without learning colour science

## Acceptance Criteria

- [ ] **US-018-AC1** — Given feedback text, when submitted, then the server asks the model for setting changes only (validated against SD-001's schema, out-of-range clamped), the engine regenerates, and the new round replaces the grid.
- [ ] **US-018-AC2** — Given a regenerated round, when shown, then a plain-language explanation of what changed is shown with it.
- [ ] **US-018-AC3** — Given palettes added to compare, when a new round is generated, then the same strategies stay selected and the round number advances.
- [ ] **US-018-AC4** — Given the settings panel, when a setting is moved, then options regenerate without the model.
- [ ] **US-018-AC5** — Given no API key or an unreachable model, when the builder runs, then feedback is disabled with a message and the settings panel still works.
- [ ] **US-018-AC6** — Given any feedback round, when the request is inspected, then it contains no logo image and the API key never reaches the browser.

## Dependencies

- **External**: SD-001 settings schema; ADR-014; ADR-019
