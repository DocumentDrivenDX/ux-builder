---
ddx:
  id: FEAT-007
  type: feature-specification
  status: draft
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: FEAT-004
    - kind: informed_by
      to: FEAT-006
    - kind: informed_by
      to: FEAT-003
    - kind: informed_by
      to: ADR-016
    - kind: informed_by
      to: ADR-020
    - kind: informed_by
      to: ADR-021
    - kind: informed_by
      to: ADR-023
---

# Feature Specification: FEAT-007 — Generative UI: bridges, assistant patterns and the licence check

**Feature ID**: FEAT-007
**Status**: Specified (ADR-023 accepted 2026-10-19; CopilotKit excluded the same day)
**Priority**: P1 (bridges, licence check, conversation) / P2 (generative UI, artifacts)
**Owner**: Operator (until a design-system owner is named); harness team as future owner
**Covered PRD Subsystem(s)**: App SDK; Distribution and tenancy (the licence check)
**Covered PRD Requirements**: FR-28, FR-29, FR-30, FR-31 (drafted with this feature)
**Cross-Subsystem Rationale**: The bridges are emitted by the token build (Theme composition, FR-2) and shown by the builder (Brand builder, FR-14); the licence check gates releases (Distribution, FR-22). Each piece is small and exists only for this feature, so it is specified here rather than split.

## Overview

Apps built on the SDK are adding AI assistants, built on AI Elements or
assistant-ui (CopilotKit is excluded: it costs money and reports telemetry;
operator, 2026-10-19). This feature makes every
theme dress whichever library an app uses (bridges), gives the SDK its own
accessible, secure assistant patterns that run on any of the three
(adapters), lets agents render SDK components as generative UI, and checks
every third-party licence before release. Decision: ADR-023, which also
records the licences as checked on 2026-10-19.

## Ideal Future State

A developer adds an assistant to a Praxis Carbon app. If the team already
uses AI Elements, they import one bridge stylesheet and the components take
Praxis Carbon's palette, type, radius and density, switching with the theme.
If they start fresh, they use `@ux-builder/ui/assistant` with the adapter for
their runtime: a conversation that announces each finished reply once, keeps
focus in the composer, can be stopped from the keyboard, shows its reasoning
and sources, and never acts without the user's explicit approval. When the
agent answers with a table of fees, it renders the SDK's DataTable, not a
block of HTML. Nothing reports usage to a vendor unless the app opts in, and
the release would not have shipped with a dependency whose licence counsel
had not approved.

## Problem Statement

- **Current situation**: The SDK has no chat or agent UI. Each library brings
  its own look; an assistant does not match its app. No dependency licence is
  checked except fonts (ADR-017), and the SDK's packages declare no licence.
- **Pain points**: Assistants look foreign and differ between apps; streamed
  text is announced token by token or not at all; agents act without
  approval; model output is rendered as raw markup; libraries and their
  dependencies can report usage; obligations for copied
  Apache-2.0 source are easy to miss.
- **Desired outcome**: Every theme styles all three libraries; one assistant
  experience meets WCAG 2.2 AA on any runtime; generative UI is limited to
  catalogue components; the licence check blocks a release that would break
  an obligation.

## Functional Areas

- **Bridge** — a generated stylesheet that maps a theme's tokens onto one
  library's theming variables (ADR-023 rule 2).
