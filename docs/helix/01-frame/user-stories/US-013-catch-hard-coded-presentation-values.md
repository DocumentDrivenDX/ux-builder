---
ddx:
  id: US-013
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-004
    - kind: informed_by
      to: CONTRACT-001
---

# US-013: Catch hard-coded colours, fonts and radii before they ship

**Feature**: FEAT-004 — App SDK
**Feature Requirements**: SDK-10, SDK-11
**PRD Requirements**: FR-20
**Priority**: P1
**Status**: Draft

## Story

**As a** tech lead
**I want** CI to report literal colours, font families and radii in app code, suggesting the role token to use
**So that** apps stay on the design system after the first commit, and drift is caught in review, not by a client

## Context

The PRD's target is zero hard-coded presentation values in adopting apps. A
literal `#1B3139` looks right under one theme and wrong under every other.
Some literals are legitimate (a chart's series colours) and need a reviewed
exception.

## Walkthrough

1. A developer writes `color: #1B3139` in a CSS file and `style={{ borderRadius: 8 }}` in JSX.
2. `npm run lint` reports both, suggesting `var(--piq-color-text)` and
   `var(--piq-radius-control)`.
3. A chart palette is listed in the app's allow-list with a reason; it is not reported.

## Acceptance Criteria

- [ ] **US-013-AC1** — Given a literal colour (hex, rgb(), hsl(), oklch(), named) in CSS or a JSX `style`, when lint runs, then it is reported with its file and line.
- [ ] **US-013-AC2** — Given a literal `font-family` or border radius, when lint runs, then it is reported.
- [ ] **US-013-AC3** — Given a literal that equals a role token's value in the app's theme, when it is reported, then the message names that token.
- [ ] **US-013-AC4** — Given an allow-list entry with a reason, when lint runs, then the matching literal is not reported; an entry without a reason is itself an error.
- [ ] **US-013-AC5** — Given `var(--piq-…)`, `transparent`, `currentColor`, `inherit` or `0`, when lint runs, then nothing is reported.
- [ ] **US-013-AC6** — Given `packages/ui/src`, when lint runs, then it reports zero findings.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Colours | US-013-AC1 | Fixture CSS and JSX | Lint | Each literal reported |
| Font and radius | US-013-AC2 | Fixture | Lint | Reported |
| Suggestion | US-013-AC3 | `#1B3139` under databricks | Lint | Suggests `--piq-color-text` |
| Allow-list | US-013-AC4 | Entry with and without reason | Lint | Suppressed; missing reason errors |
| Allowed values | US-013-AC5 | Fixture | Lint | Nothing |
| SDK is clean | US-013-AC6 | `packages/ui/src` | Lint | 0 findings |

## Dependencies

- **Feature Spec**: FEAT-004
- **External**: CONTRACT-001 (role names); bead `efc97b11`

## Out of Scope

- Spacing and font sizes (a later rule, once apps adopt).
