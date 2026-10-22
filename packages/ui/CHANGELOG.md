# @ux-builder/ui

## 0.9.0

### Minor Changes

- 690a14d: The episode trace (FEAT-016, CONTRACT-007), written by the tools themselves
  with `@ux-builder/trace`:
  
  - **create-app**: a new app's trace starts with its create episode (`start`
    with trigger `create`, the agent and model from `--agent` and `--model` or
    `UX_BUILDER_AGENT` and `UX_BUILDER_MODEL`, the SDK and HELIX versions;
    `created`; the guidance written to `AGENTS.md`; the starter blueprint's
    check; then its close). The app gets `@ux-builder/trace` as a
    devDependency, a `.gitignore` that ignores only `.ux-builder/trace/current`,
    a Claude Code session-end hook in `.claude/settings.json` that attaches the
    transcript, `npm run lint` through `ux-builder-trace lint` (one lint check
    per run), and `AGENTS.md` instructions to open an episode, record each
    decision, add the `UX-Episode:` trailer and end the episode.
  - **mcp**: every tool writes a `guidance` event to the open episode of the
    app it serves (its working directory, or `UX_BUILDER_APP`); `check_blueprint`
    and `check_card` also write a `check` event. New tools: `start_episode`,
    `record_decision` (`chose` and `why` required, `why` masked) and
    `end_episode`.
  - **audit**: each `ux-builder-audit` run in an app that keeps a trace writes
    an `audit` check with its status, attempt, findings per rule, verdicts and
    report path.
  - **ui**: `ux-builder-blueprint check` writes a `blueprint` check; the SDK's
    guidance (`AGENTS.md` and the `ux-builder-ui` skill) says how to record the
    build.

## 0.8.0

### Minor Changes

- ce02a66: An app declares its modalities, and they choose its shell, rules and components (FEAT-014, ADR-032; US-096 to US-098):
  
  - `npm create @ux-builder/app` asks which modalities the app has (`responsive-web`, `chat`, `hybrid-chat`) as a multi-select in a terminal, and takes `--modality <list>` otherwise; without a terminal it is required. Unknown and future (native) modalities are refused, and a `--blueprint` whose `supports.modalities` disagrees exits 1 naming both.
  - The starter is the empty shell for the modalities, with no sample domain: an `AppShell` with an empty Home screen, a full-screen `Conversation`, a `Conversation` that draws Adaptive Card parts, or an `AppShell` with Home and Assistant. Its HELIX FEAT-001 and US-001 describe the shell, and its e2e test cites them.
  - The blueprint gains `supports.modalities` and `screens[].path`. `blueprint.valid` fails a future modality and warns when `sizeClasses` or `inputs` miss what the modalities derive; a screen may use the assistant's `Conversation` as its pattern.
  - `rulesFor({ modalities })` and MCP `get_rules` with `modalities` expand them to size classes, inputs and AI roles and keep their rule families; the `card.*` rules apply to `hybrid-chat` only. `get_guidance` with `modalities`, `AGENTS.md` and the skill name each modality's components and rule families.

## 0.7.0

### Minor Changes

