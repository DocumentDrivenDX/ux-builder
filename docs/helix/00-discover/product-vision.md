---
ddx:
  id: product-vision
  type: product-vision
  status: draft
  links:
    - kind: informs
      to: prd
---

# Product Vision — AI-UI SDK

> Drafted 2026-10-06 at the operator's request, from the operator's goals
> (2026-10-05: own the design system, turn logos into themes, start new apps;
> a first client, then Synaptiq and its clients; React first; brands may
> override fonts; palettes offered as options and regenerated from feedback)
> and from what has been built since. For the operator to review. Updated
> 2026-10-19 to the codebase: screen patterns (FEAT-006), generative UI
> bridges and the licence check (FEAT-007).

## Vision

**Every app Synaptiq or a client builds looks and behaves like that client
from its first commit, in every screen, widget and AI assistant. It keeps
doing so as brands, design systems and people change, without anyone
hard-coding a colour, a font, a widget or a screen layout.**

The AI-UI SDK is where a client's look lives, along with the building blocks
of its screens:
- A brand owner turns a logo into an accessible, reviewed theme in one
  sitting.
- A developer, or an AI agent working for one, starts a new app already
  wearing that theme.
- They build its screens from widgets and patterns that adapt from desktop
  to phone.
- The app's AI assistant wears the same theme.
- When the brand or the design system changes, every app follows by
  upgrading a package.

## The problem

Each new client app starts by re-deciding its look. Colours are copied from a
logo by eye and fail contrast; widgets are rebuilt, then drift; fonts are
loaded differently in every app; switching an app to another design system
means rewriting it. AI coding agents make it worse: asked for "a filter bar",
they invent one, with literal colours. The result is apps that look
approximately like the client, cost developer time to keep that way, and
cannot be re-themed.

## Who it is for

| Who | What they get |
|-----|---------------|
| **App developers** at Synaptiq and its clients' teams, and anyone who installs the packages from npm | Widgets, screen patterns, fonts, icons and themes from packages; a starter that is on the design system from the first commit; lint rules and an audit that keep it there; a bridge that dresses the chat library they choose in the app's theme |
| **Brand owners** (delivery leads, designers, client stakeholders) | A guided builder: logo in, palette options shown on real widgets in light and dark, plain-language feedback, a theme saved for review |
| **AI coding agents** working in those apps | Guidance and a catalogue (and an MCP server) that name the real widgets, patterns and tokens, so generated UI uses them |
| **Synaptiq** | One design system to maintain instead of one per app; client looks delivered as data, not code |

## What makes it different

1. **A theme is a brand on a design system.** Identity (colours, logo,
   fonts) is separate from anatomy (shapes, type, density, icons), so any
   client can be shown in Material, Fluent, Carbon, Databricks or their own
   look, and a new client is a file, not a fork.
2. **AI steers; a deterministic engine decides.** The model turns "more
   conservative, it's a law firm" into bounded settings; the engine chooses
   every colour, so every option is reproducible and passes contrast before
   anyone sees it.
3. **Accessible by construction.** Every theme, in every appearance, on every
   design system, passes the same 4.5:1 gate in CI; nothing ships that fails.
4. **Built for agents as much as people.** The same source generates the
   documentation, the catalogue and the agent guidance, so they cannot drift
   from what ships.
5. **Whole screens, at any width.** Patterns carry the structure and states
   (empty, error, loading) that basic widgets do not, and adapt to the space
   they are given, from a desktop window to a phone or a narrow embedded
   panel.

## Principles

- **Nothing presentational is hard-coded in an app.** If it is a colour, a
  font or a radius, it comes from a token.
- **Generated, not written by hand,** wherever a hand-written copy could
  drift: galleries, catalogues, guidance, icon sets.
- **Reviewed, not published.** Themes made in the builder go through normal
  code review; releases carry a gallery of every theme.
- **Prefer the platform.** Native elements restyled, CSS custom properties,
  React for components but framework-free CSS.
- **Scope by need.** Widgets and patterns are admitted when an app needs
  them, or by a recorded operator decision, not to be complete.
- **Licences checked, nothing reported.** Every third-party licence is
  checked before release, and nothing the SDK ships reports usage.

## Where it is going

| Horizon | Outcome |
|---------|---------|
| **Now** (built, 2026-10) | Role-based tokens and eight themes on four shared design systems (Material, Fluent, Carbon, Databricks); widgets, fonts and icons in `@ux-builder/*` on the public npm registry; the palette engine; the theme builder (local, OpenAI-steered) with a screens preview and a chat-library step; starter, lint rules, audit, agent guidance, MCP server. Built in the repository, awaiting release: screen patterns that adapt by size class, with design-system variants; bridges that dress AI Elements and assistant-ui in every theme; the third-party licence check |
| **Next** | Release the patterns and bridges; the SDK's own assistant patterns, with adapters per runtime and generative UI limited to catalogue components (FEAT-007); the first client apps (the platform and a billing-review app) adopt the SDK; the AI harness and its embedded products share one presentation contract (ADR-011); measure agent-built UI against the guidance |
| **Later** | Client brands released apart from the public core (FEAT-005) as more clients adopt; a hosted builder for brand owners who are not developers; frameworks beyond React if a client needs one |

## Measures of success

- Adopting apps contain **zero** hard-coded presentation values (lint).
- A logo becomes a reviewed theme in **under 30 minutes**.
- A new app shows a themed screen in **under an hour**.
- **90%** of agent-built components use SDK widgets and role tokens, and
  agent-built screens use the matching patterns with no app-written layout
  CSS.
- Re-theming an app (another client or design system) is a **package
  change**, with no app code edited.

## What it is not

- Not a general-purpose design system competing with Material or Carbon: it
  carries them, it does not replace them.
- Not a page builder or app framework: the SDK supplies screen patterns
  (structure, states, responsive behaviour); apps own their screens' content,
  data, routing and domain logic.
- Not a chat library or AI runtime: it styles the library an app chooses and
  supplies accessible assistant patterns; the app chooses its model and
  runtime.
- Not a logo or brand-strategy tool: it starts from the client's logo.
- Not a way to publish without review.
