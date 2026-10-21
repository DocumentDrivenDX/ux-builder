---
ddx:
  id: STP-059
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-059
    - kind: informed_by
      to: SD-004
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-059-baseline-before-redesign

## Story Reference

**User Story**: [[US-059-baseline-before-redesign]] (Tell old failures from redesign regressions)
**Technical Design**: N/A (SD-004 covers the story at this size)
**Related Solution Design**: [[SD-004-helix-aware-ux-assessment]]
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: `baseline` records every test command's outcome and the audit with versions, keeps SDK adoption apart, and keeps failures visible.
**Blocking Gate**: `node --test packages/audit/test/assess-baseline.test.mjs`

**In Scope**
- `assess baseline`
- `baseline.json`

**Out of Scope**
- Comparison across runs (STP for US-065, increment 3)

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-059-AC1 | Given the manifest's test commands, when `assess baseline` runs, then for each it records the command, exit status, duration, and the tests passed, failed and skipped (from the declared runner report, else `unknown`), and its log with secrets masked; a command that did not run is `not run`, distinct from failed. | `test commands recorded` | A passing, a failing and a missing command give `passed`, `failed` and `not-run`/`error` with exit codes, durations and counts from a JUnit report (or `unknown` without one); logs are written with a referenced env value masked | `@covers US-059-AC1` | Integration | `packages/audit/test/assess-baseline.test.mjs` | Fixture commands; a JUnit file; env var `FIXTURE_TOKEN` | |
| US-059-AC2 | Given the manifest's URLs, widths, themes and appearances, when the baseline runs the audit, then it records the audit report, the installed `@ux-builder/ui` and `@ux-builder/audit` versions, and every check turned off or unsupported. | `audit recorded with versions and disabled checks` | `baseline.json` names the audit report, `versions.ui` and `versions.audit`, and lists `token-radii` under `off` | `@covers US-059-AC2` | Integration | `packages/audit/test/assess-baseline.test.mjs` | Fixture pages served over HTTP; `audit.off: [token-radii]` | |
| US-059-AC3 | Given an app that does not use the SDK, when the baseline runs, then findings that only mean "not on the SDK" are typed `sdk-adoption` and reported apart from usability findings, and no stage requires a migration. | `SDK adoption apart` | On a page with no SDK CSS, findings from `theme-applied`, `sdk-widgets` and `foreign-components` count under `sdkAdoption`, not `usability` | `@covers US-059-AC3` | Integration | `packages/audit/test/assess-baseline.test.mjs` | Plain HTML fixture page | |
| US-059-AC4 | Given a baseline, when a later run is compared with it, then every baseline failure is still listed; and every report states that passing functional tests do not show usability criteria are met. | `failures kept and the caveat stated` | `baseline.json` and the report keep the failing command; `note` is the CONTRACT-006 sentence; `compare` of the baseline's run with a later run lists each earlier failure in `comparison.json` `baseline.failures` with its later status, and the report shows them | `@covers US-059-AC4` | Integration | `packages/audit/test/assess-baseline.test.mjs` | As above | |

## Executable Proof

### Primary Commands

```bash
node --test packages/audit/test/assess-baseline.test.mjs
```

### Coverage Focus

- P0: every row above.
- P1: the edge cases below.

## Data and Setup

| Need | Required For | Source / Strategy |
|------|--------------|-------------------|
| Temp directories and git repositories | All rows | Created per test, removed after |
| Built `@ux-builder/ui` and `@ux-builder/tokens` CSS | Browser rows | `npm run build` before the suite, as the audit suites need |

## Edge Cases and Failure Modes

- A command that exceeds its time limit is killed and recorded as `error: timeout`.

## Build Handoff

**Implementation Order**
1. The first row's test, red, then the code that turns it green.
2. The remaining rows in order.

**Constraints**
- CONTRACT-006 formats; ADR-026 decisions; the existing audit suites pass unchanged.

**Done When**
- [ ] Every in-scope acceptance criterion has passing evidence
- [ ] Named commands or test files exist and run
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`
- [ ] The story can fail red before implementation and pass green after implementation

## Review Checklist

- [x] References the governing story and design
- [x] Every active acceptance criterion maps to concrete failing tests, keyed by its stable ID
- [x] Every row names the asserted behavior
- [x] Every row records its `@covers` citation
- [x] File paths and commands are specific
- [x] Setup and fixtures are explicit
- [x] Edge cases cover real story risks
- [x] Scope is one story slice
- [x] Build handoff gives a usable sequence
