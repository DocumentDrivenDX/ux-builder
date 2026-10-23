---
ddx:
  id: STP-142
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-142
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-142-read-the-ux-evaluation-report-with-predicted-and-observed-results

## Story Reference

**User Story**: [[US-142-read-the-ux-evaluation-report-with-predicted-and-observed-results]] (Read the UX evaluation report with predicted and observed results)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-142's criteria on fixtures: a fixture app, blueprint and design state, with no network, no model and no real participants.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-142-AC1 | Given a design state with a chosen alternative, rubric predictions and imported observations, when `ux-builder-design report` runs, then it writes `docs/ux/evaluations/UER-<n>.md` with method, tasks, findings by journey with evidence and severity, proposed corrections, the rubric with predicted and observed columns, and what was not tested. | `us-142-ac1` | It writes `docs/ux/evaluations/UER-<n>.md` with method, tasks, findings by journey with evidence and severity, proposed corrections, the rubric with predicted and observed columns, and what was not tested | `@covers US-142-AC1` | Integration | `packages/design/test/report.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-142-AC2 | Given a rubric dimension whose observation contradicts its prediction, when the report is written, then the dimension is highlighted, and the assumptions behind the prediction move to `refuted` in the design state. | `us-142-ac2` | The dimension is highlighted, and the assumptions behind the prediction move to `refuted` in the design state | `@covers US-142-AC2` | Integration | `packages/design/test/report.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-142-AC3 | Given no human observations, when the report is written, then the observed column says no human evidence exists, and nothing is marked refuted or confirmed. | `us-142-ac3` | The observed column says no human evidence exists, and nothing is marked refuted or confirmed | `@covers US-142-AC3` | Integration | `packages/design/test/report.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-142-AC4 | Given findings the person selects at checkpoint core-3, when they are routed, then each is written as a `propose` patch to the HELIX improvement backlog, and the decision record moves to `tested` or `refuted` with `decision status`. | `us-142-ac4` | Each is written as a `propose` patch to the HELIX improvement backlog, and the decision record moves to `tested` or `refuted` with `decision status` | `@covers US-142-AC4` | Integration | `packages/design/test/report.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-142-AC5 | Given a written report, when `ux-builder-design validate` runs, then it checks the report against the template's required sections and frontmatter links. | `us-142-ac5` | It checks the report against the template's required sections and frontmatter links | `@covers US-142-AC5` | Integration | `packages/design/test/report.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |

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
- [x] No test depends on the network, a model or real participants
