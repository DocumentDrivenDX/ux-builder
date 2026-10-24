---
ddx:
  id: US-135
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-037
    - kind: informed_by
      to: ADR-036
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: SD-006
---

# US-135: Try exploratory prototypes of each alternative

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-40 to GDL-43
**PRD Requirements**: FR-85
**Priority**: P1
**Status**: Draft

## Story

**As a** product owner or designer working with the guide
**I want** a clickable prototype of each alternative flow that I can try before anything is built in the app
**So that** I choose between alternatives by using them rather than reading diagrams

## Context

ADR-037 allows generated exploratory prototypes outside the app's source; ADR-025 decision 3 still holds for app code. `ux-builder-blueprint prototype --explore` writes `prototype/<alternative>/` from a blueprint alternative (CONTRACT-008).

## Walkthrough

1. The guide has two alternatives, `map-first` and `search-first`, both passing `blueprint check`.
2. It runs `ux-builder-blueprint prototype --explore --alternative map-first --alternative search-first`.
3. The owner opens each prototype, clicks through the journeys, switches states and size classes, and tells the guide what they noticed.
4. The guide records the notes as design-team observations and archives the prototype once the question is answered.

## Acceptance Criteria

- [ ] **US-135-AC1** — Given a blueprint alternative that passes `blueprint check`, when `ux-builder-blueprint prototype --explore --alternative <name>` runs, then it writes `prototype/<name>/` with one page per screen rendering that screen's pattern with placeholder content, and every action links to its `to`.
- [ ] **US-135-AC2** — Given a generated prototype page, when it is read, then it shows a switcher for each declared state and supported size class, a prototype banner, and the design question the alternative answers.
- [ ] **US-135-AC3** — Given `--design-system` given twice for the same alternative, when `prototype --explore` runs, then it writes one prototype per design system for the same flow, each named by its design system.
- [ ] **US-135-AC4** — Given an app source file that imports from `prototype/`, when lint runs with `ux-builder/no-prototype-import`, then it reports an error naming the import.
- [ ] **US-135-AC5** — Given notes the person gives after trying a prototype, when the guide records them with `ux-builder-design state set`, then the design state stores them as observations with `source: design-team`, never as user evidence.
- [ ] **US-135-AC6** — Given an alternative whose blueprint has a check error, when `prototype --explore` runs, then it exits 1 naming the findings and writes nothing.

## Edge Cases

- **A pattern the catalogue lacks**: the page shows a labelled box, as `blueprint wireframes` does.
- **An answered question**: `prototype --explore --archive <name>` moves the folder under `prototype/.archive/`.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-135-AC1 | a blueprint alternative that passes `blueprint check` | `ux-builder-blueprint prototype --explore --alternative <name>` runs | it writes `prototype/<name>/` with one page per screen rendering that screen's pattern with placeholder content, and every action links to its `to` |
| AC2 | US-135-AC2 | a generated prototype page | it is read | it shows a switcher for each declared state and supported size class, a prototype banner, and the design question the alternative answers |
| AC3 | US-135-AC3 | `--design-system` given twice for the same alternative | `prototype --explore` runs | it writes one prototype per design system for the same flow, each named by its design system |
| AC4 | US-135-AC4 | an app source file that imports from `prototype/` | lint runs with `ux-builder/no-prototype-import` | it reports an error naming the import |
| AC5 | US-135-AC5 | notes the person gives after trying a prototype | the guide records them with `ux-builder-design state set` | the design state stores them as observations with `source: design-team`, never as user evidence |
| AC6 | US-135-AC6 | an alternative whose blueprint has a check error | `prototype --explore` runs | it exits 1 naming the findings and writes nothing |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-40 to GDL-43
- **PRD Requirements**: FR-85
- **External**: ADR-037, CONTRACT-008, SD-006

## Out of Scope

- Real data or a backend in exploratory prototypes.
- Visual design above wireframe fidelity.
