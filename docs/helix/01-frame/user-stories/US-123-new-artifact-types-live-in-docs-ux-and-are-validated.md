---
ddx:
  id: US-123
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-036
    - kind: informed_by
      to: CONTRACT-008
---

# US-123: New artifact types live in docs/ux-builder and are validated

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-76
**PRD Requirements**: FR-80
**Priority**: P1
**Status**: Draft

## Story

**As a** maintainer of an app's documents
**I want** the guide's new document types kept apart from HELIX's, with templates I can read and a check that they are well formed
**So that** HELIX's validators are not disturbed and stage 2 can move them later

## Context

Stage 1 homes (ADR-036): each type's `meta.yml`, `template.md`, `prompt.md` and `example.md` live in the package under `artifacts/<type>/`; documents live in `docs/ux-builder/` with frontmatter links to HELIX documents.

## Walkthrough

1. The guide compiles `docs/ux-builder/brief.md` from HELIX, the one document type of its own left (ADR-042).
2. `ux-builder-design validate` checks every `docs/ux-builder/` document.
3. `status` lists them.

## Acceptance Criteria

- [ ] **US-123-AC1** — Given the package, when `artifacts/` is listed, then every type CONTRACT-008 names has `meta.yml`, `template.md`, `prompt.md` and `example.md`, and each `meta.yml` names its ID prefix and output path.
- [ ] **US-123-AC2** — Given each type's `example.md`, when `validate` runs on it, then it passes.
- [ ] **US-123-AC3** — Given a `docs/ux-builder/` document with a missing frontmatter field, a wrong ID format or a link to a HELIX ID that does not exist, when `validate` runs, then it exits 1 naming the file and the problem.
- [ ] **US-123-AC4** — Given the guide's commands that write documents, when each runs on a fixture app, then none writes under `docs/helix/`.
- [ ] **US-123-AC5** — Given an app with documents of several types, when `status --json` runs, then it lists each document with its type, ID and path.

## Edge Cases

- **HELIX later defines a type**: stage 2 maps it; until then `docs/ux-builder/` stays the home.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-123-AC1 | the package | `artifacts/` is listed | every type CONTRACT-008 names has `meta.yml`, `template.md`, `prompt.md` and `example.md`, and each `meta.yml` names its ID prefix and output path |
| AC2 | US-123-AC2 | each type's `example.md` | `validate` runs on it | it passes |
| AC3 | US-123-AC3 | a `docs/ux-builder/` document with a missing frontmatter field, a wrong ID format or a link to a HELIX ID that does not exist | `validate` runs | it exits 1 naming the file and the problem |
| AC4 | US-123-AC4 | the guide's commands that write documents | each runs on a fixture app | none writes under `docs/helix/` |
| AC5 | US-123-AC5 | an app with documents of several types | `status --json` runs | it lists each document with its type, ID and path |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-76
- **PRD Requirements**: FR-80
- **External**: ADR-036, CONTRACT-008

## Out of Scope

- Stage 2's mapping into HELIX.
