---
ddx:
  id: US-036
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

# US-036: Edit rows in a grid

**Feature**: FEAT-006 — Screen patterns
**Feature Requirements**: GRID-01
**PRD Requirements**: FR-25, FR-26
**Priority**: P1
**Status**: Draft

## Story

**As an** end user of an app built on the SDK
**I want** to enter and correct line items in a grid from the keyboard, see each cell's error where it is, and see the totals as I go
**So that** I can enter time entries or invoice lines quickly on a desktop, and still correct one on a phone

## Context

Requested by the operator on 2026-10-19 ("do all P1 and P2 screen
patterns"), admitted ahead of consumer evidence by operator decision
(FEAT-006 "Extended screens"). The keyboard model is the WAI-ARIA
Authoring Practices (APG) Grid pattern (data grid with editable cells);
errors follow WCAG 2.2 3.3.1 Error Identification. A billing-review app's line items and
time entry are the first uses. A grid is wide by nature, so below medium
size one row is edited in a sheet instead of cell by cell (ADR-021). The
app supplies columns, rows, cell validation and the save call; the pattern
supplies the grid's keyboard, editing state, errors, totals and the compact
sheet.

## Walkthrough

1. The user opens an invoice at 1366 px; a grid shows lines with
   "Description", "Hours", "Rate" and "Amount", and a totals row.
2. They press Down and Right to reach "Hours" on line 2, press Enter, type
   "3.5" and press Enter; the cell shows 3.5 and the totals row updates.
3. They press F2 on "Rate", type "abc", then Escape; the old rate returns.
4. They type "-1" in "Hours" and commit; the cell shows "Hours must be 0 or
   more" and a screen reader reads it with the cell.
5. They choose "Add line"; a new row appears. They remove line 3.
6. On a phone the grid lists each line; choosing one opens a sheet with its
   fields.

## Acceptance Criteria

- [ ] **US-036-AC1** — Given an editable grid, when the user presses the arrow keys, then focus moves to the adjacent cell in that direction, and the grid is one stop in the Tab order with the grid role (APG Grid).
- [ ] **US-036-AC2** — Given a focused editable cell, when the user presses Enter or F2, then the cell enters edit mode with its value editable; pressing Enter then commits the new value and returns focus to the cell.
- [ ] **US-036-AC3** — Given a cell in edit mode with a changed value, when the user presses Escape, then the change is discarded, the cell shows its previous value and focus returns to the cell.
- [ ] **US-036-AC4** — Given the grid, when the user adds a row, then a new row appears and is reachable by keyboard; when the user removes a row, then it is gone and the totals no longer include it.
- [ ] **US-036-AC5** — Given a committed cell value that the app reports invalid, when the grid renders, then the cell is marked invalid and its error message is shown and programmatically associated with that cell (WCAG 3.3.1).
- [ ] **US-036-AC6** — Given numeric columns, when a cell in one is committed, then the totals row shows the sum of each numeric column including the new value.
- [ ] **US-036-AC7** — Given the grid in a 390 px container, when the user chooses a row, then a sheet opens with that row's fields; saving it updates the row and the totals, and closing it returns focus to the row.

## Edge Cases

- **No rows**: the grid shows its empty state with "Add row" still available.
- **Many columns at medium size**: the grid scrolls inside its own region; the page does not scroll horizontally.
- **Removing the focused row**: focus moves to the next row, or the previous when it was the last.
- **A non-numeric value in a numeric column**: it is an error at the cell and is left out of the total.
- **Read-only cells**: arrow keys reach them; Enter and F2 do not edit them.
- **Resize across a size class while a cell is in edit mode**: the uncommitted value is kept.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Move | US-036-AC1 | 3 rows × 4 columns, focus on 1,1 | Down, Right; Tab | Focus on 2,2; Tab leaves the grid; `role="grid"` |
| Edit | US-036-AC2 | "Hours" 2.0 | Enter, type "3.5", Enter; F2 | 3.5 committed, focus on cell; F2 enters edit mode |
| Cancel | US-036-AC3 | "Rate" 450 | F2, type "abc", Escape | Shows 450; focus on cell |
| Add, remove | US-036-AC4 | 3 rows, total hours 6 | Add row; remove row 3 (2 hours) | 4 rows then 3; total 4 |
| Cell error | US-036-AC5 | App rejects "-1" | Commit "-1" | `aria-invalid="true"`; message linked by `aria-describedby` |
| Totals | US-036-AC6 | Hours 2, 1, 3 | Change 1 to 4 | Totals row hours 9 |
| Compact | US-036-AC7 | 3 rows at 390 px | Choose row 2; change hours; save | Sheet with row 2 fields; row and total updated; focus on row 2 |

## Dependencies

- **Stories**: US-023, US-025, US-027
- **Feature Spec**: FEAT-006
- **Feature Requirements**: GRID-01
- **PRD Requirements**: FR-25, FR-26
- **External**: CONTRACT-004 revision (grid slots and cell validation); FEAT-004 widgets: DataTable, drawer/sheet, Field

## Out of Scope

- Validation rules, saving and computed columns other than totals (the app's; SCR-11).
- Spreadsheet features: formulas, multi-cell selection, copy and paste of ranges, column resizing.
- Grouped or tree rows (US-041, pivot).
