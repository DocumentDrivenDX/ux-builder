---
ddx:
  id: US-037
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

# US-037: Work through a queue

**Feature**: FEAT-006 — Screen patterns
**Feature Requirements**: QUEUE-01
**PRD Requirements**: FR-25, FR-26
**Priority**: P1
**Status**: Draft

## Story

**As an** end user of an app built on the SDK who reviews items for approval
**I want** to see one item at a time, know how many are left, and approve, reject or assign it with a click or a shortcut
**So that** I clear a queue of bills or time entries quickly without losing my place or rejecting something without saying why

## Context

Requested by the operator on 2026-10-19 ("do all P1 and P2 screen
patterns"), admitted ahead of consumer evidence by operator decision
(FEAT-006 "Extended screens"). A billing-review app's bill approval is the first use.
Frequent reviewers want keyboard shortcuts, and WCAG 2.2 2.1.4 Character
Key Shortcuts requires that single-key shortcuts can be turned off or use a
modifier key, so they do not fire by accident for speech-input users. The
app supplies the items, the item's content, the people to assign to and the
approve, reject and assign calls; the pattern supplies position, movement,
the required comment, shortcuts and their help.

## Walkthrough

1. The user opens "Bills to approve"; the queue shows bill "B-1043", "3 of
   12", "Previous", "Next", "Approve", "Reject" and "Assign".
2. They press "Next"; it shows "4 of 12".
3. They choose "Reject"; a comment field appears and "Reject" stays
   unavailable until they write "Rate not agreed".
4. They choose "Assign" and pick "J. Chen".
5. They choose "Keyboard shortcuts"; a dialog lists each shortcut and a
   switch to turn shortcuts off.
6. When the last item is done, the queue says "No bills to approve".

## Acceptance Criteria

- [ ] **US-037-AC1** — Given a queue of 12 items on item 3, when it renders, then it shows one item, its position as "3 of 12", and previous and next controls; choosing next shows item 4 as "4 of 12" and choosing previous shows item 2.
- [ ] **US-037-AC2** — Given an item, when the user chooses approve, then the app is given the approval for that item.
- [ ] **US-037-AC3** — Given an item, when the user chooses reject, then a comment is required: with no comment the rejection cannot be completed and the comment field says it is required; with a comment the app is given the rejection and the comment.
- [ ] **US-037-AC4** — Given an item, when the user chooses assign and picks a person, then the app is given the item and the person.
- [ ] **US-037-AC5** — Given the queue, when the user opens the keyboard shortcuts help, then a modal dialog lists every shortcut with its action, and closing it returns focus to the control that opened it.
- [ ] **US-037-AC6** — Given the queue's shortcuts, when they are inspected, then each uses a modifier key or, where it is a single character key, the user can turn shortcuts off; with shortcuts off, pressing the key does nothing (WCAG 2.1.4).
- [ ] **US-037-AC7** — Given a queue with no items, when it renders, then it shows an empty state that says there is nothing to review, with no item actions.

## Edge Cases

- **First and last item**: previous is unavailable on item 1 and next on the last.
- **The current item is approved or rejected**: the queue moves to the next item and the count of items drops.
- **An action fails**: the item stays with an error and a way to retry.
- **Typing in the comment field**: characters typed there are text, not shortcuts.
- **Compact size**: actions stay reachable at the bottom of the screen without covering the focused element.
- **Partial permission**: actions the user cannot take are hidden or disabled with a stated reason.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Position | US-037-AC1 | 12 items, on 3 | Render; Next; Previous twice | "3 of 12"; "4 of 12"; item 2 |
| Approve | US-037-AC2 | Item "B-1043" | Approve | App receives approve for B-1043 |
| Reject | US-037-AC3 | Item "B-1043" | Reject with empty comment; then "Rate not agreed" | Blocked, comment marked required; app receives reject and comment |
| Assign | US-037-AC4 | People "J. Chen", "A. Patel" | Assign, choose "J. Chen" | App receives B-1043 and J. Chen |
| Help | US-037-AC5 | 4 shortcuts | Open help; Escape | Dialog lists 4; focus back on the help control |
| Shortcuts off | US-037-AC6 | Single-key "a" approves | Turn shortcuts off; press "a" | Nothing happens; with modifier shortcuts, each has a modifier |
| Empty | US-037-AC7 | 0 items | Render | Empty state text; no approve, reject or assign |

## Dependencies

- **Stories**: US-023, US-026
- **Feature Spec**: FEAT-006
- **Feature Requirements**: QUEUE-01
- **PRD Requirements**: FR-25, FR-26
- **External**: CONTRACT-004 revision (queue slots and shortcut list); FEAT-004 widgets: dialog, combobox, Field

## Out of Scope

- Which items are in the queue, their order and the approval rules (the app's; SCR-11).
- Batch approval of many items at once (the collection list's bulk actions, US-025).
