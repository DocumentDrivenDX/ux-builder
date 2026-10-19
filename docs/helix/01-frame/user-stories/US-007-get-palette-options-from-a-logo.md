---
ddx:
  id: US-007
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-002
    - kind: informed_by
      to: FEAT-001
    - kind: informed_by
      to: CONTRACT-002
---

# US-007: Get four or more complete palette options from a logo

**Feature**: FEAT-002 — Palette options generated from a logo
**Feature Requirements**: PAL-04, PAL-05, PAL-06
**PRD Requirements**: FR-9
**Priority**: P0
**Status**: Draft

## Story

**As a** brand owner
**I want** several distinct, named palette options built from a logo's brand colours, each complete for light and dark
**So that** I can choose between real alternatives instead of hand-building one palette and hoping it works

## Context

A brand file (CONTRACT-002) needs every colour role in each appearance:
grounds, surfaces, four text tiers, structure, accent, on-accent, border, the
five status colours and the logo paint. Today one accent is generated and
the rest is chosen by hand. Options must differ in kind, not by a few
degrees, so the choice is meaningful.

## Walkthrough

1. The brand owner analyses `acme.svg` (US-006) and asks for options.
2. The engine runs each named strategy (for example faithful, muted, vibrant,
   neutral with one accent) over the extracted colours.
3. Each strategy returns a full brand palette for light and dark, with
   neutrals tinted toward the brand hue and status colours harmonised.
4. The options are shown side by side (FEAT-003) or printed (`npm run brand`).

## Acceptance Criteria

- [ ] **US-007-AC1** — Given a logo with at least one brand colour, when options are generated, then at least four are returned, each labelled with a distinct strategy name.
- [ ] **US-007-AC2** — Given any option, when it is written as a brand file, then it is valid against `brand.schema.json` with every role CONTRACT-002 requires, in both light and dark.
- [ ] **US-007-AC3** — Given any option, when its neutrals (grounds, surfaces, border, text tiers) are inspected, then their hue leans toward the brand's and their chroma stays within the strategy's bound.
- [ ] **US-007-AC4** — Given any option, when its status colours are inspected, then live reads as green, limited as amber, closed as red, purchasing as blue, and evaluation as a neutral, each shifted toward the brand by no more than the bound SD-001 sets.
- [ ] **US-007-AC5** — Given two different strategies on the same logo, when their accents and grounds are compared, then they differ by more than SD-001's minimum distance.
- [ ] **US-007-AC6** — Given a monochrome logo, when options are generated, then neutral options with a suggested accent are returned and the result says the logo had no brand colour.

## Edge Cases

- **One brand colour only**: every strategy still returns a complete palette
  built around it.
- **Many brand colours**: strategies use the top colours by coverage; the rest
  are ignored and listed as unused.
- **A brand colour that is itself near a status hue** (a green brand):
  the live colour is shifted enough to stay distinguishable from the accent.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Option count | US-007-AC1 | Each reference logo | Generate | ≥ 4 options, unique strategy names |
| Complete palette | US-007-AC2 | Each option | Validate as brand file | Schema-valid, light and dark |
| Tinted neutrals | US-007-AC3 | Red-brand logo | Generate "faithful" | Ground hue within the brand's quadrant; chroma ≤ bound |
| Status meaning | US-007-AC4 | Each option | Inspect state hues | Each in its hue band |
| Distinct options | US-007-AC5 | Each logo, strategy pairs | Compare | Distance > minimum |
| Monochrome | US-007-AC6 | Black-only logo | Generate | Neutral options + suggested accent, flagged |

No tests yet: they arrive with option generation (bead
`ux-builder-44c8fba7`) as golden snapshots per logo and strategy.

## Dependencies

- **Stories**: US-006
- **Feature Spec**: FEAT-002
- **Feature Requirements**: PAL-04, PAL-05, PAL-06
- **PRD Requirements**: FR-9
- **External**: CONTRACT-002 (brand file roles); SD-001 (strategies, bounds)

## Out of Scope

- Contrast fitting (US-008).
- Fonts and widget shapes (a brand file's fonts are chosen in FEAT-003).
