---
ddx:
  id: STP-132
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-132
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-132-describe-the-experience-architecture-in-the-blueprint

## Story Reference

**User Story**: [[US-132-describe-the-experience-architecture-in-the-blueprint]] (Describe the experience architecture in the blueprint)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-132's criteria with fixtures only: no network, no model, no browser unless a row says so.
**Blocking Gate**: `npm test --workspace @ux-builder/ui`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-132-AC1 | Given a screen with `purpose` and a `content` list of objects with `label` and optional `kind`, when `ux-builder-blueprint check` runs, then it validates; a `content` that is not an array, or an item without `label`, is an error naming the screen. | `us-132-ac1` | It validates; a `content` that is not an array, or an item without `label`, is an error naming the screen | `@covers US-132-AC1` | Unit | `packages/ui/test/blueprint-architecture.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |
| US-132-AC2 | Given a screen with no `purpose`, when `check` runs, then it reports a warning naming the screen. | `us-132-ac2` | It reports a warning naming the screen | `@covers US-132-AC2` | Unit | `packages/ui/test/blueprint-architecture.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |
| US-132-AC3 | Given a screen with three content items, when `ux-builder-blueprint wireframes` runs, then each wireframe page shows the items labelled in that order, before any placeholder content. | `us-132-ac3` | Each wireframe page shows the items labelled in that order, before any placeholder content | `@covers US-132-AC3` | Unit | `packages/ui/test/blueprint-architecture.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |
| US-132-AC4 | Given a blueprint with purposes and content, when `ux-builder-blueprint propose` runs, then the wireframe drafts list each screen's purpose and content order. | `us-132-ac4` | The wireframe drafts list each screen's purpose and content order | `@covers US-132-AC4` | Unit | `packages/ui/test/blueprint-architecture.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |
| US-132-AC5 | Given a created app, when the skill's UX design section is read, then it tells the agent to generate information architecture, interaction design and interface design together from the chosen flow, and to fill every screen's purpose and content. | `us-132-ac5` | It tells the agent to generate information architecture, interaction design and interface design together from the chosen flow, and to fill every screen's purpose and content | `@covers US-132-AC5` | Content | `packages/ui/test/blueprint-architecture.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |

## Executable Proof

```bash
npm test --workspace @ux-builder/ui
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
