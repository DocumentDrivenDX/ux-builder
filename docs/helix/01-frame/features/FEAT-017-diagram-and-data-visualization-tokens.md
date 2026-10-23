---
ddx:
  id: FEAT-017
  type: feature-specification
  status: draft
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: FEAT-001
    - kind: informed_by
      to: CONTRACT-001
    - kind: informed_by
      to: CONTRACT-002
    - kind: informs
      to: US-112
    - kind: informs
      to: US-113
---

# Feature Specification: FEAT-017 — Diagram and data-visualization tokens

**Feature ID**: FEAT-017
**Status**: Draft (2026-10-22)
**Priority**: P1
**Owner**: Operator
**Covered PRD Subsystem(s)**: Theme composition
**Covered PRD Requirements**: FR-73, FR-74 (drafted with this feature)
**Cross-Subsystem Rationale**: None — single subsystem. The theme page (FEAT-003's builder) and the audit (FEAT-004) only show and check what this feature adds.

## Overview

The operator's visuals PRD (`~/Documents/visuals/PRD.md`, 2026-10-22) plans
one library, `@ux-builder/visuals`, that draws every DocumentDrivenDX
diagram and chart in the product's theme. Its milestone M2 (§6.5) is this
feature: the theme must first carry the colours and shapes diagrams draw
with. Today's resolved tokens (`@ux-builder/tokens` 1.6.0) have surface,
text, border and accent roles, but no status colours, no categorical palette
and no diagram roles, so any renderer would have to invent colours and
break the SDK's rule against hard-coded presentation values (FR-20).

## Ideal Future State

A renderer, an app's chart, or a person reading a theme's page finds every
colour and shape a diagram needs among the theme's own role tokens. Slot 3
of the series is the same hue family in every theme, so a legend means the
same thing on any site. Positive, caution, negative and info look native to
each brand and readable on its ground. Group regions read as quiet tints of
the page. Edges come in three weights. Parts not yet built have their own
tints. Each design system draws diagram nodes with its own corners and
strokes: square in Carbon, rounded in Material. Every one of these pairings
is checked by the same contrast gate as the widgets, so a visual drawn only
from these tokens passes the audit in every theme without anyone checking
by hand.

## Problem Statement

- **Current situation**: HELIX's documentor, HELIX's site, ux-builder's
  microsite and decks each take diagram colours from their own place (the
  visuals PRD §1 counts four). `@ux-builder/tokens` 1.6.0 has five
  domain-specific `state.*` colours (live, limited, purchasing, evaluation,
  closed) and nothing general for good, bad, series or diagram structure.
- **Pain points**: A diagram drawn in the theme today must pick raw hexes,
  which the lint (FR-20) and the audit's `token-colors` check reject in an
  app. The audit has nothing to accept such colours against. Nothing checks
  whether a chart's colours are readable on a theme's ground, or whether
  neighbouring series can be told apart by a reader with a colour-vision
  deficiency.
- **Desired outcome**: Every theme and appearance carries 28 new role
  tokens; every pairing a diagram draws passes the gate; each theme's page
  shows them; the audit passes a page drawn from them in every theme.

## Functional Areas

| Area | User question or job | Feature responsibility |
|------|----------------------|------------------------|
| Colour roles | "Which colour means good, series 2, a zone, an edge, a placeholder?" | The status, series, region, edge and lifecycle roles in every theme and appearance |
| Shape roles | "How thick is a line, how round is a node, in this design system?" | Stroke and node radius from the design system |
| Contrast gate | "Can every reader read it, in every theme?" | Measured pairings and the colour-vision check, failing the build |
| Theme page | "What are this theme's diagram colours?" | A section of each theme's page that shows them with their verdicts |

Two families sound alike and stay separate. The existing **`state.*`**
colours are the Praxis domain's availability statuses (live, limited,
purchasing…), used by the `StatusPill`. The new **status** colours are
general outcomes (positive, caution, negative, info) for metrics, ratings
and state diagrams. Neither replaces the other. **Lifecycle** tints describe
a part's build status in a diagram (placeholder, decided, unknown), not a
record's workflow state.

## Requirements

### Functional Requirements by Area

The exact token paths and CSS names are normative in CONTRACT-001; how a
brand or design system sets them is normative in CONTRACT-002.

#### Colour roles

- **VIZ-01** — Every theme, in every appearance it has, must set four
  status colours (positive, caution, negative, info), each with a subtle
  fill of its own hue for backgrounds.
- **VIZ-02** — Every theme must set eight categorical series colours. Slot
  *n* must be the same hue family in every theme and appearance: 1 blue,
  2 orange, 3 aqua, 4 yellow, 5 magenta, 6 green, 7 violet, 8 red.
- **VIZ-03** — Every theme must set three region tints for groups, zones
  and bands, each a tint of the theme's ground, distinct from the ground
  and from each other, deepening from region 1 to region 3.
- **VIZ-04** — Every theme must set three edge colours (edge, strong,
  muted), taken from the theme's own text roles.
- **VIZ-05** — Every theme must set three lifecycle tints (placeholder,
  decided, unknown) as fills for parts not built.
- **VIZ-06** — A brand need not set any of these roles. When a brand sets a
  status or series colour for an appearance, that value must be used in
  place of the SDK's default for that appearance only.
- **VIZ-07** — The subtle fills, region tints, edges and lifecycle tints
  must follow the brand's own ground, surface, text and accent, so a brand
  whose ground changes gets new tints without editing them.

#### Shape roles

