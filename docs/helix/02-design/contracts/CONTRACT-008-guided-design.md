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
**Type**: package, commands, data formats and documents (`@ux-builder/design`, `ux-builder-design`, the design state, the `docs/ux/` types) and the amendments FEAT-018 makes to CONTRACT-004, CONTRACT-005, CONTRACT-006 and CONTRACT-007
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
  - the `docs/ux/` document types;
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
`.ux-builder/` or `app.blueprint.json`) and prints a one-line summary
otherwise. Every command has an exported function of the same name in
camelCase that returns the `--json` object.

| Command | Does | Writes |
|---|---|---|
| `init [--mcp]` | Installs the skill, writes an empty design state; runs `ux-builder-blueprint init` when there is no blueprint; reports when the app has no ux-builder | `.claude/skills/ux-builder-design/`, `.ux-builder/design-state.json`, `.mcp.json` with `--mcp` |
| `status` | Where the loop stands: activity, mode, checkpoints, open questions, untested assumptions, next action, documents in `docs/ux/` | nothing |
| `state get [<path>]` | Reads the state, or one field by dotted path | nothing |
| `state set <path> <json>` | Writes one field, validated against the schema | the state |
| `state checkpoint <id> (--answer <text> \| --skip --reason <text>)` | Records a checkpoint answer or skip; also writes a trace `decision` | the state, the trace |
| `mode full\|change [--why <text>]` | Sets the working mode | the state |
| `baseline` | Drafts the current-state baseline from the blueprint, HELIX documents and the latest audit and assessment runs | `docs/ux/baseline.md` |
| `brief` | Writes the experience brief from the PRD, stories and state, in seven sections: Product, Target users, Primary outcome, Primary jobs, Experience principles, Constraints, Open questions; each point marked with its status, and each hypothesis with what would confirm it. Principles a check can express go to `.ux-builder/principles.json`, which `ux-builder-blueprint check` applies as project rules | `docs/ux/brief.md`, `docs/ux/brief.html`, `.ux-builder/principles.json` |
| `evidence add <file> --kind <kind> [--date] [--source]` | Records a research source and its masked excerpts | `docs/ux/evidence/EV-<n>.md` |
| `evidence list` | Lists sources | nothing |
| `decision add --question <q> --option <o>... --choice <o> --why <text> [--assumption <a>]... [--validation <v>]` | Writes an interaction decision record, status `not-tested`, and a trace `decision` event carrying its `UXD-` ID | `docs/ux/decisions/UXD-<n>.md`, the trace |
| `decision status <UXD-n> tested\|refuted [--evidence <id>]` | Updates a decision's validation status | that record |
| `impact "<change>" [--apply]` | Lists every artifact the change reaches, and `checkpointRequired: "significant-change"` when the change touches an item whose decision is `tested`; with `--apply`, makes the blueprint change, regenerates prototypes and the test kit, writes `propose` patches and a decision | listed files, with `--apply` |
| `trace <id>` | Everything linked to a `J-`, `T-`, journey, screen, `UXD-`, `TK-` or `F-` ID, upstream and down | nothing |
| `test-kit [--journey <id>]...` | Writes a usability test kit from the journeys | `docs/ux/tests/TK-<n>/` |
| `observe import <file> --kit <TK-n>` | Imports observations (CSV or JSON) as human findings | `docs/ux/tests/TK-<n>/findings.json` |
| `transcript add <file> --session <id> --consent-confirmed [--by <name>]` | Records a session transcript's masked excerpts | `docs/ux/evidence/EV-<n>.md` |
| `rubric [--alternative <name>]` | The rubric with predicted and observed columns | nothing |
| `report` | Writes the UX evaluation report | `docs/ux/evaluations/UER-<n>.md` |
| `ready [--for testing\|production]` | `--for testing`: the validated prototype passes lint, `check:blueprint` and the audit. `--for production` (default): also every covered criterion cited by a test, and the faked data and error handling listed, before checkpoint `core-3` (ADR-037 rule 4) | nothing |
| `insights <events.jsonl> [--support <file>] [--feedback <file>]` | Per-journey production insights | `docs/ux/insights/INS-<yyyy-mm-dd>.md` |
| `experiment start --decision <UXD-n> --variant <alt> --metric <m> [--guardrail <m>]... --duration <days>` | Opens an experiment after the `experiment` checkpoint | `docs/ux/experiments/EXP-<n>.md` |
| `experiment end <EXP-n> --result <file>` | Records the result against the hypothesis | that record |
| `validate` | Checks every `docs/ux/` document's frontmatter, ID, template sections and links | nothing |

Exit codes: 0 done; 1 a check failed or a finding at error severity; 2 bad
input or a refusal (named on stderr).

### Design state

`.ux-builder/design-state.json`, committed (ADR-036 rule 6), schema
`schema/design-state.schema.json`:

