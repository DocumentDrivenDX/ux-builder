---
ddx:
  id: US-102
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-015
    - kind: informed_by
      to: ADR-033
    - kind: informed_by
      to: CONTRACT-006
    - kind: informed_by
      to: FEAT-009
---

# US-102: Read the assessment report by journey

**Feature**: FEAT-015 — Findings by journey, with every rule spelled out
**Feature Requirements**: RPT-05, RPT-08
**PRD Requirements**: FR-65, FR-66
**Priority**: P1
**Status**: Draft

## Story

**As an** app owner (PRD primary persona) reading a UX assessment
**I want** the assessment report ordered by journey and step, each finding with the rule or heuristic in full, its evidence, severity and fix, as a HELIX artifact
**So that** the report reads like my users' journeys and lives with my other HELIX documents

## Context

The assessment's report (FEAT-009) listed findings by priority. RPT-05 orders it journey → step → finding with severity 0–4, and RPT-08 writes it as a HELIX usability evaluation report.

## Walkthrough

1. The owner runs `assess report`.
2. report.md and report.html list each journey, its states and steps, and the findings at each step with rule text, evidence, severity and fix.
3. report.md has `ux-builder:` frontmatter of type `usability-assessment-report`: a ux-builder report, not a HELIX document.

## Acceptance Criteria

- [ ] **US-102-AC1** — Given an assessment run, when `assess report` runs, then the report lists each journey, the states it was walked in, its steps, and under each step its findings.
- [ ] **US-102-AC2** — Given a finding, when it is shown, then it states its rule ID and full statement (or heuristic and source), the evidence (screenshot or video moment), its severity on a 0 to 4 scale and the fix.
- [ ] **US-102-AC3** — Given the report, when it is written, then report.md carries `ux-builder:` frontmatter with `type: usability-assessment-report`, naming its journeys and stories, and claims no HELIX type.
- [ ] **US-102-AC4** — Given `assess validate-report`, when it runs on the report, then it fails a finding that names neither a rule nor a heuristic.

## Edge Cases

- **A finding at no step**: listed under its journey's *General* section.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-102-AC1 | an assessment run | `assess report` runs | the report lists each journey, the states it was walked in, its steps, and under each step its findings |
| AC2 | US-102-AC2 | a finding | it is shown | it states its rule ID and full statement (or heuristic and source), the evidence (screenshot or video moment), its severity on a 0 to 4 scale and the fix |
| AC3 | US-102-AC3 | the report | it is written | report.md carries `ux-builder:` frontmatter with `type: usability-assessment-report`, naming its journeys and stories, and claims no HELIX type |
| AC4 | US-102-AC4 | `assess validate-report` | it runs on the report | it fails a finding that names neither a rule nor a heuristic |

## Dependencies

- **Feature Spec**: FEAT-015
- **Feature Requirements**: RPT-05, RPT-08
- **PRD Requirements**: FR-65, FR-66
- **External**: ADR-033, CONTRACT-006, FEAT-009

## Out of Scope

- Changing the ranking rubric.
