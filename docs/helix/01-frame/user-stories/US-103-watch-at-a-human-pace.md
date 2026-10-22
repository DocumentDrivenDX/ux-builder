---
ddx:
  id: US-103
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-015
    - kind: informed_by
      to: ADR-033
    - kind: informed_by
      to: ADR-031
    - kind: informed_by
      to: FEAT-013
---

# US-103: Watch the walkthrough at a human pace with each rule spelled out

**Feature**: FEAT-015 — Findings by journey, with every rule spelled out
**Feature Requirements**: RPT-06, RPT-07
**PRD Requirements**: FR-65
**Priority**: P1
**Status**: Draft

## Story

**As an** roduct or technical leader (PRD primary persona) watching a walkthrough video
**I want** the video to move at a pace I can follow and to spell out the rule each problem breaks
**So that** I understand each problem and why it matters without pausing and rewinding

## Context

The operator found the walkthrough video too fast. RPT-06 derives its timing from reading time: about 2 s per step, and at each finding a pause for its text at 200 words a minute, at least 5 s; `--pace slow|normal|fast` scales it. RPT-07 adds the rule's ID and statement to each finding's caption and titles chapters by journey and step.

## Walkthrough

1. The leader opens the journey's MP4.
2. Each step holds about 2 seconds; at a finding the video pauses with the problem, the rule and the fix, long enough to read.
3. Chapters read 'J-review · step 2: Entry'.

## Acceptance Criteria

- [ ] **US-103-AC1** — Given a replay, when the video is rendered at the default pace, then each step without findings holds at least 2 seconds and each finding's caption stays at least max(5 s, its word count ÷ 200 × 60 s).
- [ ] **US-103-AC2** — Given `--pace slow` or `--pace fast`, when the video is rendered, then every hold is scaled by 1.5 or 0.6 respectively, never below 1 s per step or 3 s per finding.
- [ ] **US-103-AC3** — Given a finding, when its caption is shown in the MP4 and the player, then it includes the rule ID and the rule's full statement, the problem in plain English and the fix.
- [ ] **US-103-AC4** — Given a journey video, when its chapters are read, then each is titled with the journey and the step's screen.

## Edge Cases

- **Very long rules**: the pause grows with the text.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-103-AC1 | a replay | the video is rendered at the default pace | each step without findings holds at least 2 seconds and each finding's caption stays at least max(5 s, its word count ÷ 200 × 60 s) |
| AC2 | US-103-AC2 | `--pace slow` or `--pace fast` | the video is rendered | every hold is scaled by 1.5 or 0.6 respectively, never below 1 s per step or 3 s per finding |
| AC3 | US-103-AC3 | a finding | its caption is shown in the MP4 and the player | it includes the rule ID and the rule's full statement, the problem in plain English and the fix |
| AC4 | US-103-AC4 | a journey video | its chapters are read | each is titled with the journey and the step's screen |

## Dependencies

- **Feature Spec**: FEAT-015
- **Feature Requirements**: RPT-06, RPT-07
- **PRD Requirements**: FR-65
- **External**: ADR-033, ADR-031, FEAT-013

## Out of Scope

- Editing videos by hand.
