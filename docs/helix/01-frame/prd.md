---
ddx:
  id: prd
  type: prd
  status: draft
  links:
    - kind: informed_by
      to: product-vision
    - kind: informed_by
      to: ADR-011
    - kind: informs
      to: FEAT-001
    - kind: informs
      to: FEAT-002
    - kind: informs
      to: FEAT-003
    - kind: informs
      to: FEAT-004
    - kind: informs
      to: FEAT-005
    - kind: informs
      to: FEAT-006
    - kind: informed_by
      to: ADR-020
    - kind: informed_by
      to: ADR-021
    - kind: informed_by
      to: ADR-022
    - kind: informs
      to: concerns
kind: product
---

# Product Requirements Document — AI-UI SDK

> Framed 2026-10-05 from a design conversation with the operator; evolved
> 2026-10-06 to the decisions recorded in ADR-018 and ADR-019 and the approved
> builder prototype (AR-2026-10-06-repo). Evidence for the current state:
> `@ux-builder/tokens` 1.0.0, `@ux-builder/ui` 0.2.0, `@ux-builder/create-app` 0.2.0
> and `@ux-builder/mcp` 0.2.0 as released from this repository (`tokens/`,
> `packages/`, `apps/`, `tools/`). The product vision
> (`docs/helix/00-discover/product-vision.md`, 2026-10-06) sets the direction
> this PRD serves. Evolved 2026-10-18 for screen patterns (ADR-020, ADR-021,
> ADR-022; `00-discover/screen-pattern-inventory.md`): FR-2, FR-14 and FR-21
> amended, FR-25 to FR-27 added, P0-6 added, the component non-goal reworded.
> Evolved 2026-10-19 with ADR-023 and FEAT-007 (generative UI): FR-28 to
> FR-31 added.

## Summary

The AI-UI SDK is the single source of the presentation layer for apps built on it — by Synaptiq and its clients first, and by anyone who
installs it from the npm registry. It does three things:

1. **Owns the design system.** Tokens, widgets, screen patterns, fonts and
   icons ship as versioned packages, so no app hard-codes a colour, a widget,
   a screen layout or a typeface.
2. **Turns a logo into a theme.** A guided theme builder extracts colours
   from a client's logo, offers several accessible palette options, takes
   plain-language feedback, regenerates, shows each palette on the shared
   design systems, and saves the chosen combination as a brand file and a
   theme file for code review.
3. **Starts new apps.** A React-first SDK — theme provider, starter template,
   lint rule and guidance for AI coding agents — so a new app is on the design
   system from its first commit.

A **theme** is what an app selects (ADR-018): a **brand** (identity: colours,
logo, optional fonts) applied to an **anatomy** (shape, type scale, density,
widget behaviour). The anatomy is either a shared **design system** —
Material 3, Fluent 2, Carbon, Databricks AppKit — or the theme's own, as in
`praxis`, `plain` and `synaptiq`. Any brand works with any shared
design system, and every combination passes the same contrast gate.

Top success metrics: zero hard-coded presentation values in adopting apps;
logo to a theme under review in under 30 minutes; a new app on a themed screen
in under one hour.

## Problem and Goals

### Problem

- **Apps copy and hard-code the presentation layer.** A billing-review app copied four
  theme files byte-for-byte (its ADR-005) and wrote its own table layer. A
  client app that switched themes on 2026-10-05 saw no change in its widgets,
  because its widgets did not read the tokens. Every copy drifts silently with
  the next token change.
- **A new client's brand costs a designer's time and a developer's guesswork.**
  Today a theme is hand-assembled: colours picked by eye, contrast fixed after
  the fact (20 contrast failures were found and fixed by hand on 2026-10-05),
  and the theme hard-wired to one design system in a generator
  (`tools/gen-praxis-*.mjs`). `tools/theme_accent.py` picks one accent from a
  logo; nothing produces a full palette or lets a non-developer choose one.
