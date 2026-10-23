---
ddx:
  id: implementation-plan
  type: implementation-plan
  status: draft
  links:
    - kind: informed_by
      to: FEAT-009
    - kind: informed_by
      to: SD-004
    - kind: informed_by
      to: TP-001
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: SD-006
---

# Build Plan

The project's first build plan, written for FEAT-009 increment 1 (2026-10-20)
and extended the next day with increments 2 and 3 (B-007 to B-012), FEAT-010
(B-013 to B-016) and the FEAT-009 alignment fixes (B-017).

**Status (2026-10-20)**: B-001 to B-006 built, each committed after the full
local suite passed. Increment 1's criteria (US-056, US-057, US-058, US-059,
US-062) are cited by tests and out of `tools/coverage-exceptions.json`.
B-007 to B-012 built 2026-10-21: increments 2 and 3 (US-060, US-061,
US-063, US-064, US-065) are built and every FEAT-009 criterion is cited by a
test. B-017 built 2026-10-21 (AR-2026-10-21 C1 to C8).
The legal review ADR-025 asks for is prepared as `docs/legal/counsel-brief-interaction-rules.md`;
counsel's answer is still to come.

## Scope

**Governing Artifacts**:
- `docs/helix/01-frame/features/FEAT-009-helix-aware-ux-assessment.md`; user stories US-056 to US-065
- `docs/helix/02-design/adr/ADR-026-ux-assessment-binds-helix-and-inspects-the-agents-browser.md`
- `docs/helix/02-design/contracts/CONTRACT-006-ux-assessment.md`; the CONTRACT-004 amendment "UX assessment"
- `docs/helix/02-design/solution-designs/SD-004-helix-aware-ux-assessment.md`
- `docs/helix/03-test/test-plan.md` (TP-001); `docs/helix/03-test/test-plans/STP-056` to `STP-065`

## Shared Constraints

- The assessment writes only under its output path; nothing under the HELIX root or the app's source (FEAT-009 DOC-03, ADR-026 decision 6).
- HELIX inputs resolve through the marker, flow and catalogue as HELIX resolves them; the manifest restates no HELIX path (HLX-01 to HLX-04).
- `audit()`'s options, report and findings stay as CONTRACT-004 specifies; the existing audit suites pass unchanged (INS-02).
- Credentials only by reference; logs and evidence masked (CTX-04, ENV-03).
- New dependencies (`yaml`, `ajv`) pass `npm run licences`.
- Every slice runs the full local suite before it is committed: `npm run check`, the builder and starter e2e suites, the Storybook build and tests, and the site build (operator, standing instruction).

## Implementation Slices

| Slice | Story / Area | Governing Artifacts | Depends On | Validation Gate | Notes |
|-------|---------------|---------------------|------------|-----------------|-------|
| B-001 | US-062-AC1, AC2, AC5: `inspect()`; `audit()` on it | SD-004 Inspection; STP-062 | None | `inspect.test.mjs`; the existing audit suites unchanged | First: every later check runs through it |
| B-002 | US-062-AC3, AC4, AC6: `attach()`, `assess browser`, `assess inspect`, the fixture app and the proof | SD-004 Sharing; STP-062 | B-001 | `inspect-cdp.test.mjs` | The brief's central risk; increment 1's exit gate |
| B-003 | US-056: manifest schema, `validate`, `init`, HELIX binding | CONTRACT-006 Manifest, HELIX resolution; STP-056 | None | `assess-manifest.test.mjs`, `assess-helix.test.mjs` | Can run beside B-001 and B-002 |
| B-004 | US-058: `collect`; the pilot manifest | CONTRACT-006 Records; STP-058 | B-003 | `assess-collect.test.mjs`; `apps/theme-builder/test/assessment.test.mjs` | Pilot: the theme builder |
| B-005 | US-059: `baseline`; `serve.mjs` | SD-004 Baseline; STP-059 | B-003, B-001 | `assess-baseline.test.mjs` | |
| B-006 | US-057: the skill; the MCP version fix; `validate-report` for increment-1 records; README; changeset (audit minor, mcp minor) | SD-004 Components; STP-057 | B-002, B-004, B-005 | `assess-skill.test.mjs`; `npm test --workspace @ux-builder/mcp` | Last: documents the commands that now exist |

### Increments 2 and 3 *[Added 2026-10-21]*

