---
ddx:
  id: STP-145
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-145
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-145-run-an-experiment-through-its-checkpoints

## Story Reference

**User Story**: [[US-145-run-an-experiment-through-its-checkpoints]] (Run an experiment through its checkpoints)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-145's criteria on fixtures: a fixture app, blueprint and design state, with no network, no model and no real participants.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-145-AC1 | Given an insight and a new blueprint alternative, when the guide records the diagnosis, then the design state holds the observation, at least two explanations, the hypothesis and the alternative, linked to the insight. | `us-145-ac1` | The design state holds the observation, at least two explanations, the hypothesis and the alternative, linked to the insight | `@covers US-145-AC1` | Integration | `packages/design/test/experiments.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-145-AC2 | Given no answered `experiment` checkpoint for the decision, when `experiment start` runs, then it refuses and names the checkpoint. | `us-145-ac2` | It refuses and names the checkpoint | `@covers US-145-AC2` | Integration | `packages/design/test/experiments.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-145-AC3 | Given an answered checkpoint, when `experiment start --decision ADR-<nnn> --variant <alt> --metric <m> --guardrail <m> --duration <days>` runs, then it writes `docs/ux/experiments/EXP-<n>.md` with the variant, metric, guardrails and duration, and lists the experiment as running in the design state. | `us-145-ac3` | It writes `docs/ux/experiments/EXP-<n>.md` with the variant, metric, guardrails and duration, and lists the experiment as running in the design state | `@covers US-145-AC3` | Integration | `packages/design/test/experiments.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-145-AC4 | Given a fixture result file, when `experiment end --result <file>` runs, then it compares task success and each guardrail, records the result against the hypothesis, and asks the `release` checkpoint. | `us-145-ac4` | It compares task success and each guardrail, records the result against the hypothesis, and asks the `release` checkpoint | `@covers US-145-AC4` | Integration | `packages/design/test/experiments.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-145-AC5 | Given an experiment whose metrics are new, when it starts, then metric definitions are written only as `propose` patches to HELIX's metric-definition documents. | `us-145-ac5` | Metric definitions are written only as `propose` patches to HELIX's metric-definition documents | `@covers US-145-AC5` | Integration | `packages/design/test/experiments.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |

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
