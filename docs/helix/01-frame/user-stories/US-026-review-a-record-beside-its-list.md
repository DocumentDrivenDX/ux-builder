---
ddx:
  id: US-026
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

# US-026: Review a record beside its list

**Feature**: FEAT-006 — Screen patterns
**Feature Requirements**: SCR-04, SCR-05, REG-04, REG-05, REG-08, RSP-08
**PRD Requirements**: FR-25, FR-26
**Priority**: P0
**Status**: Draft

## Story

**As an** end user of an app built on the SDK
**I want** to step through records in a list and see each one's fields, tabs and activity beside it, or on its own view on a phone
**So that** I can review many matters quickly without losing my place

## Context

Requested by the operator on 2026-10-18; implements FEAT-006's list-with-
detail and record detail patterns under ADR-020 and ADR-021 (M3's
list-detail canonical layout). The detail is a full record: page header
with status and actions, a label/value list, a tabs section, related lists
and an activity timeline. Because the pattern adapts to its container, the
two-pane layout collapses to list-then-detail inside a narrow embed even on
a wide monitor, and focus must survive that change.

## Walkthrough

1. At 1366 px the user sees the matters list on the left and "Acme v
   Beta" on the right, with status "Open", "Edit" and "More".
2. They press ArrowDown in the list; the next matter is selected and its
   detail replaces the previous one.
3. In the detail they choose the "Documents (12)" tab; the URL records the
   tab, and a reload returns to it.
4. The activity timeline lists a comment, a status change and a system
   import, each labelled in text and with its own icon.
5. They narrow the window until the container is 800 px; the list
   disappears, the detail fills the space with a "Back" link, and focus
   stays in the detail.
6. On a phone the list shows first; choosing a record opens its own view
   with "Back".

## Acceptance Criteria

- [ ] **US-026-AC1** — Given a list-with-detail screen at expanded size and above, when a record is selected, then the list remains visible beside the record's detail.
- [ ] **US-026-AC2** — Given focus in the list, when the user presses ArrowDown or ArrowUp, then selection moves to the next or previous record and the detail shows that record.
- [ ] **US-026-AC3** — Given the screen below expanded size (839 px container), when a record is selected, then the detail is shown as its own view with a Back link, and Back returns to the list with that record focused.
- [ ] **US-026-AC4** — Given a record open in two panes, when the container shrinks across 840 px, then keyboard focus stays on, or moves to, the element the user was working with in the detail (not the document body).
- [ ] **US-026-AC5** — Given a record detail, when it renders, then its label/value list shows two columns at medium size and above and one column at compact size, and its page header shows the record's status and actions.
- [ ] **US-026-AC6** — Given a tabs section with counts, when a tab is chosen, then the URL reflects the selected tab, reloading restores it, the counts are shown, and the tabs follow the APG Tabs pattern.
- [ ] **US-026-AC7** — Given an activity timeline with a comment, a change and a system event, when it renders, then events are in time order with actor, action and time, and each kind is distinguished by text and icon, not by colour alone (WCAG 1.4.1).
- [ ] **US-026-AC8** — Given no record selected, a record that fails to load, or a record the user may not see, when the detail renders, then it shows a state panel saying so with the next action, and the list stays usable.

## Edge Cases

- **Selected record removed by another user**: the detail shows the not-found state and the list refreshes on the app's signal.
- **Many tabs on a phone**: tabs scroll; related lists collapse to counts with "View all".
- **Deep link to a record on a phone**: the record's own view opens with Back to the list.
- **Unsaved inline change when switching record**: the pattern provides the slot; the app decides whether to warn.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Two panes | US-026-AC1 | 20 matters, 1024 px | Select "Acme v Beta" | List and detail both visible |
| Arrow keys | US-026-AC2 | Focus on row 3 | ArrowDown | Row 4 selected; detail shows row 4 |
| One pane | US-026-AC3 | 720 px container | Select row 4, Back | Detail view with Back; list with row 4 focused |
| Collapse focus | US-026-AC4 | Focus on "Edit" at 1024 px | Resize to 800 px | Focus still on "Edit" |
| Field columns | US-026-AC5 | 10 fields | Render at 720 and 390 | 2 columns; 1 column |
| Tabs in URL | US-026-AC6 | "Documents (12)" | Click tab, reload | URL has tab; tab restored; arrow keys move tabs |
| Timeline | US-026-AC7 | 3 events of 3 kinds | Render | Time order; text and icon per kind |
| States | US-026-AC8 | None selected, 500, 403 | Render detail | Matching panel; list usable |

## Dependencies

- **Stories**: US-025 (collection list)
- **Feature Spec**: FEAT-006
- **Feature Requirements**: SCR-04, SCR-05, REG-04, REG-05, REG-08, RSP-08
- **PRD Requirements**: FR-25, FR-26
- **External**: CONTRACT-004 revision (list-with-detail and record detail slots); FEAT-004 widgets: tabs, menu button

## Out of Scope

- Editing a record (US-027).
- Routing and data loading (the app's; SCR-11).
- The tabs and page-header variants, covered by US-030.
