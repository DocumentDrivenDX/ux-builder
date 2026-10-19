---
ddx:
  id: US-039
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

# US-039: Plan work on a board and a calendar, with attachments

**Feature**: FEAT-006 — Screen patterns
**Feature Requirements**: BOARD-01, CAL-01, ATT-01
**PRD Requirements**: FR-25, FR-26
**Priority**: P2
**Status**: Draft

## Story

**As an** end user of an app built on the SDK
**I want** to see work by status on a board, see dates on a calendar, and keep a record's files with it, all usable without a mouse
**So that** I can move a matter to "In review", see this week's hearings and find the latest engagement letter, on a desktop or a phone

## Context

Requested by the operator on 2026-10-19 ("do all P1 and P2 screen
patterns"), admitted ahead of consumer evidence by operator decision
(FEAT-006 "Extended screens"). Drag is the common way to move a card or
upload a file, and WCAG 2.2 2.5.7 Dragging Movements requires a way that
does not need dragging: a "Move to" menu and an upload button. The month
view follows the WAI-ARIA Authoring Practices (APG) Grid pattern, as date
pickers do. Below medium size a board shows one column at a time and a
calendar becomes an agenda list (ADR-021). The app supplies records,
statuses, events, files and the move, upload and remove calls; the pattern
supplies layout, keyboard, alternatives to drag and confirmation.

## Walkthrough

1. The user opens "Matters by stage"; a board shows "Intake (4)", "Active
   (9)", "In review (2)" and "Closed (12)".
2. They drag "Acme v Beta" to "In review"; the counts change. On another
   card they open its "Move to" menu and choose "Closed".
3. On a phone the board shows "Active (9)" with a switcher for the other
   columns.
4. They open the calendar; the month shows 19 October with "10:00 Hearing,
   Acme v Beta". Right arrow moves to 20 October. They switch to week and
   day.
5. On a phone the calendar is an agenda list by date.
6. On the matter, the attachments region lists "Engagement letter.pdf, PDF,
   240 KB, v3". They upload a file with "Upload". They remove one and
   confirm.

## Acceptance Criteria

- [ ] **US-039-AC1** — Given a board of four statuses, when it renders at medium size and above, then each status is a column with its heading and the number of cards in it.
- [ ] **US-039-AC2** — Given a card, when the user moves it to another column by dragging or by choosing the column from its "Move to" menu, then the app is given the card and the new status and both columns' counts change; the menu follows the APG Menu Button pattern (WCAG 2.5.7).
- [ ] **US-039-AC3** — Given the board in a 390 px container, when it renders, then one column is shown at a time with a control to switch to each other column.
- [ ] **US-039-AC4** — Given a calendar, when the user chooses month, week or day, then that view is shown; the month view is a grid in which the arrow keys move focus between days (APG Grid), and each event is named in text with its time.
- [ ] **US-039-AC5** — Given the calendar in a 390 px container, when it renders, then it is an agenda list of events grouped by date, each named in text with its time.
- [ ] **US-039-AC6** — Given an attachments region, when the user uploads with its button or by dropping a file, then the app is given the file; the region lists each file with its name, type, size and version, and each name links to the file (WCAG 2.5.7).
- [ ] **US-039-AC7** — Given a listed file, when the user chooses to remove it, then a confirmation dialog names the file; confirming gives the app the removal, and cancelling keeps the file.

## Edge Cases

- **An empty column**: it shows its heading, "0" and an empty state, and is still a target for "Move to".
- **A move the app rejects**: the card returns to its column with the app's reason.
- **Many events on one day in month view**: the day shows a count of further events that opens the day view.
- **Week view at medium size**: it scrolls inside its own region; the page does not scroll horizontally.
- **No attachments**: the region shows an empty state with "Upload".
- **An upload that fails**: the file is listed with the error and a way to retry.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Columns | US-039-AC1 | 4 statuses, 27 cards | Render at 1024 | 4 headings with "Intake (4)" … "Closed (12)" |
| Move | US-039-AC2 | "Acme v Beta" in Active | Drag to "In review"; Move to "Closed" by keyboard | App receives each move; counts update; menu Enter, arrows, Escape |
| Compact board | US-039-AC3 | Same, 390 px | Render; switch to "Closed" | 1 column; switcher; "Closed" shown |
| Calendar | US-039-AC4 | 19 Oct, "10:00 Hearing" | Month: Right arrow; choose week, day | Focus on 20 Oct; week and day shown; event text "10:00 Hearing, Acme v Beta" |
| Agenda | US-039-AC5 | 5 events over 3 days, 390 px | Render | 3 date groups; 5 events with times |
| Attachments | US-039-AC6 | 2 files | Upload by button; drop | App receives file both times; name, type, size, version; links |
| Remove | US-039-AC7 | "Engagement letter.pdf" | Remove; cancel; remove; confirm | Kept; app receives removal |

## Dependencies

- **Stories**: US-023, US-025, US-026, US-027
- **Feature Spec**: FEAT-006
- **Feature Requirements**: BOARD-01, CAL-01, ATT-01
- **PRD Requirements**: FR-25, FR-26
- **External**: CONTRACT-004 revision (board, calendar and attachments slots); FEAT-004 widgets: menu button, tabs, dialog, date picker

## Out of Scope

- Creating and editing events, resource lanes and recurring events.
- File preview and version history beyond the listed version number.
- Work-in-progress limits and swimlanes on the board.
- Storage, upload transport and file scanning (the app's; SCR-11).
