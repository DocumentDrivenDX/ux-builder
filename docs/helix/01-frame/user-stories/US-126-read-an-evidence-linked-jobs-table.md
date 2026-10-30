---
ddx:
  id: US-126
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
      to: ADR-039
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: SD-006
---

# US-126: Read an evidence-linked jobs table

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-20, GDL-21
**PRD Requirements**: FR-81
**Priority**: P1
**Status**: Draft

## Story

**As a** designer or developer using the guide (PRD primary persona)
**I want** a jobs table that rates each job's importance, evidence and confidence separately
**So that** I can see which important jobs rest on little evidence before I design around them

## Context

The table is the PRD's *User Needs* (ADR-042, HELIX v0.20.0), each row named by the need; tasks and test results cite a need by its name. A design decision that relies on a low-confidence job is flagged.

## Walkthrough

1. After synthesis the agent updates the PRD's *User Needs*.
2. "Find public access points" is high importance, cites the anglers and access studies, high confidence.
3. "Compare river conditions" is medium importance, no evidence, low confidence.
4. A decision record that relies on J-4 is flagged as resting on a low-confidence job.

## Acceptance Criteria

- [ ] **US-126-AC1** — Given a need, when `ux-builder-design need add --need <need> --importance <l> [--evidence <study>] [--confidence <l>] [--status <s>]` runs, then it proposes a row of the PRD's *User Needs* (ADR-042), named by the need, with its importance, evidence, confidence and status (HELIX's words: assumed, validated, invalidated) each its own field; the same need again replaces its row, and another importance or confidence is refused.
- [ ] **US-126-AC2** — Given a need whose evidence cites a study that does not exist, when `validate` runs, then it exits 1 and names the need and the missing study.
- [ ] **US-126-AC3** — Given a need with confidence above low and no evidence, when `need add` runs it is refused, and when the row is written by hand `validate` fails naming it.
- [ ] **US-126-AC4** — Given a blueprint task citing a need with low confidence, when `validate` runs, then it warns, naming the task and the need.
- [ ] **US-126-AC5** — Given a blueprint task citing a need the PRD's *User Needs* does not have, when `validate` runs, then it exits 1 naming the task and the need.

## Edge Cases

- **A job is retired**: it stays with status `retired`, so old citations still resolve.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-126-AC1 | a need | `need add` runs | it proposes a *User Needs* row with importance, evidence, confidence and status, each its own field |
| AC2 | US-126-AC2 | a job whose evidence cites a study that does not exist | `validate` runs | it exits 1 and names the job and the missing source |
| AC3 | US-126-AC3 | a job with high confidence and no evidence | `validate` runs | it exits 1: confidence above low needs at least one evidence source |
| AC4 | US-126-AC4 | a task (`T-<n>`) or a UX decision (an ADR tagged `area:ui`) that cites a low-confidence job | `validate` runs | it warns, naming the item and the job |
| AC5 | US-126-AC5 | a job ID that a task cites but the PRD's *User Needs* lacks | `validate` runs | it exits 1 and names the task and the ID |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-20, GDL-21
- **PRD Requirements**: FR-81
- **External**: ADR-036, ADR-039, CONTRACT-008, SD-006

## Out of Scope

- Writing the PRD directly: rows are proposed, and the person applies them.
