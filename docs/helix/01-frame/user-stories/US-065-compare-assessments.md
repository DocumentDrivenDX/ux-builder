---
ddx:
  id: US-065
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-009
    - kind: informed_by
      to: ADR-026
---

# US-065: Compare assessments and hand work to an agent

**Feature**: FEAT-009 — HELIX-aware UX assessment
**Brief**: UA-S10
**Feature Requirements**: RUN-01, RUN-02, RUN-03, RUN-04
**PRD Requirements**: FR-42
**Priority**: P3
**Status**: Draft

## Story

**As a** delivery lead
**I want** each run's package complete and comparable with the last
**So that** I can see what improved, what regressed, and hand the next journey to an agent

## Context

CONTRACT-006 (run). Increment 1 writes the run record (RUN-02); the comparison is increment 3.

## Walkthrough

1. Each run writes its package under the manifest's output path.
2. `assess compare <old> <new>` classifies every finding.

## Acceptance Criteria

- [ ] **US-065-AC1** — Given a completed run, when its package is validated, then it has a readable report and schema-valid JSON for the backlog, coverage matrix, evidence index, baseline summary and proposals.
- [ ] **US-065-AC2** — Given a run, when its record is read, then it holds the app's commit, each document's revision, the manifest version, the installed SDK and audit versions, the agent and model when known, the configuration and the time.
- [ ] **US-065-AC3** — Given two runs of the same scope, when compared, then each finding is `new`, `persistent`, `resolved`, `regressed` or `not rechecked`, and a finding whose state was not assessed in the later run is `not rechecked`, never `resolved`.
- [ ] **US-065-AC4** — Given a rerun of the same scope, when the backlog is updated, then no finding is duplicated, and partial runs and execution errors are reported apart from finding severity.

## Edge Cases

- Runs of different scopes are refused for comparison.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Package | US-065-AC1 | Run package | validate-report | All parts present and valid |
| Record | US-065-AC2 | Run | Read run.json | Fields present |
| Compare | US-065-AC3 | Two runs, one state not rechecked | compare | Classification; not rechecked |
| Rerun | US-065-AC4 | Rerun with a partial stage | compare | No duplicates; partial apart |

## Dependencies

- **Feature Spec**: FEAT-009
- **Feature Requirements**: RUN-01, RUN-02, RUN-03, RUN-04
- **PRD Requirements**: FR-42
- **External**: CONTRACT-006; CONTRACT-004 revision

## Out of Scope

- See FEAT-009 "Out of Scope".
