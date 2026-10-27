---
ddx:
  id: US-156
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: CONTRACT-004
---

# US-156: HELIX proposals applied by the tools, starter documents kept apart

**Feature**: FEAT-018
**Feature Requirements**: GDL-83
**PRD Requirements**: FR-89
**Priority**: P1
**Status**: Draft

## Story

**As a** person designing an app with the guide
**I want** to approve HELIX changes and have the tools apply them, and the app built from my design not to add starter documents that clash with mine
**So that** I never copy files, repair IDs or delete conflicting documents by hand

## Context

In the first guided session the person ran terminal commands to copy proposed HELIX documents, repair story metadata and remove conflicting starter documents: the build in place had added FEAT-001, US-001 and STP-001 beside the designed documents using those IDs.

## Walkthrough

1. `proposals preview` lists five proposals in one line each; a new FEAT-001 is flagged: it becomes FEAT-002.
2. The person accepts three; `proposals apply --accepted` writes them, renumbers the feature and rewrites the story's link to it; the other two stay pending.
3. The app is built in place; the design's FEAT-001 and US-001 stand alone, and the result says the starter's were skipped.

## Acceptance Criteria

- [ ] **US-156-AC1** — Given pending proposals from `ux-builder-blueprint propose`, when `ux-builder-design proposals preview` runs, then it lists each in one line (what it creates or changes), flags a new document whose ID HELIX already uses with the ID it will get, flags a patch that no longer applies, and writes nothing.
- [ ] **US-156-AC2** — Given accepted and unaccepted proposals, when `proposals apply --accepted <ids>` runs, then it writes only the accepted ones, renumbers a new document whose `ddx.id` another document holds (file renamed, references in the accepted set rewritten), moves them to `applied/` and leaves the rest pending; a patch that no longer applies or malformed frontmatter writes nothing at all.
- [ ] **US-156-AC3** — Given a design folder whose HELIX has FEAT-001 and US-001 under its own file names, when the app is built in place, then no second FEAT-001, US-001 or STP-001 is written (a starter document is skipped when the design has its ID, its type or its path), and the result lists each skipped document and why.

## Edge Cases

- **A patch that must follow one not accepted**: is refused with the reason
- **A clashing ID with no number**: is reported as a problem, not renumbered

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-156-AC1 | five proposals, one clashing | `proposals preview` | five lines; clash flagged; nothing written |
| AC2 | US-156-AC2 | three accepted of five | `proposals apply` | three written, renumbered; two pending; a stale one writes nothing |
| AC3 | US-156-AC3 | a design with FEAT-001, US-001 | build in place | no starter duplicates; skipped listed |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-83
- **PRD Requirements**: FR-89
- **External**: CONTRACT-008, CONTRACT-004

## Out of Scope

- Applying proposals written by hand outside `propose`'s format.
