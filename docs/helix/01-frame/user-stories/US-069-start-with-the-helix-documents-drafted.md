---
ddx:
  id: US-069
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-010
    - kind: informed_by
      to: ADR-027
---

# US-069: Start with the HELIX documents drafted

**Feature**: FEAT-010 — A new app starts on HELIX
**Feature Requirements**: HLA-01, HLA-02, HLA-03
**PRD Requirements**: FR-44
**Priority**: P1
**Status**: Draft

## Story

**As a** product owner of a new app
**I want** the HELIX documents my app needs drafted, with what the starter knows filled in
**So that** I start by deciding what matters, not by copying templates

## Context

ADR-027 decisions 5 and 6. Documents come from the installed HELIX's templates, so they follow that version.

## Walkthrough

1. `docs/helix/` has the vision, PRD, concerns, FEAT-001, US-001, DESIGN.md, the test plan and STP-001.
2. The owner fills the placeholders; the agent frames the next feature with `/helix frame`.

## Acceptance Criteria

- [ ] **US-069-AC1** — Given a created app, when `docs/helix/` is read, then it holds the product vision, PRD, concerns (and `concerns.local.yml`), FEAT-001, US-001, `02-design/DESIGN.md`, `03-test/test-plan.md` (TP-001) and an STP-001, each at its catalogue type's location and naming, with `ddx:` id, type, `status: draft` and links.
- [ ] **US-069-AC2** — Given the starter's own facts, when the documents are read, then the app's name and theme, the concerns (`react-vite` and `e2e-playwright` as recorded choices, `packaged-design-system`, `a11y-wcag-aa`, `ux-interaction-patterns`, the language runtime as an assumption), the starter screen's criteria in US-001, the theme and patterns in DESIGN.md and the checks in the test plans are filled in.
- [ ] **US-069-AC3** — Given the owner's decisions (purpose, users, goals, metrics, scope), when the documents are read, then each is still the template's placeholder; nothing the starter cannot know is written as fact.
- [ ] **US-069-AC4** — Given a template that has gained, lost or renamed a heading, when the starter drafts from it, then filled sections go under their headings, unfilled ones keep the template's text, a missing heading is added at the end, and creation succeeds.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Set | US-069-AC1 | Created app | list docs | Nine documents at their locations, typed |
| Prefilled | US-069-AC2 | Created app | read | Name, theme, concerns, criteria, design, checks |
| Placeholders | US-069-AC3 | Created app | read vision/PRD | Owner sections are template placeholders |
| Template drift | US-069-AC4 | Release with a changed template | create | Merged; succeeds |

## Dependencies

- **Feature Spec**: FEAT-010
- **Feature Requirements**: HLA-01, HLA-02, HLA-03
- **PRD Requirements**: FR-44

## Out of Scope

- See FEAT-010 "Out of Scope".