| Field | Type | Meaning |
|---|---|---|
| `version` | `1` | |
| `activity` | `baseline`, `define`, `explore`, `experience`, `validate` | Where the loop is; `baseline` only in an existing app's first session |
| `mode` | `full`, `change` | |
| `startedFrom` | `new`, `existing` | |
| `checkpoints[]` | `{ id, status: passed\|skipped, answer?, reason?, at }` | `id`: `core-1`, `core-2`, `core-3`, `significant-change`, `experiment`, `release` |
| `questions[]` | `{ id, text, status: open\|answered, answer? }` | Open questions |
| `assumptions[]` | `{ id: "A-<n>", text, status: assumed\|hypothesis\|confirmed\|refuted\|current-state, evidence[], section?, confirm? }` | `current-state` marks a baseline item, shown as *current state, assumed* |
| `alternatives[]` | `{ name, file, status: candidate\|chosen\|rejected, reason? }` | |
| `principles[]` | `{ id: "PR-<n>", text, status: confirmed\|assumed\|hypothesis\|refuted, rule? }` | Experience principles; one with a `rule` becomes a project rule (Project principles) |
| `issues[]` | `{ finding, status: open\|fixed\|wont-fix }` | Unresolved usability issues |
| `experiments[]` | `{ id, status: running\|ended }` | |
| `faked[]` | `{ what, where }` | Data and error handling a prototype faked |
| `next` | string | The next action the guide proposes |

### Documents in `docs/ux/`

Each has frontmatter `ux: { id, type, links: [{ kind, to }] }`, where `to`
may name a HELIX document ID. `validate` checks the type's required
sections from its template.

| Type | Path | ID | Template |
|---|---|---|---|
| `experience-brief` | `brief.md` | `brief` | `artifacts/experience-brief/` |
| `baseline` | `baseline.md` | `baseline` | `artifacts/baseline/` |
| `research-evidence` | `evidence/EV-<n>.md` | `EV-<n>` | `artifacts/research-evidence/` |
| `jobs` | `jobs.md` | `jobs` (rows `J-<n>`) | `artifacts/jobs/` |
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
  interview, analytics, support, survey or observation; `transcript add`
  records kind `transcript`.
- `jobs`: each `J-<n>` row has importance, evidence (source IDs) and
  confidence (`low`, `medium`, `high`); confidence above `low` needs at
  least one evidence source. A task or decision citing a `low` job gets a
  warning.
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

### MCP tools (optional)

`get_design_state`, `update_design_state`, `design_status` (built), and
`score_blueprint`, `compare_blueprints`, `simplify_blueprint`,
`design_impact`, `design_trace` as their commands are built. Each returns
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
- `screens[].purpose` (string) and `screens[].content` (objects `{ label,
  kind? }`, highest priority first).
- Alternatives: `app.blueprint.<name>.json`, each a complete blueprint.
  `alternative new` refuses to overwrite an existing file;
  `alternative choose` requires `--reason`.
- Commands added to `ux-builder-blueprint`: `score [file]`,
  `compare <a> <b> [...] [--out dir]`, `simplify [file]`,
  `alternative new <name>`, `alternative choose <name> --reason <text>`,
  `prototype --explore [--alternative <name>] [--design-system <ds>]...`
  and `prototype --archive <name>` (moves it to `prototype/.archive/`),
  `check --diff <base>`.
- Rules added: `simplicity.delta-decided` (a journey grows without a
  recorded decision), `consistency.same-kind` (one interaction kind, two
  patterns or flows).
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
- `create-app` gains `--mcp`, adds `@ux-builder/design`, installs its skill
  and writes an empty design state.

## Error Semantics

| Case | Result |
|---|---|
| `state set` with a value the schema rejects | Exit 2, the schema error named; nothing written |
| `init` where a design state exists | Exit 2, "design state exists"; nothing written |
| `transcript add` without `--consent-confirmed` | Exit 2, refusal; nothing written |
| `compare` on alternatives with different task sets | Exit 2, the differing tasks named |
| `impact --apply` when the changed blueprint fails `check` | Exit 1; prototypes and the test kit are not regenerated |
| `validate` on a document missing a template section | Exit 1, the document and section named |
| `insights` with events naming an unknown journey | Exit 0; those events reported as unmatched |
| `experiment start` without a passed `experiment` checkpoint | Exit 2, refusal |

## Validation Checklist

- [ ] Every command's `--json` output equals its exported function's result
- [ ] Every MCP tool equals its command's `--json` output (parity test)
- [ ] The package makes no network request (test with network APIs stubbed to throw)
- [ ] Every `docs/ux/` type has a template, prompt, example and `meta.yml`, and its example passes `validate`
- [ ] The design state schema validates the fixtures; `state set` refuses invalid values
- [ ] `npm run licences` passes with the new dependencies
