---
ddx:
  id: US-015
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-003
    - kind: informed_by
      to: ADR-018
    - kind: informed_by
      to: ADR-019
---

# US-015: From a logo to a theme under review, in one sitting (core flow)

**Feature**: FEAT-003 — Guided brand builder
**Feature Requirements**: BB-01, BB-02, BB-04, BB-07, BB-11, BB-12, BB-13, BB-15
**PRD Requirements**: FR-13, FR-14, FR-15, FR-16
**Priority**: P0
**Status**: Draft

## Story

**As a** developer creating a client's theme
**I want** to upload the client's logo, compare palette options on real widgets, refine them in plain language, and save the one I choose as a theme
**So that** the client has a reviewed, accessible theme without anyone hand-picking hex values

This is the core flow, run end to end by the Playwright test (bead `f5942300`).

## Walkthrough

Follows the approved prototype (`prototypes/theme-builder/`).

1. `npm run builder`; use the sample logo; the brand colours found are listed.
2. Pick two palettes to compare; give feedback "more conservative"; a new round keeps the selection.
3. Pick Carbon and Fluent; compare four combinations, each in light and dark.
4. Choose one theme; save it as `acme-legal-fluent` (brand `acme-legal`); a pull request opens.
5. The builder shows the nine tasks to use it in an app.

## Acceptance Criteria

- [ ] **US-015-AC1** — Given an uploaded logo, when palettes are suggested, then at least four options are shown, each in light and dark, and any number can be added to compare.
- [ ] **US-015-AC2** — Given chosen palettes and design systems, when compared, then every combination is shown in light and dark on that system's real widgets, and the Light + dark / Light / Dark toggle applies to all.
- [ ] **US-015-AC3** — Given feedback "more conservative" on the palettes step, when regenerated, then new options replace the old, the change is explained, and the selections carry over.
- [ ] **US-015-AC4** — Given a chosen option and design system and a unique name, when saved, then a brand file and a theme file are written, both schema-valid, and submitted for review (a branch and pull request; never published).
- [ ] **US-015-AC5** — Given a saved theme, when "Use in your app" shows, then it lists nine tasks per framework with the code filled in for that theme, and a link to the review.

## Dependencies

- **Stories**: US-016 to US-019 detail each step.
- **External**: SD-001 (engine), SD-002 (builder), ADR-019 (where it runs)
