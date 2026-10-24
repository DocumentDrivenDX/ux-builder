---
ddx:
  id: STP-118
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-118
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-118-the-guide-stops-at-checkpoints-and-records-the-answers

## Story Reference

**User Story**: [[US-118-the-guide-stops-at-checkpoints-and-records-the-answers]] (The guide stops at checkpoints and records the answers)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-118's criteria on fixture apps in temporary folders, with no network and no model.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-118-AC1 | Given an app at Define with an open episode, when `state checkpoint core-1 --answer <text>` runs, then the state marks `core-1` passed with the answer and time, and the trace gains a `decision` event whose `chose` is the answer. | `us-118-ac1-checkpoint-answer` | state and trace both record it | `@covers US-118-AC1` | Unit | `packages/design/test/checkpoints.test.mjs` | Temp app with an open episode | Planned: not built yet |
| US-118-AC2 | Given an app, when `state checkpoint core-2 --skip --reason <text>` runs, then the state marks `core-2` skipped with the reason; without `--reason` it exits 2 (bad input, CONTRACT-008) and writes nothing. | `us-118-ac2-checkpoint-skip` | skip needs a reason | `@covers US-118-AC2` | Unit | `packages/design/test/checkpoints.test.mjs` | Temp app | Planned: not built yet |
| US-118-AC3 | Given any checkpoint ID other than the six CONTRACT-008 names, when `state checkpoint` runs with it, then it exits 2 (bad input, CONTRACT-008) naming the six valid IDs. | `us-118-ac3-checkpoint-ids` | unknown ID refused | `@covers US-118-AC3` | Unit | `packages/design/test/checkpoints.test.mjs` | Temp app | Planned: not built yet |
| US-118-AC4 | Given the installed skill, when its text is read, then it lists the three core and three conditional checkpoints, says to ask one question and wait, to ask only questions whose answers change the design, and to list small reversible assumptions with `state set`. | `us-118-ac4-skill-checkpoints` | checkpoint and questioning rules present | `@covers US-118-AC4` | Unit | `packages/design/test/skill.test.mjs` | Skill file | Planned: not built yet |
| US-118-AC5 | Given the installed skill, when its text is read, then it says HELIX documents change only through `ux-builder-blueprint propose` patches offered as a batch at a checkpoint, and that the guide never edits `docs/helix/` itself. | `us-118-ac5-skill-propose-only` | propose-only rule present | `@covers US-118-AC5` | Unit | `packages/design/test/skill.test.mjs` | Skill file | Planned: not built yet |

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
