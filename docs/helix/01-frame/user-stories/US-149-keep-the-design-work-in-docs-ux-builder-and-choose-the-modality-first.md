---
ddx:
  id: US-149
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: ADR-042
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: CONTRACT-008
---

# US-149: Keep the design work in docs/ux-builder, and choose the modality first

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-80
**PRD Requirements**: FR-80
**Priority**: P1
**Status**: Draft

## Story

**As a** designer or developer using the guide (PRD primary persona)
**I want** everything the design produces, other than HELIX's documents, in one folder, and to say what kind of app it is before anything is drawn
**So that** the design work is easy to find and review in one place, and no wireframe or prototype is drawn for the wrong kind of experience

## Context

The design work used to be spread over the app's top: `docs/ux/`, `app.blueprint.json` and its alternatives, `prototype/`, `helix-proposals/`, `blueprint-compare/`. It now lives under `docs/ux-builder/`. Apps made before keep working where they are until they migrate. The modality (responsive web, chat, hybrid chat) and the screen sizes decide what a wireframe or prototype should be, so the person chooses them first.

## Walkthrough

1. A new app has its blueprint at `docs/ux-builder/blueprint/app.blueprint.json`; the brief, users and jobs land in `docs/ux-builder/`.
2. Before drawing wireframes, the agent explains *modality* and *size class* and asks; the person answers "a responsive web app, phones and laptops", recorded with `ux-builder-design modality`.
3. An app made last month runs `ux-builder-design migrate --dry-run`, sees what would move, then migrates; its `package.json` scripts and CI now point at the new paths.

## Acceptance Criteria

- [ ] **US-149-AC1** — Given a new app, when the guide and the blueprint commands write (init, brief, users, decisions, alternatives, comparisons, prototypes, proposals), then every file lands under `docs/ux-builder/` (the blueprint in `blueprint/`, prototypes in `prototypes/`, proposals in `helix-proposals/`), and nothing at the app's top except `.ux-builder/`.
- [ ] **US-149-AC2** — Given an app on the old layout, when the commands run, then they read and write the old paths, and `status` says to run `ux-builder-design migrate`.
- [ ] **US-149-AC3** — Given an app on the old layout in a git repository, when `migrate --dry-run` runs, then it lists every move and every file it would update and changes nothing; when `migrate` runs, then each path moves with `git mv`, the app's `package.json`, `ux-assessment.yml`, CI workflows, `CLAUDE.md`, `AGENTS.md` and design state point at the new paths, and the commands then use the new layout.
- [ ] **US-149-AC4** — Given a guided app whose modality is not recorded, when `ux-builder-blueprint wireframes` or `prototype --explore` runs, then it exits 1 asking for the modality and draws nothing; after `ux-builder-design modality --answer … --modality … --size-classes …`, they draw; and a later change to the blueprint's supports asks again.
- [ ] **US-149-AC5** — Given `modality` with a future or unknown modality or size class, when it runs, then it exits 2 naming the value and the allowed ones, and changes nothing.
- [ ] **US-149-AC6** — Given a new app from create-app, when it is created, then its blueprint is at `docs/ux-builder/blueprint/app.blueprint.json` and its `check:blueprint` and `audit` scripts, the audit's manifest default and the MCP server's defaults all find it there.
- [ ] **US-149-AC7** — Given an app with the design documents ux-builder used to keep (jobs, users, decision records, evidence records, principles in the design state, test kits, evaluation reports, insights, experiment records, a baseline), when `ux-builder-design migrate` runs, then jobs and users become the PRD's *User Needs* and *User Segments*, decisions ADRs with their result, evidence one study's research plan and principles principles.md, all as proposals; kits, reports, insights, experiments and the baseline move to `docs/ux-builder/runs/`; the originals are removed; `--dry-run` changes nothing; and without HELIX the documents wait, saying to run HELIX's frame (ADR-042 decision 9).

## Edge Cases

- **A destination already exists**: `migrate` refuses, naming it, and changes nothing.
- **An app outside git**: `migrate` moves the files without git.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-149-AC1 | a new app | the commands write | everything under docs/ux-builder/ |
| AC2 | US-149-AC2 | an old-layout app | the commands run | old paths kept; status says migrate |
| AC3 | US-149-AC3 | an old-layout app in git | `migrate --dry-run`; `migrate` | moves listed; then git mv and references rewritten |
| AC4 | US-149-AC4 | a guided app, no modality | wireframes, prototype | exit 1 until recorded; asked again after a change |
| AC5 | US-149-AC5 | a future or unknown value | `modality` | exit 2 naming it |
| AC6 | US-149-AC6 | create-app | create | the blueprint and its readers at the new path |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-80
- **PRD Requirements**: FR-80
- **External**: CONTRACT-008, CONTRACT-004, CONTRACT-005

## Out of Scope

- Moving `.ux-builder/` (the design state and the trace stay there).
