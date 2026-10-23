---
ddx:
  id: FEAT-004
  type: feature-specification
  status: draft
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: FEAT-001
    - kind: informed_by
      to: ADR-011
    - kind: informed_by
      to: ADR-016
    - kind: informed_by
      to: ADR-017
    - kind: informs
      to: FEAT-006
---

# Feature Specification: FEAT-004 — App SDK

**Feature ID**: FEAT-004
**Status**: Specified
**Priority**: P0 (shipping widgets, fonts, theme provider) / P1 (starter, lint, agent guidance, icons) / P2 (MCP server)
**Owner**: Operator (until a design-system owner is named)
**Covered PRD Subsystem(s)**: App SDK
**Covered PRD Requirements**: FR-17, FR-18, FR-19, FR-20, FR-21
**Cross-Subsystem Rationale**: None — single subsystem.

## Overview

Everything an app needs to be on the design system from its first commit:
widgets, fonts and icons shipped as packages, a theme provider, a starter
template, a lint rule against hard-coded presentation values, and guidance
for AI coding agents (PRD P0-5, P1-1 to P1-3), and an audit of the running
app. First shipped in `@ux-builder/ui` 0.2.0, `@ux-builder/tokens` 1.0.0,
`@ux-builder/create-app` 0.2.0 and `@ux-builder/mcp` 0.2.0; the current surface
(`@ux-builder/ui` 0.9.0, `@ux-builder/tokens` 1.7.0, `@ux-builder/create-app` 0.7.0,
`@ux-builder/audit` 0.4.0, `@ux-builder/mcp` 0.6.0) is CONTRACT-004, with the
episode trace (`@ux-builder/trace` 0.1.0) in CONTRACT-007, and the
repository README's *Using the SDK in an app* walks a client team through it.

## Ideal Future State

A developer, or an agent working for one, starts a new app from the starter
template and has a themed screen running within the hour: widgets from the
SDK, fonts loaded by the SDK, a theme switcher that follows the user's
light/dark preference. The lint rule fails the build on a hard-coded colour.
An AI agent asked to "add a filter bar" reads the SDK's guidance and uses
`ChoicePicker` and role tokens instead of inventing a component.

## Problem Statement

- **Current situation**: `@ux-builder/ui` ships widgets and CSS; apps load fonts
  themselves (Roboto, IBM Plex), write their own theme switching, and have
  nothing that stops hard-coded values. Agents have no guidance.
- **Pain points**: A client app's widgets ignored its theme (2026-10-05)
  because they were not the SDK's; every app re-implements setup.
- **Desired outcome**: New apps conform by default; drift is caught in CI.

## Functional Areas

| Area | User question or job | Feature responsibility |
|------|----------------------|------------------------|
| Packages | "Where do widgets and fonts come from?" | Ship widgets (including loading widgets), fonts, icons, the logo and favicon; nothing copied |
| Theme provider | "How do I switch theme?" | Set theme and appearance; follow system preference |
| Starter | "How do I start a new app?" | Scaffold an app already on the SDK |
| Lint | "Did I hard-code something?" | Report hard-coded presentation values, other UI kits and hand-drawn SVG in source |
| Audit | "Does the running app follow every theme?" | Drive the app through every theme and appearance and report what is not the theme's |
| Agent guidance | "How should an agent build UI here?" | Instructions and a machine-readable catalogue |

## Requirements

### Functional Requirements by Area

#### Packages

