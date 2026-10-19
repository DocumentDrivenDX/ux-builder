---
ddx:
  id: US-011
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-004
    - kind: informed_by
      to: ADR-018
    - kind: informed_by
      to: CONTRACT-003
    - kind: informed_by
      to: ADR-011
---

# US-011: Switch theme and appearance at run time with a provider

**Feature**: FEAT-004 — App SDK
**Feature Requirements**: SDK-04, SDK-05, SDK-06, SDK-07
**PRD Requirements**: FR-18
**Priority**: P0
**Status**: Draft

## Story

**As an** app developer
**I want** one provider that sets the theme and appearance, follows the user's light/dark preference when asked, and switches at run time
**So that** I never write theme switching myself and every app behaves the same way

## Context

CONTRACT-003 selects a theme with `data-theme` and an optional
`data-appearance`. Apps set these by hand today, each differently, and a
system preference read after first paint flashes the wrong appearance.
Embedded views (ADR-011) receive resolved token values instead of CSS
selectors.

## Walkthrough

1. The app wraps its root in `<ThemeProvider theme="databricks" appearance="system">`.
2. Before first paint, `system` resolves to `light` or `dark` from the user's
   preference; the provider's element carries `data-theme` and `data-appearance`.
3. A settings menu calls `setTheme("praxis-carbon")` and `setAppearance("dark")`
   from `useTheme()`; every widget restyles without a reload.
4. When the OS switches to dark while `system` is chosen, the app follows.

## Acceptance Criteria

- [ ] **US-011-AC1** — Given `<ThemeProvider theme="t" appearance="light">`, when it renders, then its element carries `data-theme="t"` and `data-appearance="light"`, and `useTheme()` inside it returns `{ theme: "t", appearance: "light" }`.
- [ ] **US-011-AC2** — Given `appearance="system"`, when it renders, then `useTheme().appearance` is `light` or `dark` (never `system`), matching the user's preference, from the first render.
- [ ] **US-011-AC3** — Given `appearance="system"`, when the user's preference changes, then the appearance follows without a reload.
- [ ] **US-011-AC4** — Given `setTheme` or `setAppearance` from `useTheme()`, when called, then the attributes change and the widgets restyle without a reload.
- [ ] **US-011-AC5** — Given nested providers with different themes, when rendered, then each subtree uses its nearest provider.
- [ ] **US-011-AC6** — Given `tokens` (resolved values, ADR-011) instead of a theme name, when rendered, then the values are set as custom properties on the provider's element and no `data-theme` is needed.
- [ ] **US-011-AC7** — Given a theme with only one appearance, when the other is requested, then the theme's own appearance is used and a development warning names it.

## Edge Cases

- **Server rendering**: `system` cannot be known on the server; the provider
  renders the theme's default and a small inline script sets the attribute
  before paint.
- **An unknown theme name**: a development warning; the attributes are still set.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Attributes | US-011-AC1 | Provider, light | Render | Attributes and hook value |
| System | US-011-AC2 | Preference dark | Render with `system` | `dark` on first render |
| Follow | US-011-AC3 | Preference changes | Fire media change | Appearance updates |
| Switch | US-011-AC4 | Call setTheme | Re-render | New attribute; story in Storybook |
| Nesting | US-011-AC5 | Two providers | Render | Inner wins inside |
| Embedded | US-011-AC6 | Resolved JSON | Render | Custom properties set |

## Dependencies

- **Feature Spec**: FEAT-004
- **PRD Requirements**: FR-18
- **External**: CONTRACT-003 (attributes), ADR-011 (embedded views); bead `adb8be2c`

## Out of Scope

- Persisting the user's choice (the app decides where).
