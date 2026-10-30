---
ddx:
  id: STP-115
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-115
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-115-start-the-guide-in-an-existing-app-from-a-baseline

## Story Reference

**User Story**: [[US-115-start-the-guide-in-an-existing-app-from-a-baseline]] (Start the guide in an existing app from a baseline)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-115's criteria on fixture apps in temporary folders, with no network and no model.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-115-AC1 | Given an app with ux-builder, a blueprint and a HELIX marker, when `ux-builder-design init` runs, then it installs the skill into `.claude/skills/ux-builder-design/`, writes a valid empty design state and exits 0. | `us-115-ac1-init-full-app` | skill and state written | `@covers US-115-AC1` | Unit | `packages/design/test/init.test.mjs` | Fixture app with blueprint and `.helix.yml` | Built |
| US-115-AC2 | Given an app with ux-builder and no `app.blueprint.json`, when `init` runs, then it also writes a starting blueprint as `ux-builder-blueprint init` does, and says the guide will help describe the current screens. | `us-115-ac2-init-no-blueprint` | blueprint written; message | `@covers US-115-AC2` | Unit | `packages/design/test/init.test.mjs` | Fixture app without blueprint | Built |
| US-115-AC3 | Given an app without `@ux-builder/ui` installed, when `init` runs, then it writes the state and skill, and prints that the validated prototype and the audit need the SDK, naming the adoption steps. | `us-115-ac3-init-no-sdk` | warning names the adoption path | `@covers US-115-AC3` | Unit | `packages/design/test/init.test.mjs` | Fixture app without the SDK | Built |
| US-115-AC4 | Given an app that already has `.ux-builder/design-state.json`, when `init` runs, then it exits 2 (a refusal, CONTRACT-008), names the file and leaves it unchanged. | `us-115-ac4-init-refuses-overwrite` | exit 1; file byte-identical | `@covers US-115-AC4` | Unit | `packages/design/test/init.test.mjs` | Fixture app with a state | Built |
| US-115-AC5 | Given an existing app, when `ux-builder-design baseline` runs, then it exits 2 saying the command is retired and that HELIX's backfill drafts the PRD and stories from the app, as proposals (ADR-042); it writes nothing, and there is no baseline document type. | `us-115-ac5-baseline-draft` | baseline document and state | `@covers US-115-AC5` | Unit | `packages/design/test/baseline.test.mjs` | Fixture app with a recorded assessment run directory | Built |
| US-115-AC6 | Given the installed skill, when its text is read, then it says that an existing app's first session runs HELIX's `backfill` and then routes a specific change to impact and Explore, "too complicated" to the assessment and `simplify`, complaints to evidence, and a new feature to Define. | `us-115-ac6-skill-baseline-routing` | routing table present | `@covers US-115-AC6` | Unit | `packages/design/test/skill.test.mjs` | Skill file | Built |

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
