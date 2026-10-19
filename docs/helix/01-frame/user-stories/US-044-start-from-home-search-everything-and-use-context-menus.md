---
ddx:
  id: US-044
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

# US-044: Start from home, search everything, and use context menus

**Feature**: FEAT-006 — Screen patterns
**Feature Requirements**: HOME-01, SRCH-01, CTX-01
**PRD Requirements**: FR-25, FR-26
**Priority**: P1 (context menu P2)
**Status**: Draft

## Story

**As an** end user of an app built on the SDK
**I want** a home screen that shows my work, a keyboard-first search that jumps to any record or action, and right-click shortcuts on the things I act on
**So that** I start each day knowing what is mine and reach any matter in a few keystrokes

## Context

Requested by the operator on 2026-10-19 ("do all P1 and P2 screen
patterns"), admitted ahead of consumer evidence by operator decision
(FEAT-006 "Extended screens"). The home screen is a per-user summary; the
command palette is a modal dialog around a combobox with a listbox popup
(WAI-ARIA Authoring Practices (APG) Dialog and Combobox, US-033), opened
with Ctrl+K or Cmd+K and from a visible button. A context menu follows the
APG Menu pattern and only duplicates actions also on a visible control, so
no action depends on right-click. The harness may own global search for
embedded products (FEAT-006 constraints). The app supplies the tiles,
lists, search results and actions; the pattern supplies layout, keyboard,
grouping and focus.

## Walkthrough

1. The user signs in to "Home": tiles "Open matters 14", "Bills to approve
   3", "Unbilled hours 62", then "Assigned to me" and "Recent".
2. They press Ctrl+K; a dialog opens with a search field and "Recent"
   results before they type.
3. They type "acme"; results show under "Matters" ("Acme v Beta") and
   "Actions" ("New matter for Acme"). Down moves the active result; Enter
   opens "Acme v Beta".
4. They open it again and press Escape; the dialog closes and focus returns
   to where it was.
5. In a list they right-click a row; a menu with "Open", "Duplicate" and
   "Archive" opens at the pointer, the same actions as the row's "More"
   menu. With the row focused, Shift+F10 opens it beside the row.

## Acceptance Criteria

- [ ] **US-044-AC1** — Given number tiles, assigned work and recent items supplied by the app, when the home screen renders, then it shows each tile with its label and number and each list under its heading; a list with no items shows its own empty state.
- [ ] **US-044-AC2** — Given a page with the command palette, when the user presses Ctrl+K, presses Cmd+K, or chooses its visible button, then a modal dialog opens with focus in a combobox.
- [ ] **US-044-AC3** — Given the palette open with nothing typed, when it renders, then it lists the recent items; when the user types, then it lists the matching records and actions the app returns in groups, each group labelled.
- [ ] **US-044-AC4** — Given results with an active result, when the user presses Enter, then the app is given that result to go to; when the user presses Escape, then the dialog closes and focus returns to the element that had it before the palette opened.
- [ ] **US-044-AC5** — Given an element with a context menu, when the user right-clicks it, presses Shift+F10 or presses the ContextMenu key while it has focus, then a menu opens at the pointer or beside the focused element and follows the APG Menu pattern: arrow keys move between items, Enter chooses one, Escape closes it and returns focus to the element.
- [ ] **US-044-AC6** — Given a context menu on a row with a visible action menu, when the context menu opens, then each of its items is also an item in the visible action menu.

## Edge Cases

- **No results**: the palette says no results for the typed text, and Enter does nothing.
- **Compact size**: the palette opens as a full-screen dialog; the home screen's tiles and lists stack in one column.
- **The browser or another app already uses Ctrl+K**: the visible button still opens the palette.
- **A failed search**: the palette shows the app's error with a way to retry, keeping the typed text.
- **Touch only**: no context menu (long-press conflicts with text selection); the visible action menu serves.
- **Right-click on text the user wants to copy**: the context menu applies only to elements given one; elsewhere the browser's menu shows.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Home | US-044-AC1 | 3 tiles; 5 assigned; 0 recent | Render | 3 tiles with numbers; "Assigned to me" with 5; "Recent" empty state |
| Open palette | US-044-AC2 | Any page | Ctrl+K; Escape; Meta+K; Escape; click button | Dialog `aria-modal="true"`; focus in `role="combobox"` each time |
| Groups | US-044-AC3 | 4 recent; "acme" returns 1 matter, 1 action | Open; type "acme" | 4 recent; groups "Matters" and "Actions" with accessible names |
| Go, close | US-044-AC4 | "Acme v Beta" active; focus was on "Filters" | Enter; reopen, Escape | App receives the result; focus back on "Filters" |
| Context menu | US-044-AC5 | Row with 3 actions | Right-click; Escape; focus row, Shift+F10, Down, Enter | Menu at pointer; focus to row; menu by row; item 2 chosen |
| Duplicate only | US-044-AC6 | Row "More" menu: Open, Duplicate, Archive | Open context menu | Its items are a subset of Open, Duplicate, Archive |

## Dependencies

- **Stories**: US-024, US-025, US-033
- **Feature Spec**: FEAT-006
- **Feature Requirements**: HOME-01, SRCH-01, CTX-01
- **PRD Requirements**: FR-25, FR-26
- **External**: CONTRACT-004 revision (home, palette and context menu slots); FEAT-004 widgets: dialog, combobox, menu button

## Out of Scope

- Searching, ranking results and choosing what home shows (the app's; SCR-11).
- Personalising the home screen layout.
- A context menu as the only way to reach any action.