| Slice | Story / Area | Governing Artifacts | Depends On | Validation Gate | Notes |
|-------|---------------|---------------------|------------|-----------------|-------|
| B-007 | US-060-AC1, US-061: `plan`, the coverage matrix, heuristics and user claims | CONTRACT-006 "Increments 2 and 3"; STP-060, STP-061 | B-004 | `assess-coverage.test.mjs`, `assess-walkthrough.test.mjs` | Starts the agent's records |
| B-008 | US-060-AC2 to AC5: walkthrough records, `browser --manifest`, `reset`, `inspect --manifest` | STP-060 | B-002, B-007 | `assess-walkthrough.test.mjs` | Safety at the browser |
| B-009 | US-063: backlog rules, `merge`, stable IDs | STP-063 | B-007 | `assess-backlog.test.mjs` | |
| B-010 | US-064: `propose`, `check-writes`, `apply-check` | STP-064 | B-003, B-009 | `assess-proposals.test.mjs` | Proposals aimed at HELIX artifacts |
| B-011 | US-065: `report`, `compare`, `gate`, agent identity | STP-065 | B-009, B-010 | `assess-runs.test.mjs` | Increment 3 |
| B-012 | Increment 3 extras: MCP tools for the manifest and report checks, the CI workflow, a Playwright MCP test; the counsel brief for ADR-025 | ADR-026 decision 5 | B-011 | `npm test --workspace @ux-builder/mcp`; `inspect-playwright-mcp.test.mjs` | Optional wrappers, as the brief allows |
| B-017 | AR-2026-10-21 C1 to C8: the `improvement-backlog` proposal; excluded integrations, denied actions and limits enforced by `browser` and `inspect`; `evidence.capture`; `evidence.schema.json`; baseline failures in `comparison.json`; US-057-AC2's cases; CONTRACT-006 and CONTRACT-004 matched to the shipped commands and MCP tools; changeset (audit patch) | FEAT-009 HLX-06, ENV-01, ENV-02, AGW-02, BAS-04; ADR-026 decisions 6, 7; CONTRACT-006 | B-012 | `assess-proposals`, `assess-walkthrough`, `assess-skill`, `assess-baseline`, `assess-runs` tests; `node tools/check-coverage.mjs` | Docs first, then code, then tests |

### FEAT-010: the starter on HELIX *[Added 2026-10-21]*

