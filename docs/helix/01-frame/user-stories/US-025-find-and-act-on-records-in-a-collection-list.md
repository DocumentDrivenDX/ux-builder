---
ddx:
  id: US-025
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-006
    - kind: informed_by
      to: ADR-020
    - kind: informed_by
      to: ADR-021
    - kind: informed_by
      to: ADR-011
---

# US-025: Find and act on records in a collection list

**Feature**: FEAT-006 — Screen patterns
**Feature Requirements**: SCR-03, REG-01, REG-02, REG-03, REG-10, REG-11, NAV-05, NAV-07, RSP-03
**PRD Requirements**: FR-25, FR-26
**Priority**: P0
**Status**: Draft

## Story

**As an** end user of an app built on the SDK
**I want** to search, filter, page through and select records, then act on one or many, on a desktop or a phone
**So that** I find the matters I need and deal with them in one place without learning a different list in every app

## Context

Requested by the operator on 2026-10-18; implements FEAT-006's collection
list pattern and its regions under ADR-020 and ADR-021. The billing-review app maintains a
private table, filter and bulk-action layer (ADR-011) that it wants to
delete, and other apps skip empty, error and no-permission states. The list
composes the page header, filter bar and panel, a table or stacked items,
selection, the bulk action bar, pagination and every state panel; the app
supplies rows, columns, filters and actions through slots and does the
fetching.

## Walkthrough

1. The user opens "Matters" at 1366 px: a page header with "New matter" and
   a "More" menu, a filter bar, a table of 50 of 312 rows, and "1–50 of
   312".
2. They type "Acme" and apply "Status: Open"; the filter shows as a chip
   and the list narrows.
3. They select three rows; a bulk action bar replaces the toolbar showing
   "3 selected" with "Assign" and "Archive", and a screen reader announces
   the count.
4. They open a row's action menu and choose "Duplicate".
5. They go to page 2, open a record and come back; the list is still on
   page 2.
6. On a phone the same list shows each row as a stacked item with its
   priority fields, filters behind a "Filters (1)" button that opens a
   full-screen sheet, and the bulk bar at the bottom of the screen.

## Acceptance Criteria

- [ ] **US-025-AC1** — Given a collection list with rows, when it renders at expanded size, then it shows a page header with one level-1 heading and a primary action, a filter bar with search, applied filters as removable chips and "Clear all", a table and pagination showing the position (for example "21–40 of 312") and page size.
- [ ] **US-025-AC2** — Given the same list in a 390 px container, when it renders, then each row is a stacked item showing only the columns marked priority, the filter bar is search plus a "Filters" button showing the number applied, and the filter panel opens as a full-screen sheet.
- [ ] **US-025-AC3** — Given rows selected, when the selection changes, then a bulk action bar shows the number selected and the bulk actions, the count is announced through a polite live region, and at compact size the bar sits at the bottom of the screen without covering the focused element.
- [ ] **US-025-AC4** — Given a row action menu, when operated by keyboard, then it follows the APG Menu Button pattern: Enter opens it, arrow keys move between items, Escape closes it and returns focus to its button.
- [ ] **US-025-AC5** — Given a list with no records, no matching records, no permission, a failed load or partly loaded rows, when it renders, then the matching state panel says what happened and offers the next action: no-results lists the active filters with a way to clear them, error offers retry, and the header and filters stay usable.
- [ ] **US-025-AC6** — Given a list on page 2, when the user opens a record and returns, then the list shows page 2 with the same filters and page size.
- [ ] **US-025-AC7** — Given a list loading, when rows arrive, then skeletons occupy the space of the rows and the transition causes Cumulative Layout Shift ≤ 0.1.
- [ ] **US-025-AC8** — Given the list story in every state, when the audit runs at one width per size class in every theme and appearance, then it reports no errors and the page never scrolls horizontally; only the table may scroll inside its own region.

## Edge Cases

- **One record**: list actions, selection and pagination still work.
- **Very many records**: the list pages rather than rendering every row; 50 rows from 1,000 respond to sort, filter and page with Interaction to Next Paint ≤ 200 ms.
- **Partial permission**: bulk or row actions the user cannot take are hidden or disabled with a stated reason.
- **Medium size**: the table shows priority columns; the others are reachable through a column choice.
- **Selection then filtering**: the bar's count reflects selected rows still in the result; the app decides whether hidden selections persist.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Expanded | US-025-AC1 | 312 rows, page size 20, page 2 | Render at 1024 px | h1, primary action, chips, table, "21–40 of 312" |
| Compact | US-025-AC2 | Same, 2 priority columns, 1 filter | Render at 390 px | Stacked items with 2 fields; "Filters (1)"; sheet on open |
| Bulk bar | US-025-AC3 | Select 3 rows | Click checkboxes | "3 selected"; live region text; bar at bottom on compact |
| Row menu | US-025-AC4 | Row actions | Enter, ArrowDown, Escape | Item 2 focused; closed; focus on button |
| States | US-025-AC5 | Empty, no results with "Status: Open", 403, 500, partial | Render each | Right panel; clear filters; retry; header usable |
| Return | US-025-AC6 | Page 2, filter "Acme" | Open record, Back | Page 2, "Acme" kept |
| No shift | US-025-AC7 | Loading → 20 rows | Measure CLS | ≤ 0.1 |
| Audit | US-025-AC8 | Every state story | `ux-builder-audit` at 5 widths | Exit 0; no page scroll |

## Dependencies

- **Stories**: US-023, US-024
- **Feature Spec**: FEAT-006
- **Feature Requirements**: SCR-03, REG-01, REG-02, REG-03, REG-10, REG-11, NAV-05, NAV-07, RSP-03
- **PRD Requirements**: FR-25, FR-26
- **External**: CONTRACT-004 revision (collection list slots and states); FEAT-004 widgets: DataTable, menu button, pagination, drawer/sheet

## Out of Scope

- Data fetching, sorting and filtering logic (the app's; SCR-11).
- Editable grids and work queues (P1/P2).
- Ruled or banded table rows, covered by US-030.
