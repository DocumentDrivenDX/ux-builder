---
ddx:
  id: US-161
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: ADR-040
---

# US-161: The trial's findings: approvals, steps and measures hold up in a real session

**Feature**: FEAT-018
**Feature Requirements**: GDL-83
**PRD Requirements**: FR-77, FR-89
**Priority**: P0
**Status**: Draft

## Story

**As a** person designing an app with the guide (PRD primary persona)
**I want** approvals that only I give, steps that are not skipped, and time measures that tell the truth
**So that** the review tiers save my time without the guide deciding for me, and the targets we judge the guide by mean something

## Context

A paced, simulated session (trial tasks-1, 2026-10-27) found that a re-wrapped paragraph reopened an approval, that the agent then re-approved it with words that were not an approval, that core-2 skipped step 5, that the metrics reported two targets met that were missed, that a contradiction between the person and their notes was smoothed over, that the brief still listed a dropped story as confirmed, that the prototype's toolbar filled half a phone screen and that the generated prototype was grey placeholders.

## Walkthrough

1. The person re-wraps a paragraph of an approved story: it stays approved.
2. The person changes what a story means: the agent shows the diff, and records the approval only when the person gives it.
3. The person contradicts their own notes: the claim records it and a question asks which holds.
4. The metrics count the person's approvals and say when an approval was reopened by formatting alone.

## Acceptance Criteria

- [ ] **US-161-AC1** — Given an approved document, when only its paragraph wrapping or the placement of bold or underline markers changes, then it stays approved; a change of its words still reopens it; and an approval recorded under the earlier normalization still holds.
- [ ] **US-161-AC2** — Given core-2 is passed, then the design is at step 5 (Design the structure), still in Explore, with the modality as the next thing to do.
- [ ] **US-161-AC3** — Given an approved item that changed, when the agent approves it again without having shown it (review show, or review table of its kind), then the approval is refused and nothing is recorded; the coverage map approved again needs review map first; and each approval event records the person's answer.
- [ ] **US-161-AC4** — Given a session's events, when `metrics` runs, then testing starts at the testing milestone or at a step 7 the loop does not leave, the approvals before testing are the person's distinct answers, an approval reopened with unchanged words counts against the formatting target, and the prototype time is to the milestone marked when the person first tried it.
- [ ] **US-161-AC5** — Given a verified claim, when `evidence claim contradict --study <study> --claim <its words> --text` runs, then the person's words are written in its Contradicting column and an open question asks which holds; `validate` warns about a contradicted claim no question asks about.
- [ ] **US-161-AC6** — Given a blueprint whose journeys carry stories, when the brief lists a story as confirmed that no journey carries, then `validate` warns about it.
- [ ] **US-161-AC7** — Given a generated journey skeleton, then its prototype toolbar is folded to one line by default and names journeys by their goal, not their ID.
- [ ] **US-161-AC8** — Given a screen whose pattern has no sample of its own, then its wireframe and prototype draw its content items as what they are: an input as a field with the primary action, data as three sample entries (ticked where the screen toggles items), feedback as a notice.
- [ ] **US-161-AC9** — Given the design skill, then it says to approve only with the person's own approval of what was shown, to show the diff before re-approving a change (their own edits too), to record a contradiction with `evidence claim contradict` and ask, to mark the prototype milestone when the person first tries it, to re-read a whole story after changing part of it, and to run one command per call, without shell variables or scripts.

## Edge Cases

- **A re-wrap inside a code block**: Kept: code is compared as it is
- **Two approvals with the same answer**: Count as one approval by the person
- **A step-7 event the loop leaves**: Not the start of testing

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-161-AC1 | approved story | re-wrap a paragraph, move a bold colon | still approved; a word change reopens |
| AC2 | US-161-AC2 | core-1 passed | checkpoint core-2 | step 5, explore |
| AC3 | US-161-AC3 | changed approved story | review approve without review show | refused; after show, recorded with the answer |
| AC4 | US-161-AC4 | events with a step 7 then 5 | metrics | testing not started; distinct answers; format-only counted |
| AC5 | US-161-AC5 | a study's claim | claim contradict | Contradicting filled; Q-n open; validate quiet |
| AC6 | US-161-AC6 | brief lists US-5 confirmed | validate | warning |
| AC7 | US-161-AC7 | journey skeleton | generate | details folded; goal labels |
| AC8 | US-161-AC8 | Page screen with data, input, feedback | wireframes | 3 checkboxes, a field and Add, a notice |
| AC9 | US-161-AC9 | SKILL.md | read | the rules present |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-83
- **PRD Requirements**: FR-77, FR-89
- **External**: CONTRACT-008

## Out of Scope

- Judging whether a reworded sentence keeps its meaning (the person sees the diff, ADR-040)
- Making the static prototype's add and tick work (it stays a disposable, linked prototype, ADR-037)
