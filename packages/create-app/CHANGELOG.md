# @ux-builder/create-app

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