| Slice | Story / Area | Governing Artifacts | Depends On | Validation Gate | Notes |
|-------|---------------|---------------------|------------|-----------------|-------|
| B-013 | US-067, US-068: fetch, verify, extract, install, fall back; the bundled package (`prepack`) | ADR-027 1 to 4, 8; STP-067, STP-068 | None | `create-app/test/helix-fetch.test.mjs` against a local release server | No test touches GitHub; the starter e2e fetches the real latest |
| B-014 | US-069: the starter set from the installed templates, heading merge, prefill | ADR-027 5, 6; STP-069 | B-013 | `create-app/test/helix-docs.test.mjs` | |
| B-015 | US-070, US-071: manifest, e2e test, scripts, guidance | ADR-027 7; STP-070, STP-071 | B-014 | `create-app/test/helix-wiring.test.mjs`; the starter e2e runs `assess:validate`, `assess collect` (0 warnings; US-001's criteria explicit) and `test:e2e` in the installed app | |
| B-016 | README, CONTRACT-004, changeset (create-app minor) | CONTRACT-004 | B-015 | `npm run check`, starter e2e | |

### FEAT-018: the guided design loop *[Added 2026-10-23]*

Governing artifacts: FEAT-018; ADR-036 to ADR-039; CONTRACT-008 (and its
amendments to CONTRACT-004 to CONTRACT-007); SD-006; US-114 to US-145;
STP-114 to STP-145. Shared constraints for these slices: every command and
test runs under the network guard (ADR-036 rule 3); the CLI is complete
without MCP (ADR-036 rule 2); no new type is written into `docs/helix/`
(ADR-036 rule 5); new dependencies pass `npm run licences`; each slice
removes its criteria from `tools/coverage-exceptions.json`.

| Slice | Story / Area | Governing Artifacts | Depends On | Validation Gate | Notes |
|-------|---------------|---------------------|------------|-----------------|-------|
| B-018 | Package skeleton, functions and CLI, network guard, design state, `state`, `status` (US-117) | CONTRACT-008 Package, Commands, Design state; STP-117 | None | `npm test --workspace @ux-builder/design` | Built 2026-10-23: US-117 cited; the workspace is in `npm run check`; the package stays private until B-025 |
| B-019 | `init`, create-app `--mcp`, the skill installed in new and existing apps (US-114; US-115-AC1 to AC3) | ADR-036; STP-114, STP-115 | B-018 | design and create-app tests | Built 2026-10-23, with US-115-AC4 (init's refusal); `@ux-builder/design` 0.1.0 made public for the starter to depend on |
| B-020 | Checkpoints, `mode`, `decide` fields and `--kind addition`, skill sections for them (US-118, US-119, US-121) | CONTRACT-008, CONTRACT-007 amendment; STP-118, STP-119, STP-121 | B-019 | design and trace tests | Built 2026-10-23 (US-121-AC2, AC3 wait for impact in B-033; the event field is decisionKind) |
| B-021 | `check --diff`, `simplicity.delta-decided` (US-120) | CONTRACT-005 amendment; STP-120 | B-020 | ui tests; `npm run rules` | |
| B-022 | `docs/ux/` types, templates, examples, `validate` (US-123) | CONTRACT-008 Documents; STP-123 | B-018 | design tests | |
| B-023 | `brief`, `principles.json`, project rules in `check` (US-122) | SD-006 Project rules; STP-122 | B-022 | design and ui tests | |
| B-024 | `baseline` and routing an existing app (US-115-AC5, AC6) | SD-006 Baseline; STP-115 | B-022 | design tests | |
| B-025 | MCP wrappers and the parity test (US-116) | ADR-036 rule 2; STP-116 | B-018 to B-024 | mcp tests | Phase 1 exit: a fixture idea reaches `core-1` with no MCP |
| B-026 | Hypotheses and evidence with masking (US-124, US-125) | ADR-039; STP-124, STP-125 | B-022 | design tests | Phase 2 |
| B-027 | Jobs and its rules (US-126) | CONTRACT-008 type rules; STP-126 | B-026 | design tests | |
| B-028 | `tasks[]`, `journeys[].task`, `simplify` (US-127, US-128) | CONTRACT-005 amendment; SD-006 Simplify; STP-127, STP-128 | B-021 | ui tests | |
| B-029 | Alternatives, `score`, `compare` (US-129, US-130) | ADR-036 rule 7; SD-006 Score, Compare; STP-129, STP-130 | B-028 | ui tests | Phase 3 |
| B-030 | `ux-decision`, `purpose` and `content`, `consistency.same-kind` (US-131 to US-133) | STP-131 to STP-133 | B-029 | design and ui tests; `npm run rules` | |
| B-031 | Rubric data and predicted column (US-134) | SD-006 Rubric and sources; STP-134 | B-030 | design tests; `npm run rules` | Phase 3 exit |
| B-032 | Exploratory prototypes, `no-prototype-import`, validated-prototype guidance, `ready` (US-135, US-136) | ADR-037; SD-006 Prototype, Readiness; STP-135, STP-136 | B-029 | ui tests (Chromium); design tests | Phase 4; may move ahead of B-029 with alternatives stubbed |
| B-033 | ID graph, `trace`, `impact` (US-137) | SD-006 Impact; STP-137 | B-032, B-031 | design tests | Phase 4 exit |
| B-034 | `assess heuristics`, `metrics.json`, finding `source` (US-138, US-139) | CONTRACT-006 amendment; STP-138, STP-139 | B-029 | audit tests | Phase 5 |
| B-035 | Test kit, observations, transcripts, rubric observed column, report (US-140 to US-142) | ADR-039; STP-140 to STP-142 | B-034, B-031 | design tests | Phase 5 exit |
| B-036 | Journey events, insights, experiments (US-143 to US-145) | ADR-038; CONTRACT-004 amendment; STP-143 to STP-145 | B-035 | ui and design tests | Phase 6 |

Tracked as DDx beads labelled `feat:FEAT-018`, one per slice, under one
epic per phase.

## Issue Decomposition

Tracked in this conversation's task list and the PR description; no
external tracker is used in this repository.

| Story / Area | Goal | Dependencies |
|--------------|------|--------------|
| US-062 | Checks run on the state the agent reached, proven on three checkpoints | — |
| US-056 | A committed, validated manifest that binds HELIX | — |
| US-058 | Journeys traced to HELIX intent and tests | US-056 |
| US-059 | A recorded baseline before redesign | US-056, US-062 (B-001) |
| US-057 | One agent request runs the available stages | US-062, US-058, US-059 |
| US-060 | Journeys planned and walked within the manifest's restrictions | US-058, US-062 |
| US-061 | A coverage matrix with no false pass | US-060 |
| US-063 | Ranked, merged findings with stable IDs | US-061 |
| US-064 | Proposed HELIX changes, never applied | US-056, US-063 |
| US-065 | A report, run comparison and a CI gate | US-063, US-064 |

## Validation Plan

- [x] Failing tests exist before implementation starts (each STP's rows)
- [x] All required tests pass before closing a slice
- [x] Each built criterion is removed from `tools/coverage-exceptions.json`
- [ ] Behavior changes update canonical documents
- [ ] The operator reviews locally before any commit is pushed

## Risks and Rollbacks

| Risk | Impact | Response | Rollback |
|------|--------|----------|----------|
| The `inspect()` refactor changes audit findings | H | Compare findings on every existing fixture before and after B-001 | Revert B-001; `audit()` keeps its old body |
| CDP sharing loses pages or frames | H | B-002's proof uses a second client; record it in ADR-026 if the driver differs | Fall back to the replay adapter for the proof |
| The local HELIX catalogue differs from the documents' | M | Record both; types the bound catalogue lacks are reported | Pin `helix.catalog` to a path |
| `yaml` or `ajv` fail the licence check | L | Both are permissive; checked in B-003 | Use JSON for the manifest (ADR-026 alternative) |

## Exit Criteria

- [x] Build issue set is defined with sequence and dependencies
- [x] Shared constraints are documented
- [x] Verification expectations are explicit
- [x] Work items can be created from this plan without inventing scope

## Review Checklist

- [x] Governing artifacts are listed and exist on disk
- [x] Shared constraints trace back to requirements, design, or architecture
- [x] Build sequence has a justified ordering
- [x] Dependencies between build steps are explicit
- [x] Each story references its governing artifacts (TP, SD, STP)
- [x] Quality gates are specific and enforceable
- [x] Risks have concrete responses
- [x] Plan is consistent with the test plan and solution design
