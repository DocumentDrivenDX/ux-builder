---
ddx:
  id: US-100
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-015
    - kind: informed_by
      to: ADR-033
    - kind: informed_by
      to: CONTRACT-004
---

# US-100: Read the audit by journey, with each rule spelled out

**Feature**: FEAT-015 — Findings by journey, with every rule spelled out
**Feature Requirements**: RPT-01, RPT-03, RPT-04
**PRD Requirements**: FR-64, FR-65
**Priority**: P1
**Status**: Draft

## Story

**As an** app owner (PRD primary persona) reading the audit report
**I want** the findings grouped by user journey and step, each stating the rule it breaks in full, its source and the fix
**So that** I see what is wrong where my users meet it, and why, without looking anything up

## Context

The audit's report.html grouped findings by check. RPT-03 orders it journey → step → finding when a blueprint with journeys is given (pages matched to screens by `data-piq-screen` or the screen's `path`), with screens no journey visits under *Other screens*; without journeys, by screen. RPT-04 puts the verdicts and a *Rules broken* table first.

## Walkthrough

1. The owner runs `npx ux-builder-audit --blueprint app.blueprint.json <urls>`.
2. The report opens with the verdicts and the rules broken.
3. Under journey J-review, step 2 (the entry screen) shows its screenshot with numbered boxes and each finding with its rule's full text and fix.

## Acceptance Criteria

- [ ] **US-100-AC1** — Given a blueprint with journeys and pages marked with `data-piq-screen`, when the audit runs, then report.html lists each journey, each of its steps with that screen's screenshot, and under each step every finding on that screen.
- [ ] **US-100-AC2** — Given any finding, when it is shown, then it states its severity, the rule ID, the rule's full statement, its sources as links, the evidence (element and screenshot box) and the fix.
- [ ] **US-100-AC3** — Given findings on screens no journey visits, when the report is written, then they are listed under *Other screens*; given no journeys, the report groups findings by screen.
- [ ] **US-100-AC4** — Given a report, when it opens, then the theme and modality-fit verdicts come first, then a *Rules broken* table (rule, statement, count) linking to the findings.
- [ ] **US-100-AC5** — Given the report's JSON (`report.json`), when it is read, then each finding has `ruleId`, `rule.statement`, `sources`, `fix` and, with journeys, `journey` and `step`.

## Edge Cases

- **One screen in several journeys**: its findings are shown under each step that visits it, and counted once in *Rules broken*.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-100-AC1 | a blueprint with journeys and pages marked with `data-piq-screen` | the audit runs | report.html lists each journey, each of its steps with that screen's screenshot, and under each step every finding on that screen |
| AC2 | US-100-AC2 | any finding | it is shown | it states its severity, the rule ID, the rule's full statement, its sources as links, the evidence (element and screenshot box) and the fix |
| AC3 | US-100-AC3 | findings on screens no journey visits | the report is written | they are listed under *Other screens*; given no journeys, the report groups findings by screen |
| AC4 | US-100-AC4 | a report | it opens | the theme and modality-fit verdicts come first, then a *Rules broken* table (rule, statement, count) linking to the findings |
| AC5 | US-100-AC5 | the report's JSON (`report.json`) | it is read | each finding has `ruleId`, `rule.statement`, `sources`, `fix` and, with journeys, `journey` and `step` |

## Dependencies

- **Feature Spec**: FEAT-015
- **Feature Requirements**: RPT-01, RPT-03, RPT-04
- **PRD Requirements**: FR-64, FR-65
- **External**: ADR-033, CONTRACT-004

## Out of Scope

- Changing which checks exist.