SDK-01. Widgets, their CSS and theme CSS install from SDK packages; no
presentation file needs copying (FR-17).
SDK-02. The SDK ships each design system's default fonts, and loads a brand's
font overrides according to their declared source (ADR-017).
SDK-03. (P1, raised 2026-10-06) The SDK ships an icon set per design system,
chosen by the active theme, behind one icon component with shared names:
Material Symbols (Apache-2.0) for Material, Fluent UI System Icons (MIT) for
Fluent, Carbon Icons (Apache-2.0) for Carbon, and one neutral set, Lucide
(ISC), for every theme without a set of its own: Praxis and Plain
(operator, 2026-10-06), and since then Synaptiq and Databricks (AppKit UI
itself uses Lucide). Every set's
licence is recorded, as ADR-017 does for fonts. *[Amended 2026-10-07,
operator]* Beyond the shared names, the SDK ships every icon of the neutral
set (Lucide, 2,130) by its Lucide name, each with the Material, Fluent and
Carbon glyph where one matches (found by name, word synonyms and hand-checked
overrides; Lucide's otherwise), as one export per icon so an app bundles only
those it uses; and a way to register an app's own icon so it draws through
the same component. A client app had hand-drawn play, pin and paperclip
because the 33 shared names lacked them.
SDK-15. (Added 2026-10-07, operator) One logo component draws the active
theme's brand artwork (logo or mark) from its brand tokens, so the logo
changes with the theme and appearance; a brand without artwork shows its
title as a wordmark in its logo colour. It draws nothing in an embedded view,
which must not draw the brand (CONTRACT-001, ADR-011).
SDK-16. (Added 2026-10-07, operator) The page's favicon follows the active
theme's brand (`brand.favicon`): the top-level theme provider sets it, and a
component does so for an app that selects its theme by attribute. A theme
without a favicon leaves the app's own; an embedded view never changes it.

SDK-17. (Added 2026-10-08, operator) The SDK ships the loading and progress
widgets every shared design system has: a progress bar (determinate, or
indeterminate when the amount is unknown), a spinner (three sizes, alone or
beside a visible label), skeleton placeholders (text lines, blocks, circles)
and a busy state on the button. Each takes its thickness, corners, track and
motion from the design system (Material's 4px rounded bar, Carbon's square
bar and shimmer, Fluent's 2px bar and wave, Databricks's 8px rounded bar and
pulse) through optional component tokens, so a theme without them still gets
a working default; each names its state to assistive technology, and each
stops its motion, or slows a spinner, when the user asks for reduced motion.
Before this, an app had to bring a design system's own library, which does not
follow the theme, or draw its own.

SDK-18. (Added 2026-10-08, operator) A tool audits a running app's use of
the theme: it switches the app through every theme and appearance it ships,
as a user would, and reports what is not the theme's (colours, fonts and
radii that are no token, stylesheets that set tokens or restyle SDK widgets),
what the app draws that the SDK provides (icons, the logo, loaders, controls)
or takes from another UI kit, a favicon that does not follow the theme, and
text contrast, as a report with screenshots and an exit code for CI. The lint
rule gains two checks that need no running app: imports of other UI kits and
icon sets, and hand-drawn `<svg>` in JSX. The starter runs both in CI. Lint
alone missed what a client shipped (hand-drawn icons); a manual review by an
agent found it but is neither repeatable nor cheap enough to gate on.
SDK-20. *(Added 2026-10-19, operator)* The audit runs at chosen widths
(`--width`, repeatable), so a page is checked at one width per size class; it
adds checks for horizontal page scroll at 320 px (reflow, WCAG 1.4.10),
pointer targets below the minimum target size (WCAG 2.5.8) and focused
elements covered by sticky content (WCAG 2.4.11); and it attributes a finding
inside a builder preview to that preview's option and design system
(`data-preview`).

#### Theme provider

SDK-04. A provider sets the active theme and appearance for its subtree and
exposes them to components (FR-18).
SDK-05. Appearance can be `light`, `dark`, or follow the user's system
preference, resolved to `light` or `dark` before it reaches any component.
SDK-06. Changing theme or appearance at run time restyles every SDK widget
without a reload.
SDK-07. The provider supports both deliveries: theme CSS with attributes, and
resolved token values for an embedded view (ADR-011).

#### Starter

SDK-08. A starter template creates a React app with the SDK installed, a
themed page using SDK widgets, and a working theme switcher (FR-19).
SDK-09. The generated app passes the lint rule with zero findings.

#### Lint

SDK-10. A lint rule reports literal colours, font families and radii in app
CSS and JSX, naming the role token to use where one fits (FR-20).
SDK-11. The rule can be run in CI and supports a reviewed allow-list for
exceptions.

#### Agent guidance

SDK-12. The SDK ships instructions an AI coding agent loads (a skill or
equivalent) naming the tokens, widgets and usage rules (FR-21).
SDK-13. The SDK ships a machine-readable catalogue of tokens and widgets
(names, properties, purpose), generated from the source so it cannot drift.
*(Amended 2026-10-18)* It also lists screen patterns and variants (FEAT-006
AGT-01).
SDK-19. *(Added 2026-10-18, FEAT-006)* The SDK ships the basic widgets screen
patterns need — tabs, dialog, sheet, menu button, breadcrumbs, combobox, date
and date-range pickers, tooltip and pagination — each with the keyboard and
ARIA behaviour of its WAI-ARIA Authoring Practices pattern (FR-17;
CONTRACT-004 *Screen patterns*).
SDK-14. (P2) An MCP server exposes the catalogue and brands to agents.

