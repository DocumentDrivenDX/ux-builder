---
ddx:
  id: FEAT-002
  type: feature-specification
  status: draft
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: FEAT-001
    - kind: informed_by
      to: ADR-014
    - kind: informs
      to: FEAT-003
---

# Feature Specification: FEAT-002 — Palette options generated from a logo

**Feature ID**: FEAT-002
**Status**: Specified
**Priority**: P0
**Owner**: Operator (until a design-system owner is named)
**Covered PRD Subsystem(s)**: Palette generation
**Covered PRD Requirements**: FR-8, FR-9, FR-10, FR-11, FR-12
**Cross-Subsystem Rationale**: None — single subsystem.

## Overview

A deterministic engine that reads a logo and produces several complete,
accessible palette options, and regenerates them from adjusted settings. It
generalises `tools/theme_accent.py`, which picks one accent per appearance,
into full palettes (PRD P0-3). The brand builder (FEAT-003) is its first user
interface; the engine is also usable from the command line.

## Ideal Future State

Given a client's logo, the engine returns four or more named options —
"faithful", "muted", "vibrant", "neutral with one accent" and others — each a
full palette for light and dark: grounds, surfaces, text tiers, structure,
accent and the five status colours, tinted to sit with the brand. Every option
already passes the contrast gate, and each reports which brand colours it had
to move and by how much. Given adjusted settings — from a person or from the
feedback interpreter (ADR-014) — it returns new options, and the settings
stored in a brand file reproduce that brand's palette exactly.

## Problem Statement

- **Current situation**: `tools/theme_accent.py` extracts candidate colours
  from SVG or PNG, ranks them by coverage, and fits one accent to two fixed
  grounds. Every other colour in a theme is chosen by hand.
- **Pain points**: A full palette takes a designer's time, and contrast
  failures are found after the fact. There is one answer, not options.
- **Desired outcome**: ≥ 4 accessible options per logo, generated in seconds,
  reproducible from recorded settings.

## Functional Areas

| Area | User question or job | Feature responsibility |
|------|----------------------|------------------------|
| Extraction | "What are this logo's brand colours?" | Identify brand colours; exclude structural ones |
| Generation | "Give me palettes built from them" | Produce complete options per strategy and appearance |
| Fitting | "Is it readable?" | Move colours to pass the gate; report the distance |
| Steering | "Make it warmer" | Accept bounded setting changes and regenerate |

## Requirements

### Functional Requirements by Area

#### Extraction

PAL-01. Reads SVG and PNG logos, including transparent PNGs.
PAL-02. Excludes black, white, greys and tinted near-neutrals from brand
candidates, and ranks the rest by coverage (as `theme_accent.py` does).
PAL-03. Reports the extracted brand colours with their coverage, so a person
can see what the engine saw.

#### Generation

PAL-04. Produces at least four options per logo, each from a distinct, named
strategy.
PAL-05. Each option is a complete palette for both light and dark: every role
FEAT-001's brand file requires.
PAL-06. Neutrals are tinted toward the brand's hue by a bounded amount; status
colours keep their meaning (live reads as success, closed as error) while
harmonising with the brand.

#### Fitting

PAL-07. Every option passes the contrast gate for every pairing before it is
returned (FR-10).
PAL-08. A colour moved to pass keeps its hue and reports the distance moved;
a move above a threshold is flagged for human review.

#### Steering

PAL-09. Generation is a pure function of the logo and a bounded set of
settings (for example hue shift, chroma scale, neutral tint, accent role,
strategy); the same inputs give the same output.
PAL-10. The settings accepted are documented with their ranges; values out of
range are clamped and reported, never silently applied.
PAL-11. The settings that produced an option are returned with it, for the
brand file (THEME-04).

### Non-Functional Requirements

- **Performance**: Four options for a 1 MB PNG in ≤ 2 s on a developer laptop.
- **Security**: SVG input is parsed, never executed or rendered with scripts;
  external references in SVG are ignored.
- **Scalability**: N/A — one logo per request.
- **Reliability**: Golden tests fix the output for a set of reference logos
  and strategies; any change to output is a reviewed change.

## User Stories

- [US-006 — See which brand colours the engine found in a logo](../user-stories/US-006-see-the-brand-colours-in-a-logo.md) (Extraction: PAL-01–03, FR-8)
- [US-007 — Get four or more complete palette options from a logo](../user-stories/US-007-get-palette-options-from-a-logo.md) (Generation: PAL-04–06, FR-9)
- [US-008 — Every option is readable, and any colour moved to make it so is reported](../user-stories/US-008-every-option-is-readable.md) (Fitting: PAL-07–08, FR-10)
- [US-009 — Steer options with settings, and reproduce a saved palette exactly](../user-stories/US-009-steer-options-and-reproduce-them.md) (Steering: PAL-09–11, FR-11, FR-12)

## Edge Cases and Error Handling

- **A monochrome logo** (one colour, or only black and white): the engine
  returns options built from that colour or, for pure black/white, neutral
  options with a suggested accent, and says so.
- **A logo whose brand colour cannot pass on one appearance without a large
  move**: the option is returned with the move flagged for review (PAL-08).
- **An unreadable or unsupported file**: a clear error naming the format
  problem; no partial palette.
- **Many brand colours** (a gradient or a multicolour mark): the top colours
  by coverage are used; near-neighbours are folded together.

## Success Metrics

- 100% of returned options pass the gate.
- ≥ 80% of brand-builder sessions accept an option without hand-editing a
  colour (PRD metric).
- Golden tests cover ≥ 10 reference logos.

## Constraints and Assumptions

- The engine is deterministic and contains no model call (ADR-014).
- The colour-generation approach (for example Material Color Utilities' tonal
  palettes) is a design decision for the solution design, not fixed here.

## Dependencies

- **Other features**: FEAT-001 (the brand file and the roles it requires).
- **External services**: None required; a colour library may be chosen in
  design.
- **PRD requirements**: P0-3.

## Out of Scope

- Interpreting plain-language feedback (FEAT-003, via ADR-014).
- Fonts (FEAT-001 declares them; FEAT-003 lets a person choose them).
- Editing logo artwork.
