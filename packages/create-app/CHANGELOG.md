# @ux-builder/create-app

## 0.12.1

### Patch Changes

- da1fcba: Allow explicit marketplace plugin guidance with UX_BUILDER_SKILLS=plugin; persist the selection and skip project-local skill copies while retaining project mode by default.
- Updated dependencies [da1fcba]
  - @ux-builder/design@0.6.1

## 0.12.0

### Minor Changes

- 4350756: The app frame is the person's choice (US-162, ADR-041). AppShell takes `frame`: `screen` (the content alone), `top-bar` (no navigation), `top-nav` (destinations across the top, a bottom bar on phones) or `side-nav` (the default). The blueprint records it in `supports.frame` and `check` warns when it no longer fits the destinations; wireframes, prototypes and the built app are drawn in it; `ux-builder-design modality` asks for it with the modality and recommends one from the destinations; the audit judges it by outcome.

### Patch Changes

- 88942e5: The guided design holds up in a real session (US-161): a re-wrapped paragraph or moved bold marker keeps an approval; core-2 leads to step 5; a changed item or the coverage map is approved again only after it is shown; metrics count the person's approvals per answer, start testing only at a step 7 the loop stays at, and count format-only reopenings; `evidence claim contradict` records a contradiction and asks; `validate` warns about unasked contradictions and a brief calling a dropped story confirmed. The prototype toolbar is folded and names journeys by goal, and a screen with no sample of its own is drawn from its content.
- Updated dependencies [4350756]
- Updated dependencies [88942e5]
  - @ux-builder/ui@0.14.0
  - @ux-builder/design@0.6.0
  - @ux-builder/audit@0.7.0

## 0.11.0

### Minor Changes

- f11e073: Lessons from the first guided session (FEAT-018 GDL-82). `ux-builder-design explain <ID>` says what an ID such as U-1, J-1, J-find, T-2 or BR-1 names and where it lives, and `explain ids` lists every kind; the overview mentions them and the guide never shows a bare ID. HELIX stories are read without a type tag, and a near-miss tag such as `user-story` is read as `user-stories` and reported; the guides never hand the person a command to edit HELIX or guess a HELIX field. Asked for an audit, the guides ask whether the person wants the UI audit, the usability assessment, or both. The assessment's manifest and runs and the UI audit's report now live under `docs/ux-builder/` (`ux-assessment.yml`, `assessments/`, `audit-report/`), the manifest's paths still relative to the app; an app that keeps them at its top keeps working, `status` lists them and `ux-builder-design migrate` moves them.
- 309ec20: The person's time goes to decisions (FEAT-018 GDL-83, ADR-040). Review comes in three tiers: the foundations (brief, target users, jobs, stories, business rules, decisions) a table per kind (`ux-builder-design review table <kind>`, `review approve --kind <kind>`); what is built from them as one coverage map with its exceptions (`review map`, `review approve map [--accept <exception>]`); records need no approval. An approval holds through changes of frontmatter and formatting, and a change of meaning comes back as a diff. `intake` asks the open questions together after reading what exists, and `status` shows the decisions left before the first prototype. `evidence claim add|verify` grounds each claim in its source, and `validate` warns about an unchecked one that changes the design's direction. `proposals preview` and `proposals apply --accepted <ids>` apply HELIX proposals all or nothing, renumbering a clashing ID. `advance --until-decision` does the safe work and names the next decision. `metrics` measures the session against its targets. The build in place generates a working journey skeleton from the chosen blueprint (`create-app --prototype` regenerates it) and no longer adds starter HELIX documents that clash with the design's. The responsive-web verdict is judged by outcome at the chosen size classes (`ux-builder-audit --size-classes`); every report is listed on `docs/ux-builder/reports.html` (`ux-builder-audit reports`); and `ux-builder-audit doctor` checks the installed packages agree.

### Patch Changes

- Updated dependencies [f11e073]
- Updated dependencies [309ec20]
  - @ux-builder/design@0.5.0
  - @ux-builder/audit@0.6.0
  - @ux-builder/ui@0.13.0

## 0.10.0

### Minor Changes

- 8477bbe: Design first, the app last (FEAT-018 GDL-81). `npm create @ux-builder/app <dir>` without `--modality` now asks nothing and writes a design folder: the guide, its skill and state, a starting blueprint and HELIX's skill, with no app code. The modality is asked during the design; when the design is ready the guide asks for the theme, pointing to the theme builder when no released theme carries the brand, and `npm create @ux-builder/app . -- --theme <name>` builds the app in that folder from the recorded modality and the designed blueprint, keeping every design document. `--modality` still makes the app at once; the starter no longer prompts for modalities. `ux-builder-design status` says what a design folder's build needs, and the glossary explains *theme*.

