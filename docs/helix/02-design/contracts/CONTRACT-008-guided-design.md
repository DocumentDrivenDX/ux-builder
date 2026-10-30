---
ddx:
  id: CONTRACT-008
  type: contract
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-036
    - kind: informed_by
      to: ADR-037
    - kind: informed_by
      to: ADR-038
    - kind: informed_by
      to: ADR-039
    - kind: informed_by
      to: CONTRACT-005
    - kind: informed_by
      to: CONTRACT-006
    - kind: informed_by
      to: CONTRACT-007
---

# Contract

**Contract ID**: CONTRACT-008 — Guided design
**Type**: package, commands, data formats and documents (`@ux-builder/design`, `ux-builder-design`, the design state, the `docs/ux-builder/` types) and the amendments FEAT-018 makes to CONTRACT-004, CONTRACT-005, CONTRACT-006 and CONTRACT-007
**Version**: v1 (planned, `@ux-builder/design` 0.1.0)
**Status**: draft — 2026-10-23, with ADR-036 to ADR-039
**Related**: FEAT-018, SD-006, ADR-025, ADR-030, ADR-035

## Purpose

Defines what an app and an agent can rely on from the guided design loop:
the package, its commands, the files it reads and writes, and the
additions to the blueprint, the assessment, the trace and the widgets.

## Scope and Boundaries

- In scope:
  - `@ux-builder/design`: its skill, artifact templates, schemas and the
    `ux-builder-design` command;
  - `.ux-builder/design-state.json`;
  - the `docs/ux-builder/` document types;
  - the blueprint, assessment, trace and widget amendments listed below;
  - the MCP tools that wrap these.
- Out of scope:
  - what the agent says or judges (the skill guides it; the commands check
    what it writes);
  - HELIX's own types and their mapping (FEAT-018 stage 2);
  - the app's analytics, support and feedback systems.

## Normative Surface

### Package

| Item | Value |
|---|---|
| Name | `@ux-builder/design`, public, dev dependency |
| Binary | `ux-builder-design` |
| Exports | `.` (the functions behind every command), `./schema/*.json`, `./artifacts/*` |
| Skill | `skill/ux-builder-design/SKILL.md`, installed to the app's `.claude/skills/ux-builder-design/` |
| Templates | `artifacts/<type>/meta.yml`, `template.md`, `prompt.md`, `example.md` |
| Dependencies | `@ux-builder/ui`, `@ux-builder/audit`, `@ux-builder/trace`, `ajv`, `yaml`; nothing that makes a network request |

The package makes no network request and calls no model (ADR-036 rule 3).

### Commands

Every command accepts `--json` (machine output on stdout), `--app <dir>`
(default: the nearest folder at or above the working directory with
`.ux-builder/`, `docs/ux-builder/blueprint/app.blueprint.json` or, on the old layout, `app.blueprint.json`; else the git root; else the working directory) and prints a one-line summary
otherwise. Every command has an exported function that returns the `--json`
object, named for the command in camelCase where that is unambiguous; the
others are `setMode` (`mode`), `setStep` (`step`), `confirmModality`
(`modality`), `checkpoint` (`state checkpoint`), `excerptAdd` (`evidence
excerpt add`) and `observeImport` (`observe import`). `schema/output.schema.json`
describes each command's `--json` under the function's name, except
`mode`, `step` and `modality`, which keep the command's.

