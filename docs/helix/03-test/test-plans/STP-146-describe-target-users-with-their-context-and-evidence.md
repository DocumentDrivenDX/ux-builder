---
ddx:
  id: STP-146
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-146
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-146-describe-target-users-with-their-context-and-evidence

## Story Reference

**User Story**: [[US-146-describe-target-users-with-their-context-and-evidence]] (Describe target users with their context and evidence)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-146's criteria with fixtures only: no network, no model, no browser.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-146-AC1 | Given a target user, when `ux-builder-design segment add --user <who> --context <c> [--need <need>]... [--evidence <study>] [--confidence] [--status]` runs, then it proposes a row of the PRD's *User Segments* with the user, context, its needs by name (each a *User Needs* row), evidence, confidence and status; without a context, or naming a need the PRD lacks, it is refused; and `validate` checks rows written by hand. | `us-146-ac1` | It checks every row has a unique a user ID, a user, a context, jobs with an importance each, evidence, a confidence and a status; confidence above low needs at least one evidence source, and a hypothesis cites none | `@covers US-146-AC1` | Integration | `packages/design/test/users.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-146-AC2 | Given a *User Segments* row holding a need *User Needs* lacks, or citing a study that does not exist, when `validate` runs, then it exits 1 naming the user and the need or study. | `us-146-ac2` | It exits 1 naming the user and the missing ID | `@covers US-146-AC2` | Integration | `packages/design/test/users.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-146-AC3 | Given the PRD's *User Segments*, when `brief` runs, then the brief's *Target users* come from them alone, each with its context and status. | `us-146-ac3` | The brief's Target users lists each user with its context and status, from the PRD's *User Segments* alone (not the PRD's personas or separate user points) | `@covers US-146-AC3` | Integration | `packages/design/test/users.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-146-AC4 | Given a blueprint task naming a user *User Segments* lacks, when `validate` runs, then it exits 1; a task serving a low-confidence user is warned about. | `us-146-ac4` | It exits 1 naming the task and the ID; a task citing a low-confidence user gets a warning | `@covers US-146-AC4` | Integration | `packages/design/test/users.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-146-AC5 | Given tasks that name their users, when `test-kit` runs, then the plan's *Screener* asks about each target user with its context, the run's task list says who each task is for, and `observations.csv` has a `user` column. | `us-146-ac5` | The screener asks about each target user with its context, `scenarios.md` says who each task is for, and `observations.csv` has a `user` column | `@covers US-146-AC5` | Integration | `packages/design/test/users.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-146-AC6 | Given imported observations whose rows name a user, when `report` runs, then its measures are broken down by user; and `trace a user` lists the user's jobs, tasks and journeys. | `us-146-ac6` | Its measures are broken down by user; and `trace a user` lists the user's jobs, tasks and journeys | `@covers US-146-AC6` | Integration | `packages/design/test/users.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |

## Executable Proof

```bash
npm test --workspace @ux-builder/design
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
