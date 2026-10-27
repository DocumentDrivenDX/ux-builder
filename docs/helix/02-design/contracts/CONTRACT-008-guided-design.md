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
| `baseline` | Drafts the current-state baseline from the blueprint, HELIX documents and the latest audit and assessment runs | `docs/ux-builder/baseline.md` |
| `brief [--name <product>]` | Writes the experience brief from the PRD, stories and state, in seven sections: Product, Target users, Primary outcome, Primary jobs, Experience principles, Constraints, Open questions; each point marked with its status, and each hypothesis with what would confirm it. Principles a check can express go to `.ux-builder/principles.json`, which `ux-builder-blueprint check` applies as project rules | `docs/ux-builder/brief.md`, `docs/ux-builder/brief.html`, `.ux-builder/principles.json` |
| `evidence add <file> --kind <kind> [--date] [--source] [--title]` | Records a research source and its masked excerpts | `docs/ux-builder/evidence/EV-<n>.md` |
| `evidence list` | Lists sources | nothing |
| `evidence claim add <EV-n> --text <claim> --source <where> --basis observed\|inferred --confidence high\|medium\|low [--direction] [--verified] [--contradicts <t>] [--unknown <t>]` | Adds a row `C<n>` to the record's `## Claims` table (before the synthesis notes): ID, Claim, Source, Basis, Confidence, Direction, Verified, Contradicting, Unknown. Refused (exit 2) without a source, a basis or a confidence (GDL-83) | that record |
| `evidence claim verify <EV-n> <Cn> [--confidence <c>]` | Marks the claim checked against its source by the agent itself | that record |
| `evidence claim contradict <EV-n> <Cn> --text <what the person said>` | What the person said goes against the claim (US-161): written in its Contradicting column, and an open question asks the person which holds. `validate` warns about a contradicted claim no question asks about | that record; the state's `questions[]` |
| `evidence excerpt add <EV-n> --participant <name or Pn> --text <quote> [--at <time>] [--role <r>]` | Adds one quote the synthesis cites to the record's Excerpts, masked, by pseudonym (a name gets the lowest free one, kept in `.ux-builder/participants.local.json`), and lists the participant | that record |
| `decision add --question <q> --option <o>... --choice <o> --why <text> [--assumption <a>]... [--validation <v>] [--link <HELIX ID>]...` | Writes an interaction decision record, status `not-tested`, and a trace `decision` event carrying its `UXD-` ID | `docs/ux-builder/decisions/UXD-<n>.md`, the trace |
| `decision status <UXD-n> tested\|refuted [--evidence <id>]` | Updates a decision's validation status | that record |
| `impact "<change>" [--apply --set <changed blueprint>]` | Lists every artifact the change reaches, and `checkpointRequired: "significant-change"` when the change touches an item whose decision is `tested`; with `--apply`, makes the blueprint change, regenerates prototypes and the test kit, writes `propose` patches and a decision | listed files, with `--apply` |
| `trace <id>` | Everything linked to a `J-`, `T-`, journey, screen, `UXD-`, `TK-` or `F-` ID, upstream and down | nothing |
| `test-kit [--journey <id>]...` | Writes a usability test kit from the journeys; `observations.csv` has the columns participant, task, completed, seconds, errors, assists, remark, problem (a problem's name in the same words across sessions); a journey with no criteria is warned about. Scenario goals drop pattern names and screen titles and action labels of two words or more (a one-word title such as "River" is the user's word too) and are said in the second person; writing a kit moves the activity to `validate` | `docs/ux-builder/tests/TK-<n>/` |
| `observe import <file> --kit <TK-n>` | Imports observations (CSV or JSON) as findings with `source: human`, one per participant and task, ID `F-` + 8 hex of kit, pseudonym and task (stable on re-import); real names, email addresses and phone numbers masked before writing, names kept in `.ux-builder/participants.local.json`; rows for a task not in the kit reported and skipped. A new pseudonym is the lowest not already used, in the local names or by the sheet itself; a sheet kept under `docs/ux-builder/` is rewritten with pseudonyms and masked remarks | `docs/ux-builder/tests/TK-<n>/findings.json` |
| `transcript add <file> --session <id> --consent-confirmed [--by <name>] [--kit <TK-n>] [--cite <time>]...` | Records the masked lines cited by timestamp, by pseudonym, as kind `transcript` with the session and consent, and the consent in the design state's `consents[]`; refuses audio and video files | `docs/ux-builder/evidence/EV-<n>.md` |
| `rubric [--alternative <name>]` | The rubric with predicted and observed columns; with observations, `observedTasks[]` (per kit task: completion rate, median seconds, error rate, assists) and `recurring[]` (problems seen in two or more sessions) | nothing |
| `report` | Writes the UX evaluation report: method, tasks, measures, the rubric (predicted, agent-measured, observed), findings by journey labelled human observation or agent recommendation (a human finding also cites the transcript records of that person's session in the same kit: `kit`, or a session naming it), recommendations and what was not tested; links the kits and the earlier report (`follows`). An observed `contradicts` verdict highlights the dimension and moves assumptions with that `dimension` to `refuted`; `supports` moves them to `confirmed`; with no human observation nothing changes | `docs/ux-builder/evaluations/UER-<n>.md` |
| `route <F-id>... [--decision <UXD-n> --status tested\|refuted]` | The findings chosen at `core-3` as a proposed patch adding rows to HELIX's improvement backlog (an existing `improvement-backlog` document, else a new one at `<root>/06-iterate/improvement-backlog.md`); with `--decision`, `decision status` with the latest report as evidence | `docs/ux-builder/helix-proposals/backlog/improvement-backlog.patch` |
| `ready [--for testing\|production]` | `--for testing`: the validated prototype passes lint, `check:blueprint` and the audit. Both also need the audit report newer than the blueprint, and every blueprint screen an audited page (`data-piq-screen` or path). `--for production` (default): also every covered criterion cited by a test, and the faked data and error handling listed, before checkpoint `core-3` (ADR-037 rule 4) | nothing |
| `insights <events.jsonl> [--support <file>] [--feedback <file>] [--date YYYY-MM-DD]` | Per-journey production insights: started, completed, completion, the most abandoned step, failed searches, errors shown, feature use (step events per screen) and median seconds per step (by `session` when events carry one); events of journeys the blueprint lacks listed as unmatched. Writes evidence records (kind `analytics`, and `support` and `feedback` with their masked entries that mention a journey by ID or screen title), cites them in the jobs that the observed journeys' tasks serve (a hypothesis becomes confirmed, low confidence medium), and a JSON sidecar the rubric's observed column reads. Reads only the given files and the app's own | `docs/ux-builder/insights/INS-<yyyy-mm-dd>.md` and `.json`, `docs/ux-builder/evidence/EV-<n>.md` |
| `diagnose --insight <INS-date> --observation <o> --explanation <e>... --hypothesis <h> --alternative <name>` | Records a diagnosis: at least two explanations, and an existing alternative | `diagnoses[]`; the insight's Diagnosis section |
| `experiment start --decision <UXD-n> --variant <alt> --metric <m> [--guardrail <m>]... --duration <days>` | Opens an experiment, only with one more passed `experiment` checkpoint than experiments started; its hypothesis from the latest diagnosis of that variant. Metrics with no `<root>/06-iterate/metrics/<name>.yaml` are proposed as metric-definition patches | `docs/ux-builder/experiments/EXP-<n>.md`, `docs/ux-builder/helix-proposals/metrics/<name>.patch` |
| `experiment end <EXP-n> --result <file>` | Compares the success metric (`control`, `variant`) and each guardrail (`{ metric, control, variant, better: lower\|higher }`), records the hypothesis as supported only when the metric improved and every guardrail held (a guardrail holds unless it got worse by more than its `tolerance`: the result's, else the HELIX metric definition's; a number, a percent of the control, or a number with a unit), and sets `next` to ask `release` | that record |
| `validate` | Checks every `docs/ux-builder/` document's frontmatter, ID, template sections and links | nothing |
| `overview` | The eight steps (1 Define intent, 2 Understand users, 3 Model tasks, 4 Explore alternatives, 5 Design the structure, 6 Prototype, 7 Test with people, 8 Refine and improve), each with what the person does, what comes out, its terms and the checkpoint closing it; and change mode's four steps | nothing |
| `step next\|<n>` | Moves the loop to the next (or the given) step of its mode, setting the activity; `next` refuses while items of the current step await review, and in the full loop neither form moves past a step that `core-1`, `core-2` or `core-3` closes until it has passed or been skipped (exit 2) | the state's `step` |
| `explain [<term> \| <ID> \| ids] [--step <n>]` | What a term means and why it is valuable, from `glossary.json`; an ID (`U-1`, `J-find`, `BR-2`…) says what kind of thing it names and where it lives, with its term; `ids` lists every kind of ID; with `--step`, the terms that step introduces; with neither, every term. An unknown term exits 2 listing the known ones | nothing |
| `review [list]` | What awaits review, by tier (GDL-83): foundations (`brief`, `user:U-n`, `job:J-n`, `story:US-n` for stories the blueprint's journeys cite, `rule:BR-n`, `decision:UXD-n`), reviewed a table per kind; built items (`task:T-n`, `journey:J-x`, `alternative:<name>`, `screen:<id>`, `kit:TK-n`), reviewed as the coverage map; records (`evidence:EV-n`, `report:UER-n`, `insight:INS-date`, `experiment:EXP-n`) need no approval and hold no checkpoint. An item is pending when its meaning (its content without frontmatter, formatting made one form) differs from the one approved; a changed item carries the diff | nothing |
| `review table <kind>` | Every item of a foundation kind, each with its status and, when its meaning changed since approved, the diff; a built or record kind exits 2. Recorded as shown (US-161) | `.ux-builder/shown.local.json` (not committed) |
| `review map` | The coverage map: each job with the tasks that serve it, their journeys and the screens they walk; the exceptions (`gap:J-n` a job nothing serves, `untraced:task:…`, `untraced:journey:…`, `untraced:screen:…`, `undefined:BR-n`, `assumption:A-n` not seen at the last map approval); the built items it would approve, and those changed with their diffs. Recorded as shown | `.ux-builder/shown.local.json` |
| `review show <item>` | The item's content, to present inline in the conversation, and the diff when it changed since approved. Recorded as shown | `.ux-builder/shown.local.json` |
| `review feedback <item> --text <their words>` | Records the person's feedback, `FB-<n>`, open | the state's `feedback[]` |
| `review respond <FB-n> --text <what changed>` | Records how the feedback was addressed | that entry |
| `review approve (<item>... \| --kind <kind> \| map [--accept <exception>]...) --answer <their words>` | Records the approval of the items, of a foundation kind's pending items (`via: table`), or of every built item awaiting review (`via: map`), each with its meaning's hash, its whole content's hash and the meaning approved; refused (exit 2) while an item has open feedback, for the map while an exception is neither fixed nor accepted, and, for an item that changed after its approval or for the map approved again, until it was shown as it is now (`review show`, `review table`, `review map`; US-161). Meaning ignores a paragraph's line wrapping and bold or underline markers; an approval kept under an earlier normalization holds when its snapshot means the same now | the state's `reviews[]`; an `approval` event with the answer, and `formatOnly` for items reopened with every word unchanged |
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
| `principles[]` | `{ id: "PR-<n>", text, status: confirmed\|assumed\|hypothesis\|refuted, rule? }` | Experience principles; one with a `rule` becomes a project rule (Project principles) |
| `issues[]` | `{ finding, status: open\|fixed\|wont-fix }` | Unresolved usability issues |
| `experiments[]` | `{ id, status: running\|ended, decision?, variant?, result?: supported\|not-supported }` | |
| `diagnoses[]` | `{ id: "D-<n>", insight, observation, explanations[2+], hypothesis, alternative }` | From an insight to the alternative that tests it |
| `faked[]` | `{ what, where }` | Data and error handling a prototype faked |
| `prototype` | `{ branch, alternative? }` | The validated prototype's branch; `status` reports it `validated` until `core-3` passes, then `production` |
| `observations[]` | `{ id: "O-<n>", text, source: design-team, alternative? }` | What the design team noticed trying a prototype; never user evidence |
| `consents[]` | `{ session, confirmed: true, by?, date, evidence? }` | Consent confirmed per test session before its transcript was analysed (ADR-039) |
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
| `baseline` | `baseline.md` | `baseline` | `artifacts/baseline/` |
| `research-evidence` | `evidence/EV-<n>.md` | `EV-<n>` | `artifacts/research-evidence/` |
| `jobs` | `jobs.md` | `jobs` (rows `J-<n>`) | `artifacts/jobs/` |
| `users` | `users.md` | `users` (rows `U-<n>`) | `artifacts/users/` |
| `ux-decision` | `decisions/UXD-<n>.md` | `UXD-<n>` | `artifacts/ux-decision/` |
| `test-kit` | `tests/TK-<n>/kit.md` | `TK-<n>` | `artifacts/test-kit/` |
| `usability-evaluation-report` | `evaluations/UER-<n>.md` | `UER-<n>` | `artifacts/usability-evaluation-report/`, from `docs/proposals/helix-ux-artifact-types` |
| `insights` | `insights/INS-<date>.md` | `INS-<date>` | `artifacts/insights/` |
| `experiment` | `experiments/EXP-<n>.md` | `EXP-<n>` | `artifacts/experiment/` |

Type-specific rules `validate` applies:
- `research-evidence`: frontmatter `participants` maps pseudonyms (`P<n>`)
  to roles, nothing identifying; an excerpt by a pseudonym not listed fails;
  an excerpt containing an unmasked secret pattern, an email address, a
  phone number, a `.ux-builder/config.json` `redact` match, or a real name
  the owner listed in `.ux-builder/participants.local.json` (`{ "P1":
  "<name>" }`, kept out of git) fails. `evidence add` takes `--kind`
  interview, analytics, support, feedback, survey or observation; `transcript add`
  records kind `transcript`.
- `jobs`: each `J-<n>` row has importance, evidence (source IDs) and
  confidence (`low`, `medium`, `high`); confidence above `low` needs at
  least one evidence source. A task or decision citing a `low` job gets a
  warning.
- `users` *(2026-10-24, GDL-77)*: each `U-<n>` row has the user, context,
  needs, jobs (`J-<n> <importance>`, comma-separated, each job in
  `jobs.md`), evidence, confidence and status (`hypothesis`, `confirmed`,
  `current-state`), with the jobs table's evidence rules. When the file
  exists, the brief's *Target users* is generated from it alone. A task's
  `users` (`U-<n>`) must be rows here; a task citing a `low` user gets a
  warning. The test kit's screener asks about each user and its context,
  `scenarios.md` gains a *For* column (the task's users), and
  `observations.csv` a `user` column, which `observe import` keeps on each
  finding and `report` breaks its measures down by.
- Business rules *(2026-10-24, GDL-78)*: a rule is defined once in HELIX
  as a line `**BR-<n>** — <rule>` (like an acceptance criterion). Blueprint
  `tasks[].rules` and journey `steps[].rules` cite rule IDs; top-level
  `businessRules[]` is `{ id, trigger, before, blocked, recover }` for each
  cited rule. `validate` fails a cited rule HELIX does not define, and a
  cited rule with no `businessRules` entry or one missing any of the four.
  `test-kit` adds a task per cited rule (goal: the task's goal, in the
  rule's `trigger` situation; success: the rule's ID); `report` lists each
  rule with its kit tasks' results, and untested rules under *Not tested*;
  `trace` and `impact` include rules (kind `rule`, file: the HELIX
  document defining it).
- `ux-decision`: status is `not-tested`, `tested` or `refuted`.

The guide never writes these types into `docs/helix/`.

### Project principles

`.ux-builder/principles.json`: `{ principles: [{ id: "PR-<n>", text, rule?
}] }`. A principle with a `rule` (one of the kinds in SD-006, *Project
rules*) is checked by `ux-builder-blueprint check`, and its findings name
the principle. One without a `rule` is a rubric note.

### Rubric

`guidelines/rubric.json`, schema `guidelines/schema/rubric.schema.json`,
copied into the catalogue like the rules. Nine dimensions, each `{ id,
name, question, measures[], baseline: boolean, sources[] }`. Baselines:
`task-effectiveness`, `accessibility`. Sources follow ADR-025 rule 7.

The observed side comes from imported human findings: `{ value, evidence:
[TK-…], verdict: supports | contradicts | null }`. The guide's thresholds,
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

- Top-level `tasks[]`: `{ id: "T-<n>", goal, jobs: ["J-<n>"], trigger,
  inputs: { required[], optional[] }, systemActions[], userActions[],
  success: ["US-<n>-AC<m>"], exceptions[], subtasks: [{ goal, ways[] }],
  interactionKinds[] }`.
- `journeys[].task`: the `T-` ID a journey realizes.
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
`decisionKind: "checkpoint"` and `checkpoint: <id>`. A decision about an
interaction decision record carries `ux: "UXD-<n>"`.

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
| `test-kit --journey` naming a journey the blueprint lacks | Exit 2, naming it; nothing written |
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
