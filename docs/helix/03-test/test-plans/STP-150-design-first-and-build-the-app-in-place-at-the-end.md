---
ddx:
  id: STP-150
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-150
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-150-design-first-and-build-the-app-in-place-at-the-end

## Story Reference

**User Story**: [[US-150-design-first-and-build-the-app-in-place-at-the-end]] (Design first, and build the app in place at the end)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-150's criteria with fixtures only: no network, no model, no browser.
**Blocking Gate**: `npm test --workspace @ux-builder/create-app`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-150-AC1 | Given an empty folder, when `npm create @ux-builder/app <dir>` runs without `--modality` or `--blueprint`, in a terminal or not, then it asks nothing and writes a design folder: `package.json` (the folder's name, `@ux-builder/design` and `@ux-builder/ui` as dev dependencies, a postinstall that installs the skill), the skill, a design state started from `design` at Define, a starting blueprint under `docs/ux-builder/blueprint/`, HELIX's skill and marker, `README.md`, `AGENTS.md`, `CLAUDE.md` and `.gitignore`; and no app code (`src/`, `index.html`) or theme. | `us-150-ac1` | It asks nothing and writes a design folder: `package.json` (the folder's name, `@ux-builder/design` and `@ux-builder/ui` as dev dependencies, a postinstall that installs the skill), the skill, a design state started from `design` at Define, a starting blueprint under `docs/ux-builder/blueprint/`, HELIX's skill and marker, `README.md`, `AGENTS.md`, `CLAUDE.md` and `.gitignore`; and no app code (`src/`, `index.html`) or theme | `@covers US-150-AC1` | Integration | `packages/create-app/test/design-first.test.mjs` | Empty folders under the test's temp directory; HELIX from the test bundle; no network, no model | |
| US-150-AC2 | Given a design folder, when `ux-builder-design status` runs, then it says the app is not built yet and how it will be: the modality to record first if it is not, then the theme, then `npm create @ux-builder/app . -- --theme <name>`. | `us-150-ac2` | It says the app is not built yet and how it will be: the modality to record first if it is not, then the theme, then `npm create @ux-builder/app . -- --theme <name>` | `@covers US-150-AC2` | Integration | `packages/create-app/test/design-first.test.mjs` | Empty folders under the test's temp directory; HELIX from the test bundle; no network, no model | |
| US-150-AC3 | Given a design folder whose modality is recorded and whose blueprint has no errors, when `npm create @ux-builder/app . -- --theme <name>` runs, then the app is written into the folder on that theme and the recorded modalities, the designed blueprint, `docs/`, `.ux-builder/` and the skills are kept, `package.json` keeps its name and gains the app's scripts and dependencies, HELIX's starter documents are written where none exists, the design state records the build, and the create episode is traced. | `us-150-ac3` | The app is written into the folder on that theme and the recorded modalities, the designed blueprint, `docs/`, `.ux-builder/` and the skills are kept, `package.json` keeps its name and gains the app's scripts and dependencies, HELIX's starter documents are written where none exists, the design state records the build, and the create episode is traced | `@covers US-150-AC3` | Integration | `packages/create-app/test/design-first.test.mjs` | Empty folders under the test's temp directory; HELIX from the test bundle; no network, no model | |
| US-150-AC4 | Given a design folder, when the build runs without a recorded modality, with a `--modality` that differs from the recorded one, with `--blueprint`, with a blueprint that has errors, or with a file in the way that the design folder did not write, then it exits 1 naming the reason and writes nothing. | `us-150-ac4` | It exits 1 naming the reason and writes nothing | `@covers US-150-AC4` | Integration | `packages/create-app/test/design-first.test.mjs` | Empty folders under the test's temp directory; HELIX from the test bundle; no network, no model | |
| US-150-AC5 | Given a design folder, when the build runs without `--theme` and without a terminal, then it exits 1 listing the released themes and saying how to make one from a brand in the theme builder; and the guide's skill, at the build, explains the theme and points to the theme builder when no released theme fits. | `us-150-ac5` | It exits 1 listing the released themes and saying how to make one from a brand in the theme builder; and the guide's skill, at the build, explains the theme and points to the theme builder when no released theme fits | `@covers US-150-AC5` | Integration | `packages/create-app/test/design-first.test.mjs` | Empty folders under the test's temp directory; HELIX from the test bundle; no network, no model | |
| US-150-AC6 | Given `--modality`, when `npm create @ux-builder/app <dir>` runs, then it makes the app at once as before; and given `--theme` without `--modality` in an empty folder, it exits 1 saying the theme is chosen when the app is built. | `us-150-ac6` | It makes the app at once as before; and given `--theme` without `--modality` in an empty folder, it exits 1 saying the theme is chosen when the app is built | `@covers US-150-AC6` | Integration | `packages/create-app/test/design-first.test.mjs` | Empty folders under the test's temp directory; HELIX from the test bundle; no network, no model | |

## Executable Proof

```bash
npm test --workspace @ux-builder/create-app
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
