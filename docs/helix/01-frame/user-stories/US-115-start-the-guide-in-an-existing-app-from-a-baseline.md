---
ddx:
  id: US-115
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: ADR-042
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-036
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: SD-006
---

# US-115: Start the guide in an existing app from a baseline

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-73, GDL-74
**PRD Requirements**: FR-76
**Priority**: P1
**Status**: Draft

## Story

**As a** developer of an app that already exists (PRD primary persona)
**I want** to add the guide to my app and have it start from what the app already is
**So that** I improve the experience I have instead of redesigning it from a blank page

## Context

`ux-builder-design init` adds the guide to an existing app. The first session runs a baseline: it reads the blueprint and HELIX documents, takes the latest audit and assessment results, and drafts the current brief, jobs and task model, all marked *current state, assumed*.

## Walkthrough

1. The developer runs `npm install -D @ux-builder/design` and `npx ux-builder-design init`.
2. They type `/ux-builder-design`. The guide runs HELIX's backfill.
3. The PRD and stories are drafted from the app as proposals, each point *current state, assumed*; the blueprint is drawn from its screens.
4. The guide asks what to improve and enters the loop where the request fits.

## Acceptance Criteria

- [ ] **US-115-AC1** — Given an app with ux-builder, a blueprint and a HELIX marker, when `ux-builder-design init` runs, then it installs the skill into `.claude/skills/ux-builder-design/`, writes a valid empty design state and exits 0.
- [ ] **US-115-AC2** — Given an app with ux-builder and no `app.blueprint.json`, when `init` runs, then it also writes a starting blueprint as `ux-builder-blueprint init` does, and says the guide will help describe the current screens.
- [ ] **US-115-AC3** — Given an app without `@ux-builder/ui` installed, when `init` runs, then it writes the state and skill, and prints that the validated prototype and the audit need the SDK, naming the adoption steps.
- [ ] **US-115-AC4** — Given an app that already has `.ux-builder/design-state.json`, when `init` runs, then it exits 2 (a refusal, CONTRACT-008), names the file and leaves it unchanged.
- [ ] **US-115-AC5** — Given an existing app, when `ux-builder-design baseline` runs, then it exits 2 saying the command is retired and that HELIX's backfill drafts the PRD and stories from the app, as proposals (ADR-042); it writes nothing, and there is no baseline document type.
- [ ] **US-115-AC6** — Given the installed skill, when its text is read, then it says that an existing app's first session runs HELIX's `backfill` and then routes a specific change to impact and Explore, "too complicated" to the assessment and `simplify`, complaints to evidence, and a new feature to Define.

## Edge Cases

- **No assessment run yet**: `baseline` lists the audit and assessment as not run and says how to run them.
- **`--mcp`**: `init --mcp` also writes `.mcp.json`.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-115-AC1 | an app with ux-builder, a blueprint and a HELIX marker | `ux-builder-design init` runs | it installs the skill into `.claude/skills/ux-builder-design/`, writes a valid empty design state and exits 0 |
| AC2 | US-115-AC2 | an app with ux-builder and no `app.blueprint.json` | `init` runs | it also writes a starting blueprint as `ux-builder-blueprint init` does, and says the guide will help describe the current screens |
| AC3 | US-115-AC3 | an app without `@ux-builder/ui` installed | `init` runs | it writes the state and skill, and prints that the validated prototype and the audit need the SDK, naming the adoption steps |
| AC4 | US-115-AC4 | an app that already has `.ux-builder/design-state.json` | `init` runs | it exits 2 (a refusal, CONTRACT-008), names the file and leaves it unchanged |
| AC5 | US-115-AC5 | an existing app | `ux-builder-design baseline` runs | it exits 2, retired in favour of HELIX's backfill; nothing written |
| AC6 | US-115-AC6 | the installed skill | its text is read | it says that an existing app's first session runs `baseline` and then routes a specific change to impact and Explore, "too complicated" to the assessment and `simplify`, complaints to evidence, and a new feature to Define |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-73, GDL-74
- **PRD Requirements**: FR-76
- **External**: ADR-036, CONTRACT-008, SD-006

## Out of Scope

- Adopting the SDK itself (README, US-052).
