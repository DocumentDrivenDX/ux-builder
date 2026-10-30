---
ddx:
  id: US-151
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: CONTRACT-006
---

# US-151: IDs explained, HELIX read as it is, a choice of audit, and the reports beside the design

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-82
**PRD Requirements**: FR-77, FR-80
**Priority**: P1
**Status**: Draft

## Story

**As a** person designing an app with the guide (PRD primary persona)
**I want** every ID the guide shows explained, my HELIX documents read as they are, to choose which audit runs, and every report kept with the rest of the design
**So that** I understand what I am approving, I never have to repair my own documents for a tool, I spend time only on the checks I want, and I find everything in one place

## Context

The first real guided session showed four frictions: cryptic IDs (J-1, T-2, U-1, BR-1) shown without saying what they were; a guessed `type: user-story` tag that the guide asked the person to add to their HELIX stories, and that then stopped the assessment reading them; "audit" meaning two different checks; and the assessment and audit output at the app's top, apart from the design work.

## Walkthrough

1. The guide shows "the target user U-1, weekend anglers" and, the first time, says U- is a target user; `ux-builder-design explain J-find` says J-find is a journey in the blueprint.
2. The person's stories have IDs but no type tag; the blueprint check and the assessment read them anyway, and nobody is asked to edit HELIX.
3. Asked to "run an audit", the guide explains the UI audit and the usability assessment and asks which, or both.
4. The audit's report lands in `docs/ux-builder/audit-report/`, the assessment's in `docs/ux-builder/assessments/<run>/`, beside `docs/ux-builder/ux-assessment.yml`.

## Acceptance Criteria

- [ ] **US-151-AC1** — Given an ID the guide uses (`U-1`, `J-1`, `J-find`, `T-2`, `BR-1`, `US-3`, `US-3-AC2`, `UXD-1`, `EV-2`, `TK-1`, `F-…`, `P1`), when `ux-builder-design explain <ID>` runs, then it prints what kind of thing the ID names and where it lives, with that kind's glossary term when there is one; `explain ids` lists every kind; the overview mentions them; and the skill tells the agent never to show a bare ID.
- [ ] **US-151-AC2** — Given HELIX stories with a `US-<n>` ID and no type tag, or with `type: user-story`, when the blueprint check reads the stories and the assessment collects the flow, then each is read as a user story, a corrected type is reported as information naming HELIX's type, the untyped warning says nothing is missing, and both skills tell the agent never to hand the person a command to edit HELIX or to guess a HELIX field.
- [ ] **US-151-AC3** — Given the person asks for an audit, when the guide's or the assessment's skill is followed, then it explains the UI audit and the usability assessment and asks which, or both, before running either; and `explain "UI audit"` and `explain "usability assessment"` define them.
- [ ] **US-151-AC4** — Given an app with `docs/ux-builder/` and no `ux-assessment.yml` at its top, when the starter writes its manifest, `assess` runs without `--manifest`, and `ux-builder-audit` runs without `--out`, then the manifest is `docs/ux-builder/ux-assessment.yml`, its relative paths resolve from the app, runs go to `docs/ux-builder/assessments/<run>/` and the report to `docs/ux-builder/audit-report/`; and an app that keeps `ux-assessment.yml` at its top keeps all three there, `status` lists them, and `migrate` moves them and rewrites the app's references (a workflow's artifact name left as it is); and the app's `.gitignore` ignores `docs/ux-builder/assessments/` and `docs/ux-builder/runs/` (run output, ADR-042 decision 6).

## Edge Cases

- **An app without `docs/ux-builder/`**: everything stays at its top, as before.
- **A type tag naming another type**: the document is read as that type, not as a story.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-151-AC1 | the guide's IDs | `explain <ID>`, `explain ids`, `overview` | kind and place; all kinds |
| AC2 | US-151-AC2 | untyped and mis-typed stories | blueprint check; collect | read; reported, no edit asked |
| AC3 | US-151-AC3 | "run an audit" | the skills; `explain` | asked which; terms defined |
| AC4 | US-151-AC4 | new and older apps | starter, assess, audit, status, migrate | under docs/ux-builder/; older kept, then moved |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-82
- **PRD Requirements**: FR-77, FR-80
- **External**: CONTRACT-008, CONTRACT-006, CONTRACT-004

## Out of Scope

- One report page for the audit and the assessment together.
