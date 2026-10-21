---
ddx:
  id: US-051
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-008
    - kind: informed_by
      to: ADR-025
---

# US-051: Start a new app from a checked blueprint

**Feature**: FEAT-008 — Interaction and information architecture: rules, blueprint and audit
**Feature Requirements**: ADP-01, ADP-03, BLU-03
**PRD Requirements**: FR-33
**Priority**: P1
**Status**: Draft

## Story

**As a** developer who is not a UI specialist, or an agent starting an app for one
**I want** the starter to begin from a blueprint of my app's screens and to check it in CI
**So that** the app's structure is planned and checked before any screen is written

## Context

ADR-025 decision 8: a new app gets a blueprint, a `check:blueprint` script and a CI step from the starter.

## Walkthrough

1. `npm create @ux-builder/app my-app` writes `app.blueprint.json` for the starter's screen, a `check:blueprint` script and a CI step.
2. The developer (or agent) adds destinations and screens to the blueprint and runs `npm run check:blueprint`.
3. With `--blueprint plan.json`, the starter begins from that plan, after checking it.
4. A plan with an error finding is refused, with the findings printed.

## Acceptance Criteria

- [ ] **US-051-AC1** — Given `npm create @ux-builder/app my-app`, when it finishes, then the app has an `app.blueprint.json` that the validator passes with no error finding, a `check:blueprint` script that runs `ux-builder-blueprint check app.blueprint.json`, and a CI step that runs it.
- [ ] **US-051-AC2** — Given `--blueprint <file>` naming a blueprint with no error finding, when the starter runs, then the app's `app.blueprint.json` is that blueprint.
- [ ] **US-051-AC3** — Given `--blueprint <file>` naming a blueprint with an error finding, when the starter runs, then it prints each error with its rule ID, exits 1 and creates no app directory.
- [ ] **US-051-AC4** — Given the new app, when its `AGENTS.md` and `CLAUDE.md` are read, then they tell an agent to plan screens in `app.blueprint.json`, check it, and build each screen from its pattern inside `Page` within `AppShell`.
- [ ] **US-051-AC5** — Given `--blueprint <file>` naming a blueprint of kind `view`, when the starter runs, then it refuses it, saying the starter makes apps, exits 1 and creates no app directory.

## Edge Cases

- A blueprint of kind `view` passed to the app starter is refused: the starter makes apps (US-051-AC5).

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Default | US-051-AC1 | Empty directory | Run the starter | Blueprint passes; script and CI step present |
| Given plan | US-051-AC2 | Valid plan.json | --blueprint plan.json | Copied |
| Bad plan | US-051-AC3 | Plan nesting a modal | --blueprint | Errors printed; exit 1; no directory |
| Guidance | US-051-AC4 | New app | Read AGENTS.md, CLAUDE.md | Blueprint loop named |
| View plan | US-051-AC5 | plan.json of kind view | --blueprint | Refused; exit 1; no directory |

## Dependencies

- **Feature Spec**: FEAT-008
- **Feature Requirements**: ADP-01, ADP-03, BLU-03
- **PRD Requirements**: FR-33
- **External**: CONTRACT-004 and CONTRACT-005 revisions

## Out of Scope

- See FEAT-008 "Out of Scope".
