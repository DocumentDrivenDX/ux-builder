---
ddx:
  id: STP-124
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-124
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-124-the-agent-proposes-user-hypotheses-labelled-as-such

## Story Reference

**User Story**: [[US-124-the-agent-proposes-user-hypotheses-labelled-as-such]] (The agent proposes user hypotheses, labelled as such)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-124's criteria with fixtures only: no network, no model, no browser unless a row says so.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-124-AC1 | Given a created app, when the `ux-builder-design` skill is read, then its research section tells the agent to propose segments, jobs, motivations, frustrations, usage contexts and accessibility needs from the brief, and to mark every item *hypothesis* with no evidence. | `us-124-ac1` | Its research section tells the agent to propose segments, jobs, motivations, frustrations, usage contexts and accessibility needs from the brief, and to mark every item *hypothesis* with no evidence | `@covers US-124-AC1` | Content | `packages/design/test/research.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-124-AC2 | Given a `docs/ux/jobs.md` whose items all have status `hypothesis` and no evidence, when `ux-builder-design validate` runs, then it exits 0 and reports each item as a hypothesis. | `us-124-ac2` | It exits 0 and reports each item as a hypothesis | `@covers US-124-AC2` | Unit | `packages/design/test/research.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-124-AC3 | Given a job with status `hypothesis` that lists an evidence source, when `ux-builder-design validate` runs, then it exits 1 and names the job and the field. | `us-124-ac3` | It exits 1 and names the job and the field | `@covers US-124-AC3` | Unit | `packages/design/test/research.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-124-AC4 | Given hypotheses recorded in the design state, when `ux-builder-design status --json` runs, then it counts jobs by status, and every hypothesis has confidence `low` or none. | `us-124-ac4` | It counts jobs by status, and every hypothesis has confidence `low` or none | `@covers US-124-AC4` | Unit | `packages/design/test/research.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |

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
