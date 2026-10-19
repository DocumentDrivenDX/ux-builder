---
ddx:
  id: US-035
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-006
    - kind: informed_by
      to: ADR-020
    - kind: informed_by
      to: ADR-021
---

# US-035: Step through a wizard, a task list and a review

**Feature**: FEAT-006 — Screen patterns
**Feature Requirements**: WIZ-01, WIZ-02, REV-01
**PRD Requirements**: FR-25, FR-26
**Priority**: P1
**Status**: Draft

## Story

**As an** end user of an app built on the SDK
**I want** long processes broken into steps or sections that show where I am, keep what I entered, and let me check everything before I submit
**So that** I can open a new matter or complete an intake form without losing work, retyping answers or submitting something I did not mean to

## Context

Requested by the operator on 2026-10-19 ("do all P1 and P2 screen
patterns"), admitted ahead of consumer evidence by operator decision
(FEAT-006 "Extended screens"). The rules come from GOV.UK (task list for
long forms done in any order; check answers before submitting) and WCAG 2.2
(3.3.7 Redundant Entry, 3.3.4 Error Prevention). A wizard is for steps done
in order; a task list is for independent sections done in any order. Both
end in the review and confirm screen. The app supplies each step's fields,
validation, the draft save and the submit call; the pattern supplies
progress, step order, data retention, layout by size class and the review.

## Walkthrough

1. The user chooses "Open matter"; at 1366 px a wizard shows "Step 1 of 5:
   Client" with a step list beside the form.
2. They leave "Client" empty and press "Continue"; the step stays and shows
   the error.
3. They complete steps 1 and 2, go back to step 1, and find their answers
   intact; "Save draft" saves what they have.
4. Step 4 needs the billing contact already given in step 1; it shows the
   value instead of asking again.
5. Step 5 is the review: answers by section with "Change" links, and "When
   you submit, the matter is opened and the client is notified".
6. They submit; a confirmation panel shows "Matter opened" and reference
   "M-2026-0412".
7. Another app shows a conflicts intake as a task list: six sections, each
   with "Not started", "In progress" or "Completed", and "2 of 6 sections
   completed".
8. On a phone the wizard shows a progress bar in place of the step list.

## Acceptance Criteria

- [ ] **US-035-AC1** — Given a five-step wizard on step 2, when it renders at medium size and above, then its heading reads "Step 2 of 5:" followed by the step's title and a step list marks step 2 as the current step; below medium the step list is replaced by a progress bar exposing step 2 of 5.
- [ ] **US-035-AC2** — Given a step with an invalid field, when the user chooses to continue, then the wizard stays on that step and shows the step's errors; with every field valid it moves to the next step.
- [ ] **US-035-AC3** — Given data entered on steps 1 and 2, when the user goes back to step 1 and then forward to step 2, then every value entered on both steps is still present.
- [ ] **US-035-AC4** — Given any step, when the user chooses "Save draft", then the app is given the data entered so far and the user stays on that step.
- [ ] **US-035-AC5** — Given a later step that needs a value already given on an earlier step, when that step renders, then it shows the earlier value rather than an empty field to fill again, and the last step is the review (WCAG 3.3.7).
- [ ] **US-035-AC6** — Given a task list of six sections, when it renders, then each section is a link to that section with its status in text (Not started, In progress or Completed) and the list states the number of sections completed, for example "2 of 6 sections completed".
- [ ] **US-035-AC7** — Given a review and confirm screen, when it renders, then it shows the answers grouped by section, each section has a "Change" link to that section, and it states what submitting will do before the submit control (WCAG 3.3.4).
- [ ] **US-035-AC8** — Given a review submitted successfully, when the app reports the result, then a confirmation panel shows the result and the reference the app supplies.

## Edge Cases

- **Change from the review**: the user returns to that section or step with its answers, and continuing brings them back to the review.
- **Resize across a size class mid-step**: the step list and progress bar swap with entered data kept.
- **Submit fails**: the review stays with its answers and shows the error with a way to retry.
- **One-step wizard**: shows "Step 1 of 1" and its review.
- **Draft save fails**: the step keeps its data and says the draft was not saved.
- **Long step titles**: they wrap in the step list and heading.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Progress | US-035-AC1 | 5 steps, on step 2 "Title" | Render at 1024 and 390 | "Step 2 of 5: Title"; step list with `aria-current="step"` on 2; progress bar 2 of 5 at 390 |
| Validate | US-035-AC2 | "Client" required, empty | Continue; fill; Continue | Stays on step 1 with error; moves to step 2 |
| Back | US-035-AC3 | Steps 1–2 filled | Back, Continue | Values unchanged |
| Draft | US-035-AC4 | Step 3, 2 fields filled | Save draft | App receives the entered data; still on step 3 |
| No re-entry | US-035-AC5 | Billing contact on step 1, needed on 4 | Go to step 4; to step 5 | Value shown; step 5 is review |
| Task list | US-035-AC6 | 6 sections, 2 completed, 1 in progress | Render | 6 links; 3 statuses in text; "2 of 6 sections completed" |
| Review | US-035-AC7 | 3 sections answered | Render review | 3 groups; 3 "Change" links to their sections; consequence text before Submit |
| Confirmation | US-035-AC8 | Submit succeeds, reference "M-2026-0412" | Submit | Panel with "M-2026-0412" |

## Dependencies

- **Stories**: US-023, US-027
- **Feature Spec**: FEAT-006
- **Feature Requirements**: WIZ-01, WIZ-02, REV-01
- **PRD Requirements**: FR-25, FR-26
- **External**: CONTRACT-004 revision (wizard, task list and review slots); FEAT-004 widgets: Field, progress bar

## Out of Scope

- Validation rules, draft storage and the submit call (the app's; SCR-11).
- Branching logic that skips steps (the app decides which steps it supplies).
- Saving a task list section's answers (the section is an ordinary form, US-027).
