---
ddx:
  id: US-158
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-009
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: CONTRACT-004
    - kind: informed_by
      to: CONTRACT-006
---

# US-158: One page for every report, and a doctor for the versions

**Feature**: FEAT-009
**Feature Requirements**: FEAT-018 GDL-83
**PRD Requirements**: FR-89
**Priority**: P1
**Status**: Draft

## Story

**As a** person checking an app's audit and usability assessment
**I want** one page beside the design that lists every report, says what each is and which versions wrote it, and a check that the installed packages agree
**So that** I never hunt for the right report, and a session never discovers halfway that its packages disagree

## Context

In the first guided session the person spent about ten minutes correcting the agent about which HTML report held the journey walkthrough, and the agent upgraded three packages while investigating.

## Walkthrough

1. After an audit and an assessment run, `docs/ux-builder/reports.html` lists both, newest first, with what each is.
2. The latest run's journeys show step by step with thumbnails.
3. `ux-builder-audit doctor` finds the installed audit wants a newer ui than is installed, and exits 1.

## Acceptance Criteria

- [ ] **US-158-AC1** — Given an app with a UI audit and assessment runs, when either report is written, then `docs/ux-builder/reports.html` (the app's top on the old layout) is rewritten, listing what each report is in one sentence, the latest UI audit (date, themes, pass, warn and fail checks, a link), each assessment run newest first by its path (run, journeys and steps, findings, a link), every folder under `docs/ux-builder/runs/<kind>/` by path and modified date with a link, no run's content copied in (ADR-042 decision 6), the latest run's journeys step by step with thumbnails, and the @ux-builder versions that wrote each; the UI audit records its versions.
- [ ] **US-158-AC2** — Given an app, when `ux-builder-audit reports` runs, then it rewrites the page and prints its path, and `--open` opens it.
- [ ] **US-158-AC3** — Given installed @ux-builder packages, when `ux-builder-audit doctor` runs, then it lists their versions and flags each dependency or peer range on another @ux-builder package, or the app's own range, that the installed version does not meet; it exits 1 when they disagree and 0 when they agree, and `--json` gives the same.

## Edge Cases

- **No reports yet**: the page says so
- **A report written outside an app**: leaves no page behind

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-158-AC1 | an audit and two runs | write a report | the page lists both |
| AC2 | US-158-AC2 | an app | `reports` | path printed |
| AC3 | US-158-AC3 | mismatched installs | `doctor` | exit 1 naming them |

## Dependencies

- **Feature Spec**: FEAT-009
- **Feature Requirements**: FEAT-018 GDL-83
- **PRD Requirements**: FR-89
- **External**: CONTRACT-004, CONTRACT-006

## Out of Scope

- Merging the two reports into one: the page links them.
