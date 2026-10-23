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
      to: FEAT-008
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
    - kind: informs
      to: FEAT-017
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
> FR-31 added. Evolved 2026-10-20 with ADR-025 and FEAT-008 (interaction and
> information architecture): the "Interaction and information architecture"
> subsystem, FR-32 to FR-36, P1-6 and the P1-6 acceptance sketch added.
> Evolved 2026-10-20 with ADR-026 and FEAT-009 (HELIX-aware UX assessment,
> from the planning brief of that date): the "UX assessment" subsystem,
> FR-37 to FR-42, P1-7 and the P1-7 acceptance sketch added. Evolved
> 2026-10-21 with ADR-027 and FEAT-010 (the starter on HELIX): FR-43 to
> FR-45 under the App SDK, P1-8 and its sketch added. Evolved 2026-10-21
> with ADR-028 and FEAT-011 (AI and agent experience rules, at the operator's
> request): the "AI and agent experience" subsystem, FR-46 to FR-50, P1-9 and
> its sketch added; FR-51 and FR-52 (Adaptive Cards, ADR-029) the same day.
> Evolved 2026-10-21 with ADR-030 and FEAT-012 (screen flows and user journeys
> in the blueprint): FR-53 to FR-56 under Interaction and information
> architecture, and P2-3.
> Evolved 2026-10-21 with ADR-031 and FEAT-013 (annotated journey walkthrough
> videos, at the operator's request): FR-57 to FR-59 under UX assessment, and
> P2-4. Evolved 2026-10-21 with ADR-032, ADR-033, FEAT-014 and FEAT-015 (the
> operator's review of a new app and its audit): the "App modalities" subsystem
> (FR-60 to FR-63), FR-64 to FR-66 under UX assessment, and P1-10.
> Evolved 2026-10-22 with ADR-035 and FEAT-016 (the operator: the full train of
> thought from the app back to ux-builder, so we can learn from it and
> optimize): the "Learning from builds" subsystem (FR-67 to FR-72) and P1-11.
> Evolved 2026-10-22 with FEAT-017 (diagram and data-visualization tokens,
> milestone M2 of the operator's visuals PRD, `~/Documents/visuals/PRD.md`
> §6.5): FR-73 and FR-74 under Theme composition, P1-12 and its sketch.

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
6. Interaction and information-architecture rules, cited from Apple's Human
   Interface Guidelines, Material 3 and W3C guidance, applied to a blueprint
   before code and by the audit after, for new and existing apps and for
   embedded views (operator, 2026-10-20; FR-32 to FR-36, FEAT-008).
7. A repeatable UX assessment of a HELIX-governed app: its journeys traced
   to its HELIX documents and tests, a baseline, walkthroughs whose screens
   the audit inspects in place, and ranked, evidence-backed recommendations
   with proposed HELIX changes (operator, 2026-10-20; FR-37 to FR-42,
   FEAT-009). Increment 1 (context, traceability, baseline, same-state
   inspection) is P1; walkthroughs and proposals follow.
8. A new app starts on the latest HELIX: the starter installs HELIX's skill
   and catalogue and drafts the app's HELIX documents from HELIX's templates
   (operator, 2026-10-21; FR-43 to FR-45, FEAT-010).
9. AI and agent experience rules: what generative features, assistants,
   agents that act for the user, and embedded agent views must do, cited
   from Microsoft's agent guidance and HAX guidelines, Google PAIR, Apple's
   generative AI guidance and Cheng et al. (IUI '26); applied by a screen's
   declared AI role in the blueprint, in marked markup by the audit, in the
   lint, and in the UX assessment; Adaptive Cards rendered with the SDK's
   components and checked by the card rules (operator, 2026-10-21; FR-46 to
   FR-52, FEAT-011, ADR-029).
10. Modalities and findings people can act on (operator, 2026-10-21,
    after creating and auditing an app):
    - A new app is created for the modalities chosen: a responsive
      mobile and desktop web app, a chat app, or a hybrid chat app with
      Adaptive Cards. It starts as an empty shell for those modalities,
      with no sample domain. Native iOS, Android, macOS and Windows apps
      are future.
    - The modalities choose the components, rules and audit.
    - Every finding, in the audit report, the assessment report and the
      walkthrough video, is grouped by journey and step, and names the
      rule it breaks in full with its source and fix.
    - The audit gives a verdict on the theme and on the modality fit.
    - The usability report is a HELIX artifact, and ux-builder drafts
      HELIX's UX artifacts.

    (FR-60 to FR-66, FEAT-014, FEAT-015, ADR-032, ADR-033.)
11. Learning from builds (operator, 2026-10-22: "having the full train of
    thought from the app back to the ux-builder ... we can learn from it and
    optimize"):
    - Creating an app, or changing an app's UI or UX, leaves a full trail
      committed in the app: the goal, what ux-builder told the agent, every
      check and how many tries it took, the agent's decisions and its full
      transcript, the change and the outcome.
    - An owner exports it by choice, and ux-builder learns from the
      exports of every app (its own, Synaptiq's and clients') to improve
      its guidance, rules, components, checks and starter.

    (FR-67 to FR-72, FEAT-016, ADR-035.)
12. Diagram and data-visualization tokens in every theme: status colours,
    a fixed categorical series, region tints, edge weights, lifecycle tints,
    and each design system's diagram stroke and node radius, all
    contrast-checked and shown on each theme's page, so the visuals library
    planned across DocumentDrivenDX (`@ux-builder/visuals`) draws in the
    theme with no colour of its own (operator, 2026-10-22; FR-73, FR-74,
    FEAT-017).

### Nice to Have (P2)

1. An MCP server exposing tokens, widgets and brands to agents.
2. A neutral, public package home on the npm registry, with client brands in
   their own packages.
3. Screen flows and user journeys in the blueprint, checked, and used to
   draft HELIX content and draw flows and wireframes (operator, 2026-10-21;
   FR-53 to FR-56, FEAT-012). The flow and journey fields and their checks
   come first; drafting and drawing follow.
4. An annotated MP4 per journey from each UX assessment, and an
   interactive HTML player of the same journeys with the findings as
   pop-ups, for the product or technical leader who owns the app: the
   walked journeys replayed, with each finding's problem and recommendation
   in plain English where a user meets it (operator, 2026-10-21; FR-57 to
   FR-59, FEAT-013, ADR-031).

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
- **FR-73** — Every theme, in every appearance, carries the roles diagrams
  and charts draw with: four status colours (positive, caution, negative,
  info), each with a subtle fill; eight categorical series colours in a
  fixed, colour-vision-safe order; three region tints; three edge weights;
  three lifecycle tints for parts not yet built; and, from its design
  system, a diagram stroke, a strong stroke and a node radius. A brand may
  override the status and series colours and need not set any of them.
  *(Added 2026-10-22, FEAT-017.)*
- **FR-74** — The contrast gate checks the FR-73 roles in every theme,
  appearance and preview pair: text on the status, region and lifecycle
  fills and status colours used as text clear 4.5:1; series colours and
  edges clear 3:1 against the ground and surface; neighbouring series stay
  distinguishable under protanopia and deuteranopia. A theme that fails is
  not published. *(Added 2026-10-22, FEAT-017.)*

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

- **FR-43** — A new app gets the HELIX release that is latest when it is
  created, verified and installed into the app as a project skill with its
  catalogue and provenance; offline, it gets the HELIX bundled with the
  starter, and a version can be pinned or HELIX left out (ADR-027).
  *(Added 2026-10-21.)*
- **FR-44** — A new app's HELIX documents (vision, PRD, concerns, a feature
  and story for the starter screen, the design system, the test plans) are
  drafted from the installed HELIX's templates, with the starter's facts
  filled in and the owner's decisions left as placeholders.
  *(Added 2026-10-21.)*
- **FR-45** — A new app's documents pass the assessment's HELIX reading, its
  assessment manifest validates, a test cites its story's criteria, and its
  agent guidance puts HELIX first in the order of work.
  *(Added 2026-10-21.)*

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

### Subsystem: Interaction and information architecture

- **FR-32** — The SDK ships a catalogue of interaction and information
  architecture rules (navigation by size class, panes, modality, feedback,
  loading, states, emphasis, input, line length, embedded views), each with
  an ID, the conditions it applies under (context, size class, input; never
  the device), how it is checked and its sources, and returns the rules that
  apply to a given target (ADR-025). *(Added 2026-10-20.)*
- **FR-33** — An app or view can be planned in a blueprint of its
  destinations, screens, patterns, actions, states and modal tasks, checked
  against the rules before code exists, for a new app (from the starter) and
  for an existing one. *(Added 2026-10-20.)*
- **FR-34** — AI coding agents get the applicable rules, recipes and blueprint
  checks from the installed SDK, over MCP and in the generated guidance, with
  the loop to follow. *(Added 2026-10-20.)*
- **FR-35** — The audit checks a running app's structure and interaction by
  rule ID, and an existing app can adopt new checks against a baseline of its
  current findings. *(Added 2026-10-20.)*
- **FR-36** — Every rule cites its source, and no rule reproduces a source
  whose licence does not allow it; a release is blocked otherwise.
  *(Added 2026-10-20.)*
- **FR-53** — A blueprint can describe the screen flow: each screen's actions
  and where each leads (another screen, a modal, back, a state, or out of
  the app). It is checked for unreachable screens, dead ends and actions
  that lead nowhere (ADR-030). *(Added 2026-10-21.)*
- **FR-54** — A blueprint can describe user journeys, each tied to a HELIX
  story and its acceptance criteria, as steps through screens, actions and
  states with alternates. It is checked against the flow and against the
  safeguard and approval rules. *(Added 2026-10-21.)*
- **FR-55** — The UX assessment's manifest references blueprint journeys
  instead of restating them, so a journey is defined once.
  *(Added 2026-10-21.)*
- **FR-56** — From a blueprint, the SDK drafts HELIX content as proposals a
  person accepts, never applied silently: story walkthroughs, a solution
  design's flow diagram, architecture's data flow, the design system's
  navigation table and story test plan scenarios. It also draws an IA map,
  screen flows and wireframes from the SDK's real patterns. HELIX documents
  stay the authority, and a disagreement is reported, not overwritten.
  *(Added 2026-10-21.)*

### Subsystem: AI and agent experience

- **FR-46** — The rule catalogue covers AI and agent experience. It includes
  AI disclosure and expectations, control and correction of AI output, agent
  plans, approvals, interruption and takeover, explanation and status,
  failure and recovery, privacy and consent, and feedback. Each rule applies
  by the AI role a screen declares (`generative`, `assistant`, `agent`),
  alone or with the existing context, size class and input; never by
  product or device. Each rule is cited and paraphrased (ADR-028).
  *(Added 2026-10-21.)*
- **FR-47** — A blueprint declares each screen's AI role: whether it acts
  for the user, the patterns it may render inline, its high-impact actions
  with their approval, and whether data leaves the device. It is checked
  against the AI rules before code exists, including a chat that renders
  SDK patterns inline. *(Added 2026-10-21.)*
- **FR-48** — AI-generated content, agent status, plans and approvals are
  marked in the markup the SDK's components emit, and apps can mark their
  own. The audit checks marked content against the AI rules, and reports AI
  content on a screen whose blueprint declares no AI role.
  *(Added 2026-10-21.)*
- **FR-49** — The lint warns when UI text presents an AI as a person (first-
  person thinking or feeling) or puts the AI, not the user, as the one who
  starts an action. *(Added 2026-10-21.)*
- **FR-50** — The UX assessment evaluates AI journeys against the AI rules
  and heuristics, in normal, error-prone and risky scenarios, and never lets
  an agent under assessment complete an irreversible action.
  *(Added 2026-10-21.)*
- **FR-51** — An app renders Adaptive Cards (open-source schema 1.6) that an
  agent sends, with the SDK's own components in the app's theme, beside
  catalogue components as a second generated-UI format; a card action marked
  high-impact gets an approval first (ADR-029). *(Added 2026-10-21.)*
- **FR-52** — A card payload can be checked against the card rules (actions,
  labels, wrapping, columns, alternative text, tab order, version) before it
  is sent, and a rendered card is audited like any other UI.
  *(Added 2026-10-21.)*

### Subsystem: App modalities

- **FR-60** — A new app is created for one or more modalities. Today these
  are `responsive-web` (a mobile and desktop web app), `chat` (a chat app)
  and `hybrid-chat` (a chat app that renders Adaptive Cards). The starter
  asks for them when it runs in a terminal and takes `--modality` otherwise.
  The choice is recorded in the blueprint. Native iOS, Android, macOS and
  Windows apps are future modalities (ADR-032). *(Added 2026-10-21.)*
- **FR-61** — A new app starts as an empty shell for its modalities, with no
  sample domain or data: an app shell with one empty home screen for
  `responsive-web`, a conversation for `chat`, and a conversation that
  renders cards for `hybrid-chat`. Its HELIX documents describe that shell.
  *(Added 2026-10-21.)*
- **FR-62** — The modalities select what the app is built and checked with:
  its size classes and inputs, its AI roles, the SDK components the guidance
  points to, the rules that apply, and the widths the audit inspects.
  *(Added 2026-10-21.)*
- **FR-63** — The audit gives two verdicts with the evidence behind each:
  - the **theme**: the app wears the theme it declares, on that theme's
    design system, with SDK components only, and its palette passes
    contrast in every appearance;
  - the **modality fit**: the app uses the UI and AI components its
    modalities call for, and the rules for those modalities were applied.

  *(Added 2026-10-21.)*

### Subsystem: UX assessment

- **FR-37** — An app owner commits an assessment manifest that binds the
  app's HELIX marker, flow and artifact catalogue (never restating their
  paths or requirements) and declares how to run the app, its journeys,
  roles, fixtures, tests, limits and restrictions, with credentials only by
  reference; it is proposed from the repository and validated (ADR-026).
  *(Added 2026-10-20.)*
- **FR-38** — A coding agent runs one complete assessment from a companion
  skill and the audit's deterministic commands, without a mandatory MCP
  server, recording stages it could not complete as blocked or partial and
  keeping its judgments apart from deterministic results.
  *(Added 2026-10-20.)*
- **FR-39** — The assessment traces each journey to its HELIX goals,
  stories, acceptance criteria and tests, records HELIX alignment issues,
  and records the app's functional tests and audit as a baseline before
  any change, with SDK adoption gaps apart from usability findings.
  *(Added 2026-10-20.)*
- **FR-40** — Journeys are walked through every applicable state, each
  state's coverage is recorded with no false pass, and the audit's checks
  run on the exact page state a walkthrough reached. *(Added 2026-10-20.)*
- **FR-41** — Findings are deduplicated, mapped to installed SDK components,
  ranked by an explicit rubric with confidence and effort, and turned into
  proposed changes to HELIX artifacts and tests that the assessment never
  applies itself. *(Added 2026-10-20.)*
- **FR-42** — Each run records its inputs and versions and is comparable
  with earlier runs; assessments stay within local or staging environments,
  allowed origins and actions, and keep secrets out of what they write.
  *(Added 2026-10-20.)*
- **FR-57** — The assessment records each walked journey as replayable
  steps and replays the journeys and their alternates, signed in as each
  journey's role, at a human pace, into one video per journey
  (ADR-031). *(Added 2026-10-21.)*
- **FR-58** — The video shows each merged finding at the checkpoint where it
  was found: the elements involved outlined, and the problem and
  recommendation in plain English, labelled as checked or as judgment. It
  shows no finding on a state the replay did not reach, and links to and
  from the report. The same annotations come as an MP4 to share and as an
  interactive HTML player whose pop-ups expand for evidence.
  *(Added 2026-10-21.)*
- **FR-59** — Videos mask what the manifest says to redact from the first
  frame, never show sign-in or secret values, and are written only in the
  run package. *(Added 2026-10-21.)*
- **FR-64** — Every finding names the rule it breaks: its ID, its full
  statement, its source and the recommended fix. This includes theme and
  design-system findings, which are rules in the catalogue too.
  *(Added 2026-10-21.)*
- **FR-65** — The audit report, the assessment report and the walkthrough
  video group findings by user journey, then by step, showing each finding
  where the journey meets it, and fall back to grouping by screen when there
  are no journeys. The video plays at a human pace and spells out each rule.
  *(Added 2026-10-21.)*
- **FR-66** — The assessment's report is a HELIX artifact (a usability
  evaluation report). ux-builder drafts HELIX's UX artifacts from the
  blueprint and the run:
  - user journey maps;
  - screen flows;
  - wireframes;
  - interaction-state diagrams covering every state: ideal, empty,
    loading, partial and error.

  They are drafted as HELIX's own types once HELIX defines them, and from
  ux-builder's drafts until then (ADR-033). *(Added 2026-10-21.)*

### Subsystem: Learning from builds

- **FR-67** — Every app creation and every change to an app's UI or UX is an
  **episode**, with an ID, its goal (the HELIX stories, blueprint screens or
  journeys it serves), its trigger, and the agent and model doing it. The
  commits it makes name it. *(Added 2026-10-22.)*
- **FR-68** — ux-builder's tools record each episode as a trace committed in
  the app: the creation options; every guidance, rule and component answer
  the MCP server gives; every lint, blueprint, card and audit check, failures
  included; the change; and the outcome. *(Added 2026-10-22.)*
- **FR-69** — The agent records its decisions in the trace: what it chose,
  what else it considered, why, and the rule or story it relied on,
  including where it departed from guidance or worked around a missing
  component. *(Added 2026-10-22.)*
- **FR-70** — The agent's full transcript is kept with its episode, with
  secrets masked. *(Added 2026-10-22.)*
- **FR-71** — An owner exports episodes as a bundle: redacted, checked
  against its schema and shown before it is written. ux-builder sends
  nothing itself (ADR-023 rule 8). *(Added 2026-10-22.)*
- **FR-72** — ux-builder learns from exported bundles from any app, its own,
  Synaptiq's and clients'. The bundles are kept in a private learning store,
  never in this repository. Its learning report shows where the guidance,
  rules, components, checks and starter fall short. That becomes beads and
  proposals, and episodes replay as evaluation tasks. Only aggregated
  results with no client content enter this repository. *(Added
  2026-10-22.)*

## Acceptance Test Sketches

| Requirement | Scenario | Input | Expected Output |
|-------------|----------|-------|-----------------|
| P0-1 (FR-3, FR-4) | Combine a brand with every design system | `praxis` brand × {material, fluent, carbon, databricks}, plus its own anatomy | Every combination built dark and light; `npm run contrast` reports 0 failures |
| P0-2 (FR-5) | Consume a role token and an alias | App CSS uses `var(--piq-color-text)` and `var(--ink)` | Both resolve to the same value in every theme |
| P0-3 (FR-9, FR-10) | Generate options from a logo | `navy-wordmark.svg` reference logo | ≥ 4 options, each with light and dark palettes, each passing the gate |
| P0-4 (FR-13–FR-16) | Create a theme end to end | Upload a logo, give feedback "more conservative", pick option 2, pick Carbon and Fluent, choose Carbon light | A brand file and a theme file are saved on a branch and a review PR is opened |
| P0-5 (FR-17, FR-18) | Switch theme in an app | App built from the starter; user picks Carbon dark | Every widget and font changes; no app file was edited |
| P1-6 (FR-32–FR-35) | Plan, check and audit an app | A blueprint with seven destinations at compact, a nested modal and an unguarded delete; the built app with two primary buttons | Three blueprint findings and one audit finding, each with its rule ID and source |
| P1-7 (FR-37–FR-40) | Assess the theme builder, increment 1 | Its manifest; the builder running on the mock model; three checkpoints (a signed-in fixture screen, an open dialog, a form with a validation error and its input kept) | The manifest validates against the repository's HELIX marker and catalogue; every journey traces to its stories, criteria and tests; the baseline records the e2e suite and the audit; each checkpoint is inspected in place with linked findings and the task continues |
| P1-8 (FR-43–FR-45) | Create an app on HELIX | `npm create @ux-builder/app acme` online, then with `--helix-offline` | HELIX installed in `.claude/skills/helix/` with its version recorded; 8 HELIX documents typed and linked, plus `concerns.local.yml`; `assess validate` passes and `assess collect` reports 0 warnings with US-001's criteria explicit |
| P1-9 (FR-46–FR-50) | Plan, check and assess an agent screen | A blueprint with an `agent` screen whose "Submit payment" action has no approval and which renders a `Wizard` inline at a 400 px column; the built screen streaming an unmarked answer with no Stop control; UI copy "I think this is right" | Blueprint findings for the missing approval and for the inline wizard's compact rules; audit findings for the missing disclosure and Stop control; one lint warning; the assessment's risky scenario stops at the approval |
| P1-12 (FR-73, FR-74) | Diagram tokens in every theme | Every theme and preview pair, light and dark; a page drawing a status chip, a series legend, a region with a node, an edge in each weight and the three lifecycle tints with those tokens only | `npm run contrast` reports 0 failures; the audit reports no errors or warnings for that page in every theme and appearance; each theme's page lists every diagram token |
| P0-6 (FR-25–FR-27) | Build a list, detail and form screen from patterns | Starter app; the collection list, list-with-detail and form patterns with the app's data; Praxis Carbon then Praxis Material; 360 px and 1440 px wide | No app-written layout CSS; phone and desktop layouts per the inventory; each design system's variants; nothing moves on theme switch; the audit reports no errors |

## Technical Context

- **Language/Runtime**: JavaScript (ES modules) on Node 20+. The palette engine
  (`@ux-builder/engine`) replaced `tools/theme_accent.py`, which stays as its
  extraction reference.
- **Key Libraries**: a hand-written token build (`packages/tokens/build.mjs`; no
  Style Dictionary), React 19 and Vite 8
  (`@ux-builder/ui`), Storybook 10 (workbench), Changesets 3 (releases).
- **Packages**: `@ux-builder/tokens` 1.7.0, `@ux-builder/ui` 0.9.0,
  `@ux-builder/create-app` 0.7.0, `@ux-builder/audit` 0.4.0, `@ux-builder/mcp`
  0.6.0 and `@ux-builder/trace` 0.1.0 on the public npm registry (first released as
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
