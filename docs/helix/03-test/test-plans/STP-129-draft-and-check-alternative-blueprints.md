---
ddx:
  id: STP-129
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-129
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-129-draft-and-check-alternative-blueprints

## Story Reference

**User Story**: [[US-129-draft-and-check-alternative-blueprints]] (Draft and check alternative blueprints)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-129's criteria with fixtures only: no network, no model, no browser unless a row says so.
**Blocking Gate**: `npm test --workspace @ux-builder/ui`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-129-AC1 | Given an app with `app.blueprint.json`, when `ux-builder-blueprint alternative new map-first` runs, then it writes `app.blueprint.map-first.json` as a copy and refuses (exit 1) if that file exists. | `us-129-ac1` | It writes `app.blueprint.map-first.json` as a copy and refuses (exit 1) if that file exists | `@covers US-129-AC1` | Unit | `packages/ui/test/blueprint-alternatives.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |
| US-129-AC2 | Given an alternative file with an error, when `ux-builder-blueprint check app.blueprint.map-first.json` runs, then it reports the error exactly as it would for the main blueprint. | `us-129-ac2` | It reports the error exactly as it would for the main blueprint | `@covers US-129-AC2` | Unit | `packages/ui/test/blueprint-alternatives.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |
| US-129-AC3 | Given three alternatives, when `alternative choose map-first --reason "fewest steps"` runs, then `app.blueprint.json` becomes the map-first content, and the design state lists map-first as `chosen` and the others as `rejected`, each with the reason and date. | `us-129-ac3` | `app.blueprint.json` becomes the map-first content, and the design state lists map-first as `chosen` and the others as `rejected`, each with the reason and date | `@covers US-129-AC3` | Unit | `packages/ui/test/blueprint-alternatives.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |
| US-129-AC4 | Given `alternative choose` without `--reason`, when it runs, then it exits 1 naming the missing reason and changes nothing. | `us-129-ac4` | It exits 1 naming the missing reason and changes nothing | `@covers US-129-AC4` | Unit | `packages/ui/test/blueprint-alternatives.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |
| US-129-AC5 | Given a created app, when the skill's interaction-optimization section is read, then it tells the agent to draft at least two alternatives for every open question about the interaction model and to recommend one. | `us-129-ac5` | It tells the agent to draft at least two alternatives for every open question about the interaction model and to recommend one | `@covers US-129-AC5` | Content | `packages/ui/test/blueprint-alternatives.test.mjs` | Fixture blueprints in `packages/ui/test/fixtures/`; no network | |

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
