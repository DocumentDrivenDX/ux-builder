---
ddx:
  id: US-059
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-009
    - kind: informed_by
      to: ADR-026
---

# US-059: Tell old failures from redesign regressions

**Feature**: FEAT-009 — HELIX-aware UX assessment
**Brief**: UA-S04
**Feature Requirements**: BAS-01, BAS-02, BAS-03, BAS-04, ENV-03
**PRD Requirements**: FR-39
**Priority**: P1
**Status**: Draft

## Story

**As a** delivery lead
**I want** the app's tests and the audit recorded before anything changes
**So that** I can tell a failure we inherited from one a redesign caused

## Context

ADR-026 decision 3. The audit's own baseline (FEAT-008 AUD-03) is reused for audit findings.

## Walkthrough

1. `npx ux-builder-audit assess baseline` runs each declared test command and the audit at the declared URLs, widths and appearances.
2. It writes `baseline.json`: per command its exit status, duration, counts and log; the audit report and versions.

## Acceptance Criteria

- [ ] **US-059-AC1** — Given the manifest's test commands, when `assess baseline` runs, then for each it records the command, exit status, duration, and the tests passed, failed and skipped (from the declared runner report, else `unknown`), and its log with secrets masked; a command that did not run is `not run`, distinct from failed.
- [ ] **US-059-AC2** — Given the manifest's URLs, widths, themes and appearances, when the baseline runs the audit, then it records the audit report, the installed `@ux-builder/ui` and `@ux-builder/audit` versions, and every check turned off or unsupported.
- [ ] **US-059-AC3** — Given an app that does not use the SDK, when the baseline runs, then findings that only mean "not on the SDK" are typed `sdk-adoption` and reported apart from usability findings, and no stage requires a migration.
- [ ] **US-059-AC4** — Given a baseline, when a later run is compared with it, then every baseline failure is still listed; and every report states that passing functional tests do not show usability criteria are met.

## Edge Cases

- A test command with no machine-readable report gives counts of `unknown`, never zero.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Tests | US-059-AC1 | One passing, one failing, one missing command | baseline | Three records; not run distinct |
| Audit | US-059-AC2 | Fixture pages; --off one check | baseline | Report, versions, disabled check |
| Non-SDK | US-059-AC3 | Page without SDK CSS | baseline | sdk-adoption type, separate section |
| Kept | US-059-AC4 | Baseline with a failure; later run | compare | Failure still listed; statement present |

## Dependencies

- **Feature Spec**: FEAT-009
- **Feature Requirements**: BAS-01, BAS-02, BAS-03, BAS-04, ENV-03
- **PRD Requirements**: FR-39
- **External**: CONTRACT-006; CONTRACT-004 revision

## Out of Scope

- See FEAT-009 "Out of Scope".
