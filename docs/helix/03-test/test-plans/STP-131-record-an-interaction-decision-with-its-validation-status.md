---
ddx:
  id: STP-131
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-131
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-131-record-an-interaction-decision-with-its-validation-status

## Story Reference

**User Story**: [[US-131-record-an-interaction-decision-with-its-validation-status]] (Record an interaction decision with its validation status)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-131's criteria with fixtures only: no network, no model, no browser unless a row says so.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-131-AC1 | Given the question, at least two alternatives, the choice, the rationale, the assumptions and the required validation, when `ux-builder-design decision add` runs, then it writes `docs/ux/decisions/UXD-<n>.md` with the next free number, every field, and status `not-tested`. | `us-131-ac1` | It writes `docs/ux/decisions/UXD-<n>.md` with the next free number, every field, and status `not-tested` | `@covers US-131-AC1` | Unit | `packages/design/test/decisions.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-131-AC2 | Given `decision add` with fewer than two alternatives or a choice not among them, when it runs, then it exits 1 naming the problem and writes nothing. | `us-131-ac2` | It exits 1 naming the problem and writes nothing | `@covers US-131-AC2` | Unit | `packages/design/test/decisions.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-131-AC3 | Given UXD-1, when `ux-builder-design decision status UXD-1 refuted --evidence UER-1` runs, then the record's status becomes `refuted` with the evidence ID and date, and its history keeps the earlier status. | `us-131-ac3` | The record's status becomes `refuted` with the evidence ID and date, and its history keeps the earlier status | `@covers US-131-AC3` | Unit | `packages/design/test/decisions.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-131-AC4 | Given a decision record, when `ux-builder-design validate` runs, then it checks the frontmatter links to the HELIX documents it relates to and that the status is one of the three values. | `us-131-ac4` | It checks the frontmatter links to the HELIX documents it relates to and that the status is one of the three values | `@covers US-131-AC4` | Unit | `packages/design/test/decisions.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-131-AC5 | Given a decision added, when the episode trace is read, then a `decision` event records it with the UXD ID. | `us-131-ac5` | A `decision` event records it with the UXD ID | `@covers US-131-AC5` | Content | `packages/design/test/decisions.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |

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
