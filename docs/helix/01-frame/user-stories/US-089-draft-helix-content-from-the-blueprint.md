---
ddx:
  id: US-089
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-012
    - kind: informed_by
      to: ADR-030
    - kind: informed_by
      to: FEAT-010
    - kind: informed_by
      to: FEAT-009
---

# US-089: Draft HELIX content from the blueprint as proposals

**Feature**: FEAT-012 — Screen flows and user journeys in the blueprint
**Feature Requirements**: DRF-01, DRF-02
**PRD Requirements**: FR-56
**Priority**: P2
**Status**: Draft

## Story

**As an** app developer (PRD primary persona) keeping the HELIX documents current
**I want** the SDK to draft walkthroughs, flow diagrams, the navigation table and test scenarios from the blueprint, as proposals
**So that** the flow is documented where HELIX expects it, without anyone writing diagrams by hand, and nothing changes without my say-so

## Context

HELIX has no flow artifact. Its 02-design guide places flow rationale in the solution or technical design, architecture's *Data Flow* holds one sequence diagram, `DESIGN.md` holds navigation conventions, stories hold walkthroughs, and story test plans hold scenarios. `ux-builder-blueprint propose` drafts each as a patch beside the document, from the installed HELIX's templates, like FEAT-009's proposals; a person applies them. HELIX stays the authority (ADR-030).

## Walkthrough

1. The developer runs `ux-builder-blueprint propose`.
2. It writes patches: US-012's walkthrough, a Mermaid flowchart for the solution design, a sequence diagram for architecture's *Data Flow*, the navigation table for `DESIGN.md`, and scenarios for STP-012.
3. Where US-012's walkthrough already says something different, it writes no patch for that section and reports the disagreement.
4. The developer applies two patches and discards the rest.

## Acceptance Criteria

Field names, rule IDs and commands are proposals in CONTRACT-005 *Flows and
journeys* and FEAT-012; the criteria name them so tests can cite them.

- [ ] **US-089-AC1** — Given a blueprint journey for a story, when `propose` runs, then it writes a patch for that story's *Walkthrough* with one numbered step per journey step, and applies nothing.
- [ ] **US-089-AC2** — Given a blueprint with actions, when `propose` runs, then it writes a patch adding a Mermaid flowchart of the flow to the governing solution design, and a sequence diagram of the primary journey to architecture's *Data Flow*.
- [ ] **US-089-AC3** — Given destinations by size class, when `propose` runs, then it writes a patch for `DESIGN.md`'s navigation table.
- [ ] **US-089-AC4** — Given journey steps and alternates, when `propose` runs, then it writes a patch of story test plan scenarios, one per step and alternate, citing the criteria.
- [ ] **US-089-AC5** — Given a HELIX section that already differs from the blueprint, when `propose` runs, then no patch touches that section and the disagreement is reported with both texts.
- [ ] **US-089-AC6** — Given the same blueprint and HELIX documents, when `propose` runs twice, then the patches are identical.

## Edge Cases

- **A template section missing in the installed HELIX**: the draft goes to the end under its own heading, and the problem is printed (FEAT-010 HLA-03).
- **No HELIX marker**: `propose` refuses, naming the marker.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-089-AC1 | a blueprint journey for a story | `propose` runs | it writes a patch for that story's *Walkthrough* with one numbered step per journey step, and applies nothing |
| AC2 | US-089-AC2 | a blueprint with actions | `propose` runs | it writes a patch adding a Mermaid flowchart of the flow to the governing solution design, and a sequence diagram of the primary journey to architecture's *Data Flow* |
| AC3 | US-089-AC3 | destinations by size class | `propose` runs | it writes a patch for `DESIGN.md`'s navigation table |
| AC4 | US-089-AC4 | journey steps and alternates | `propose` runs | it writes a patch of story test plan scenarios, one per step and alternate, citing the criteria |
| AC5 | US-089-AC5 | a HELIX section that already differs from the blueprint | `propose` runs | no patch touches that section and the disagreement is reported with both texts |
| AC6 | US-089-AC6 | the same blueprint and HELIX documents | `propose` runs twice | the patches are identical |

## Dependencies

- **Stories**: US-086
- **Feature Spec**: FEAT-012
- **Feature Requirements**: DRF-01, DRF-02
- **PRD Requirements**: FR-56
- **External**: CONTRACT-005 *Flows and journeys*

## Out of Scope

- Applying patches.
