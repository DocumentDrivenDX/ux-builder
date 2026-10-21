---
ddx:
  id: TP-001
  type: test-plan
  status: draft
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: FEAT-009
    - kind: informed_by
      to: SD-004
---

# Test Plan

The project's first test plan, written with FEAT-009 (2026-10-20). It
records the strategy the repository already follows and allocates FEAT-009's
criteria; earlier features keep their tests where they are, traced by
`@covers` and `tools/check-coverage.mjs`.

## Testing Strategy

**Goals**: every acceptance criterion is cited by a test or excepted with a reason (`npm run coverage`) | `npm run check`, the builder and starter e2e suites, the Storybook build and tests and the site build pass before a change merges.
**Out of Scope**: graded agent-run samples and representative-user studies (excepted with reasons); FEAT-009 increments 2 and 3 until they are built.
**Traceability Source**: the PRD, FEAT-001 to FEAT-009 and their user stories; for FEAT-009, SD-004 and the story test plans below.

### Test Levels

| Level | Coverage Target | Priority |
|-------|-----------------|----------|
| Contract | Every file format and schema: tokens, brands, themes (`npm run schemas`), rules and recipes (`npm run rules`), the blueprint, and FEAT-009's manifest and run records | P0 |
| Integration | Commands against fixture repositories and fixture pages in Chromium: the audit, `ux-builder-blueprint`, `ux-builder-audit assess` | P0 |
| Unit | Pure functions: the engine, composition, catalogue generation, the blueprint checks, HELIX binding | P1 |
| E2E | The theme builder (Playwright), the starter app from packed tarballs, Storybook's AI components | P0 |

### Frameworks

| Type | Framework | Reason |
|------|-----------|--------|
| Contract | `node:test` with Ajv 2020 | Already the schema validator (`tools/validate-schemas.mjs`) |
| Integration | `node:test` with Playwright's Chromium | The audit's own engine; no second browser stack |
| Unit | `node:test` | No dependencies |
| E2E | Playwright Test | `e2e-playwright` concern |

## Test Data

| Type | Strategy |
|------|----------|
| Fixtures | Pages built in the test from the built CSS and served over local HTTP; repository fixtures in `test/fixtures/` (HELIX markers, documents, manifests) |
| Factories | Brands and blueprints built in the test from the SDK's skeletons |
| Mocks | The theme builder's mock model and files-only review; the state proof's fixture app (sign-in cookie, dialog, validation) |

## Coverage Requirements

| Metric | Target | Minimum | Enforcement |
|--------|--------|---------|-------------|
| Acceptance criteria cited by a test or excepted | 100% | 100% | `npm run coverage` in `npm run check` (CI) |
| Existing audit findings after the `inspect()` refactor | unchanged | unchanged | The existing audit suites, unchanged |

### Critical Paths (P0)

1. A theme builds and switches with no app change (P0-1 to P0-5).
2. The audit's findings on fixture pages (US-022, US-054).
3. FEAT-009: inspecting a page in place leaves its state unchanged (US-062-AC1) and gives the URL audit's findings (US-062-AC2).
4. FEAT-009: the manifest binds HELIX and refuses what HELIX refuses (US-056-AC4).

### Secondary Paths (P1-P2)

- P1: traceability links, baseline records, the skill's stages | P2: report rendering, increment-2 records.

## Acceptance Criteria Layer Allocation

| AC class / source | Story Test Plan(s) | Primary Layer | Why this layer |
|-------------------|--------------------|---------------|----------------|
| Manifest schema, secrets, HELIX marker and flow (US-056) | [[STP-056]] | Contract | Formats and refusals against fixture repositories |
| Skill stages, blocked stages, SDK version (US-057) | [[STP-057]] | Integration | Commands run in order against a fixture app; MCP from an app directory |
| Documents, criteria, test links, IDs (US-058) | [[STP-058]] | Integration | `collect` over fixture HELIX trees |
| Baseline records (US-059) | [[STP-059]] | Integration | Real commands and the audit on fixture pages |
| In-place inspection and the state proof (US-062) | [[STP-062]] | Integration (Chromium) | The page state is the thing under test |
| Walkthroughs, coverage, findings, proposals, runs (US-060, US-061, US-063 to US-065) | written with increments 2 and 3 | Contract and Integration | Records validated by `validate-report`; excepted until built |

Every P0 criterion of an in-scope story maps to one layer here and to
tests in its STP.

## Implementation Order

1. US-062-AC1 and AC2: `inspect()` and the refactor, because every later check depends on it and the existing suite must stay green.
2. US-062-AC3 to AC6: CDP attach and the state proof, the brief's central risk.
3. US-056: manifest and HELIX binding, which `collect` and `baseline` read.
4. US-058, then US-059.
5. US-057: the skill and the MCP version fix, once the commands exist.

## Infrastructure

| Requirement | Specification |
|-------------|---------------|
| CI Tool | GitHub Actions, `ubuntu-latest`, Node 24 (`.github/workflows/ci.yml`) |
| Test DB | None; fixture repositories in temp directories, removed after each test |
| Services | Chromium from `npx playwright install --with-deps chromium`; local HTTP servers started by the tests on free ports |

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Flaky browser timing at checkpoints | High | Fixture states are deterministic (no timers); waits on selectors, not time |
| Port clashes between suites | Med | Port 0 for test servers; fixed ports only for the builder (5190) and pages preview (5192) |
| Slow execution as journeys grow | Med | Increment-1 tests stay on fixtures; the pilot test only validates and collects |

**Known Gaps**: Playwright MCP itself is not run in CI; the proof uses a second Playwright client over CDP, the same protocol. Representative-user validation is out of scope (FEAT-009 COV-03).

## Build Handoff

**Commands**: `npm run check` | `npm run coverage`
**Priority**: the implementation order above.

**Blocking Gate**: `npm run check`, the builder and starter e2e suites, the Storybook build and tests and the site build all pass; the FEAT-009 increment-1 criteria are cited by tests and removed from `tools/coverage-exceptions.json`.

## Review Checklist

- [x] Test levels cover contract, integration, unit, and E2E with coverage targets
- [x] Framework choices are justified and consistent with project concerns
- [x] Critical paths (P0) are identified and have 100% coverage requirements
- [x] Test data strategy covers fixtures, factories, and mocks
- [x] Coverage requirements have both targets and minimums with enforcement rules
- [x] Implementation order is justified
- [x] Infrastructure requirements are specific
- [x] Risks include flaky test mitigation and slow execution strategies
- [x] Known gaps are documented with accepted risk rationale
- [x] Build handoff commands are concrete and runnable
- [x] Test plan traces back to acceptance criteria from governing feature specs
- [x] No untested P0 requirement in scope
- [x] Acceptance criteria are allocated to layers without duplicating the STP matrices
