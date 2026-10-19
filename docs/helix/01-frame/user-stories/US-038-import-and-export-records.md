---
ddx:
  id: US-038
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

# US-038: Import and export records

**Feature**: FEAT-006 — Screen patterns
**Feature Requirements**: IMP-01, EXP-01
**PRD Requirements**: FR-25, FR-26
**Priority**: P1
**Status**: Draft

## Story

**As an** end user of an app built on the SDK
**I want** to bring records in from a spreadsheet with clear errors before anything is saved, and take records out in the format and fields I choose
**So that** I can load 500 matters from a client's file and fix the bad rows, or hand a report to finance, without asking an engineer

## Context

Requested by the operator on 2026-10-19 ("do all P1 and P2 screen
patterns"), admitted ahead of consumer evidence by operator decision
(FEAT-006 "Extended screens"). Import follows the common upload, map,
validate, preview, commit sequence, with errors listed by row and a file of
the failed rows so the user can fix and re-import them. Upload has a button
and accepts drop only as an extra (WCAG 2.2 2.5.7 Dragging Movements).
Long exports run as background jobs that notify when ready. The app parses
the file, validates rows, commits, builds the export and reports progress;
the pattern supplies the steps, mapping, error listing, preview, dialog and
progress.

## Walkthrough

1. The user chooses "Import matters"; step 1 "Upload" shows "Choose file".
   They choose `matters.csv` (they could also drop it on the area).
2. Step 2 "Map columns" lists the file's columns, "Client name",
   "Open date", "Partner", each with a field to map to.
3. Step 3 "Validate" lists "Row 14: Open date is not a date" and two
   others, with "Download failed rows".
4. Step 4 "Preview" shows the first rows as they will be saved; they choose
   "Import 497 rows".
5. The result report says 497 imported, 3 failed.
6. Later they choose "Export"; a dialog offers CSV or Excel and the fields
   to include. The export is large; progress shows and they close the
   dialog and keep working. A notification says "Export ready" with a link.

## Acceptance Criteria

- [ ] **US-038-AC1** — Given an import, when it renders, then its steps are upload, map columns, validate, preview and commit, in that order, with the current step indicated, followed by a result report.
- [ ] **US-038-AC2** — Given the upload step, when the user chooses a file with its button or drops a file on the upload area, then the app is given the file in either case (WCAG 2.5.7).
- [ ] **US-038-AC3** — Given a file with three columns, when the mapping step renders, then each file column is listed with a choice of the field it maps to, and continuing gives the app the chosen mapping.
- [ ] **US-038-AC4** — Given validation errors the app reports, when the validation step renders, then each error is listed with its row number and message, and a control offers a file of the failed rows.
- [ ] **US-038-AC5** — Given rows that passed validation, when the preview step renders and the user commits, then the preview shows the rows as they will be saved, the commit is handed to the app, and the result report the app supplies is shown.
- [ ] **US-038-AC6** — Given an export, when the user opens it, then a modal dialog lets them choose a format and the fields to include, and confirming gives the app the format and fields.
- [ ] **US-038-AC7** — Given a long export, when it is running, then its progress is shown and exposed to assistive technology, the user can close the dialog and keep working while it continues, and when the app reports it ready a notification with a link to the file is shown.

## Edge Cases

- **A file the app cannot read**: the upload step stays with the app's error and a way to choose another file.
- **Every row fails**: the preview and commit are not offered; the failed-rows file is.
- **Two file columns mapped to one field**: the mapping step says so before continuing.
- **Going back from preview to mapping**: the mapping is kept.
- **An export that fails**: the notification says so and offers retry.
- **Compact size**: the import steps show as "Step 2 of 5" with a progress bar, as the wizard does (US-035).

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Steps | US-038-AC1 | New import | Render | 5 steps in order; step 1 current |
| Upload | US-038-AC2 | `matters.csv` | Choose by button; drop | App receives the file both times |
| Map | US-038-AC3 | Columns "Client name", "Open date", "Partner" | Map each, Continue | 3 choices; app receives mapping |
| Validate | US-038-AC4 | 3 errors incl. row 14 | Render | 3 entries with row numbers; failed-rows control |
| Commit | US-038-AC5 | 497 valid rows | Commit | App receives commit; report "497 imported, 3 failed" |
| Export dialog | US-038-AC6 | Formats CSV, Excel; 8 fields | Choose CSV, 4 fields, confirm | Modal; app receives CSV and 4 fields |
| Background | US-038-AC7 | Export at 40% | Close dialog; app reports ready | `role="progressbar"` at 40; page usable; notification with link |

## Dependencies

- **Stories**: US-025, US-035, US-043
- **Feature Spec**: FEAT-006
- **Feature Requirements**: IMP-01, EXP-01
- **PRD Requirements**: FR-25, FR-26
- **External**: CONTRACT-004 revision (import and export slots and progress); FEAT-004 widgets: dialog, DataTable, progress bar, toast

## Out of Scope

- Parsing files, validating rows, committing and generating export files (the app's; SCR-11).
- Scheduled exports (subscriptions, US-041).
- Undo of a committed import.
