---
ddx:
  id: US-041
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

# US-041: Pivot, build and subscribe to reports

**Feature**: FEAT-006 — Screen patterns
**Feature Requirements**: PIVOT-01, RB-01, SUB-01
**PRD Requirements**: FR-25, FR-26
**Priority**: P2
**Status**: Draft

## Story

**As an** end user of an app built on the SDK who analyses figures
**I want** to cross-tabulate figures with subtotals I can expand and collapse, build a report from the measures and groupings I choose, and have it sent to me on a schedule or when a threshold is crossed
**So that** I answer "hours by practice by quarter" myself and hear about unbilled time before month end without checking every day

## Context

Requested by the operator on 2026-10-19 ("do all P1 and P2 screen
patterns"), admitted ahead of consumer evidence by operator decision
(FEAT-006 "Extended screens"). The pivot's expandable row groups follow the
WAI-ARIA Authoring Practices (APG) Treegrid pattern. The report builder is
deliberately small: choose measures and groupings, see a preview, save with
a name. Subscriptions and alerts are listed and managed in one place;
deleting one is confirmed. The app computes the figures, runs the report,
stores it and delivers subscriptions; the pattern supplies the tables, the
choices, the preview and the management screens.

## Walkthrough

1. The user opens "Hours by practice"; a pivot shows practices down the
   side, quarters across the top, a subtotal per practice and a grand
   total.
2. They focus "Litigation" and press Right; its partners appear beneath it.
   Left collapses it again.
3. In "New report" they choose "Billed hours" and "Unbilled hours", group
   by "Practice" then "Month"; the preview table updates with each choice.
4. They save it as "Monthly hours by practice".
5. On "Subscriptions" they see "Every Monday, 08:00, to J. Chen" and
   "Alert when unbilled hours > 500, to Finance". They add a weekly
   delivery, pause the alert, and delete an old one after confirming.

## Acceptance Criteria

- [ ] **US-041-AC1** — Given a pivot of practices by quarters, when it renders, then it shows row and column headers, a subtotal row for each row group and a grand total.
- [ ] **US-041-AC2** — Given a collapsed row group with focus, when the user presses Right, then it expands and its expanded state is exposed; when the user presses Left on the expanded group, then it collapses; Up and Down move between visible rows (APG Treegrid).
- [ ] **US-041-AC3** — Given the report builder, when the user chooses or removes a measure or grouping, then the preview table shows the current choice's measures as columns and groupings as rows.
- [ ] **US-041-AC4** — Given a choice of measures and groupings, when the user saves it with a name, then the app is given the name and the choice; with no name, saving is not completed and the name field says it is required.
- [ ] **US-041-AC5** — Given a report's subscriptions, when they render, then each scheduled delivery shows its frequency and recipients and each alert shows its threshold and recipients.
- [ ] **US-041-AC6** — Given the subscriptions, when the user adds one or pauses one, then the app is given the new subscription or the pause, and a paused one shows "Paused" in text.
- [ ] **US-041-AC7** — Given a subscription, when the user chooses to delete it, then a confirmation dialog names it; confirming gives the app the deletion and cancelling keeps it.

## Edge Cases

- **A pivot wider than its container**: it scrolls inside its own region with row headers kept in view; the page does not scroll horizontally.
- **A group with no rows**: it shows its subtotal of 0 and is not expandable.
- **No measure chosen**: the preview shows an empty state saying to choose a measure.
- **A name already used**: the app's error is shown at the name field.
- **No subscriptions**: the list shows an empty state with "Add".
- **Compact size**: the builder's choices and preview stack in one column.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Pivot | US-041-AC1 | 3 practices × 4 quarters | Render | Row and column headers; 3 subtotals; grand total |
| Treegrid | US-041-AC2 | "Litigation" collapsed, 4 partners | Right; Down; Up; Left | `aria-expanded="true"`, 4 rows shown; focus moves; collapsed |
| Preview | US-041-AC3 | Choose 2 measures, 2 groupings; remove 1 measure | Each choice | Preview columns and rows follow each change |
| Save | US-041-AC4 | Choice made | Save empty name; save "Monthly hours by practice" | Required error; app receives name and choice |
| List | US-041-AC5 | 1 delivery, 1 alert | Render | "Every Monday, 08:00", "J. Chen"; "> 500", "Finance" |
| Add, pause | US-041-AC6 | Same | Add weekly; pause alert | App receives each; "Paused" shown |
| Delete | US-041-AC7 | "Every Monday" delivery | Delete; cancel; delete; confirm | Kept; app receives deletion |

## Dependencies

- **Stories**: US-028, US-040
- **Feature Spec**: FEAT-006
- **Feature Requirements**: PIVOT-01, RB-01, SUB-01
- **PRD Requirements**: FR-25, FR-26
- **External**: CONTRACT-004 revision (pivot, builder and subscriptions slots); FEAT-004 widgets: DataTable, combobox, dialog, Field

## Out of Scope

- Computing figures, running reports and delivering subscriptions (the app's; SCR-11).
- Charts in the report builder, filters within a report, and calculated measures.
- Dragging measures between axes.
