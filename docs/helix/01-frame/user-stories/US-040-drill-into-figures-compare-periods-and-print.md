---
ddx:
  id: US-040
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

# US-040: Drill into figures, compare periods and print

**Feature**: FEAT-006 — Screen patterns
**Feature Requirements**: DRILL-01, CMP-01, PRINT-01
**PRD Requirements**: FR-25, FR-26
**Priority**: P1
**Status**: Draft

## Story

**As an** end user of an app built on the SDK who reads reports
**I want** to go from a total to the records behind it and back, see how a figure compares with last period in words, and print a report that reads well on paper
**So that** I can explain why billed hours fell this quarter and take a clean copy to the partners' meeting

## Context

Requested by the operator on 2026-10-19 ("do all P1 and P2 screen
patterns"), admitted ahead of consumer evidence by operator decision
(FEAT-006 "Extended screens"). These extend the dashboard and report
(US-028). Drill-down keeps a trail of the levels applied and puts each in
the URL so the browser's Back works. A comparison states its direction in
words, not colour alone (WCAG 2.2 1.4.1 Use of Colour). Print uses the
light appearance, repeats table headers on each page and omits navigation
and actions. The app supplies the figures, the levels and the logo; the
pattern supplies the trail, the comparison text and the print layout.

## Walkthrough

1. On the dashboard the user chooses "Billed hours: 12,400"; the breakdown
   by practice shows, and the trail reads "All practices".
2. They choose "Litigation"; the breakdown by partner shows, and the trail
   reads "All practices › Litigation". They choose "J. Chen" and see the
   time entries.
3. They press the browser's Back and return to "Litigation"; they choose
   "All practices" in the trail and return to the top.
4. A tile reads "12,400 hours, down 8% (1,080) on last quarter".
5. They print the report in dark appearance; the paper copy is light, has
   the title, logo and run date at the top of page one, repeats the table
   header on each page, and starts each section on a new page.

## Acceptance Criteria

- [ ] **US-040-AC1** — Given a drill-down two levels deep, when it renders, then a trail lists each applied level in order as a breadcrumb with the current level marked, and choosing an earlier level returns to it.
- [ ] **US-040-AC2** — Given a drill-down, when the user moves to a deeper level, then the level is recorded in the URL; loading that URL shows the same level, and the browser's Back returns to the previous level.
- [ ] **US-040-AC3** — Given a current and a previous or target value, when the comparison renders, then it shows both values, the difference with its sign, and the direction in words, for example "down 8% on last quarter", so the direction does not depend on colour (WCAG 1.4.1).
- [ ] **US-040-AC4** — Given a report in the dark appearance, when it is printed, then it prints in the light appearance with a header showing the title, the logo and the run date on the first page.
- [ ] **US-040-AC5** — Given a printed report with a table longer than a page and several sections, when it is printed, then the table's header row repeats on each page, each section begins on a new page, and navigation and actions are omitted.

## Edge Cases

- **No change between periods**: the comparison says "no change" with a difference of 0, with no direction.
- **No previous value**: the comparison says there is no previous value rather than showing a difference.
- **A drill level with no records**: the no-results panel shows with the trail still leading back.
- **A deep trail at compact size**: earlier levels collapse into an overflow, as breadcrumbs do (US-024), with the full trail reachable.
- **A section shorter than a page**: it still starts on a new page; a single-section report has no break.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Trail | US-040-AC1 | Drilled to Litigation › J. Chen | Render; choose "All practices" | 3 items, last `aria-current="page"`; top level shown |
| URL | US-040-AC2 | At "All practices" | Choose "Litigation"; reload; Back | URL has the level; reload shows Litigation; Back shows top |
| Compare | US-040-AC3 | 12,400 vs 13,480 | Render | "12,400", "13,480", "−1,080", "down 8%" in text |
| Print header | US-040-AC4 | Dark appearance | Emulate print in Chromium | Light tokens; title, logo, run date on page 1 |
| Print table | US-040-AC5 | 80-row table, 3 sections | Emulate print in Chromium | Header row repeats; break before sections 2 and 3; no nav or buttons |

## Dependencies

- **Stories**: US-024, US-028
- **Feature Spec**: FEAT-006
- **Feature Requirements**: DRILL-01, CMP-01, PRINT-01
- **PRD Requirements**: FR-25, FR-26
- **External**: CONTRACT-004 revision (drill-down, comparison and print slots); FEAT-004 widgets: breadcrumbs, DataTable

## Out of Scope

- Computing figures, breakdowns and differences (the app's; SCR-11).
- Generating PDF files on a server (the browser's print to PDF is used).
- Printing record details and forms.