### Non-Functional Requirements

- **Performance**: The theme provider adds ≤ 1 ms to a theme switch beyond the
  browser's restyle; SDK fonts use `font-display: swap`.
- **Security**: The starter template ships no secrets and pins SDK versions.
- **Scalability**: N/A.
- **Reliability**: The catalogue is generated in CI; a stale catalogue fails
  the build.

## User Stories

- [US-010 — Get widgets, fonts and icons from the SDK, with nothing copied](../user-stories/US-010-get-widgets-fonts-and-icons-from-the-sdk.md) (Packages: SDK-01–03, FR-17)
- [US-021 — Show work in progress with the SDK's loading widgets](../user-stories/US-021-show-work-in-progress.md) (Loading: SDK-17, FR-17)
- [US-022 — Audit an app's use of the theme](../user-stories/US-022-audit-an-apps-use-of-the-theme.md) (Audit: SDK-18, SDK-10, FR-17)
- [US-011 — Switch theme and appearance at run time with a provider](../user-stories/US-011-switch-theme-and-appearance-at-run-time.md) (Theme provider: SDK-04–07, FR-18)
- [US-012 — Start a new app that is on the design system from its first commit](../user-stories/US-012-start-a-new-app-from-the-starter.md) (Starter: SDK-08–09, FR-19)
- [US-013 — Catch hard-coded colours, fonts and radii before they ship](../user-stories/US-013-catch-hard-coded-presentation-values.md) (Lint: SDK-10–11, FR-20)
- [US-014 — AI coding agents build UI from the SDK, not from invention](../user-stories/US-014-agents-build-ui-from-the-sdk.md) (Agent guidance: SDK-12–14, FR-21)
- [US-033 — Choose from a long list, and read a tooltip](../user-stories/US-033-choose-from-a-long-list-and-read-a-tooltip.md) (SDK-19: Combobox and Tooltip)
- [US-034 — Audit every size class](../user-stories/US-034-audit-every-size-class.md) (SDK-20, FR-26)
- SDK-19's widgets are exercised through the FEAT-006 stories that use them: menu button, breadcrumbs and the workspace switcher's search (combobox) in US-024, pagination and sheet in US-025, tabs in US-026, dialog and sheet in US-027, the date range in US-028; Combobox and Tooltip have their own story, US-033

## Edge Cases and Error Handling

- **A font fails to load**: text renders in the stack's fallback; no layout
  breaks.
- **An app renders before the provider resolves appearance**: no flash of the
  wrong appearance (resolve before first paint).
- **An app nests providers with different themes**: the nearest provider wins
  for its subtree.
- **A legitimate literal colour** (for example a chart series): allowed via the
  reviewed allow-list (SDK-11).
- **A provider inside an element that already has `data-theme`** (the
  starter's `<html>`): the inner theme shows none of the outer theme's tokens
  (CONTRACT-003, unset tokens).
- **An app without a top-level provider is audited**: the audit sets the
  attributes itself, says so, and skips the favicon checks (SDK-18).
- **A chart or third-party embed the audit should not judge**:
  `data-audit-ignore` on its root.

## Success Metrics

- New app to first themed screen ≤ 1 hour (PRD metric).
- 0 hard-coded presentation values in adopting apps (PRD metric).
- Agent-generated UI in a test task uses SDK widgets and role tokens in ≥ 90%
  of components (graded sample).

## Constraints and Assumptions

- React 19 only for the first release; widget CSS remains framework-free
  (ADR-016).
- The current widgets (Button, TextField, TextArea, Select, Checkbox, Switch,
  RadioGroup, ChoicePicker, Card, Notice, StatusPill, DataTable, Toast, and
  since SDK-17 ProgressBar, Spinner and Skeleton) are in scope as shipped;
  new widgets are admitted by need (ADR-011).
- Consumers install from the public npm registry with no token or scope
  registry configuration (FEAT-005; CONTRACT-004, Registry and access).

## Dependencies

- **Other features**: FEAT-001 (role tokens, brand fonts), FEAT-005 (registry and releases).
- **Contracts**: CONTRACT-001 (token names), CONTRACT-003 (theme selection), CONTRACT-004 (app integration: entry points, provider API, the theme switch event, lint rules, audit command).
- **External services**: the public npm registry for distribution.
- **PRD requirements**: P0-5, P1-1, P1-2, P1-3, P1-5, P2-1.

## Out of Scope

- Frameworks other than React (ADR-016).
- Page layouts or app-specific screens.
- Creating brands (FEAT-003).
