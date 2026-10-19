---
ddx:
  id: US-028
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

# US-028: Read a dashboard and a report

**Feature**: FEAT-006 — Screen patterns
**Feature Requirements**: SCR-08, SCR-09, REG-06, REG-07
**PRD Requirements**: FR-25, FR-26
**Priority**: P0
**Status**: Draft

## Story

**As an** end user of an app built on the SDK
**I want** dashboards and reports whose numbers, charts and parameters I can read on a laptop or a phone, with a screen reader if I use one
**So that** I understand where the work stands and can export or print what I need

## Context

Requested by the operator on 2026-10-18; implements FEAT-006's dashboard
and report viewer and their number tile and chart container regions under
ADR-020 and ADR-021. Charts in today's apps state change by colour alone
and offer no table alternative, failing WCAG 1.1.1 and 1.4.1. The app
supplies the values, series and parameters; the chart library is a
technical-design choice, so these criteria test the container around it.

## Walkthrough

1. The user opens "Billing overview" at 1366 px: page-wide filters, a date
   range "1–30 Sep", "Last refreshed 09:42", and four number tiles above
   two charts in a four-column grid.
2. A tile reads "Unbilled time £412k, up 8% on August".
3. They move to a chart by keyboard and open its data-table alternative.
4. On a phone the grid is one column with tiles two-up; chart legends sit
   below the chart.
5. They open "Aged debt" in the report viewer, set parameters in a side
   panel, run it and see a table with a summary of the applied parameters
   above it; they export and print.

## Acceptance Criteria

- [ ] **US-028-AC1** — Given a dashboard with tiles and charts, when its container is 390, 720 and 1366 px wide, then the grid shows one, two and three or four columns respectively, with tiles two-up at compact size.
- [ ] **US-028-AC2** — Given a dashboard, when it renders, then the page-wide filters, the date range and the last-refreshed time are shown above the grid.
- [ ] **US-028-AC3** — Given a number tile with a change, when it renders, then the value, label and the change's direction are stated in text, not by colour or icon alone (WCAG 1.4.1).
- [ ] **US-028-AC4** — Given a chart container, when a keyboard or screen-reader user reaches it, then it has a title and legend and offers a data-table alternative containing the same values.
- [ ] **US-028-AC5** — Given a chart container with no data, loading, or a failed load, when it renders, then it shows the matching state in the chart's space, error offers retry, and the rest of the dashboard stays usable.
- [ ] **US-028-AC6** — Given a report run with parameters, when results show, then a summary of the applied parameters is visible above the results at every size class; the parameter panel is a side panel at expanded size and above, collapsible at medium, and a sheet at compact.
- [ ] **US-028-AC7** — Given report results, when the user exports or prints, then both actions are available, and the printed page omits navigation and actions and repeats table headers on each page.

## Edge Cases

- **Very wide report table on a phone**: the table scrolls horizontally inside its own region; the page does not.
- **Negative change or zero change**: text says "down" or "no change"; colour is supplementary.
- **Stale data**: the last-refreshed time is the app's value; the pattern shows it unchanged.
- **Reduced chart detail at compact size**: fewer axis ticks and the legend below, with all values still in the data table.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Grid by size | US-028-AC1 | 4 tiles, 2 charts | Render at 390, 720, 1366 | 1 col (tiles 2-up), 2 cols, 4 cols |
| Context | US-028-AC2 | Filters, "1–30 Sep", "09:42" | Render | All three above grid |
| Tile text | US-028-AC3 | £412k, +8% | Render; read accessible name | "up 8%" in text |
| Table alternative | US-028-AC4 | 12-month series | Tab to chart; open table | Title, legend, 12 rows matching |
| Chart states | US-028-AC5 | Empty, loading, 500 | Render | Panels in place; retry; filters usable |
| Parameters | US-028-AC6 | "Region: London, As at: 30 Sep" | Run at 390, 720, 1366 | Summary above results; sheet, collapsible, side |
| Print | US-028-AC7 | 80-row table | Print emulation | No nav or actions; header on each page |

## Dependencies

- **Stories**: US-023
- **Feature Spec**: FEAT-006
- **Feature Requirements**: SCR-08, SCR-09, REG-06, REG-07
- **PRD Requirements**: FR-25, FR-26
- **External**: CONTRACT-004 revision (dashboard and report slots); FEAT-002 (categorical chart palette per theme); FEAT-004 widgets: date-range picker, drawer/sheet

## Out of Scope

- The chart rendering library (technical design).
- Drill-down, pivot and report builder (P1/P2).
- Producing export files (the app's).
