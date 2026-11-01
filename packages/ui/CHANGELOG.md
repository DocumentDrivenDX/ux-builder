# @ux-builder/ui

## 0.15.0

### Minor Changes

- 2fea36b: ux-builder writes into HELIX's documents and keeps none of its own (ADR-042; needs HELIX v0.20.0's UX types and sections).
  
  `@ux-builder/design` (breaking): UX decisions are proposed as HELIX ADRs tagged area:ui (`decision add`, `decision status`), experiments are DDx beads (`experiment start|end`), experience principles go in principles.md (`principle add`), users, needs and tasks are rows of the PRD's User Segments and User Needs and a feature's Task Model (`segment add`, `need add`, `task add`), and research is a study's HELIX research plan (`evidence add|claim|excerpt --study`, `test-kit --study`, `transcript add --study`, `observe import --study`). Test-session material, evaluation reports and insight exports are run output in the gitignored `docs/ux-builder/runs/`; `insights` proposes Journey Funnels for the metrics dashboard; approving the coverage map proposes the solution design's Experience Traceability; the brief is compiled from HELIX and says where each section comes from. Every change to HELIX is a proposal the person applies. The baseline command and the users, jobs, ux-decision, research-evidence, test-kit, usability-evaluation-report, insights, experiment and baseline document types are gone; `migrate` proposes an app's old documents into HELIX. A person sees HELIX's IDs and names only.
  
  `@ux-builder/ui`: `ux-builder-blueprint propose` fills HELIX's user-flow, wireframe and user-journey-map types and DESIGN.md's modalities, size classes and app frame; its draft types are gone. Blueprint tasks take their Task Model key and cite needs and users by name; journeys may be named without the `J-` prefix; a project rule names its principle by its words. The layout gains `runs`.
  
  `@ux-builder/audit`: `reports.html` lists every run by path, copying nothing in; journeys may be named without `J-`. The assessment's `report.md` is a ux-builder usability assessment report (`ux-builder:` frontmatter, `type: usability-assessment-report`) rather than claiming a HELIX type, and is no longer drafted from a HELIX template.
  
  `@ux-builder/create-app`: a created app gitignores `docs/ux-builder/assessments/` and `docs/ux-builder/runs/`, never overwrites an existing concerns.md, and names its starter journey `start`.
  
  `@ux-builder/trace`: a decision event's `ux` may be a HELIX ADR (`ADR-<nnn>`); older `UXD-<n>` traces stay valid.
  
  `@ux-builder/mcp`: `trace` describes study task keys and ADR IDs.

## 0.14.1

### Patch Changes

