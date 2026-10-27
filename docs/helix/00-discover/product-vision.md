---
ddx:
  id: product-vision
  type: product-vision
  status: draft
  links:
    - kind: informs
      to: prd
---

# Product Vision — UX Builder (the AI-UI SDK)

> Drafted 2026-10-06 at the operator's request, from the operator's goals
> (2026-10-05: own the design system, turn logos into themes, start new apps;
> a first client, then Synaptiq and its clients; React first; brands may
> override fonts; palettes offered as options and regenerated from feedback)
> and from what has been built since. For the operator to review. Updated
> 2026-10-19 to the codebase: screen patterns (FEAT-006), generative UI
> bridges and the licence check (FEAT-007). Updated 2026-10-25 at the
> operator's direction: UX Builder leads with the guided design path, from
> an idea to a tested app, with the theme as one of its pillars (FEAT-018).

## Vision

**Anyone with an idea for an app, working with their AI coding agent, gets
to an app people can actually use: designed with them, step by step, built
on their brand from its first commit, and checked at every step, without
anyone hard-coding a colour, a font or a screen nobody needed.**

UX Builder is where an app's experience is designed and where its look
lives. A product owner or designer describes what people should
accomplish; the agent guides them through eight steps, from intent to
users, tasks, alternatives, structure, prototype and tests with people,
showing the foundations for their deliberate approval and the rest as the
changes and exceptions that need their judgment. When the design is ready, the app
is built in the same folder on a theme a brand owner made from a logo in
one sitting. Rules, lint and audits keep it usable and on-brand, and when
the brand or design system changes, every app follows by upgrading a
package.

## The problem

Each new app starts by re-deciding two things, and AI coding agents make
both worse.

- **What to build.** Agents build what they are asked, fast: features
  pile up without anyone checking who the users are, what they must
  accomplish or whether a simpler flow would do. Design, if it happens, is
  a document nobody reviews, and nothing is tested with people.
- **How it looks.** Colours are copied from a logo by eye and fail
  contrast; widgets are rebuilt, then drift; switching an app to another
  design system means rewriting it. Asked for "a filter bar", an agent
  invents one, with literal colours.

The result is apps that are harder to use than they need to be, look
approximately like their brand, cost time to keep that way, and cannot be
re-themed.

## Who it is for

| Who | What they get |
|-----|---------------|
| **Product owners, designers and founders** with an idea | A guided design conversation with their agent: an overview, "Step n of 8", every term explained, the foundations shown for their feedback and approval and the rest as one coverage map; then an app built from the design they approved |
| **App developers** at Synaptiq and its clients' teams, and anyone who installs the packages from npm | Widgets, screen patterns, fonts, icons and themes from packages; a starter that is on the design system from the first commit; lint rules and an audit that keep it there; a bridge that dresses the chat library they choose in the app's theme |
| **Brand owners** (delivery leads, designers, client stakeholders) | A guided builder: logo in, palette options shown on real widgets in light and dark, plain-language feedback, a theme saved for review |
| **AI coding agents** working in those apps | A design skill that leads the conversation, and guidance, a catalogue and an MCP server that name the real widgets, patterns, tokens and rules, so generated UI uses them |
| **App owners and UX reviewers** | An assessment that walks the app's journeys against its stories, usability test kits, and reports of what people actually did |
| **Synaptiq** | One design system and one design process to maintain instead of one per app; client looks delivered as data, not code |

## What makes it different

1. **Designed with you, not for you.** The agent leads; the person
   decides. Every brief, user, job, story, screen and decision is shown in
   the conversation for feedback and approval, and nothing moves past a
   checkpoint without the person's answer. User needs stay labelled as
   hypotheses until evidence confirms them, and every addition must earn
   its complexity.
2. **Design first, the app last.** A design folder holds the work until
   the design is ready; the modality is chosen during the design and the
   theme when the app is built, which then happens in place from the
   approved blueprint.
3. **A theme is a brand on a design system.** Identity (colours, logo,
   fonts) is separate from anatomy (shapes, type, density, icons), so any
   brand can be shown in Material, Fluent, Carbon, Databricks or its own
   look, and a new brand is a file, not a fork. AI steers; a deterministic
   engine chooses every colour, so every option is reproducible and passes
   contrast before anyone sees it.
4. **Checked at every step.** A blueprint checked against cited
   interaction and AI rules before code; lint and an audit of the running
   app by the same rule IDs; a UX assessment and tests with people after.
   Every theme, in every appearance, passes the same contrast gate in CI.
5. **Built for agents as much as people.** The same source generates the
   documentation, the catalogue and the agent guidance, so they cannot
   drift from what ships; everything runs locally, and nothing is sent
   anywhere.

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
  *(Clarified 2026-10-23, ADR-038: ux-builder never sends data anywhere;
  an app may route the SDK's journey events into its own systems.)*

## Where it is going

| Horizon | Outcome |
|---------|---------|
| **Now** (built, 2026-10) | The guided design loop (`@ux-builder/design`): eight steps with review and approval, target users, business rules, alternatives compared, exploratory prototypes, test kits and evaluation reports, production insights and experiments; design first, with the app built in place; nine themes on four shared design systems, widgets, screen patterns, the assistant and Adaptive Cards on npm; the theme builder (local); the starter on HELIX; interaction and AI rules checked in the blueprint and the running app; the UX assessment; the MCP server; the episode trace |
| **Next** | Real apps designed end to end with the guide, and what they teach folded back in; the guide's stage 2 (its document types proposed to HELIX); the first client apps adopt the SDK; measure agent-built UI against the guidance; the AI harness and its embedded products share one presentation contract (ADR-011) |
| **Later** | A hosted builder and guide for people who are not developers; client brands released apart from the public core (FEAT-005); frameworks beyond React if a client needs one |

## Measures of success

- An idea becomes an **approved design** (core-2 passed, the person having
  approved every item) in **one working session**, and an app built from
  it the same day.
- Every design item the guide produces is **reviewed and approved** by a
  person before the step it belongs to closes, and **no content is
  approved twice**: the foundations a table per kind, what is built from
  them as one coverage map.
- A new design reaches a **working prototype within 30 minutes** of the
  person's active time, with **at most 10 approvals** before testing and
  at least **80%** of their turns spent on new information or decisions
  (`ux-builder-design metrics`).
- Adopting apps contain **zero** hard-coded presentation values (lint).
- A logo becomes a reviewed theme in **under 30 minutes**.
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
  data, routing and domain logic. *(2026-10-23, ADR-037: the guided design
  loop's agent builds an app's screens with the SDK in the app's own code;
  the SDK itself generates only disposable exploratory prototypes.)*
- Not a chat library or AI runtime: it styles the library an app chooses and
  supplies accessible assistant patterns; the app chooses its model and
  runtime.
- Not a logo or brand-strategy tool: it starts from the client's logo.
- Not a way to publish without review.
