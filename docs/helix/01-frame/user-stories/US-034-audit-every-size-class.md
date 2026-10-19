---
ddx:
  id: US-034
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-004
    - kind: informed_by
      to: ADR-020
    - kind: informed_by
      to: ADR-021
    - kind: informed_by
      to: US-022
---

# US-034: Audit every size class

**Feature**: FEAT-004 — App SDK
**Feature Requirements**: SDK-20
**PRD Requirements**: FR-17, FR-26
**Priority**: P1
**Status**: Draft

## Story

**As a** tech lead of an app built on the SDK (or the design-system team reviewing one)
**I want** the audit to check my pages at a phone, tablet and desktop width, including reflow, target size and focus hidden behind sticky bars
**So that** a screen that works at 1366 px but breaks on a phone is caught in CI, not by a user

## Context

Requested by the operator on 2026-10-19 ("do all P1 and P2 screen
patterns"), admitted ahead of consumer evidence by operator decision
(FEAT-006 "Extended screens"). Screen patterns adapt to their container by
size class (ADR-021: compact below 600 px, medium 600–839 px, expanded from
840 px), and FR-26 asks that every pattern work from 320 px. The audit
(US-022) checks one viewport only, so a pattern's compact layout is never
audited. SDK-20 adds widths and three checks drawn from WCAG 2.2: 1.4.10
Reflow, 2.5.8 Target Size (Minimum) and 2.4.11 Focus Not Obscured
(Minimum). Builder previews (US-032) render several options on one page, so
a finding must say which preview it came from.

## Walkthrough

1. In CI: `npx ux-builder-audit --width 320 --width 720 --width 1366 http://localhost:4173/patterns/`.
2. The audit runs every theme and appearance at each of the three widths:
   for two themes, twelve runs.
3. At 320 px a filter bar is 340 px wide and the page scrolls sideways; the
   audit reports `reflow` with the element.
4. A 20 px icon button in a toolbar is reported as `target-size`.
5. Tabbing to the last field of a long form leaves it under the sticky
   action bar; the audit reports `focus-obscured`.
6. On the builder's screens preview, a finding inside the "Carbon, option
   2" preview names that preview.
7. The report lists each run with its width. The three new checks show as
   warnings this release, so CI stays green while the team fixes them.

## Acceptance Criteria

- [ ] **US-034-AC1** — Given the audit run with `--width` given twice, when it runs, then it audits every theme and appearance at each width, so the number of runs is themes × appearances × widths.
- [ ] **US-034-AC2** — Given an audit at several widths, when it finishes, then each run in the JSON and HTML reports records the width it ran at, and each finding names its run's width.
- [ ] **US-034-AC3** — Given a page whose content is wider than a 320 px viewport, when the audit runs at 320 px, then it reports a `reflow` finding naming the widest element; a region that scrolls inside itself while the page does not is not reported (WCAG 1.4.10).
- [ ] **US-034-AC4** — Given a pointer target smaller than the theme's minimum target size, when the audit runs, then it reports a `target-size` finding with the element and its measured size; a target at or above the minimum is not reported (WCAG 2.5.8).
- [ ] **US-034-AC5** — Given a focusable element that, when focused, is entirely covered by sticky or fixed content, when the audit moves focus to it, then it reports a `focus-obscured` finding naming the element and the content covering it (WCAG 2.4.11).
- [ ] **US-034-AC6** — Given a finding on an element inside an element marked as a builder preview, when the report is written, then the finding names that preview's option and design system.
- [ ] **US-034-AC7** — Given a page whose only findings are `reflow`, `target-size` or `focus-obscured`, when the audit runs with its default failure level, then they are reported as warnings and it exits 0; this applies for one minor release after the checks are added.

## Edge Cases

- **A width given once**: the audit runs at that width only.
- **A chart or third-party embed**: `data-audit-ignore` excludes it from the new checks as from the others.
- **A focused element only partly covered**: not reported; 2.4.11 asks only that it is not entirely hidden.
- **Inline links in a sentence**: exempt from `target-size`, as WCAG 2.5.8 allows.
- **A finding outside any preview**: it carries no preview attribution.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Widths | US-034-AC1 | 2 themes, light and dark | `--width 390 --width 1024` | 8 runs |
| Width recorded | US-034-AC2 | Same | Read `report.json`, `index.html` | Each run and finding shows 390 or 1024 |
| Reflow | US-034-AC3 | 340 px filter bar; a table scrolling in its own region | Audit at 320 | `reflow` on the filter bar; none for the table |
| Target | US-034-AC4 | 20 px icon button; 44 px button | Audit | `target-size` on the 20 px button only |
| Obscured | US-034-AC5 | Last field under a sticky bar | Audit tabs to it | `focus-obscured` naming the field and the bar |
| Preview | US-034-AC6 | Finding inside the "Carbon, option 2" preview | Audit | Finding names option 2 and Carbon |
| Warning | US-034-AC7 | Page with only the 3 new findings | Audit, default level | 3 warnings; exit 0 |

## Dependencies

- **Stories**: US-022, US-032
- **Feature Spec**: FEAT-004
- **Feature Requirements**: SDK-20
- **PRD Requirements**: FR-17, FR-26
- **External**: CONTRACT-004 revision (the width option, check names, report fields, preview attribution)

## Out of Scope

- Checking every pixel width between size classes (the audit checks the widths given).
- Touch emulation and device frames.
- Checks for WCAG 2.4.12 Focus Not Obscured (Enhanced) or 2.5.5 Target Size (Enhanced).