- 7f35781: Add the `img-8593-databricks` theme: the `img-8593` brand (made in the theme builder from the client's logo) on the databricks design system, light by default. Select it with `data-theme="img-8593-databricks"`. `@ux-builder/ui`'s catalogue and agent guidance list it.
- Updated dependencies [7f35781]
  - @ux-builder/tokens@1.8.0

## 0.14.0

### Minor Changes

- 4350756: The app frame is the person's choice (US-162, ADR-041). AppShell takes `frame`: `screen` (the content alone), `top-bar` (no navigation), `top-nav` (destinations across the top, a bottom bar on phones) or `side-nav` (the default). The blueprint records it in `supports.frame` and `check` warns when it no longer fits the destinations; wireframes, prototypes and the built app are drawn in it; `ux-builder-design modality` asks for it with the modality and recommends one from the destinations; the audit judges it by outcome.

### Patch Changes

- 88942e5: The guided design holds up in a real session (US-161): a re-wrapped paragraph or moved bold marker keeps an approval; core-2 leads to step 5; a changed item or the coverage map is approved again only after it is shown; metrics count the person's approvals per answer, start testing only at a step 7 the loop stays at, and count format-only reopenings; `evidence claim contradict` records a contradiction and asks; `validate` warns about unasked contradictions and a brief calling a dropped story confirmed. The prototype toolbar is folded and names journeys by goal, and a screen with no sample of its own is drawn from its content.

## 0.13.0

### Minor Changes

- f11e073: Lessons from the first guided session (FEAT-018 GDL-82). `ux-builder-design explain <ID>` says what an ID such as U-1, J-1, J-find, T-2 or BR-1 names and where it lives, and `explain ids` lists every kind; the overview mentions them and the guide never shows a bare ID. HELIX stories are read without a type tag, and a near-miss tag such as `user-story` is read as `user-stories` and reported; the guides never hand the person a command to edit HELIX or guess a HELIX field. Asked for an audit, the guides ask whether the person wants the UI audit, the usability assessment, or both. The assessment's manifest and runs and the UI audit's report now live under `docs/ux-builder/` (`ux-assessment.yml`, `assessments/`, `audit-report/`), the manifest's paths still relative to the app; an app that keeps them at its top keeps working, `status` lists them and `ux-builder-design migrate` moves them.
- 309ec20: The person's time goes to decisions (FEAT-018 GDL-83, ADR-040). Review comes in three tiers: the foundations (brief, target users, jobs, stories, business rules, decisions) a table per kind (`ux-builder-design review table <kind>`, `review approve --kind <kind>`); what is built from them as one coverage map with its exceptions (`review map`, `review approve map [--accept <exception>]`); records need no approval. An approval holds through changes of frontmatter and formatting, and a change of meaning comes back as a diff. `intake` asks the open questions together after reading what exists, and `status` shows the decisions left before the first prototype. `evidence claim add|verify` grounds each claim in its source, and `validate` warns about an unchecked one that changes the design's direction. `proposals preview` and `proposals apply --accepted <ids>` apply HELIX proposals all or nothing, renumbering a clashing ID. `advance --until-decision` does the safe work and names the next decision. `metrics` measures the session against its targets. The build in place generates a working journey skeleton from the chosen blueprint (`create-app --prototype` regenerates it) and no longer adds starter HELIX documents that clash with the design's. The responsive-web verdict is judged by outcome at the chosen size classes (`ux-builder-audit --size-classes`); every report is listed on `docs/ux-builder/reports.html` (`ux-builder-audit reports`); and `ux-builder-audit doctor` checks the installed packages agree.

## 0.12.1

### Patch Changes

- a2aef96: Alignment fixes for the guided design (FEAT-018). `ux-builder-design step` no longer moves past a step that `core-1`, `core-2` or `core-3` closes until that checkpoint has passed or been skipped (exit 2), as CONTRACT-008 says. In an app on the `docs/ux-builder/` layout, `ux-builder-audit assess heuristics` and `assess hierarchy` now find the blueprint there instead of silently running without one. The package exports `./artifacts/*`; its output schema covers every command; messages and the MCP `design_status` description no longer name `docs/ux/`. The SDK's agent guidance names the blueprint's current path, and the skill's activity table uses the eight steps' names.

## 0.12.0

### Minor Changes

- f701d1a: The design work lives under `docs/ux-builder/` (FEAT-018 GDL-80): the design documents, the blueprint and its alternatives (`blueprint/`), exploratory prototypes (`prototypes/`), HELIX proposals (`helix-proposals/`), comparisons, drawings and wireframes. New apps from create-app put the blueprint at `docs/ux-builder/blueprint/app.blueprint.json`, and the blueprint CLI, the audit and the MCP server look there by default. An app on the old layout keeps working where it is, each command says so, and `ux-builder-design migrate [--dry-run]` moves it with `git mv` and rewrites the app's references. `ux-builder-design modality` records the person's answer on modality and screen sizes; in a guided app `ux-builder-blueprint wireframes` and `prototype --explore` wait for it, and ask again when the blueprint's supports change.

### Patch Changes

- 3a6a4c0: Business rules in the task model (FEAT-018 GDL-78): rules stay defined once in HELIX as `**BR-<n>** — <rule>`; blueprint tasks and journey steps cite them (`rules`), and the blueprint's `businessRules` says how the user meets each (trigger, before, blocked, recover), in the blueprint schema. `ux-builder-design validate` fails a cited rule HELIX does not define or whose experience is not designed; `test-kit` adds a task per rule in its trigger situation; `report` shows how people fared with each rule and lists untested ones; `trace` and `impact` follow rules to their tasks, journeys and screens.

## 0.11.1

### Patch Changes

- 4887401: Target users are evidence-backed records (FEAT-018 GDL-77): `docs/ux/users.md` holds a row per user (`U-<n>`) with its context, needs, the jobs it holds with an importance for each, and evidence, confidence and status, checked by `validate`. The brief's Target users comes from it; blueprint tasks name the users they serve (`tasks[].users`, in the blueprint schema); the test kit's screener asks about each user and its context, scenarios say who each task is for, and the observation sheet has a `user` column, which the evaluation report breaks its measures down by; `trace U-<n>` follows a user to its jobs, tasks and journeys; `status` counts target users.

## 0.11.0

### Minor Changes

- b621adc: `ux-builder-blueprint alternative new|choose` makes alternative blueprints (`app.blueprint.<name>.json`) and records the choice and its reason in the design state; `score` gives each journey's predicted effort; `compare` writes one page comparing alternatives for the same tasks, marking the best per task and dimension, with the agent's judgments labelled preliminary. MCP gains `score_blueprint` and `compare_blueprints`.
- 041e1b1: Screens may declare `purpose`, `content` (the information on them, highest priority first) and `interactionKinds`. New warnings: `screen.purpose` (once a blueprint models tasks or content) and `consistency.same-kind` (two tasks handle the same kind of interaction with different patterns). Wireframes show each screen's content in its order, and `propose`'s wireframe drafts list its purpose and content.
- 73599b0: `ux-builder-blueprint check --diff <base>` reports the complexity a change adds per journey (screens, steps, required inputs and decisions added and removed) and warns, with the new rule `simplicity.delta-decided`, when a journey grows with no recorded decision naming the addition. Journey steps may declare `inputs` (`required`, `inferable`), `decision` and `system`. `complexityDelta`, `deltaFindings`, `journeyLoad` and `stepKey` are exported from `@ux-builder/ui/blueprint`.
- 11e98a6: Blueprints may hold a task model, `tasks[]` (goal, jobs, trigger, inputs, system and user actions, success criteria, exceptions, subtasks, interaction kinds), and journeys name the task they realize. New checks: `journey.task-exists` (error) and `task.realized` (warning). `ux-builder-blueprint simplify` (and MCP `simplify_blueprint`) proposes inputs to infer, decisions to default, steps to combine and hops to remove, changing nothing.
- 0e3e6e7: `@ux-builder/ui/blueprint/prototype` and `@ux-builder/ui/blueprint/propose` are exported for the guided design loop. MCP gains `design_impact` and `design_trace` when the app has `@ux-builder/design`. The site's rules table shows every rule on one page.
- 75582cf: `ux-builder-blueprint check` applies an app's experience principles from `.ux-builder/principles.json` as project rules (`no-step-before`, `max-required-inputs`, `max-steps`, `no-modal-in`); each finding is `project.<PR-id>` and names the principle. `principleFindings` is exported from `@ux-builder/ui/blueprint`.
- b719e23: `ux-builder-blueprint prototype --explore` writes a disposable, clickable prototype under `prototype/<name>/` (each screen, state and size class, with a prototype banner, a state and size switcher and every action linked), optionally once per `--design-system`; `--archive <name>` puts one away. The new lint rule `ux-builder/no-prototype-import` (on in the recommended config and in new apps) keeps app code from importing prototypes. Wireframes can render in any theme.
- de6f614: The catalogue carries the UX quality rubric (`interaction.rubric`): nine dimensions, each with its question, measures and sources; task effectiveness and accessibility are baselines (FEAT-018).
- 0cda9d7: Journey events (FEAT-018, ADR-038): `JourneyProvider` hands the app's own `sink` the moments a journey passes through — `journey-start`, `step`, `complete`, `abandon`, `error-shown`, `empty-result` and `no-results-search`, each with journey, screen and step IDs and a timestamp, never user content. `useJourneyStep(journeyId, step)` marks a step; `StatePanel` reports its error, empty and no-results states. No sink, no events; the SDK sends nothing anywhere.

### Patch Changes

- db0c69e: From trying the guided design loop end to end: `ux-builder-blueprint check` reads app.blueprint.json when no file is given, like the other commands; an exploratory prototype's own buttons and navigation lead where the blueprint says, not only the prototype bar's links; `ux-builder-trace decide` accepts `--assumption` as well as `--assumptions`.
- 1e4ac6b: An exploratory prototype page says when the window shows another size class's layout than its own, and offers to open the page at its size class's width.

## 0.10.0

### Minor Changes

- d9967eb: The operator's decisions on AR-2026-10-22 (D-1, D-2, D-4, D-6):
  
  - **Adaptive Card tones use the status colours** (D-1). A `Container` or `Column` styled `good`, `warning` or `attention`, and an action styled `destructive`, now draw with `--piq-color-status-positive`, `-caution` and `-negative` (FEAT-017), not the availability colours (`--piq-state-live`, `-limited`, `-closed`). Cards look different in themes where the two families differ.
  - **New rule `genui.inline-compact`** (D-2, US-080-AC7). A `Wizard` or `FormPage` rendered inline in a conversation whose region includes `compact` gets a blueprint warning: show one short step at a time with its progress, keep the composer and Stop reachable, and move a longer task to a screen of its own. A region that is never compact gets none.
  - **A screen may declare `partial`** (D-4, US-104-AC5). `screens[].states` accepts `"partial"`; `draw` and `wireframes` already draw it with its retry. `screen.states` still asks only for empty, loading and error.
  - **`checkCard` writes the episode trace** (D-6, US-106-AC2). In Node, each call also writes a `card` check event to the trace of the app at or above `{ trace: <dir> }` (default: the working directory), after it returns; `traceWritten()` resolves when that is done. `{ trace: false }`, a browser, or an app without `.ux-builder/` writes nothing, and the findings never change.
  - `@ux-builder/mcp`: `check_card` calls `checkCard` with `trace: false` and writes the event itself, for the app it serves, so a call is recorded once.

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
