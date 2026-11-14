---
ddx:
  id: US-152
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: CONTRACT-008
---

# US-152: An approval holds until the meaning changes, and then shows the change

**Feature**: FEAT-018
**Feature Requirements**: GDL-83
**PRD Requirements**: FR-77, FR-89
**Priority**: P1
**Status**: Draft

## Story

**As a** person designing an app with the guide (PRD primary persona)
**I want** an approval to stay given while only metadata or formatting changes, and to see exactly what changed when the meaning does
**So that** I never re-read and re-approve content I have already approved

## Context

In the first guided session, adding a type tag to seven approved stories put all seven back in the review queue, though nothing they said had changed; and the guide could say an item changed but not show what.

## Walkthrough

1. The person approves a story.
2. Its frontmatter gains a status and its bullets are reformatted: it stays approved.
3. An acceptance criterion's wording changes: the story comes back, with a two-line diff, and the person approves the change.

## Acceptance Criteria

- [ ] **US-152-AC1** — Given an approved story, when only its frontmatter or its formatting (list markers, trailing spaces, blank lines) changes, then it stays approved, the approval having recorded the meaning approved, its hash and the whole content's hash.
- [ ] **US-152-AC2** — Given an approved story, when its meaning changes, then `review` lists it as changed with a diff of only the changed lines (no frontmatter), `review show` prints the diff, and approving it again is counted as reopened in `metrics`.
- [ ] **US-152-AC3** — Given an approval recorded before meanings were kept (a hash of the whole content), when the item is unchanged, then it stays approved; and when it changes, then it is listed as changed, without a diff.

## Edge Cases

- **An item read from a table row**: its meaning is the row's fields, so a change to another row does not reopen it
- **A record (evidence, report)**: needs no approval, so a change to it reopens nothing

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-152-AC1 | an approved story | frontmatter and format changed | still approved |
| AC2 | US-152-AC2 | an approved story | a criterion changed | listed with a diff; reopened counted |
| AC3 | US-152-AC3 | an old approval | unchanged; changed | holds; changed without a diff |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-83
- **PRD Requirements**: FR-77, FR-89
- **External**: CONTRACT-008

## Out of Scope

- Telling a wording clarification from a change of meaning automatically: the person sees the diff and decides.
