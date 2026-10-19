---
ddx:
  id: US-003
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-001
    - kind: informed_by
      to: ADR-013
---

# US-003: See a new brand in every design system, checked for contrast, with no code

**Feature**: FEAT-001 — Themes composed from a brand and a design system
**Feature Requirements**: THEME-07, THEME-08
**PRD Requirements**: FR-3, FR-4
**Priority**: P0
**Status**: Draft

## Story

**As a** brand owner
**I want** a new brand to appear in every supported design system as soon as its brand file exists
**So that** I can choose the design system for a client's apps without waiting for a developer to wire each one

## Context

ADR-013 makes a theme a brand applied to a design system. Before it, each
pairing needed its own generator. Composition must need no per-pairing code,
and the contrast gate must check every pairing, used or not, because an
accent that reads well on Praxis's surfaces may not on Carbon's.

## Walkthrough

1. The brand owner adds `tokens/brands/acme.brand.json` (light only).
2. The build composes Acme with all four shared design systems in light, as previews (ADR-018).
3. The contrast gate checks every pairing of every combination.
4. The gallery and resolved files are available for each combination.

## Acceptance Criteria

- [ ] **US-003-AC1** — Given a new brand file and no code change, when the build runs, then a theme is produced for that brand in every design system, for each appearance the brand declares.
- [ ] **US-003-AC2** — Given a composed theme, when its values are resolved, then every token has a final value with no unresolved reference.
- [ ] **US-003-AC3** — Given every brand × design system × appearance, when the contrast gate runs, then each text and widget pairing is checked against 4.5:1.
- [ ] **US-003-AC4** — Given a combination with a pairing below 4.5:1, when the contrast gate runs, then it fails naming the brand, design system, appearance and pairing.

## Edge Cases

- **A brand declares only light**: no dark theme is built for it.
- **The brand's accent wins over nothing in the design system**: a design system never sets colour roles, so the brand's accent applies everywhere.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| New brand | US-003-AC1 | Acme brand added to a copy of `tokens/` | Load and list combinations | Acme × material, fluent, carbon and databricks, light only |
| Fully resolved | US-003-AC2 | Acme × each design system | Resolve | No `{…}` or `var(` in any value |
| Gate coverage | US-003-AC3 | All built combinations | `npm run contrast` | Every theme and preview combination (46 today) × 23 pairings checked |
| Failing pairing | US-003-AC4 | A brand with text too light on its ground | `npm run contrast` | Fails, naming the combination and pairing |

Cited by `@covers` (2026-10-06): AC1 and AC2 in
`tools/__tests__/compose.test.mjs`; AC3 in `tools/check-contrast.mjs` (in `npm
run check`); AC4 in `tools/__tests__/gates.test.mjs`, which feeds the gate a
failing brand.

## Dependencies

- **Stories**: US-001, US-002
- **Feature Spec**: FEAT-001
- **Feature Requirements**: THEME-07, THEME-08
- **PRD Requirements**: FR-3, FR-4
- **External**: `tools/contrast.mjs` (pairings and floor)

## Out of Scope

- Choosing which combinations an app offers (FEAT-004 theme provider).
- Previewing a brand interactively (FEAT-003).
