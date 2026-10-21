---
ddx:
  id: STP-063
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-063
    - kind: informed_by
      to: SD-004
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-063-prioritize-recommendations

## Story Reference

**User Story**: [[US-063-prioritize-recommendations]] (Assess and prioritize each recommendation)
**Technical Design**: N/A (SD-004 and CONTRACT-006 "Increments 2 and 3")
**Related Solution Design**: [[SD-004-helix-aware-ux-assessment]]
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Findings are complete, mapped to real components, merged and ranked by the rubric.
**Blocking Gate**: `node --test packages/audit/test/assess-backlog.test.mjs`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-063-AC1 | Given a finding, when the backlog is validated, then it has every field of CONTRACT-006's finding record, and one without evidence or an explicit uncertainty label, a requirement or proposed criterion, and a verification method fails. | `every finding has every field, evidence or uncertainty, a requirement or proposed criterion, and verification` | `validate-report` names each missing field | `@covers US-063-AC1` | Integration | `packages/audit/test/assess-backlog.test.mjs` | Fixture HELIX repository and run packages | |
| US-063-AC2 | Given a recommended change, when it names SDK components, then each is a pattern or widget in the app's installed catalogue, with its version and catalogue reference, and the change is marked composition work, custom gap or SDK defect. | `components exist in the app's installed catalogue` | a pattern the catalogue lacks fails unless the work is `custom-gap`; the version must be the installed one | `@covers US-063-AC2` | Integration | `packages/audit/test/assess-backlog.test.mjs` | Fixture HELIX repository and run packages | |
| US-063-AC3 | Given one problem seen at several checkpoints, when findings are merged, then it is one finding listing every evidence reference; two different user problems on one element remain two findings. | `one problem, one finding` | `merge` combines findings with the same type, journey, state and key into one with every evidence reference; different keys stay apart | `@covers US-063-AC3` | Integration | `packages/audit/test/assess-backlog.test.mjs` | Fixture HELIX repository and run packages | |
| US-063-AC4 | Given the ranked backlog, when read, then each finding has a priority from the P0 to P3 rubric, a confidence (high, medium or low with a reason) and an effort as separate fields, unknown usage is `unknown`, and a low-confidence P0 or P1 concern is listed as validation work. | `the rubric's fields, and validation work` | a low-confidence P1 without `validation_work: true` fails; priority, confidence and effort are separate | `@covers US-063-AC4` | Integration | `packages/audit/test/assess-backlog.test.mjs` | Fixture HELIX repository and run packages | |

## Executable Proof

```bash
node --test packages/audit/test/assess-backlog.test.mjs
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with the asserted behaviour and its `@covers` citation
- [x] Commands and files are specific
