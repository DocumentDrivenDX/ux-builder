---
ddx:
  id: FEAT-003
  type: feature-specification
  status: draft
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: FEAT-001
    - kind: informed_by
      to: FEAT-002
    - kind: informed_by
      to: ADR-014
    - kind: informed_by
      to: ADR-017
    - kind: informed_by
      to: ADR-018
    - kind: informed_by
      to: CONTRACT-003
    - kind: informed_by
      to: FEAT-006
    - kind: informed_by
      to: ADR-021
---

# Feature Specification: FEAT-003 — Guided brand builder

**Feature ID**: FEAT-003
**Status**: Specified
**Priority**: P0
**Owner**: Operator (until a design-system owner is named)
**Covered PRD Subsystem(s)**: Brand builder
**Covered PRD Requirements**: FR-13, FR-14, FR-15, FR-16
**Cross-Subsystem Rationale**: None — single subsystem.

## Overview

A simple guided UI, part of the SDK, that takes a person from a client's logo
to a saved, reviewable **theme**: a brand file plus the theme file that pairs
it with a design system (PRD P0-4; ADR-018). It drives the palette engine
(FEAT-002), previews options on the SDK's real widgets, and turns
plain-language feedback into new options through an OpenAI model (ADR-014, ADR-019).

## Ideal Future State

A brand owner opens the builder and uploads the client's logo. The builder
shows the colours it found and four or more palette options. They type "too
orange, this is a law firm — more conservative" (or move the settings
sliders) and get new options that reflect it, with a plain statement of what
changed; colours moved for contrast are flagged. They pick the palettes worth
comparing and the design systems the client's apps will use, and see every
combination on real widgets in light and dark side by side. They choose one,
name the theme, and save. Saving opens a pull request with the brand file and
the theme file, which goes through the repository's normal code review before
it ships. The builder then shows exactly how an app adopts the theme.

The steps, screens and controls follow the operator-approved prototype
(`prototypes/theme-builder/`, 2026-10-06). The operator kept three additions
to it: the settings sliders (BB-10), opening a pull request on save (BB-13)
and flagged colour moves (BB-05).

## Problem Statement

- **Current situation**: No UI exists. A brand is created by a developer
  editing token files or generators, and previewed only after a build.
- **Pain points**: Brand owners cannot try options themselves; every
  variation costs developer time; colours are judged without seeing them on
  real widgets.
- **Desired outcome**: A non-developer creates a reviewed brand in one sitting
  (median ≤ 30 minutes, PRD metric).

## Functional Areas

| Area | User question or job | Feature responsibility |
|------|----------------------|------------------------|
| Start | "Which logo, which systems?" | Accept a logo; choose design systems to preview |
| Compare | "Which palette works?" | Show options on real widgets per system and appearance |
| Refine | "Not quite — make it…" | Take feedback or settings, regenerate, say what changed |
| Finish | "Use this one" | Name, save as a theme (brand file + theme file), submit for review |
| Integrate | "How do I use it?" | The import and attribute an app needs, copyable *[Added — ADR-018]* |

## Requirements

### Functional Requirements by Area

#### Start

BB-01. The person uploads an SVG or PNG logo, or a light and a dark variant.
*[Amended 2026-10-07, operator]* They may also upload the brand's mark (the
symbol on its own), which becomes its mark and favicon, framed to a square.
BB-02. The person chooses one or more shared design systems to preview
(Material 3, Fluent 2, Carbon, Databricks).
BB-03. The builder shows the brand colours the engine extracted (PAL-03)
before generating options.

#### Compare

BB-04. Each option is previewed on the SDK's real widgets — at minimum
buttons, a text field, a dropdown, a table, a notice and status pills — in
each chosen design system, in light and dark (FR-14). *[Amended — ADR-018]* The comparison is a grid of palettes × design systems, with a
light/dark switch that applies to the whole grid; previews use the preview
surface (`data-brand` + `data-design-system`, CONTRACT-003).
BB-18. *(Added 2026-10-18, FEAT-006)* A screens view previews the chosen
option on the SDK's screen patterns: one screen at a time from a selector
(collection list, list with detail, form, dashboard), with realistic sample
data, at a phone width and a desktop width side by side, in light and dark,
in each chosen design system with that system's variants (FR-14). Both widths
render on one page, because patterns adapt to their container (ADR-021).
BB-05. Options that moved a brand colour beyond the review threshold show the
move (PAL-08).
BB-06. *[Amended — approved prototype, 2026-10-06]* The person compares every
chosen palette × design system combination, light and dark side by side or one
appearance at a time, and chooses one to save.

#### Refine

BB-07. The person gives feedback in plain language on one option or on the
set; the builder returns new options reflecting it (FR-11, ADR-014).
BB-08. The builder states, in plain language, what it changed in response to
feedback (for example "shifted hue 12° cooler, reduced saturation").
BB-09. *[Amended — approved prototype, 2026-10-06]* Each new round says what
changed and keeps the palettes the person has selected; the round number
advances. Earlier rounds are not kept (FR-15).
BB-10. The person may adjust the engine's settings directly instead of, or as
well as, giving feedback.

