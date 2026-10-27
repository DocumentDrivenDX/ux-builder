---
ddx:
  id: STP-156
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-156
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-156-helix-proposals-applied-by-the-tools-starter-documents-kept-apart

## Story Reference

**User Story**: [[US-156-helix-proposals-applied-by-the-tools-starter-documents-kept-apart]]
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-156's criteria with fixtures only: no network, no model, no browser.
**Blocking Gate**: `npm test --workspace @ux-builder/design`, `npm test --workspace @ux-builder/create-app`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-156-AC1 | Given pending proposals from `ux-builder-blueprint propose`, when `ux-builder-design proposals preview` runs, then it lists each in one line (what it creates or changes), flags a new document whose ID HELIX already uses with the ID it will get, flags a patch that no longer applies, and writes nothing. | `us-156-ac1` | It lists each in one line (what it creates or changes), flags a new document whose ID HELIX already uses with the ID it will get, flags a patch that no longer applies, and writes nothing | `@covers US-156-AC1` | Integration | `packages/design/test/proposals.test.mjs` | Fixture apps and HELIX repos in temp folders, real `propose` output; no network, no model | Built |
| US-156-AC2 | Given accepted and unaccepted proposals, when `proposals apply --accepted <ids>` runs, then it writes only the accepted ones, renumbers a new document whose `ddx.id` another document holds (file renamed, references in the accepted set rewritten), moves them to `applied/` and leaves the rest pending; a patch that no longer applies or malformed frontmatter writes nothing at all. | `us-156-ac2` | It writes only the accepted ones, renumbers a new document whose `ddx.id` another document holds (file renamed, references in the accepted set rewritten), moves them to `applied/` and leaves the rest pending; a patch that no longer applies or malformed frontmatter writes nothing at all | `@covers US-156-AC2` | Integration | `packages/design/test/proposals.test.mjs` | Fixture apps and HELIX repos in temp folders, real `propose` output; no network, no model | Built |
| US-156-AC3 | Given a design folder whose HELIX has FEAT-001 and US-001 under its own file names, when the app is built in place, then no second FEAT-001, US-001 or STP-001 is written (a starter document is skipped when the design has its ID, its type or its path), and the result lists each skipped document and why. | `us-156-ac3` | No second FEAT-001, US-001 or STP-001 is written (a starter document is skipped when the design has its ID, its type or its path), and the result lists each skipped document and why | `@covers US-156-AC3` | Integration | `packages/create-app/test/journey-app.test.mjs` | Fixture apps and HELIX repos in temp folders, real `propose` output; no network, no model | Built |

## Executable Proof

```bash
npm test --workspace @ux-builder/design && npm test --workspace @ux-builder/create-app
```

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
