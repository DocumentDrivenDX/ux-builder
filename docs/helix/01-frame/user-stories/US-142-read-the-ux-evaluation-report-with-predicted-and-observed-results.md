---
ddx:
  id: US-142
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

# US-142: Read the UX evaluation report with predicted and observed results

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-59 to GDL-61
**PRD Requirements**: FR-87
**Priority**: P1
**Status**: Draft

## Story

**As a** product owner deciding what to build
**I want** one report that sets the agent's predictions beside what users showed
**So that** I can see where human evidence challenges the design and decide what to fix

## Context

`ux-builder-design report` writes `docs/ux-builder/runs/evaluations/<date>/report.md` (run output) from the usability-evaluation-report template proposed to HELIX (CONTRACT-008). In stage 2 it becomes HELIX's type.

## Walkthrough

1. After the sessions, the guide runs `ux-builder-design report`.
2. The report shows method, tasks, findings by journey, corrections, and the rubric with predicted and observed columns.
3. Discoverability was predicted medium; 3 of 5 participants found access points; the report highlights it.
4. At checkpoint core-3 the owner picks the findings to fix; they are proposed to the improvement backlog and the decision moves to tested.

## Acceptance Criteria

- [ ] **US-142-AC1** — Given a design state with a chosen alternative, rubric predictions and imported observations, when `ux-builder-design report` runs, then it writes `docs/ux-builder/runs/evaluations/<date>/report.md` (run output, ADR-042) with method, tasks, findings by journey with evidence and severity, proposed corrections, the rubric with predicted and observed columns, and what was not tested.
- [ ] **US-142-AC2** — Given a rubric dimension whose observation contradicts its prediction, when the report is written, then the dimension is highlighted, and the assumptions behind the prediction move to `refuted` in the design state.
- [ ] **US-142-AC3** — Given no human observations, when the report is written, then the observed column says no human evidence exists, and nothing is marked refuted or confirmed.
- [ ] **US-142-AC4** — Given findings the person selects at checkpoint core-3, when they are routed, then each is written as a `propose` patch to the HELIX improvement backlog, and the decision record moves to `tested` or `refuted` with `decision status`.
- [ ] **US-142-AC5** — Given observed sessions, when `ux-builder-design report` runs, then it proposes what people did as claims in each study's *Findings* (completion per scenario and problems seen in two or more sessions), each with its source and basis, updating the same claims when run again; the report itself is run output, not a document `validate` checks.

## Edge Cases

- **A second evaluation**: it gets the next UER number and links the earlier one.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-142-AC1 | a design state with a chosen alternative, rubric predictions and imported observations | `ux-builder-design report` runs | it writes `docs/ux-builder/runs/evaluations/<date>/report.md` (run output) with method, tasks, findings by journey with evidence and severity, proposed corrections, the rubric with predicted and observed columns, and what was not tested |
| AC2 | US-142-AC2 | a rubric dimension whose observation contradicts its prediction | the report is written | the dimension is highlighted, and the assumptions behind the prediction move to `refuted` in the design state |
| AC3 | US-142-AC3 | no human observations | the report is written | the observed column says no human evidence exists, and nothing is marked refuted or confirmed |
| AC4 | US-142-AC4 | findings the person selects at checkpoint core-3 | they are routed | each is written as a `propose` patch to the HELIX improvement backlog, and the decision record moves to `tested` or `refuted` with `decision status` |
| AC5 | US-142-AC5 | a written report | `ux-builder-design validate` runs | it checks the report against the template's required sections and frontmatter links |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-59 to GDL-61
- **PRD Requirements**: FR-87
- **External**: ADR-036, CONTRACT-008, SD-006

## Out of Scope

- Averaging the rubric into one score.
