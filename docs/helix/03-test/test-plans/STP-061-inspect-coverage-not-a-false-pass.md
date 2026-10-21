---
ddx:
  id: STP-061
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-061
    - kind: informed_by
      to: SD-004
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-061-inspect-coverage-not-a-false-pass

## Story Reference

**User Story**: [[US-061-inspect-coverage-not-a-false-pass]] (Inspect coverage instead of receiving a false pass)
**Technical Design**: N/A (SD-004 and CONTRACT-006 "Increments 2 and 3")
**Related Solution Design**: [[SD-004-helix-aware-ux-assessment]]
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Every planned pair is accounted for, heuristics are recommendations, and user claims are left to users.
**Blocking Gate**: `node --test packages/audit/test/assess-coverage.test.mjs`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-061-AC1 | Given a plan, when the run ends, then every journey-and-state pair is `assessed`, `blocked`, `not assessed` or `not applicable` with a reason, and an `assessed` pair without an outcome and evidence fails validation. | `every planned pair is in coverage, with evidence when assessed` | `plan` writes every pair; `validate-report` fails a missing pair, and an `assessed` pair without outcome or evidence | `@covers US-061-AC1` | Integration | `packages/audit/test/assess-coverage.test.mjs` | Fixture HELIX repository and run packages | |
| US-061-AC2 | Given a heuristic concern not backed by a story, when it is reported, then it is a proposed criterion labelled as a recommendation, never as an existing obligation. | `heuristic findings are proposed criteria` | `validate-report` fails a heuristic finding whose expected behaviour is not a proposed criterion; the report lists heuristics under Recommendations | `@covers US-061-AC2` | Integration | `packages/audit/test/assess-coverage.test.mjs` | Fixture HELIX repository and run packages | |
| US-061-AC3 | Given claims about confusion, trust or time saved, when the report is written, then they are listed as needing representative users and none is stated as found. | `user claims go to representative users` | the report lists `user_validation` under Needs representative users; a `real-user` finding without real-user evidence fails | `@covers US-061-AC3` | Integration | `packages/audit/test/assess-coverage.test.mjs` | Fixture HELIX repository and run packages | |

## Executable Proof

```bash
node --test packages/audit/test/assess-coverage.test.mjs
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with the asserted behaviour and its `@covers` citation
- [x] Commands and files are specific
