---
ddx:
  id: US-033
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-004
    - kind: informed_by
      to: ADR-020
    - kind: informed_by
      to: ADR-021
---

# US-033: Choose from a long list, and read a tooltip

**Feature**: FEAT-004 — App SDK
**Feature Requirements**: SDK-19
**PRD Requirements**: FR-17
**Priority**: P1
**Status**: Draft

## Story

**As an** end user of an app built on the SDK
**I want** to pick one value from a long list by typing a few letters, and to read what an icon-only button does
**So that** I choose the right client or matter without scrolling hundreds of options, and never have to guess at an unlabelled icon, with a mouse, keyboard or screen reader

## Context

Requested by the operator on 2026-10-19 ("do all P1 and P2 screen
patterns"), admitted ahead of consumer evidence by operator decision
(FEAT-006 "Extended screens"). SDK-19 lists the basic widgets screen
patterns need; the combobox and the tooltip are the two with no story yet
(FEAT-004 notes the tooltip "needs one before it ships"). The combobox
follows the WAI-ARIA Authoring Practices (APG) Combobox pattern with a
listbox popup; the tooltip follows the APG Tooltip pattern and WCAG 2.2
1.4.13 Content on Hover or Focus. The command palette (US-044) and the
filter panel's long choices build on the combobox. The app supplies the
options and receives the chosen value; the widget supplies filtering of the
options it is given, keyboard, ARIA and announcements.

## Walkthrough

1. On a form the user focuses "Client", a combobox over 400 clients.
2. They type "ac"; a listbox opens below showing "Acme Corp", "Acton LLP"
   and "Pacific Holdings".
3. They press Down twice; "Acton LLP" is the active option, highlighted, and
   a screen reader reads it while focus stays in the input.
4. They press Enter; the input shows "Acton LLP" and the list closes.
5. They type "zzz"; the list says "No matches".
6. In the page header they hover the bell icon; a tooltip "Notifications"
   appears. They move the pointer onto the tooltip and it stays.
7. Tabbing to the same button shows the tooltip again; Escape hides it and
   focus stays on the button.

## Acceptance Criteria

- [ ] **US-033-AC1** — Given a combobox with 40 options, when the user types text into it, then a listbox popup opens showing only the options that match the text, and the input exposes the combobox role, its expanded state and the listbox it controls (APG Combobox, listbox popup).
- [ ] **US-033-AC2** — Given the popup open, when the user presses Down or Up, then the next or previous option becomes active, is visibly marked and is referenced by the input's aria-activedescendant while keyboard focus stays in the input.
- [ ] **US-033-AC3** — Given an active option, when the user presses Enter, then that option is chosen, the input shows its label, the popup closes and the app is given the chosen value.
- [ ] **US-033-AC4** — Given the popup open, when the user presses Escape, then the popup closes without changing the chosen value and focus stays in the input.
- [ ] **US-033-AC5** — Given typed text that matches no option, when the popup updates, then it shows a no-match message that is announced to assistive technology, and Enter chooses nothing.
- [ ] **US-033-AC6** — Given a control with a tooltip, when the pointer hovers it or it receives keyboard focus, then the tooltip is shown with the tooltip role and the control references it through aria-describedby; when hover and focus both leave, it is hidden (APG Tooltip).
- [ ] **US-033-AC7** — Given a tooltip shown, when the user presses Escape, then it is hidden and focus does not move; when the pointer moves from the control onto the tooltip, then it stays shown (WCAG 1.4.13 dismissible, hoverable, persistent).
- [ ] **US-033-AC8** — Given an icon-only button with a tooltip, when it is read by assistive technology, then it has an accessible name and the tooltip's text is exposed through aria-describedby.

## Edge Cases

- **Many options**: the popup scrolls inside itself and the active option is scrolled into view as Down and Up move.
- **Down at the last option**: the active option stays on the last one or wraps, as the APG pattern allows, and never leaves the list without an active option.
- **Long option labels**: they wrap within the popup; the full label is readable.
- **Tooltip near the viewport edge**: it is placed so it is not clipped.
- **Touch only**: the tooltip's text is still available through the control's description; a control's only name never lives in the tooltip alone.
- **Reduced motion**: tooltip and popup transitions are removed.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Filter | US-033-AC1 | 40 clients | Type "ac" | Popup open; 3 options; `aria-expanded="true"`; `aria-controls` names the listbox |
| Move | US-033-AC2 | Popup with 3 options | Down, Down, Up | Option 1 active; `aria-activedescendant` set to it; focus in input |
| Choose | US-033-AC3 | "Acton LLP" active | Enter | Input "Acton LLP"; popup closed; value reported once |
| Close | US-033-AC4 | Popup open, chosen "Acme Corp" | Escape | Popup closed; value still "Acme Corp"; focus in input |
| No match | US-033-AC5 | 40 clients | Type "zzz", Enter | "No matches" in a live region; nothing chosen |
| Show | US-033-AC6 | Bell button with tooltip | Hover; leave; Tab to it; Tab away | Shown; hidden; shown; hidden; `role="tooltip"` |
| Dismiss | US-033-AC7 | Tooltip shown by focus; by hover | Escape; move pointer onto tooltip | Hidden, focus on button; stays shown |
| Icon name | US-033-AC8 | Icon-only "Notifications" button | Read accessible tree | Name present; description equals tooltip text |

## Dependencies

- **Stories**: US-010
- **Feature Spec**: FEAT-004
- **Feature Requirements**: SDK-19
- **PRD Requirements**: FR-17
- **External**: CONTRACT-004 *Screen patterns* (combobox and tooltip); WAI-ARIA APG Combobox and Tooltip patterns

## Out of Scope

- Multi-select comboboxes and free-text entry that creates a new option.
- Fetching options from a server as the user types (the app's).
- Tooltips with interactive content (those are dialogs or popovers).
