# @ux-builder/design

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
