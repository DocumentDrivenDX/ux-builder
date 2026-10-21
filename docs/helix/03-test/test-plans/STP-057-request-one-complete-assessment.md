---
ddx:
  id: STP-057
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-057
    - kind: informed_by
      to: SD-004
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-057-request-one-complete-assessment

## Story Reference

**User Story**: [[US-057-request-one-complete-assessment]] (Request one complete assessment from a coding agent)
**Technical Design**: N/A (SD-004 covers the story at this size)
**Related Solution Design**: [[SD-004-helix-aware-ux-assessment]]
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: An agent following the skill runs the available stages in order, records stages it cannot complete, labels sources, and reports the app's installed SDK version.
**Blocking Gate**: `node --test packages/audit/test/assess-skill.test.mjs && npm test --workspace @ux-builder/mcp`

**In Scope**
- The skill's text and the commands it names
- `run.json` stage records
- The MCP server's catalogue resolution from an app directory

**Out of Scope**
- Walkthrough stages (increment 2): recorded as `not-available`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-057-AC1 | Given the skill and a valid manifest, when an agent follows it, then it validates the manifest, collects the documents, records the alignment review, runs the baseline and every later stage the installed version supports, and writes the output package CONTRACT-006 defines. | `the skill prescribes the stages and the package` | The skill names `validate`, `collect`, alignment review, `baseline`, `inspect` in that order and the run package files of CONTRACT-006; running its commands on the fixture app writes `run.json`, `requirements.json`, `traceability.json` and `baseline.json` | `@covers US-057-AC1` | Integration | `packages/audit/test/assess-skill.test.mjs` | Fixture app with a manifest | |
| US-057-AC2 | Given no browser tool, an app that does not start, an authentication barrier, or a time or step limit reached, when the stage it stops is recorded, then the stage is `blocked` or `partial` with its reason and none of its pairs count as assessed. | `blocked and partial stages are recorded` | A manifest whose start command exits 1 gives `baseline` stage `blocked` with the reason; `run.json` has no stage `completed` for it and no coverage entry `assessed` | `@covers US-057-AC2` | Integration | `packages/audit/test/assess-skill.test.mjs` | Fixture app with a failing start command | |
| US-057-AC3 | Given no UX Builder MCP server but an installed `@ux-builder/ui`, when the assessment runs, then it completes from the installed guidance and catalogue; deterministic results and agent judgments are labelled by their source in every output. | `runs without MCP; sources labelled` | With no MCP configured the commands complete; every finding in `inspection.json` and `baseline.json` has `finding_type: deterministic` | `@covers US-057-AC3` | Integration | `packages/audit/test/assess-skill.test.mjs` | Fixture app | |
| US-057-AC4 | Given an app with `@ux-builder/ui` installed, when the assessment reports the SDK version or looks up a pattern, then both come from the app's installed copy; and the MCP server, when used from the app's directory, serves that copy's catalogue and reports its version. | `installed SDK version` | `run.json` `versions.ui` equals the fixture app's installed `@ux-builder/ui` version; the MCP server started with the app as cwd serves that catalogue and names its version | `@covers US-057-AC4` | Integration | `packages/audit/test/assess-skill.test.mjs`; packages/mcp/test/server.test.mjs | Fixture app with a stub `@ux-builder/ui` of another version | |

## Executable Proof

### Primary Commands

```bash
node --test packages/audit/test/assess-skill.test.mjs && npm test --workspace @ux-builder/mcp
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

- A stage the version lacks is `not-available`, never omitted.

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