- **VIZ-08** — Every theme must set a diagram stroke width, a strong stroke
  width and a diagram node radius.
- **VIZ-09** — Each shared design system (Material, Fluent, Carbon,
  Databricks) may set its own stroke and radius, so a diagram looks native
  in it. A theme with its own anatomy, or a design system that sets none,
  gets the SDK's defaults.

#### Contrast gate

- **GATE-01** — Each status colour must clear 4.5:1 against the ground and
  the surface, so it can be text, and 3:1 against its own subtle fill, where
  it is a mark (an icon or dot) beside a label in body text.
- **GATE-02** — Body text must clear 4.5:1 on each subtle fill, each region
  tint and each lifecycle tint.
- **GATE-03** — Each series colour and each edge colour must clear 3:1
  against the ground, the surface and the deepest region tint.
- **GATE-04** — Every pair of neighbouring series colours (1–2, 2–3 … 7–8)
  must stay distinguishable: at least 8 ΔE (OKLab ×100) under simulated
  protanopia and deuteranopia, and at least 15 ΔE with normal vision.
- **GATE-05** — Region tints must differ from the ground, and each must be
  at least as far from the ground as the one before it.
- **GATE-06** — GATE-01 to GATE-05 must run for every theme, every
  appearance and every brand × design-system preview pair. A failure must
  fail `npm run contrast`, naming the theme, appearance, pairing and
  measured value. The baseline of known failures must not grow.
  *[Amended 2026-10-23 — AR-2026-10-22 D-7]* A built theme or pair missing
  any of the 28 roles fails, naming each missing role; only a test's own
  resolved file marked `"fixture": true` is exempt.

#### Theme page

- **PAGE-01** — Each theme's page must have a "Diagrams and data" section,
  reached from its menu, that shows every diagram token in the page's
  current appearance: a swatch, its CSS name and value, and the contrast it
  is held to against what it sits on.
- **PAGE-02** — The section must show the stroke widths and node radius
  drawn on a sample node and edge in the theme's design system.
- **PAGE-03** — The section must use only theme tokens and SDK markup, so
  the audit has nothing to report in it.

#### Audit

- **AUD-01** — A page that draws a status chip on its subtle fill, a series
  legend, a region holding a node, an edge in each weight and the three
  lifecycle tints, using only these tokens, must pass the audit
  (`@ux-builder/audit`) with no errors and no warnings in every theme and
  appearance.

### Non-Functional Requirements

- **Determinism**: The same token sources must build byte-identical theme
  CSS and resolved JSON.
- **Performance**: The added checks must add no more than 2 seconds to
  `npm run contrast` on the 61 current theme and preview combinations.
- **Compatibility**: Additive only. No existing token changes value or
  name; a theme or brand file valid under 1.6.0 must stay valid.
  `@ux-builder/tokens` takes a minor version.

## User Stories

- [US-112 — A diagram draws in any theme from its role tokens](../user-stories/US-112-a-diagram-draws-in-any-theme-from-its-role-tokens.md)
- [US-113 — See a theme's diagram tokens on its page](../user-stories/US-113-see-a-themes-diagram-tokens-on-its-page.md)

## Edge Cases and Error Handling

- **A brand's ground makes a default fail** (a mid-tone ground, say): the
  gate fails, naming the token and the ratio; the brand sets that colour
  for that appearance (VIZ-06).
- **A brand overrides one series slot**: the colour-vision check runs on
  the theme's whole series after the override, so a slot that collides with
  its neighbour fails.
- **A theme with only one appearance** (`plain`): it gets the roles for that
  appearance only.
- **A palette option in the theme builder**: options get the defaults and
  derived tints as a saved brand would; the builder's own option gate is
  unchanged.
- **A token that cannot be measured** (not a hex or a two-hex mix): the gate
  fails rather than skipping it, because every diagram colour must be
  measurable.

## Success Metrics

- All 61 theme and preview combinations set all 28 tokens, and
  `npm run contrast` reports 0 failures with an empty baseline.
- The audit fixture of AUD-01 reports 0 errors and 0 warnings in every
  theme and appearance.
- `@ux-builder/visuals` (M3) ships with no colour literal of its own.

## Constraints and Assumptions

- Colours belong to brands and shapes to design systems (ADR-013): the
  status and series defaults are SDK colours a brand may replace, and stroke
  and radius come from the anatomy.
- The categorical order and hue families follow the validated reference
  palette in the operator's dataviz guidance, re-stepped in lightness so
  each slot clears 3:1 on every current ground.
- WCAG 2.x contrast (4.5:1 text, 3:1 graphics, 1.4.11) is the measure, as
  for the existing gate.

## Dependencies

- **Other features**: FEAT-001 (theme composition and the contrast gate),
  FEAT-003 (the theme page), FEAT-004 (the audit).
- **External services**: none.
- **PRD requirements**: FR-73, FR-74 (P1-12); supports FR-20 (no
  hard-coded presentation values).
- **Downstream**: the visuals PRD's M3 and M4 (`@ux-builder/visuals`) read
  these tokens; umf's `umf.visual` (M1) names roles, not colours.

## Out of Scope

- The renderer, layouts, the `<Visual>` React widget and its lint and audit
  rules (visuals PRD M3, M4).
- Sequential and diverging ramps, and texture fills. Series and status
  cover M3's graph kinds; ramps come with `metric` in M4 if needed.
- Generating diagram colours from a logo in the palette engine. Generated
  brands get the defaults and derived tints.
- Replacing or renaming the `state.*` availability colours.
- Deck (pptx) colours.
