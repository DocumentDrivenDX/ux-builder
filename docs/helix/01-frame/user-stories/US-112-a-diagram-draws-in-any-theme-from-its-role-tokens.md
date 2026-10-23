---
ddx:
  id: US-112
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-017
    - kind: informed_by
      to: CONTRACT-001
    - kind: informed_by
      to: CONTRACT-002
---

# US-112: A diagram draws in any theme from its role tokens

**Feature**: FEAT-017 — Diagram and data-visualization tokens
**Feature Requirements**: VIZ-01 to VIZ-09, GATE-01 to GATE-06, AUD-01
**PRD Requirements**: FR-73, FR-74
**Priority**: P1
**Status**: Draft

## Story

**As a** developer of a renderer or an app's chart (PRD primary persona)
**I want** every colour and shape a diagram needs to be a role token in every theme, already checked for contrast
**So that** I draw with no colour of my own and the diagram reads, and passes the audit, in every theme and appearance

## Context

`@ux-builder/visuals` (the visuals PRD's M3) maps a visual's roles (a node's
status, an edge's kind, a series) to tokens. Those tokens must exist in
every theme first, and must pass the gate there, or each renderer would
check contrast itself.

## Walkthrough

1. The developer builds the tokens; every theme's CSS and resolved JSON
   carry the status, series, region, edge, lifecycle, stroke and radius
   roles.
2. They draw a diagram with `var(--piq-color-series-1)`,
   `var(--piq-color-diagram-region-1)`, `var(--piq-size-diagram-stroke)` and
   the rest.
3. They switch theme and appearance; the diagram follows with no change to
   their code.
4. `npm run contrast` and the audit pass.

## Acceptance Criteria

- [ ] **US-112-AC1** — Given the token build, when it finishes, then every theme and preview pair's resolved JSON, in every appearance it has, sets all 28 diagram tokens of CONTRACT-001, and every theme's CSS declares them.
- [ ] **US-112-AC2** — Given the resolved series in any two themes, when slot *n* is compared, then it is the same hue family (its OKLCH hue within 30° of the default's).
- [ ] **US-112-AC3** — Given a brand that sets `color.series-2` for its light appearance only, when it is built, then its light themes use that value and its dark themes keep the default.
- [ ] **US-112-AC4** — Given every theme and preview pair, when `npm run contrast` runs, then GATE-01 to GATE-05 hold and it reports 0 failures; a resolved file missing any of the 28 roles, unless marked `"fixture": true`, fails naming each missing role (AR-2026-10-22 D-7).
- [ ] **US-112-AC5** — Given a brand whose status colour is below 4.5:1 on its ground, or whose series 3 and 4 collide under deuteranopia, when the gate runs on it, then it fails, naming the theme, appearance, pairing and measured value.
- [ ] **US-112-AC6** — Given Carbon and Material, when their themes are built, then each has its own diagram node radius, and a theme with its own anatomy gets the SDK defaults.
- [ ] **US-112-AC7** — Given a page that draws a status chip on its subtle fill, a series legend, a region holding a node, an edge in each weight and the three lifecycle tints with those tokens only, when the audit runs in every theme and appearance, then it reports no errors and no warnings.

## Edge Cases

- **A status chip**: the status colour is the chip's mark (3:1 on its fill); its label is `color.text` (4.5:1).
- **A two-hex `color-mix()` tint**: measured as the colour it mixes to.
- **A token that is neither a hex nor a two-hex mix**: the gate fails on it.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-112-AC1 | the token build | it finishes | every resolved file sets all 28 tokens; every theme CSS declares them |
| AC2 | US-112-AC2 | resolved series of every theme | slot hues compared | same family in every theme |
| AC3 | US-112-AC3 | a brand overriding `color.series-2` in light | built | light uses it, dark keeps the default |
| AC4 | US-112-AC4 | every theme and preview pair | `npm run contrast` | 0 failures |
| AC5 | US-112-AC5 | a brand with a failing status colour, and one with colliding series | the gate runs | it fails, naming theme, appearance, pairing and value |
| AC6 | US-112-AC6 | Carbon, Material and an own-anatomy theme | built | each design system's radius; defaults for the own anatomy |
| AC7 | US-112-AC7 | a diagram page drawn from the tokens | the audit runs in every theme and appearance | no errors, no warnings |

## Dependencies

- **Feature Spec**: FEAT-017
- **Feature Requirements**: VIZ-01 to VIZ-09, GATE-01 to GATE-06, AUD-01
- **PRD Requirements**: FR-73, FR-74
- **External**: CONTRACT-001, CONTRACT-002

## Out of Scope

- The renderer itself (visuals PRD M3).
