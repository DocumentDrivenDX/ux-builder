# @ux-builder/design

## 1.0.0

### Major Changes

- 2fea36b: ux-builder writes into HELIX's documents and keeps none of its own (ADR-042; needs HELIX v0.20.0's UX types and sections).
  
  `@ux-builder/design` (breaking): UX decisions are proposed as HELIX ADRs tagged area:ui (`decision add`, `decision status`), experiments are DDx beads (`experiment start|end`), experience principles go in principles.md (`principle add`), users, needs and tasks are rows of the PRD's User Segments and User Needs and a feature's Task Model (`segment add`, `need add`, `task add`), and research is a study's HELIX research plan (`evidence add|claim|excerpt --study`, `test-kit --study`, `transcript add --study`, `observe import --study`). Test-session material, evaluation reports and insight exports are run output in the gitignored `docs/ux-builder/runs/`; `insights` proposes Journey Funnels for the metrics dashboard; approving the coverage map proposes the solution design's Experience Traceability; the brief is compiled from HELIX and says where each section comes from. Every change to HELIX is a proposal the person applies. The baseline command and the users, jobs, ux-decision, research-evidence, test-kit, usability-evaluation-report, insights, experiment and baseline document types are gone; `migrate` proposes an app's old documents into HELIX. A person sees HELIX's IDs and names only.
  
  `@ux-builder/ui`: `ux-builder-blueprint propose` fills HELIX's user-flow, wireframe and user-journey-map types and DESIGN.md's modalities, size classes and app frame; its draft types are gone. Blueprint tasks take their Task Model key and cite needs and users by name; journeys may be named without the `J-` prefix; a project rule names its principle by its words. The layout gains `runs`.
  
  `@ux-builder/audit`: `reports.html` lists every run by path, copying nothing in; journeys may be named without `J-`. The assessment's `report.md` is a ux-builder usability assessment report (`ux-builder:` frontmatter, `type: usability-assessment-report`) rather than claiming a HELIX type, and is no longer drafted from a HELIX template.
  
  `@ux-builder/create-app`: a created app gitignores `docs/ux-builder/assessments/` and `docs/ux-builder/runs/`, never overwrites an existing concerns.md, and names its starter journey `start`.
  
  `@ux-builder/trace`: a decision event's `ux` may be a HELIX ADR (`ADR-<nnn>`); older `UXD-<n>` traces stay valid.
  
  `@ux-builder/mcp`: `trace` describes study task keys and ADR IDs.

### Patch Changes

- Updated dependencies [2fea36b]
  - @ux-builder/ui@0.15.0
  - @ux-builder/audit@0.8.0
  - @ux-builder/trace@0.3.0

## 0.6.1

### Patch Changes

- da1fcba: Allow explicit marketplace plugin guidance with UX_BUILDER_SKILLS=plugin; persist the selection and skip project-local skill copies while retaining project mode by default.

## 0.6.0

### Minor Changes

- 4350756: The app frame is the person's choice (US-162, ADR-041). AppShell takes `frame`: `screen` (the content alone), `top-bar` (no navigation), `top-nav` (destinations across the top, a bottom bar on phones) or `side-nav` (the default). The blueprint records it in `supports.frame` and `check` warns when it no longer fits the destinations; wireframes, prototypes and the built app are drawn in it; `ux-builder-design modality` asks for it with the modality and recommends one from the destinations; the audit judges it by outcome.
- 88942e5: The guided design holds up in a real session (US-161): a re-wrapped paragraph or moved bold marker keeps an approval; core-2 leads to step 5; a changed item or the coverage map is approved again only after it is shown; metrics count the person's approvals per answer, start testing only at a step 7 the loop stays at, and count format-only reopenings; `evidence claim contradict` records a contradiction and asks; `validate` warns about unasked contradictions and a brief calling a dropped story confirmed. The prototype toolbar is folded and names journeys by goal, and a screen with no sample of its own is drawn from its content.

### Patch Changes

- Updated dependencies [4350756]
- Updated dependencies [88942e5]
  - @ux-builder/ui@0.14.0
  - @ux-builder/audit@0.7.0

## 0.5.0

### Minor Changes

- f11e073: Lessons from the first guided session (FEAT-018 GDL-82). `ux-builder-design explain <ID>` says what an ID such as U-1, J-1, J-find, T-2 or BR-1 names and where it lives, and `explain ids` lists every kind; the overview mentions them and the guide never shows a bare ID. HELIX stories are read without a type tag, and a near-miss tag such as `user-story` is read as `user-stories` and reported; the guides never hand the person a command to edit HELIX or guess a HELIX field. Asked for an audit, the guides ask whether the person wants the UI audit, the usability assessment, or both. The assessment's manifest and runs and the UI audit's report now live under `docs/ux-builder/` (`ux-assessment.yml`, `assessments/`, `audit-report/`), the manifest's paths still relative to the app; an app that keeps them at its top keeps working, `status` lists them and `ux-builder-design migrate` moves them.
- 309ec20: The person's time goes to decisions (FEAT-018 GDL-83, ADR-040). Review comes in three tiers: the foundations (brief, target users, jobs, stories, business rules, decisions) a table per kind (`ux-builder-design review table <kind>`, `review approve --kind <kind>`); what is built from them as one coverage map with its exceptions (`review map`, `review approve map [--accept <exception>]`); records need no approval. An approval holds through changes of frontmatter and formatting, and a change of meaning comes back as a diff. `intake` asks the open questions together after reading what exists, and `status` shows the decisions left before the first prototype. `evidence claim add|verify` grounds each claim in its source, and `validate` warns about an unchecked one that changes the design's direction. `proposals preview` and `proposals apply --accepted <ids>` apply HELIX proposals all or nothing, renumbering a clashing ID. `advance --until-decision` does the safe work and names the next decision. `metrics` measures the session against its targets. The build in place generates a working journey skeleton from the chosen blueprint (`create-app --prototype` regenerates it) and no longer adds starter HELIX documents that clash with the design's. The responsive-web verdict is judged by outcome at the chosen size classes (`ux-builder-audit --size-classes`); every report is listed on `docs/ux-builder/reports.html` (`ux-builder-audit reports`); and `ux-builder-audit doctor` checks the installed packages agree.