- **Theming surface** — the set of variables a library is styled by: shadcn
  (AI Elements, the components assistant-ui's CLI adds) or assistant-ui
  (`--aui-*`, the variables of its packaged styles, as HSL channels).
- **Assistant pattern** — an SDK pattern for conversational UI, taking
  messages and callbacks as props.
- **Adapter** — an entry point that connects assistant patterns to one
  library's runtime or headless primitives.
- **Renderable component** — a catalogue component an agent may render, with
  its props schema.

| Area | User question or job | Feature responsibility |
|------|----------------------|------------------------|
| Bridges | "Our app uses AI Elements; will it match our theme?" | Bridge stylesheets per theme × appearance × surface, contrast-checked |
| Conversation | "How do people talk to the assistant?" | Conversation, message, composer, streaming, stop, retry, suggestions |
| Agent transparency | "What did the assistant do, and may it?" | Reasoning, tool calls, sources, approvals, artifact pane |
| Generative UI | "How does the agent show a table or a form?" | Catalogue allow-list, props validation, fallback |
| Adapters | "We use assistant-ui / the AI SDK" | One adapter per runtime, optional peer dependencies |
| Builder | "What does each library look like in this theme?" | Assistant screen in Compare and theme pages; chat library in step 6 |
| Licences | "May we ship this, and have we met its terms?" | Licence check, notices, vendored-code rules, no telemetry |

## Requirements

### Functional Requirements by Area

#### Bridges

BRG-01. The token build emits, for every theme, a shadcn bridge at
`@ux-builder/tokens/bridges/shadcn/<theme>.css`, with a block per appearance,
mapping role tokens (colours, states, focus) and anatomy tokens (radius,
fonts) onto shadcn's variables, which style AI Elements and assistant-ui's
current components alike (ADR-023, amended).
BRG-02. A bridge is scoped `[data-theme][data-appearance]`, so it follows
run-time theme and appearance switching and nested themes, and works without
shadcn's `.dark` class.
BRG-03. Every colour pairing a surface's library documents passes the
contrast gate in every theme × appearance (4.5:1 text, 3:1 non-text); a
failing bridge fails the build, naming theme, appearance, surface and pair.
BRG-04. Storybook runs each library's real components with its bridge in
every theme, and the audit reports no errors on them.

#### Conversation

CONV-01. The conversation is a log (`role="log"`) whose finished assistant
replies are announced once each, politely, not token by token; a reply in
progress says it is in progress in text.
CONV-02. The composer is a labelled multi-line field: Enter sends,
Shift+Enter adds a line; sending keeps focus in the composer; it is
disabled with a stated reason while sending is not possible.
CONV-03. While a reply streams, a Stop control is reachable by keyboard and
named "Stop"; stopping keeps what has arrived and says it was stopped.
CONV-04. A failed reply says what went wrong in text and offers Retry;
earlier messages stay.
CONV-05. Suggestions are buttons that send their text; they are not the only
way to start.
CONV-06. Message content renders from sanitised markdown: no raw HTML, no
script, links marked as leaving the app; code blocks have a copy control.
CONV-07. The conversation adapts by size class: full screen at compact, a
side panel or page region from expanded (ADR-021); the newest message stays
in view as replies arrive unless the user has scrolled up.

#### Agent transparency

AGT-T-01. Reasoning is collapsed by default behind a disclosure that says
how long the assistant reasoned; expanding it is never needed to read the
answer.
AGT-T-02. A tool call shows its name and status in text (running, done,
failed) and, on request, its input and result.
AGT-T-03. Sources are numbered links, each citation in the answer linked to
its source, with the source's title.
AGT-T-04. An action that changes data needs an approval: a card stating what
will happen and to what, with Approve and Deny buttons; nothing happens until
the user chooses; the choice is announced and recorded in the conversation;
approval is never automatic.
AGT-T-05. An artifact (a document, table or code the assistant produced)
opens in a pane beside the conversation from expanded, and full screen at
compact, with focus moving to it and back.

#### Generative UI

GEN-01. `catalogue.json` marks which components an agent may render
(`renderable`) with a props schema; `@ux-builder/mcp` serves the list.
GEN-02. A tool result naming a renderable component with valid props renders
that SDK component in the conversation, in the app's theme.
GEN-03. A tool result naming anything else, or with invalid props, renders a
plain fallback that says the content could not be shown; nothing from the
result is inserted as HTML or script.

#### Adapters

ADP-01. `@ux-builder/ui/assistant` imports no AI library.
ADP-02. Adapters for the AI SDK and assistant-ui connect the assistant
patterns to each runtime; each library is an optional peer dependency, and an
app that imports no adapter installs none.
ADP-03. With default settings the assistant makes no request to any vendor
service and sends no telemetry; no adapter configures a hosted service
(ADR-023 rule 8).

#### Builder

BLD-01. Compare and every theme page offer an "Assistant" screen showing a
conversation with a tool call, sources and an approval, in each palette and
design system.
BLD-02. A theme page shows the bridge's stylesheet and, as **AI Components**,
apart from the SDK's **UI Components** in the page and in its menu, each
previewed AI Elements and assistant-ui component in the theme, with its
library, licence, documentation and Storybook story.
BLD-03. Step 6 ("Use in your app") offers a chat library (none, AI Elements,
assistant-ui) and prints the library's command line, the bridge import and
how to connect it to the AI SDK (the SDK's own adapters follow with US-046).

#### Licences

LIC-01. `tools/check-licences.mjs` runs in `npm run check` and before every
release, over every published SDK package's production, peer and optional
peer dependency tree and `licenses/vendored.json`.
LIC-02. It passes only MIT, Apache-2.0, ISC, BSD-2-Clause, BSD-3-Clause, 0BSD
and CC0-1.0, and fails on any other, unknown, missing or `SEE LICENSE IN`
licence, naming the package, version and licence, unless the package is in a
dated exception list approved by counsel.
LIC-03. Vendored third-party source is recorded in `licenses/vendored.json`
(source, version, licence, changed files); the check fails when a vendored
file has lost its copyright notice, a changed file lacks its "Changed by"
line, or the licence text or NOTICE file is not shipped.
LIC-04. Every SDK package declares a `license` field and ships a generated
`THIRD-PARTY-NOTICES.md`.
LIC-05. The check fails when a shipped dependency is a known telemetry
package (such as `@scarf/scarf`) or runs an install script without a
reviewed exception.

### Non-Functional Requirements

- **Accessibility**: Every assistant pattern and every bridge story meets
  WCAG 2.2 AA (including 4.1.3 Status Messages and 2.4.11 Focus Not
  Obscured); the audit reports zero errors in every theme × appearance × size
  class.
- **Security**: Model output never reaches the DOM as HTML; approvals cannot
  be bypassed from a tool result; nothing reports usage, and no vendor service
  is contacted by default (`security-owasp`).
- **Performance**: A reply streaming 50 tokens a second keeps Interaction to
  Next Paint ≤ 200 ms for the composer and Stop.
- **Package impact**: An app that imports no assistant pattern gains no
  assistant JavaScript; an app that imports no adapter installs no AI
  library.
- **Coverage**: Every requirement is cited by a test once its story is built.

## User Stories

- [US-045 — Style a chat library with the app's theme](../user-stories/US-045-style-a-chat-library-with-the-apps-theme.md) (BRG-01–04; BLD-02–03)
- [US-046 — Hold a conversation with an assistant](../user-stories/US-046-hold-a-conversation-with-an-assistant.md) (CONV-01–07; ADP-01–03; BLD-01)
- [US-047 — See what the assistant did and approve its actions](../user-stories/US-047-see-what-the-assistant-did-and-approve-its-actions.md) (AGT-T-01–05)
- [US-048 — The assistant shows its answer as SDK components](../user-stories/US-048-the-assistant-shows-its-answer-as-sdk-components.md) (GEN-01–03)
- [US-049 — Third-party licences are checked before release](../user-stories/US-049-third-party-licences-are-checked-before-release.md) (LIC-01–05)

## Edge Cases and Error Handling

- **A library a theme cannot fully style** (a colour it hard-codes): the
  bridge story shows it; it is recorded as a known difference, not hidden.
- **Very long replies and code**: the log scrolls; code blocks scroll within
  themselves; nothing widens the page (WCAG 1.4.10).
- **The user scrolls up while a reply streams**: the view stays where they
  are; a "Jump to latest" control appears.
- **Approval requested twice for one action, or after the conversation was
  reset**: only the latest request can be approved; a stale one says so.
- **Offline or the runtime unreachable**: the composer says so and keeps the
  draft.
- **A tool result naming a renderable component with a missing required
  prop**: the fallback, never a partial render.
- **A dependency whose package declares one licence and ships another**: the
  check reads both and fails on a mismatch.

## Success Metrics

- The starter's assistant, on AI Elements and on assistant-ui, passes the audit
  in every theme and appearance.
- An app team adds an assistant to an existing app in under a day using an
  adapter, with no app-written assistant CSS.
- `npm run check` fails on a seeded GPL dependency and on a vendored file
  with its notice removed.
- Zero requests to vendors from the starter with default settings.

## Constraints and Assumptions

- Patterns follow ADR-016 and ADR-021; admission under ADR-020 is by operator
  decision (2026-10-19), ahead of consumer evidence.
- The libraries' theming variables and runtime APIs are as documented on
  2026-10-19; adapters and bridges are versioned against tested releases.
- The licence reading in ADR-023 is engineering's; counsel confirms it
  before the first release that depends on any of these libraries.

## Dependencies

- **Other features**: FEAT-004 (widgets, catalogue, MCP, audit), FEAT-006
  (patterns, size classes), FEAT-001 (token build and contrast gate), FEAT-003
  (builder screens and step 6).
- **Contracts**: CONTRACT-003 (bridge selectors), CONTRACT-004 (the
  `@ux-builder/ui/assistant` entry points, adapter peer dependencies and the
  `renderable` catalogue field), each revised before build.
- **PRD requirements**: FR-28 to FR-31.

## Out of Scope

- Choosing an AI model, provider or runtime for an app.
- Hosting a runtime, or any vendor's hosted service.
- Voice and real-time audio UI.
- Non-React bindings (ADR-016).
- Removing or hiding a vendor's licence banner.

## Open Questions

1. What licence do the SDK's own packages declare? Decided: they
   declare `MIT OR Apache-2.0`, as an open-source project.
2. Is any vendor-hosted service (such as assistant-cloud) acceptable for
   an adopting organization's data, and under what approval? (Default: none.)
3. Counsel's decision on the exceptions awaiting review in
   `licenses/exceptions.json` (axe-core MPL-2.0; MIT-0, Python-2.0 and
   BlueOak-1.0.0 through eslint and stylelint), by 2026-11-18.
4. Should `third-party-licences` become an active project concern
   (`docs/helix/01-frame/concerns.md`)?
5. Which approvals must be recorded outside the conversation (for example in
   the audit log, US-042)?