| Command | Does | Writes |
|---|---|---|
| `init [--mcp]` | Installs the skill, writes an empty design state; runs `ux-builder-blueprint init` when there is no blueprint; reports when the app has no ux-builder | `.claude/skills/ux-builder-design/`, `.ux-builder/design-state.json`, `.mcp.json` with `--mcp` |
| `status` | Where the loop stands: activity, mode, checkpoints, open questions, untested assumptions, next action, documents in `docs/ux-builder/` | nothing |
| `state get [<path>]` | Reads the state, or one field by dotted path | nothing |
| `state set <path> <json>` | Writes one field, validated against the schema | the state |
| `state checkpoint <id> (--answer <text> [--declined] \| --skip --reason <text>)` | Records a checkpoint answer (`--declined`: the person said no or not yet; never counts as passed) or skip; also writes a trace `decision`. A passed `core-1` moves the loop to step 4 (activity `explore`), `core-2` to step 5, Design the structure, still `explore` (forward only; US-161), replacing a `next` that waited on a passed checkpoint with what that step does first | the state, the trace |
| `mode full\|change [--why <text>]` | Sets the working mode | the state |
| `baseline` | Retired (ADR-042): exits 2, saying that HELIX's backfill drafts an existing app's PRD and stories, as proposals | nothing |
| `brief [--name <product>]` | Writes the experience brief from the PRD, principles.md's *Experience Principles*, the stories and the state, in seven sections: Product, Target users, Primary outcome, Primary jobs, Experience principles, Constraints, Open questions; each point marked with its status, and each hypothesis with what would confirm it. Notes any principle still in an older design state | `docs/ux-builder/brief.md`, `docs/ux-builder/brief.html` |
| `need add --need <need> --importance <l> [--evidence <study>] [--confidence <l>] [--status assumed\|validated\|invalidated]` | Proposes a row of the PRD's *User Needs* (ADR-042); the same need replaces its row. Refused with a bad level or status, or confidence above `low` with no evidence | the PRD's pending patch |
| `segment add --user <who> --context <c> [--need <need>]... [--evidence <study>] [--confidence <l>] [--status <s>]` | Proposes a row of the PRD's *User Segments*, its needs by name (each a *User Needs* row) | the PRD's pending patch |
| `task add --feature FEAT-<n> --task <t> --goal <g> [--user <who>]... [--need <need>]... [--business-rule BR-<n>]... [--realized-by <journey>]...` | Proposes a row of the feature's *Task Model* (after *Functional Areas*), with its key; refuses users, needs or features HELIX lacks | the feature's pending patch |
| `principle add --text <principle> [--rule <json>]` | Proposes the principle under principles.md's *Experience Principles* (a new principles.md when HELIX has none; ADR-042). A `rule` a check can express goes in `.ux-builder/principles.json`, keyed by the principle's words, which `ux-builder-blueprint check` applies as a project rule. Exits 2 with no HELIX or an unknown rule kind | `helix-proposals/helix/01-frame/principles.md.patch`, `.ux-builder/principles.json` |
| `evidence add <file> --kind <kind> --study <study> [--date] [--source] [--title]` | Proposes the source as a row of the study's HELIX research plan (`docs/helix/01-frame/research/<study>.md`, *Research Methods* > *Sources*; a new plan in HELIX's shape when there is none, ADR-042): kind, date and where it is kept, never its text. `--kind` is interview, analytics, support, feedback, survey or observation | `helix-proposals/helix/01-frame/research/<study>.md.patch` |
| `evidence list` | Each study's sources, claims and excerpts | nothing |
| `evidence claim add --study <study> --text <claim> --source <where> --basis <observed\|inferred[…]> --confidence high\|medium\|low [--direction "<supports\|weakens\|refutes>: <what>"] [--verified] [--contradicts <t>] [--unknown <t>]` | Proposes a row of the study's *Findings* > *Claims*, HELIX's columns (Claim, Source, Basis, Confidence, Direction, Verified, Contradicting, Unknown); refused without a source, a basis starting observed or inferred, or a confidence. A claim that weakens or refutes something, unverified and not `low`, is a warning | the study's pending patch |
| `evidence claim verify --study <study> --claim <its words> [--confidence <c>]` | Marks the claim (named by its words or their start) checked against its source by the agent itself | the study's pending patch |
| `evidence claim contradict --study <study> --claim <its words> --text <what the person said>` | What the person said goes against the claim (US-161): written in its Contradicting column and opened as a question for the person | the study's pending patch, `questions[]` |
| `evidence excerpt add --study <study> --participant <name or Pn> --text <quote> [--at <time>] [--source <which>]` | Proposes one quote the synthesis cites for the study's *Findings* > *Excerpts*: masked, by pseudonym (a name gets one, kept in `.ux-builder/participants.local.json`) | the study's pending patch |
| `decision add --question <q> --option <o>... --choice <o> --why <text> [--assumption <a>]... [--validation <v>] [--link <HELIX ID>]...` | Proposes a HELIX ADR in HELIX's ADR shape, tagged `area:ui`, its *Validation* *not tested*, and writes a trace `decision` event carrying its `ADR-` ID (ADR-042). Exits 2 when the app has no HELIX | `helix-proposals/helix/02-design/adr/ADR-<nnn>-<slug>.md.patch`, the trace |
| `decision status <ADR-nnn> tested\|refuted [--evidence <where>]` | Proposes the ADR's *Validation* result with the evidence and date, keeping the earlier result in its history | that ADR's pending patch |
| `impact "<change>" [--apply --set <changed blueprint>]` | Lists every artifact the change reaches, and `checkpointRequired: "significant-change"` when the change touches an item whose decision is `tested`; with `--apply`, makes the blueprint change, regenerates prototypes and the test kit, writes `propose` patches and a decision | listed files, with `--apply` |
| `trace <id>` | Everything linked to a `J-`, `T-`, journey, screen, `ADR-`, `<study>#<task>` or `F-` key, upstream and down | nothing |
| `test-kit --study <study> [--journey <id>]...` | Proposes the study's *Scenarios* (goals, no interface words), *Success Criteria* (by acceptance-criterion ID) and *Screener* for its research plan's *Research Methods*; writes the facilitator script, consent note, task list (`tasks.json`) and `observations.csv` (participant, task, completed, seconds, errors, assists, remark, problem, user) to `docs/ux-builder/runs/studies/<study>/`, keeping a sheet already filled in | the study's pending patch, its run folder |
| `observe import <file> --study <study>` | Imports observations (CSV or JSON) as findings with `source: human`, one per participant and task, key `F-` + 8 hex (stable per study, participant and task), by pseudonym, remarks masked; a sheet in the app is rewritten with pseudonyms | `docs/ux-builder/runs/studies/<study>/findings.json` |
| `transcript add <file> --study <study> --session <id> --consent-confirmed [--by <name>] [--cite <time>]...` | Proposes the transcript as a source of the study and the lines cited by timestamp, masked and by pseudonym, as *Findings* > *Excerpts*; records the consent (session, study, participants) in the design state. Refuses without consent, and refuses a recording | the study's pending patch, `consents[]` |
| `rubric [--alternative <name>]` | The rubric with predicted and observed columns; with observations, `observedTasks[]` (per kit task: completion rate, median seconds, error rate, assists) and `recurring[]` (problems seen in two or more sessions) | nothing |
| `report` | Writes the UX evaluation as run output: method, tasks, measures, the rubric (predicted, agent-measured, observed), findings by journey labelled human or agent, recommendations and what was not tested. A contradicted prediction refutes the assumptions behind it, a supported one confirms them. Proposes what people did as claims in each study's *Findings* (completion per scenario; problems seen in two or more sessions), updating them when run again | `docs/ux-builder/runs/evaluations/<date>/report.md`, the studies' pending patches, `assumptions[]` |
| `route <F-id>... [--decision <ADR-nnn> --status tested\|refuted]` | The findings chosen at `core-3` as a proposed patch adding rows to HELIX's improvement backlog (an existing `improvement-backlog` document, else a new one at `<root>/06-iterate/improvement-backlog.md`); with `--decision`, `decision status` with the latest report as evidence | `docs/ux-builder/helix-proposals/backlog/improvement-backlog.patch` |
| `ready [--for testing\|production]` | `--for testing`: the validated prototype passes lint, `check:blueprint` and the audit. Both also need the audit report newer than the blueprint, and every blueprint screen an audited page (`data-piq-screen` or path). `--for production` (default): also every covered criterion cited by a test, and the faked data and error handling listed, before checkpoint `core-3` (ADR-037 rule 4) | nothing |
| `insights <events.jsonl> [--support <file>] [--feedback <file>] [--date YYYY-MM-DD]` | Per-journey production insights (started, completed, completion, the step people leave most, failed searches, errors, feature use, time per step) and masked support and feedback entries linked to the journeys they mention, as run output; each journey's funnel proposed into HELIX's metrics dashboard, *Journey Funnels* (a new dashboard in HELIX's shape when there is none) | `docs/ux-builder/runs/insights/<date>/`, `helix-proposals/helix/06-iterate/metrics-dashboard.md.patch` |
| `diagnose --insight <date> [--journey <id>] --observation <o> --explanation <e>... --hypothesis <h> --alternative <name>` | Records a diagnosis: at least two explanations, the hypothesis and the alternative that tests it, in the design state and the insights; with `--journey`, proposed as that journey's funnel *Diagnosis* | `diagnoses[]`, the insights, the dashboard's pending patch |
| `experiment start --decision <ADR-nnn> --variant <alt> --metric <m> [--guardrail <m>]... --duration <days>` | Opens an experiment as a DDx bead (ADR-042) holding the hypothesis, the variant, the metrics, the duration and the stopping rule, only with one more passed `experiment` checkpoint than experiments started; its hypothesis from the latest diagnosis of that variant. `UX_BUILDER_DDX` names another `ddx`; without DDx it exits 2. Metrics with no `<root>/06-iterate/metrics/<name>.yaml` are proposed as metric-definition patches | a DDx bead, the design state, `docs/ux-builder/helix-proposals/metrics/<name>.patch` |
| `experiment end <bead> --result <file>` | Compares the success metric (`control`, `variant`) and each guardrail (`{ metric, control, variant, better: lower\|higher }`), records the hypothesis as supported only when the metric improved and every guardrail held (a guardrail holds unless it got worse by more than its `tolerance`: the result's, else the HELIX metric definition's; a number, a percent of the control, or a number with a unit), closes the bead with the result, proposes the decision's ADR *Validation* (`refuted` when the variant won, `tested` when the decision held), and sets `next` to ask `release` | the bead, the ADR's pending patch |
| `validate` | Checks ux-builder's own document (the brief), the blueprint's links into HELIX (the needs, users, rules and Task Model keys its tasks name), and the rules on what the guide proposes: studies' masked excerpts and claims, and the PRD's rated users and needs (ADR-042 decision 4). Drift between HELIX documents is HELIX's `validate` and `align` | nothing |
| `overview` | The eight steps (1 Define intent, 2 Understand users, 3 Model tasks, 4 Explore alternatives, 5 Design the structure, 6 Prototype, 7 Test with people, 8 Refine and improve), each with what the person does, what comes out, its terms and the checkpoint closing it; and change mode's four steps | nothing |
| `step next\|<n>` | Moves the loop to the next (or the given) step of its mode, setting the activity; `next` refuses while items of the current step await review, and in the full loop neither form moves past a step that `core-1`, `core-2` or `core-3` closes until it has passed or been skipped (exit 2) | the state's `step` |
| `explain [<term> \| <ID> \| ids] [--step <n>]` | What a term means and why it is valuable, from `glossary.json`; an ID (`U-1`, `J-find`, `BR-2`…) says what kind of thing it names and where it lives, with its term; `ids` lists every kind of ID; with `--step`, the terms that step introduces; with neither, every term. An unknown term exits 2 listing the known ones | nothing |
| `review [list]` | What awaits review, by tier (GDL-83): foundations (`brief`, `user:U-n`, `job:J-n`, `story:US-n` for stories the blueprint's journeys cite, `rule:BR-n`, `decision:ADR-nnn`), reviewed a table per kind; built items (`task:T-n`, `journey:J-x`, `alternative:<name>`, `screen:<id>`, `kit:<study>`), reviewed as the coverage map; records (`evidence:<study>`, `report:<date>`, `insight:<date>`, `experiment:<DDx bead>`) need no approval and hold no checkpoint. An item is pending when its meaning (its content without frontmatter, formatting made one form) differs from the one approved; a changed item carries the diff | nothing |
| `review table <kind>` | Every item of a foundation kind, each with its status and, when its meaning changed since approved, the diff; a built or record kind exits 2. Recorded as shown (US-161) | `.ux-builder/shown.local.json` (not committed) |
| `review map` | The coverage map: each need (the PRD's User Needs, by name) with the tasks that serve it, their journeys and the screens they walk; the exceptions (`gap:<need>` a need nothing serves, `untraced:task:…`, `untraced:journey:…`, `untraced:screen:…`, `undefined:BR-n`, `assumption:A-n` not seen at the last map approval); the built items it would approve, and those changed with their diffs. Recorded as shown | `.ux-builder/shown.local.json` |
| `review show <item>` | The item's content, to present inline in the conversation, and the diff when it changed since approved. Recorded as shown | `.ux-builder/shown.local.json` |
| `review feedback <item> --text <their words>` | Records the person's feedback, `FB-<n>`, open | the state's `feedback[]` |
| `review respond <FB-n> --text <what changed>` | Records how the feedback was addressed | that entry |
| `review approve (<item>... \| --kind <kind> \| map [--accept <exception>]...) --answer <their words>` | Records the approval of the items, of a foundation kind's pending items (`via: table`), or of every built item awaiting review (`via: map`), each with its meaning's hash, its whole content's hash and the meaning approved; refused (exit 2) while an item has open feedback, for the map while an exception is neither fixed nor accepted, and, for an item that changed after its approval or for the map approved again, until it was shown as it is now (`review show`, `review table`, `review map`; US-161). Meaning ignores a paragraph's line wrapping and bold or underline markers; an approval kept under an earlier normalization holds when its snapshot means the same now Approving the map also proposes it as the solution design's *Experience Traceability* (need, task, flow, view), when HELIX has a solution design (ADR-042) | the state's `reviews[]`; an `approval` event with the answer, and `formatOnly` for items reopened with every word unchanged |
| `intake` | The intake questions (product, users, outcome, jobs, constraints, sources) the app's sources (the brief, HELIX's PRD, the users and jobs tables, evidence, `src/`) do not answer, to ask together; those they answer, to confirm; and the budget | nothing |
| `advance --until-decision` | Checks the documents, keeps approvals through formatting changes, works out the coverage map, finds unverified claims and pending proposals; lists the agent's own work first; then the one decision the person must make next (intake, a foundation table, the map, a checkpoint, the modality, proposals) with what to show, a recommendation, the command that records it and what follows; and the budget. Records nothing | nothing |
| `metrics [turn --kind <kind> [--text <note>] \| mark <milestone>]` | The summary of `.ux-builder/metrics.jsonl` against the targets (at most 10 approvals before testing, at least 80% of turns `answer`, `decision`, `approval` or `correction`, no approval reopened by formatting, a first prototype within 30 active minutes, gaps over 10 minutes idle). Approvals are counted as the person gave them, one per distinct answer; testing starts at the `testing` milestone or a step 7 the loop does not leave; the formatting target counts approvals reopened with every word unchanged (US-161); `turn` records a human turn (`answer`, `decision`, `approval`, `correction`, `question`, `other`), `mark` a milestone (`prototype`, `testing`, `release`) | `.ux-builder/metrics.jsonl` |
| `proposals [preview]` | Every pending HELIX proposal in `helix-proposals/` in one line: what it creates or changes, an ID HELIX already uses and what it becomes, and a patch that no longer applies | nothing |
| `proposals apply --accepted <ids> [--dry-run]` | Applies the accepted proposals all or nothing: each patch and draft checked first (applies, frontmatter parses, `ddx.id` well formed); a new document whose `ddx.id` another document holds renumbered to the next free ID, its file renamed and every reference in the accepted set rewritten; on a failure nothing written, and a failed write restores what was there. Applied proposals move to `helix-proposals/applied/` | HELIX documents under the HELIX root; `proposals.json` |

Exit codes: 0 done; 1 a check failed or a finding at error severity; 2 bad
input or a refusal (named on stderr).

### Layout *(2026-10-24, GDL-80)*

Everything the guided design writes that is not HELIX's, under
`docs/ux-builder/` (`@ux-builder/ui/blueprint/paths` exports both layouts
and `layoutOf(app)`):

| What | Path | Before (an unmigrated app) |
|---|---|---|
| Design documents | `docs/ux-builder/<type path>` | `docs/ux/` |
| The blueprint | `docs/ux-builder/blueprint/app.blueprint.json` | `app.blueprint.json` |
| Alternatives | `docs/ux-builder/blueprint/app.blueprint.<name>.json` | `app.blueprint.<name>.json` |
| Exploratory prototypes | `docs/ux-builder/prototypes/<name>/` | `prototype/<name>/` |
| HELIX proposals | `docs/ux-builder/helix-proposals/` | `helix-proposals/` |
| Comparisons, drawings, wireframes | `docs/ux-builder/compare/`, `drawings/`, `wireframes/` | `blueprint-compare/`, `blueprint-drawings/`, `blueprint-wireframes/` |
| The assessment's manifest *(GDL-82)* | `docs/ux-builder/ux-assessment.yml` (its paths relative to the app) | `ux-assessment.yml` |
| Assessment runs *(GDL-82)* | `docs/ux-builder/assessments/<run>/` | `ux-assessment/<run>/` |
| Run output *(ADR-042)*: studies' session materials and observations, evaluations, insight exports; gitignored | `docs/ux-builder/runs/studies/<study>/`, `runs/evaluations/<date>/`, `runs/insights/<date>/` | `ux-builder-runs/` |
| The UI audit's report *(GDL-82)* | `docs/ux-builder/audit-report/` | `audit-report/` |
| Design state, trace | `.ux-builder/` (unchanged) | `.ux-builder/` |

The last three follow `reportsOf(app)`: under `docs/ux-builder/` in an app
that has it, unless the app still keeps `ux-assessment.yml` at its top (an
app made before GDL-82, until `migrate` moves them; `status` lists what is
left). An app is on the old layout only when it has old files and none of the
new; every tool then reads and writes the old paths and `status` (and the
blueprint CLI's writing commands, on stderr) says to migrate. New apps
(create-app, `init` in an app with no blueprint) start on the new layout.

| Command | Does | Writes |
|---|---|---|
| `migrate [--dry-run]` | Moves each old path to its new place (`git mv` for tracked files) and rewrites the old paths in the app's `package.json`, `ux-assessment.yml`, `CLAUDE.md`, `AGENTS.md`, `README.md`, `.github/workflows/*.yml` and design state. `--dry-run` lists the moves and files and changes nothing. Refuses (exit 2), changing nothing, when a destination exists | the moved files and those references |
| `modality --answer <their words> --modality <list> [--size-classes <list>] [--frame <frame>]` | Records which modalities (`responsive-web`, `chat`, `hybrid-chat`) and size classes the person says the app is for and, for responsive web, the app frame they chose (`screen`, `top-bar`, `top-nav`, `side-nav`; US-162), setting the blueprint's `supports`; refuses future and unknown values, responsive web without `--frame` (naming the four and the one recommended from the destinations), and `--frame` without responsive web (exit 2) | the blueprint, the state's `modality` |

In an app with a design state, `ux-builder-blueprint wireframes` and
`prototype --explore` exit 1, drawing nothing, until the state's
`modality` matches the blueprint's `supports.modalities` and
`supports.sizeClasses`.

### Design first *(2026-10-24, GDL-81)*

`npm create @ux-builder/app <dir>` without `--modality` or `--blueprint`
writes a design folder and asks nothing: `package.json` (`@ux-builder/design`
and `@ux-builder/ui` as dev dependencies; `postinstall` installs the
skill), the skill, a design state with `startedFrom: design`, a starting
blueprint, HELIX's skill and marker (no documents), `README.md`,
`AGENTS.md`, `CLAUDE.md`, `.gitignore`. `--theme` without `--modality`
there exits 1: the theme is chosen at the build.

`npm create @ux-builder/app <design folder> -- --theme <name>` builds the
app in place:

| Needs | Else (exit 1, nothing written) |
|---|---|
| A design folder not yet built (`startedFrom: design`, no `app`) | the folder is not empty (as before) |
| The recorded `modality`, matching the blueprint; `--modality` absent or the same | names `ux-builder-design modality`, or both lists |
| `--theme`, or the person's answer in a terminal | lists the released themes and the theme builder (`npm run builder` in the ux-builder repository; a saved theme is released in `@ux-builder/tokens`) |
| The blueprint with no errors; no `--blueprint` | lists each error; `--blueprint` is refused |
| No file in the way the design folder did not write | names each |

It writes the app's files, keeps the blueprint, `docs/`, `.ux-builder/`
and the skills, merges `package.json` (its name and own fields kept),
writes HELIX's starter documents where none exists and wires HELIX, sets
the state's `app`, and traces the create episode. `status` in a design
folder says the app is not built and what the build needs.

*[Amended 2026-10-27 — FEAT-018 GDL-83, US-156, US-159]*
- **Starter documents kept apart.** A starter HELIX document is not
  written when the design's HELIX already has a document with its `ddx.id`
  (under any file name), one of its type or role (`FEAT-n`, `US-n`,
  `STP-n`, `TP-n`), or a file at its path; the starter US-001 follows a
  skipped FEAT-001 and STP-001 a skipped US-001. The result lists each
  skipped document as `{ id, type, path, why }`.
- **A working journey skeleton.** When the blueprint is an app with
  screens and journeys and its modalities include `responsive-web`, the
  build generates `src/App.jsx` (a route per screen, History API),
  `src/journey/blueprint.js`, `src/journey/runtime.jsx`,
  `src/screens/<Id>Screen.jsx` and `e2e/journeys.spec.js`: each screen's
  title, purpose and content in order with deterministic sample data, the
  journeys' actions leading step to step (a step with no action gets
  "Continue to <screen>"), the dialogs, the loading, empty, error, recovery
  and blocked states, `?state=<name>` to force one, business-rule warnings
  where a task or step cites a rule, and a prototype toolbar (in dev, or
  with `?prototype`) that resets the sample data. Every generated file
  starts with `// @generated by @ux-builder/create-app from <blueprint>`
  and `// blueprint sha256:<hex> content sha256:<hex>`. The starter's
  `Home.jsx` and its test are removed; the app gets `npm run prototype`.
  The assessment manifest lists the blueprint's journeys. Otherwise the
  starter's shell is kept.
- **Regenerating.** `npx @ux-builder/create-app --prototype [dir]`
  rewrites the generated files whose content hash still matches their
  header, removes an unedited screen file whose screen left the blueprint,
  and leaves and lists the files edited by hand.

### Design state

`.ux-builder/design-state.json`, committed (ADR-036 rule 6), schema
`schema/design-state.schema.json`:

| Field | Type | Meaning |
|---|---|---|
| `version` | `1` | |
| `activity` | `baseline`, `define`, `explore`, `experience`, `validate` | Where the loop is; `baseline` only in an existing app's first session |
| `mode` | `full`, `change` | |
| `startedFrom` | `new`, `existing`, `design` | `design`: a design folder, before the app is built (GDL-81) |
| `checkpoints[]` | `{ id, status: passed\|declined\|skipped, answer?, reason?, at }` | `id`: `core-1`, `core-2`, `core-3`, `significant-change`, `experiment`, `release` |
| `questions[]` | `{ id, text, status: open\|answered, answer? }` | Open questions |
| `assumptions[]` | `{ id: "A-<n>", text, status: assumed\|hypothesis\|confirmed\|refuted\|current-state, evidence[], section?, confirm?, dimension? }` | `current-state` marks a baseline item, shown as *current state, assumed* |
| `alternatives[]` | `{ name, file, status: candidate\|chosen\|rejected, reason?, date?, judgments?: [{ criterion, value, reasoning }] }` | Judgments are preliminary, shown on the comparison page |
| `principles[]` | `{ id, text, status, rule? }` | An older state's experience principles: they are principles.md's now (ADR-042); `state set principles[+]` is refused, and the brief notes any left here |
| `issues[]` | `{ finding, status: open\|fixed\|wont-fix }` | Unresolved usability issues |
| `experiments[]` | `{ id, status: running\|ended, decision?, variant?, result?: supported\|not-supported }` | |
| `diagnoses[]` | `{ id: "D-<n>", insight: <date>, observation, explanations[2+], hypothesis, alternative }` | From an insight to the alternative that tests it |
| `faked[]` | `{ what, where }` | Data and error handling a prototype faked |
| `prototype` | `{ branch, alternative? }` | The validated prototype's branch; `status` reports it `validated` until `core-3` passes, then `production` |
| `observations[]` | `{ id: "O-<n>", text, source: design-team, alternative? }` | What the design team noticed trying a prototype; never user evidence |
| `consents[]` | `{ session, confirmed: true, by?, date, study?, participants?, evidence? }` (`evidence`: an older app's `EV-n`) | Consent confirmed per test session before its transcript was analysed (ADR-039) |
| `modality` | `{ modalities[], sizeClasses[], frame?, answer, at }` | The person's answer to which modalities and screen sizes the app is for, and its frame (GDL-80, US-162) |
| `app` | `{ builtAt, theme, modalities[], by }` | In a design folder, the app's build in place (GDL-81); absent until then |
| `modeReason` | string | Why the mode was set (`mode --why`) |
| `step` | integer | The step of the current mode the person is on (0: an existing app's baseline) |
| `reviews[]` | `{ item, hash, raw?, snapshot?, via?, answer, at }`; the map's approval `{ item: "map", hash, answer, at, accepted, assumptions }` | Approvals: the person's words, the hash of the meaning approved (GDL-83: no frontmatter, formatting made one form), the whole content's hash and the meaning itself, so a change of meaning shows as a diff; a change of metadata or formatting keeps the approval. An approval recorded before GDL-83 hashed the whole content and still holds while it matches |
| `feedback[]` | `{ id: "FB-<n>", item, text, status: open\|addressed, response?, at }` | The person's feedback on an item, and how it was addressed |
| `next` | string | The next action the guide proposes |

### Documents in `docs/ux-builder/`

Each has frontmatter `ux: { id, type, links: [{ kind, to }] }`, where `to`
may name a HELIX document ID. `validate` checks the type's required
sections from its template.

| Type | Path | ID | Template |
|---|---|---|---|
| `experience-brief` | `brief.md` | `brief` | `artifacts/experience-brief/` |

Type-specific rules `validate` applies:
- Studies (ADR-042): research is HELIX's, one research plan per study,
  `docs/helix/01-frame/research/<study>.md`. `validate` fails an excerpt
  in a study's *Findings* > *Excerpts* containing an unmasked secret
  pattern, an email address, a phone number, a `.ux-builder/config.json`
  `redact` match, a real name the owner listed in
  `.ux-builder/participants.local.json` (`{ "P1": "<name>" }`, kept out of
  git), or a speaker who is not a pseudonym; and a claim with no source, a
  basis not starting observed or inferred, or no confidence.
- Users, needs and tasks (ADR-042) are HELIX's: the PRD's *User Segments*
  (User, Context, Needs, Evidence, Confidence, Status) and *User Needs*
  (Need, Importance, Evidence, Confidence, Status), and a feature's *Task
  Model* (Task, Goal, Users, Needs, Rules, Realized by, Key), each row named
  by what it says and keyed by its name as a slug. `segment add`, `need add`
  and `task add` propose rows. `validate` checks them: importance and
  confidence are `low`, `medium` or `high`; confidence above `low` needs an
  evidence source (a study); an `assumed` row lists none; status is
  `assumed`, `validated` or `invalidated`; a user's needs are *User Needs*
  rows; a task's users, needs and rules exist. A blueprint task cites its
  `needs` and `users` by name; a missing one fails, a `low` one warns, and a
  task that is not a Task Model key warns. The brief's *Target users* comes
  from *User Segments* alone. The study's *Screener* asks about each user and
  its context, the run's task list names each task's users, and
  `observations.csv` has a `user` column, which `observe import` keeps on each
  finding and `report` breaks its measures down by.
- Business rules *(2026-10-24, GDL-78)*: a rule is defined once in HELIX
  as a line `**BR-<n>** — <rule>` (like an acceptance criterion). Blueprint
  `tasks[].rules` and journey `steps[].rules` cite rule IDs; top-level
  `businessRules[]` is `{ id, trigger, before, blocked, recover }` for each
  cited rule. `validate` fails a cited rule HELIX does not define, and a
  cited rule with no `businessRules` entry or one missing any of the four.
  `test-kit` adds a scenario per cited rule (goal: the task's goal, in the
  rule's `trigger` situation; success: the rule's ID); `report` lists each
  rule with its kit tasks' results, and untested rules under *Not tested*;
  `trace` and `impact` include rules (kind `rule`, file: the HELIX
  document defining it).

The guide never writes these types into `docs/helix/`.

### Project principles

`.ux-builder/principles.json`: `{ principles: [{ key, text, rule }] }`, the
experience principles a check can express; the principles themselves are in
principles.md's *Experience Principles* (ADR-042). Each `rule` (one of the
kinds in SD-006, *Project rules*) is checked by `ux-builder-blueprint check`
as `project.<key>`, and its findings name the principle by its words. An
older file's `id` still works as the key.

### Rubric

`guidelines/rubric.json`, schema `guidelines/schema/rubric.schema.json`,
copied into the catalogue like the rules. Nine dimensions, each `{ id,
name, question, measures[], baseline: boolean, sources[] }`. Baselines:
`task-effectiveness`, `accessibility`. Sources follow ADR-025 rule 7.

The observed side comes from imported human findings: `{ value, evidence:
[<study>…], verdict: supports | contradicts | null }`. The guide's thresholds,
stated with each value: task effectiveness is contradicted under 80% of
attempts completed (when the prediction says every journey is walkable),
discoverability when half or more of attempts needed help, error recovery
when fewer than half of attempts with an error still completed; task
efficiency reports the median time with no verdict.

### MCP tools (optional)

`get_design_state`, `update_design_state`, `design_status`,
`simplify_blueprint`, `score_blueprint`, `compare_blueprints`, and
`design_impact`, `design_trace` (all built). Each returns
what the matching command's `--json` returns; `@ux-builder/mcp` loads
`@ux-builder/design` from the app (else its own install) and registers them
only when it is there. Every command's `--json` output is described by
`schema/output.schema.json`.

## Amendment to CONTRACT-005 (blueprint) *[FEAT-018]*

- Top-level `tasks[]`: `{ id: <Task Model key> (an older blueprint's "T-<n>"), goal, needs: [<need>], users: [<user>], trigger,
  inputs: { required[], optional[] }, systemActions[], userActions[],
  success: ["US-<n>-AC<m>"], exceptions[], subtasks: [{ goal, ways[] }],
  interactionKinds[] }`.
- `journeys[].task`: the Task Model key of the task a journey realizes (ADR-042).
- `journeys[].steps[]` may add `inputs: { required[], inferable[] }`,
  `decision`, `system`.
- `screens[].purpose` (string), `screens[].content` (objects `{ label,
  kind? }`, highest priority first) and `screens[].interactionKinds`
  (strings, such as `choose-location`).
- Alternatives: `app.blueprint.<name>.json` beside the blueprint (Layout), each a complete blueprint.
  `alternative new` refuses to overwrite an existing file;
  `alternative choose` requires `--reason`.
- Commands added to `ux-builder-blueprint`: `score [file]`,
  `compare <a> <b> [...] [--out dir]`, `simplify [file]`,
  `alternative new <name>`, `alternative choose <name> --reason <text>`,
  `prototype --explore [--alternative <name>] [--design-system <ds>]... [--question <q>]`
  and `prototype --archive <name>` (moves it to `.archive/` in the prototypes folder),
  `check --diff <base>`.
- Rules added: `simplicity.delta-decided` (a journey grows without a
  recorded decision), `journey.task-exists`, `task.realized`,
  `screen.purpose` (once the blueprint models tasks or content) and
  `consistency.same-kind` (one interaction kind, two patterns).
- Lint rule added: `ux-builder/no-prototype-import`.

## Amendment to CONTRACT-006 (assessment) *[FEAT-018]*

- `assess heuristics`: records a pass over Nielsen's ten heuristics, error
  prevention and recovery, information hierarchy and navigation
  complexity, listing every heuristic checked, with or without findings.
- `metrics.json` in a run: per journey, `agent-measured` completion,
  interactions, shortest path, path taken, backtracks, failed actions,
  missing information, interface errors and time per step.
- Findings gain `source: agent | human | design-team` (`design-team`: notes
  from people trying a prototype, never counted as user evidence).

## Amendment to CONTRACT-007 (trace) *[FEAT-018]*

`decision` events, `record_decision` and `ux-builder-trace decide` gain
optional `goal`, `without`, `simplest`, `assumptions[]`, `validation`.
`decide --kind addition` (a new destination, screen, modal, required input
or step) requires all five and exits 2 naming a missing one; the event
records it as `decisionKind: "addition"` (the event's own `kind` stays
`decision`).
Checkpoint answers are recorded as `decision` events with
`decisionKind: "checkpoint"` and `checkpoint: <id>`. A UX decision carries
`ux: "ADR-<nnn>"`, its HELIX ADR (ADR-042); an older trace's `ux: "UXD-<n>"`
stays valid.

## Amendment to CONTRACT-004 (app integration) *[FEAT-018]*

- `@ux-builder/ui` exports `JourneyProvider` (`sink?: (event) => void`)
  and `useJourneyStep(journeyId, step)`. Events: `{ type: journey-start |
  step | complete | abandon | error-shown | empty-result |
  no-results-search, journey, screen, step, at }`. No sink, no events. The
  SDK makes no network call for them (ADR-038).
  `useJourneyStep(journeyId, step, { screen }?)` registers the step (screen
  from the option, else the page's `data-piq-screen`) and returns
  `{ complete, abandon, errorShown, emptyResult, noResultsSearch }`. A
  journey left for another before it completes, or still under way when
  the provider unmounts, is abandoned. `StatePanel` reports `error-shown`,
  `empty-result` and `no-results-search` for its `error`, `empty` and
  `no-results` kinds; `useJourneySignal(type)` does the same for an app's
  own panels.
- `create-app` gains `--mcp`, adds `@ux-builder/design`, installs its skill
  and writes an empty design state.

## Error Semantics

| Case | Result |
|---|---|
| `state set` with a value the schema rejects | Exit 2, the schema error named; nothing written |
| `init` where a design state exists | Exit 2, "design state exists"; nothing written |
| `transcript add` without `--consent-confirmed`, or with an audio or video file | Exit 2, refusal; nothing written |
| `test-kit --study <study> [--journey <id>]...` | Proposes the study's *Scenarios* (goals, no interface words), *Success Criteria* (by acceptance-criterion ID) and *Screener* for its research plan's *Research Methods*; writes the facilitator script, consent note, task list (`tasks.json`) and `observations.csv` (participant, task, completed, seconds, errors, assists, remark, problem, user) to `docs/ux-builder/runs/studies/<study>/`, keeping a sheet already filled in | the study's pending patch, its run folder |
| `route` naming a finding in no kit and not in the latest assessment run | Exit 2, naming it; nothing written |
| `compare` on alternatives with different task sets | Exit 1, the differing tasks named (a refusal; the blueprint command's convention, as `init` on an existing file) |
| `alternative new` on an existing file, or `alternative choose` without `--reason` | Exit 1, naming the file or the missing reason; nothing changed |
| `impact --apply` when the changed blueprint fails `check` | Exit 1; prototypes and the test kit are not regenerated |
| `validate` on a document missing a template section | Exit 1, the document and section named |
| `insights` with events naming an unknown journey | Exit 0; those events reported as unmatched |
| `experiment start` without a passed `experiment` checkpoint | Exit 2, refusal |
| A checkpoint answered while items of the steps it closes await review (`core-1`: steps 1 to 3; `core-2`: step 4; `core-3`: steps 5 to 7; `experiment`, `release`: step 8), or `step next` while the current step's items await review, or `step` past a step an unpassed core checkpoint closes | Exit 2 naming the items; nothing recorded (a skip with a reason still records) |
| `review approve` with open feedback on the item | Exit 2 naming the feedback |
| `review approve map` while an exception is neither fixed nor accepted | Exit 2 naming each exception; nothing recorded |
| `review approve` of an item changed since its approval, or of the map approved before, not shown as it is now | Exit 2 naming the item and the command that shows it; nothing recorded |
| `proposals apply` when any accepted proposal fails its check | Exit 2 naming each problem; nothing written |
| `validate` on a claim with no source, basis or confidence | A problem (exit 1); a direction-changing claim neither verified nor low confidence is a warning |
| `diagnose` with fewer than two explanations, or an unknown alternative | Exit 2; nothing written |

## Validation Checklist

- [ ] Every command's `--json` output equals its exported function's result
- [ ] Every MCP tool equals its command's `--json` output (parity test)
- [ ] The package makes no network request (test with network APIs stubbed to throw)
- [ ] Every `docs/ux-builder/` type has a template, prompt, example and `meta.yml`, and its example passes `validate`
- [ ] The design state schema validates the fixtures; `state set` refuses invalid values
- [ ] `npm run licences` passes with the new dependencies
