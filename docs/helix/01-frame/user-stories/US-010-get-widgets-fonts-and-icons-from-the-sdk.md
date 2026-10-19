---
ddx:
  id: US-010
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-004
    - kind: informed_by
      to: ADR-017
    - kind: informed_by
      to: ADR-016
---

# US-010: Get widgets, fonts and icons from the SDK, with nothing copied

**Feature**: FEAT-004 — App SDK
**Feature Requirements**: SDK-01, SDK-02, SDK-03, SDK-15, SDK-16
**PRD Requirements**: FR-17
**Priority**: P0 (widgets, fonts) / P1 (icons)
**Status**: Draft

## Story

**As an** app developer
**I want** every widget, font, icon and logo my app shows to come from SDK packages and follow the active theme
**So that** changing theme changes everything, and no presentation file in my app can drift

## Context

On 2026-10-05 a client app switched theme and its widgets stayed the same:
they were the app's own copies, not the SDK's. Fonts are loaded today by each
app (and by the gallery and Storybook from Google Fonts), and there are no
icons. Each design system has its own face and icon set; a theme without a
set of its own (praxis, plain, synaptiq, databricks) uses Lucide
(operator, 2026-10-06).

## Walkthrough

1. The developer installs `@ux-builder/tokens` and `@ux-builder/ui` and imports
   their CSS once, including the SDK's font CSS.
2. They render `<Button>`, `<TextField>`, `<Icon name="warning" />`.
3. With `data-theme="praxis-carbon"`, the widgets take Carbon's anatomy,
   the text is IBM Plex Sans served by the SDK, and the icon is Carbon's.
4. They switch to `praxis-material`: Roboto and Material Symbols, with no
   app change.

## Acceptance Criteria

- [ ] **US-010-AC1** — Given an app that imports only SDK packages, when it renders the shipped widgets under any theme, then every widget's appearance comes from the SDK's CSS and the theme's tokens, with no presentation file in the app.
- [ ] **US-010-AC2** — Given a theme whose design system ships open-licensed default fonts, when the app imports the SDK's font CSS, then those fonts load from the SDK package with `font-display: swap`, and no request goes to a third-party font host.
- [ ] **US-010-AC3** — Given a brand font override, when the theme is applied, then it loads according to its declared source (bundled, google, client-hosted, system; ADR-017).
- [ ] **US-010-AC4** — Given every bundled font file, when the package is built, then an OFL-1.1 or Apache-2.0 licence file sits beside it.
- [ ] **US-010-AC5** — Given `<Icon name="warning" />`, when the active theme is on Material, Fluent or Carbon, then that design system's glyph is drawn; on any other theme, Lucide's.
- [ ] **US-010-AC6** — Given a shared icon name a set lacks, when it is rendered, then the Lucide glyph is drawn instead, never nothing.
- [ ] **US-010-AC7** — Given each icon set, when the SDK is released, then its licence is recorded with it.
- [ ] **US-010-AC8** — Given `<Logo />` under a theme whose brand has artwork, when rendered, then the brand's artwork is drawn at the brand's height and aspect, the dark-background artwork in dark, and switching theme switches it.
- [ ] **US-010-AC9** — Given a brand without artwork, when `<Logo />` renders, then the brand's title is drawn as a wordmark in its logo colour (`variant="mark"`: its initial), and the logo is one image named by the brand's title.
- [ ] **US-010-AC13** — Given `@ux-builder/ui/icons`, when an app imports an icon (e.g. `iconPin`) and passes it to `<Icon icon>` or registers it for `<Icon name>`, then it draws in the theme's set where that set has a matching glyph and in Lucide's otherwise; every Lucide icon is available, and the app's bundle carries only the icons it imports.
- [ ] **US-010-AC14** — Given an icon the library lacks, when the app registers its own `{ name, glyphs }`, then it draws through `Icon` with the same size, colour and labelling; markup with scripts, handlers or links is refused.
- [ ] **US-010-AC10** — Given an embedded view (a `ThemeProvider` given `tokens`), when `<Logo />` renders, then it draws nothing (CONTRACT-001).
- [ ] **US-010-AC11** — Given an app's top-level `ThemeProvider` (or `<Favicon />` with `data-theme` on `<html>`), when the theme or appearance changes, then the page's icon is that theme's favicon, as an absolute URL that loads.
- [ ] **US-010-AC12** — Given a theme without a favicon, an embedded view, a nested provider, or `favicon={false}`, when it renders, then the SDK sets no icon and the app's own icon stays.

## Edge Cases

- **A font fails to load**: text uses the stack's fallback; layout does not break.
- **Licensed brand fonts** (not redistributable): never bundled; loaded from the client's host (ADR-017).
- **An unknown icon name**: a development warning, and nothing drawn in production.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| No copied files | US-010-AC1 | Starter app | Search app for `.css` with literal values | None |
| SDK fonts | US-010-AC2 | Gallery and Storybook | Build; search for `fonts.googleapis.com` | None for SDK-shipped faces |
| Brand font source | US-010-AC3 | Synaptiq (google) and a client-hosted fixture | Apply theme | Stylesheet from the declared place |
| Licences | US-010-AC4 | Built font package | Test | Licence beside each file |
| Icon per system | US-010-AC5 | `warning` under each theme | Render | Expected set's glyph |
| Fallback | US-010-AC6 | A name only Lucide has | Render under Carbon | Lucide glyph |
| Logo artwork | US-010-AC8 | `praxis` light, dark; `praxis-carbon` | Render `<Logo />` in Chromium | Praxis artwork for each appearance |
| Logo wordmark | US-010-AC9 | `databricks`, `plain` | Render `<Logo />` | Brand title in the logo colour |
| Embedded | US-010-AC10 | `ThemeProvider tokens` | Render `<Logo />` | Nothing |
| Favicon | US-010-AC11 | `praxis` → `databricks` → `praxis` | Switch theme | Praxis mark, then the app's icon, then the mark |
| No favicon | US-010-AC12 | Embedded, nested, `favicon={false}` | Render | No SDK icon link |

## Dependencies

- **Feature Spec**: FEAT-004
- **PRD Requirements**: FR-17
- **External**: ADR-017 (font sources and licences); beads `de767dc0` (fonts), `d86a54c5` (icons)

## Out of Scope

- New widgets (admitted by need, ADR-011).
- Fonts that cannot be redistributed (Segoe UI ships with Windows and is not served).
