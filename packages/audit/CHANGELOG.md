# @ux-builder/audit

## 0.5.1

### Patch Changes

- f701d1a: The design work lives under `docs/ux-builder/` (FEAT-018 GDL-80): the design documents, the blueprint and its alternatives (`blueprint/`), exploratory prototypes (`prototypes/`), HELIX proposals (`helix-proposals/`), comparisons, drawings and wireframes. New apps from create-app put the blueprint at `docs/ux-builder/blueprint/app.blueprint.json`, and the blueprint CLI, the audit and the MCP server look there by default. An app on the old layout keeps working where it is, each command says so, and `ux-builder-design migrate [--dry-run]` moves it with `git mv` and rewrites the app's references. `ux-builder-design modality` records the person's answer on modality and screen sizes; in a guided app `ux-builder-blueprint wireframes` and `prototype --explore` wait for it, and ask again when the blueprint's supports change.
- Updated dependencies [3a6a4c0]
- Updated dependencies [f701d1a]
  - @ux-builder/ui@0.12.0

## 0.5.0

### Minor Changes

- d808143: Each finding in the assessment report says where it came from: an agent recommendation, a human observation (verified), or a design-team note (not user evidence). `assess validate-report` refuses a finding labelled `source: human` that is not a real-user finding, and a design-team note typed real-user (FEAT-018 GDL-58).
- 1c2759b: The assessment gains a heuristic inspection pass (`assess heuristics`, `heuristics.json`: every walked screen against Nielsen's ten heuristics, error prevention and recovery, information hierarchy and navigation complexity; `validate-report` fails a missing entry), an information-hierarchy check (`assess hierarchy`, also on exploratory prototype pages), and agent-measured task metrics (`assess metrics`, `metrics.json`, shown in the report with the statement that agents navigate differently from people). Walkthrough steps gain `screen`, `at`, `failed`, `notFound` and `error`; findings gain `source: agent | human | design-team` (FEAT-018).

### Patch Changes

- Updated dependencies [b621adc]
- Updated dependencies [041e1b1]
- Updated dependencies [73599b0]
- Updated dependencies [11e98a6]
- Updated dependencies [0e3e6e7]
- Updated dependencies [db0c69e]
- Updated dependencies [75582cf]
- Updated dependencies [b719e23]
- Updated dependencies [de6f614]
- Updated dependencies [0cda9d7]
- Updated dependencies [1e4ac6b]
  - @ux-builder/ui@0.11.0

## 0.4.1

### Patch Changes

- Updated dependencies [d9967eb]
  - @ux-builder/ui@0.10.0

## 0.4.0

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
  - @ux-builder/ui@0.9.0

## 0.3.0

### Minor Changes

- 319544e: The audit and the assessment report by journey, with every rule spelled out (FEAT-014 MOD-08 to MOD-10, FEAT-015 RPT-01 to RPT-08):
  
  - Every audit finding names its check (`check`) and the catalogue rule it breaks: `ruleId`, `rule: { id, title, statement, sources }`, `sources` and `fix`; theme findings name their `theme.*` rule, and a contrast finding's fix starts with the measured ratio. `rule` no longer holds the check's name: read `check`.
  - `--modality responsive-web,chat,hybrid-chat` (or the blueprint's `supports.modalities`) chooses the widths and rule families. `report.json` gains `verdicts.theme` (declared theme, design system, applied, SDK-only, contrast per appearance) and `verdicts.modality` (the SDK components each modality needs, its rule families, the fixes), `pages` with the screen each maps to, and `journey`/`step` on findings.
  - `index.html` opens with the verdicts and a *Rules broken* table, then each blueprint journey step by step with its screen's screenshot and findings, then *Other screens*; without journeys, by screen.
  - `assess report` orders findings journey → state → step (or the state's *General*), each with its rule ID and statement or heuristic and source, evidence, severity 0 to 4 and fix; `report.md` is a HELIX `usability-evaluation-report` with `ddx:` frontmatter, drafted from the installed HELIX's template when it has that type. `assess validate-report` fails a finding that names neither `rule` nor `heuristic`.
  - `assess video --pace slow|normal|fast`: a step holds 2 s and a finding max(5 s, its words at 200 a minute), scaled 1.5 or 0.6; captions carry the rule ID and statement, the problem and the fix; the chapter track has a chapter per step, `J-review · step 2: entry`.
- 63176cc: `ux-builder-audit assess video` turns a UX assessment into walkthrough videos for the product or technical leader who owns the app (FEAT-013, US-091 to US-095):
  
  - It replays each journey the agent walked (each walkthrough step now records its browser action as `do`), the main path and each walked alternate as chapters, at a human pace with a cursor, signed in from the role's storage state before recording starts. At each checkpoint it checks the page is in the state that was inspected, stops the chapter with a card if not, and holds while each finding there is read.
  - `video/<journey>.mp4` shows each finding where it was found: its elements outlined, and its problem and recommendation in plain English (each finding's new `plain` field), labelled **Checked** or **Judgment**. It needs `ffmpeg` on the PATH, which the package does not ship; without it the stage is partial and the player still works.
  - `video/index.html` is an offline player in the ux-builder theme: findings pop up over the video, pause it, expand for the checkpoint's screenshot and confidence, link to the report, and can be filtered and stepped through by keyboard.
  - `evidence.redact` selectors and text, and every password field, are masked from the first frame, including content that appears later and inside modal dialogs. A page without the mask discards the journey's video.
  - `assess report` links each finding to its moment in the player, and `evidence.json` lists the videos. `validate-report` checks replay steps, secrets by reference, plain English, and that a video shows only backlog findings where they were found.
  - New manifest field `video` (`viewports`, `holdSeconds`, `autoPause`); new records `annotations` and `video`.

### Patch Changes

- Updated dependencies [ce02a66]
  - @ux-builder/ui@0.8.0

## 0.2.0

### Minor Changes

- 5dd7190: `ux-builder-audit assess` walks AI journeys in three scenarios and journeys from the app's blueprint (FEAT-011 step 6, US-082; FEAT-012 step 3, US-088):
  
  - A manifest journey with `ai: true` declares `scenarios.normal`, `scenarios.errorProne` and `scenarios.risky` (each `{ description, inputs?, step? }`; `risky.step` is the high-impact step). `assess validate` reports each one missing.
  - `assess plan` gives an AI journey its rubric, `ai.heuristics`: the AI rules of the installed `@ux-builder/ui` catalogue for the journey's roles (its blueprint screens' `ai.roles`, else every AI role), `review` heuristics included. It also writes the journey's three scenario `walkthroughs`. `validate-report` requires each finding of an AI journey to name one of these rules (`rule`, a new optional finding field).
  - `assess inspect --scenario risky`: a replay stops at the approval (`data-piq-ai="approval"`), records it (and `approval.png`), chooses Deny and takes nothing more. If no approval appears before the high-impact step (`--high-impact-step`, a step marked `highImpact: true`, or the journey's `risky.step`), it stops before that step and records a P1 `agent.approve-high-impact`. A replay step that would activate an approve control (`data-piq-ai-control="approve"`) is always refused (`blocked: restricted`).
  - `assess inspect --scenario errorProne` records whether the error is shown in place and whether the user can recover without restarting (`agent.recover`, `ai.improve-request`).
  - A manifest journey can be `{ blueprint: J-…, role, priority }`. Its story, criteria, entry screen and steps come from `app.blueprint.json`, or from the new optional manifest field `blueprint` (a path). A journey that gives `blueprint` together with its own `story`, `criteria` or `entry` is refused, as is a blueprint journey ID that the blueprint does not have. `assess plan` turns each alternate into a walkthrough of a journey-and-state pair.
  - The ux-builder-assess skill describes the scenarios and the rule never to approve.
- f02139a: AI checks (FEAT-011, US-078 to US-080), warnings for this minor release: `ai-disclose`, `ai-correct`, `ai-stop`, `ai-starters`, `ai-declared`, `agent-approval`, `agent-plan`, `agent-interrupt`, `agent-who-acts`, `agent-recover`, `agent-summary`, `genui-review-prefill`, `card-input-label` and `card-narrow-first`. They run only on elements with CONTRACT-005's AI markup (`data-piq-ai` and its companions), so an app without it gets no AI finding; each finding names its rule (`ai.disclose`, `agent.recover`, …) and its sources. New option `--blueprint <file>`: AI markup on a screen whose blueprint declares no AI role is reported; name the screen with `data-piq-screen="<screen id>"` on the page's root.
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

- 72051df: `ux-builder-audit assess` now does what CONTRACT-006 says it does (AR-2026-10-21 C1 to C6):
  
  - `propose` also writes `proposals/improvement-backlog.patch`. This patch proposes the backlog as an entry in the app's HELIX `improvement-backlog`: new rows in an existing instance, or a new instance drafted from the catalogue type's template. `apply-check improvement-backlog` checks the patch's target.
  - `browser --manifest` and `inspect` refuse `restrictions.excludeIntegrations`. A replay takes none of its steps if any step declares a denied action, declares an action that `restrictions.allow` does not list, or leaves the origins. Each refused step is recorded `blocked: restricted`.
  - `limits.runMinutes`, `limits.steps` and `limits.journeyMinutes` are enforced. `inspect` refuses a step past a limit (`blocked: limit`) and records the `walkthrough` stage `partial`. `browser --run` stops when the run's time is spent.
  - When no browser answers at `--cdp`, `inspect` records the `walkthrough` stage `blocked`. When a role's `auth.env` is not set, `plan` blocks that journey's pairs as an authentication barrier and exits 1.
  - `inspect` writes what `evidence.capture` names (screenshot, tree or both).
  - `compare` lists the earlier baseline's failures in `comparison.json`, and the report shows them.
  - `schema/evidence.schema.json` is new, and `validate-report` checks `evidence.json` against it.
  - The skill tells the agent about the excluded integrations, the denied actions and the limits.
- 062d20f: Ship `examples/` in the package: the README and the `ux-builder-assess` skill point to `examples/ux-assessment.workflow.yml`, which was left out of the published files.
- 524c781: A new app starts on the latest HELIX (FEAT-010).
  
  - `@ux-builder/create-app`: creating an app fetches the latest HELIX release's plugin package from GitHub, verifies it (GitHub's SHA-256 digest, its version, its contents; a strict tar reader that refuses links and paths outside it), and installs HELIX's skill and catalogue as the app's project skill in `.claude/skills/helix/`, with `HELIX-VERSION.json`. It writes `.helix.yml` and drafts the app's HELIX documents from that release's own templates: product vision, PRD, concerns, FEAT-001 and US-001 for the starter screen, `DESIGN.md`, the test plan and STP-001, with the starter's facts filled in and the owner's decisions left as placeholders. The app also gets `ux-assessment.yml`, a Playwright test citing US-001's criteria (`npm run test:e2e`) and guidance that puts HELIX first. Offline, the HELIX bundled at publish is used, with the reason; `--helix-version <tag>` pins a release, `--helix-offline` makes no request, `--no-helix` leaves HELIX out.
  - `@ux-builder/audit`: the assessment also finds HELIX installed as a project skill (`.claude/skills/helix/references`).
- Updated dependencies [56cb554]
- Updated dependencies [b5f8a50]
- Updated dependencies [47b71f8]
- Updated dependencies [525f771]
- Updated dependencies [7c493b0]
- Updated dependencies [1777df9]
- Updated dependencies [b51a231]
  - @ux-builder/ui@0.7.0

## 0.1.2

### Patch Changes

- 41fa7d6: Audit the app's own markup inside the SDK's frame and patterns. Anything inside a `.piq-*` element was trusted as the SDK's, so in an app built on `AppShell`, `Page`, `Stack`, `Card` or a screen pattern, as the guidance says to build, hard-coded colours, fonts, radii, hand-drawn icons and native controls went unreported, and their contrast failures counted as the SDK's warnings. An element inside the SDK is now the app's when it, or its markup up to the SDK element, has an inline style or a class of its own, or when it is a control, picture or icon. Also: `patterns.css` bundled by Lightning CSS (Vite), which merges a selector list into one `:is()`, is no longer reported as the app restyling a widget.
- Updated dependencies [9f52368]
  - @ux-builder/ui@0.6.3

## 0.1.1

### Patch Changes

- 7bee056: Fix the favicon for a theme whose mark a bundler inlines as a `data:` URI (Vite does for files under 4 KB, as with `ux-builder-databricks`): `ThemeProvider` cut the URI at its first quote or bracket, so the tab showed no icon or a broken one. The audit now reads the URI whole too, and checks the favicon on the provider's element rather than a `data-theme` that the app's `index.html` puts on `<html>`, as the starter does.
- Updated dependencies [7bee056]
- Updated dependencies [4803047]
  - @ux-builder/ui@0.6.2
  - @ux-builder/tokens@1.6.0
