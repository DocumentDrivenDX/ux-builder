---
ddx:
  id: STP-163
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-163
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-163-a-prototype-ends-every-step

## Story Reference

**User Story**: [[US-163-a-prototype-ends-every-step]]
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-163's criteria with fixtures only: no network, no model, no browser (the audit runner is injected).
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-163-AC1 | Given a design with no modality recorded, when `ux-builder-design prototype --step` runs, then it writes `docs/ux-builder/prototypes/step-<n>/` with an `index.html`, using responsive web, the compact, medium, expanded and large size classes and the frame recommended from the destinations, records each as an assumption, and records the step prototype in the state; with a modality recorded, it uses that. | `us-163-ac1` | It writes `docs/ux-builder/prototypes/step-<n>/` with an `index.html`, using responsive web, the compact, medium, expanded and large size classes and the frame recommended from the destinations, records each as an assumption, and records the step prototype in the state; with a modality recorded, it uses that | `@covers US-163-AC1` | Integration | `packages/design/test/step-prototype.test.mjs` | Fixture design folders in temp directories; the audit runner stubbed; no network, no model, no browser | To build |
| US-163-AC2 | Given no theme chosen, then the step prototype uses `plain`, in the appearance the state records (light by default, dark when the agent set it), and records the appearance as an assumption with its reason. | `us-163-ac2` | The step prototype uses `plain`, in the appearance the state records (light by default, dark when the agent set it), and records the appearance as an assumption with its reason | `@covers US-163-AC2` | Integration | `packages/design/test/step-prototype.test.mjs` | Fixture design folders in temp directories; the audit runner stubbed; no network, no model, no browser | To build |
| US-163-AC3 | Given a step prototype, when `prototype --step --check` runs, then every page of it is audited and checked against the deterministic heuristics, the result is written to `check-<round>.json` with the pages audited, the round is recorded, and from step 5 the journey walk is requested. | `us-163-ac3` | Every page of it is audited and checked against the deterministic heuristics, the result is written to `check-<round>.json` with the pages audited, the round is recorded, and from step 5 the journey walk is requested | `@covers US-163-AC3` | Integration | `packages/design/test/step-prototype.test.mjs` | Fixture design folders in temp directories; the audit runner stubbed; no network, no model, no browser | To build |
| US-163-AC4 | Given the current step, when `step decide` runs without a step prototype whose first check is followed by a second check or `--nothing-to-fix`, then it exits 2 naming what is missing. | `us-163-ac4` | It exits 2 naming what is missing | `@covers US-163-AC4` | Integration | `packages/design/test/step-decide.test.mjs` | Fixture design folders in temp directories; the audit runner stubbed; no network, no model, no browser | To build |
| US-163-AC5 | Given a checked step prototype, when the person decides continue, then the step moves to the next one (a core checkpoint closing the step is answered by the same decision, and step 4 leads to step 5); revise keeps the step and marks its prototype stale; finish names the `finish` command. | `us-163-ac5` | The step moves to the next one (a core checkpoint closing the step is answered by the same decision, and step 4 leads to step 5); revise keeps the step and marks its prototype stale; finish names the `finish` command | `@covers US-163-AC5` | Integration | `packages/design/test/step-decide.test.mjs` | Fixture design folders in temp directories; the audit runner stubbed; no network, no model, no browser | To build |
| US-163-AC6 | Given the overview, the skill and the glossary, then each says every step ends with a prototype and the three choices, the skill tells the agent to report status in four lines (ready, blocked by, who is handling it, what I need from you) without engineering terms, never to end with the person owning a dependency, and `explain "step prototype"` says what it is. | `us-163-ac6` | Each says every step ends with a prototype and the three choices, the skill tells the agent to report status in four lines (ready, blocked by, who is handling it, what I need from you) without engineering terms, never to end with the person owning a dependency, and `explain "step prototype"` says what it is | `@covers US-163-AC6` | Integration | `packages/design/test/skill.test.mjs` | Fixture design folders in temp directories; the audit runner stubbed; no network, no model, no browser | To build |
| US-163-AC7 | Given a step decision, then it is recorded as a decision turn in the metrics, and the first decision on a shown step prototype marks the prototype milestone. | `us-163-ac7` | It is recorded as a decision turn in the metrics, and the first decision on a shown step prototype marks the prototype milestone | `@covers US-163-AC7` | Integration | `packages/design/test/step-decide.test.mjs` | Fixture design folders in temp directories; the audit runner stubbed; no network, no model, no browser | To build |

## Executable Proof

```bash
npm test --workspace @ux-builder/design
```

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
