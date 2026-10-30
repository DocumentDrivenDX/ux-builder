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
      to: ADR-042
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

A UX decision is a HELIX ADR tagged `area:ui` (ADR-042 decision 2), in HELIX's ADR shape: *Problem*, *Decision*, *Why We Chose This* with a subsection per alternative set aside, *Consequences*, *Assumptions* and *Validation*. `ux-builder-design decision add` proposes it, as every change to HELIX is proposed (ADR-030 decision 5); the person applies it with `ux-builder-design proposals`. Its *Validation* result is *not tested*, *tested* or *refuted*, with the evidence and the validation it requires.

## Walkthrough

1. The owner picks map first at checkpoint 2.
2. The agent runs `ux-builder-design decision add --question "What should users see first?" --alternative search-first --alternative map-first --alternative activity-first --choice map-first …`.
3. ADR-008 is proposed, tagged `area:ui`, its *Validation* *not tested* with "Comparative usability testing" required; the owner applies it.
4. After testing, `decision status ADR-008 tested --evidence docs/helix/01-frame/research/first-screen.md` proposes the new result.

## Acceptance Criteria

- [ ] **US-131-AC1** — Given the question, at least two alternatives, the choice, the rationale, the assumptions and the required validation, when `ux-builder-design decision add` runs, then it proposes `docs/helix/02-design/adr/ADR-<nnn>-<slug>.md` with the next free ADR number (counting proposed ones), tagged `area:ui`, every field, and *Validation* *not tested*; nothing is written under `docs/helix/`.
- [ ] **US-131-AC2** — Given `decision add` with fewer than two alternatives or a choice not among them, when it runs, then it exits 2 (bad input, CONTRACT-008) naming the problem and writes nothing.
- [ ] **US-131-AC3** — Given ADR-008, when `ux-builder-design decision status ADR-008 refuted --evidence <where>` runs, then it proposes the *Validation* result `refuted` with the evidence and date, and its history keeps the earlier result.
- [ ] **US-131-AC4** — Given the proposal accepted, when `ux-builder-design proposals apply --accepted <id>` applies it, then the ADR is written with HELIX's required ADR sections (*Problem*, *Decision*, *Why We Chose This*, *Consequences*); given no HELIX, `decision add` exits 2 saying to frame HELIX first.
- [ ] **US-131-AC5** — Given a decision added, when the episode trace is read, then a `decision` event records it with the ADR ID.

## Edge Cases

- **No HELIX marker**: there is no ADR to propose; `decision add` exits 2 and says to run HELIX's frame first.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-131-AC1 | the question, at least two alternatives, the choice, the rationale, the assumptions and the required validation | `ux-builder-design decision add` runs | it proposes `docs/helix/02-design/adr/ADR-<nnn>-<slug>.md`, next free number, tagged `area:ui`, every field, *Validation* *not tested*; nothing under `docs/helix/` |
| AC2 | US-131-AC2 | `decision add` with fewer than two alternatives or a choice not among them | it runs | it exits 2 (bad input, CONTRACT-008) naming the problem and writes nothing |
| AC3 | US-131-AC3 | ADR-008 | `decision status ADR-008 refuted --evidence <where>` runs | it proposes *Validation* `refuted` with the evidence and date; the history keeps the earlier result |
| AC4 | US-131-AC4 | the proposal accepted; or no HELIX | it is applied; or `decision add` runs | the ADR has HELIX's required sections; or it exits 2 saying to frame HELIX first |
| AC5 | US-131-AC5 | a decision added | the episode trace is read | a `decision` event records it with the ADR ID |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-31
- **PRD Requirements**: FR-83
- **External**: ADR-036, ADR-042, CONTRACT-008, SD-006

## Out of Scope

- Validating the ADR's content: HELIX's validate does it (ADR-042 decision 4).
