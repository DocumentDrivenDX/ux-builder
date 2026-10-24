---
ddx:
  id: US-126
  type: user-stories
  status: draft
  links:
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

In stage 1 the table lives in `docs/ux/jobs.md` (ADR-036); in stage 2 it moves to the PRD (H-2). Each job has a stable `J-<n>` ID that tasks, journeys and test results cite. A design decision that relies on a low-confidence job is flagged.

## Walkthrough

1. After synthesis the agent updates `docs/ux/jobs.md`.
2. "Find public access points" is high importance, cites EV-1 and EV-3, high confidence.
3. "Compare river conditions" is medium importance, no evidence, low confidence.
4. A decision record that relies on J-4 is flagged as resting on a low-confidence job.

## Acceptance Criteria

- [ ] **US-126-AC1** — Given a `docs/ux/jobs.md` written from the template, when `ux-builder-design validate` runs, then it checks every job has a unique `J-<n>` ID, an importance, a confidence and an evidence list, each a separate field.
- [ ] **US-126-AC2** — Given a job whose evidence cites `EV-9` and no such evidence file exists, when `validate` runs, then it exits 1 and names the job and the missing source.
- [ ] **US-126-AC3** — Given a job with high confidence and no evidence, when `validate` runs, then it exits 1: confidence above low needs at least one evidence source.
- [ ] **US-126-AC4** — Given a task (`T-<n>`) or a decision record (`UXD-<n>`) that cites a low-confidence job, when `validate` runs, then it warns, naming the item and the job.
- [ ] **US-126-AC5** — Given a job ID that a task cites but `jobs.md` lacks, when `validate` runs, then it exits 1 and names the task and the ID.

## Edge Cases

- **A job is retired**: it stays with status `retired`, so old citations still resolve.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-126-AC1 | a `docs/ux/jobs.md` written from the template | `ux-builder-design validate` runs | it checks every job has a unique `J-<n>` ID, an importance, a confidence and an evidence list, each a separate field |
| AC2 | US-126-AC2 | a job whose evidence cites `EV-9` and no such evidence file exists | `validate` runs | it exits 1 and names the job and the missing source |
| AC3 | US-126-AC3 | a job with high confidence and no evidence | `validate` runs | it exits 1: confidence above low needs at least one evidence source |
| AC4 | US-126-AC4 | a task (`T-<n>`) or a decision record (`UXD-<n>`) that cites a low-confidence job | `validate` runs | it warns, naming the item and the job |
| AC5 | US-126-AC5 | a job ID that a task cites but `jobs.md` lacks | `validate` runs | it exits 1 and names the task and the ID |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-20, GDL-21
- **PRD Requirements**: FR-81
- **External**: ADR-036, ADR-039, CONTRACT-008, SD-006

## Out of Scope

- Moving the table into the PRD (stage 2).
