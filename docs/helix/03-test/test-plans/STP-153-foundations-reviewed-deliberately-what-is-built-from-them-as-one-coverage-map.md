---
ddx:
  id: STP-153
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-153
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-153-foundations-reviewed-deliberately-what-is-built-from-them-as-one-coverage-map

## Story Reference

**User Story**: [[US-153-foundations-reviewed-deliberately-what-is-built-from-them-as-one-coverage-map]]
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-153's criteria with fixtures only: no network, no model, no browser.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-153-AC1 | Given an app with foundations, built items and an evidence record, when `review` runs, then it lists foundations and built items apart, records need no approval and hold no checkpoint, and its next step names the first foundation table. | `us-153-ac1` | It lists foundations and built items apart, records need no approval and hold no checkpoint, and its next step names the first foundation table | `@covers US-153-AC1` | Integration | `packages/design/test/human-time.test.mjs` | Fixture apps in temp folders; no network, no model | Built |
| US-153-AC2 | Given target users awaiting review, when `review table user` runs, then it shows every user in full with its status, `review approve --kind user --answer` approves them all in the person's words, open feedback on any refuses it, and a built kind has no table and no `--kind` approval. | `us-153-ac2` | It shows every user in full with its status, `review approve --kind user --answer` approves them all in the person's words, open feedback on any refuses it, and a built kind has no table and no `--kind` approval | `@covers US-153-AC2` | Integration | `packages/design/test/human-time.test.mjs` | Fixture apps in temp folders; no network, no model | Built |
| US-153-AC3 | Given a blueprint and jobs, when `review map` runs, then it traces each job to its tasks, journeys and screens and lists the exceptions (a job nothing serves, a task serving no job, a journey with no story or task, a screen on no journey, an undefined rule, a new assumption); `review approve map` refuses, naming them, until each is fixed or accepted with `--accept`, and then approves every built item. | `us-153-ac3` | It traces each job to its tasks, journeys and screens and lists the exceptions (a job nothing serves, a task serving no job, a journey with no story or task, a screen on no journey, an undefined rule, a new assumption); `review approve map` refuses, naming them, until each is fixed or accepted with `--accept`, and then approves every built item | `@covers US-153-AC3` | Integration | `packages/design/test/human-time.test.mjs` | Fixture apps in temp folders; no network, no model | Built |
| US-153-AC4 | Given an approved map, when a built item's meaning changes, then the map lists only that item, with its diff, and approving the map approves only it. | `us-153-ac4` | The map lists only that item, with its diff, and approving the map approves only it | `@covers US-153-AC4` | Integration | `packages/design/test/human-time.test.mjs` | Fixture apps in temp folders; no network, no model | Built |
| US-153-AC5 | Given the skill, when it is read, then it reviews foundations a table per kind, built items as the map with exceptions one by one, records only as the decisions they lead to, and never asks for the same content twice. | `us-153-ac5` | It reviews foundations a table per kind, built items as the map with exceptions one by one, records only as the decisions they lead to, and never asks for the same content twice | `@covers US-153-AC5` | Integration | `packages/design/test/human-time.test.mjs` | Fixture apps in temp folders; no network, no model | Built |

## Executable Proof

```bash
npm test --workspace @ux-builder/design
```

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
