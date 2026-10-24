---
ddx:
  id: US-141
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-039
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: CONTRACT-006
    - kind: informed_by
      to: SD-006
---

# US-141: Import observations and consented transcripts

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-55 to GDL-58
**PRD Requirements**: FR-87
**Priority**: P1
**Status**: Draft

## Story

**As a** product owner who ran usability sessions
**I want** to bring what participants did into the same findings as the agent's, without exposing who they are
**So that** human evidence and agent findings can be compared, and nothing is analysed without consent

## Context

Observations become findings with `source: human` and the assessment's `F-` IDs (CONTRACT-006). Transcripts are analysed only with consent recorded; recordings never enter the repository (ADR-039).

## Walkthrough

1. The owner fills `observations.csv` and runs `ux-builder-design observe import observations.csv --kit TK-1`.
2. They add a transcript with `ux-builder-design transcript add s3.vtt --session S3 --consent-confirmed`.
3. The agent extracts timestamped observations from it.
4. The guide reports completion rate, median time, error rate and assists per task, and the recurring problems.

## Acceptance Criteria

- [ ] **US-141-AC1** — Given a filled observation sheet, when `observe import <file> --kit TK-<n>` runs, then each row becomes a finding with `source: human`, a pseudonym, the task, completed, time, errors, assists and a paraphrased remark, with a stable `F-` ID.
- [ ] **US-141-AC2** — Given a sheet whose remarks contain a name, an email and a phone number, when it is imported, then they are masked before anything is written, and participants appear only by pseudonym.
- [ ] **US-141-AC3** — Given `transcript add` without `--consent-confirmed`, when it runs, then it refuses, says consent must be confirmed for that session, and writes nothing.
- [ ] **US-141-AC4** — Given a consented transcript, when `transcript add` runs, then it stores only masked, cited excerpts with timestamps and a reference to the source, and the consent confirmation in the design state; an audio or video file is refused.
- [ ] **US-141-AC5** — Given five imported sessions for one kit, when `ux-builder-design rubric --json` runs, then it reports per task the completion rate, median time, error rate and assists, and the problems seen in two or more sessions.
- [ ] **US-141-AC6** — Given findings from the agent and from people in one run, when they are listed, then each is labelled `human` (verified observation) or `agent` (recommendation), and no agent recommendation carries `source: human`.

## Edge Cases

- **A row for a task not in the kit**: it is reported and skipped.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-141-AC1 | a filled observation sheet | `observe import <file> --kit TK-<n>` runs | each row becomes a finding with `source: human`, a pseudonym, the task, completed, time, errors, assists and a paraphrased remark, with a stable `F-` ID |
| AC2 | US-141-AC2 | a sheet whose remarks contain a name, an email and a phone number | it is imported | they are masked before anything is written, and participants appear only by pseudonym |
| AC3 | US-141-AC3 | `transcript add` without `--consent-confirmed` | it runs | it refuses, says consent must be confirmed for that session, and writes nothing |
| AC4 | US-141-AC4 | a consented transcript | `transcript add` runs | it stores only masked, cited excerpts with timestamps and a reference to the source, and the consent confirmation in the design state; an audio or video file is refused |
| AC5 | US-141-AC5 | five imported sessions for one kit | `ux-builder-design rubric --json` runs | it reports per task the completion rate, median time, error rate and assists, and the problems seen in two or more sessions |
| AC6 | US-141-AC6 | findings from the agent and from people in one run | they are listed | each is labelled `human` (verified observation) or `agent` (recommendation), and no agent recommendation carries `source: human` |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-55 to GDL-58
- **PRD Requirements**: FR-87
- **External**: ADR-039, CONTRACT-006, CONTRACT-008, SD-006

## Out of Scope

- Transcribing recordings: the owner transcribes them locally first.
- Storing recordings.
