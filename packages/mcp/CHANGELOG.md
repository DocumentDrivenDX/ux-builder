# @ux-builder/mcp

## 0.5.0

### Minor Changes

- ce02a66: An app declares its modalities, and they choose its shell, rules and components (FEAT-014, ADR-032; US-096 to US-098):
  
  - `npm create @ux-builder/app` asks which modalities the app has (`responsive-web`, `chat`, `hybrid-chat`) as a multi-select in a terminal, and takes `--modality <list>` otherwise; without a terminal it is required. Unknown and future (native) modalities are refused, and a `--blueprint` whose `supports.modalities` disagrees exits 1 naming both.
  - The starter is the empty shell for the modalities, with no sample domain: an `AppShell` with an empty Home screen, a full-screen `Conversation`, a `Conversation` that draws Adaptive Card parts, or an `AppShell` with Home and Assistant. Its HELIX FEAT-001 and US-001 describe the shell, and its e2e test cites them.
  - The blueprint gains `supports.modalities` and `screens[].path`. `blueprint.valid` fails a future modality and warns when `sizeClasses` or `inputs` miss what the modalities derive; a screen may use the assistant's `Conversation` as its pattern.
  - `rulesFor({ modalities })` and MCP `get_rules` with `modalities` expand them to size classes, inputs and AI roles and keep their rule families; the `card.*` rules apply to `hybrid-chat` only. `get_guidance` with `modalities`, `AGENTS.md` and the skill name each modality's components and rule families.

### Patch Changes

- Updated dependencies [ce02a66]
  - @ux-builder/ui@0.8.0

## 0.4.0

### Minor Changes

- 56cb554: Adaptive Cards, `@ux-builder/ui/adaptive-cards` (ADR-029, FEAT-011 AIC-01 to AIC-04; US-083 to US-085; CONTRACT-004 *Adaptive Cards*):
  
  - `AdaptiveCard` (`card`, `onAction`) draws a card of the open-source schema 1.6 with the SDK's own components, in the nearest theme: `Card`, text in the type scale with the card markdown subset (never HTML), images with their alt text, `video` or `audio` with captions, containers on the surface and status tokens, a `Grid` for a ColumnSet (one column at compact), `DescriptionList` for a FactSet, `DataTable` for a Table, buttons in a `Cluster` with a More actions menu, disclosures for Action.ShowCard and Action.ToggleVisibility, and the SDK's fields for every input, with their label, required state and error message. An element outside 1.6 shows its `fallback`, or a plain notice; a card above 1.6 says so. The card is marked `data-piq-ai="generated"`.
  - Action.Submit and Action.Execute call `onAction({ type, id, verb, data, inputs })` once the inputs are valid. An action marked `"data": { "ux-builder": { "highImpact": true, "consequence" } }` asks for approval first (the assistant's `ApprovalCard`): `onAction` only after Approve, never after Deny, with the marker removed from `data`. Then the card's actions are no longer current, and activating one again is refused. A destructive action asks to confirm. Action.OpenUrl is a link that leaves the app. Nothing in the card, or claimed by a tool, approves anything.
  - `checkCard(card)` checks a payload against the vendored Adaptive Cards 1.6 JSON Schema (`cardSchema`, MIT, in `adaptive-cards/schema-1.6/`) and the eleven `card.*` rules with an automatic check, returning findings with a JSON Pointer into the card. It is also at `@ux-builder/ui/adaptive-cards/check`, with no React, for Node tools. The rules name it (`"kind": "card"`).
  - In a `Conversation`, a part `{ type: "adaptive-card", card }` renders the card; `onCardAction` and `onCardDecide` report what the user does, and the user's choice is kept with the message. The AI SDK and assistant-ui adapters turn a tool result `{ type: "adaptive-card", card }`, or a card itself, into that part.
  - `catalogue.json` gains `adaptiveCards[]`; `AGENTS.md` gains an "Adaptive Cards" section. The styles are in `patterns.css`.
  - `@ux-builder/mcp` adds `check_card` (`card`), which returns the same findings as `checkCard`.
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
- a329b1f: A HELIX-aware UX assessment (FEAT-009).
  
  - `@ux-builder/audit`: `inspect(page)` runs the audit's checks on a page as it is, without reloading or resetting it, and `audit()` is now built on it with unchanged findings. New `ux-builder-audit assess` subcommands: `init` and `validate` (a `ux-assessment.yml` manifest that binds the app's HELIX marker, flow and catalogue), `collect` (every HELIX document, story and criterion, traced to the tests that cite them), `baseline` (the app's tests and the audit, recorded before any change), `browser` and `inspect` (inspect the page an agent's browser is on, over CDP, or a verified replay), and `validate-report`. Ships the `ux-builder-assess` skill and the JSON Schemas. New dependencies: `yaml`, `ajv`.
  - `@ux-builder/mcp`: run from an app's directory, the server reads that app's installed `@ux-builder/ui` catalogue and guidance first, so it describes the version the app has.
  - `@ux-builder/audit`, increments 2 and 3: `assess plan` (journey plans and a coverage matrix with every pair), `browser --manifest` and `inspect --manifest` (allowed origins only, redaction), `reset`, `merge` (stable finding IDs), `propose`, `check-writes` and `apply-check` (patches aimed at HELIX artifacts, never applied), `report`, `compare` and `gate`; a CI workflow example; tested with Playwright MCP as the agent's driver.
  - `@ux-builder/mcp`: when the app has `@ux-builder/audit`, the tools `get_assessment_skill`, `validate_assessment_manifest` and `validate_assessment_report`.

### Patch Changes

- Updated dependencies [56cb554]
- Updated dependencies [b5f8a50]
- Updated dependencies [47b71f8]
- Updated dependencies [525f771]
- Updated dependencies [7c493b0]
- Updated dependencies [1777df9]
- Updated dependencies [b51a231]
  - @ux-builder/ui@0.7.0
