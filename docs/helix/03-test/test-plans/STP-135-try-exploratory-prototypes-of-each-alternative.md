---
ddx:
  id: STP-135
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-135
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-135-try-exploratory-prototypes-of-each-alternative

## Story Reference

**User Story**: [[US-135-try-exploratory-prototypes-of-each-alternative]] (Try exploratory prototypes of each alternative)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-135's criteria on fixtures: a fixture app, blueprint and design state, with no network, no model and no real participants.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-135-AC1 | Given a blueprint alternative that passes `blueprint check`, when `ux-builder-blueprint prototype --explore --alternative <name>` runs, then it writes `prototype/<name>/` with one page per screen rendering that screen's pattern with placeholder content, and every action links to its `to`. | `us-135-ac1` | It writes `prototype/<name>/` with one page per screen rendering that screen's pattern with placeholder content, and every action links to its `to` | `@covers US-135-AC1` | Unit | `packages/ui/test/blueprint-prototype.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-135-AC2 | Given a generated prototype page, when it is read, then it shows a switcher for each declared state and supported size class, a prototype banner, and the design question the alternative answers. | `us-135-ac2` | It shows a switcher for each declared state and supported size class, a prototype banner, and the design question the alternative answers | `@covers US-135-AC2` | Unit | `packages/ui/test/blueprint-prototype.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-135-AC3 | Given `--design-system` given twice for the same alternative, when `prototype --explore` runs, then it writes one prototype per design system for the same flow, each named by its design system. | `us-135-ac3` | It writes one prototype per design system for the same flow, each named by its design system | `@covers US-135-AC3` | Unit | `packages/ui/test/blueprint-prototype.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-135-AC4 | Given an app source file that imports from `prototype/`, when lint runs with `ux-builder/no-prototype-import`, then it reports an error naming the import. | `us-135-ac4` | It reports an error naming the import | `@covers US-135-AC4` | Unit | `packages/ui/test/lint-no-prototype-import.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-135-AC5 | Given notes the person gives after trying a prototype, when the guide records them with `ux-builder-design state set`, then the design state stores them as observations with `source: design-team`, never as user evidence. | `us-135-ac5` | The design state stores them as observations with `source: design-team`, never as user evidence | `@covers US-135-AC5` | Integration | `packages/design/test/prototype-notes.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-135-AC6 | Given an alternative whose blueprint has a check error, when `prototype --explore` runs, then it exits 1 naming the findings and writes nothing. | `us-135-ac6` | It exits 1 naming the findings and writes nothing | `@covers US-135-AC6` | Unit | `packages/ui/test/blueprint-prototype.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |

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
- [x] No test depends on the network, a model or real participants
