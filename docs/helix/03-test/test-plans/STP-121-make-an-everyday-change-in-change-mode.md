---
ddx:
  id: STP-121
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-121
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-121-make-an-everyday-change-in-change-mode

## Story Reference

**User Story**: [[US-121-make-an-everyday-change-in-change-mode]] (Make an everyday change in change mode)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-121's criteria on fixture apps in temporary folders, with no network and no model.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-121-AC1 | Given an app, when `ux-builder-design mode change` then `mode full` run, then the state's `mode` follows each, and `status` shows it. | `us-121-ac1-mode-switch` | mode recorded and shown | `@covers US-121-AC1` | Unit | `packages/design/test/mode.test.mjs` | Temp app | Built |
| US-121-AC2 | Given an app in change mode and a change to a screen whose decision is `tested`, when `impact "<change>" --json` runs, then it lists the affected items and sets `checkpointRequired` to `significant-change`. | `us-121-ac2-change-mode-validated` | checkpoint required | `@covers US-121-AC2` | Unit | `packages/design/test/trace-impact.test.mjs` | Fixture app with a tested UXD | Built |
| US-121-AC3 | Given the same change to a screen with no tested decision, when `impact --json` runs, then `checkpointRequired` is absent. | `us-121-ac3-change-mode-unvalidated` | no checkpoint | `@covers US-121-AC3` | Unit | `packages/design/test/trace-impact.test.mjs` | Fixture app | Built |
| US-121-AC4 | Given the installed skill, when its text is read, then it says when to use the full loop and when change mode, lists change mode's four steps, and tells the agent to say which mode it is in and that the person can switch. | `us-121-ac4-skill-modes` | mode guidance present | `@covers US-121-AC4` | Unit | `packages/design/test/skill.test.mjs` | Skill file | Built |

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
