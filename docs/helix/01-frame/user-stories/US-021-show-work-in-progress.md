---
ddx:
  id: US-021
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-004
    - kind: informed_by
      to: CONTRACT-001
---

# US-021: Show work in progress with the SDK's loading widgets

**Feature**: FEAT-004 — App SDK
**Feature Requirements**: SDK-17
**PRD Requirements**: FR-17
**Priority**: P1
**Status**: Draft

## Story

**As a** developer building an app on `@ux-builder/ui`
**I want** a progress bar, a spinner, skeleton placeholders and a busy button from the SDK
**So that** waiting looks like the theme's design system and is announced to everyone, without a second component library or hand-drawn loaders

## Context

Requested by the operator on 2026-10-08. Material 3, Carbon, Fluent and
Databricks each ship progress, spinner and skeleton components, but the SDK
had none, so an app either loaded a design system's own library (which does
not follow the theme) or drew its own, as a client had with icons (SDK-03).
ADR-011 already asks embedded products to show loading states.

## Walkthrough

1. A developer shows an upload with `<ProgressBar label="Uploading" value={40} />`
   and, before the size is known, `<ProgressBar label="Preparing" />`.
2. A panel fetching data renders `<Skeleton lines={3} />` inside a region
   with `aria-busy="true"`, then the content.
3. A small wait inside text is `<Spinner size="sm" label="Saving" showLabel />`.
4. A submit button is `<Button busy>Save</Button>` while the request runs.
5. The user switches from Praxis Material to Praxis Carbon: the bar becomes
   square and thicker, the skeleton shimmers instead of standing still, and
   nothing in the app changed.

## Acceptance Criteria

- [ ] **US-021-AC1** — Given `<ProgressBar label value max>`, when it renders, then it is a `progressbar` named by its visible label with `aria-valuemin`, `aria-valuemax` and `aria-valuenow` (clamped to the range) and its fill covers that share of the track; `valueText` replaces the spoken value.
- [ ] **US-021-AC2** — Given a `ProgressBar` without `value`, when it renders, then it is indeterminate: no `aria-valuenow`, and a moving fill.
- [ ] **US-021-AC3** — Given `<Spinner>`, when it renders, then it is a `status` that says its label (default "Loading"), hidden visually unless `showLabel`, in one of three sizes; the drawing itself is hidden from assistive technology.
- [ ] **US-021-AC4** — Given `<Skeleton>`, when it renders, then it is hidden from assistive technology and draws the asked shape: text lines (the last shorter), a block of a given size, or a circle.
- [ ] **US-021-AC5** — Given `<Button busy>`, when it renders, then it shows a spinner, keeps its label and width, sets `aria-busy` and `aria-disabled`, and ignores clicks until `busy` is false.
- [ ] **US-021-AC6** — Given each shared design system, when its theme is active, then the widgets take their thickness, corners and track from its tokens (Material 4px rounded, Carbon square, Fluent 2px, Databricks 8px rounded), and a theme with its own anatomy gets working defaults.
- [ ] **US-021-AC7** — Given a user who asks for reduced motion, when the widgets render, then the indeterminate bar and the skeleton stand still and the spinner turns slowly.
- [ ] **US-021-AC8** — Given the catalogue, the agent guidance and the builder's preview, when they are generated or opened, then they include the loading widgets.

## Edge Cases

- `value` above `max` or below 0 is clamped; `max` of 0 or less counts as 100.
- A busy button that is also `disabled` stays disabled after `busy` ends.
- `onClick` of a busy button is not called, keyboard or pointer.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Determinate | US-021-AC1 | `value={150} max={200}` | Render | `aria-valuenow` 150, fill 75% |
| Indeterminate | US-021-AC2 | No value | Render | No `aria-valuenow`; animated |
| Spinner | US-021-AC3 | `label="Saving" size="lg"` | Render | `role=status`, text "Saving" |
| Skeleton | US-021-AC4 | `lines={3}` | Render | Three bars, `aria-hidden` |
| Busy | US-021-AC5 | `busy` | Click | No `onClick` call |
| Anatomy | US-021-AC6 | Each praxis-* theme, databricks, praxis | Measure the bar | Heights and radii as the system sets |
| Reduced motion | US-021-AC7 | `prefers-reduced-motion: reduce` | Render | No animation on bar or skeleton; slower spinner |

## Dependencies

- **Feature Spec**: FEAT-004
- **Contract**: CONTRACT-001 (the new `progress.*`, `spinner.*`, `skeleton.*` tokens)

## Out of Scope

- Step indicators (Carbon ProgressIndicator, Material steppers) and circular
  determinate progress.
