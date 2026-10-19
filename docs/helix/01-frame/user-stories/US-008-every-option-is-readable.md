---
ddx:
  id: US-008
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-002
    - kind: informed_by
      to: ADR-014
---

# US-008: Every option is readable, and any colour moved to make it so is reported

**Feature**: FEAT-002 — Palette options generated from a logo
**Feature Requirements**: PAL-07, PAL-08
**PRD Requirements**: FR-10
**Priority**: P0
**Status**: Draft

## Story

**As a** brand owner
**I want** every option to pass the contrast gate before I see it, with each brand colour that had to change shown with how far it moved
**So that** I never pick a palette that fails review later, and I can judge whether a moved colour is still on-brand

## Context

Contrast failures are found today after a theme is built (the gate in `npm
run check`). Brand colours are often too light for text on white (Databricks
Lava 600 is 3.4:1) or too dark on a dark ground. The existing themes record
each move on the token, for example "moved −9.0% in lightness (hue kept)";
generated options must do the same, and flag moves large enough to change
how the brand reads.

## Walkthrough

1. The engine generates an option (US-007).
2. It checks every pairing in `tools/contrast.mjs` against 4.5:1, in light and
   dark, on every shared design system the option will be previewed on.
3. A failing colour is moved in lightness only, keeping its hue, until every
   pairing it is in passes.
4. The option lists each moved colour: original, final and the move; moves
   above SD-001's threshold are flagged for review.

## Acceptance Criteria

- [ ] **US-008-AC1** — Given any option for any reference logo, when it is composed with every shared design system in each appearance, then every pairing in `tools/contrast.mjs` PAIRS is at least 4.5:1.
- [ ] **US-008-AC2** — Given a brand colour that fails a pairing, when it is fitted, then its hue is unchanged (within rounding) and only its lightness moves.
- [ ] **US-008-AC3** — Given a fitted colour, when the option is returned, then it reports the original value, the final value and the lightness moved, and the brand file's `$description` for that token records the move.
- [ ] **US-008-AC4** — Given a move larger than SD-001's review threshold, when the option is returned, then that colour is flagged for review.
- [ ] **US-008-AC5** — Given a colour that cannot pass at any lightness with its hue, when it is fitted, then the option is not returned, and the result says which colour and pairing could not be met.

## Edge Cases

- **Two roles share one brand colour** (structure and accent): both pairings
  are satisfied by one fitted value, not two.
- **A colour passes in light but not dark**: each appearance is fitted
  independently; the light value is not changed by the dark fit.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Gate passes | US-008-AC1 | Every reference logo × strategy | Generate, compose, run gate | 0 failures |
| Hue kept | US-008-AC2 | A pale yellow brand | Generate | Accent hue within 1° of the original |
| Move reported | US-008-AC3 | Same | Inspect option and brand file | Original, final, ±% recorded |
| Large move flagged | US-008-AC4 | A brand needing > threshold | Generate | Flag set on that colour |
| Impossible fit | US-008-AC5 | Synthetic case | Generate | Option withheld with a reason |

No tests yet: AC1 to AC4 arrive with option generation (bead
`ux-builder-44c8fba7`), reusing `tools/contrast.mjs` so the engine and
the build gate cannot disagree.

## Dependencies

- **Stories**: US-007
- **Feature Spec**: FEAT-002
- **Feature Requirements**: PAL-07, PAL-08
- **PRD Requirements**: FR-10
- **External**: `tools/contrast.mjs` (pairings, floor)

## Out of Scope

- Non-text contrast (3:1 for borders and focus rings), not yet in the gate.