- 56cb554: Adaptive Cards, `@ux-builder/ui/adaptive-cards` (ADR-029, FEAT-011 AIC-01 to AIC-04; US-083 to US-085; CONTRACT-004 *Adaptive Cards*):
  
  - `AdaptiveCard` (`card`, `onAction`) draws a card of the open-source schema 1.6 with the SDK's own components, in the nearest theme: `Card`, text in the type scale with the card markdown subset (never HTML), images with their alt text, `video` or `audio` with captions, containers on the surface and status tokens, a `Grid` for a ColumnSet (one column at compact), `DescriptionList` for a FactSet, `DataTable` for a Table, buttons in a `Cluster` with a More actions menu, disclosures for Action.ShowCard and Action.ToggleVisibility, and the SDK's fields for every input, with their label, required state and error message. An element outside 1.6 shows its `fallback`, or a plain notice; a card above 1.6 says so. The card is marked `data-piq-ai="generated"`.
  - Action.Submit and Action.Execute call `onAction({ type, id, verb, data, inputs })` once the inputs are valid. An action marked `"data": { "ux-builder": { "highImpact": true, "consequence" } }` asks for approval first (the assistant's `ApprovalCard`): `onAction` only after Approve, never after Deny, with the marker removed from `data`. Then the card's actions are no longer current, and activating one again is refused. A destructive action asks to confirm. Action.OpenUrl is a link that leaves the app. Nothing in the card, or claimed by a tool, approves anything.
  - `checkCard(card)` checks a payload against the vendored Adaptive Cards 1.6 JSON Schema (`cardSchema`, MIT, in `adaptive-cards/schema-1.6/`) and the eleven `card.*` rules with an automatic check, returning findings with a JSON Pointer into the card. It is also at `@ux-builder/ui/adaptive-cards/check`, with no React, for Node tools. The rules name it (`"kind": "card"`).
  - In a `Conversation`, a part `{ type: "adaptive-card", card }` renders the card; `onCardAction` and `onCardDecide` report what the user does, and the user's choice is kept with the message. The AI SDK and assistant-ui adapters turn a tool result `{ type: "adaptive-card", card }`, or a card itself, into that part.
  - `catalogue.json` gains `adaptiveCards[]`; `AGENTS.md` gains an "Adaptive Cards" section. The styles are in `patterns.css`.
  - `@ux-builder/mcp` adds `check_card` (`card`), which returns the same findings as `checkCard`.
- b5f8a50: New ESLint rule `ux-builder/ai-neutral-voice` (a warning, US-081): it flags copy that presents the AI as a person ("I think", "I feel", "I understand", "I believe"; rule `ai.not-a-person`) or as the actor ("Copilot, summarize"; rule `ai.user-initiates`, write "Summarize" or "Summarize with Copilot"). English only. Opt a string out with `// ux-builder-ai-persona` on the line before it. The plugin now has `configs.recommended`, with all four rules and this one as a warning.
- 47b71f8: The SDK's own assistant, `@ux-builder/ui/assistant` (FEAT-007; US-046 to US-048; CONTRACT-004 *Assistant and generative UI*):
  
  - `Conversation`: the messages as a log, with each finished reply announced once (never token by token) and "Replying…" in text while one streams. The composer sends on Enter, adds a line on Shift+Enter, keeps focus, and says in text why it cannot send. It has Stop (the partial reply stays, marked "Stopped"), Retry on a failed reply, Regenerate, suggestions and "Jump to latest". Replies render from sanitised markdown: no HTML or script, links marked as opening a new tab, and code with a copy control.
  - The assistant's work and its actions: reasoning behind a disclosure ("Reasoned for 6 seconds"), tool calls with their status in text, numbered sources linked from each citation, and an approval card. Nothing passes to the app until the user approves or denies. The choice is announced and recorded, only the latest request for an action can be decided, and no approval is ever read from a tool result. Artifacts open beside the conversation from the expanded size class, and full screen below it.
  - `AssistantPanel`: a side panel beside the page from the expanded size class, and a full-screen sheet below it.
  - Generated UI: `GenerativeComponent` renders only the catalogue's renderable components (`RENDERABLE`, `checkRenderable`), with props that pass their schema; anything else is a plain notice. `InlineForm` keeps the user's edits when its reply is regenerated, and shows what was submitted, read only.
  - Every part carries CONTRACT-005's AI markers (`data-piq-ai` generated, status, plan, step, approval; `data-piq-ai-control`, `data-piq-ai-label`, `data-piq-ai-actor`).
  - Adapters: `@ux-builder/ui/assistant/ai-sdk` (`useAiSdkConversation`, `fromAiSdk`) and `@ux-builder/ui/assistant/assistant-ui` (`useAssistantUiConversation`, `fromAssistantUi`). Each reads the runtime object the app already has and imports no AI library. `ai` and `@assistant-ui/react` are optional peer dependencies, and nothing contacts a vendor or reports usage.
  - `catalogue.json` gains `assistant[]`, and `renderable: true` with a `propsSchema` on each component an agent may render. `AGENTS.md` gains an "Assistant" section. The styles are in `patterns.css`.
  - `@ux-builder/mcp` adds `list_renderable`.
- 525f771: `ux-builder-blueprint` drafts and draws from a blueprint's flow and journeys (FEAT-012, US-089, US-090):
  
  - `ux-builder-blueprint propose` writes HELIX proposals as patches in `helix-proposals/`, and applies nothing. It drafts each journey's story *Walkthrough*, a Mermaid *Screen Flow* in the solution design, the first journey's sequence diagram as architecture's *Data Flow*, `DESIGN.md`'s *Destinations by Size Class*, and *Journey Scenarios* in each story test plan. Where HELIX already says something else, there is no patch, and `report.md` shows both texts. It needs the `.helix.yml` marker (exit 2 without it). Review the patches, then `git apply` the ones you accept.
  - `ux-builder-blueprint draw` writes the IA map, the flow and each journey as Mermaid (`.mmd`) and SVG, in `blueprint-drawings/`.
  - `ux-builder-blueprint wireframes` renders each screen's pattern with placeholder content in the `plain` theme, at each supported size class, as HTML and PNG, in `blueprint-wireframes/`. PNGs need `playwright` and its Chromium.
  - `@ux-builder/mcp`: the new `propose_from_blueprint` tool returns the same proposals and writes nothing.
- 7c493b0: Interaction and IA rules, a blueprint check, and audit checks for them (FEAT-008).
  
  - `@ux-builder/ui`: 29 interaction and IA rules (navigation by size class, modals, safeguards on destructive actions, states, emphasis, embedded views), each in the SDK's own words with links to Apple's HIG, Material 3, WCAG 2.2 and the WAI-ARIA APG, plus 8 recipes. They are in `catalogue.json` (`interaction`) and `AGENTS.md`. The new entry point `@ux-builder/ui/blueprint` exports `rulesFor`, `checkBlueprint`, `blueprintSchema`, `findRecipes` and `skeleton`. The new command `ux-builder-blueprint` has `init` and `check`, which checks an `app.blueprint.json` against the rules.
  - `@ux-builder/audit`: five new checks, warnings for this minor release: `one-modal`, `modal-contract`, `one-primary-action`, `nav-per-breakpoint` (with `--width`) and `line-length`. Their findings carry `ruleId` and `sources`. `--write-baseline` and `--baseline` let an existing app fail only on new findings; findings that are fixed are listed as resolved.
  - `@ux-builder/mcp`: five new tools, `get_rules`, `list_recipes`, `get_recipe`, `get_blueprint_schema` and `check_blueprint`. The guidance states the plan, check, build, lint and audit loop.
  - `@ux-builder/create-app`: a new app gets `app.blueprint.json`, a `check:blueprint` script and a CI step for it. `--blueprint <file>` starts from your own plan, and a plan with an error is refused.
  
  ux-builder is not affiliated with or endorsed by Apple or Google.

### Patch Changes

- 1777df9: ListDetail: the pane that holds focus is recorded in every layout, so focus moved just after the window widens is no longer lost when it narrows again (US-026-AC4).
- b51a231: The interaction rules and the blueprint check agree with FEAT-008 (AR-2026-10-21, B1 to B7).
  
  - `nav.compact-destinations` applies at the compact size class only, as the audit's check below 600 px does. An app that supports medium but not compact may have more than five destinations.
  - A new rule, `view.states`: every screen of an embedded view declares its empty, loading and error states, whatever its pattern. In a view it reports instead of `screen.states`.
  - `checkBlueprint` orders findings by path, then rule, in plain string order on every platform. It used locale order for the rule.
  - CONTRACT-005 now lists the `getRecipe`, `rules`, `recipes` and `limits` exports. `CHECKS` and `nearestPattern` are internal.

## 0.6.3

### Patch Changes

- 9f52368: The agent guidance (`AGENTS.md`, the `ux-builder-ui` skill, `catalogue.json` rules) now says to put each screen inside a `Page` within `AppShell`. Neither `AppShell`'s content area nor the screen patterns have a page gutter of their own, so an agent that placed a `Dashboard` straight into `AppShell` got a screen flush against the navigation and the window edge.

## 0.6.2

### Patch Changes

- 7bee056: Fix the favicon for a theme whose mark a bundler inlines as a `data:` URI (Vite does for files under 4 KB, as with `ux-builder-databricks`): `ThemeProvider` cut the URI at its first quote or bracket, so the tab showed no icon or a broken one. The audit now reads the URI whole too, and checks the favicon on the provider's element rather than a `data-theme` that the app's `index.html` puts on `<html>`, as the starter does.
- Updated dependencies [4803047]
  - @ux-builder/tokens@1.6.0

## 0.6.1

### Patch Changes

- 9e12240: Add the `ux-builder-databricks` theme: the `ux-builder` brand (made in the theme builder from the client's logo) on the databricks design system, light by default. Select it with `data-theme="ux-builder-databricks"`. `@ux-builder/ui`'s catalogue and agent guidance list it.
- Updated dependencies [9e12240]
  - @ux-builder/tokens@1.5.0
