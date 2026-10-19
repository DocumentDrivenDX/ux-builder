---
ddx:
  id: US-027
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

# US-027: Create and edit a record with a form

**Feature**: FEAT-006 — Screen patterns
**Feature Requirements**: SCR-06, SCR-07, REG-09
**PRD Requirements**: FR-25, FR-26
**Priority**: P0
**Status**: Draft

## Story

**As an** end user of an app built on the SDK
**I want** forms that tell me clearly what is wrong, keep my input, and confirm before anything destructive
**So that** I can create and edit matters quickly on any device without losing work or deleting the wrong thing

## Context

Requested by the operator on 2026-10-18; implements FEAT-006's full-page
form, quick create/edit and confirmation dialog under ADR-020 and ADR-021.
The rules come from GOV.UK (error summary), Baymard (single column, labels
above fields, validation timing) and WCAG 2.2 (3.3.1, 3.3.3, 2.4.3). Apps
today validate differently, rarely summarise errors and lose input on
navigation. The app supplies fields, validation rules and the save call;
the pattern supplies layout, timing, focus and warnings.

## Walkthrough

1. The user chooses "New matter"; a full-page form shows one column with
   labels above fields and "Save" and "Cancel" visible.
2. They leave "Client" empty and tab on; the field shows its error.
3. They press "Save" with two invalid fields; an error summary at the top
   receives focus and links to each field.
4. They fix the fields and save. Later, editing, they try to navigate away
   with changes; the app warns before leaving.
5. From the list they choose "Quick add"; at 1024 px a dialog opens with
   four fields; on a phone it opens as a full-screen sheet.
6. They choose "Delete matter"; a dialog names "Acme v Beta" and what will
   be lost, focus starts on "Cancel", and they must type the name to
   enable "Delete".

## Acceptance Criteria

- [ ] **US-027-AC1** — Given a full-page form, when it renders at any size class, then fields are in one column with each label above its field, and the form's width does not exceed the form maximum width.
- [ ] **US-027-AC2** — Given an invalid field, when focus leaves it, then its error message is shown and programmatically associated with the field; a valid field shows no error.
- [ ] **US-027-AC3** — Given two invalid fields, when the user submits, then an error summary at the top lists both, each entry links to and focuses its field, and the summary receives focus (WCAG 3.3.1, 3.3.3).
- [ ] **US-027-AC4** — Given a form with unsaved changes, when the user tries to leave it, then they are warned and can stay with their input intact.
- [ ] **US-027-AC5** — Given a long form in a 390 px container, when the user scrolls or the on-screen keyboard opens, then Save and Cancel remain visible above the keyboard and safe area and never cover the focused field.
- [ ] **US-027-AC6** — Given quick create, when opened at medium size and above, then it is a modal dialog; below medium it is a full-screen sheet; in both, focus is trapped while open and returns to the triggering control on close.
- [ ] **US-027-AC7** — Given a confirmation dialog for a destructive action, when it opens, then it names the object and the consequence and focus starts on the non-destructive choice.
- [ ] **US-027-AC8** — Given a confirmation that requires typing the object's name, when the typed text does not match, then the destructive action is unavailable; when it matches, it becomes available.

## Edge Cases

- **Resize across a size class with unsaved input**: input is kept; a dialog becomes a sheet or the reverse with focus unchanged.
- **Save fails on the server**: the form keeps the input and shows the error at the top with a way to retry.
- **Server-side field errors**: shown in the summary and at the field as for client errors.
- **No permission to edit**: the form renders read-only or the no-permission panel, as the app decides.
- **Reduced motion**: sheet and dialog transitions are removed.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| One column | US-027-AC1 | 8 fields | Render at 390, 1024, 1920 | 1 column; labels above; width ≤ form max |
| Blur | US-027-AC2 | "Client" required, empty | Focus then Tab | Error shown; `aria-describedby` set |
| Summary | US-027-AC3 | 2 invalid fields | Submit | Summary focused; 2 links; link focuses field |
| Leave warning | US-027-AC4 | Edited "Title" | Navigate away | Warning; stay keeps input |
| Sticky actions | US-027-AC5 | 20 fields, 390 px, keyboard open | Focus last field | Actions visible; field not covered |
| Quick create | US-027-AC6 | 4-field form | Open at 720 and 390; Tab past last; Escape | Dialog; sheet; focus wraps; returns to trigger |
| Confirm | US-027-AC7 | Delete "Acme v Beta" | Open | Name and consequence; focus on "Cancel" |
| Type to confirm | US-027-AC8 | Name required | Type "Acme", then full name | Unavailable; available |

## Dependencies

- **Stories**: US-023
- **Feature Spec**: FEAT-006
- **Feature Requirements**: SCR-06, SCR-07, REG-09
- **PRD Requirements**: FR-25, FR-26
- **External**: CONTRACT-004 revision (form, quick create and confirmation slots); FEAT-004 widgets: dialog, drawer/sheet, Field

## Out of Scope

- Validation rules and the save call (the app's; SCR-11).
- Wizards, review-and-confirm and editable grids (P1).