### Patch Changes

- Updated dependencies [8477bbe]
  - @ux-builder/design@0.4.0

## 0.9.0

### Minor Changes

- f701d1a: The design work lives under `docs/ux-builder/` (FEAT-018 GDL-80): the design documents, the blueprint and its alternatives (`blueprint/`), exploratory prototypes (`prototypes/`), HELIX proposals (`helix-proposals/`), comparisons, drawings and wireframes. New apps from create-app put the blueprint at `docs/ux-builder/blueprint/app.blueprint.json`, and the blueprint CLI, the audit and the MCP server look there by default. An app on the old layout keeps working where it is, each command says so, and `ux-builder-design migrate [--dry-run]` moves it with `git mv` and rewrites the app's references. `ux-builder-design modality` records the person's answer on modality and screen sizes; in a guided app `ux-builder-blueprint wireframes` and `prototype --explore` wait for it, and ask again when the blueprint's supports change.

### Patch Changes

- Updated dependencies [3a6a4c0]
- Updated dependencies [5fb8cf7]
- Updated dependencies [f701d1a]
  - @ux-builder/design@0.3.0
  - @ux-builder/ui@0.12.0
  - @ux-builder/audit@0.5.1

## 0.8.1

### Patch Changes

- Updated dependencies [4887401]
  - @ux-builder/design@0.2.0
  - @ux-builder/ui@0.11.1

## 0.8.0

### Minor Changes

- 6774ee6: New apps get the guided design loop: `@ux-builder/design` as a dev dependency, the `ux-builder-design` skill and an empty design state, with `CLAUDE.md`, `AGENTS.md` and the Home screen pointing to `/ux-builder-design`. `--mcp` also writes `.mcp.json` for the ux-builder MCP server; without it none is written.
- b719e23: `ux-builder-blueprint prototype --explore` writes a disposable, clickable prototype under `prototype/<name>/` (each screen, state and size class, with a prototype banner, a state and size switcher and every action linked), optionally once per `--design-system`; `--archive <name>` puts one away. The new lint rule `ux-builder/no-prototype-import` (on in the recommended config and in new apps) keeps app code from importing prototypes. Wireframes can render in any theme.

### Patch Changes

- Updated dependencies [d808143]
- Updated dependencies [1c2759b]
- Updated dependencies [b621adc]
- Updated dependencies [041e1b1]
- Updated dependencies [73599b0]
- Updated dependencies [11e98a6]
- Updated dependencies [eb4111f]
- Updated dependencies [0e3e6e7]
- Updated dependencies [db0c69e]
- Updated dependencies [75582cf]
- Updated dependencies [b719e23]
- Updated dependencies [de6f614]
- Updated dependencies [0cda9d7]
- Updated dependencies [1e4ac6b]
  - @ux-builder/audit@0.5.0
  - @ux-builder/ui@0.11.0
  - @ux-builder/trace@0.2.0
  - @ux-builder/design@0.1.1

## 0.7.1

### Patch Changes

- Updated dependencies [d9967eb]
  - @ux-builder/ui@0.10.0
  - @ux-builder/audit@0.4.1

## 0.7.0

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

### Patch Changes

- Updated dependencies [690a14d]
  - @ux-builder/audit@0.4.0
  - @ux-builder/ui@0.9.0

## 0.6.0

### Minor Changes

- ce02a66: An app declares its modalities, and they choose its shell, rules and components (FEAT-014, ADR-032; US-096 to US-098):
  
  - `npm create @ux-builder/app` asks which modalities the app has (`responsive-web`, `chat`, `hybrid-chat`) as a multi-select in a terminal, and takes `--modality <list>` otherwise; without a terminal it is required. Unknown and future (native) modalities are refused, and a `--blueprint` whose `supports.modalities` disagrees exits 1 naming both.
  - The starter is the empty shell for the modalities, with no sample domain: an `AppShell` with an empty Home screen, a full-screen `Conversation`, a `Conversation` that draws Adaptive Card parts, or an `AppShell` with Home and Assistant. Its HELIX FEAT-001 and US-001 describe the shell, and its e2e test cites them.
  - The blueprint gains `supports.modalities` and `screens[].path`. `blueprint.valid` fails a future modality and warns when `sizeClasses` or `inputs` miss what the modalities derive; a screen may use the assistant's `Conversation` as its pattern.
  - `rulesFor({ modalities })` and MCP `get_rules` with `modalities` expand them to size classes, inputs and AI roles and keep their rule families; the `card.*` rules apply to `hybrid-chat` only. `get_guidance` with `modalities`, `AGENTS.md` and the skill name each modality's components and rule families.

