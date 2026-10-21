---
ddx:
  id: STP-069
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-069
    - kind: informed_by
      to: ADR-027
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-069-start-with-the-helix-documents-drafted

## Story Reference

**User Story**: [[US-069-start-with-the-helix-documents-drafted]] (Start with the HELIX documents drafted)
**Technical Design**: N/A (ADR-027 at this size)
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-069's criteria without touching GitHub: tests serve a release and a plugin package built from a fixture over local HTTP (`UX_BUILDER_HELIX_API`).
**Blocking Gate**: `npm test --workspace @ux-builder/create-app`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-069-AC1 | Given a created app, when `docs/helix/` is read, then it holds the product vision, PRD, concerns (and `concerns.local.yml`), FEAT-001, US-001, `02-design/DESIGN.md`, `03-test/test-plan.md` (TP-001) and an STP-001, each at its catalogue type's location and naming, with `ddx:` id, type, `status: draft` and links. | `us-069-ac1` | Nine documents at their locations, typed (given: Created app) | `@covers US-069-AC1` | Integration | `packages/create-app/test/helix-docs.test.mjs` | Local HELIX release server serving a built test package | |
| US-069-AC2 | Given the starter's own facts, when the documents are read, then the app's name and theme, the concerns (`react-vite` and `e2e-playwright` as recorded choices, `packaged-design-system`, `a11y-wcag-aa`, `ux-interaction-patterns`, the language runtime as an assumption), the starter screen's criteria in US-001, the theme and patterns in DESIGN.md and the checks in the test plans are filled in. | `us-069-ac2` | Name, theme, concerns, criteria, design, checks (given: Created app) | `@covers US-069-AC2` | Integration | `packages/create-app/test/helix-docs.test.mjs` | Local HELIX release server serving a built test package | |
| US-069-AC3 | Given the owner's decisions (purpose, users, goals, metrics, scope), when the documents are read, then each is still the template's placeholder; nothing the starter cannot know is written as fact. | `us-069-ac3` | Owner sections are template placeholders (given: Created app) | `@covers US-069-AC3` | Integration | `packages/create-app/test/helix-docs.test.mjs` | Local HELIX release server serving a built test package | |
| US-069-AC4 | Given a template that has gained, lost or renamed a heading, when the starter drafts from it, then filled sections go under their headings, unfilled ones keep the template's text, a missing heading is added at the end, and creation succeeds. | `us-069-ac4` | Merged; succeeds (given: Release with a changed template) | `@covers US-069-AC4` | Integration | `packages/create-app/test/helix-docs.test.mjs` | Local HELIX release server serving a built test package | |

## Executable Proof

```bash
npm test --workspace @ux-builder/create-app
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network
