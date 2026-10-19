---
ddx:
  id: US-002
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-001
    - kind: informed_by
      to: CONTRACT-002
---

# US-002: Describe a design system's anatomy without any brand colour

**Feature**: FEAT-001 — Themes composed from a brand and a design system
**Feature Requirements**: THEME-05, THEME-06
**PRD Requirements**: FR-2
**Priority**: P0
**Status**: Draft

## Story

**As a** front-end app developer
**I want** a design system file to hold only type, shape, elevation, spacing and widget metrics, referring to colour only through roles
**So that** any brand can be shown in that design system without editing it

## Context

A design system such as Carbon is anatomy: square 48px buttons, bottom-ruled
fields, a 2px inset focus border. If it held a literal colour it would carry
one brand's identity into every other brand. CONTRACT-002 forbids literal hex
colours and colour groups in design system files; colours are references to
roles such as `{color.accent}`, resolved per brand.

## Walkthrough

1. The developer edits `tokens/design-systems/carbon.design-system.json` to
   change a widget metric and to point its focus ring at the accent role.
2. The build validates the file and resolves every reference.
3. The developer composes Praxis × Carbon and Acme × Carbon (the example brand); each shows its
   own brand's accent in Carbon's focus ring.

## Acceptance Criteria

- [ ] **US-002-AC1** — Given a design system token whose value contains a literal hex colour, when the schemas are checked, then the check fails.
- [ ] **US-002-AC2** — Given a design system file with a colour, status, brand, font or palette group, when the schemas are checked, then the check fails.
- [ ] **US-002-AC3** — Given a design system token that refers to a token that does not exist, when the build runs, then the build fails naming the reference.
- [ ] **US-002-AC4** — Given a design system whose focus ring refers to the accent role, when it is composed with two different brands, then each theme's focus ring uses that brand's accent.
- [ ] **US-002-AC5** — Given a design system with light-only overrides, when a brand is composed in dark and in light, then the overrides apply in light only.

## Edge Cases

- **A shadow needs a colour**: `rgba()` is allowed in shadows only, which carry no brand colour.
- **A design system sets no widget token** (Praxis, Plain): widgets use their `ui.css` fallbacks.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Literal colour | US-002-AC1 | Carbon `button.radius` = `#FF0000` | Validate | Rejected |
| Colour group | US-002-AC2 | Carbon with a `color` group | Validate | Rejected |
| Unknown reference | US-002-AC3 | Carbon `button.radius` = `{color.nonexistent}` | Load | Fails with ComposeError |
| Accent per brand | US-002-AC4 | Carbon × Praxis, Carbon × Acme | Resolve | Focus ring = each brand's accent |
| Light overrides | US-002-AC5 | Praxis design system, light `font-weight.strong` | Resolve dark and light | Override present in light only |

Cited by `@covers` (2026-10-06): AC1 and AC2 in `tools/validate-schemas.mjs`;
AC3 in `tools/__tests__/compose.test.mjs`; AC4 and AC5 in
`tools/__tests__/design-systems.test.mjs`.

## Dependencies

- **Stories**: None
- **Feature Spec**: FEAT-001
- **Feature Requirements**: THEME-05, THEME-06
- **PRD Requirements**: FR-2
- **External**: CONTRACT-002, CONTRACT-001 (token paths)

## Out of Scope

- Brand-specific shapes (brands override fonts only).
- Adding new design systems beyond the six shipped.