### Patch Changes

- Updated dependencies [ce02a66]
- Updated dependencies [319544e]
- Updated dependencies [63176cc]
  - @ux-builder/ui@0.8.0
  - @ux-builder/audit@0.3.0

## 0.5.0

### Minor Changes

- 524c781: A new app starts on the latest HELIX (FEAT-010).
  
  - `@ux-builder/create-app`: creating an app fetches the latest HELIX release's plugin package from GitHub, verifies it (GitHub's SHA-256 digest, its version, its contents; a strict tar reader that refuses links and paths outside it), and installs HELIX's skill and catalogue as the app's project skill in `.claude/skills/helix/`, with `HELIX-VERSION.json`. It writes `.helix.yml` and drafts the app's HELIX documents from that release's own templates: product vision, PRD, concerns, FEAT-001 and US-001 for the starter screen, `DESIGN.md`, the test plan and STP-001, with the starter's facts filled in and the owner's decisions left as placeholders. The app also gets `ux-assessment.yml`, a Playwright test citing US-001's criteria (`npm run test:e2e`) and guidance that puts HELIX first. Offline, the HELIX bundled at publish is used, with the reason; `--helix-version <tag>` pins a release, `--helix-offline` makes no request, `--no-helix` leaves HELIX out.
  - `@ux-builder/audit`: the assessment also finds HELIX installed as a project skill (`.claude/skills/helix/references`).
- 7c493b0: Interaction and IA rules, a blueprint check, and audit checks for them (FEAT-008).
  
  - `@ux-builder/ui`: 29 interaction and IA rules (navigation by size class, modals, safeguards on destructive actions, states, emphasis, embedded views), each in the SDK's own words with links to Apple's HIG, Material 3, WCAG 2.2 and the WAI-ARIA APG, plus 8 recipes. They are in `catalogue.json` (`interaction`) and `AGENTS.md`. The new entry point `@ux-builder/ui/blueprint` exports `rulesFor`, `checkBlueprint`, `blueprintSchema`, `findRecipes` and `skeleton`. The new command `ux-builder-blueprint` has `init` and `check`, which checks an `app.blueprint.json` against the rules.
  - `@ux-builder/audit`: five new checks, warnings for this minor release: `one-modal`, `modal-contract`, `one-primary-action`, `nav-per-breakpoint` (with `--width`) and `line-length`. Their findings carry `ruleId` and `sources`. `--write-baseline` and `--baseline` let an existing app fail only on new findings; findings that are fixed are listed as resolved.
  - `@ux-builder/mcp`: five new tools, `get_rules`, `list_recipes`, `get_recipe`, `get_blueprint_schema` and `check_blueprint`. The guidance states the plan, check, build, lint and audit loop.
  - `@ux-builder/create-app`: a new app gets `app.blueprint.json`, a `check:blueprint` script and a CI step for it. `--blueprint <file>` starts from your own plan, and a plan with an error is refused.
  
  ux-builder is not affiliated with or endorsed by Apple or Google.

### Patch Changes

- 226efbf: HELIX in a new app, aligned with FEAT-010. The release request honours `HTTPS_PROXY`, `HTTP_PROXY` and `NO_PROXY` through undici's `EnvHttpProxyAgent`; `undici` is now a dependency (MIT). If the bundled HELIX is missing or bad when it is needed, the app is created without HELIX, and the output says why, instead of creation failing. `--helix-offline` with `--helix-version` is refused. With `--no-helix`, the app's `e2e/starter.spec.js` cites no criteria. A missing template in the installed HELIX is printed, naming its type. The app's `ux-assessment.yml` lists the `lint` and `audit` test commands as well as `e2e`.
- Updated dependencies [56cb554]
- Updated dependencies [b5f8a50]
- Updated dependencies [5dd7190]
- Updated dependencies [72051df]
- Updated dependencies [47b71f8]
- Updated dependencies [f02139a]
- Updated dependencies [062d20f]
- Updated dependencies [525f771]
- Updated dependencies [524c781]
- Updated dependencies [7c493b0]
- Updated dependencies [1777df9]
- Updated dependencies [b51a231]
- Updated dependencies [a329b1f]
  - @ux-builder/ui@0.7.0
  - @ux-builder/audit@0.2.0

## 0.4.2

### Patch Changes

- 2d312a3: Fix `npm create @ux-builder/app` doing nothing: run through npm's symlinked bin, the starter exited without writing the app or printing anything. It now scaffolds the app as documented.
- Updated dependencies [7bee056]
- Updated dependencies [4803047]
  - @ux-builder/ui@0.6.2
  - @ux-builder/audit@0.1.1
  - @ux-builder/tokens@1.6.0
