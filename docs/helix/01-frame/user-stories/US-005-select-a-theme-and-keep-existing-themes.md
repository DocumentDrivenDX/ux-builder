---
ddx:
  id: US-005
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-001
    - kind: informed_by
      to: CONTRACT-003
    - kind: informed_by
      to: ADR-018
---

# US-005: Choose a theme and an appearance in an app, with existing themes unchanged

**Feature**: FEAT-001 — Themes composed from a brand and a design system
**Feature Requirements**: THEME-09, THEME-12, THEME-13
**PRD Requirements**: FR-3, FR-7
**Priority**: P0
**Status**: Draft — *[Amended — ADR-018]*

## Story

**As a** front-end app developer
**I want** to choose a theme, and optionally an appearance, on my app's root element, and keep my existing `data-theme` working
**So that** adopting a new theme is one import and one attribute, and upgrading changes nothing users see

## Context

CONTRACT-003 (as amended by ADR-018) ships one CSS file per theme, selected by
`data-theme` with an optional `data-appearance`. The 0.x themes
(`praxis`, `praxis-material`, `praxis-fluentui`, `praxis-carbon`,
`plain`) must look exactly as they did, through the same `data-theme` values.

## Walkthrough

1. The developer imports `@ux-builder/tokens/themes/synaptiq.css` and sets
   `data-theme="synaptiq"`.
2. The page renders Synaptiq's colours in its own anatomy, light by default.
3. Setting `data-appearance="dark"` switches to the dark appearance.
4. Another app still sets `data-theme="praxis-carbon"` and upgrades; it
   renders exactly as on 0.3.0.

## Acceptance Criteria

- [ ] **US-005-AC1** — Given `data-theme` set to a loaded theme and an appearance its brand defines, when the page renders, then it shows that brand's colours in that theme's anatomy.
- [ ] **US-005-AC2** — Given `data-theme` without `data-appearance`, when the page renders, then the theme's default appearance applies in full.
- [ ] **US-005-AC3** — Given each of the 0.x themes in each appearance it shipped, when it is composed, then every token resolves to its 0.3.0 value.
- [ ] **US-005-AC4** — Given the platform's original theme CSS, when the package's theme files are applied with the platform's attributes, then every property resolves as it did, apart from the recorded contrast fixes.
- [ ] **US-005-AC5** — Given a theme whose default appearance's anatomy overrides a token, when the other appearance is selected, then that token returns to its base value.

## Edge Cases

- **An appearance the brand lacks** (`plain` with `dark`): the default appearance applies.
- **A theme that is not loaded**: widgets fall back to their `ui.css` treatment.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Theme | US-005-AC1 | `synaptiq`, dark | Render | Apricot accents on Soil |
| Default | US-005-AC2 | `data-theme="synaptiq"` only | Inspect emitted selectors | `[data-theme="synaptiq"]` sets every token for light |
| 0.x values | US-005-AC3 | `tools/fixtures/resolved-0.3.0/` | `npm run verify` | 0 changed, 0 missing |
| Platform | US-005-AC4 | `tools/fixtures/source-css/` | `npm run verify` | All four contexts resolve as on the platform |
| Restore | US-005-AC5 | `synaptiq` with default dark | `themeCss` | Light block restores the base card shadow |

Cited by `@covers` (2026-10-06): AC1 and AC2 in
`packages/tokens/test/theme-selection.test.mjs` (Chromium); AC3 in
`tools/diff-resolved.mjs`; AC4 in `tools/verify-equivalence.mjs`; AC5 in
`tools/__tests__/themes.test.mjs`.

## Dependencies

- **Stories**: US-003
- **Feature Spec**: FEAT-001
- **Feature Requirements**: THEME-09, THEME-12, THEME-13
- **PRD Requirements**: FR-3, FR-7
- **External**: CONTRACT-003, ADR-018

## Out of Scope

- A theme provider that sets the attributes (FEAT-004, SDK-04).