#### Finish

BB-11. *[Amended — approved prototype, 2026-10-06]* The save summary names the
design system's fonts and icons, which the theme takes. Brand font overrides
(THEME-03, ADR-017) are added to the brand file in review, not in the builder.
BB-12. The person names the theme (and its brand); each name must be unique.
BB-13. *[Amended — ADR-018]* Saving produces a brand file containing
the chosen palette and its generation settings (THEME-04), and a theme file
(`tokens/themes/<name>.theme.json`) naming that brand and the chosen shared
design system (THEME-13), and submits both for review; it does not publish
(FR-16). *[Amended 2026-10-07, operator]* The review includes the changeset
that releases the theme once merged, and the logo framed to its drawing.
BB-14. The review includes a gallery of the theme in each appearance its brand
defines.

#### Review *[Added 2026-10-07, operator]*

BB-17. "Your themes" lists every theme in the repository, and previews the
one chosen in each appearance it has: its palette, the SDK's widgets in its
anatomy and icon set, and its logo, mark and favicon (FR-14).

#### Integrate *[Added — ADR-018]*

BB-15. After saving, the builder shows how an app adopts the theme once it is
released: the package version, the one CSS import
(`@ux-builder/tokens/themes/<name>.css`) and the attribute
(`data-theme="<name>"`, optional `data-appearance`), each copyable.
BB-16. The integration step names the fonts the app must load (ADR-017) and
links to the review.

### Non-Functional Requirements

- **Performance**: First options visible ≤ 5 s after upload; a feedback round
  returns ≤ 10 s at the 95th percentile.
- **Security**: Uploaded SVGs are sanitised before display; the OpenAI API
  key stays server-side; the logo image is not sent to the model unless the
  operator enables it (concerns: `security-owasp`).
- **Accessibility**: The builder itself meets WCAG 2.x AA and is fully
  keyboard-operable; it is built from the SDK's own widgets.
- **Reliability**: If the model is unavailable, feedback is disabled with a
  message and the person can still adjust settings directly (BB-10) and save.

## User Stories

- [US-015 — From a logo to a theme under review, in one sitting (core flow, e2e)](../user-stories/US-015-logo-to-saved-theme.md)
- [US-016 — Start with a logo and the design systems to compare](../user-stories/US-016-start-with-a-logo.md) (Start: BB-01–03, FR-13)
- [US-017 — Compare options on real widgets, in every chosen design system, light and dark](../user-stories/US-017-compare-options-on-real-widgets.md) (Compare: BB-04–06, FR-14)
- [US-018 — Refine the options in plain language, or by settings](../user-stories/US-018-refine-with-feedback.md) (Refine: BB-07–10, FR-11, FR-15)
- [US-019 — Save the chosen theme for review, and see how an app adopts it](../user-stories/US-019-save-the-theme-and-adopt-it.md) (Finish, Integrate: BB-11–16, FR-16)
- [US-020 — Preview every theme in the repository, with its logos and favicon](../user-stories/US-020-preview-the-themes-in-the-repository.md) (Review: BB-17, FR-14)
- [US-032 — Preview a theme on screen patterns in the builder](../user-stories/US-032-preview-a-theme-on-screen-patterns-in-the-builder.md) (Compare: BB-18, FR-14)

## Edge Cases and Error Handling

- **Feedback the engine cannot express** (for example "add a gradient"): the
  builder says it cannot do that and suggests what it can change.
- **Contradictory feedback** across rounds: the latest feedback wins; history
  lets the person return.
- **The person leaves mid-session**: the session is lost unless saved; the
  builder warns before leaving with unsaved options.
- **A theme or brand name already exists**: saving is blocked with a message (BB-12).

## Success Metrics

- Median logo-to-review time ≤ 30 minutes over the first 10 brands.
- ≥ 80% of sessions end with an option accepted without hand-edited colours.
- ≤ 3 feedback rounds to acceptance, median.

## Constraints and Assumptions

- Built with React and `@ux-builder/ui` (ADR-016); the builder is itself a
  consumer of the SDK.
- Where the builder runs and who holds the API key: ADR-019 (accepted) — a
  local tool in this repository, the OpenAI key on the developer's machine.
- No designer sign-off is required; the theme's pull request goes through the
  repository's normal code review (PRD Open Questions, resolved 2026-10-06).

## Dependencies

- **Other features**: FEAT-001 (brand files, composition), FEAT-002 (engine).
- **External services**: OpenAI API (feedback interpretation, ADR-014, ADR-019); the
  repository host for review submission.
- **PRD requirements**: P0-4.

## Out of Scope

- Editing or creating logos.
- Choosing widget shapes per brand (brands override fonts only). A theme with
  its own anatomy, like `synaptiq`, is written by hand, not in the builder.
- Publishing a brand without review.
- Multi-user collaboration on one session.
