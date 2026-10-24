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
**Out of Scope**: graded agent-run samples and representative-user studies (excepted with reasons). FEAT-009 increments 2 and 3 were built 2026-10-21 and are in scope; none of their criteria is excepted.
**Traceability Source**: the PRD, FEAT-001 to FEAT-017 and their user stories; for FEAT-009, SD-004 and the story test plans below. FEAT-011 to FEAT-017 have no story test plans: their criteria are traced by `@covers` alone, at the layers allocated below (AR-2026-10-22).

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
| FEAT-010 determinism: two apps with the same HELIX and options | identical documents apart from the date | the same | `helix-docs.test.mjs` (US-069-AC5) |
| FEAT-010 bundled HELIX size | < 1.5 MB | < 1.5 MB | `helix-fetch.test.mjs`, when the bundle is present (after `npm pack`) |
| FEAT-010 time to fetch and install HELIX | < 10 s | — | Not measured by a test |

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
| Journey plans, walkthroughs and the browser's restrictions and limits (US-060) | [[STP-060]] | Integration (Chromium) | Records validated by `validate-report`; `browser` and `inspect` against fixture pages |
| Coverage matrix, heuristics, user claims (US-061) | [[STP-061]] | Contract | `plan` and `validate-report` over fixture run packages |
| Ranking, merging, stable IDs (US-063) | [[STP-063]] | Contract | `merge` and `validate-report` over fixture backlogs |
| Proposals and the `improvement-backlog` entry (US-064) | [[STP-064]] | Integration | `propose`, `check-writes`, `apply-check` against fixture HELIX repositories |
| Report, comparison, gate (US-065) | [[STP-065]] | Integration | `report`, `compare`, `gate` over two or more fixture runs |
| FEAT-010: fetch, fallback, proxy, safe extraction, pins (US-067, US-068) | [[STP-067]], [[STP-068]] | Integration | The CLI against a local release server and proxy; the starter e2e against GitHub |
| FEAT-010: the starter set, heading merge, determinism (US-069) | [[STP-069]] | Integration | Documents drafted from fixture templates |
| FEAT-010: manifest, traceability, guidance (US-070, US-071) | [[STP-070]], [[STP-071]] | Integration | The assessment's own `validate` and `collect` on a created app |
| FEAT-011: AI rules, blueprint `ai`, MCP (US-076, US-077, US-081) | — | Unit and contract | The blueprint checks and the rule data are pure functions over fixtures |
| FEAT-011: AI audit checks, voice lint (US-078 to US-080) | — | Integration (Chromium) | The checks read AI markup on fixture pages; the lint rule on fixture sources |
| FEAT-011: AI journeys in three scenarios (US-082) | — | Integration (Chromium) | `assess inspect --scenario` against fixture pages; never approving is the thing under test |
| FEAT-011: Adaptive Cards rendering and `checkCard` (US-083 to US-085) | — | Unit and E2E | `checkCard` over fixture payloads; the renderer in Storybook and the theme page |
| FEAT-012: flows, journeys, drawings, proposals, wireframes (US-086 to US-090) | — | Unit and integration | The checks and drawings are deterministic over fixture blueprints; `propose` against fixture HELIX trees; wireframes in Chromium |
| FEAT-013: walkthrough videos and the player (US-091 to US-095) | — | Integration (Chromium, ffmpeg) | `assess video` replays fixture journeys; MP4 criteria need `ffmpeg` and run in CI; the player at 480, 960 and 1440 px |
| FEAT-014: modalities in the starter, the rules and the audit (US-096 to US-099) | — | Integration and E2E | The starter's CLI and shells from packed tarballs; the audit's verdicts on fixture pages |
| FEAT-015: rules named on findings, the journey report, pace, HELIX UX types (US-100 to US-104) | — | Integration | Audit and assessment reports over fixture runs; `propose` drafts against fixture HELIX trees |
| FEAT-016: the episode trace, export and learning (US-105 to US-111) | — | Unit and integration | `ux-builder-trace` and the tools' trace writes in temp repositories; export with no network; `tools/learn.mjs` over fixture bundles |
| FEAT-017: diagram tokens, the gate and the theme page (US-112, US-113) | — | Contract and E2E | `npm run contrast` over every resolved theme; the theme page's diagram section in Playwright |
| FEAT-018 phase 1: package, CLI, MCP parity, state, checkpoints, change mode, brief, `docs/ux/` (US-114 to US-123) | [[STP-114]] to [[STP-123]] | Integration | `ux-builder-design` against fixture apps under the network guard; skill text read from the installed skill |
| FEAT-018 phase 2: hypotheses, evidence, jobs, tasks, simplify (US-124 to US-128) | [[STP-124]] to [[STP-128]] | Contract | `validate`, `evidence add` and blueprint commands over fixture research and blueprints |
| FEAT-018 phase 3: alternatives, score, compare, decisions, architecture, consistency, rubric (US-129 to US-134) | [[STP-129]] to [[STP-134]] | Integration | Blueprint commands over three fixture alternatives; deterministic output compared byte for byte |
| FEAT-018 phase 4: prototypes, readiness, trace and impact (US-135 to US-137) | [[STP-135]] to [[STP-137]] | Integration (Chromium) | Prototype pages clicked through; `impact` over a seeded ID graph |
| FEAT-018 phase 5: heuristics, metrics, test kit, observations, report (US-138 to US-142) | [[STP-138]] to [[STP-142]] | Integration | Assessment fixtures; fixture observations and transcripts; no real participants |
| FEAT-018 phase 6: journey events, insights, experiments (US-143 to US-145) | [[STP-143]] to [[STP-145]] | Unit and integration | Events captured by a test sink with network APIs stubbed to throw; fixture event exports |
| FEAT-018 amendment: structured target users (US-146) | [[STP-146]] | Integration | `validate`, `brief`, `test-kit`, `report` and `trace` over fixture apps with `users.md` |
| FEAT-018 amendment: business rules in the task model (US-147) | [[STP-147]] | Integration | `validate`, `test-kit`, `report`, `trace` and `impact` over fixture apps whose HELIX defines `BR-<n>` rules |
| FEAT-018 amendment: the guided conversation (US-148) | [[STP-148]] | Integration | `overview`, `status`, `step`, `explain` and `review` over fixture apps; checkpoints gated by pending reviews |
| FEAT-018 amendment: docs/ux-builder layout and modality first (US-149) | [[STP-149]] | Integration | Commands on new and old-layout fixture apps; `migrate` in a temp git repository; the blueprint CLI's modality gate; create-app's paths |

