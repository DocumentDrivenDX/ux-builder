---
ddx:
  id: US-001
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-001
    - kind: informed_by
      to: CONTRACT-002
    - kind: informed_by
      to: ADR-017
---

# US-001: Describe a client's identity once, as a brand file

**Feature**: FEAT-001 — Themes composed from a brand and a design system
**Feature Requirements**: THEME-01, THEME-02, THEME-03, THEME-04
**PRD Requirements**: FR-1, FR-6
**Priority**: P0
**Status**: Draft

## Story

**As a** brand owner
**I want** to record a client's colours, artwork and, optionally, fonts in one brand file
**So that** every app and every design system shows the same identity without anyone re-entering it

## Context

Today a client's identity is spread across hand-made theme files, one per
design system. A brand file holds identity only (CONTRACT-002): a palette per
appearance, logo artwork, optional font overrides with their source
(ADR-017), and the settings that generated the palette. Anything that is
shape or size belongs to a design system, and the build must refuse it here.

## Walkthrough

1. The brand owner (with a developer, until the brand builder exists) writes
   `tokens/brands/<name>.brand.json` with a light palette, a dark palette and
   logo paths.
2. The build validates the file against its schema and the font rules.
3. The brand owner adds a body font from Google Fonts with a fallback.
4. The build composes the brand with every design system; body text uses the
   brand's font, other text roles keep each design system's fonts.

## Acceptance Criteria

- [ ] **US-001-AC1** — Given a brand file with a complete palette and status colours for each appearance it declares, when the build runs, then the brand is composed with no error.
- [ ] **US-001-AC2** — Given a brand file that also contains a shape or size token, when the build runs, then the build fails naming the brand file.
- [ ] **US-001-AC3** — Given a brand file missing a required colour role (for example the text colour on the accent), when the build runs, then the build fails naming the missing role.
- [ ] **US-001-AC4** — Given a brand that overrides only its body font, when it is composed with any design system, then body text uses the brand's font and display, heading and mono keep the design system's fonts.
- [ ] **US-001-AC5** — Given a brand font that is bundled with a licence other than OFL-1.1 or Apache-2.0, or declares no source, when the build runs, then the build fails naming the font and ADR-017.
- [ ] **US-001-AC6** — Given a brand whose artwork path points to a file that does not exist, when the schemas are checked, then the check fails naming the path.

## Edge Cases

- **A brand declares only one appearance**: themes are built for that appearance only.
- **A brand sets no recessed ground**: it is derived from the ground (CONTRACT-002, step 5).
- **A brand's artwork lies outside `brand/`**: the build fails.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Valid brand | US-001-AC1 | `tokens/brands/praxis.brand.json` | `npm run build` | Brand composed; no error |
| Shape token in a brand | US-001-AC2 | Praxis brand plus `radius.control` | Validate | Rejected |
| Missing role | US-001-AC3 | Praxis brand without `color.on-accent` | Validate | Rejected |
| Body font override | US-001-AC4 | Brand with body `Inter` (google) | Compose with Carbon | `font.body` = Inter stack; `font.mono` = IBM Plex Mono |
| Proprietary bundled font | US-001-AC5 | Body font bundled, licence Proprietary | Load | Fails, naming the licence rule |
| Missing artwork | US-001-AC6 | `logo-image` path to a missing file | `npm run schemas` | Fails, naming the path |

Cited by `@covers` (2026-10-06): AC1 and AC4 in
`tools/__tests__/compose.test.mjs`; AC2 and AC3 in
`tools/validate-schemas.mjs`; AC5 in `tools/__tests__/fonts.test.mjs`; AC6 in
`tools/__tests__/gates.test.mjs`, which feeds the gate a missing artwork file.

## Dependencies

- **Stories**: None
- **Feature Spec**: FEAT-001
- **Feature Requirements**: THEME-01, THEME-02, THEME-03, THEME-04
- **PRD Requirements**: FR-1, FR-6
- **External**: CONTRACT-002 (file shape), ADR-017 (font sources)

## Out of Scope

- Generating the palette from a logo (FEAT-002) and the brand builder UI (FEAT-003).
- Shipping font files (FEAT-004, SDK-02).
