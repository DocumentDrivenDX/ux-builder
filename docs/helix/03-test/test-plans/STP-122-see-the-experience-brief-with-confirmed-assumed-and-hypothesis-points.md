---
ddx:
  id: STP-122
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-122
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-122-see-the-experience-brief-with-confirmed-assumed-and-hypothesis-points

## Story Reference

**User Story**: [[US-122-see-the-experience-brief-with-confirmed-assumed-and-hypothesis-points]] (See the experience brief with confirmed, assumed and hypothesis points)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-122's criteria on fixture apps in temporary folders, with no network and no model.
**Blocking Gate**: `npm test --workspace @ux-builder/design` and `npm test --workspace @ux-builder/ui`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-122-AC1 | Given a HELIX PRD, stories and a design state with one confirmed point, one assumption and one hypothesis, when `brief` runs, then `docs/ux-builder/brief.md` has the seven sections CONTRACT-008 names, and each point carries its status. | `us-122-ac1-brief-sections` | sections and statuses | `@covers US-122-AC1` | Unit | `packages/design/test/brief.test.mjs` | Fixture HELIX docs and state | Built |
| US-122-AC2 | Given a brief with a hypothesis, when it is read, then the hypothesis lists what would confirm it. | `us-122-ac2-brief-hypothesis-confirm` | confirmation listed | `@covers US-122-AC2` | Unit | `packages/design/test/brief.test.mjs` | Same fixture | Built |
| US-122-AC3 | Given an app with no HELIX marker, when `brief` runs, then it builds the brief from the design state alone and says HELIX was not found. | `us-122-ac3-brief-no-helix` | state-only brief | `@covers US-122-AC3` | Unit | `packages/design/test/brief.test.mjs` | Fixture app without `.helix.yml` | Built |
| US-122-AC4 | Given a brief principle "no mandatory account creation" and a blueprint whose J-find starts at a sign-in screen, when `ux-builder-blueprint check` runs, then it reports a finding from the project rule naming the principle by its words. | `us-122-ac4-brief-principle-rule` | project rule applied | `@covers US-122-AC4` | Unit | `packages/ui/test/blueprint-project-rules.test.mjs` | Fixture blueprint and principles file | Built |
| US-122-AC5 | Given the installed skill, when its text is read, then it says to run Define through HELIX's `frame` (the PRD and principles.md) and `grill`, to carry an undecided interaction model to Explore as an open question, and to regenerate the brief when its sources change. | `us-122-ac5-skill-define` | define guidance present | `@covers US-122-AC5` | Unit | `packages/design/test/skill.test.mjs` | Skill file | Built |
| US-122-AC6 | Given `principle add --text <principle> [--rule <json>]`, when it runs, then it proposes the principle under principles.md's *Experience Principles* (creating principles.md when HELIX has none), keeps a rule a check can express in `.ux-builder/principles.json` keyed by its words, and `state set principles[+]` is refused naming `principle add`. | `us-122-ac6-principle-add` | proposed under Experience Principles; rule in principles.json; state refuses | `@covers US-122-AC6` | Unit | `packages/design/test/brief.test.mjs` | Skill file | Built |
| US-122-AC7 | Given HELIX documents, when `brief` runs, then the brief is compiled from them (ADR-042 decision 3): each section names its source, the PRD's *User Needs* lead its primary jobs, a change in HELIX shows once it is regenerated, and `validate` warns while the brief no longer says what its sources say. | `us-122-ac7-compiled` | sources named; needs lead jobs; regenerated on change; validate warns while stale | `@covers US-122-AC7` | Unit | `packages/design/test/brief.test.mjs` | Skill file | Built |

## Executable Proof

```bash
npm test --workspace @ux-builder/design
npm test --workspace @ux-builder/ui
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
