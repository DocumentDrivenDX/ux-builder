---
ddx:
  id: US-009
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-002
    - kind: informed_by
      to: ADR-014
    - kind: informed_by
      to: FEAT-003
---

# US-009: Steer options with settings, and reproduce a saved palette exactly

**Feature**: FEAT-002 — Palette options generated from a logo
**Feature Requirements**: PAL-09, PAL-10, PAL-11
**PRD Requirements**: FR-11, FR-12
**Priority**: P0
**Status**: Draft

## Story

**As a** brand owner (directly, or through the brand builder's feedback box)
**I want** to adjust a small set of named settings and get new options, and have the settings saved with the palette I choose
**So that** I can say "warmer" or "more conservative" and get a predictable change, and anyone can regenerate the saved palette later

## Context

ADR-014 keeps Claude out of colour choice: feedback is interpreted into
setting changes, and the deterministic engine produces the colours. That only
works if the settings are bounded, documented, and fully determine the
output. The brand file records them (THEME-04), so a palette can be rebuilt
or audited.

## Walkthrough

1. The brand owner sees options and types "too orange, more conservative"
   (FEAT-003), or edits settings directly (BB-10), or runs
   `npm run brand -- acme.svg --settings s.json`.
2. The interpreter (FEAT-003) turns the feedback into changes such as hue
   shift −12°, chroma scale 0.8; the engine regenerates.
3. The options come back with the settings that produced each.
4. The chosen option is saved as a brand file including its settings;
   regenerating from that file reproduces the palette exactly.

## Acceptance Criteria

- [ ] **US-009-AC1** — Given the same logo and the same settings, when options are generated twice, then the output is byte-identical.
- [ ] **US-009-AC2** — Given the settings schema in SD-001, when it is published, then every setting has a name, type, range and default.
- [ ] **US-009-AC3** — Given a setting outside its range, when options are generated, then it is clamped to the range and the result reports the clamp; it is never applied unclamped.
- [ ] **US-009-AC4** — Given any returned option, when it is inspected, then it carries the complete settings that produced it.
- [ ] **US-009-AC5** — Given a brand file written from an option, when its palette is regenerated from its recorded settings and logo, then every colour is identical.
- [ ] **US-009-AC6** — Given changed settings (for example a hue shift), when options are regenerated, then the change is visible in the direction the setting names and every option still passes US-008.

## Edge Cases

- **An unknown setting name**: rejected with the list of valid names; nothing
  generated.
- **Settings from an older engine version**: the brand file records the
  engine version; a different version regenerates with a warning if any
  colour would change.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Determinism | US-009-AC1 | Logo + settings | Generate twice | Identical bytes |
| Schema documented | US-009-AC2 | SD-001 | Review | Table complete |
| Clamp | US-009-AC3 | Chroma scale 5 (range 0–2) | Generate | Clamped to 2, warning printed |
| Settings returned | US-009-AC4 | Any option | Inspect | Settings present and complete |
| Round trip | US-009-AC5 | `npm run brand -- navy-wordmark.svg --out b.json` | Regenerate from `b.json` | Identical palette |
| Direction | US-009-AC6 | Hue shift +20° | Regenerate | Accent hue +20° ± fitting; gate passes |

No tests yet: they arrive with the brand command (bead
`ux-builder-b14ec03a`). The feedback interpreter is FEAT-003's
(bead `ux-builder-d6cdc824`); this story covers the engine side of
FR-11, which is what makes the interpreter safe.

## Dependencies

- **Stories**: US-007, US-008
- **Feature Spec**: FEAT-002
- **Feature Requirements**: PAL-09, PAL-10, PAL-11
- **PRD Requirements**: FR-11, FR-12
- **External**: ADR-014 (interpreter adjusts settings only); SD-001 (settings schema)

## Out of Scope

- Interpreting plain-language feedback into settings (FEAT-003).