- **New apps start from nothing.** Each app writes its own theme switching,
  font loading and appearance handling, and AI coding agents generating UI code
  invent colours and components because nothing tells them the design system
  exists.

### Goals

1. Apps built on the SDK take every presentation value — colour, type, shape,
   widget, font, icon — from the SDK, and change look when the theme changes.
2. A person with a client's logo produces a reviewed, accessible brand in one
   sitting, choosing among options rather than specifying colours.
3. Any brand can be shown in any supported design system without new code.
4. A new app, written by a developer or an AI agent, starts on the design
   system rather than adopting it later.

### Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Hard-coded presentation values in an adopting app | 0 literal colours, font families or radii in app CSS/JSX | The SDK lint rule (FEAT-004) run in the app's CI |
| Logo to a theme under review | Median ≤ 30 minutes | Brand builder session timing, first upload to PR opened, over the first 10 brands |
| Palette options accepted without manual hex editing | ≥ 80% of sessions | Brand builder session log: accepted option vs. options with manual overrides |
| Theme combinations passing the contrast gate | 100% of brand × design system × appearance | `npm run contrast` in CI |
| New app to first themed screen | ≤ 1 hour | Timed run of the starter template by a developer new to the SDK |
| Apps copying theme or widget files | 0 | Search of consuming repositories for copied token or widget files |

### Non-Goals

- **Not a general-purpose design system.** It is published openly on the npm
  registry, but it grows by the needs of the apps built on it, not to match a
  catalogue (see the widget and pattern non-goals below).
- **No visual page builder.** The SDK supplies widgets and themes, not a
  drag-and-drop app or layout editor.
- **The brand builder does not design logos** or edit artwork; it reads them.
- **No per-app colour tweaking outside a brand file.** An app that needs a
  different colour changes or adds a brand, so the change is reviewed and
  contrast-checked.
