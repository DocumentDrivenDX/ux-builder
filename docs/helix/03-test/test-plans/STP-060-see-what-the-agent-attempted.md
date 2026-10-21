---
ddx:
  id: STP-060
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-060
    - kind: informed_by
      to: SD-004
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-060-see-what-the-agent-attempted

## Story Reference

**User Story**: [[US-060-see-what-the-agent-attempted]] (See what the agent attempted and observed)
**Technical Design**: N/A (SD-004 and CONTRACT-006 "Increments 2 and 3")
**Related Solution Design**: [[SD-004-helix-aware-ux-assessment]]
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Walkthroughs are planned from HELIX and recorded with their evidence; restricted steps are refused and recorded.
**Blocking Gate**: `node --test packages/audit/test/assess-walkthrough.test.mjs`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-060-AC1 | Given a journey, when it is planned, then its role, fixture, entry route, goal, steps, expected outcomes and story and criterion IDs are recorded, reusing the E2E setup and paths where the manifest maps them. | `plan records each journey from its story and tests` | `plan.json` gives each journey its role, fixture, entry, goal (the story's title), criteria with text, expected outcomes, and the E2E tests it reuses from traceability | `@covers US-060-AC1` | Integration | `packages/audit/test/assess-walkthrough.test.mjs` | Fixture HELIX repository and run packages | |
| US-060-AC2 | Given a walkthrough, when the agent observes a screen, then it uses screenshots and the accessibility tree from a supported driver, and an observation based on DOM text alone is not recorded as a visual judgment. | `visual judgments need a screenshot` | `validate-report` fails an observation with `visual: true` whose basis is only `dom-text`, and passes it with `screenshot` | `@covers US-060-AC2` | Integration | `packages/audit/test/assess-walkthrough.test.mjs` | Fixture HELIX repository and run packages | |
| US-060-AC3 | Given each significant step, when a checkpoint is recorded, then it has the URL, the actions so far, the observation and evidence references, and agent judgments are stored apart from deterministic failures. | `checkpoints carry URL, actions, observation and evidence` | `validate-report` fails a step with a checkpoint but no URL or observation; judgments live in `judgment`, never in inspection findings | `@covers US-060-AC3` | Integration | `packages/audit/test/assess-walkthrough.test.mjs` | Fixture HELIX repository and run packages | |
| US-060-AC4 | Given a state that needs a fixture, mock, permission or integration the manifest does not provide, when it is attempted, then it is `blocked` or `not assessed` with the reason and no observation. | `blocked states have a reason and no observation` | a blocked step with an observation, or without a reason, fails `validate-report` | `@covers US-060-AC4` | Integration | `packages/audit/test/assess-walkthrough.test.mjs` | Fixture HELIX repository and run packages | |
| US-060-AC5 | Given a walkthrough, when a step would leave `run.origins`, call an excluded integration or take a denied action, then it is not taken and is recorded as `blocked: restricted`; each scenario starts after its fixture's `reset`; and every screenshot and tree is masked per `evidence.redact` before it is written. | `restricted steps are refused; fixtures reset; evidence masked` | with `assess browser --manifest`, a page on a host outside `run.origins`, or on an allowed host that `restrictions.excludeIntegrations` names, fails to load; `inspect --replay` takes no step of a replay whose step declares a denied action or goes to an excluded integration, and records `blocked: restricted`; `assess reset` runs the fixture's reset; `inspect --manifest` masks the manifest's selectors and text in the screenshot and tree | `@covers US-060-AC5` | Integration | `packages/audit/test/assess-walkthrough.test.mjs` | Fixture HELIX repository and run packages | |

## Executable Proof

```bash
node --test packages/audit/test/assess-walkthrough.test.mjs
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with the asserted behaviour and its `@covers` citation
- [x] Commands and files are specific
