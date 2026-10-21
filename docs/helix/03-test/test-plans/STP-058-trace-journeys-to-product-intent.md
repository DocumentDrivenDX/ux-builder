---
ddx:
  id: STP-058
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-058
    - kind: informed_by
      to: SD-004
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-058-trace-journeys-to-product-intent

## Story Reference

**User Story**: [[US-058-trace-journeys-to-product-intent]] (Trace each assessed journey to product intent)
**Technical Design**: N/A (SD-004 covers the story at this size)
**Related Solution Design**: [[SD-004-helix-aware-ux-assessment]]
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: `collect` lists every HELIX instance with its type, ID, path, hash and revision, extracts criteria, links journeys to tests, and reports gaps.
**Blocking Gate**: `node --test packages/audit/test/assess-collect.test.mjs`

**In Scope**
- `assess collect`
- `requirements.json`, `traceability.json`
- Recording the alignment result in `alignment.json`

**Out of Scope**
- Running HELIX's alignment review itself (the agent's)

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-058-AC1 | Given a HELIX flow, when `assess collect` runs, then every instance under its root is listed with its `ddx.id`, artifact type (from `ddx.type`, else the catalogue's location and naming), path, content hash and git revision, and its goals, roles, stories and acceptance criteria are extracted with their original IDs. | `every instance typed and identified` | Each fixture instance appears once with `ddx.id`, `type`, `typedBy` (`frontmatter` for typed files, `location` for the untyped file in `user-stories/`), path, a SHA-256 matching the file and the git revision; criteria text and IDs match the source | `@covers US-058-AC1` | Integration | `packages/audit/test/assess-collect.test.mjs` | Fixture HELIX tree in a temp git repo: vision, PRD, FEAT, two stories, one untyped story file | |
| US-058-AC2 | Given the selected journeys, when they are linked, then each criterion is `explicit` (a test cites it with `@covers`, or the manifest maps it, with the test file named), `inferred` (with the agent's reason), or `uncovered`. | `criteria linked explicit, inferred or uncovered` | A criterion cited by `@covers` in a fixture test is `explicit` via `covers` naming the file; one mapped in the manifest is `explicit` via `manifest`; the rest are `uncovered` | `@covers US-058-AC2` | Integration | `packages/audit/test/assess-collect.test.mjs` | Fixture tests with `@covers` | |
| US-058-AC3 | Given HELIX's alignment review result, when it reports a conflict between governing requirements, then the conclusions that depend on them are marked blocked or qualified, and the rest of the assessment continues. | `alignment conflicts qualify dependent conclusions` | Given `alignment.json` with a conflict on US-002, `validate-report` requires findings citing US-002 to carry `qualified: alignment` | `@covers US-058-AC3` | Integration | `packages/audit/test/assess-collect.test.mjs` | Fixture alignment record | |
| US-058-AC4 | Given a missing document type the assessment reads, a story without a stable ID, or a criterion without one, when collected, then each is reported; and every identifier the assessment creates has its own prefix (`J-`, `S-`, `F-`) and never matches a HELIX ID pattern. | `missing documents and IDs reported; assessment IDs prefixed` | A story without `ddx.id` and a missing PRD are listed in `problems`; every generated ID starts `J-`, `S-`, `C-`, `F-`, `P-` or `R-` and none matches `^(US/FEAT/ADR/SD/TD/TP/STP)-` | `@covers US-058-AC4` | Integration | `packages/audit/test/assess-collect.test.mjs` | Fixture tree without a PRD | |

## Executable Proof

### Primary Commands

```bash
node --test packages/audit/test/assess-collect.test.mjs
```

### Coverage Focus

- P0: every row above.
- P1: the edge cases below.

## Data and Setup

| Need | Required For | Source / Strategy |
|------|--------------|-------------------|
| Temp directories and git repositories | All rows | Created per test, removed after |
| Built `@ux-builder/ui` and `@ux-builder/tokens` CSS | Browser rows | `npm run build` before the suite, as the audit suites need |

## Edge Cases and Failure Modes

- A `@covers` naming a criterion that does not exist is reported as a dangling citation.

## Build Handoff

**Implementation Order**
1. The first row's test, red, then the code that turns it green.
2. The remaining rows in order.

**Constraints**
- CONTRACT-006 formats; ADR-026 decisions; the existing audit suites pass unchanged.

**Done When**
- [ ] Every in-scope acceptance criterion has passing evidence
- [ ] Named commands or test files exist and run
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`
- [ ] The story can fail red before implementation and pass green after implementation

## Review Checklist

- [x] References the governing story and design
- [x] Every active acceptance criterion maps to concrete failing tests, keyed by its stable ID
- [x] Every row names the asserted behavior
- [x] Every row records its `@covers` citation
- [x] File paths and commands are specific
- [x] Setup and fixtures are explicit
- [x] Edge cases cover real story risks
- [x] Scope is one story slice
- [x] Build handoff gives a usable sequence