- **Not every component or pattern of Material, Fluent or Carbon.** Widgets
  are admitted by need (ADR-011's admission rule) and screen patterns by
  consumer evidence (ADR-020's rule), not to match another system's catalogue.
- **No configuration-driven screens.** Patterns take the app's content through
  slots; the SDK does not render screens from a schema, fetch data, route or
  decide permissions (ADR-020).
- **No framework other than React in the first release** (ADR-016); the CSS
  stays framework-free so others can follow.

Deferred items are tracked as DDx beads labelled `parking-lot`.

## Users and Scope

### Primary Persona: App developer (Synaptiq, its clients, open-source users)

**Role**: Front-end or full-stack developer building an internal or client app.
**Goals**: Ship screens that look right in every theme without designing them.
**Pain Points**: Copies theme files and re-implements tables and dropdowns;
writes theme switching and font loading per app; finds out about token changes
by visual bugs.

### Secondary Persona: Brand owner

**Role**: Designer, delivery lead or client stakeholder responsible for how a
client's apps look.
**Goals**: Get a client's identity into every app quickly, accessibly and
consistently.
**Pain Points**: Picks colours by eye, then learns they fail contrast; cannot
see a palette on real widgets before a developer builds it; depends on a
developer to try each variation.

### Secondary Persona: AI coding agent

**Role**: Claude or another agent generating app code for a developer.
**Goals**: Produce UI that conforms to the design system.
**Pain Points**: Has no machine-readable statement of the tokens, widgets or
rules, so it invents colours and components.

## Requirements

### Must Have (P0)

1. Themes are composed from a brand and a design system; any brand renders in
   any supported design system and passes the contrast gate.
2. Role-based token names are the public contract before more apps depend on
   the current names.
3. A logo produces several full, accessible palette options for both
   appearances.
4. A guided brand builder takes a person from logo to a saved, reviewable
   theme (brand file and theme file), including feedback-driven regeneration.
5. Widgets, fonts and theme switching ship from the SDK so apps hard-code none
   of them.
6. Screen patterns — layout primitives, navigation, shared regions and the P0
   screens of the inventory — responsive from smartphone to desktop and
   wearing each design system's conventions (FEAT-006; raised by the
   operator, 2026-10-18).

### Should Have (P1)

1. A starter template that scaffolds a new app already on the SDK.
2. A lint rule that flags hard-coded presentation values in app code.
3. Guidance for AI coding agents (instructions and a machine-readable
   description of tokens and widgets).
4. Brand font overrides, with font sourcing and licensing recorded.
5. Icons shipped per design system (raised from P2 by the operator,
   2026-10-06).

### Nice to Have (P2)

1. An MCP server exposing tokens, widgets and brands to agents.
2. A neutral, public package home on the npm registry, with client brands in
   their own packages.

## Functional Requirements

### Subsystem: Theme composition

- **FR-1** — A brand is a file that declares a brand's identity: its palette
  for each appearance, its logo artwork, optional font overrides, and the
  generation settings that produced the palette.
- **FR-2** — A design system declares anatomy only — shape, type scale,
  density, elevation, widget metrics, layout measures and its pattern
  variants — and no brand colours.
- **FR-3** — Any brand combined with any supported design system produces a
  theme for each appearance the brand defines, without code written for that
  combination.
- **FR-4** — Every generated theme passes the contrast gate for every text and
  widget pairing; a combination that fails is not published.
- **FR-5** — Public token names describe roles (ground, surface, text,
  structure, accent, state), not colours; current names keep working as
  aliases for one major version.
- **FR-6** — A brand may override the design system's display, body and mono
  fonts; a font not overridden comes from the design system.
- **FR-7** — Existing themes (`praxis`, `plain`, `praxis-material`,
  `praxis-fluentui`, `praxis-carbon`) are reproduced as brand × design system
  combinations with no visible change.
- **FR-27** — A design system chooses one variant at each screen pattern's
  variant points; a variant changes how a pattern looks, never its content or
  order, and a brand cannot choose variants (ADR-022). *(Added 2026-10-18.)*

### Subsystem: Palette generation

- **FR-8** — Given a logo (SVG or PNG), the SDK identifies the brand colours
  and excludes structural colours (black, white, greys).
- **FR-9** — The SDK generates at least four distinct palette options per
  logo, each complete for light and dark appearances.
- **FR-10** — Every palette option passes the contrast gate before it is
  offered; a colour moved to pass reports how far it moved.
- **FR-11** — Plain-language feedback on an option produces new options that
  reflect the feedback, without the feedback's interpreter choosing final
  colour values.
- **FR-12** — A palette can be regenerated exactly from the settings recorded
  in its brand file.

### Subsystem: Brand builder

- **FR-13** — A guided UI walks a person through creating a theme: upload a
  logo, compare palette options and give feedback, choose design systems,
  compare every combination, then name and save one. The theme takes the
  design system's fonts; brand font overrides (ADR-017) are added in review.
- **FR-14** — Each palette option is previewed on the SDK's real widgets, and
  on its screen patterns at phone and desktop widths, in each chosen design
  system and appearance.
- **FR-15** — The person can regenerate options from feedback, or adjust the
  engine's settings directly, as many times as needed; each round says what
  changed and keeps the current selection.
- **FR-16** — Saving produces a brand file and a theme file and submits them
  for code review (a pull request) rather than publishing them directly.

### Subsystem: App SDK

- **FR-17** — Apps obtain widgets, fonts and theme CSS from SDK packages; no
  presentation file needs copying.
- **FR-18** — The SDK provides a theme provider that sets theme and
  appearance, follows the user's light/dark preference when asked, and lets an
  app switch theme at run time.
- **FR-19** — A starter template creates a new app that renders a themed
  screen using the SDK's widgets, with theme switching working.
- **FR-20** — A lint rule reports hard-coded colours, font families and radii
  in app code.
- **FR-21** — AI coding agents can read what tokens, widgets and screen
  patterns exist and the rules for using them, from instructions shipped with
  the SDK.
- **FR-25** — The SDK provides layout primitives, navigation and menus,
  shared screen regions and screen patterns that apps compose with their own
  content, data and logic (ADR-020). *(Added 2026-10-18.)*
- **FR-26** — Every screen pattern adapts to the width it is given, from 320
  CSS px to wide desktop, and is usable by touch, mouse, keyboard and screen
  reader to WCAG 2.2 AA (ADR-021). *(Added 2026-10-18.)*
- **FR-28** — Every theme styles the generative UI libraries apps use (AI
  Elements, assistant-ui; not CopilotKit) through generated bridge stylesheets
  that pass the contrast gate; no theme names a library (ADR-023).
  *(Added 2026-10-19.)*
- **FR-29** — The SDK provides assistant patterns (conversation, composer,
  streaming, reasoning, tool calls, sources, approvals, artifacts) that meet
  WCAG 2.2 AA, import no AI library, and run on each library's runtime
  through an adapter (ADR-023). *(Added 2026-10-19.)*
- **FR-30** — An agent's generative UI renders only catalogue components
  marked renderable, with validated props; anything else renders a plain
  fallback (ADR-023). *(Added 2026-10-19.)*

### Subsystem: Distribution and tenancy

- **FR-22** — SDK packages are versioned and released with changelogs, and a
  release attaches a gallery of every theme.
- **FR-23** — A client's brand can be kept and released separately from the
  core SDK, so installing one client's brand does not install another's.
- **FR-24** — The SDK can move to a neutral package scope with a documented
  migration for existing consumers.
- **FR-31** — A release is blocked when an SDK package depends on or ships
  third-party code under a licence counsel has not approved, or misses a
  notice that licence requires; every SDK package declares its licence and
  ships its third-party notices; nothing the SDK ships reports usage
  (ADR-023). *(Added 2026-10-19.)*

## Acceptance Test Sketches

| Requirement | Scenario | Input | Expected Output |
|-------------|----------|-------|-----------------|
| P0-1 (FR-3, FR-4) | Combine a brand with every design system | `praxis` brand × {material, fluent, carbon, databricks}, plus its own anatomy | Every combination built dark and light; `npm run contrast` reports 0 failures |
| P0-2 (FR-5) | Consume a role token and an alias | App CSS uses `var(--piq-color-text)` and `var(--ink)` | Both resolve to the same value in every theme |
| P0-3 (FR-9, FR-10) | Generate options from a logo | `navy-wordmark.svg` reference logo | ≥ 4 options, each with light and dark palettes, each passing the gate |
| P0-4 (FR-13–FR-16) | Create a theme end to end | Upload a logo, give feedback "more conservative", pick option 2, pick Carbon and Fluent, choose Carbon light | A brand file and a theme file are saved on a branch and a review PR is opened |
| P0-5 (FR-17, FR-18) | Switch theme in an app | App built from the starter; user picks Carbon dark | Every widget and font changes; no app file was edited |
| P0-6 (FR-25–FR-27) | Build a list, detail and form screen from patterns | Starter app; the collection list, list-with-detail and form patterns with the app's data; Praxis Carbon then Praxis Material; 360 px and 1440 px wide | No app-written layout CSS; phone and desktop layouts per the inventory; each design system's variants; nothing moves on theme switch; the audit reports no errors |

## Technical Context

- **Language/Runtime**: JavaScript (ES modules) on Node 20+. The palette engine
  (`@ux-builder/engine`) replaced `tools/theme_accent.py`, which stays as its
  extraction reference.
- **Key Libraries**: Style Dictionary 5 (token build), React 19 and Vite 8
  (`@ux-builder/ui`), Storybook 10 (workbench), Changesets 3 (releases).
- **Packages**: `@ux-builder/tokens` 1.4.1, `@ux-builder/ui` 0.6.0,
  `@ux-builder/create-app` 0.4.1, `@ux-builder/audit` 0.1.0 and `@ux-builder/mcp`
  0.3.1 on the public npm registry (first released as
  tokens 1.0.0, ui, create-app and mcp 0.2.0); `@ux-builder/engine` and the
  theme builder are private. What a consuming app relies on is CONTRACT-004.
- **Token format**: DTCG JSON (`tokens/`), per ADR-011.
- **Platform Targets**: Evergreen browsers, including container queries for
  screen patterns (ADR-021); the brand builder's themed
  dropdown list needs Chrome 135+ and degrades to the native list elsewhere.
- **AI**: an OpenAI model, via the OpenAI API (ADR-019), interprets brand-builder feedback
  (ADR-014); the builder runs locally with the developer's key (ADR-019).

## Constraints, Assumptions, Dependencies

### Constraints

- **Technical**: Text and widget pairings must clear 4.5:1 (WCAG 2.x AA) in
  every theme; the gate cannot be waived per brand.
- **Business**: The SDK is open source (MIT OR Apache-2.0); nothing
  client-confidential is committed to it, and client brands ship apart from
  the core (FR-23, FR-24).
- **Legal/Compliance**: Brand fonts may be licensed; a font is redistributed
  only where its licence allows (ADR-017). Client logos and brands are client
  property and must not ship in another client's packages (FR-23).

### Assumptions

- Brands are created by developers on a client's behalf before
  clients use the brand builder themselves.
- React remains the only framework required through the first release.

### Dependencies

- The platform and the billing-review app as the first consumers (ADR-011 steps 2
  and 3).
- The OpenAI API for feedback interpretation in the brand builder (ADR-019).
- The public npm registry for distribution.

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Token renaming breaks consumers | Medium | High | Generated aliases for every current name for one major version; consumers' test suites run against the aliased build before removal (ADR-015) |
| Generated palettes are accessible but off-brand | Medium | High | Several strategies per logo, feedback-driven regeneration, side-by-side light and dark previews on real widgets, and code review of the theme PR; the distance each colour moved is reported (FR-10) |
| AI feedback interpretation produces unpredictable results | Medium | Medium | The model only adjusts bounded generation settings; the deterministic engine and the contrast gate decide colours (ADR-014) |
| Brand fonts cannot be redistributed | High | Medium | Brand files record font source; licensed fonts load from the client's own host (ADR-017) |
| Scope grows into a general design system | Medium | Medium | Widget admission by need (ADR-011); pattern admission by consumer evidence (ADR-020); variants limited to token bundles, at most three per point (ADR-022); non-goals above |
| Package scope rename after wide adoption | Medium | High | Decide the neutral home before a second client adopts (FEAT-005) |

## Open Questions

- [x] Product vision — written 2026-10-06 (`docs/helix/00-discover/product-vision.md`), draft for the operator's review
- [x] Where the brand builder runs and who holds the API key — resolved 2026-10-06 (ADR-019): locally from this repository, with the developer's own OpenAI key
- [x] Who approves a generated brand before release — resolved 2026-10-06: no designer sign-off; the theme's pull request goes through the repository's normal code review (FR-16)
- [x] Neutral package scope and repository home — resolved: `@ux-builder/*` on the public npm registry, repository `DocumentDrivenDX/ux-builder` (FEAT-005)
- [x] Is ADR-011 now Accepted? — yes, 2026-10-06, with a note: it is built, `claude-like` is gone, ownership stays with the operator until a harness team exists

## Success Criteria

- An app built on the SDK changes every widget, font and colour when its theme
  changes, with no file copied from this repository.
- A brand owner turns a client logo into a reviewed brand, previewed in at
  least two design systems, in one sitting.
- Every released theme passes the contrast gate.
- A new app built from the starter template, by a developer or an agent,
  ships with zero lint findings for hard-coded presentation values.