### Patch Changes

- Updated dependencies [f11e073]
- Updated dependencies [309ec20]
  - @ux-builder/audit@0.6.0
  - @ux-builder/ui@0.13.0

## 0.4.1

### Patch Changes

- a2aef96: Alignment fixes for the guided design (FEAT-018). `ux-builder-design step` no longer moves past a step that `core-1`, `core-2` or `core-3` closes until that checkpoint has passed or been skipped (exit 2), as CONTRACT-008 says. In an app on the `docs/ux-builder/` layout, `ux-builder-audit assess heuristics` and `assess hierarchy` now find the blueprint there instead of silently running without one. The package exports `./artifacts/*`; its output schema covers every command; messages and the MCP `design_status` description no longer name `docs/ux/`. The SDK's agent guidance names the blueprint's current path, and the skill's activity table uses the eight steps' names.
- Updated dependencies [a2aef96]
  - @ux-builder/audit@0.5.2
  - @ux-builder/ui@0.12.1

## 0.4.0

### Minor Changes

- 8477bbe: Design first, the app last (FEAT-018 GDL-81). `npm create @ux-builder/app <dir>` without `--modality` now asks nothing and writes a design folder: the guide, its skill and state, a starting blueprint and HELIX's skill, with no app code. The modality is asked during the design; when the design is ready the guide asks for the theme, pointing to the theme builder when no released theme carries the brand, and `npm create @ux-builder/app . -- --theme <name>` builds the app in that folder from the recorded modality and the designed blueprint, keeping every design document. `--modality` still makes the app at once; the starter no longer prompts for modalities. `ux-builder-design status` says what a design folder's build needs, and the glossary explains *theme*.

## 0.3.0

### Minor Changes

- 3a6a4c0: Business rules in the task model (FEAT-018 GDL-78): rules stay defined once in HELIX as `**BR-<n>** — <rule>`; blueprint tasks and journey steps cite them (`rules`), and the blueprint's `businessRules` says how the user meets each (trigger, before, blocked, recover), in the blueprint schema. `ux-builder-design validate` fails a cited rule HELIX does not define or whose experience is not designed; `test-kit` adds a task per rule in its trigger situation; `report` shows how people fared with each rule and lists untested ones; `trace` and `impact` follow rules to their tasks, journeys and screens.
- 5fb8cf7: The guided conversation (FEAT-018 GDL-79): `overview` gives the eight steps up front; `status` leads with "Step n of 8" (change mode has four, an existing app's baseline comes before step 1) and `step next` moves on; `explain <term>` says what a term means and why it is valuable, from a glossary in the package; and every item the guide produces (each target user, job, story, task, business rule, journey, alternative, decision, screen, kit, report, insight and experiment) awaits the person's review: `review` lists them, `review show` gives the content to present inline, feedback and how it was addressed are recorded, `review approve` records the person's words and is refused while feedback is open, an item changed after approval is listed again, and checkpoints and `step next` refuse while items of their steps await review. The skill opens a first session with the overview, says which step the person is on, explains terms the first time they come up, and shows items one at a time for approval.
- f701d1a: The design work lives under `docs/ux-builder/` (FEAT-018 GDL-80): the design documents, the blueprint and its alternatives (`blueprint/`), exploratory prototypes (`prototypes/`), HELIX proposals (`helix-proposals/`), comparisons, drawings and wireframes. New apps from create-app put the blueprint at `docs/ux-builder/blueprint/app.blueprint.json`, and the blueprint CLI, the audit and the MCP server look there by default. An app on the old layout keeps working where it is, each command says so, and `ux-builder-design migrate [--dry-run]` moves it with `git mv` and rewrites the app's references. `ux-builder-design modality` records the person's answer on modality and screen sizes; in a guided app `ux-builder-blueprint wireframes` and `prototype --explore` wait for it, and ask again when the blueprint's supports change.

### Patch Changes

- Updated dependencies [3a6a4c0]
- Updated dependencies [f701d1a]
  - @ux-builder/ui@0.12.0
  - @ux-builder/audit@0.5.1

## 0.2.0

### Minor Changes

- 4887401: Target users are evidence-backed records (FEAT-018 GDL-77): `docs/ux/users.md` holds a row per user (`U-<n>`) with its context, needs, the jobs it holds with an importance for each, and evidence, confidence and status, checked by `validate`. The brief's Target users comes from it; blueprint tasks name the users they serve (`tasks[].users`, in the blueprint schema); the test kit's screener asks about each user and its context, scenarios say who each task is for, and the observation sheet has a `user` column, which the evaluation report breaks its measures down by; `trace U-<n>` follows a user to its jobs, tasks and journeys; `status` counts target users.

### Patch Changes

- Updated dependencies [4887401]
  - @ux-builder/ui@0.11.1

## 0.1.1

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
