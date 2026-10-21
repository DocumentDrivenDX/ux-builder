---
ddx:
  id: FEAT-001
  type: feature-specification
  status: draft
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: ADR-011
    - kind: informed_by
      to: ADR-013
    - kind: informed_by
      to: ADR-015
    - kind: informed_by
      to: ADR-017
    - kind: informed_by
      to: CONTRACT-003
    - kind: informed_by
      to: ADR-018
    - kind: informed_by
      to: ADR-021
    - kind: informed_by
      to: ADR-022
    - kind: informs
      to: FEAT-006
---

# Feature Specification: FEAT-001 — Themes composed from a brand and a design system

**Feature ID**: FEAT-001
**Status**: Specified
**Priority**: P0
**Owner**: Operator (until a harness/design-system owner is named)
**Covered PRD Subsystem(s)**: Theme composition
**Covered PRD Requirements**: FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-27
**Cross-Subsystem Rationale**: None — single subsystem.

## Overview

Splits what a theme is into two inputs — a brand (identity) and a design
system (anatomy) — and generates every theme from their combination. This is
the foundation for the palette engine (FEAT-002) and the brand builder
(FEAT-003), and it settles the role-based token names (PRD P0-2) before more
apps depend on today's names.

## Ideal Future State

A brand file names a client's colours, logo and, optionally, fonts. A design
system file names Material's, Fluent's, Carbon's or Praxis's shapes, type scale
and widget metrics. The build produces a theme for every brand × design system
× appearance, each contrast-checked, and the gallery shows them all. Adding a
brand or a design system is adding one file; no generator is written per
combination. Apps reference role tokens such as `color.text` and
`color.structure`, which mean the same thing in every theme.

## Problem Statement

- **Current situation**: Each theme is hand-assembled. `praxis` and
  `plain` are token files ported from the platform; `praxis-material`,
  `praxis-fluentui` and `praxis-carbon` are produced by three generators
  (`tools/gen-praxis-*.mjs`) that each hard-wire Praxis's colours to one design
  system. Token names mix roles and colours: `--navy` is the structural colour
  and is near-white in dark themes; `--paper` is the ground.
- **Pain points**: A new client brand needs a new generator per design system.
  Colour-named tokens mislead developers and will harden once more apps adopt
  them (ADR-011, Negative consequences).
- **Desired outcome**: Any brand renders in any design system with no new code;
  token names describe roles; every combination passes the gate.

## Functional Areas

| Area | User question or job | Feature responsibility |
|------|----------------------|------------------------|
| Brand file | "What is this client's identity?" | Declare palette per appearance, logo, optional fonts, generation settings |
| Design system file | "What do Carbon's widgets look like?" | Declare anatomy and widget metrics, no brand colours |
| Composition | "Show brand X in system Y" | Build a theme per brand × system × appearance, contrast-checked |
| Token names | "Which token do I use for body text?" | Role-based public names, with aliases for current names |

## Requirements

### Functional Requirements by Area

#### Brand file

THEME-01. A brand declares a complete palette for each appearance it supports
(light, dark, or both).
THEME-02. A brand declares its logo artwork per appearance and its mark.
THEME-03. A brand may declare display, body and mono font overrides, each with
its source (ADR-017).
THEME-04. A brand records the settings that generated its palette, so the
palette can be regenerated (FR-12).

#### Design system file

THEME-05. A design system declares type scale, shape, elevation, density and
widget tokens (`--field-*`, `--seg-*`, `--menu-*`, …) and default fonts.
THEME-06. A design system declares no brand colour; where its anatomy needs a
colour it names a role (for example, the focus ring uses the accent role).
THEME-16. *(Added 2026-10-18, ADR-022)* A shared design system, or a theme's
own anatomy, may choose one variant at each screen-pattern variant point; a
point it does not name takes the point's default; a brand cannot choose
variants (FR-27, CONTRACT-002 *Variants*).
THEME-17. *(Added 2026-10-18, ADR-021)* A design system sets layout measures —
page gutters per size class, content widths and target sizes — and no file
sets the size-class boundaries, which every theme publishes with the same
values (FR-2, CONTRACT-001).

