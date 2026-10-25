---
ddx:
  id: US-150
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: CONTRACT-004
---

# US-150: Design first, and build the app in place at the end

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-81
**PRD Requirements**: FR-76
**Priority**: P1
**Status**: Draft

## Story

**As a** designer or developer with an idea for an app (PRD primary persona)
**I want** to start the guided design before any app exists, and have the app built when the design is ready
**So that** the kind of app, its look and its name come out of the design instead of being guessed before it starts

## Context

Until now the guide lived only inside an app that create-app had already built, which asked for the modality and theme first. The modality is a design decision (GDL-80) and the theme a visual one made late; neither belongs before the person has said who the app is for. A design folder holds the guide alone; when the design is ready, create-app builds the app into it from what the design recorded.

## Walkthrough

1. `npm create @ux-builder/app@latest trip-planner`: a folder with the guide and no app code; nothing is asked. `npm install`, then `/ux-builder-design` opens with the overview.
2. Through the steps the person defines the intent, users and tasks, compares alternatives and, at "Design the structure", answers the modality question.
3. The design ready, the agent explains *theme*, lists the released themes and, as none carries the person's brand, points them to the theme builder (`npm run builder` in the ux-builder repository) to make one from their logo. Once it is released, the agent runs `npm create @ux-builder/app@latest . -- --theme acme`.
4. The folder is now the app: its screens' plan is the designed blueprint, the docs stay where they were, and the guide goes on to the validated prototype.

## Acceptance Criteria

- [ ] **US-150-AC1** — Given an empty folder, when `npm create @ux-builder/app <dir>` runs without `--modality` or `--blueprint`, in a terminal or not, then it asks nothing and writes a design folder: `package.json` (the folder's name, `@ux-builder/design` and `@ux-builder/ui` as dev dependencies, a postinstall that installs the skill), the skill, a design state started from `design` at Define, a starting blueprint under `docs/ux-builder/blueprint/`, HELIX's skill and marker, `README.md`, `AGENTS.md`, `CLAUDE.md` and `.gitignore`; and no app code (`src/`, `index.html`) or theme.
- [ ] **US-150-AC2** — Given a design folder, when `ux-builder-design status` runs, then it says the app is not built yet and how it will be: the modality to record first if it is not, then the theme, then `npm create @ux-builder/app . -- --theme <name>`.
- [ ] **US-150-AC3** — Given a design folder whose modality is recorded and whose blueprint has no errors, when `npm create @ux-builder/app . -- --theme <name>` runs, then the app is written into the folder on that theme and the recorded modalities, the designed blueprint, `docs/`, `.ux-builder/` and the skills are kept, `package.json` keeps its name and gains the app's scripts and dependencies, HELIX's starter documents are written where none exists, the design state records the build, and the create episode is traced.
- [ ] **US-150-AC4** — Given a design folder, when the build runs without a recorded modality, with a `--modality` that differs from the recorded one, with `--blueprint`, with a blueprint that has errors, or with a file in the way that the design folder did not write, then it exits 1 naming the reason and writes nothing.
- [ ] **US-150-AC5** — Given a design folder, when the build runs without `--theme` and without a terminal, then it exits 1 listing the released themes and saying how to make one from a brand in the theme builder; and the guide's skill, at the build, explains the theme and points to the theme builder when no released theme fits.
- [ ] **US-150-AC6** — Given `--modality`, when `npm create @ux-builder/app <dir>` runs, then it makes the app at once as before; and given `--theme` without `--modality` in an empty folder, it exits 1 saying the theme is chosen when the app is built.

## Edge Cases

- **The build is run twice**: the second refuses, as the folder is no longer a design folder.
- **No HELIX at the build**: the app is built without HELIX's starter documents and the starter's test cites no criteria.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-150-AC1 | an empty folder | create without `--modality` | a design folder, no app code |
| AC2 | US-150-AC2 | a design folder | `status` | not built yet, and how |
| AC3 | US-150-AC3 | a design folder, modality recorded | build with `--theme` | the app in place, design kept |
| AC4 | US-150-AC4 | a design folder | build without modality, a clash, `--blueprint`, errors | exit 1, nothing written |
| AC5 | US-150-AC5 | a design folder, no terminal | build without `--theme` | exit 1, themes and the theme builder |
| AC6 | US-150-AC6 | an empty folder | `--modality`; `--theme` alone | the app at once; exit 1 |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-81
- **PRD Requirements**: FR-76
- **External**: CONTRACT-008, CONTRACT-004

## Out of Scope

- Making the theme inside the guide: the theme builder makes and releases it.
- Switching an app's theme after the build.
