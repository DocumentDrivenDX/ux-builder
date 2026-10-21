---
ddx:
  id: STP-065
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-065
    - kind: informed_by
      to: SD-004
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-065-compare-assessments

## Story Reference

**User Story**: [[US-065-compare-assessments]] (Compare assessments and hand work to an agent)
**Technical Design**: N/A (SD-004 and CONTRACT-006 "Increments 2 and 3")
**Related Solution Design**: [[SD-004-helix-aware-ux-assessment]]
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Runs are readable, recorded, comparable and repeatable.
**Blocking Gate**: `node --test packages/audit/test/assess-runs.test.mjs`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-065-AC1 | Given a completed run, when its package is validated, then it has a readable report and schema-valid JSON for the backlog, coverage matrix, evidence index, baseline summary and proposals. | `the package is complete and readable` | `report` writes `report.html`, `report.md` and `evidence.json`; `validate-report` passes | `@covers US-065-AC1` | Integration | `packages/audit/test/assess-runs.test.mjs` | Fixture HELIX repository and run packages | |
| US-065-AC2 | Given a run, when its record is read, then it holds the app's commit, each document's revision, the manifest version, the installed SDK and audit versions, the agent and model when known, the configuration and the time. | `the run record is complete` | `run.json` has the commit, revisions, manifest version, versions, agent and model, configuration and time | `@covers US-065-AC2` | Integration | `packages/audit/test/assess-runs.test.mjs` | Fixture HELIX repository and run packages | |
| US-065-AC3 | Given two runs of the same scope, when compared, then each finding is `new`, `persistent`, `resolved`, `regressed` or `not rechecked`, and a finding whose state was not assessed in the later run is `not rechecked`, never `resolved`. | `compare classifies every finding` | new, persistent, resolved, regressed and not rechecked, with a not-assessed state never resolving | `@covers US-065-AC3` | Integration | `packages/audit/test/assess-runs.test.mjs` | Fixture HELIX repository and run packages | |
| US-065-AC4 | Given a rerun of the same scope, when the backlog is updated, then no finding is duplicated, and partial runs and execution errors are reported apart from finding severity. | `reruns do not duplicate; partial runs are apart` | stable IDs keep one finding per problem across runs; the report lists blocked stages apart from findings | `@covers US-065-AC4` | Integration | `packages/audit/test/assess-runs.test.mjs` | Fixture HELIX repository and run packages | |

## Executable Proof

```bash
node --test packages/audit/test/assess-runs.test.mjs
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with the asserted behaviour and its `@covers` citation
- [x] Commands and files are specific