#### Composition

THEME-07. Every brand × design system × appearance produces a theme without a
combination-specific generator.
THEME-08. A combination that fails the contrast gate fails the build; it is
not published.
THEME-09. The existing 0.x themes are reproduced exactly (`npm run verify`
and a resolved-JSON diff show no change). *[Amended — ADR-018]* They
are themes: `praxis` and `plain` are their brands with their own
anatomy; `praxis-material`, `praxis-fluentui` and `praxis-carbon` are the
praxis brand on the shared design systems `material`, `fluent` and `carbon`.
The shared design systems are `material`, `fluent`, `carbon` and
`databricks`.

#### Themes *[Added — ADR-018]*

THEME-12. An app selects a theme with `data-theme` and an optional
`data-appearance`; the theme's default appearance applies when it is absent
(CONTRACT-003).
THEME-13. A theme is one file naming a brand and either a shared design
system or its own anatomy (CONTRACT-002, Theme file); adding a theme needs no
code.
THEME-14. Every brand on every shared design system is still composed and
contrast-checked, as a preview for the brand builder (FEAT-003), not as
something apps select.
THEME-15. `synaptiq` is a theme: the Synaptiq brand (from synaptiq.ai and the
Synaptiq Design System; light, plus a derived dark) on its own anatomy, every
pairing ≥ 4.5:1.

#### Token names

THEME-10. Public names are tiered as primitives, roles and component tokens
(ADR-011); apps consume roles and component tokens only.
THEME-11. Every current token name remains available as an alias for one
major version, and its removal is announced in a changelog.

### Non-Functional Requirements

- **Performance**: A full build of every combination completes in ≤ 30 s on a
  developer laptop.
- **Security**: Brand files contain no executable content; SVG logos are
  sanitised before they are inlined in any output.
- **Scalability**: The build supports ≥ 20 brands × 4 design systems without
  per-combination code.
- **Reliability**: The build is deterministic: the same inputs produce
  byte-identical outputs.

## User Stories

- [US-001 — Describe a client's identity once, as a brand file](../user-stories/US-001-describe-a-brand-once.md)
- [US-002 — Describe a design system's anatomy without any brand colour](../user-stories/US-002-describe-a-design-system-without-colours.md)
- [US-003 — See a new brand in every design system, checked for contrast, with no code](../user-stories/US-003-new-brand-in-every-design-system.md)
- [US-004 — Style by role names, while 0.x names keep working](../user-stories/US-004-use-role-token-names.md)
- [US-005 — Choose a theme and an appearance in an app, with existing themes unchanged](../user-stories/US-005-select-a-theme-and-keep-existing-themes.md)
- [US-030 — See each design system's conventions on the same screens](../user-stories/US-030-see-each-design-systems-conventions-on-the-same-screens.md) (THEME-16, FR-27; owned by FEAT-006, which reads the variants)

## Edge Cases and Error Handling

- **A brand defines only one appearance**: themes are built for that
  appearance only; the gallery shows one panel.
- **A brand's font is unavailable at run time**: the design system's font
  stack is the fallback, in the stack order the brand file declares.
- **A design system needs a role the brand lacks**: the build fails naming the
  missing role, rather than inventing a colour.
- **Two brands share a name**: the build fails.

## Success Metrics

- New brand added with 0 lines of generator code.
- 100% of combinations pass the contrast gate in CI.
- 0 visible changes to the existing themes (resolved-JSON diff empty
  apart from new alias names).

## Constraints and Assumptions

- Brand-specific widget anatomy is out of scope: brands may override fonts but
  not shapes or metrics (operator, 2026-10-05).
- DTCG remains the token source format (ADR-011).

## Dependencies

- **Other features**: Enables FEAT-002, FEAT-003, FEAT-004.
- **External services**: none. The token build is hand-written (`packages/tokens/build.mjs`).
- **PRD requirements**: P0-1, P0-2; P1-4.

## Out of Scope

- Generating a palette from a logo (FEAT-002).
- Any UI for creating brands (FEAT-003).
- Shipping font files (FEAT-004); this feature only declares fonts.
