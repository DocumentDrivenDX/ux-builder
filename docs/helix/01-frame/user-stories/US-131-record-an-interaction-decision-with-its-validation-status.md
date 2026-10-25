---
ddx:
  id: US-131
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-036
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: SD-006
---

# US-131: Record an interaction decision with its validation status

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-31
**PRD Requirements**: FR-83
**Priority**: P1
**Status**: Draft

## Story

**As a** designer or developer using the guide (PRD primary persona)
**I want** every major UX decision recorded with its alternatives, rationale, assumptions and whether it has been tested
**So that** later changes don't undo a decision nobody remembers, and untested decisions stay visible

## Context

In stage 1 a decision is `docs/ux-builder/decisions/UXD-<n>.md`, written by `ux-builder-design decision add` from the interaction decision record template. Its validation status is `not-tested`, `tested` or `refuted`, with the validation it requires. In stage 2 it maps to a HELIX ADR or *Solution Approaches* (H-3).

## Walkthrough

1. The owner picks map first at checkpoint 2.
2. The agent runs `ux-builder-design decision add --question "What should users see first?" --alternative search-first --alternative map-first --alternative activity-first --choice map-first …`.
3. UXD-1 is written with status `not-tested` and "Comparative usability testing" as its required validation.
4. After testing, `decision status UXD-1 tested` updates it.

## Acceptance Criteria

- [ ] **US-131-AC1** — Given the question, at least two alternatives, the choice, the rationale, the assumptions and the required validation, when `ux-builder-design decision add` runs, then it writes `docs/ux-builder/decisions/UXD-<n>.md` with the next free number, every field, and status `not-tested`.
- [ ] **US-131-AC2** — Given `decision add` with fewer than two alternatives or a choice not among them, when it runs, then it exits 2 (bad input, CONTRACT-008) naming the problem and writes nothing.
- [ ] **US-131-AC3** — Given UXD-1, when `ux-builder-design decision status UXD-1 refuted --evidence UER-1` runs, then the record's status becomes `refuted` with the evidence ID and date, and its history keeps the earlier status.
- [ ] **US-131-AC4** — Given a decision record, when `ux-builder-design validate` runs, then it checks the frontmatter links to the HELIX documents it relates to and that the status is one of the three values.
- [ ] **US-131-AC5** — Given a decision added, when the episode trace is read, then a `decision` event records it with the UXD ID.

## Edge Cases

- **No HELIX marker**: the record links only `docs/ux-builder/` documents.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-131-AC1 | the question, at least two alternatives, the choice, the rationale, the assumptions and the required validation | `ux-builder-design decision add` runs | it writes `docs/ux-builder/decisions/UXD-<n>.md` with the next free number, every field, and status `not-tested` |
| AC2 | US-131-AC2 | `decision add` with fewer than two alternatives or a choice not among them | it runs | it exits 2 (bad input, CONTRACT-008) naming the problem and writes nothing |
| AC3 | US-131-AC3 | UXD-1 | `ux-builder-design decision status UXD-1 refuted --evidence UER-1` runs | the record's status becomes `refuted` with the evidence ID and date, and its history keeps the earlier status |
| AC4 | US-131-AC4 | a decision record | `ux-builder-design validate` runs | it checks the frontmatter links to the HELIX documents it relates to and that the status is one of the three values |
| AC5 | US-131-AC5 | a decision added | the episode trace is read | a `decision` event records it with the UXD ID |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-31
- **PRD Requirements**: FR-83
- **External**: ADR-036, CONTRACT-008, SD-006

## Out of Scope

- Writing the decision into a HELIX ADR (stage 2).
