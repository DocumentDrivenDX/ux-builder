---
ddx:
  id: CONTRACT-006
  type: contract
  status: draft
  links:
    - kind: informed_by
      to: FEAT-009
    - kind: informed_by
      to: ADR-026
    - kind: informs
      to: CONTRACT-004
---

# Contract

**Contract ID**: CONTRACT-006 — UX assessment
**Type**: data formats, library API and command (the manifest, the run package and its records, `inspect()`, and `ux-builder-audit assess`)
**Version**: v1 (from `@ux-builder/audit` 0.2.0)
**Status**: draft — 2026-10-20, with ADR-026
**Related**: FEAT-009, ADR-026, CONTRACT-004 (the audit's library and command), CONTRACT-005 (rule IDs), HELIX's artifact schema and marker

## Purpose

Defines what an app owner commits (the manifest), what an assessment
writes (the run package), the records an agent and a reviewer rely on, and
the page-level inspection and commands the coding agent calls.

## Scope and Boundaries

- In scope: `ux-assessment.yml`; the run package and its JSON records;
  identifiers; `inspect()` and `attach()`; the `assess` subcommands.
- Out of scope: HELIX's own formats (marker, `ddx:` frontmatter, catalogue),
  which this contract reads and never redefines; the audit's existing
  report (CONTRACT-004); agent prompts (the skill).

## Normative Surface

### Manifest: `ux-assessment.yml`

YAML at the app's root. Unknown keys are errors. JSON Schema:
`@ux-builder/audit/schema/assessment-manifest.schema.json`.

| Field | Type | Required | Rules |
|---|---|---|---|
| `version` | `1` | yes | Manifest schema version |
| `app.name` | string | yes | |
| `app.repository` | string | no | URL; recorded, not fetched |
| `helix.marker` | path | no | Default: the first `.helix.yml` walking up from the manifest to the git root, as HELIX discovers it |
| `helix.flow` | string | when the marker lists two or more flows and has no `defaults.flow` | A flow `id` in the marker |
| `helix.catalog` | `auto` or path | no | Default `auto`: HELIX's order (marker `graph:`/`catalog:`, vendored `workflows/`, installed plugin); a path names a catalogue root holding `graph.yml` |
| `helix.include`, `helix.exclude` | glob[] | no | Relative to the flow's `root:`; may only narrow; a glob that leaves the root is an error |
| `run.cwd` | path | no | Default: the manifest's directory |
| `run.start` | string | one of `start`, `baseUrl` | A command that serves the app |
| `run.baseUrl` | URL | yes | Where the app answers |
| `run.ready` | `{ url, status? , timeoutMs? }` | no | Readiness check; default `baseUrl`, status < 500, 60 s |
| `run.environment` | `local`, `staging` | yes | `production` is refused |
| `run.origins` | URL[] | no | Allowed origins; default the `baseUrl` origin |
| `roles[]` | `{ id, description?, auth? }` | yes (≥ 1) | `auth`: `{ env: NAME }` or `{ storageState: path }` or `none` |
| `fixtures[]` | `{ id, setup?, reset? }` | no | Commands; `reset` runs between scenarios |
| `journeys[]` | object | yes (≥ 1) | Below |
| `journeys[].id` | string | yes | `J-` + kebab-case |
| `journeys[].story` | HELIX ID | yes | A `US-<n>` that exists in the flow |
| `journeys[].criteria` | HELIX AC ID[] | no | Each `US-<n>-AC<m>` of that story; default all |
| `journeys[].priority` | `critical`, `important`, `secondary` | yes | Feeds ranking |
| `journeys[].role`, `.fixture` | id | yes, no | Defined above |
| `journeys[].entry` | path or URL | yes | Within `origins` |
| `journeys[].states` | state class[] | no | Default: every class; others `not applicable` need a reason |
| `journeys[].tests` | `{ file, title? }[]` | no | Explicit test mappings in addition to `@covers` |
| `tests[]` | `{ id, command, report?: { format: junit \| playwright-json \| node-tap, path } }` | no | Functional test commands |
| `audit` | `{ urls?, widths?, themes?, appearances?, off? }` | no | As CONTRACT-004's options |
| `evidence.out` | path | no | Default `ux-assessment/` |
| `evidence.capture` | `screenshot`, `tree`, `both` | no | Default `both` |
| `evidence.redact` | `{ selectors?: string[], text?: regex[] }` | no | Masked before writing |
| `limits` | `{ runMinutes?, steps?, journeyMinutes? }` | no | Defaults 60, 200, 15 |
| `restrictions.allow` | action[] | no | Permitted test actions (`create-test-data`, `edit-test-data`, `delete-test-data`) |
| `restrictions.deny` | action[] | no | Always includes `payment`, `send-message`, `production-approval`, `delete-real-data` |
| `restrictions.excludeIntegrations` | string[] | no | Hosts or names never called |
| `restrictions.writes` | `report-only` | yes | The only value in v1 |

A string value matching a secret pattern (a private key, `sk-…`,
`ghp_…`, a JWT, `password:` with a literal) fails validation.

State classes: `success`, `empty`, `loading`, `recoverable-error`,
`system-failure`, `ai`, `responsive-keyboard`.

### HELIX resolution (read-only)

| Step | Rule |
|---|---|
| Marker | Parse `.helix.yml`; refuse as HELIX does (parse error, root outside repo, duplicate flow, unknown `defaults.flow`, missing root) with HELIX's code and reason |
| Flow | `helix.flow`, else `defaults.flow`, else the only flow; else stop listing the flows |
| Catalogue | Bind per `helix.catalog`; record `{ source, path, version?, commit? }` |
| Instances | Markdown under the root (after `include`/`exclude`) |
| Type | `ddx.type`; else match a catalogue type's `output.location` + `output.naming` (the location's `docs/helix/` prefix read as the flow's root); else a HELIX report template (`templates/*.md`, such as `alignment-review`) whose title the document's title starts with; else `unclassified`, reported as information |
| ID | `ddx.id`, checked against the type's `id_format.pattern` when it has one |
| Links | `ddx.links[]` and `ddx.depends_on[]` |
| Criteria | Lines matching `\*\*(US-\d+-AC\d+)\*\*` or `(US-\d+-AC\d+)` at a list item's start |
| Test citations | `@covers US-<n>-AC<m>` in files under `run.cwd`, as HELIX's story test plan defines |

### Run package

Under `evidence.out/<run-id>/` (`run-id`: `R-` + UTC `YYYYMMDDTHHMMSSZ`):

| File | Written by | Holds |
|---|---|---|
| `run.json` | every command | The run record |
| `requirements.json` | `collect` | Documents and criteria |
| `traceability.json` | `collect`, then the agent | Journey ↔ criterion ↔ test links |
| `alignment.json` | the agent | HELIX alignment result reference and affected IDs |
| `baseline.json` | `baseline` | Test and audit results |
| `audit/` | `baseline` | The audit's report (CONTRACT-004) |
| `checkpoints/<checkpoint-id>/` | `inspect` | `inspection.json`, `screenshot.png`, `tree.json` |
| `coverage.json` | the agent; checked by `validate-report` | The matrix |
| `backlog.json` | the agent; checked by `validate-report` | Findings |
| `evidence.json` | every writer | Index of every evidence file |
| `proposals/` | the agent | One patch per proposal, and `proposals.json` |
| `report.html`, `report.md` | `report` | Readable report |

Every JSON record has `{ "schema": "<name>", "version": 1 }` and validates
against `@ux-builder/audit/schema/<name>.schema.json`.

### Records

**`run.json`**: `{ id, startedAt, finishedAt?, manifest: { path, version, hash }, app: { name, commit, dirty }, helix: { marker, flow, root, catalog: { source, path, version?, commit? } }, documents: [{ id, path, revision, hash }], versions: { ui?, audit, tokens?, node, playwright }, agent?: { name, model? }, stages: [{ stage, status: completed | partial | blocked | not-run | not-available, reason?, startedAt, finishedAt }], config }`.

**`requirements.json`**: `{ documents: [{ id, type, typedBy: frontmatter | location | template | none, path, revision, hash, links: [{ kind, to }] }], goals: [{ id?, text, source }], roles: [{ name, source }], features: [{ id, title, path }], stories: [{ id, title, path, feature? }], criteria: [{ id, story, text, path }], problems: [{ kind: missing-type | untyped | no-id | bad-id | unclassified | type-not-in-catalogue | dangling-link | dangling-citation, severity: warning | info, path?, detail }] }`: `warning` is a gap in the documents; `info` is worth knowing but not a gap (a README, a discovery note, an optional type the app does not have). Text is quoted from the source with its path; it is evidence, not a copy of authority.

**`traceability.json`**: `{ journeys: [{ id, story, criteria: [{ id, link: explicit | inferred | uncovered, tests: [{ file, title?, via: covers | manifest | agent }], reason? }] }] }`.

**`baseline.json`**: `{ tests: [{ id, command, status: passed | failed | not-run | error, exitCode?, durationMs?, counts: { passed, failed, skipped } | "unknown", log: path }], audit: { report: path, versions, off: [check], unsupported: [check], findings: { usability: n, sdkAdoption: n } }, note: "Passing functional tests do not show that usability criteria are met." }`.

**`inspection.json`**: `{ checkpoint: { id, journey?, step?, role?, state? }, url, viewport: { width, height }, theme?, appearance?, mode: in-place | replay, verified?: { assertion, passed }, skipped: [check], stateAffecting: { ran: [check], restored: boolean }, findings: [audit finding + { checkpoint }], screenshot, tree }`.

**Coverage entry**: `{ journey, state, status: assessed | blocked | not-assessed | not-applicable, reason, outcome?: pass | issue, checkpoints: [id], evidence: [ref] }`. `assessed` requires `outcome` and at least one evidence reference.

**Finding** (`backlog.json` `findings[]`): `{ id, run_id, title, finding_type: deterministic | observed | heuristic | sdk-adoption | real-user, journey_id, state_id, role, source_refs: [HELIX ID], test_refs: [ref], evidence_refs: [ref], observed_behavior, expected_behavior_or_proposed_requirement, recommendation, component_mapping: [{ name, kind: pattern | widget, version, catalogue_ref, work: composition | custom-gap | sdk-defect }], priority: P0 | P1 | P2 | P3, confidence: { level: high | medium | low, reason }, effort: S | M | L | unknown, dependencies: [id], verification, proposed_doc_changes: [proposal id], status: open | accepted | rejected | deferred, uncertainty?, qualified?: [alignment] }`. A finding with no `evidence_refs` must have `uncertainty`; one citing a HELIX ID that `alignment.json` lists in a conflict must have `qualified: [alignment]`.

**Proposal** (`proposals.json`): `{ id, findings: [id], target: { kind: existing, id, type, path, revision } | { kind: new, type, id, path, template: { source, version } }, change: new-requirement | unmet-criterion | scope, decision_needed?: prd | vision, patch: path, test_change: { path?, description } }`.

### Identifiers

| Prefix | For | Rule |
|---|---|---|
| `R-` | runs | Timestamp |
| `J-` | journeys | From the manifest |
| `S-` | journey-state pairs | `S-<journey>-<state>` |
| `C-` | checkpoints | `C-<journey>-<n>` |
| `F-` | findings | Stable across runs: a hash of type, journey, state and the problem's key |
| `P-` | proposals | Per run |

No assessment identifier matches a HELIX ID pattern.

### Library (`@ux-builder/audit`)

| Export | Signature | Behaviour |
|---|---|---|
| `inspect` | `(page, { ignore?, rules?, limits?, checkpoint?, stateAffecting?: boolean, out? }) => Promise<Inspection>` | Runs the audit's checks on `page` as it is; never navigates or reloads; skips state-affecting checks unless `stateAffecting`; then restores URL, scroll, focus, viewport and theme or sets `restored: false` |
| `attach` | `({ cdp, page: urlMatch }) => Promise<{ page, detach }>` | `chromium.connectOverCDP`; exactly one page whose URL contains `urlMatch`, else an error listing them; `detach` disconnects without closing the browser |
| `audit` | as CONTRACT-004 | Implemented on `inspect` |

### Command (`ux-builder-audit assess`)

| Subcommand | Behaviour | Exit |
|---|---|---|
| `init [--out ux-assessment.yml]` | Proposes a manifest (FEAT-009 CTX-02); refuses to overwrite | 0; 1 exists; 2 usage |
| `validate [--manifest f]` | Schema, repository and HELIX checks; prints each problem with its path | 0; 1 problems; 2 usage |
| `collect [--manifest f]` | Writes `run.json`, `requirements.json`, `traceability.json` | 0; 1 the stage is blocked; 2 usage |
| `baseline [--manifest f] [--run id]` | Runs the tests and the audit; writes `baseline.json` | 0 recorded (whatever the tests did); 1 blocked; 2 usage |
| `browser [--port n]` | Starts Chromium with a CDP endpoint and prints it; stops on SIGINT | 0; 2 |
| `inspect --cdp url --page match --checkpoint id [--journey id --step n --role id --state s] [--state-affecting] [--run id]` | Attaches and inspects in place | 0 inspected; 1 lost, ambiguous or unverified; 2 usage |
| `validate-report <run-dir>` | Validates every record and the coverage and finding rules | 0; 1 |

The default manifest path is `ux-assessment.yml` in the current directory.

### Increments 2 and 3 *[Added 2026-10-21]*

Further records in the run package:

| File | Written by | Holds |
|---|---|---|
| `plan.json` | `plan` | Each journey's role, fixture, entry, goal, criteria and expected outcomes, the E2E tests it reuses, and every state class with whether it applies |
| `walkthrough.json` | the agent | Per journey, its steps: `{ n, action, url, checkpoint?, observation?: { text, basis: [screenshot \| tree \| dom-text], visual: boolean }, judgment?, status: done \| blocked \| not-assessed, reason? }` |
| `evidence.json` | `report` | Every evidence file in the package with its kind and what refers to it |
| `comparison.json` | `compare` | Each finding of the later run, and each of the earlier one, classified |
| `report.html`, `report.md` | `report` | The readable report |

`coverage.json` is `{ entries: [...] }` and starts from `plan`: every journey-and-state
pair is present, `not-assessed` or `not-applicable` until the agent records it.
`backlog.json` is `{ findings: [...], user_validation: [{ claim, why, method }] }`.

Further rules `validate-report` enforces:

| Rule | Source |
|---|---|
| Every pair in `plan.json` is in `coverage.json`; `assessed` has an outcome and evidence | COV-01 |
| An observation with `visual: true` has `screenshot` in its basis | JRN-02 |
| A blocked or not-assessed step has a reason and no observation | JRN-05 |
| A heuristic finding's expected behaviour is a proposed criterion and cites no criterion as an obligation | COV-02 |
| No finding is `real-user` without evidence under `evidence/real-user/`; `user_validation` lists what needs people | COV-03 |
| Component names exist in the app's installed catalogue, with its version; `custom-gap` may name none | FND-02 |
| No two findings share an ID; a low-confidence P0 or P1 has `validation_work: true` | FND-03, FND-04 |
| A proposal's target exists with the recorded revision, its patch leaves `ddx:` frontmatter alone, and it has a test change and a plan (`writes`, `keeps`, `dependencies`, `verification`) | DOC-01 to DOC-04 |

Further subcommands:

| Subcommand | Behaviour | Exit |
|---|---|---|
| `plan [--run id] [--agent name] [--model id]` | Writes `plan.json` and the starting `coverage.json` | 0; 1 blocked |
| `browser --manifest f` | As `browser`, and refuses every host outside `run.origins` at the browser | 0; 2 |
| `reset --fixture id` | Runs the fixture's `reset` command | 0; 1 failed |
| `inspect ... --manifest f` | Also masks `evidence.redact` selectors and text in the screenshot and tree | as `inspect` |
| `merge [--run id]` | Merges findings of one user problem in `backlog.json`, keeping every evidence reference; gives each a stable `F-` ID | 0 |
| `propose --finding F --target <HELIX ID> \| --new <type> --kind k --criterion text --test text [--run id]` | Writes `proposals/P-<n>.patch` and its `proposals.json` entry | 0; 1 target missing |
| `check-writes [--run id]` | Lists files under the flow's root or the app that changed since the run began | 0 none; 1 some |
| `apply-check P-<n> [--run id]` | Checks a proposal's target still has the recorded revision | 0; 1 conflict |
| `report [--run id]` | Writes `report.html`, `report.md` and `evidence.json` | 0 |
| `compare <earlier-run-dir> <later-run-dir>` | Writes `comparison.json` in the later run; refuses runs of different scopes | 0; 1 scope differs |
| `gate [--run id] [--fail-on P0\|P1\|P2]` | For CI: exit 1 when an open finding is at or above the level, or a stage is blocked | 0; 1 |

A run's scope is its app name, HELIX flow and the set of journey IDs.
Finding IDs are stable: `F-` and a hash of its type, journey, state and
the problem's key (`key`, or its title), so the same problem in a rerun has
the same ID.

## Error Semantics

| Case | Result |
|---|---|
| HELIX marker refused | `validate`/`collect` exit 1 with HELIX's reason; stage `blocked` |
| Two flows, none chosen | exit 1 listing the flows |
| App does not become ready | `baseline` stage `blocked`, reason recorded |
| Page closed or not matched | `inspect` exit 1, `checkpoint lost` or the candidates |
| Replay assertion fails | `inspection.json` `verified.passed: false`, no findings |
| A secret in the manifest | `validate` exit 1 naming the field, not the value |

## Examples

```yaml
version: 1
app: { name: Theme builder }
helix: { flow: helix }            # marker found at the repository root; catalogue auto
run:
  start: node apps/theme-builder/e2e/serve.mjs
  baseUrl: http://127.0.0.1:5190/
  ready: { url: http://127.0.0.1:5190/api/context }
  environment: local
roles: [{ id: brand-owner, auth: none }]
journeys:
  - { id: J-logo-to-theme, story: US-015, priority: critical, role: brand-owner, entry: /, states: [success, recoverable-error, ai, responsive-keyboard] }
tests:
  - { id: builder-e2e, command: npm run e2e --workspace @ux-builder/theme-builder }
audit: { widths: [390, 1280] }
restrictions: { writes: report-only }
```

## Validation Checklist

- [x] The manifest reads HELIX inputs through the marker, flow and catalogue; it restates no HELIX path.
- [x] Every record has a schema name and version.
- [x] Coverage and finding rules forbid unevidenced claims.
- [x] Exit codes are defined.
