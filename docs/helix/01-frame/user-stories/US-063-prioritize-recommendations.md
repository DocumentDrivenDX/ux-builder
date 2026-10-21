---
ddx:
  id: US-063
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-009
    - kind: informed_by
      to: ADR-026
---

# US-063: Assess and prioritize each recommendation

**Feature**: FEAT-009 — HELIX-aware UX assessment
**Brief**: UA-S08
**Feature Requirements**: FND-01, FND-02, FND-03, FND-04
**PRD Requirements**: FR-41
**Priority**: P2
**Status**: Draft

## Story

**As a** product owner
**I want** each recommendation complete, deduplicated and ranked by an explicit rubric
**So that** I can decide what to fix first and trust why

## Context

CONTRACT-006 (finding). Component mapping reads the app's installed catalogue.

## Walkthrough

1. The agent merges checkpoint findings into the backlog, maps each change to installed SDK patterns, and ranks by the rubric.
2. `assess validate-report` checks every finding has its fields.

## Acceptance Criteria

- [ ] **US-063-AC1** — Given a finding, when the backlog is validated, then it has every field of CONTRACT-006's finding record, and one without evidence or an explicit uncertainty label, a requirement or proposed criterion, and a verification method fails.
- [ ] **US-063-AC2** — Given a recommended change, when it names SDK components, then each is a pattern or widget in the app's installed catalogue, with its version and catalogue reference, and the change is marked composition work, custom gap or SDK defect.
- [ ] **US-063-AC3** — Given one problem seen at several checkpoints, when findings are merged, then it is one finding listing every evidence reference; two different user problems on one element remain two findings.
- [ ] **US-063-AC4** — Given the ranked backlog, when read, then each finding has a priority from the P0 to P3 rubric, a confidence (high, medium or low with a reason) and an effort as separate fields, unknown usage is `unknown`, and a low-confidence P0 or P1 concern is listed as validation work.

## Edge Cases

- A component the catalogue lacks is a custom gap, never an invented import.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Fields | US-063-AC1 | Backlog with a bare finding | validate-report | Fails naming fields |
| Components | US-063-AC2 | Mapping to a real and an unknown pattern | validate-report | Unknown fails |
| Dedupe | US-063-AC3 | Three checkpoints, two problems | merge | Two findings, three evidence links |
| Rank | US-063-AC4 | Backlog | validate-report | Rubric fields; validation work listed |

## Dependencies

- **Feature Spec**: FEAT-009
- **Feature Requirements**: FND-01, FND-02, FND-03, FND-04
- **PRD Requirements**: FR-41
- **External**: CONTRACT-006; CONTRACT-004 revision

## Out of Scope

- See FEAT-009 "Out of Scope".
