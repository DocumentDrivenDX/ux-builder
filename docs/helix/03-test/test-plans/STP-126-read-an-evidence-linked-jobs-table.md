---
ddx:
  id: STP-126
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-126
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-126-read-an-evidence-linked-jobs-table

## Story Reference

**User Story**: [[US-126-read-an-evidence-linked-jobs-table]] (Read an evidence-linked jobs table)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-126's criteria with fixtures only: no network, no model, no browser unless a row says so.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-126-AC1 | Given a `docs/ux/jobs.md` written from the template, when `ux-builder-design validate` runs, then it checks every job has a unique `J-<n>` ID, an importance, a confidence and an evidence list, each a separate field. | `us-126-ac1` | It checks every job has a unique `J-<n>` ID, an importance, a confidence and an evidence list, each a separate field | `@covers US-126-AC1` | Unit | `packages/design/test/jobs.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-126-AC2 | Given a job whose evidence cites `EV-9` and no such evidence file exists, when `validate` runs, then it exits 1 and names the job and the missing source. | `us-126-ac2` | It exits 1 and names the job and the missing source | `@covers US-126-AC2` | Unit | `packages/design/test/jobs.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-126-AC3 | Given a job with high confidence and no evidence, when `validate` runs, then it exits 1: confidence above low needs at least one evidence source. | `us-126-ac3` | It exits 1: confidence above low needs at least one evidence source | `@covers US-126-AC3` | Unit | `packages/design/test/jobs.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-126-AC4 | Given a task (`T-<n>`) or a UX decision (an ADR tagged `area:ui`) that cites a low-confidence job, when `validate` runs, then it warns, naming the item and the job. | `us-126-ac4` | It warns, naming the item and the job | `@covers US-126-AC4` | Unit | `packages/design/test/jobs.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-126-AC5 | Given a job ID that a task cites but `jobs.md` lacks, when `validate` runs, then it exits 1 and names the task and the ID. | `us-126-ac5` | It exits 1 and names the task and the ID | `@covers US-126-AC5` | Unit | `packages/design/test/jobs.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |

## Executable Proof

```bash
npm test --workspace @ux-builder/design
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
