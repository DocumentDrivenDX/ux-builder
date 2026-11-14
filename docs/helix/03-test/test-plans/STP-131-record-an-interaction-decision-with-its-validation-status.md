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
| US-131-AC1 | Given the question, at least two alternatives, the choice, the rationale, the assumptions and the required validation, when `ux-builder-design decision add` runs, then it proposes `docs/helix/02-design/adr/ADR-<nnn>-<slug>.md` with the next free ADR number (counting proposed ones), tagged `area:ui`, every field, and *Validation* *not tested*; nothing is written under `docs/helix/`. | `us-131-ac1` | It proposes `docs/helix/02-design/adr/ADR-<nnn>-<slug>.md`, next free number, tagged `area:ui`, every field, *Validation* *not tested*; nothing is written under `docs/helix/` | `@covers US-131-AC1` | Unit | `packages/design/test/decisions.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-131-AC2 | Given `decision add` with fewer than two alternatives or a choice not among them, when it runs, then it exits 2 (bad input, CONTRACT-008) naming the problem and writes nothing. | `us-131-ac2` | It exits 2 naming the problem and writes nothing | `@covers US-131-AC2` | Unit | `packages/design/test/decisions.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-131-AC3 | Given ADR-008, when `ux-builder-design decision status ADR-008 refuted --evidence <where>` runs, then it proposes the *Validation* result `refuted` with the evidence and date, and its history keeps the earlier result. | `us-131-ac3` | It proposes *Validation* `refuted` with the evidence and date; the history keeps the earlier result | `@covers US-131-AC3` | Unit | `packages/design/test/decisions.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-131-AC4 | Given the proposal accepted, when `ux-builder-design proposals apply --accepted <id>` applies it, then the ADR is written with HELIX's required ADR sections (*Problem*, *Decision*, *Why We Chose This*, *Consequences*); given no HELIX, `decision add` exits 2 saying to frame HELIX first. | `us-131-ac4` | Applied, the ADR has HELIX's required sections; with no HELIX, `decision add` exits 2 saying to frame HELIX first | `@covers US-131-AC4` | Unit | `packages/design/test/decisions.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-131-AC5 | Given a decision added, when the episode trace is read, then a `decision` event records it with the ADR ID. | `us-131-ac5` | A `decision` event records it with the ADR ID | `@covers US-131-AC5` | Content | `packages/design/test/decisions.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |

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
