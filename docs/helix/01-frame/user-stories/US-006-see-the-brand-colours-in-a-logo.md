---
ddx:
  id: US-006
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-002
    - kind: informed_by
      to: ADR-014
---

# US-006: See which brand colours the engine found in a logo

**Feature**: FEAT-002 — Palette options generated from a logo
**Feature Requirements**: PAL-01, PAL-02, PAL-03
**PRD Requirements**: FR-8
**Priority**: P0
**Status**: Draft

## Story

**As a** brand owner
**I want** to give the engine a client's logo and see the brand colours it found, ranked by how much of the logo each covers
**So that** I can trust that the palettes it builds start from the right colours, and correct it before they do

## Context

Logos mix brand colours with structural ones: black wordmarks, white
knock-outs, grey rules, transparent backgrounds. `tools/theme_accent.py`
already separates them for one accent; the engine generalises it. The
person must see what the engine saw, because every option downstream inherits
a wrong extraction.

## Walkthrough

1. The brand owner supplies `acme.svg` (or a PNG, or a light and a dark
   variant).
2. The engine parses the file without executing it, collects colours, folds
   near-neighbours together and drops black, white, greys and tinted
   near-neutrals.
3. It returns the remaining colours ranked by coverage, each with its share.
4. The brand builder (FEAT-003 BB-03) or the command line shows them before
   any palette is generated.

## Acceptance Criteria

- [ ] **US-006-AC1** — Given an SVG logo, when it is analysed, then its colours are read from the markup (fills, strokes, stops, styles), weighted by occurrence, with no script run and no external reference fetched.
- [ ] **US-006-AC2** — Given a PNG logo with transparency, when it is analysed, then colours are weighted by visible pixel area and transparent pixels are ignored.
- [ ] **US-006-AC3** — Given a logo containing black, white, greys or near-neutral tints, when it is analysed, then none of them is reported as a brand candidate.
- [ ] **US-006-AC4** — Given a logo with several near-identical shades (anti-aliasing, a gradient), when it is analysed, then they are folded into one candidate with their coverage summed.
- [ ] **US-006-AC5** — Given any supported logo, when it is analysed, then the result lists each candidate's hex value and coverage share, highest first.
- [ ] **US-006-AC6** — Given `tests/fixtures/logos/navy-wordmark.svg`, when it is analysed, then the top candidate matches `tools/theme_accent.py`'s.

## Edge Cases

- **Only black and white**: no candidates; the result says the logo is
  monochrome so generation can offer neutral options with a suggested accent
  (US-007).
- **An unsupported or unreadable file**: a clear error naming the problem; no
  partial result.
- **An SVG with an embedded raster** (`<image>`): the raster is ignored unless
  it is a `data:` PNG, which is analysed as a PNG.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| SVG markup | US-006-AC1 | Fixture SVG with fills, a gradient stop and a `<script>` | Analyse | Colours from fills and stop; script never runs; no network |
| Transparent PNG | US-006-AC2 | Fixture PNG, 60% transparent | Analyse | Shares sum to 100% of visible pixels |
| Structural colours | US-006-AC3 | Black wordmark + one brand colour | Analyse | One candidate |
| Folding | US-006-AC4 | Anti-aliased PNG of one brand colour | Analyse | One candidate |
| Ranked output | US-006-AC5 | Two-colour logo, 70/30 | Analyse | Two candidates, 70% first |
| Parity | US-006-AC6 | `navy-wordmark.svg` | Analyse in JS and Python | Same top candidate |

No tests yet: they arrive with the extraction port (bead
`ux-builder-29b06bfa`), against ≥ 10 reference logos in
`tests/fixtures/logos/`.

## Dependencies

- **Feature Spec**: FEAT-002
- **Feature Requirements**: PAL-01, PAL-02, PAL-03
- **PRD Requirements**: FR-8
- **External**: `tools/theme_accent.py` (reference behaviour)

## Out of Scope

- Editing or cleaning up logo artwork.
- Generating palettes (US-007).
