---
ddx:
  id: US-157
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-014
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: CONTRACT-004
---

# US-157: The modality is judged by what the app does, at the sizes it chose

**Feature**: FEAT-014
**Feature Requirements**: MOD-09; FEAT-018 GDL-83
**PRD Requirements**: FR-89
**Priority**: P1
**Status**: Draft

## Story

**As a** person whose app has one destination, or is used only on phones and desktops
**I want** the responsive-web verdict to check that the app fits and works at the sizes I chose, not that it uses a particular shell or covers sizes nobody uses
**So that** a simpler, better layout passes, and I am never pushed to add a size class to clear a warning

## Context

In the first guided session a single-destination app inherited an empty desktop navigation area and an empty phone strip; removing them failed the modality verdict though the full-width layout matched the approved design. The verdict also pushed adding the medium size class to clear a warning.

## Walkthrough

1. The blueprint names compact and expanded and one destination.
2. The audit runs at 390 and 1280 px only; the page is framed by a main landmark and fits: responsive-web passes, with no navigation to adapt.
3. A page whose content overflows at 390 px fails, saying so.

## Acceptance Criteria

- [ ] **US-157-AC1** — Given a page framed by a main landmark that fits, or an AppShell with no navigation, when the audit judges responsive-web, then it passes; where navigation exists it must still adapt by size class, and a blueprint with one top-level destination needs no navigation check.
- [ ] **US-157-AC2** — Given chosen size classes (the blueprint's `supports.sizeClasses`, else `--size-classes`), when the audit runs, then only their widths are audited, and a size class that was not chosen is never reported as unchecked.
- [ ] **US-157-AC3** — Given a failing responsive-web verdict, when it is reported, then it says which outcome failed (content overflowing at a width, navigation that exists but does not adapt), never that AppShell is missing when another frame passes, and that it is missing only when there is no AppShell and no main landmark.

## Edge Cases

- **A blueprint without modalities**: keeps the `--width` widths, as before
- **An unknown size class**: exits 2

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-157-AC1 | one destination, a main landmark, no navigation | audit | pass |
| AC2 | US-157-AC2 | compact and expanded chosen | audit | 390 and 1280 only; no medium warning |
| AC3 | US-157-AC3 | overflow at 390 | audit | fails naming it |

## Dependencies

- **Feature Spec**: FEAT-014
- **Feature Requirements**: MOD-09; FEAT-018 GDL-83
- **PRD Requirements**: FR-89
- **External**: CONTRACT-004

## Out of Scope

- Judging visual quality: only fit, frame and navigation behaviour.