Every P0 criterion of an in-scope story maps to one layer here and to
tests in its STP.

## Implementation Order

1. US-062-AC1 and AC2: `inspect()` and the refactor, because every later check depends on it and the existing suite must stay green.
2. US-062-AC3 to AC6: CDP attach and the state proof, the brief's central risk.
3. US-056: manifest and HELIX binding, which `collect` and `baseline` read.
4. US-058, then US-059.
5. US-057: the skill and the MCP version fix, once the commands exist.
6. Increments 2 and 3 (2026-10-21): US-060 and US-061, then US-063, US-064 and US-065, as the implementation plan's B-007 to B-012 order them.
7. FEAT-018 (2026-10-23): phases 1 to 6 in order, as the implementation plan's B-018 to B-036 order them; phase 4's exploratory prototype may move ahead of phase 3.

## Infrastructure

| Requirement | Specification |
|-------------|---------------|
| CI Tool | GitHub Actions, `ubuntu-latest`, Node 24 (`.github/workflows/ci.yml`) |
| Test DB | None; fixture repositories in temp directories, removed after each test |
| Services | Chromium from `npx playwright install --with-deps chromium`; local HTTP servers started by the tests on free ports |
| Video | `ffmpeg` on the PATH (CI installs it). Without it, the MP4 tests of FEAT-013 skip with a reason, so MP4 criteria are verified in CI |

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

**Blocking Gate**: `npm run check`, the builder and starter e2e suites, the Storybook build and tests and the site build all pass; every FEAT-009 criterion (increments 1 to 3) is cited by a test and none is in `tools/coverage-exceptions.json`.

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
