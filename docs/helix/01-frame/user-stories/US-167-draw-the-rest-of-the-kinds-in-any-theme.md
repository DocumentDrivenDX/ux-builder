---
ddx:
  id: US-167
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-019
    - kind: informed_by
      to: CONTRACT-009
    - kind: informed_by
      to: FEAT-017
---

# US-167: Draw the rest of the kinds in any theme

**Feature**: FEAT-019 — Visuals renderer
**Feature Requirements**: KND-01 to KND-06
**PRD Requirements**: FR-95
**Priority**: P1
**Status**: Draft

## Story

**As a** producer of documentation (HELIX's documentor, an agent writing a status report or an ADR)
**I want** stacks, nested containers, timelines, comparisons and metrics drawn by the same package and checked to the same bar as the graph kinds
**So that** every picture on a page looks like one family, in the page's theme, whatever question it answers

## Context

M3 drew the graph kinds. The visuals PRD's other questions ("When does what happen?", "Which
option, and why?", "Is this number good?", "Where does each piece sit?") need the remaining kinds.
Their acceptance set is umf's example documents and the visuals inventory: two stacks, one nested
estate, an ADR's options matrix, a quadrant, a before-and-after, three timelines and four metrics.

## Walkthrough

1. A producer renders an ADR's options (`comparison/matrix`), a release history
   (`timeline/milestones`) and a coverage figure (`metric/stat`) in the site's theme.
2. Each draws with the theme's roles, passes its checks and carries a text equivalent.
3. The Markdown record gets each one's Mermaid form, or a table where Mermaid has none.
4. On a phone, the milestones become a vertical history.

## Acceptance Criteria

- [ ] **US-167-AC1** — Given every `structure/stack`, `structure/nested`, `timeline`, `comparison` and `metric` document in umf's fixtures and the visuals inventory, when each is rendered in every theme and appearance, then it renders with no check failure and the same bytes on a second render.
- [ ] **US-167-AC2** — Given a comparison matrix with ratings and a chosen item, when it renders, then each rating is a row of filled and empty circles out of its scale with its words beside it (umf ratings are whole numbers), a partial support is a half circle with its word, and the chosen item's column is marked in the accent with its reason beneath.
- [ ] **US-167-AC3** — Given a metric with several series and a good direction, when it renders, then the series take the series colours in order, the change is drawn with an arrow or sign as well as a status colour, and every number carries its unit.
- [ ] **US-167-AC4** — Given a roadmap and a milestones timeline, when each is emitted as Mermaid, then the roadmap is a `gantt` and the milestones a `timeline`; given a stack, nested, comparison or metric document, then the portable form is a Markdown table.
- [ ] **US-167-AC5** — Given a comparison or metric document, when it renders, then its text equivalent is a table holding every value drawn.
- [ ] **US-167-AC6** — Given a milestones or roadmap timeline and a width below its form's minimum, when it renders, then it is drawn as a history and the render warns.

## Edge Cases

- **A timeline with one event**: one tick, no span; still checked.
- **A metric with no target**: no threshold line; the stat shows its change only.
- **A matrix rating outside its closed scale**: refused by validation, as umf refuses it.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-167-AC1 | every remaining-kind fixture | render in every theme and appearance, twice | no check failure; same bytes |
| AC2 | US-167-AC2 | `layout-engines` drawn as a matrix; `visuals-before-after` | render | rating circles and words; a half circle for "Partly"; accent rule and reason on the chosen item |
| AC3 | US-167-AC3 | `umf-ac-trend`, `umf-ac-satisfied` | render | series colours in order; arrow or sign; units |
| AC4 | US-167-AC4 | `visuals-roadmap`, `umf-releases`, a stack | emit Mermaid | `gantt`, `timeline`, Markdown table |
| AC5 | US-167-AC5 | `helix-adr-options`, `umf-ac-status` | render | a table with every value |
| AC6 | US-167-AC6 | `umf-releases` at 390 px | render | history; a warning |

## Dependencies

- **Feature Spec**: FEAT-019
- **Feature Requirements**: KND-01 to KND-06
- **PRD Requirements**: FR-95
- **External**: umf's `umf.visual` 1.0.0 (CONTRACT-083); FEAT-017's tokens

## Out of Scope

- Live data and interactive charts; a metric is a snapshot.
