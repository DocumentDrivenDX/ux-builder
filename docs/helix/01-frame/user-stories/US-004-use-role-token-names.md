---
ddx:
  id: US-004
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-001
    - kind: informed_by
      to: ADR-015
    - kind: informed_by
      to: CONTRACT-001
---

# US-004: Style by role names, while 0.x names keep working

**Feature**: FEAT-001 — Themes composed from a brand and a design system
**Feature Requirements**: THEME-10, THEME-11
**PRD Requirements**: FR-5
**Priority**: P0
**Status**: Draft

## Story

**As a** front-end app developer
**I want** tokens named for what they do, such as the ground, the text or the structural colour, with my existing names still working
**So that** I pick the right token in any brand without reading its value, and upgrade without breaking my app

## Context

0.x names describe colours (`--navy` is near-white in dark themes, and any
colour under a brand). CONTRACT-001 maps every name to a role name with the
`--piq-` prefix; ADR-015 keeps each 0.x name as an alias for all of 1.x. An
alias must follow its role wherever a theme is set, so it is declared beside
the role, not once at the root.

## Walkthrough

1. The developer upgrades to `@ux-builder/tokens` 1.x without changing the app.
2. The app's `var(--navy)` still renders the structural colour in every theme.
3. The developer writes new CSS with `var(--piq-color-structure)`.
4. Both render the same value in every brand, design system and appearance.

## Acceptance Criteria

- [ ] **US-004-AC1** — Given any token, when the package is built, then it is published under its CONTRACT-001 role name with the `--piq-` prefix.
- [ ] **US-004-AC2** — Given any 0.x token name and any 0.x theme, when the theme is resolved in 1.x, then the name resolves to its 0.3.0 value.
- [ ] **US-004-AC3** — Given a 0.x alias in the emitted CSS, when it is read, then it is declared in the same block as its role and refers to the role, never holding a value of its own.
- [ ] **US-004-AC4** — Given the SDK's own widgets, gallery and Storybook, when their CSS is read, then they refer to role names only.
- [ ] **US-004-AC5** — Given the name map in `tokens/names.json` and CONTRACT-001's table, when the schemas are checked, then the two name the same tokens.

## Edge Cases

- **A role added after 0.x** (`color.on-accent`): it has a role name and no alias.
- **A theme set on a nested element**: the alias follows the role there, because both are declared in the same block.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Role names | US-004-AC1 | `color.ground` | Build | `--piq-color-ground` emitted |
| 0.x values | US-004-AC2 | All ten 0.x resolved files from 0.3.0 | Resolve 1.x | All 178 names equal their 0.3.0 values |
| Alias placement | US-004-AC3 | Every brand and design system block | Parse CSS | Each alias is `var(--piq-…)` of a role in the same block |
| SDK on roles | US-004-AC4 | `packages/ui/src/ui.css` | Search for 0.x names | None |
| Map in sync | US-004-AC5 | `tokens/names.json`, CONTRACT-001 | `npm run schemas` | No drift |

Cited by `@covers` (2026-10-06): AC1–AC3 in
`tools/__tests__/aliases.test.mjs`, AC2 also in `tools/diff-resolved.mjs`; AC4
in `tools/__tests__/role-names.test.mjs`; AC5 in `tools/validate-schemas.mjs`.

## Dependencies

- **Stories**: None
- **Feature Spec**: FEAT-001
- **Feature Requirements**: THEME-10, THEME-11
- **PRD Requirements**: FR-5
- **External**: CONTRACT-001

## Out of Scope

- Removing the 0.x names (2.0.0).
- Migrating consuming apps' CSS (each app's own work).
